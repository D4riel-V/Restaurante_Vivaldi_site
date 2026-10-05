'use strict';

/* =========================================================
   include.js — ensambla cada página a partir de partials/
   ---------------------------------------------------------
   Cada página HTML (index.html, menu.html, reservar.html...)
   trae su propio contenido escrito directamente, y solo el
   encabezado y el pie se comparten desde partials/ para no
   repetirlos en cada archivo.

   Cuando ya están header y footer en la página, este script
   carga en orden: config.js → main.js → reservar.js (solo si la
   página tiene el asistente de reservas) o contacto.js (solo en
   contacto e inicio).

   IMPORTANTE: fetch() no funciona abriendo el archivo con
   doble clic (protocolo file://). Hay que verlo a través de
   un servidor local:
     - la extensión "Live Server" de VS Code, o
     - en una terminal, dentro de la carpeta: python -m http.server
       y luego abrir http://localhost:8000
   Esto deja de ser un problema en cuanto lo subas a GitHub
   Pages, o cuando lo integres a Flask.
   ========================================================= */

async function loadPartials() {
  // Estilos del menú móvil: se agregan al final del <head> para que ganen sobre style.css.
  const navCss = document.createElement('link');
  navCss.rel = 'stylesheet';
  navCss.href = 'css/nav.css';
  document.head.appendChild(navCss);

  const hosts = Array.from(document.querySelectorAll('[data-include]'));

  await Promise.all(hosts.map(async (host) => {
    const path = host.getAttribute('data-include');
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      host.outerHTML = await response.text();
    } catch (error) {
      console.error(`No se pudo cargar ${path}.`, error);
      host.outerHTML = `<p style="padding:2rem;color:#b00">
        No se pudo cargar <code>${path}</code>. Si abriste este archivo con
        doble clic, ábrelo con un servidor local (ver comentario en js/include.js).
      </p>`;
    }
  }));

  // Con el header/footer ya en el DOM, cargamos los scripts en orden.
  const scripts = ['js/config.js', 'js/main.js'];
  if (document.getElementById('reserveWizard')) scripts.push('js/reservar.js');
  if (document.getElementById('contactPage') || document.getElementById('homePage') || document.getElementById('reviewsPage')) scripts.push('js/contacto.js');

  scripts.forEach((src) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = false; // conserva el orden aunque la descarga sea en paralelo
    document.body.appendChild(el);
  });
}

loadPartials();