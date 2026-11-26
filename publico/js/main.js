// Mejora progresiva de la landing. Sin este archivo todo funciona: se ve la escena, la segunda
// pantalla con sus tramos (enlaces normales a la ticketera) y la lista de espera con su formulario.
// Cada efecto de movimiento va marcado [MOV-n] para poder quitarlo por separado.
(function () {
  'use strict';

  /* ---------- Duración de la intro (total ~3,5 s). Cambiar aquí. ---------- */
  var FASE_QUIETA_MS = 700;      // la escena entera, quieta
  var FASE_ZOOM_MS = 2300;       // [MOV-1] zoom lento hasta que la pantalla de la tele llena la vista
  var FASE_SACUDIDA_MS = 500;    // [MOV-2] «golpe de cámara»: reencuadre lateral rápido
  var FUNDIDO_MS = 400;          // paso a la segunda pantalla (lo hace el CSS)
  var REDUCIDO_FUNDIDO_MS = 900; // con «reducir movimiento»: sin zoom ni sacudida, solo un fundido
  var SACUDIDA_X = 1.5;          // % de desplazamiento lateral en la sacudida
  var SACUDIDA_GIRO = 0.3;       // grados de giro como mucho

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
  var tele = document.querySelector('[data-tele]');
  var luz = document.querySelector('[data-luz]');
  var video = visible('[data-video]');

  /* ---------- Vídeo de la tele: siempre sin sonido; se pausa al acabar la intro y cuando no se ve ---------- */
  function reproducir() {
    if (!video || html.getAttribute('data-fase') === 'pantalla') return;
    video.muted = true;
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* el navegador no deja: se queda el póster */ });
  }
  if (video) {
    video.muted = true;
    document.addEventListener('visibilitychange', function () { if (document.hidden) video.pause(); else reproducir(); });
  }

  /* ---------- [MOV-3] «Sin señal»: nieve de tele en un canvas pequeño ---------- */
  var lienzoNieve = visible('[data-sin-senal]');
  var nieveActiva = false;
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
      nieveActiva = true;
      var ultimo = 0;
      var bucle = function (t) {
        if (!nieveActiva) return;
        if (!document.hidden && t - ultimo > 70) { pintar(); ultimo = t; }
        requestAnimationFrame(bucle);
      };
      requestAnimationFrame(bucle);
    }
  }

  /* ---------- Intro: quieta → zoom → sacudida → segunda pantalla ---------- */
  var animaciones = [];
  var temporizadores = [];
  var terminada = false;

  function irAPantalla() {
    if (terminada) return;
    terminada = true;
    temporizadores.forEach(clearTimeout);
    animaciones.forEach(function (a) { try { a.cancel(); } catch (e) { /* nada */ } });
    if (video) video.pause();
    nieveActiva = false;
    html.setAttribute('data-fase', 'pantalla');
    // Un momento sin toques en la pantalla nueva, para que el toque de saltar no compre sin querer
    html.classList.add('recien-llegada');
    setTimeout(function () { html.classList.remove('recien-llegada'); }, FUNDIDO_MS + 50);
    almacen.guardar('sessionStorage', 'veleta_intro', '1');
    var titulo = visible('.pantalla__titulo');
    if (titulo) { try { titulo.focus({ preventScroll: true }); } catch (e) { titulo.focus(); } }
    window.scrollTo(0, 0);
  }

  function animar(el, fotogramas, opts) {
    if (!el || !el.animate) return null;
    var a = el.animate(fotogramas, opts);
    animaciones.push(a);
    return a;
  }

  // [MOV-1] Escala y desplazamiento para que el rectángulo de la tele llene la vista, centrado en él.
  function transformacionZoom() {
    var r = tele.getBoundingClientRect();
    var ancho = window.innerWidth, alto = window.innerHeight;
    var escala = Math.max(ancho / r.width, alto / r.height) * 1.02;
    // Centro de la tele respecto al lienzo (sin transformar) y respecto a la ventana
    var cx = tele.offsetLeft + tele.offsetWidth / 2;
    var cy = tele.offsetTop + tele.offsetHeight / 2;
    var dx = ancho / 2 - (r.left + r.width / 2);
    var dy = alto / 2 - (r.top + r.height / 2);
    return { origen: cx + 'px ' + cy + 'px', final: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + escala + ')' };
  }

  function sacudida() {
    // [MOV-2] 2-3 oscilaciones laterales, giro mínimo, frenando; y un destello en la pantalla
    var x = SACUDIDA_X, g = SACUDIDA_GIRO;
    var a = animar(camara, [
      { transform: 'translateX(0) rotate(0deg)' },
      { transform: 'translateX(' + x + '%) rotate(' + g + 'deg)', offset: 0.18 },
      { transform: 'translateX(' + (-x * 0.7) + '%) rotate(' + (-g * 0.7) + 'deg)', offset: 0.42 },
      { transform: 'translateX(' + (x * 0.35) + '%) rotate(' + (g * 0.3) + 'deg)', offset: 0.68 },
      { transform: 'translateX(0) rotate(0deg)' }
    ], { duration: FASE_SACUDIDA_MS, easing: 'ease-out', id: 'sacudida' });
    animar(luz, [{ opacity: 0 }, { opacity: 0.35, offset: 0.15 }, { opacity: 0.05, offset: 0.3 }, { opacity: 0.25, offset: 0.45 }, { opacity: 0 }],
      { duration: FASE_SACUDIDA_MS, easing: 'linear', id: 'destello' });
    if (a) a.onfinish = function () { if (video) video.pause(); irAPantalla(); };
    else irAPantalla();
  }

  function zoom() {
    var t = transformacionZoom();
    lienzo.style.transformOrigin = t.origen;
    var a = animar(lienzo, [{ transform: 'translate(0, 0) scale(1)' }, { transform: t.final }],
      { duration: FASE_ZOOM_MS, easing: 'cubic-bezier(.42, 0, .25, 1)', fill: 'forwards', id: 'zoom' });
    if (a) a.onfinish = sacudida;
    else irAPantalla();
  }

  if (escena && html.getAttribute('data-fase') === 'intro') {
    var aviso = escena.querySelector('[data-saltar]');
    if (aviso) aviso.hidden = false;
    reproducir();
    if (reducir) {
      // Sin zoom ni sacudida: la escena un momento y un fundido a la segunda pantalla
      temporizadores.push(setTimeout(function () {
        animar(escena, [{ opacity: 1 }, { opacity: 0 }], { duration: REDUCIDO_FUNDIDO_MS, easing: 'ease-in', fill: 'forwards', id: 'fundido' });
        temporizadores.push(setTimeout(irAPantalla, REDUCIDO_FUNDIDO_MS));
      }, FASE_QUIETA_MS));
    } else {
      temporizadores.push(setTimeout(zoom, FASE_QUIETA_MS));
    }
    // Por si alguna animación no llega a terminar: la segunda pantalla sale sí o sí
    temporizadores.push(setTimeout(irAPantalla, FASE_QUIETA_MS + FASE_ZOOM_MS + FASE_SACUDIDA_MS + 1500));
    // Un toque (o Intro, espacio, Escape) en cualquier sitio salta la intro
    escena.addEventListener('click', irAPantalla);
    document.addEventListener('keydown', function (e) {
      if (!terminada && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) irAPantalla();
    });
  } else if (video) {
    video.pause();
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
