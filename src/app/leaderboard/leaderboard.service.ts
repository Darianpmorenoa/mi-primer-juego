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

/** Cómo va el envío de un récord ('idle' = no se ha enviado nada). */
export type SubmitStatus = 'idle' | 'sending' | 'sent' | 'error';

/** Clave con la que se recuerda el nombre del jugador en el navegador. */
const PLAYER_NAME_KEY = 'snake-player-name';

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

  /** De qué modo son las filas de "entries" (null si aún no hay ninguna). */
  private readonly _loadedMode = signal<GameMode | null>(null);

  private readonly _submitStatus = signal<SubmitStatus>('idle');
  readonly submitStatus = this._submitStatus.asReadonly();

  /** Último nombre usado, para no tener que escribirlo en cada partida. */
  private readonly _playerName = signal(this.loadPlayerName());
  readonly playerName = this._playerName.asReadonly();

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
          this._loadedMode.set(mode);
          this._status.set('loaded');
        },
        // error: sin internet, Supabase caído, proyecto en pausa...
        error: () => this._status.set('error'),
      });
  }

  /**
   * ¿Este puntaje entra en el top del modo? Solo lo sabemos si ya tenemos
   * cargada la tabla de ESE modo. Como lee signals, si se usa dentro de un
   * computed, este se recalcula solo cuando llega la tabla.
   */
  qualifies(mode: GameMode, score: number): boolean {
    if (this._status() !== 'loaded' || this._loadedMode() !== mode) return false;
    const entries = this._entries();
    // Hay hueco libre, o supera al último. Si empata con el último no entra:
    // en un empate gana quien lo consiguió antes.
    return entries.length < TOP_SIZE || score > entries[entries.length - 1].score;
  }

  /** Envía un récord a Supabase y, si sale bien, recarga la tabla. */
  submit(name: string, mode: GameMode, score: number): void {
    // Evita enviarlo dos veces (por ejemplo, con doble clic).
    if (this._submitStatus() === 'sending') return;
    this._submitStatus.set('sending');

    this._playerName.set(name);
    this.savePlayerName(name);

    // http.post(url, cuerpo, opciones): el cuerpo es el objeto que se envía;
    // HttpClient lo convierte a JSON automáticamente.
    this.http
      .post(
        SCORES_URL,
        { name, mode, score },
        // "return=minimal": que Supabase no nos devuelva la fila creada.
        { headers: { apikey: SUPABASE_KEY, Prefer: 'return=minimal' } },
      )
      .subscribe({
        next: () => {
          this._submitStatus.set('sent');
          this.load(mode);
        },
        error: () => this._submitStatus.set('error'),
      });
  }

  /** Olvida el envío anterior (se llama al empezar otra partida). */
  resetSubmit(): void {
    this._submitStatus.set('idle');
  }

  // Igual que en GameService: localStorage siempre dentro de try/catch.
  private loadPlayerName(): string {
    try {
      return localStorage.getItem(PLAYER_NAME_KEY) ?? '';
    } catch {
      return '';
    }
  }

  private savePlayerName(name: string): void {
    try {
      localStorage.setItem(PLAYER_NAME_KEY, name);
    } catch {
      // Sin almacenamiento: habrá que escribir el nombre la próxima vez.
    }
  }
}
