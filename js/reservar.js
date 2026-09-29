'use strict';

/* =========================================================
   reservar.js — asistente de reservas por pasos
   Solo se carga en reservar.html (lo decide js/include.js).
   Pasos: 1 fecha → 2 hora → 3 datos → 4 confirmar y enviar.
   ========================================================= */

(function () {
  const form = document.getElementById('reserveWizard');
  if (!form) return; // por si este script se cargara en otra página

  const track = document.getElementById('wizardTrack');
  const viewport = track.closest('.wizard-viewport');
  const steps = Array.from(form.querySelectorAll('.wizard-step'));
  const dots = Array.from(document.querySelectorAll('[data-step-dot]'));
  const backBtn = document.getElementById('wizardBack');
  const nextBtn = document.getElementById('wizardNext');
  const submitBtn = document.getElementById('wizardSubmit');
  const status = document.getElementById('formStatus');

  const dateInput = form.elements.fecha;
  const fechaHint = document.getElementById('fechaHint');
  const timeGrid = document.getElementById('timeGrid');
  const horaHint = document.getElementById('horaHint');
  const summary = document.getElementById('reserveSummary');

  let currentStep = 1;
  const totalSteps = steps.length;

  const pad = (n) => String(n).padStart(2, '0');
  const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISODate = (value) => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const whatsappUrl = (text) => `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
  const WEEKDAYS_PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];


  /* ---------- moverse entre pasos (con animación) ---------- */
  function renderStep() {
    const isLast = currentStep === totalSteps;
    if (isLast) buildSummary(); // primero se llena el contenido...

    track.style.transform = `translateX(-${(currentStep - 1) * 100}%)`;
    viewport.style.height = `${steps[currentStep - 1].offsetHeight}px`; // ...luego se mide

    dots.forEach((dot) => {
      const n = Number(dot.dataset.stepDot);
      dot.classList.toggle('is-active', n === currentStep);
      dot.classList.toggle('is-done', n < currentStep);
    });

    backBtn.disabled = currentStep === 1;
    nextBtn.hidden = isLast;
    submitBtn.hidden = !isLast;
  }

  // Si la ventana cambia de tamaño, el texto puede ocupar más o menos alto.
  window.addEventListener('resize', () => {
    viewport.style.height = `${steps[currentStep - 1].offsetHeight}px`;
  });

  // Los pasos ya visitados se pueden volver a tocar para corregir algo.
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const n = Number(dot.dataset.stepDot);
      if (n < currentStep) { currentStep = n; renderStep(); }
    });
  });


  /* ---------- validación de cada paso ---------- */
  function validateDateStep() {
    dateInput.setCustomValidity('');
    if (!dateInput.reportValidity()) return false;

    const day = parseISODate(dateInput.value).getDay();
    if (CONFIG.closedWeekdays.includes(day)) {
      const closedText = CONFIG.closedWeekdays.map((d) => WEEKDAYS_PLURAL[d]).join(' y ');
      dateInput.setCustomValidity(`Los ${closedText} estamos cerrados. Elige otra fecha.`);
      dateInput.reportValidity();
      return false;
    }
    return true;
  }

  function validateTimeStep() {
    const checked = form.querySelector('input[name="hora"]:checked');
    timeGrid.classList.toggle('has-error', !checked);
    horaHint.textContent = checked ? '' : 'Elige una hora para continuar.';
    return Boolean(checked);
  }

  function validateDataStep() {
    return (
      form.elements.nombre.reportValidity() &&
      form.elements.apellido.reportValidity() &&
      form.elements.telefono.reportValidity() &&
      form.elements.personas.reportValidity()
    );
  }

  function validateCurrentStep() {
    if (currentStep === 1) return validateDateStep();
    if (currentStep === 2) return validateTimeStep();
    if (currentStep === 3) return validateDataStep();
    return true;
  }


  /* ---------- paso 1 → disponibilidad de horas y fecha ---------- */
  const today = new Date();
  const last = new Date(today);
  last.setDate(last.getDate() + CONFIG.maxDaysAhead);
  dateInput.min = toISODate(today);
  dateInput.max = toISODate(last);

  function updateAvailableTimes() {
    const isToday = dateInput.value === toISODate(new Date());
    const limit = new Date(Date.now() + CONFIG.sameDayLeadMinutes * 60000);
    const limitMinutes = limit.getHours() * 60 + limit.getMinutes();

    form.querySelectorAll('input[name="hora"]').forEach((input) => {
      const [h, m] = input.value.split(':').map(Number);
      const disabled = isToday && (h * 60 + m) < limitMinutes;
      input.disabled = disabled;
      if (disabled && input.checked) input.checked = false;
    });
  }

  dateInput.addEventListener('change', () => {
    dateInput.setCustomValidity('');
    updateAvailableTimes();
    fechaHint.textContent = dateInput.value
      ? parseISODate(dateInput.value).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';
  });


  /* ---------- paso 4 → resumen ---------- */
  function buildSummary() {
    const fecha = dateInput.value
      ? parseISODate(dateInput.value).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
      : '—';
    const hora = form.querySelector('input[name="hora"]:checked')?.value || '—';
    const personas = form.elements.personas.value;
    const nombre = form.elements.nombre.value.trim() || '—';
    const apellido = form.elements.apellido.value.trim() || '—';
    const telefono = form.elements.telefono.value.trim() || '—';
    const notas = form.elements.notas.value.trim();

    summary.innerHTML = `
      <dt>Nombre</dt><dd>${escapeHtml(nombre)} ${escapeHtml(apellido)}</dd>
      <dt>Teléfono</dt><dd>${escapeHtml(telefono)}</dd>
      <dt>Fecha</dt><dd>${escapeHtml(fecha)}</dd>
      <dt>Hora</dt><dd>${escapeHtml(hora)}</dd>
      <dt>Personas</dt><dd>${escapeHtml(personas)}</dd>
      ${notas ? `<dt>Notas</dt><dd>${escapeHtml(notas)}</dd>` : ''}
    `;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }


  /* ---------- navegación ---------- */
  function goNext() {
    if (!validateCurrentStep()) return;
    if (currentStep < totalSteps) currentStep += 1;
    renderStep();
  }
  function goBack() {
    if (currentStep > 1) currentStep -= 1;
    renderStep();
  }

  nextBtn.addEventListener('click', goNext);
  backBtn.addEventListener('click', goBack);

  // Enter dentro de un campo dispara "submit": si no estamos en el último
  // paso, lo tratamos como "Siguiente" en vez de enviar el formulario.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.textContent = '';
    if (currentStep < totalSteps) { goNext(); return; }
    sendReservation();
  });


  /* ---------- envío final: al backend real (ya NO por WhatsApp) ---------- */
  async function sendReservation() {
    const payload = {
      nombre: form.elements.nombre.value.trim(),
      apellido: form.elements.apellido.value.trim(),
      telefono: form.elements.telefono.value.trim(),
      fecha: dateInput.value,
      hora: form.querySelector('input[name="hora"]:checked')?.value,
      cantidad_personas: form.elements.personas.value,
      notas: form.elements.notas.value.trim(),
      sitio_web: form.elements.sitio_web.value, // campo trampa anti-spam, debe ir vacío
    };

    if (!CONFIG.apiBaseUrl) {
      status.textContent = 'Modo demostración: falta configurar CONFIG.apiBaseUrl en js/config.js con la URL de tu backend en PythonAnywhere.';
      return;
    }

    submitBtn.disabled = true;
    status.textContent = 'Enviando tu reserva...';

    try {
      const response = await fetch(`${CONFIG.apiBaseUrl}/api/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        status.textContent = data.error || 'No se pudo enviar la reserva. Intenta de nuevo en unos minutos.';
        submitBtn.disabled = false;
        return;
      }

      status.textContent = data.mensaje || 'Reserva recibida. Te confirmaremos pronto.';
      submitBtn.hidden = true;
    } catch (error) {
      console.error('Error al enviar la reserva.', error);
      status.textContent = 'No se pudo conectar con el sistema de reservas. Revisa tu conexión e intenta de nuevo.';
      submitBtn.disabled = false;
    }
  }


  /* ---------- enlace de contacto para grupos grandes ---------- */
  function initWhatsappLinks() {
    if (!CONFIG.whatsappNumber) return;
    document.querySelectorAll('[data-whatsapp]').forEach((link) => {
      link.href = whatsappUrl(`Hola, quisiera información sobre ${CONFIG.restaurantName}.`);
      link.hidden = false;
    });
  }


  /* ---------- arranque ---------- */
  initWhatsappLinks();
  renderStep();
})();
