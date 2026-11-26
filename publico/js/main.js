// Mejora progresiva de la landing. Sin este archivo todo funciona: se ve la tele, la pantalla
// de venta con su enlace normal a la ticketera y la lista de espera con su formulario normal.
// Cada efecto de movimiento va marcado [MOV-n] para poder quitarlo por separado.
(function () {
  'use strict';
  var html = document.documentElement;
  var reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Guardar en el navegador siempre con try/catch (modo privado, almacenamiento bloqueado…)
  var almacen = {
    leer: function (tipo, k) { try { return window[tipo].getItem(k); } catch (e) { return null; } },
    guardar: function (tipo, k, v) { try { window[tipo].setItem(k, v); } catch (e) { /* nada */ } }
  };

  var opciones = { emailAntesDeComprar: 'opcional', reaccion: 'pulgar', sonido: 'boton', introMaxMs: 1500, reaccionMs: 800 };
  try {
    var metaOp = document.querySelector('meta[name="veleta-opciones"]');
    if (metaOp) {
      var leidas = JSON.parse(metaOp.getAttribute('content'));
      for (var k in leidas) opciones[k] = leidas[k];
    }
  } catch (e) { /* opciones por defecto */ }

  // Lo que solo tiene sentido con JavaScript (aviso de «toca para saltar», email antes de comprar, sonido)
  document.querySelectorAll('[data-solo-js]').forEach(function (el) {
    if (el.hasAttribute('data-sonido')) return; // el botón de sonido se decide más abajo
    if (el.hasAttribute('data-escena-aviso') && html.getAttribute('data-fase') !== 'intro') return;
    el.hidden = false;
  });

  /* ---------- Bloque visible (según estado.js) ---------- */
  function visible(selector) {
    var lista = document.querySelectorAll(selector);
    for (var i = 0; i < lista.length; i++) if (lista[i].offsetParent !== null || lista[i].getClientRects().length) return lista[i];
    return null;
  }

  /* ---------- [MOV-1] Intro: zoom a la tele (máx. 1,5 s), se salta con un toque ---------- */
  var escena = document.querySelector('[data-escena]');
  function irAPantalla() {
    if (html.getAttribute('data-fase') === 'pantalla') return;
    html.setAttribute('data-fase', 'pantalla');
    // Un momento sin toques en la pantalla nueva, para que el toque de saltar no compre sin querer
    html.classList.add('recien-llegada');
    setTimeout(function () { html.classList.remove('recien-llegada'); }, 450);
    almacen.guardar('sessionStorage', 'veleta_intro', '1');
    var titulo = visible('.pantalla__titulo');
    if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus({ preventScroll: true }); }
  }
  if (escena && html.getAttribute('data-fase') === 'intro') {
    html.style.setProperty('--intro-ms', opciones.introMaxMs + 'ms');
    html.classList.add('intro-en-marcha');
    // Pase lo que pase con la animación, a los introMaxMs se pasa a la pantalla de venta.
    var fin = setTimeout(irAPantalla, opciones.introMaxMs);
    var saltar = function () { clearTimeout(fin); irAPantalla(); };
    escena.addEventListener('click', saltar);
    document.addEventListener('keydown', function (e) {
      if (html.getAttribute('data-fase') === 'intro' && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) saltar();
    });
  }

  /* ---------- Vídeo de la tele: sin sonido, se pausa cuando no se ve ---------- */
  var video = visible('[data-video]');
  if (video) {
    video.muted = true;
    var reproducir = function () { var p = video.play(); if (p && p.catch) p.catch(function () { /* el navegador no deja: se ve el póster */ }); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) { if (en.isIntersecting && !document.hidden) reproducir(); else video.pause(); });
      }).observe(video);
    } else reproducir();
    document.addEventListener('visibilitychange', function () { if (document.hidden) video.pause(); else reproducir(); });

    // Sonido: nunca, o solo cuando la persona pulsa «Activar sonido»
    document.querySelectorAll('[data-sonido]').forEach(function (b) {
      if (opciones.sonido !== 'boton') return;
      b.hidden = false;
      b.addEventListener('click', function () {
        video.muted = !video.muted;
        if (!video.muted) reproducir();
        b.textContent = video.muted ? 'Activar sonido' : 'Quitar sonido';
        b.setAttribute('aria-pressed', video.muted ? 'false' : 'true');
      });
    });
  }

  /* ---------- [MOV-3] «Sin señal»: nieve de tele en un canvas pequeño ---------- */
  var lienzo = visible('[data-sin-senal]');
  if (lienzo && lienzo.getContext) {
    var ctx = lienzo.getContext('2d');
    var w = lienzo.width, h = lienzo.height;
    var pintar = function () {
      var img = ctx.createImageData(w, h);
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
        .then(function () { form.reset(); form.elements.t.value = String(cargadaEn); pon('ok', '¡Hecho! Te avisamos en cuanto haya fecha.'); })
        .catch(function (err) {
          pon('error', err && err.message && !/^HTTP/.test(err.message) ? err.message : 'No se ha podido enviar. Prueba otra vez en unos minutos.');
        })
        .then(function () { boton.disabled = false; boton.textContent = textoBoton; });
    });
  });

  /* ---------- Comprar: email (según opciones), [MOV-2] reacción del abuelo y a la ticketera ----------
     El botón es un enlace normal. Aquí solo se retrasa la salida lo que dura la reacción (≤ 1 s).
     Si cualquier cosa falla, se deja que el enlace haga lo suyo. */
  var REACCIONES = ['pulgar', 'golpecito', 'brindis'];
  document.querySelectorAll('[data-comprar]').forEach(function (enlace) {
    enlace.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var destino = enlace.href;
      try {
        var venta = enlace.closest('.venta');
        var campo = venta && venta.querySelector('.comprar__email:not([hidden]) input[type="email"]');
        if (campo) {
          var obligatorio = opciones.emailAntesDeComprar === 'obligatorio';
          var msg = errorEmail(campo.value, obligatorio);
          marcarError(campo, msg);
          if (msg) { e.preventDefault(); campo.focus(); return; }
          if (campo.value.trim()) {
            var datos = new FormData();
            datos.append('tipo', 'compra');
            datos.append('email', campo.value.trim());
            datos.append('evento', enlace.getAttribute('data-evento') || '');
            datos.append('t', String(cargadaEn));
            datos.append('web', '');
            // keepalive: el envío sigue aunque la página se vaya a la ticketera
            fetch('/api/lista', { method: 'POST', body: datos, headers: { Accept: 'application/json' }, keepalive: true }).catch(function () { /* no frena la compra */ });
          }
        }
        var abuelo = venta && venta.querySelector('[data-abuelo]');
        var tipo = opciones.reaccion === 'aleatoria' ? REACCIONES[Math.floor(Math.random() * REACCIONES.length)] : opciones.reaccion;
        var espera = Math.min(1000, Math.max(0, Number(opciones.reaccionMs) || 0));
        if (!abuelo || !espera) return; // sin reacción: el enlace sigue normal
        e.preventDefault();
        abuelo.setAttribute('data-reaccion', tipo);
        abuelo.style.setProperty('--reaccion-ms', espera + 'ms');
        abuelo.classList.remove('reacciona'); void abuelo.offsetWidth; abuelo.classList.add('reacciona');
        setTimeout(function () { window.location.assign(destino); }, espera);
      } catch (err) {
        // La animación ha fallado: a la ticketera igual
        if (e.defaultPrevented) window.location.assign(destino);
      }
    });
  });

  /* ---------- Aviso de cookies: solo si la página tiene algo de otra web ----------
     Hoy no hay nada de terceros, así que el aviso no sale. Si algún día se añade, se marca así:
       <iframe data-consent-src="https://…"></iframe>
     y solo se carga tras «Aceptar». */
  var aviso = document.getElementById('aviso-cookies');
  var externos = document.querySelectorAll('[data-consent-src]');
  if (aviso && externos.length) {
    var CLAVE = 'veleta_cookies';
    var DOCE_MESES = 365 * 24 * 3600 * 1000;
    var cargar = function () {
      externos.forEach(function (el) { el.setAttribute('src', el.getAttribute('data-consent-src')); el.removeAttribute('data-consent-src'); });
    };
    var g = null;
    try { g = JSON.parse(almacen.leer('localStorage', CLAVE) || 'null'); } catch (e) { g = null; }
    if (g && Date.now() - g.fecha < DOCE_MESES) { if (g.valor === 'aceptar') cargar(); }
    else aviso.hidden = false;
    aviso.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cookies]');
      if (!b) return;
      var valor = b.getAttribute('data-cookies');
      almacen.guardar('localStorage', CLAVE, JSON.stringify({ valor: valor, fecha: Date.now() }));
      aviso.hidden = true;
      if (valor === 'aceptar') cargar();
    });
  }
})();
