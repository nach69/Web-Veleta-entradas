// Worker de Cloudflare: sirve la landing (carpeta dist/) y recibe la lista de espera en /api/lista.
// Las páginas, vídeos y estilos los sirve Cloudflare directamente; este código solo se ejecuta para /api/*.
import { onRequestPost } from './lista.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/lista') {
      if (request.method === 'POST') return onRequestPost({ request, env });
      return new Response('Método no permitido', { status: 405, headers: { Allow: 'POST' } });
    }
    if (url.pathname.startsWith('/api/')) return new Response('No encontrado', { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
