// Prueba la construcción: los datos reales son válidos, los errores paran la publicación
// y los textos de consentimiento coinciden con los de la página.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { erroresEvento, erroresOpciones } from '../scripts/lib.mjs';
import { TEXTO_ALTA_LISTA, TEXTO_ALTA_COMPRA } from '../lib/formulario.mjs';

const RAIZ = new URL('..', import.meta.url).pathname;
const leerJSON = (r) => JSON.parse(readFileSync(join(RAIZ, r), 'utf8'));

test('los datos reales del repositorio son válidos', () => {
  for (const ev of leerJSON('datos/eventos.json')) assert.deepEqual(erroresEvento(ev), []);
  assert.deepEqual(erroresOpciones(leerJSON('datos/config.json').opciones), []);
});

function construir(eventos, nombre, config) {
  const datos = mkdtempSync(join(tmpdir(), 'veleta-'));
  const dist = join(datos, 'dist');
  writeFileSync(join(datos, 'eventos.json'), typeof eventos === 'string' ? eventos : JSON.stringify(eventos));
  if (config) writeFileSync(join(datos, 'config.json'), JSON.stringify(config));
  const r = spawnSync('node', ['scripts/build.mjs'], { cwd: RAIZ, env: { ...process.env, DATOS: datos, DIST: dist }, encoding: 'utf8' });
  return { ...r, dist, limpiar: () => rmSync(datos, { recursive: true, force: true }), nombre };
}

test('con datos mal escritos NO se construye y se explica en español', () => {
  const r = construir([{ nombre: 'X', fecha: '12/12/2026', lugar: null, precio: null, enlaceCompra: null, videoTele: null, videoExclusivo: null }]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /No se puede construir la web/);
  assert.match(r.stderr, /fecha «12\/12\/2026» no válida/);
  assert.equal(existsSync(join(r.dist, 'index.html')), false);
  r.limpiar();
});

test('un JSON roto o un vídeo que no existe paran la build', () => {
  const roto = construir('[{ "nombre": "X", }]');
  assert.notEqual(roto.status, 0);
  assert.match(roto.stderr, /mal escrito/);
  roto.limpiar();
  const sinVideo = construir([{ nombre: 'X', fecha: '2030-01-01T20:00', lugar: null, precio: null, enlaceCompra: null, videoTele: '/video/no-existe.mp4', videoExclusivo: null }]);
  assert.notEqual(sinVideo.status, 0);
  assert.match(sinVideo.stderr, /no existe el archivo publico\/video\/no-existe\.mp4/);
  sinVideo.limpiar();
});

const SIN_ENLACE = { nombre: 'X', fecha: '2030-01-01T20:00', lugar: null, precio: null, enlaceCompra: null, videoTele: null, videoExclusivo: null };

test('evento sin enlace propio: botón al enlace general de la ticketera (Lema)', () => {
  const r = construir([SIN_ENLACE]);
  assert.equal(r.status, 0, r.stderr);
  const html = readFileSync(join(r.dist, 'index.html'), 'utf8');
  assert.match(html, /href="https:\/\/veleta\.lema\.club" rel="noopener" data-comprar/);
  assert.doesNotMatch(html, /Entradas pronto/);
  r.limpiar();
  const propio = construir([{ ...SIN_ENLACE, enlaceCompra: 'https://veleta.lema.club/evento-x' }]);
  assert.match(readFileSync(join(propio.dist, 'index.html'), 'utf8'), /href="https:\/\/veleta\.lema\.club\/evento-x"/);
  propio.limpiar();
});

test('lo que falta sale como PENDIENTE y sin ningún enlace de compra no hay botón', () => {
  const r = construir([SIN_ENLACE], 'sin enlace', { ticketera: { enlaceGeneral: null } });
  assert.equal(r.status, 0, r.stderr);
  const html = readFileSync(join(r.dist, 'index.html'), 'utf8');
  assert.match(html, /PENDIENTE: lugar/);
  assert.match(html, /PENDIENTE: precio/);
  assert.match(html, /Entradas pronto/);
  assert.doesNotMatch(html, /data-comprar/);
  r.limpiar();
});

test('los textos de consentimiento de la página coinciden con los que se guardan', () => {
  execFileSync('node', ['scripts/build.mjs'], { cwd: RAIZ, env: { ...process.env, DATOS: join(RAIZ, 'tests/fixtures/estados'), DIST: join(RAIZ, 'dist-pruebas') } });
  const html = readFileSync(join(RAIZ, 'dist-pruebas/index.html'), 'utf8');
  const texto = (tipo) => [...html.matchAll(new RegExp(`data-texto-alta="${tipo}">([^<]*)<`, 'g'))].map((m) => m[1]);
  assert.ok(texto('lista').length >= 1);
  assert.ok(texto('compra').length >= 1);
  for (const t of texto('lista')) assert.equal(t, TEXTO_ALTA_LISTA);
  for (const t of texto('compra')) assert.equal(t, TEXTO_ALTA_COMPRA);
});

test('la página no carga nada de fuera ni lleva scripts en línea (CSP)', () => {
  const html = readFileSync(join(RAIZ, 'dist/index.html'), 'utf8');
  assert.doesNotMatch(html, /<(script|link|img|video|source|iframe)[^>]+(src|href)="https?:\/\//);
  assert.doesNotMatch(html, /<script>(?!<\/script>)|<script(?![^>]*src=)[^>]*>/);
  assert.doesNotMatch(html, / style="/);
});
