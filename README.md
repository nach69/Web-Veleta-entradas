# Landing de entradas de Veleta

Una sola pantalla para vender entradas. Primero se ve una foto antigua en blanco y negro: un señor de
espaldas en su sillón viendo la tele. La cámara se acerca a la tele, da un pequeño «golpe» y aparece la
segunda pantalla. Cambia sola entre dos estados según la fecha (hora de Madrid):

- **Con evento**: la tele emite el vídeo del evento y luego sale la venta: nombre, fecha, lugar y los
  **tramos** de entradas. Cada tramo lleva a la ticketera (Lema).
- **Sin evento** (no hay ninguno o ya pasó): la tele está sin señal y luego sale «Estamos esperando al
  nuevo programa», con un email para la lista de espera.

Se publicará sola en **Cloudflare** (un *Worker*) cada vez que se guarde un cambio en la rama `main`.
**Todavía no está publicada.** Marca solo en blanco y negro.

---

## Cómo añadir un evento

1. Abre **`datos/eventos.json`** en GitHub y pulsa el lápiz (✏️).
2. Si está vacío (`[]`), sustitúyelo por esto y cambia los datos. Si ya hay eventos, copia uno (de `{` a
   `}`) y pégalo debajo con una coma entre medias:

   ```json
   [
     {
       "nombre": "Nombre del evento",
       "fecha": "2027-03-14T18:00",
       "horaFin": "23:00",
       "lugar": "Sitio, Valencia",
       "enlaceCompra": "https://veleta.lema.club/enlace-del-evento",
       "videoTele": "/video/2027-03-14-tele.mp4",
       "posterTele": null,
       "videoExclusivo": "qué vídeo se manda a quien compre (solo de referencia)",
       "tema": null,
       "tramos": [
         { "nombre": "Primer tramo", "precio": 12 },
         { "nombre": "Segundo tramo", "precio": 15.5 }
       ]
     }
   ]
   ```

   - **fecha**: año-mes-día, una `T` y la hora de Madrid (`2027-03-14T18:00`).
   - **horaFin** (opcional): si acaba de madrugada (`05:00`), el evento sigue en la web hasta el día siguiente.
   - **tramos**: una fila por tramo, con su nombre y su precio en euros **sin comillas ni «€»** (`15` o
     `15.5`; con punto, no con coma). Todos los tramos llevan al mismo enlace. Si aún no sabes los
     tramos, pon `"tramos": null`: sale una sola fila «Comprar entrada» y el aviso PENDIENTE.
   - **enlaceCompra**: el enlace del evento en Lema. Si aún no lo hay, pon `null` y los tramos llevan a
     https://veleta.lema.club.
   - Si no sabes un dato, pon `null` (sin comillas): en la web saldrá como «PENDIENTE».
   - Evento aún secreto: añade `"censurado": true` y el nombre y el lugar salen tapados.
3. Sube el vídeo de la tele a **`publico/video/`** (*Add file → Upload files*) con el mismo nombre que en
   `"videoTele"`. En mp4, en horizontal 4:3, y de menos de 3 MB. Se ve en blanco y negro y sin sonido.
4. Pulsa **Commit changes**.

No hace falta borrar los eventos pasados: la web los esconde sola. Si hay varios futuros, enseña el más
próximo. Si te equivocas en el formato, Cloudflare **no publica** el cambio y la web sigue como estaba;
el error sale explicado en español en *Deployments / Builds* del Worker.

## Cómo darle un tema a un evento (opcional)

Por defecto todo es blanco y negro puro (`"tema": null`). Si un evento lo pide, se le puede poner:

```json
"tema": { "acento": "#c8a24a", "textura": "papel.webp" }
```

- **acento**: un color en formato `#rrggbb`. Se usa en el punto de «En antena», en el foco y al tocar un tramo.
- **textura**: el nombre de una imagen que tienes que subir antes a `publico/img/texturas/`. Se ve muy suave,
  en gris, detrás de la venta.
- Puedes poner solo uno de los dos (el otro a `null`).

## Cómo cambiar la foto de la escena

1. Prepara la foto: horizontal 3:2 (por ejemplo 1500 × 1000), en blanco y negro, en **WebP**, de unos
   150-200 KB. Sin textos ni logos dentro.
2. Súbela a **`publico/img/`** (por ejemplo `publico/img/escena.webp`).
3. Abre **`datos/config.json`** y, en el apartado `escena`, cambia:
   - `"imagen": "/img/escena.webp"`
   - `"ancho"` y `"alto"`: los píxeles de la foto.
   - `"pantalla"`: dónde está la pantalla de la tele en la foto, en % (de 0 a 100):
     - `x`: desde el borde izquierdo de la foto hasta la esquina superior izquierda de la pantalla.
     - `y`: desde el borde de arriba hasta esa misma esquina.
     - `ancho` y `alto`: lo que mide la pantalla.

     Ejemplo: en una foto de 1500 × 1000, si la pantalla empieza en el píxel 570 por la izquierda y 300
     por arriba, y mide 360 × 270, sería `x: 38, y: 30, ancho: 24, alto: 27`.
4. Si algo de la foto queda **delante** de la pantalla (como la cabeza del señor en la foto actual),
   hay que recortarlo con fondo transparente y ponerlo en `"primerPlano"` (imagen y su posición en %,
   igual que la pantalla); así el vídeo no lo tapa. Si no hace falta, `"primerPlano": null`.
5. Pulsa **Commit changes**. Mientras `imagen` sea `null` se ve un fondo gris PROVISIONAL con el
   rectángulo de la tele dibujado.

Ojo con el móvil: en vertical solo se ve la franja central de la foto (más o menos de 35 % a 65 % del
ancho). Si la pantalla se sale de ahí, la build avisa.

## Cosas por decidir (en `datos/config.json`, apartado `opciones`)

| Opción | Valores | Puesto ahora |
|---|---|---|
| `emailAntesDeComprar` | `no` · `opcional` (nunca impide ir a la ticketera) · `obligatorio` | `opcional` |

La duración de la intro (0,7 s quieta + 2,3 s de zoom + 0,5 s de sacudida) está en `publico/js/main.js`,
arriba del todo.

## Para quien programe

- `npm run modelo` → `dist-modelo/`: versión para enseñar con un evento de muestra (no se publica).
- `npm run build` → `dist/` · `npm test` · `npm run test:navegador` (Chromium) · `npx wrangler deploy --dry-run`.
- Sin dependencias. Detalles y decisiones: `CLAUDE.md`.
- Variables del Worker en Cloudflare: `RESEND_API_KEY` (secreto) y `EMAIL_FROM` (en el panel);
  `EMAIL_TO` va en `wrangler.jsonc`. Sin las tres no se envía nada.
