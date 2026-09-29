import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { GameMode, GameResult } from '../game/game.types';
import { SCORES_URL, SUPABASE_KEY } from './supabase.config';

/** Cuántos puestos tiene la tabla de cada modo. */
export const TOP_SIZE = 10;

/** Una fila de la tabla de récords, tal como la devuelve Supabase. */
export interface LeaderboardEntry {
  name: string;
  score: number;
}

/**
 * Cómo va la carga de la tabla:
 * - 'offline': no hay conexión, pero se muestra la última copia guardada
 * - 'error':   no hay conexión ni copia guardada
 */
export type LeaderboardStatus = 'loading' | 'loaded' | 'offline' | 'error';

/**
 * Cómo va el envío de un récord ('idle' = no se ha enviado nada).
 * 'queued': no había conexión; quedó en la cola y se enviará después.
 */
export type SubmitStatus = 'idle' | 'sending' | 'sent' | 'queued' | 'error';

/** Un récord esperando conexión para enviarse. */
interface PendingScore extends GameResult {
  name: string;
}

/** Copia de la tabla de un modo, con la fecha en que se guardó. */
interface CachedTable {
  entries: LeaderboardEntry[];
  savedAt: string;
}

/** Claves con las que se guardan datos en el navegador. */
const PLAYER_NAME_KEY = 'snake-player-name';
const PENDING_KEY = 'snake-pending-scores';
const CACHE_KEY = 'snake-leaderboard'; // + "-<modo>", una copia por modo

/**
 * ¿Falló por la conexión (y tiene sentido reintentar más tarde)?
 * status 0 = ni siquiera se llegó al servidor (sin internet);
 * 500 o más = el servidor tuvo un problema (caído, en pausa...).
 * Un 400 en cambio significa "datos inválidos": reintentar no lo arregla.
 */
function isConnectionError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
}

/**
 * LeaderboardService: habla con Supabase para la tabla de récords compartida.
 *
 * Igual que GameService, guarda el estado en signals de solo lectura;
 * los componentes solo muestran esos datos.
 *
 * Sin conexión: muestra la última tabla guardada y deja los récords en una
 * cola que se envía sola cuando vuelve internet.
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

  /** Si se muestra una copia guardada, cuándo se guardó (si no, null). */
  private readonly _savedAt = signal<string | null>(null);
  readonly savedAt = this._savedAt.asReadonly();

  /** De qué modo son las filas de "entries" (null si aún no hay ninguna). */
  private readonly _loadedMode = signal<GameMode | null>(null);

  private readonly _submitStatus = signal<SubmitStatus>('idle');
  readonly submitStatus = this._submitStatus.asReadonly();

  /** Último nombre usado, para no tener que escribirlo en cada partida. */
  private readonly _playerName = signal(this.loadPlayerName());
  readonly playerName = this._playerName.asReadonly();

  /** Récords esperando conexión (sobreviven a cerrar el juego). */
  private readonly _pending = signal<PendingScore[]>(this.loadPending());
  readonly pendingCount = computed(() => this._pending().length);

  /** La petición de la tabla en curso, para poder cancelarla si llega otra. */
  private request: Subscription | null = null;
  /** Último modo pedido, para recargarlo al volver la conexión. */
  private lastMode: GameMode | null = null;
  /** ¿Se está enviando la cola? (para no enviarla dos veces a la vez) */
  private sendingPending = false;

  constructor() {
    // Al abrir el juego: si quedó algo pendiente de otra visita, se envía.
    this.sendPending();
  }

  /** Pide a Supabase el top del modo indicado. */
  load(mode: GameMode): void {
    // Si el jugador cambia de modo rápido, cancelamos la petición anterior:
    // si no, una respuesta vieja podría llegar tarde y pisar a la nueva.
    this.request?.unsubscribe();
    this.lastMode = mode;
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
          this.showTable(mode, entries, null);
          // Guardamos una copia por si la próxima vez no hay conexión.
          const cache: CachedTable = { entries, savedAt: new Date().toISOString() };
          this.saveToStorage(`${CACHE_KEY}-${mode}`, JSON.stringify(cache));
        },
        // error: sin internet, Supabase caído, proyecto en pausa...
        // Si tenemos una copia guardada de este modo, la mostramos.
        error: () => {
          const cache = this.loadCache(mode);
          if (cache) {
            this.showTable(mode, cache.entries, cache.savedAt);
          } else {
            this._status.set('error');
          }
        },
      });
  }

  /**
   * ¿Este puntaje entra en el top del modo? Solo lo sabemos si tenemos la
   * tabla de ESE modo (recién cargada o guardada). Como lee signals, si se
   * usa dentro de un computed, este se recalcula solo cuando llega la tabla.
   */
  qualifies(mode: GameMode, score: number): boolean {
    const status = this._status();
    if ((status !== 'loaded' && status !== 'offline') || this._loadedMode() !== mode) {
      return false;
    }
    const entries = this._entries();
    // Hay hueco libre, o supera al último. Si empata con el último no entra:
    // en un empate gana quien lo consiguió antes.
    return entries.length < TOP_SIZE || score > entries[entries.length - 1].score;
  }

  /** Envía un récord a Supabase; sin conexión, lo deja en la cola. */
  submit(name: string, mode: GameMode, score: number): void {
    // Evita enviarlo dos veces (por ejemplo, con doble clic).
    if (this._submitStatus() === 'sending') return;
    this._submitStatus.set('sending');

    this._playerName.set(name);
    this.saveToStorage(PLAYER_NAME_KEY, name);

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
        error: (error) => {
          if (isConnectionError(error)) {
            this.setPending([...this._pending(), { name, mode, score }]);
            this._submitStatus.set('queued');
          } else {
            this._submitStatus.set('error');
          }
        },
      });
  }

  /** Olvida el envío anterior (se llama al empezar otra partida). */
  resetSubmit(): void {
    this._submitStatus.set('idle');
  }

  /** Volvió la conexión: enviamos lo pendiente y actualizamos la tabla. */
  reconnect(): void {
    this.sendPending();
    if (this.lastMode) this.load(this.lastMode);
  }

  /** Envía TODOS los récords de la cola en una sola petición. */
  private sendPending(): void {
    const pending = this._pending();
    if (pending.length === 0 || this.sendingPending) return;
    this.sendingPending = true;

    // Supabase acepta un array en el cuerpo: crea una fila por elemento.
    this.http
      .post(SCORES_URL, pending, {
        headers: { apikey: SUPABASE_KEY, Prefer: 'return=minimal' },
      })
      .subscribe({
        next: () => {
          this.sendingPending = false;
          // Quitamos solo los que enviamos: mientras tanto pudo entrar otro.
          this.setPending(this._pending().filter((p) => !pending.includes(p)));
          if (this.lastMode) this.load(this.lastMode);
        },
        error: (error) => {
          this.sendingPending = false;
          // Sin conexión: se quedan en la cola para el próximo intento.
          // Si Supabase los rechazó por inválidos, reintentar no sirve: se descartan.
          if (!isConnectionError(error)) {
            this.setPending(this._pending().filter((p) => !pending.includes(p)));
          }
        },
      });
  }

  private showTable(mode: GameMode, entries: LeaderboardEntry[], savedAt: string | null): void {
    this._entries.set(entries);
    this._loadedMode.set(mode);
    this._savedAt.set(savedAt);
    this._status.set(savedAt ? 'offline' : 'loaded');
  }

  private setPending(pending: PendingScore[]): void {
    this._pending.set(pending);
    this.saveToStorage(PENDING_KEY, JSON.stringify(pending));
  }

  private loadPlayerName(): string {
    return this.loadFromStorage(PLAYER_NAME_KEY) ?? '';
  }

  private loadPending(): PendingScore[] {
    const pending = this.parseJson(this.loadFromStorage(PENDING_KEY));
    return Array.isArray(pending) ? pending : [];
  }

  private loadCache(mode: GameMode): CachedTable | null {
    const cache = this.parseJson(this.loadFromStorage(`${CACHE_KEY}-${mode}`));
    return Array.isArray(cache?.entries) ? cache : null;
  }

  /** JSON.parse lanza un error si el texto está dañado: en ese caso, null. */
  private parseJson(text: string | null): any {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  // Igual que en GameService: localStorage siempre dentro de try/catch.
  private loadFromStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private saveToStorage(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Sin almacenamiento: los datos solo duran hasta cerrar el juego.
    }
  }
}
