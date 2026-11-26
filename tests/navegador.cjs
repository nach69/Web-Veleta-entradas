// Comprobaciones en un navegador real (Chromium + Playwright).
// Uso: npm run test:navegador  (construye dist/ con los datos reales y dist-pruebas/ con tests/fixtures/estados)
//
// - dist-pruebas: un evento pasado, el A (12/12/2026 23:00–05:00, con vídeo y enlace) y el B (16/01/2027,
//   censurado, sin enlace). Se mueve el reloj del navegador para ver que el estado cambia AL CARGAR.
// - dist: los datos reales (hoy, sin eventos) → lista de espera.
// El formulario pasa por el Worker de verdad (src/worker.js) con el envío de correo simulado.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json', '.txt': 'text/plain' };
const CSP = fs.readFileSync(path.join(RAIZ, 'publico/_headers'), 'utf8').match(/Content-Security-Policy: (.+)/)[1];

let fallos = 0;
const ok = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLA') + ' ' + texto); if (!cond) fallos++; };
const correos = []; // lo que el Worker habría mandado a info@

function servidor(dist, worker) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://' + req.headers.host);
    if (url.pathname.startsWith('/api/')) {
      const trozos = [];
      for await (const t of req) trozos.push(t);
      const peticion = new Request(url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? Buffer.concat(trozos) : undefined });
      const r = await worker.fetch(peticion, { RESEND_API_KEY: 'falsa', EMAIL_FROM: 'Veleta <web@ejemplo.com>' });
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

  // ---------- 1. Con evento: intro ≤ 1,5 s → pantalla de venta ----------
  {
    const { ctx, p } = await nuevaPagina({}, madrid('2026-12-01T12:00:00'));
    await p.goto(PRUEBAS + '/');
    ok(await actual(p) === 'ev-2026-12-12-2', '1/12: toca el evento A');
    ok(await fase(p) === 'intro', 'primera visita: empieza la intro de la tele');
    ok(await p.isVisible('.tele video'), 'la tele emite el vídeo del evento');
    ok(await p.$eval('.tele video', (v) => v.muted), 'el vídeo va sin sonido');
    ok(await p.isHidden('#ev-2026-12-12-2-venta'), 'durante la intro no se ve aún la venta');
    await esperar(1600);
    ok(await fase(p) === 'pantalla', 'a los 1,5 s se pasa sola a la pantalla de venta');
    ok(await p.isVisible('#ev-2026-12-12-2-venta'), 'se ve la venta del evento A');
    ok(await p.isHidden('#ev-2027-01-16-3-venta') && await p.isHidden('#lista'), 'no se ven ni el B ni la lista de espera');
    ok((await p.textContent('#ev-2026-12-12-2-venta')).includes('sábado 12 de diciembre · 23:00'), 'fecha legible');
    ok(await p.$eval('#ev-2026-12-12-2-venta [data-comprar]', (a) => a.getAttribute('href')) === 'https://ticketera.example/evento-a', 'el botón es un enlace normal a la ticketera');
    ok(await p.isVisible('#ev-2026-12-12-2-venta .comprar__email'), 'email (opcional) antes de comprar visible');
    ok(await p.isVisible('#ev-2026-12-12-2-venta [data-sonido]'), 'botón «Activar sonido»');
    await p.click('#ev-2026-12-12-2-venta [data-sonido]');
    ok(!(await p.$eval('.tele video', (v) => v.muted)), 'el sonido solo se activa al pulsar');
    await p.reload();
    ok(await fase(p) === 'pantalla', 'en la misma visita ya no se repite la intro');
    ok(await p.isHidden('#aviso-cookies'), 'sin nada de otras webs, no sale el aviso de cookies');
    await ctx.close();
  }

  // ---------- 2. Saltar la intro con un toque ----------
  {
    const { ctx, p } = await nuevaPagina({}, madrid('2026-12-01T12:00:00'));
    await p.goto(PRUEBAS + '/');
    const t0 = Date.now();
    await p.tap('[data-escena]');
    await p.waitForFunction(() => document.documentElement.getAttribute('data-fase') === 'pantalla');
    ok(Date.now() - t0 < 700, 'un toque salta la intro');
    await ctx.close();
  }

  // ---------- 3. Comprar: email opcional, reacción ≤ 1 s y ticketera ----------
  {
    const { ctx, p } = await nuevaPagina();
    await p.goto(PRUEBAS + '/');
    await p.tap('[data-escena]');
    await esperar(3200); // el antispam pide más de 3 s
    await p.fill('#ev-2026-12-12-2-email', 'mal@');
    await p.click('#ev-2026-12-12-2-venta [data-comprar]');
    ok(p.url().startsWith(PRUEBAS) && (await p.textContent('#ev-2026-12-12-2-email-error')).length > 0, 'si el email está mal escrito, avisa y no se va');
    await p.fill('#ev-2026-12-12-2-email', 'compradora@ejemplo.com');
    const antes = correos.length;
    const t0 = Date.now();
    await p.click('#ev-2026-12-12-2-venta [data-comprar]');
    ok(await p.$eval('#ev-2026-12-12-2-venta [data-abuelo]', (a) => a.classList.contains('reacciona') && a.dataset.reaccion === 'pulgar'), 'el abuelo reacciona al pulsar (pulgar)');
    await p.waitForURL('https://ticketera.example/evento-a');
    const tarda = Date.now() - t0;
    ok(tarda >= 700 && tarda < 1300, `la ticketera se abre tras la reacción (${tarda} ms, máx. ~1 s)`);
    await esperar(300);
    const c = correos.slice(antes).find((x) => /Email antes de comprar/.test(x.subject));
    ok(c && c.reply_to === 'compradora@ejemplo.com' && /Evento de prueba A/.test(c.text), 'el email antes de comprar llega a info@ con el evento');
    await ctx.close();
  }
  {
    // Sin email (es opcional): se compra igual y no se manda nada
    const { ctx, p } = await nuevaPagina();
    await p.goto(PRUEBAS + '/');
    await p.tap('[data-escena]');
    const antes = correos.length;
    await p.click('#ev-2026-12-12-2-venta [data-comprar]');
    await p.waitForURL('https://ticketera.example/evento-a');
    ok(correos.length === antes, 'sin email también se compra, y no se envía nada');
    await ctx.close();
  }

  // ---------- 4. El estado cambia solo con la fecha (al cargar, sin otra build) ----------
  for (const [cuando, esperado, texto] of [
    ['2026-12-13T10:00:00', 'ev-2026-12-12-2', 'el 13/12 por la mañana sigue el A (acaba de madrugada)'],
    ['2026-12-14T10:00:00', 'ev-2027-01-16-3', 'el 14/12 pasa solo al B'],
    ['2027-01-17T10:00:00', 'ninguno', 'el 17/01 ya no hay evento: sin señal']
  ]) {
    const { ctx, p } = await nuevaPagina({}, madrid(cuando));
    await p.goto(PRUEBAS + '/');
    await p.tap('[data-escena]');
    ok(await actual(p) === esperado, texto);
    if (esperado === 'ev-2027-01-16-3') {
      const venta = '#ev-2027-01-16-3-venta';
      ok(await p.isVisible(venta + ' .btn--apagado') && (await p.textContent(venta)).includes('Entradas pronto'), 'sin enlace de compra: «Entradas pronto»');
      ok(await p.$$eval(venta + ' [data-comprar]', (a) => a.length) === 0, 'y ningún botón de compra');
      ok(await p.isVisible(venta + ' .censura'), 'evento censurado: nombre tapado');
      ok((await p.textContent(venta)).includes('PENDIENTE: precio'), 'precio que falta: PENDIENTE');
      ok(await p.isVisible('[data-bloque="ev-2027-01-16-3"] mark.pendiente'), 'sin vídeo: la tele dice PENDIENTE');
    }
    if (esperado === 'ninguno') {
      ok(await p.isVisible('#lista') && (await p.textContent('#lista h1')) === 'Estamos esperando al nuevo programa', 'pantalla de espera con su email');
      ok(await p.isVisible('[data-sin-senal]'), 'la tele está sin señal');
    }
    await ctx.close();
  }

  // ---------- 5. «Reducir movimiento»: sin zoom, solo fundido ----------
  {
    const { ctx, p } = await nuevaPagina({ reducedMotion: 'reduce' }, madrid('2026-12-01T12:00:00'));
    await p.goto(PRUEBAS + '/');
    ok(await p.$eval('.salon', (s) => getComputedStyle(s).animationName) === 'fundido-tele', 'con «reducir movimiento» la intro es un fundido, sin zoom');
    await esperar(1600);
    ok(await p.$eval('.salon', (s) => getComputedStyle(s).transform) === 'none', 'y la tele no se agranda');
    await ctx.close();
  }

  // ---------- 6. Sin JavaScript ----------
  {
    const { ctx, p } = await nuevaPagina({ javaScriptEnabled: false });
    await p.goto(PRUEBAS + '/');
    ok(await p.isVisible('#ev-2026-12-12-2-venta'), 'sin JS: se ve la venta del evento (el de la build)');
    ok(await p.isHidden('#lista') && await p.isHidden('#ev-2027-01-16-3-venta'), 'sin JS: solo ese bloque');
    ok(await p.isHidden('#ev-2026-12-12-2-venta .comprar__email'), 'sin JS: no se pide email');
    await p.click('#ev-2026-12-12-2-venta [data-comprar]');
    await p.waitForURL('https://ticketera.example/evento-a');
    ok(true, 'sin JS: «Comprar entrada» lleva a la ticketera');

    await p.goto(REAL + '/');
    ok(await p.isVisible('#lista'), 'sin JS y sin eventos: lista de espera');
    const antes = correos.length;
    await p.fill('#lista-email', 'sinjs@ejemplo.com');
    await p.click('#lista [type=submit]');
    await p.waitForURL(REAL + '/gracias/');
    ok((await p.textContent('h1')).includes('Ya estás en la lista'), 'sin JS: el alta lleva a «Ya estás en la lista»');
    ok(correos.slice(antes).some((x) => x.reply_to === 'sinjs@ejemplo.com'), 'sin JS: el alta llega a info@');
    await ctx.close();
  }

  // ---------- 7. Web real (sin eventos): lista de espera con JS, legales y enlaces ----------
  {
    const { ctx, p } = await nuevaPagina();
    await p.goto(REAL + '/');
    ok(await actual(p) === 'ninguno', 'datos reales: hoy no hay evento');
    await p.tap('[data-escena]');
    await p.click('#lista [type=submit]');
    ok((await p.textContent('#lista-email-error')).includes('Falta tu email'), 'avisa si falta el email');
    await esperar(3200);
    const antes = correos.length;
    await p.fill('#lista-email', 'conjs@ejemplo.com');
    await p.click('#lista [type=submit]');
    await p.waitForSelector('.form-estado.es-ok');
    ok(correos.slice(antes).some((x) => /Lista de espera/.test(x.subject) && x.reply_to === 'conjs@ejemplo.com'), 'con JS: el alta llega a info@ sin recargar');
    ok((await p.textContent('#lista .legal-corto')).includes('Puedes darte de baja'), 'información básica de privacidad bajo el formulario');

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
