import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Activa HttpClient en toda la app. withFetch() usa la API "fetch"
    // moderna del navegador para hacer las peticiones.
    provideHttpClient(withFetch()),
    // Service worker: guarda una copia del juego en el navegador para que
    // abra sin internet (qué se guarda se decide en ngsw-config.json).
    // Solo en la versión publicada: con "ng serve" molestaría al programar.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Se instala cuando el juego ya cargó (o a los 30 s como mucho),
      // para no quitarle velocidad a la primera visita.
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
