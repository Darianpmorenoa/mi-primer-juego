// Datos para hablar con Supabase (proyecto "snake").
//
// La "publishable key" está hecha para ir en el navegador: es PÚBLICA.
// Lo que protege la tabla son las reglas RLS de supabase/schema.sql,
// no esconder esta clave. (La "secret key" NUNCA debe ir aquí.)

/** Dirección de la API REST de la tabla de récords. */
export const SCORES_URL = 'https://anrztpotsopggmvrmbpj.supabase.co/rest/v1/scores';

/** Clave pública del proyecto; Supabase la pide en la cabecera "apikey". */
export const SUPABASE_KEY = 'sb_publishable_n9YXIJX0Iyfyl11WJf1jrw_wXqT477w';
