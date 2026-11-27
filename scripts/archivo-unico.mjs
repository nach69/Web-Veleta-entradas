// Junta una versión ya construida (por defecto dist-modelo/) en UN SOLO archivo .html con todo dentro
// (estilos, código, foto, vídeo, letra y logos), para probarla abriéndola con doble clic, sin Cloudflare.
// Uso: node scripts/archivo-unico.mjs [carpeta] [salida.html]
// Ojo: así no funcionan el envío de emails (necesita el Worker) ni los enlaces a las páginas legales.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const carpeta = resolve(process.argv[2] || 'dist-modelo');
const salida = resolve(process.argv[3] || join(carpeta, 'veleta-modelo.html'));
const TIPOS = { '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const archivo = (ruta) => {
  const f = join(carpeta, decodeURIComponent(ruta.split('?')[0]));
  if (!existsSync(f)) throw new Error(`No existe ${ruta} en ${carpeta}`);
  return f;
};
const dataURI = (ruta) => `data:${TIPOS[extname(ruta).toLowerCase()] || 'application/octet-stream'};base64,${readFileSync(archivo(ruta)).toString('base64')}`;
const cssEnLinea = (css) => css.replace(/url\((['"]?)(\/[^'")]+)\1\)/g, (_, c, ruta) => `url("${dataURI(ruta)}")`);

let html = readFileSync(join(carpeta, 'index.html'), 'utf8');
html = html.replace(/\s*<link rel="preload"[^>]*>/g, '');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, ruta) => `<style>\n${cssEnLinea(readFileSync(archivo(ruta), 'utf8'))}\n</style>`);
// estado.js va en <head> (tiene que correr antes de pintar); main.js, al final del <body>
let finalBody = '';
html = html.replace(/<script src="([^"]+)"( defer)?><\/script>/g, (_, ruta, diferido) => {
  const js = `<script>\n${readFileSync(archivo(ruta), 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`;
  if (diferido) { finalBody += js + '\n'; return ''; }
  return js;
});
html = html.replace('</body>', finalBody + '</body>');
html = html.replace(/(src|poster)="(\/[^"]+)"/g, (_, attr, ruta) => `${attr}="${dataURI(ruta)}"`);
html = html.replace(/href="\/"/g, 'href="#"');
writeFileSync(salida, html);
console.log(`Archivo único: ${salida} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
