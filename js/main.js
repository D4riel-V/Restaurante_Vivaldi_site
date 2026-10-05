'use strict';

/* =========================================================
   RESTAURANTE VIVALDI — comportamiento común a todas las páginas
   ---------------------------------------------------------
   1. Menú móvil
   2. Resaltar en el menú la página en la que estás
   3. Años de historia y año del pie de página
   4. Fotos: si una foto no existe, se usa el respaldo
   ========================================================= */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));


/* ---------- 1. Menú móvil ---------- */
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

  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (isOpen() && !e.target.closest('.site-header')) setOpen(false);
  });

  window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}


/* ---------- 2. Resaltar la página actual en el menú ----------
   Ahora que cada apartado es una página real (menu.html,
   destacados.html...), ya no hace falta observar el scroll:
   basta comparar el nombre del archivo actual con cada enlace. */
function initCurrentPageLink() {
  const links = $$('.main-nav a[href]');
  if (!links.length) return;

  const currentFile = location.pathname.split('/').pop() || 'index.html';

  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href.startsWith('#')) return; // "Contacto" apunta al pie de la propia página

    const linkFile = href.split('#')[0] || 'index.html';
    const isCurrent = linkFile === currentFile;

    link.classList.toggle('is-active', isCurrent);
    if (isCurrent) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}


/* ---------- 3. Años de historia y año del pie ---------- */
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


/* ---------- 4. Fotos con respaldo ----------
   - Platillos destacados: si la foto no existe, se muestra la ilustración.
   - Galería de ambiente: si una foto no existe, su recuadro se quita; si
     no hay ninguna, la sección completa permanece oculta. */
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
      if (img.naturalWidth === 0) handleFailure(img);
    } else {
      img.addEventListener('error', () => handleFailure(img), { once: true });
      img.addEventListener('load', refreshGallery, { once: true });
    }
  });

  refreshGallery();
}


/* ---------- arranque ---------- */
initNav();
initCurrentPageLink();
initDynamicYears();
initPhotos();
