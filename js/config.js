'use strict';

/* =========================================================
   CONFIG — lo único que necesitas editar en todo el sitio
   ========================================================= */
const CONFIG = {
  restaurantName: 'Restaurante Vivaldi',

  // URL de tu backend Flask publicado en PythonAnywhere (sin "/" al final).
  // Mientras esté vacío, el asistente de reservas funciona en modo demostración.
  apiBaseUrl: '',

  // Código de país + número, sin "+" ni espacios. Ejemplo: '50370001234'
  // Se usa solo para el enlace de "grupos grandes" (más de 10 personas),
  // ya NO para enviar la reserva (eso ahora va directo al sistema).
  whatsappNumber: '',

  // Días en que NO se aceptan reservas (0 = domingo, 1 = lunes, ... 6 = sábado).
  closedWeekdays: [1],

  // Hasta cuántos días en el futuro se puede reservar.
  maxDaysAhead: 90,

  // Con cuántos minutos de anticipación se puede reservar el mismo día.
  sameDayLeadMinutes: 60,
};
