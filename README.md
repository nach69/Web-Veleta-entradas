# Landing de entradas de Veleta

Una sola pantalla para vender entradas: el abuelo viendo la tele → zoom → pantalla de venta.
Cambia sola entre dos estados según la fecha (hora de Madrid):

- **Con evento**: la tele emite el vídeo del evento y luego sale la pantalla de venta con «Comprar entrada».
- **Sin evento** (no hay ninguno o ya pasó): tele sin señal y «Estamos esperando al nuevo programa» con un email para la lista de espera.

Se publicará sola en **Cloudflare** (un *Worker*) cada vez que se guarde un cambio en la rama `main`. **Todavía no está publicada.**

> El diseño es PROVISIONAL (rayados grises). Lo definitivo es cómo funciona; el aspecto vendrá aparte.

---

## Cómo añadir un evento

1. Abre **`datos/eventos.json`** en GitHub y pulsa el lápiz (✏️).
2. Si está vacío (`[]`), sustitúyelo por esto y cambia los datos. Si ya hay eventos, copia uno (de `{` a `}`) y pégalo debajo con una coma entre medias:

   ```json
   [
     {
       "nombre": "Nombre del evento",
       "fecha": "2027-03-14T23:00",
       "horaFin": "05:00",
       "lugar": "Sitio, Valencia",
       "precio": "15 €",
       "enlaceCompra": "https://enlace-de-la-ticketera",
       "videoTele": "/video/2027-03-14-tele.mp4",
       "posterTele": null,
       "videoExclusivo": "qué vídeo se manda a quien compre (solo de referencia)"
     }
   ]
   ```

   - **fecha**: año-mes-día, una `T` y la hora de Madrid (`2027-03-14T23:00`).
   - **horaFin** (opcional): si acaba de madrugada (`05:00`), el evento sigue en la web hasta el día siguiente.
   - Si no sabes un dato, pon `null` (sin comillas): en la web saldrá como «PENDIENTE».
   - Sin enlace de compra todavía (`"enlaceCompra": null`): sale «Entradas pronto» y no hay botón.
   - Evento aún secreto: añade `"censurado": true` y el nombre y el lugar salen tapados.
3. Sube el vídeo de la tele a **`publico/video/`** (*Add file → Upload files*) con el mismo nombre que en `"videoTele"`. En mp4 y de menos de 3 MB.
4. Pulsa **Commit changes**.

No hace falta borrar los eventos pasados: la web los esconde sola. Si hay varios futuros, enseña el más próximo.

Si te equivocas en el formato, Cloudflare **no publica** el cambio y la web sigue como estaba; el error sale explicado en español en *Deployments / Builds* del Worker.

## Cosas por decidir (en `datos/config.json`, apartado `opciones`)

| Opción | Valores | Puesto ahora |
|---|---|---|
| `emailAntesDeComprar` | `no` · `opcional` · `obligatorio` | `opcional` |
| `reaccion` (del abuelo al pulsar comprar) | `pulgar` · `golpecito` · `brindis` · `aleatoria` | `pulgar` |
| `sonido` | `nunca` · `boton` (sin sonido hasta pulsar «Activar sonido») | `boton` |
| `introMaxMs` | duración de la intro, hasta 1500 | 1500 |
| `reaccionMs` | duración de la reacción, hasta 1000 | 800 |

## Para quien programe

- `npm run build` → `dist/` · `npm test` · `npm run test:navegador` (Chromium) · `npx wrangler deploy --dry-run`.
- Sin dependencias. Detalles y decisiones: `CLAUDE.md`.
- Variables del Worker en Cloudflare: `RESEND_API_KEY` (secreto), `EMAIL_FROM`, `EMAIL_TO` (opcional; por defecto info@gruposobremesa.com).
