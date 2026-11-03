/* ==========================================================================
   CONFIGURACIÓN DEL NEGOCIO — F7 Markett
   --------------------------------------------------------------------------
   mode: 'local'    → modo DEMO. Los cambios se guardan solo en este navegador.
         'firebase' → modo REAL. Los cambios los ve todo el mundo.
   ========================================================================== */
window.LOUCS_BACKEND = {
  mode: 'firebase',

  // Identificador de esta tienda dentro de Firebase (uno distinto por cliente).
  storeId: 'f7markett',

  // Solo modo demo
  demoPassword: 'f7',

  // Mismo proyecto Firebase de loucs.store (se comparte entre clientes)
  firebase: {
    apiKey: 'AIzaSyBPfWlncJN3J8lzlvaX7UYHoPXqZp9eCW8',
    authDomain: 'loucs-store.firebaseapp.com',
    projectId: 'loucs-store',
    appId: '1:548297637046:web:3552aa26390c0ca037ba17',
  },

  // Subida de fotos (Cloudinary) — carpeta propia de este cliente
  cloudinary: {
    cloudName: 'l850huri',
    uploadPreset: 'loucs_unsigned',
    folder: 'f7markett',
  },
};
