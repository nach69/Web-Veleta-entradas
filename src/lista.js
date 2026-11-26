// Recibe la lista de espera (estado «sin evento») y el email antes de comprar (estado «con evento»)
// y los manda por correo a info@ usando la API de Resend (plan gratuito).
//
// Variables que hay que poner en Cloudflare (el Worker → Settings → Variables and Secrets):
//   RESEND_API_KEY  (secreto)  clave de Resend
//   EMAIL_FROM                 desde qué dirección se envía (p. ej.  Veleta <web@dominio-de-veleta>)
//   EMAIL_TO                   a qué dirección llegan las altas
// Qué correos son (uno de Veleta o el del grupo) está por decidir con Nacho: sin las tres, no se envía nada.
import { revisarEnvio, componerCorreo } from '../lib/formulario.mjs';

function respuesta(request, _tipo, ok, error, status) {
  const quiereJSON = (request.headers.get('Accept') || '').includes('application/json');
  if (quiereJSON) {
    return new Response(JSON.stringify(ok ? { ok: true } : { ok: false, error }), {
      status: ok ? 200 : status || 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
  // Sin JavaScript: se lleva a una página que dice cómo ha ido
  const destino = new URL(ok ? '/gracias/' : '/error-envio/', request.url);
  return Response.redirect(destino.toString(), 303);
}

export async function onRequestPost({ request, env }) {
  // Solo aceptamos envíos desde la propia web
  const origen = request.headers.get('Origin');
  if (origen && origen !== 'null' && new URL(origen).host !== new URL(request.url).host) {
    return new Response('Origen no permitido', { status: 403 });
  }

  let campos;
  try {
    const form = await request.formData();
    campos = Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']));
  } catch {
    return respuesta(request, 'lista', false, 'No se ha podido leer el formulario.', 400);
  }

  const revision = revisarEnvio(campos);
  // A los robots se les dice que todo ha ido bien, pero no se envía nada
  if (revision.spam) return respuesta(request, revision.tipo, true);
  if (revision.error) return respuesta(request, revision.tipo, false, revision.error, 400);

  const destino = env.EMAIL_TO;
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !destino) {
    return respuesta(request, revision.tipo, false,
      'Esto todavía no está conectado. Vuelve a probar en unos días, perdona.', 503);
  }

  const correo = componerCorreo(revision, { ip: request.headers.get('CF-Connecting-IP') });
  const envio = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [destino],
      reply_to: correo.responderA,
      subject: correo.asunto,
      text: correo.texto
    })
  }).catch(() => null);

  if (!envio || !envio.ok) {
    return respuesta(request, revision.tipo, false,
      'No se ha podido enviar ahora mismo. Prueba otra vez en unos minutos.', 502);
  }
  return respuesta(request, revision.tipo, true);
}
