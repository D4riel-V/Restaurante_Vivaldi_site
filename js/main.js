'use strict';

/* =========================================================
   RESTAURANTE VIVALDI — comportamiento del sitio
   ---------------------------------------------------------
   1. CONFIG  →  lo único que necesitas editar
   2. Menú móvil
   3. Enlace activo al hacer scroll
   4. Años de historia y año del pie de página
   5. Fotos: si una foto no existe, se usa el respaldo
   6. Formulario de reservas → WhatsApp
   ========================================================= */


/* ---------- 1. CONFIG (EDITAR) ---------- */
const CONFIG = {
  // Código de país + número, sin "+" ni espacios. Ejemplo: '50370001234'
  // Mientras esté vacío, el formulario funciona en modo demostración.
  whatsappNumber: '',

  restaurantName: 'Restaurante Vivaldi',

  // Días en que NO se aceptan reservas (0 = domingo, 1 = lunes, ... 6 = sábado).
  closedWeekdays: [1],

  // Hasta cuántos días en el futuro se puede reservar.
  maxDaysAhead: 90,

  // Con cuántos minutos de anticipación se puede reservar el mismo día.
  sameDayLeadMinutes: 60,
};


/* ---------- utilidades ---------- */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const WEEKDAYS_PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "2026-09-19" → Date local (evita el desfase de zona horaria de new Date("2026-09-19"))
const parseISODate = (value) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const whatsappUrl = (text) =>
  `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;


/* ---------- 2. Menú móvil ---------- */
function initNav() {
  const toggle = $('#navToggle');
  const nav = $('#mainNav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };
  const isOpen = () => nav.classList.contains('is-open');

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  // Cerrar al elegir un enlace
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });

  // Cerrar con Escape (y devolver el foco al botón)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Cerrar al tocar fuera del header
  document.addEventListener('click', (e) => {
    if (isOpen() && !e.target.closest('.site-header')) setOpen(false);
  });

  // Si la ventana se ensancha, el menú vuelve a su estado normal
  window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}


/* ---------- 3. Enlace activo al hacer scroll ---------- */
function initActiveLink() {
  if (!('IntersectionObserver' in window)) return;

  const links = $$('.main-nav a[href^="#"]:not(.nav-cta)');
  const sectionToLink = new Map();
  links.forEach((link) => {
    const section = $(link.getAttribute('href'));
    if (section) sectionToLink.set(section, link);
  });
  if (!sectionToLink.size) return;

  const clear = () => links.forEach((l) => {
    l.classList.remove('is-active');
    l.removeAttribute('aria-current');
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      clear();
      const link = sectionToLink.get(entry.target);
      if (link) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'true');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sectionToLink.forEach((_, section) => observer.observe(section));

  // Al volver al inicio (que no tiene enlace), se limpia el resaltado
  const hero = $('#inicio');
  if (hero) observer.observe(hero);
}


/* ---------- 4. Años de historia y año del pie ---------- */
function initDynamicYears() {
  const currentYear = new Date().getFullYear();

  $$('[data-years-since]').forEach((el) => {
    const since = parseInt(el.dataset.yearsSince, 10);
    if (since) el.textContent = String(currentYear - since);
  });

  $$('[data-current-year]').forEach((el) => {
    el.textContent = String(currentYear);
  });
}


/* ---------- 5. Fotos con respaldo ----------
   - Platillos destacados: si la foto no existe, se muestra la ilustración.
   - Galería: si una foto no existe, su recuadro se quita; si no hay ninguna,
     toda la sección "El ambiente" permanece oculta. */
function refreshGallery() {
  const gallery = $('#ambiente');
  if (!gallery) return;
  const hasPhoto = $$('img[data-photo]', gallery).some((img) => img.complete && img.naturalWidth > 0);
  gallery.hidden = !hasPhoto;
}

function initPhotos() {
  const handleFailure = (img) => {
    const host = img.closest('[data-photo-host]');
    if (host) {
      if (host.hasAttribute('data-photo-optional')) host.remove();
      else host.classList.add('no-photo');
    }
    img.remove();
    refreshGallery();
  };

  $$('img[data-photo]').forEach((img) => {
    if (img.complete) {
      // ya terminó de cargar (bien o mal) antes de que corriera este script
      if (img.naturalWidth === 0) handleFailure(img);
    } else {
      img.addEventListener('error', () => handleFailure(img), { once: true });
      img.addEventListener('load', refreshGallery, { once: true });
    }
  });

  refreshGallery();
}


/* ---------- 6. WhatsApp y formulario de reservas ---------- */
function initWhatsappLinks() {
  if (!CONFIG.whatsappNumber) return;
  $$('[data-whatsapp]').forEach((link) => {
    link.href = whatsappUrl(`Hola, quisiera información sobre ${CONFIG.restaurantName}.`);
    link.hidden = false;
  });
}

function initReserveForm() {
  const form = $('#reserveForm');
  const status = $('#formStatus');
  if (!form || !status) return;

  const dateInput = form.elements.fecha;
  const timeSelect = form.elements.hora;

  // Rango de fechas permitido
  const today = new Date();
  const last = new Date(today);
  last.setDate(last.getDate() + CONFIG.maxDaysAhead);
  dateInput.min = toISODate(today);
  dateInput.max = toISODate(last);

  const closedText = CONFIG.closedWeekdays.map((d) => WEEKDAYS_PLURAL[d]).join(' y ');

  // Valida que el día elegido esté abierto
  const validateDate = () => {
    dateInput.setCustomValidity('');
    if (!dateInput.value) return;
    const day = parseISODate(dateInput.value).getDay();
    if (CONFIG.closedWeekdays.includes(day)) {
      dateInput.setCustomValidity(`Los ${closedText} estamos cerrados. Elige otra fecha.`);
    }
  };

  // Si la fecha es hoy, deshabilita las horas que ya pasaron (o quedan muy cerca)
  const updateAvailableTimes = () => {
    const isToday = dateInput.value === toISODate(new Date());
    const limit = new Date(Date.now() + CONFIG.sameDayLeadMinutes * 60000);
    const limitMinutes = limit.getHours() * 60 + limit.getMinutes();

    Array.from(timeSelect.options).forEach((option) => {
      if (!option.value) return;
      const [h, m] = option.value.split(':').map(Number);
      option.disabled = isToday && h * 60 + m < limitMinutes;
    });

    if (timeSelect.selectedOptions[0] && timeSelect.selectedOptions[0].disabled) {
      timeSelect.value = '';
    }
  };

  dateInput.addEventListener('change', () => {
    validateDate();
    updateAvailableTimes();
    status.textContent = '';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.textContent = '';

    validateDate();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const fecha = parseISODate(data.get('fecha')).toLocaleDateString('es', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    const personas = Number(data.get('personas'));
    const notas = String(data.get('notas') || '').trim();

    const lines = [
      `Hola, quisiera reservar una mesa en ${CONFIG.restaurantName}.`,
      '',
      `Nombre: ${String(data.get('nombre')).trim()}`,
      `Fecha: ${fecha}`,
      `Hora: ${data.get('hora')}`,
      `Personas: ${personas}`,
    ];
    if (notas) lines.push(`Notas: ${notas}`);
    const message = lines.join('\n');

    // Modo demostración: todavía no hay número configurado
    if (!CONFIG.whatsappNumber) {
      status.textContent = 'Modo demostración: falta configurar el número de WhatsApp en js/main.js.';
      return;
    }

    const url = whatsappUrl(message);
    // (no se usa 'noopener' en window.open porque entonces siempre devuelve null;
    //  se corta el vínculo manualmente)
    const opened = window.open(url, '_blank');
    if (opened) opened.opener = null;

    status.textContent = '';
    if (opened) {
      status.textContent = 'Abrimos WhatsApp con tu solicitud. Envía el mensaje para completarla y te confirmaremos por ahí.';
    } else {
      // El navegador bloqueó la ventana: ofrecemos el enlace directo
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'abre WhatsApp aquí';
      status.append('Tu navegador bloqueó la ventana; ', link, '.');
    }
  });
}


/* ---------- arranque ---------- */
initNav();
initActiveLink();
initDynamicYears();
initPhotos();
initWhatsappLinks();
initReserveForm();
