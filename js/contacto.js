'use strict';

/* contacto.js — rellena la página de contacto con los datos de js/config.js.
   Se carga solo en contacto.html (lo decide js/include.js). Usa $ y $$ de main.js.
   Regla: si un dato no está configurado, su elemento se oculta (nunca se muestra texto de instrucciones). */
(function () {
  const c = CONFIG.contact || {};

  // Teléfono, correo y dirección.
  $$('[data-contact]').forEach((el) => {
    const key = el.dataset.contact;
    const value = c[key];
    const target = el.closest('.c-item') || el;
    if (!value) { target.hidden = true; return; }
    el.textContent = value;
    if (key === 'phone') el.href = 'tel:' + value.replace(/[^\d+]/g, '');
    if (key === 'email') el.href = 'mailto:' + value;
  });

  // Enlaces que solo existen si hay dato (mapas, redes).
  $$('[data-contact-href]').forEach((el) => {
    const value = c[el.dataset.contactHref];
    if (value) { el.href = value; el.hidden = false; }
  });

  // Ruta: enlace de Google Maps, o una búsqueda con la dirección.
  const routeUrl = c.mapsUrl || (c.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(c.address) : '');
  if (routeUrl) {
    $$('[data-route]').forEach((el) => {
      el.href = routeUrl; el.target = '_blank'; el.rel = 'noopener'; el.hidden = false;
    });
  }

  // Llamar / correo (botones que aparecen solo con dato).
  if (c.phone) $$('[data-call]').forEach((el) => { el.href = 'tel:' + c.phone.replace(/[^\d+]/g, ''); el.hidden = false; });
  if (c.email) $$('[data-contact-mailto]').forEach((el) => { el.href = 'mailto:' + c.email; el.hidden = false; });

  // WhatsApp (solo si hay número).
  if (CONFIG.whatsappNumber) {
    $$('[data-whatsapp]').forEach((el) => {
      const text = el.dataset.whatsappMsg || `Hola, quisiera información sobre ${CONFIG.restaurantName}.`;
      el.href = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
      el.hidden = false;
    });
  }

  // Mapa incrustado.
  const frame = $('#mapFrame');
  // Acepta la URL sola o el <iframe> completo que entrega Google Maps (se extrae el src).
  const embedMatch = (c.mapEmbedUrl || '').match(/src="([^"]+)"/);
  const embedUrl = embedMatch ? embedMatch[1] : (c.mapEmbedUrl || '').trim();
  if (frame && embedUrl.startsWith('https://')) {
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.title = 'Mapa de ' + CONFIG.restaurantName;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    frame.replaceChildren(iframe);
    frame.classList.add('has-map');
  }

  // Redes: si no hay ninguna, se oculta el bloque.
  const social = $('#socialBlock');
  if (social && !$$('a:not([hidden])', social).length) social.hidden = true;


  /* ---------- "Abierto ahora" según el horario real ---------- */
  const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

  function computeStatus() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: CONFIG.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const now = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
    const hours = CONFIG.serviceHours;
    const closed = CONFIG.closedWeekdays.includes(wd);

    if (!closed) {
      const current = hours.findIndex(([a, b]) => now >= toMin(a) && now < toMin(b));
      if (current > -1) return { open: true, text: `Abierto ahora · hasta las ${hours[current][1]}` };
      const upcoming = hours.findIndex(([a]) => now < toMin(a));
      if (upcoming > -1) return { open: false, text: `Hoy abrimos a las ${hours[upcoming][0]}` };
    }
    for (let i = 1; i <= 7; i++) {
      const d = (wd + i) % 7;
      if (!CONFIG.closedWeekdays.includes(d)) {
        const when = i === 1 ? 'mañana' : `el ${DAYS[d]}`;
        return { open: false, text: `${closed ? 'Hoy descansamos' : 'Cerrado por hoy'} · abrimos ${when} a las ${hours[0][0]}` };
      }
    }
    return null;
  }

  const statusEl = $('#openStatus');
  function renderStatus() {
    if (!statusEl) return;
    const s = computeStatus();
    if (!s) { statusEl.hidden = true; return; }
    statusEl.hidden = false;
    statusEl.classList.toggle('is-open', s.open);
    $('.c-status-text', statusEl).textContent = s.text;
  }
  renderStatus();
  setInterval(renderStatus, 60000);
})();