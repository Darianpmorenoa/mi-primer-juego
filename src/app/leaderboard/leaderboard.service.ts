import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { GameMode } from '../game/game.types';
import { SCORES_URL, SUPABASE_KEY } from './supabase.config';

/** Cuántos puestos tiene la tabla de cada modo. */
export const TOP_SIZE = 10;

/** Una fila de la tabla de récords, tal como la devuelve Supabase. */
export interface LeaderboardEntry {
  name: string;
  score: number;
}

/** Cómo va la carga de la tabla. */
export type LeaderboardStatus = 'loading' | 'loaded' | 'error';

/**
 * LeaderboardService: habla con Supabase para la tabla de récords compartida.
 *
 * Igual que GameService, guarda el estado en signals de solo lectura;
 * los componentes solo muestran esos datos.
 */
@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  // HttpClient es el servicio de Angular para hacer peticiones HTTP.
  // Funciona porque en app.config.ts pusimos provideHttpClient().
  private readonly http = inject(HttpClient);

  private readonly _entries = signal<LeaderboardEntry[]>([]);
  readonly entries = this._entries.asReadonly();

  private readonly _status = signal<LeaderboardStatus>('loading');
  readonly status = this._status.asReadonly();

  /** La petición en curso, para poder cancelarla si llega otra. */
  private request: Subscription | null = null;

  /** Pide a Supabase el top del modo indicado. */
  load(mode: GameMode): void {
    // Si el jugador cambia de modo rápido, cancelamos la petición anterior:
    // si no, una respuesta vieja podría llegar tarde y pisar a la nueva.
    this.request?.unsubscribe();
    this._status.set('loading');

    // http.get() NO hace la petición todavía: devuelve un Observable,
    // una "receta" que se ejecuta cuando alguien se suscribe (.subscribe).
    // <LeaderboardEntry[]> le dice a TypeScript qué forma tendrá la respuesta.
    this.request = this.http
      .get<LeaderboardEntry[]>(SCORES_URL, {
        headers: { apikey: SUPABASE_KEY },
        // Los params se añaden a la URL:
        // ?select=name,score&mode=eq.classic&order=...&limit=10
        params: {
          select: 'name,score',
          mode: `eq.${mode}`,
          // Mayor puntaje primero; si empatan, gana quien lo hizo antes.
          order: 'score.desc,created_at.asc',
          limit: TOP_SIZE,
        },
      })
      .subscribe({
        // next: llegó la respuesta (ya convertida de JSON a objetos).
        next: (entries) => {
          this._entries.set(entries);
          this._status.set('loaded');
        },
        // error: sin internet, Supabase caído, proyecto en pausa...
        error: () => this._status.set('error'),
      });
  }
}
