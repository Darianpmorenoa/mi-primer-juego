import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Activa HttpClient en toda la app. withFetch() usa la API "fetch"
    // moderna del navegador para hacer las peticiones.
    provideHttpClient(withFetch()),
  ],
};
