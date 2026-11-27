// Mejora progresiva de la landing. Sin este archivo todo funciona: se ve la escena, la segunda
// pantalla con sus tramos (enlaces normales a la ticketera) y la lista de espera con su formulario.
// Cada efecto de movimiento va marcado [MOV-n] para poder quitarlo por separado.
//
// Recorrido (Nacho, 27/11):
//   1. La foto quieta 2 s, con el vídeo del evento ya sonando (sin sonido) en la tele.
//   2. [MOV-1] Zoom lento hasta que el televisor ENTERO ocupa el ancho de la pantalla.
//   3. El vídeo sigue hasta el final dentro de la tele. Abajo, «Saltar».
//   4. [MOV-2] Golpe de cámara y los tramos aparecen DENTRO de la pantalla de la tele.
(function () {
  'use strict';

  /* ---------- Tiempos y encuadre. Cambiar aquí. ---------- */
  var FASE_QUIETA_MS = 2000;      // la foto entera, quieta, con el vídeo ya en la tele
  var FASE_ZOOM_MS = 2800;        // [MOV-1] zoom lento hasta encuadrar el televisor
  var FASE_SIN_VIDEO_MS = 1500;   // si no hay vídeo (o el móvil no lo reproduce): tiempo en la tele antes de los tramos
  var VIDEO_MAX_MS = 60000;       // por si el vídeo no avisa de que ha terminado
  var FASE_SACUDIDA_MS = 500;     // [MOV-2] «golpe de cámara» al cambiar a los tramos
  var FUNDIDO_MS = 400;           // aparición de los tramos (lo hace el CSS)
  var REDUCIDO_FUNDIDO_MS = 900;  // con «reducir movimiento»: sin zoom ni sacudida, solo fundidos
  var SACUDIDA_X = 1.5;           // % de desplazamiento lateral en la sacudida
  var SACUDIDA_GIRO = 0.3;        // grados de giro como mucho
  var MARCO_ANCHO = 0.94;         // el televisor ocupa como mucho este ancho de la pantalla…
  var MARCO_ALTO = 0.5;           // …y este alto (deja sitio arriba al nombre y abajo a los botones)
  var MARCO_CENTRO_Y = 0.46;      // altura (de 0 a 1) donde queda el centro del televisor

  var html = document.documentElement;
  var reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Guardar en el navegador siempre con try/catch (modo privado, almacenamiento bloqueado…)
  var almacen = {
    leer: function (tipo, k) { try { return window[tipo].getItem(k); } catch (e) { return null; } },
    guardar: function (tipo, k, v) { try { window[tipo].setItem(k, v); } catch (e) { /* nada */ } }
  };

  var opciones = { emailAntesDeComprar: 'opcional' };
  try {
    var metaOp = document.querySelector('meta[name="veleta-opciones"]');
    if (metaOp) {
      var leidas = JSON.parse(metaOp.getAttribute('content'));
      for (var k in leidas) opciones[k] = leidas[k];
    }
  } catch (e) { /* opciones por defecto */ }

  /* ---------- Bloque visible (según estado.js) ---------- */
  function visible(selector) {
    var lista = document.querySelectorAll(selector);
    for (var i = 0; i < lista.length; i++) if (lista[i].getClientRects().length) return lista[i];
    return null;
  }

  var escena = document.querySelector('[data-escena]');
  var camara = document.querySelector('[data-camara]');
  var lienzo = document.querySelector('[data-lienzo]');
  var marco = document.querySelector('[data-marco]');
  var tele = document.querySelector('[data-tele]');
  var luz = document.querySelector('[data-luz]');
  var botonSaltar = document.querySelector('[data-saltar]');
  var video = visible('[data-video]');

  /* ---------- Vídeo de la tele: siempre sin sonido ---------- */
  function reproducir() {
    if (!video || video.ended) return;
    video.muted = true;
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* el navegador no deja: se queda el póster */ });
  }
  if (video) {
    video.muted = true;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) video.pause();
      else if (html.getAttribute('data-paso') !== 'tramos') reproducir();
    });
  }

  /* ---------- [MOV-3] «Sin señal»: nieve de tele en un canvas pequeño ---------- */
  var lienzoNieve = visible('[data-sin-senal]');
  if (lienzoNieve && lienzoNieve.getContext) {
    var ctx = lienzoNieve.getContext('2d');
    var pintar = function () {
      var img = ctx.createImageData(lienzoNieve.width, lienzoNieve.height);
      for (var i = 0; i < img.data.length; i += 4) {
        var g = (Math.random() * 255) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = g; img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    pintar();
    if (!reducir) {
      var ultimo = 0;
      var bucle = function (t) {
        if (!document.hidden && t - ultimo > 70) { pintar(); ultimo = t; }
        requestAnimationFrame(bucle);
      };
      requestAnimationFrame(bucle);
    }
  }

  /* ---------- Encuadre: el televisor entero ajustado al ancho ---------- */
  var animaciones = [];
  var temporizadores = [];
  var encuadreHecho = false;
  var terminada = false;

  function paso(nombre) { html.setAttribute('data-paso', nombre); }
  function animar(el, fotogramas, opts) {
    if (!el || !el.animate) return null;
    var a = el.animate(fotogramas, opts);
    animaciones.push(a);
    return a;
  }
  function pararTodo() {
    temporizadores.forEach(clearTimeout);
    temporizadores = [];
    animaciones.forEach(function (a) { try { a.cancel(); } catch (e) { /* nada */ } });
    animaciones = [];
  }

  // Escala y desplazamiento para que el televisor quede entero, centrado y lo más grande posible
  function calcularEncuadre() {
    var antes = lienzo.style.transform;
    lienzo.style.transform = 'none';
    var r = lienzo.getBoundingClientRect();
    lienzo.style.transform = antes;
    var w = marco.offsetWidth, h = marco.offsetHeight;
    var ancho = window.innerWidth, alto = window.innerHeight;
    var escala = Math.max(1, Math.min(ancho * MARCO_ANCHO / w, alto * MARCO_ALTO / h));
    var ox = marco.offsetLeft + w / 2, oy = marco.offsetTop + h / 2;
    var dx = ancho / 2 - (r.left + ox);
    var dy = alto * MARCO_CENTRO_Y - (r.top + oy);
    // Que la foto siga cubriendo toda la pantalla (sin franjas negras en los bordes)
    var W = lienzo.offsetWidth, H = lienzo.offsetHeight;
    var izq = r.left + ox - ox * escala, der = r.left + ox + (W - ox) * escala;
    var arr = r.top + oy - oy * escala, aba = r.top + oy + (H - oy) * escala;
    dx = Math.min(Math.max(dx, ancho - der), -izq);
    dy = Math.min(Math.max(dy, alto - aba), -arr);
    return { origen: ox + 'px ' + oy + 'px', final: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + escala + ')' };
  }

  // Deja el encuadre puesto y avisa al CSS de dónde están la pantalla y el televisor
  function fijarEncuadre() {
    var t = calcularEncuadre();
    lienzo.style.transformOrigin = t.origen;
    lienzo.style.transform = t.final;
    encuadreHecho = true;
    colocar();
  }
  function colocar() {
    var p = tele.getBoundingClientRect(), m = marco.getBoundingClientRect();
    var st = html.style;
    st.setProperty('--pt-x', p.left + 'px'); st.setProperty('--pt-y', p.top + 'px');
    st.setProperty('--pt-ancho', p.width + 'px'); st.setProperty('--pt-alto', p.height + 'px');
    st.setProperty('--marco-arriba', m.top + 'px'); st.setProperty('--marco-abajo', m.bottom + 'px');
  }
  window.addEventListener('resize', function () {
    if (!encuadreHecho) return;
    var anim = animaciones.filter(function (a) { return a.id === 'zoom' && a.playState === 'running'; })[0];
    if (anim) return; // durante el zoom no se toca
    fijarEncuadre();
  });

  /* ---------- Los tramos, dentro de la tele ---------- */
  function mostrarTramos(conSacudida) {
    if (terminada) return;
    terminada = true;
    pararTodo();
    if (!encuadreHecho) fijarEncuadre();
    if (video) video.pause();
    if (botonSaltar) botonSaltar.hidden = true;
    var hecho = false;
    var entrar = function () {
      if (hecho) return;
      hecho = true;
      paso('tramos');
      html.setAttribute('data-fase', 'pantalla');
      // Un momento sin toques en la pantalla nueva, para que el toque de saltar no compre sin querer
      html.classList.add('recien-llegada');
      setTimeout(function () { html.classList.remove('recien-llegada'); }, FUNDIDO_MS + 50);
      almacen.guardar('sessionStorage', 'veleta_intro', '1');
      var titulo = visible('.pantalla__titulo');
      if (titulo) { try { titulo.focus({ preventScroll: true }); } catch (e) { titulo.focus(); } }
      window.scrollTo(0, 0);
    };
    if (!conSacudida || reducir || !camara.animate) { entrar(); return; }
    // [MOV-2] Golpe de cámara: 2-3 oscilaciones laterales, giro mínimo, frenando; y un destello
    var x = SACUDIDA_X, g = SACUDIDA_GIRO;
    var a = camara.animate([
      { transform: 'translateX(0) rotate(0deg)' },
      { transform: 'translateX(' + x + '%) rotate(' + g + 'deg)', offset: 0.18 },
      { transform: 'translateX(' + (-x * 0.7) + '%) rotate(' + (-g * 0.7) + 'deg)', offset: 0.42 },
      { transform: 'translateX(' + (x * 0.35) + '%) rotate(' + (g * 0.3) + 'deg)', offset: 0.68 },
      { transform: 'translateX(0) rotate(0deg)' }
    ], { duration: FASE_SACUDIDA_MS, easing: 'ease-out', id: 'sacudida' });
    if (luz && luz.animate) luz.animate([{ opacity: 0 }, { opacity: 0.35, offset: 0.15 }, { opacity: 0.05, offset: 0.3 }, { opacity: 0.25, offset: 0.45 }, { opacity: 0 }],
      { duration: FASE_SACUDIDA_MS, easing: 'linear', id: 'destello' });
    a.onfinish = entrar;
    setTimeout(entrar, FASE_SACUDIDA_MS + 200); // por si la animación no termina
  }

  /* ---------- El vídeo dentro de la tele, hasta el final (o «Saltar») ---------- */
  function verVideo() {
    paso('video');
    if (video && !video.paused && !video.ended) {
      video.addEventListener('ended', function () { mostrarTramos(true); }, { once: true });
      var queda = isFinite(video.duration) ? (video.duration - video.currentTime) * 1000 + 1500 : VIDEO_MAX_MS;
      temporizadores.push(setTimeout(function () { mostrarTramos(true); }, Math.min(queda, VIDEO_MAX_MS)));
    } else if (video && video.ended) {
      mostrarTramos(true);
    } else {
      temporizadores.push(setTimeout(function () { mostrarTramos(true); }, FASE_SIN_VIDEO_MS));
    }
  }

  function zoom() {
    paso('zoom');
    var t = calcularEncuadre();
    lienzo.style.transformOrigin = t.origen;
    var a = animar(lienzo, [{ transform: 'translate(0, 0) scale(1)' }, { transform: t.final }],
      { duration: FASE_ZOOM_MS, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'forwards', id: 'zoom' });
    if (!a) { fijarEncuadre(); verVideo(); return; }
    a.onfinish = function () {
      lienzo.style.transform = t.final;
      encuadreHecho = true;
      try { a.cancel(); } catch (e) { /* nada */ }
      colocar();
      verVideo();
    };
  }

  function encuadreConFundido() {
    // «Reducir movimiento»: sin zoom; la escena se funde al encuadre final
    paso('zoom');
    var a = animar(lienzo, [{ opacity: 1 }, { opacity: 0 }], { duration: REDUCIDO_FUNDIDO_MS / 2, fill: 'forwards', id: 'fundido' });
    var seguir = function () {
      fijarEncuadre();
      animar(lienzo, [{ opacity: 0 }, { opacity: 1 }], { duration: REDUCIDO_FUNDIDO_MS / 2, id: 'fundido' });
      verVideo();
    };
    if (a) a.onfinish = seguir; else seguir();
  }

  if (escena && lienzo && marco && tele && html.getAttribute('data-fase') === 'intro') {
    paso('quieta');
    if (botonSaltar) {
      botonSaltar.hidden = false;
      botonSaltar.addEventListener('click', function () { mostrarTramos(false); });
    }
    document.addEventListener('keydown', function (e) { if (!terminada && e.key === 'Escape') mostrarTramos(false); });
    reproducir();
    temporizadores.push(setTimeout(reducir ? encuadreConFundido : zoom, FASE_QUIETA_MS));
  } else if (escena && lienzo && marco && tele && html.getAttribute('data-fase') === 'pantalla') {
    // Ya vio la intro en esta visita: directamente la tele encuadrada con los tramos
    paso('tramos');
    terminada = true;
    if (botonSaltar) botonSaltar.hidden = true;
    fijarEncuadre();
    if (video) {
      var alFinal = function () { try { video.currentTime = Math.max(0, (video.duration || 1) - 0.1); } catch (e) { /* nada */ } video.pause(); };
      if (video.readyState >= 1) alFinal(); else video.addEventListener('loadedmetadata', alFinal, { once: true });
    }
  }

  // Al volver con «Volver» (?intro=1), se limpia la dirección para que una recarga no repita la intro
  if (/[?&]intro=1\b/.test(window.location.search) && window.history && history.replaceState) {
    try { history.replaceState(null, '', window.location.pathname + window.location.hash); } catch (e) { /* nada */ }
  }

  /* ---------- Formularios: validación, envío sin recargar y marca de tiempo antispam ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var cargadaEn = Date.now();
  function errorEmail(valor, obligatorio) {
    valor = valor.trim();
    if (!valor) return obligatorio ? 'Falta tu email.' : '';
    return EMAIL_RE.test(valor) ? '' : 'Revisa el email, parece que tiene algún error.';
  }
  function marcarError(input, msg) {
    var el = document.getElementById(input.id + '-error');
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (el) { el.textContent = msg; if (msg) input.setAttribute('aria-describedby', el.id); else input.removeAttribute('aria-describedby'); }
  }

  document.querySelectorAll('[data-formulario]').forEach(function (form) {
    var estado = form.querySelector('.form-estado');
    var boton = form.querySelector('[type="submit"]');
    var textoBoton = boton.textContent;
    var email = form.elements.email;
    form.elements.t.value = String(cargadaEn);
    var pon = function (tipo, texto) { estado.className = 'form-estado' + (tipo ? ' es-' + tipo : ''); estado.textContent = texto || ''; };

    email.addEventListener('input', function () { if (email.getAttribute('aria-invalid') === 'true') marcarError(email, errorEmail(email.value, true)); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      pon('', '');
      var msg = errorEmail(email.value, true);
      marcarError(email, msg);
      if (msg) { email.focus(); return; }
      boton.disabled = true;
      boton.textContent = 'Enviando…';
      fetch(form.getAttribute('action'), { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (d) {
            if (!res.ok) throw new Error(d.error || 'HTTP ' + res.status);
          });
        })
        .then(function () { form.reset(); form.elements.t.value = String(cargadaEn); pon('ok', '¡Hecho! Te avisamos en cuanto empiece la emisión.'); })
        .catch(function (err) {
          pon('error', err && err.message && !/^HTTP/.test(err.message) ? err.message : 'No se ha podido enviar. Prueba otra vez en unos minutos.');
        })
        .then(function () { boton.disabled = false; boton.textContent = textoBoton; });
    });
  });

  /* ---------- Tramos: email antes de la ticketera (según opciones) y a la ticketera ----------
     Cada tramo es un enlace normal. «opcional» nunca frena: si el email está vacío o mal, se va igual.
     Solo «obligatorio» pide un email válido antes de seguir. No hay animación: se navega y ya. */
  var modo = opciones.emailAntesDeComprar;
  if (modo === 'opcional' || modo === 'obligatorio') {
    document.querySelectorAll('[data-email-compra]').forEach(function (el) { el.hidden = false; });
  }
  document.querySelectorAll('[data-comprar]').forEach(function (enlace) {
    enlace.addEventListener('click', function (e) {
      try {
        var venta = enlace.closest('.venta');
        var campo = venta && venta.querySelector('.comprar__email:not([hidden]) input[type="email"]');
        if (!campo) return;
        var valor = campo.value.trim();
        if (modo === 'obligatorio') {
          var msg = errorEmail(valor, true);
          marcarError(campo, msg);
          if (msg) { e.preventDefault(); campo.focus(); return; }
        }
        if (valor && !errorEmail(valor, false)) {
          var datos = new FormData();
          datos.append('tipo', 'compra');
          datos.append('email', valor);
          datos.append('evento', enlace.getAttribute('data-evento') || '');
          datos.append('t', String(cargadaEn));
          datos.append('web', '');
          // keepalive: el envío sigue aunque la página se vaya a la ticketera
          fetch('/api/lista', { method: 'POST', body: datos, headers: { Accept: 'application/json' }, keepalive: true }).catch(function () { /* no frena la compra */ });
        }
      } catch (err) { /* pase lo que pase, el enlace sigue su camino */ }
    });
  });

  /* ---------- Aviso de cookies: solo si la página tiene algo de otra web ----------
     Hoy no hay nada de terceros, así que el aviso no sale. Si algún día se añade, se marca así:
       <iframe data-consent-src="https://…"></iframe>
     y solo se carga tras «Aceptar». */
  var avisoCookies = document.getElementById('aviso-cookies');
  var externos = document.querySelectorAll('[data-consent-src]');
  if (avisoCookies && externos.length) {
    var CLAVE = 'veleta_cookies';
    var DOCE_MESES = 365 * 24 * 3600 * 1000;
    var cargar = function () {
      externos.forEach(function (el) { el.setAttribute('src', el.getAttribute('data-consent-src')); el.removeAttribute('data-consent-src'); });
    };
    var g = null;
    try { g = JSON.parse(almacen.leer('localStorage', CLAVE) || 'null'); } catch (e) { g = null; }
    if (g && Date.now() - g.fecha < DOCE_MESES) { if (g.valor === 'aceptar') cargar(); }
    else avisoCookies.hidden = false;
    avisoCookies.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cookies]');
      if (!b) return;
      var valor = b.getAttribute('data-cookies');
      almacen.guardar('localStorage', CLAVE, JSON.stringify({ valor: valor, fecha: Date.now() }));
      avisoCookies.hidden = true;
      if (valor === 'aceptar') cargar();
    });
  }
})();
