'use strict';

/* =========================================================
   reservar.js — asistente de reservas por pasos + resumen en vivo
   Solo se carga en reservar.html (lo decide js/include.js).
   Pasos: 1 fecha → 2 hora → 3 datos → 4 confirmar y enviar.
   El envío es un POST JSON a CONFIG.reservationEndpoint.
   Sin endpoint = modo demostración (no se guarda nada).
   ========================================================= */

(function () {
  const form = document.getElementById('reserveWizard');
  if (!form) return;

  const track = document.getElementById('wizardTrack');
  const viewport = track.closest('.wizard-viewport');
  const steps = Array.from(form.querySelectorAll('.wizard-step'));
  const dots = Array.from(document.querySelectorAll('[data-step-dot]'));
  const progress = document.querySelector('.wizard-progress');
  const backBtn = document.getElementById('wizardBack');
  const nextBtn = document.getElementById('wizardNext');
  const submitBtn = document.getElementById('wizardSubmit');
  const status = document.getElementById('formStatus');

  const dateInput = form.elements.fecha;
  const fechaHint = document.getElementById('fechaHint');
  const timeGrid = document.getElementById('timeGrid');
  const horaHint = document.getElementById('horaHint');
  const busyNote = document.getElementById('busyNote');
  const summary = document.getElementById('reserveSummary');
  const quickBtns = Array.from(form.querySelectorAll('[data-quick]'));
  const ticket = document.getElementById('ticket');
  const success = document.getElementById('reserveSuccess');

  let currentStep = 1;
  const totalSteps = steps.length;

  const pad = (n) => String(n).padStart(2, '0');
  const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISODate = (value) => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const longDate = (value) => parseISODate(value).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDate = (value) => parseISODate(value).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  const WEEKDAYS_PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
  const checkedTime = () => form.querySelector('input[name="hora"]:checked');
  const people = () => form.querySelector('input[name="personas"]:checked')?.value || '2';
  const escapeHtml = (str) => str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const setHeight = () => { viewport.style.height = `${steps[currentStep - 1].offsetHeight}px`; };


  /* ---------- moverse entre pasos (con animación) ---------- */
  function renderStep() {
    const isLast = currentStep === totalSteps;
    if (isLast) buildSummary();

    track.style.transform = `translateX(-${(currentStep - 1) * 100}%)`;
    setHeight();

    dots.forEach((dot) => {
      const n = Number(dot.dataset.stepDot);
      dot.classList.toggle('is-active', n === currentStep);
      dot.classList.toggle('is-done', n < currentStep);
    });

    backBtn.disabled = currentStep === 1;
    nextBtn.hidden = isLast;
    submitBtn.hidden = !isLast;
  }

  window.addEventListener('resize', setHeight);
  window.addEventListener('load', setHeight); // las tipografías pueden cambiar la altura

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
    const checked = checkedTime();
    timeGrid.classList.toggle('has-error', !checked);
    horaHint.textContent = checked ? '' : 'Elige una hora para continuar.';
    return Boolean(checked);
  }

  function validateDataStep() {
    return form.elements.nombre.reportValidity() && form.elements.telefono.reportValidity();
  }

  function validateCurrentStep() {
    if (currentStep === 1) return validateDateStep();
    if (currentStep === 2) return validateTimeStep();
    if (currentStep === 3) return validateDataStep();
    return true;
  }


  /* ---------- paso 1: fecha, atajos y horas disponibles ---------- */
  const today = new Date();
  const last = new Date(today);
  last.setDate(last.getDate() + CONFIG.maxDaysAhead);
  dateInput.min = toISODate(today);
  dateInput.max = toISODate(last);

  // Atajos: Hoy, Mañana, Este sábado. Se desactivan si ese día está cerrado.
  function quickDate(kind) {
    const d = new Date();
    if (kind === 'tomorrow') d.setDate(d.getDate() + 1);
    if (kind === 'saturday') d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
    return d;
  }
  quickBtns.forEach((btn) => {
    const d = quickDate(btn.dataset.quick);
    btn.dataset.date = toISODate(d);
    if (CONFIG.closedWeekdays.includes(d.getDay())) {
      btn.disabled = true;
      btn.title = 'Ese día estamos cerrados';
    }
    btn.addEventListener('click', () => {
      dateInput.value = btn.dataset.date;
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

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
    fechaHint.textContent = dateInput.value ? longDate(dateInput.value) : '';
    quickBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.date === dateInput.value)));
    const day = dateInput.value ? parseISODate(dateInput.value).getDay() : -1;
    busyNote.hidden = !(CONFIG.busyWeekdays || []).includes(day);
    setHeight();
  });


  /* ---------- resumen en vivo (la "comanda") ---------- */
  function setTicket(id, text, placeholder) {
    const el = document.getElementById(id);
    el.textContent = text || placeholder;
    el.classList.toggle('is-empty', !text);
  }
  function updateTicket() {
    setTicket('tkFecha', dateInput.value ? shortDate(dateInput.value) : '', 'Por elegir');
    setTicket('tkHora', checkedTime()?.value || '', 'Por elegir');
    setTicket('tkPersonas', people() === '1' ? '1 persona' : `${people()} personas`, '');
    setTicket('tkNombre', form.elements.nombre.value.trim(), 'Tu nombre');
    document.getElementById('tkStampN').textContent = people();
  }
  form.addEventListener('input', updateTicket);
  form.addEventListener('change', updateTicket);


  /* ---------- paso 4: resumen ---------- */
  function buildSummary() {
    const fecha = dateInput.value ? longDate(dateInput.value) : '—';
    const notas = form.elements.notas.value.trim();
    summary.innerHTML = `
      <dt>Nombre</dt><dd>${escapeHtml(form.elements.nombre.value.trim() || '—')}</dd>
      <dt>Teléfono</dt><dd>${escapeHtml(form.elements.telefono.value.trim() || '—')}</dd>
      <dt>Fecha</dt><dd>${escapeHtml(fecha)}</dd>
      <dt>Hora</dt><dd>${escapeHtml(checkedTime()?.value || '—')}</dd>
      <dt>Personas</dt><dd>${escapeHtml(people())}</dd>
      ${notas ? `<dt>Notas</dt><dd>${escapeHtml(notas)}</dd>` : ''}
    `;
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

  // Enter dentro de un campo: avanza; solo en el último paso envía.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.textContent = '';
    if (currentStep < totalSteps) { goNext(); return; }
    submitReservation();
  });


  /* ---------- envío a la base de datos ---------- */
  async function submitReservation() {
    const payload = {
      restaurante: CONFIG.restaurantName,
      nombre: form.elements.nombre.value.trim(),
      telefono: form.elements.telefono.value.trim(),
      fecha: dateInput.value,          // AAAA-MM-DD
      hora: checkedTime()?.value,      // HH:MM
      personas: Number(people()),
      notas: form.elements.notas.value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';

    // Modo demostración: aún no hay base de datos conectada.
    if (!CONFIG.reservationEndpoint) {
      console.info('Modo demostración. Datos que se enviarían:', payload);
      showSuccess(payload, true);
      return;
    }

    try {
      const response = await fetch(CONFIG.reservationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      showSuccess(payload, false);
    } catch (error) {
      console.error('No se pudo enviar la reserva.', error);
      const link = document.createElement('a');
      link.href = 'contacto.html';
      link.textContent = 'escríbenos';
      status.replaceChildren('No pudimos enviar tu reserva. Intenta de nuevo en un momento o ', link, '.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirmar reserva';
    }
  }

  function showSuccess(data, isDemo) {
    form.hidden = true;
    if (progress) progress.hidden = true;
    success.hidden = false;
    document.getElementById('successText').textContent =
      `Mesa para ${data.personas} el ${longDate(data.fecha)} a las ${data.hora}, a nombre de ${data.nombre}.`;
    document.getElementById('successDemo').hidden = !isDemo;
    if (ticket) ticket.classList.add('is-confirmed');
    success.focus();
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }


  /* ---------- arranque ---------- */
  updateTicket();
  renderStep();
})();