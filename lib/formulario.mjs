// Lógica pura de la lista de espera y del email antes de comprar (sin red), para poder probarla.
// La usa src/lista.js, que es lo que recibe los envíos en el Worker de Cloudflare.

import config from '../datos/config.json' with { type: 'json' };

// Estado «sin evento»: alta en la lista de espera. Sin casilla: escribir el email y pulsar el botón
// con este texto a la vista es el consentimiento. Debe coincidir con plantillas/parciales/sin-evento.html
// (un test lo comprueba) porque se guarda en el correo como prueba.
export const TEXTO_ALTA_LISTA =
  `Al apuntarte te avisaremos por email del próximo evento de ${config.nombre}. Puedes darte de baja cuando quieras.`;

// Estado «con evento»: email (opcional u obligatorio, según opciones.emailAntesDeComprar) antes de ir
// a la ticketera. Debe coincidir con el texto de plantillas/parciales/evento.html.
export const TEXTO_ALTA_COMPRA =
  `Si dejas tu email, te escribiremos sobre este y los próximos eventos de ${config.nombre}. Puedes darte de baja cuando quieras.`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIEMPO_MINIMO_MS = 3000;          // un humano tarda más de 3 s en escribir su email
const TIEMPO_MAXIMO_MS = 24 * 3600e3;   // formularios abiertos más de un día: se pide recargar

const limpiarLinea = (s) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').trim();

/**
 * Revisa lo que llega del formulario.
 * Devuelve { spam: true } si parece un robot (se responde «ok» sin enviar nada),
 * { error: '…' } si falta algo, o { datos } si todo está bien.
 */
export function revisarEnvio(campos, ahora = Date.now()) {
  const tipo = campos.tipo === 'compra' ? 'compra' : 'lista';
  if (limpiarLinea(campos.web)) return { spam: true, tipo };
  // La marca de tiempo la pone el JavaScript. Sin JavaScript llega vacía y se acepta (quedan el campo
  // trampa y la comprobación de origen); si llega, tiene que ser de hace más de 3 s.
  const vacia = campos.t == null || String(campos.t).trim() === '';
  const t = Number(campos.t);
  if (!vacia && (!t || ahora - t < TIEMPO_MINIMO_MS)) return { spam: true, tipo };
  if (!vacia && ahora - t > TIEMPO_MAXIMO_MS) return { error: 'El formulario ha caducado. Recarga la página y vuelve a probar.', tipo };

  const email = limpiarLinea(campos.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 150) return { error: 'Revisa el email, parece que tiene algún error.', tipo };

  if (tipo === 'compra') {
    const evento = limpiarLinea(campos.evento).slice(0, 120) || 'sin nombre';
    return { tipo, datos: { email, evento } };
  }
  return { tipo, datos: { email } };
}

/** Fecha y hora legibles en Valencia: «26/11/2026, 12:34:56 (hora de Madrid)». */
export function fechaHoraMadrid(fecha = new Date()) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(fecha) + ' (hora de Madrid)';
}

/** Compone el correo que llega a info@ (guarda la prueba del consentimiento). */
export function componerCorreo({ tipo, datos }, meta = {}) {
  const cuando = fechaHoraMadrid(meta.fecha || new Date());
  const comun = [
    `Email: ${datos.email}`,
    `Fecha y hora del consentimiento: ${cuando}`,
    `IP: ${meta.ip || 'desconocida'}`
  ];
  if (tipo === 'compra') {
    return {
      asunto: `[${config.nombre}] Email antes de comprar: ${datos.email}`,
      responderA: datos.email,
      texto: [
        `Alguien ha dejado su email en la landing de ${config.nombre} antes de ir a comprar la entrada.`,
        'Ojo: esto NO quiere decir que haya pagado; solo que ha pulsado «Comprar entrada».',
        '',
        `Evento: ${datos.evento}`,
        ...comun,
        `Cómo lo dio: escribiendo su email y pulsando «Comprar entrada», con este texto a la vista: «${TEXTO_ALTA_COMPRA}»`,
        '',
        'Guarda este correo: es la prueba del consentimiento.'
      ].join('\n')
    };
  }
  return {
    asunto: `[${config.nombre}] Lista de espera: ${datos.email}`,
    responderA: datos.email,
    texto: [
      `Nueva alta en la lista de espera de ${config.nombre} (no había ningún evento a la venta).`,
      '',
      ...comun,
      `Cómo se apuntó: escribiendo su email y pulsando «Avisadme», con este texto a la vista: «${TEXTO_ALTA_LISTA}»`,
      '',
      'Guarda este correo: es la prueba del consentimiento.'
    ].join('\n')
  };
}
