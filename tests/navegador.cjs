// Comprobaciones en un navegador real (Chromium + Playwright).
// Intro: 0,7 s quieta + 2,3 s de zoom + 0,5 s de sacudida ≈ 3,5 s → segunda pantalla.
// Uso: npm run test:navegador  (construye dist/ con los datos reales y dist-pruebas/ con tests/fixtures/estados)
//
// - dist-pruebas: un evento pasado, el A (12/12/2026 23:00–05:00, con vídeo, 3 tramos y tema) y el B
//   (16/01/2027, censurado, sin vídeo, sin enlace: «Entradas pronto»). Se mueve el reloj del navegador para ver que el estado cambia AL CARGAR.
// - dist: los datos reales (hoy, sin eventos) → lista de espera.
// El formulario pasa por el Worker de verdad (src/worker.js) con el envío de correo simulado.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const CSP = fs.readFileSync(path.join(RAIZ, 'publico/_headers'), 'utf8').match(/Content-Security-Policy: (.+)/)[1];

let fallos = 0;
const ok = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLA') + ' ' + texto); if (!cond) fallos++; };
const correos = []; // lo que el Worker habría mandado al correo de altas

function servidor(dist, worker) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://' + req.headers.host);
    if (url.pathname.startsWith('/api/')) {
      const trozos = [];
      for await (const t of req) trozos.push(t);
      const peticion = new Request(url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? Buffer.concat(trozos) : undefined });
      const r = await worker.fetch(peticion, { RESEND_API_KEY: 'falsa', EMAIL_FROM: 'Veleta <web@ejemplo.com>', EMAIL_TO: 'altas@ejemplo.com' });
      res.writeHead(r.status, Object.fromEntries(r.headers));
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    let ruta = decodeURIComponent(url.pathname);
    if (ruta.endsWith('/')) ruta += 'index.html';
    const archivo = path.join(dist, ruta);
    if (!archivo.startsWith(dist) || !fs.existsSync(archivo)) {
      res.writeHead(404, { 'Content-Type': TIPOS['.html'], 'Content-Security-Policy': CSP });
      return res.end(fs.readFileSync(path.join(dist, '404.html')));
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Content-Security-Policy': CSP });
    fs.createReadStream(archivo).pipe(res);
  });
}
const escuchar = (s) => new Promise((r) => s.listen(0, () => r(`http://localhost:${s.address().port}`)));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const madrid = (iso) => new Date(iso + '+01:00');

(async () => {
  // Envío de correo simulado: el Worker llama a fetch('https://api.resend.com/emails')
  const fetchReal = globalThis.fetch;
  globalThis.fetch = async (url, op) => {
    if (String(url).startsWith('https://api.resend.com/')) { correos.push(JSON.parse(op.body)); return new Response('{"id":"x"}', { status: 200 }); }
    return fetchReal(url, op);
  };
  const worker = (await import(path.join(RAIZ, 'src/worker.js'))).default;
  const s1 = servidor(path.join(RAIZ, 'dist-pruebas'), worker);
  const s2 = servidor(path.join(RAIZ, 'dist'), worker);
  const PRUEBAS = await escuchar(s1);
  const REAL = await escuchar(s2);
  const navegador = await chromium.launch();

  const externas = []; const erroresJS = [];
  async function nuevaPagina(opciones = {}, reloj) {
    const ctx = await navegador.newContext({ ...devices['iPhone 13'], ...opciones });
    const p = await ctx.newPage();
    p.on('request', (r) => { const u = r.url(); if (!u.startsWith(PRUEBAS) && !u.startsWith(REAL) && !u.startsWith('https://ticketera.example/') && !u.startsWith('data:')) externas.push(u); });
    p.on('pageerror', (e) => erroresJS.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) erroresJS.push(m.text()); });
    await p.route('https://ticketera.example/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Ticketera de prueba</p>' }));
    if (reloj) await p.clock.setFixedTime(reloj);
    return { ctx, p };
  }
  const actual = (p) => p.evaluate(() => document.documentElement.getAttribute('data-actual'));
  const fase = (p) => p.evaluate(() => document.documentElement.getAttribute('data-fase'));

  const INTRO_MS = 3500;
  const A = '#ev-2026-12-12-2-venta';
  const animando = (p, id) => p.evaluate((n) => document.getAnimations().some((a) => a.id === n && a.playState === 'running'), id);

  // ---------- 1. Con evento, móvil: quieta → zoom → sacudida → segunda pantalla ----------
  {
    const { ctx, p } = await nuevaPagina({}, madrid('2026-12-01T12:00:00'));
    await p.goto(PRUEBAS + '/');
    ok(await actual(p) === 'ev-2026-12-12-2', '1/12: toca el evento A');
    ok(await fase(p) === 'intro', 'primera visita: empieza la intro');
    ok(await p.isVisible('.tele video'), 'la tele emite el vídeo del evento');
    ok(await p.$eval('.tele video', (v) => v.muted && v.autoplay && v.playsInline), 'vídeo sin sonido, autoplay y playsinline');
    ok(await p.isVisible('.escena__foto--provisional') && (await p.textContent('.escena__foto--provisional')).includes('PROVISIONAL'), 'sin foto todavía: gris PROVISIONAL');
    const caja = await p.$eval('[data-tele]', (t) => { const r = t.getBoundingClientRect(); return { izq: r.left, der: r.right, ancho: innerWidth }; });
    ok(caja.izq >= 0 && caja.der <= caja.ancho, 'en el móvil la tele cae entera dentro de la pantalla');
    ok(await p.isHidden(A), 'durante la intro no se ve la segunda pantalla');
    await p.waitForFunction(() => document.getAnimations().some((a) => a.id === 'zoom'), null, { timeout: 1500 });
    ok(true, 'a los 0,7 s empieza el zoom');
    await p.waitForTimeout(1500);
    const escala = await p.$eval('[data-lienzo]', (l) => new DOMMatrix(getComputedStyle(l).transform).a);
    ok(escala > 1.2, `el zoom acerca la tele (escala ${escala.toFixed(2)})`);
    await p.waitForFunction(() => document.getAnimations().some((a) => a.id === 'sacudida'), null, { timeout: 2500 });
    ok(await animando(p, 'sacudida') || await fase(p) === 'pantalla', 'después del zoom, sacudida de cámara');
    await p.waitForFunction(() => document.documentElement.getAttribute('data-fase') === 'pantalla', null, { timeout: 2500 });
    ok(true, 'tras ~3,5 s sale sola la segunda pantalla');
    ok(await p.$eval('.tele video', (v) => v.paused), 'al acabar, el vídeo se pausa');
    await p.waitForTimeout(500);
    ok(await p.isVisible(A) && await p.isHidden('#ev-2027-01-16-3-venta') && await p.isHidden('#lista'), 'se ve la venta del A y nada más');
    ok(await p.isHidden('[data-escena]'), 'la escena desaparece');
    ok((await p.textContent(A)).includes('sábado 12 de diciembre · 23:00') && (await p.textContent(A)).includes('Lugar de prueba A'), 'nombre, fecha y lugar');
    const tramos = await p.$$eval(A + ' a.tramo', (as) => as.map((a) => ({ href: a.getAttribute('href'), txt: a.textContent })));
    ok(tramos.length === 3, '3 tramos, cada uno una fila');
    ok(tramos.every((t) => t.href === 'https://ticketera.example/evento-a'), 'todos los tramos llevan al MISMO enlace');
    ok(tramos[1].txt.includes('15,50 €'), 'precios en euros a la española');
    const alto = await p.$eval(A + ' a.tramo', (a) => a.getBoundingClientRect().height);
    ok(alto >= 56, `filas grandes para el dedo (${Math.round(alto)} px)`);
    ok(await p.$eval(A, (el) => getComputedStyle(el).getPropertyValue('--acento').trim()) === '#ff3b3b', 'tema del evento: color de acento');
    ok(await p.$eval(A, (el) => getComputedStyle(el, '::before').backgroundImage.includes('/img/texturas/prueba.png')), 'tema del evento: textura');
    ok(await p.$$eval('[data-sonido]', (b) => b.length) === 0, 'no hay botón de sonido');
    ok(await p.isVisible(A + ' .comprar__email'), 'email (opcional) antes de los tramos');
    await p.reload();
    ok(await fase(p) === 'pantalla' && await p.isVisible(A), 'en la misma visita ya no se repite la intro');
    ok(await p.isHidden('#aviso-cookies'), 'sin nada de otras webs, no sale el aviso de cookies');
    await ctx.close();
  }

  // ---------- 2. Saltar la intro con un toque ----------
  {
    const { ctx, p } = await nuevaPagina({}, madrid('2026-12-01T12:00:00'));
    await p.goto(PRUEBAS + '/');
    await p.waitForTimeout(1200);
    const t0 = Date.now();
    await p.tap('[data-escena]');
    await p.waitForFunction(() => document.documentElement.getAttribute('data-fase') === 'pantalla');
    ok(Date.now() - t0 < 600, 'un toque en mitad del zoom salta la intro');
    ok(await p.$eval('.tele video', (v) => v.paused), 'y el vídeo se pausa');
    await p.waitForTimeout(500);
    ok(await p.isVisible(A), 'y sale la venta');
    await ctx.close();
  }

  // ---------- 3. Ordenador ----------
  {
    const { ctx, p } = await nuevaPagina({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }, madrid('2026-12-01T12:00:00'));
    await p.goto(PRUEBAS + '/');
    const r = await p.$eval('[data-lienzo]', (l) => { const b = l.getBoundingClientRect(); return { a: b.width, h: b.height }; });
    ok(r.a >= 1280 && r.h >= 800, 'en el ordenador la foto llena la pantalla');
    await p.waitForFunction(() => document.documentElement.getAttribute('data-fase') === 'pantalla', null, { timeout: INTRO_MS + 2000 });
    await p.waitForTimeout(500);
    ok(await p.isVisible(A), 'en el ordenador también llega a la venta');
    await ctx.close();
  }

  // ---------- 4. Tramos: «opcional» nunca frena; con email válido se manda ----------
  {
    const { ctx, p } = await nuevaPagina();
    await p.goto(PRUEBAS + '/');
    await p.tap('[data-escena]');
    await p.waitForTimeout(3300); // el antispam pide más de 3 s
    await p.fill('#ev-2026-12-12-2-email', 'mal@');
    const antes = correos.length;
    const t0 = Date.now();
    await p.click(A + ' a.tramo >> nth=1');
    await p.waitForURL('https://ticketera.example/evento-a');
    ok(Date.now() - t0 < 1500, 'con «opcional», aunque el email esté mal, el tramo lleva a la ticketera sin esperar');
    ok(correos.length === antes, 'y no se envía un email mal escrito');
    await p.goBack();
    await p.waitForSelector(A);
    await p.waitForTimeout(3300);
    await p.fill('#ev-2026-12-12-2-email', 'compradora@ejemplo.com');
    await p.click(A + ' a.tramo >> nth=2');
    await p.waitForURL('https://ticketera.example/evento-a');
    await p.waitForTimeout(400);
    const c = correos.slice(antes).find((x) => /Email antes de comprar/.test(x.subject));
    ok(c && c.reply_to === 'compradora@ejemplo.com' && /Evento de prueba A/.test(c.text), 'con email válido, el alta llega al correo de altas con el evento');
    await ctx.close();
  }

  // ---------- 5. El estado cambia solo con la fecha (al cargar, sin otra build) ----------
  for (const [cuando, esperado, texto] of [
    ['2026-12-13T10:00:00', 'ev-2026-12-12-2', 'el 13/12 por la mañana sigue el A (acaba de madrugada)'],
    ['2026-12-14T10:00:00', 'ev-2027-01-16-3', 'el 14/12 pasa solo al B'],
    ['2027-01-17T10:00:00', 'ninguno', 'el 17/01 ya no hay evento: sin señal']
  ]) {
    const { ctx, p } = await nuevaPagina({}, madrid(cuando));
    await p.goto(PRUEBAS + '/');
    ok(await actual(p) === esperado, texto);
    if (esperado === 'ninguno') {
      ok(await p.isVisible('[data-sin-senal]'), 'la tele está sin señal (nieve) durante la intro');
      const a1 = await p.$eval('[data-sin-senal]', (c) => c.toDataURL());
      await p.waitForTimeout(250);
      ok(a1 !== await p.$eval('[data-sin-senal]', (c) => c.toDataURL()), 'la nieve se mueve');
    }
    await p.tap('[data-escena]');
    await p.waitForTimeout(500);
    if (esperado === 'ev-2027-01-16-3') {
      const B = '#ev-2027-01-16-3-venta';
      ok((await p.textContent(B)).includes('Entradas pronto') && await p.$$eval(B + ' a', (a) => a.filter((x) => x.classList.contains('tramo')).length) === 0, 'sin ningún enlace: «Entradas pronto» y tramos sin enlace');
      ok(await p.isVisible(B + ' .censura'), 'evento censurado: nombre tapado');
      ok((await p.textContent(B)).includes('PENDIENTE: precio'), 'precio que falta: PENDIENTE');
    }
    if (esperado === 'ninguno') {
      ok(await p.isVisible('#lista') && (await p.textContent('#lista h1')) === 'Estamos esperando al nuevo programa', 'segunda pantalla: «Estamos esperando al nuevo programa»');
      ok((await p.textContent('#lista')).includes('Avísame cuando empiece la emisión'), 'con «Avísame cuando empiece la emisión»');
    }
    await ctx.close();
  }

  // ---------- 6. «Reducir movimiento»: sin zoom ni sacudida, solo fundido ----------
  {
    const { ctx, p } = await nuevaPagina({ reducedMotion: 'reduce' }, madrid('2026-12-01T12:00:00'));
    await p.goto(PRUEBAS + '/');
    await p.waitForFunction(() => document.getAnimations().some((a) => a.id === 'fundido'), null, { timeout: 2000 });
    ok(true, 'con «reducir movimiento» hay un fundido');
    await p.waitForFunction(() => document.documentElement.getAttribute('data-fase') === 'pantalla', null, { timeout: 3000 });
    await p.waitForTimeout(500);
    ok(await p.isVisible(A), 'llega a la segunda pantalla');
    ok(await p.evaluate(() => !document.getAnimations().some((a) => a.id === 'zoom' || a.id === 'sacudida')), 'sin zoom ni sacudida');
    await ctx.close();
    const c2 = await nuevaPagina({ reducedMotion: 'reduce' }, madrid('2026-12-01T12:00:00'));
    const ids = [];
    await c2.p.exposeFunction('__anota', (id) => ids.push(id));
    await c2.p.addInitScript(() => { const o = Element.prototype.animate; Element.prototype.animate = function (k, op) { window.__anota(op && op.id); return o.call(this, k, op); }; });
    await c2.p.goto(PRUEBAS + '/');
    await c2.p.waitForFunction(() => document.documentElement.getAttribute('data-fase') === 'pantalla', null, { timeout: 3000 });
    ok(!ids.includes('zoom') && !ids.includes('sacudida') && ids.includes('fundido'), 'en ningún momento se lanza el zoom ni la sacudida');
    await c2.ctx.close();
  }

  // ---------- 7. Sin JavaScript ----------
  {
    const { ctx, p } = await nuevaPagina({ javaScriptEnabled: false });
    await p.goto(PRUEBAS + '/');
    ok(await p.isVisible('[data-escena]') && await p.isVisible(A), 'sin JS: escena y venta (la del día de la build) a la vez');
    ok(await p.isHidden('#lista') && await p.isHidden('#ev-2027-01-16-3-venta'), 'sin JS: solo ese bloque');
    ok(await p.isHidden(A + ' .comprar__email'), 'sin JS: no se pide email');
    await p.click(A + ' a.tramo >> nth=0');
    await p.waitForURL('https://ticketera.example/evento-a');
    ok(true, 'sin JS: un tramo lleva a la ticketera');

    await p.goto(REAL + '/');
    ok(await p.isVisible('#lista'), 'sin JS y sin eventos: lista de espera');
    const antes = correos.length;
    await p.fill('#lista-email', 'sinjs@ejemplo.com');
    await p.click('#lista [type=submit]');
    await p.waitForURL(REAL + '/gracias/');
    ok((await p.textContent('h1')).includes('Ya estás en la lista'), 'sin JS: el alta lleva a «Ya estás en la lista»');
    ok(correos.slice(antes).some((x) => x.reply_to === 'sinjs@ejemplo.com'), 'sin JS: el alta llega al correo de altas');
    await ctx.close();
  }

  // ---------- 8. Web real (sin eventos): lista de espera con JS, legales y enlaces ----------
  {
    const { ctx, p } = await nuevaPagina();
    await p.goto(REAL + '/');
    ok(await actual(p) === 'ninguno', 'datos reales: hoy no hay evento');
    await p.tap('[data-escena]');
    await p.waitForTimeout(500);
    await p.click('#lista [type=submit]');
    ok((await p.textContent('#lista-email-error')).includes('Falta tu email'), 'avisa si falta el email');
    await p.waitForTimeout(3200);
    const antes = correos.length;
    await p.fill('#lista-email', 'conjs@ejemplo.com');
    await p.click('#lista [type=submit]');
    await p.waitForSelector('.form-estado.es-ok');
    ok(correos.slice(antes).some((x) => /Lista de espera/.test(x.subject) && x.reply_to === 'conjs@ejemplo.com'), 'con JS: el alta llega al correo de altas sin recargar');
    ok((await p.textContent('#lista .legal-corto')).includes('Puedes darte de baja'), 'información básica de privacidad bajo el formulario');
    const colores = await p.evaluate(() => {
      const vistos = new Set();
      document.querySelectorAll('.pantalla *, .pie, .pie *').forEach((el) => {
        if (el.closest('mark.pendiente')) return;
        const cs = getComputedStyle(el);
        [cs.color, cs.backgroundColor, cs.borderTopColor].forEach((c) => {
          const m = c.match(/\d+(\.\d+)?/g); if (!m) return;
          const [r, g, b, a] = m.map(Number);
          if (a === 0) return;
          if (!(Math.abs(r - g) < 3 && Math.abs(g - b) < 3) && !(r === 255 && g === 143 && b === 143)) vistos.add(c);
        });
      });
      return [...vistos];
    });
    ok(colores.length === 0, 'solo blanco, negro y grises (salvo PENDIENTE y errores)' + (colores.length ? ': ' + colores.join(', ') : ''));

    const enlaces = await p.$$eval('a[href^="/"]', (as) => [...new Set(as.map((a) => a.getAttribute('href').split('#')[0]))]);
    for (const h of enlaces) {
      const r = await p.request.get(REAL + h);
      ok(r.status() === 200, `enlace ${h}`);
    }
    ok(await p.$$eval('footer a[href="/aviso-legal/"], footer a[href="/privacidad/"], footer a[href="/cookies/"]', (a) => a.length) === 3, 'legales en el pie');
    for (const ruta of ['/aviso-legal/', '/privacidad/', '/cookies/', '/gracias/', '/error-envio/']) {
      const r = await p.goto(REAL + ruta);
      ok(r.status() === 200 && (await p.$$('h1')).length === 1, `${ruta} carga`);
    }
    const r404 = await p.goto(REAL + '/no-existe/');
    ok(r404.status() === 404, '404 para lo que no existe');
    await ctx.close();
  }

  ok(externas.length === 0, 'no se carga nada de otras webs' + (externas.length ? ': ' + externas.join(', ') : ''));
  ok(erroresJS.length === 0, 'sin errores de JavaScript ni de CSP' + (erroresJS.length ? ': ' + erroresJS.join(' | ') : ''));

  await navegador.close();
  s1.close(); s2.close();
  console.log(fallos ? `\n${fallos} comprobación(es) fallida(s)` : '\nTodo correcto');
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
