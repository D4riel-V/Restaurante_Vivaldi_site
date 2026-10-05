'use strict';

/* =========================================================
   CONFIG — lo único que necesitas editar en todo el sitio
   ========================================================= */
const CONFIG = {
  // Código de país + número, sin "+" ni espacios. Ejemplo: '50370001234'
  // Se usa en la página de contacto (botones de WhatsApp). Vacío = botones ocultos.
  whatsappNumber: '',

  restaurantName: 'Restaurante Vivaldi',

  // URL a la que el asistente envía la reserva (POST, JSON). Ejemplo Flask: '/api/reservas'
  // Mientras esté vacía, las reservas funcionan en MODO DEMOSTRACIÓN (no se guardan).
  reservationEndpoint: '',

  // Zona horaria del restaurante y horario de servicio (para el aviso "Abierto ahora").
  // Mantenlo igual al horario que escribes en el HTML. Formato 24 h.
  timezone: 'America/El_Salvador',
  serviceHours: [['12:00', '15:00'], ['18:30', '22:30']],

  // Días en que NO se aceptan reservas (0 = domingo, 1 = lunes, ... 6 = sábado).
  closedWeekdays: [1],

  // Días en que se muestra el aviso "suelen llenarse". Pon [] si no aplica.
  busyWeekdays: [5, 6],

  // Hasta cuántos días en el futuro se puede reservar.
  maxDaysAhead: 90,

  // Con cuántos minutos de anticipación se puede reservar el mismo día.
  sameDayLeadMinutes: 60,

  // Datos de la página de contacto. Lo que dejes vacío no se muestra o conserva el texto de ejemplo.
  contact: {
    phone: '+503 60863884',        // ej. '+503 0000 0000'
    email: 'restaurantevivaldi@gmail.com',        // ej. 'hola@vivaldi.com'
    address: 'Calle 5 de Noviembre, San Salvador',      // ej. 'Calle y número, Colonia, Ciudad'
    mapsUrl: 'https://maps.app.goo.gl/J6qVahaaRAk2u6Fs9',      // enlace "Compartir" de Google Maps
    wazeUrl: '',      // enlace de Waze (opcional)
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d992280.2866968226!2d-90.19912634417746!3d13.71270365269819!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f6331d8737bc5a3%3A0x7dca6f726cac5cca!2sINFRAMEN!5e0!3m2!1ses-419!2ssv!4v1791157352698!5m2!1ses-419!2ssv',
    reviewUrl: 'https://g.page/r/XXXXXXXX/review',
    instagram: '',    // URL completa
    facebook: '',     // URL completa
  },
};