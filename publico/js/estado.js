// Se carga en <head>, antes de pintar. Decide qué se ve HOY (hora de Madrid), sin esperar a otra build:
//   <html data-actual="ev-…">  → el evento más próximo que aún no ha pasado
//   <html data-actual="ninguno"> → no hay evento: tele sin señal + lista de espera
// y si toca la intro de la tele o ya se vio en esta visita (data-fase="intro" | "pantalla").
// Si algo falla, no se toca nada y se ve lo que decidió la build (igual que sin JavaScript).
(function () {
  var html = document.documentElement;
  html.classList.add('js');
  try {
    var meta = document.querySelector('meta[name="veleta-eventos"]');
    if (meta) {
      var eventos = JSON.parse(meta.getAttribute('content') || '[]');
      var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      var v = function (t) { for (var i = 0; i < p.length; i++) if (p[i].type === t) return p[i].value; };
      var hoy = v('year') + '-' + v('month') + '-' + v('day');
      var actual = 'ninguno';
      // Vienen ordenados por fecha: el primero que siga visible hoy es el que toca.
      for (var i = 0; i < eventos.length; i++) {
        if (eventos[i].hasta >= hoy) { actual = eventos[i].id; break; }
      }
      html.setAttribute('data-actual', actual);
    }
  } catch (e) { /* se queda lo de la build */ }

  // Intro: solo la primera vez en esta visita (sessionStorage, que puede fallar en modo privado).
  var visto = false;
  try { visto = sessionStorage.getItem('veleta_intro') === '1'; } catch (e) { /* sin almacenamiento: se enseña */ }
  if (document.querySelector('meta[name="veleta-eventos"]')) html.setAttribute('data-fase', visto ? 'pantalla' : 'intro');
})();
