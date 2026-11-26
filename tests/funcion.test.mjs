// Prueba lo que recibe el formulario en el Worker, con un envío de correo simulado.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const URL_WEB = 'https://veleta.example/api/lista';
function peticion(campos, cabeceras = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  return new Request(URL_WEB, { method: 'POST', body: fd, headers: { Accept: 'application/json', Origin: 'https://veleta.example', 'CF-Connecting-IP': '9.9.9.9', ...cabeceras } });
}
const campos = () => ({ tipo: 'lista', t: String(Date.now() - 10000), web: '', email: 'lucia@ejemplo.com' });
const env = { RESEND_API_KEY: 'clave-falsa', EMAIL_FROM: 'Veleta <web@gruposobremesa.com>', ASSETS: { fetch: () => new Response('estático') } };

test('manda el alta a info@ con responder-a la persona', async (t) => {
  const f = mock.method(globalThis, 'fetch', async () => new Response('{"id":"1"}', { status: 200 }));
  t.after(() => f.mock.restore());
  const res = await worker.fetch(peticion(campos()), env);
  assert.equal(res.status, 200);
  const cuerpo = JSON.parse(f.mock.calls[0].arguments[1].body);
  assert.deepEqual(cuerpo.to, ['info@gruposobremesa.com']);
  assert.equal(cuerpo.reply_to, 'lucia@ejemplo.com');
  assert.match(cuerpo.subject, /Lista de espera/);
  assert.match(cuerpo.text, /IP: 9\.9\.9\.9/);
});

test('EMAIL_TO cambia el destino', async (t) => {
  const f = mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 200 }));
  t.after(() => f.mock.restore());
  await worker.fetch(peticion(campos()), { ...env, EMAIL_TO: 'lista@ejemplo.com' });
  assert.deepEqual(JSON.parse(f.mock.calls[0].arguments[1].body).to, ['lista@ejemplo.com']);
});

test('un robot recibe «ok» pero no se envía nada', async (t) => {
  const f = mock.method(globalThis, 'fetch', async () => new Response('{}'));
  t.after(() => f.mock.restore());
  const res = await worker.fetch(peticion({ ...campos(), web: 'x' }), env);
  assert.equal(res.status, 200);
  assert.equal(f.mock.callCount(), 0);
});

test('rechaza envíos desde otra web', async () => {
  const res = await worker.fetch(peticion(campos(), { Origin: 'https://malo.com' }), env);
  assert.equal(res.status, 403);
});

test('sin clave configurada avisa en vez de fingir que envía', async () => {
  const res = await worker.fetch(peticion(campos()), { ASSETS: env.ASSETS });
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /info@gruposobremesa\.com/);
});

test('si falla el proveedor de correo, se dice', async (t) => {
  const f = mock.method(globalThis, 'fetch', async () => new Response('error', { status: 500 }));
  t.after(() => f.mock.restore());
  const res = await worker.fetch(peticion(campos()), env);
  assert.equal(res.status, 502);
});

test('sin JavaScript: lleva a /gracias/ o a /error-envio/', async (t) => {
  const f = mock.method(globalThis, 'fetch', async () => new Response('{}'));
  t.after(() => f.mock.restore());
  const ok = await worker.fetch(peticion(campos(), { Accept: 'text/html' }), env);
  assert.equal(ok.status, 303);
  assert.equal(ok.headers.get('Location'), 'https://veleta.example/gracias/');
  const mal = await worker.fetch(peticion({ ...campos(), email: 'nada' }, { Accept: 'text/html' }), env);
  assert.equal(mal.headers.get('Location'), 'https://veleta.example/error-envio/');
});

test('el Worker solo actúa en /api/*', async () => {
  assert.equal(await (await worker.fetch(new Request('https://veleta.example/'), env)).text(), 'estático');
  assert.equal((await worker.fetch(new Request('https://veleta.example/api/otra'), env)).status, 404);
  assert.equal((await worker.fetch(new Request('https://veleta.example/api/lista'), env)).status, 405);
});
