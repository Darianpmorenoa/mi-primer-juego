import { Injectable, computed, signal } from '@angular/core';
import { GAME_MODES } from './game-modes';
import { Direction, GameMode, GameStatus, Position } from './game.types';
import { OBSTACLES } from './obstacles';

/** Cuánto se mueve la cabeza en cada dirección (en celdas). */
const MOVES: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** La serpiente no puede darse la vuelta sobre sí misma. */
const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

/** Segmentos con los que empieza la serpiente. */
const INITIAL_LENGTH = 3;
/** Puntos por cada comida. */
const POINTS_PER_FOOD = 10;
/** Cada cuántos puntos se sube de nivel (y la serpiente va más rápido). */
const POINTS_PER_LEVEL = 50;

/** Velocidad: milisegundos entre pasos en el nivel 1, cuánto baja por nivel y el mínimo. */
const START_TICK_MS = 150;
const TICK_STEP_MS = 12;
const MIN_TICK_MS = 60;

/** Claves con las que se guardan datos en el navegador. */
const HIGH_SCORE_KEY = 'snake-high-score'; // + "-<modo>", uno por modo
const MODE_KEY = 'snake-mode';

/** ¿Dos posiciones son la misma celda? */
function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * GameService: aquí vive TODA la lógica del juego
 * (movimiento, colisiones, comida, puntaje).
 *
 * Los componentes no deciden reglas: solo le preguntan cosas al servicio
 * (¿dónde está la serpiente?) o le avisan de eventos (el usuario pulsó ↑).
 *
 * providedIn: 'root' => Angular crea UNA sola instancia para toda la app
 * (un "singleton"), así todos los componentes comparten el mismo juego.
 */
@Injectable({ providedIn: 'root' })
export class GameService {
  /** Tamaño del tablero en celdas. */
  readonly cols = 20;
  readonly rows = 20;

  // OJO con el orden: las propiedades se crean de arriba abajo, y la comida
  // (más abajo) necesita saber ya el modo y los obstáculos.

  /** Modo elegido (se recuerda para la próxima visita). */
  private readonly _mode = signal<GameMode>(this.loadMode());
  readonly mode = this._mode.asReadonly();

  /** Obstáculos del modo actual: se deducen del modo, no se guardan aparte. */
  readonly obstacles = computed<readonly Position[]>(() =>
    this._mode() === 'obstacles' ? OBSTACLES : [],
  );

  // Un signal es un valor que AVISA cuando cambia: quien lo lea
  // (por ejemplo el tablero) se actualiza solo.
  // La versión con "_" es privada y se puede modificar; hacia afuera
  // exponemos una de solo lectura para que nadie más cambie la serpiente.
  private readonly _snake = signal<Position[]>(this.initialSnake());
  readonly snake = this._snake.asReadonly();

  /** Dónde está la comida (null si no queda ninguna celda libre). */
  private readonly _food = signal<Position | null>(this.randomFreeCell(this._snake()));
  readonly food = this._food.asReadonly();

  /** En qué momento está la partida (inicio, jugando, Game Over...). */
  private readonly _status = signal<GameStatus>('ready');
  readonly status = this._status.asReadonly();

  // computed(): un signal que se CALCULA a partir de otros.
  // No guardamos el puntaje aparte: se deduce del largo de la serpiente,
  // así nunca pueden quedar desincronizados.
  readonly score = computed(() => (this._snake().length - INITIAL_LENGTH) * POINTS_PER_FOOD);

  /** Nivel actual: sube cada POINTS_PER_LEVEL puntos. */
  readonly level = computed(() => Math.floor(this.score() / POINTS_PER_LEVEL) + 1);

  /** Milisegundos entre pasos: cuanto más nivel, menos espera (más rápido). */
  private readonly tickMs = computed(() =>
    Math.max(MIN_TICK_MS, START_TICK_MS - (this.level() - 1) * TICK_STEP_MS),
  );

  /**
   * Récords de TODOS los modos, por ejemplo { classic: 120, portal: 80 }.
   * Record<GameMode, number> obliga a que haya un número para cada modo.
   */
  private readonly _highScores = signal<Record<GameMode, number>>(this.loadHighScores());

  /** Récord del modo elegido: cambia solo cuando cambia el modo o el récord. */
  readonly highScore = computed(() => this._highScores()[this._mode()]);

  /** ¿La última partida batió el récord? */
  private readonly _isNewRecord = signal(false);
  readonly isNewRecord = this._isNewRecord.asReadonly();

  /** Dirección con la que se dio el último paso. */
  private direction: Direction = 'right';
  /** Dirección que se usará en el próximo paso. */
  private nextDirection: Direction = 'right';

  private timerId: ReturnType<typeof setTimeout> | null = null;

  /** Empieza una partida nueva (sirve también para "jugar otra vez"). */
  start(): void {
    this.stopTimer();

    const snake = this.initialSnake();
    this._snake.set(snake);
    this._food.set(this.randomFreeCell(snake));
    this.direction = 'right';
    this.nextDirection = 'right';
    this._isNewRecord.set(false);
    this._status.set('playing');

    this.scheduleTick();
  }

  pause(): void {
    if (this._status() !== 'playing') return;
    this.stopTimer();
    this._status.set('paused');
  }

  resume(): void {
    if (this._status() !== 'paused') return;
    this._status.set('playing');
    this.scheduleTick();
  }

  /** Cambia de modo. Solo se permite fuera de una partida. */
  setMode(mode: GameMode): void {
    const status = this._status();
    if (status === 'playing' || status === 'paused') return;

    this._mode.set(mode);
    // El aviso de "nuevo récord" era del modo anterior.
    this._isNewRecord.set(false);
    // En la pantalla de inicio, recolocamos la comida por si quedó
    // encima de un obstáculo del modo nuevo.
    if (status === 'ready') this._food.set(this.randomFreeCell(this._snake()));
    this.saveToStorage(MODE_KEY, mode);
  }

  togglePause(): void {
    if (this._status() === 'playing') this.pause();
    else this.resume();
  }

  /** Lo llaman los componentes cuando el jugador pulsa una dirección. */
  changeDirection(newDirection: Direction): void {
    if (this._status() !== 'playing') return;

    // Comparamos con la dirección del último paso real (no con nextDirection).
    // Si no, pulsando ↑ y ← muy rápido yendo a la derecha, la serpiente
    // podría girar 180° dentro del mismo paso.
    if (newDirection === OPPOSITE[this.direction]) return;
    this.nextDirection = newDirection;
  }

  /**
   * Programa el siguiente paso. Usamos setTimeout (un solo aviso) en vez de
   * setInterval (aviso fijo repetido) porque la espera cambia con el nivel:
   * cada paso vuelve a mirar tickMs() y programa el siguiente.
   */
  private scheduleTick(): void {
    this.timerId = setTimeout(() => {
      this.timerId = null;
      this.tick();
      if (this._status() === 'playing') this.scheduleTick();
    }, this.tickMs());
  }

  /** Un paso del juego: la serpiente avanza una celda. */
  private tick(): void {
    this.direction = this.nextDirection;
    const snake = this._snake();
    const head = snake[0];
    const move = MOVES[this.direction];
    let newHead: Position = { x: head.x + move.x, y: head.y + move.y };

    // Modo "Sin paredes": al salir por un borde aparece por el contrario
    // (el operador % "da la vuelta", como en la Fase 2).
    if (this._mode() === 'portal') {
      newHead = {
        x: (newHead.x + this.cols) % this.cols,
        y: (newHead.y + this.rows) % this.rows,
      };
    }

    const food = this._food();
    const ate = food !== null && samePosition(newHead, food);

    // Si no comió, la cola se mueve y deja libre su celda; si comió,
    // la cola se queda (así la serpiente crece un segmento).
    const body = ate ? snake : snake.slice(0, -1);

    // Colisiones: contra un borde, un obstáculo o su propio cuerpo.
    // (En modo "Sin paredes" la cabeza nunca queda fuera, y fuera del modo
    // "Obstáculos" la lista de obstáculos está vacía.)
    // Comprobamos contra "body" y no contra "snake": perseguir tu propia
    // cola justo detrás de ella es un movimiento válido.
    const hitsObstacle = this.obstacles().some((block) => samePosition(block, newHead));
    const hitsItself = body.some((part) => samePosition(part, newHead));
    if (this.isOutside(newHead) || hitsObstacle || hitsItself) {
      this.endGame('over');
      return;
    }

    // Creamos un array NUEVO en vez de modificar el viejo: así el signal
    // detecta el cambio.
    const newSnake = [newHead, ...body];
    this._snake.set(newSnake);

    if (ate) {
      const nextFood = this.randomFreeCell(newSnake);
      this._food.set(nextFood);
      // Sin celdas libres para la comida: la serpiente llenó el tablero.
      if (nextFood === null) this.endGame('won');
    }
  }

  private isOutside(pos: Position): boolean {
    return pos.x < 0 || pos.y < 0 || pos.x >= this.cols || pos.y >= this.rows;
  }

  private endGame(result: 'over' | 'won'): void {
    this.stopTimer();

    const score = this.score();
    const mode = this._mode();
    if (score > this._highScores()[mode]) {
      // Copiamos el objeto cambiando solo el modo actual: un objeto
      // NUEVO, igual que con los arrays, para que el signal lo detecte.
      this._highScores.update((scores) => ({ ...scores, [mode]: score }));
      this._isNewRecord.set(true);
      this.saveToStorage(`${HIGH_SCORE_KEY}-${mode}`, String(score));
    }

    this._status.set(result);
  }

  private stopTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private loadHighScores(): Record<GameMode, number> {
    const scores = {} as Record<GameMode, number>;
    for (const { id } of GAME_MODES) {
      scores[id] = Number(this.loadFromStorage(`${HIGH_SCORE_KEY}-${id}`)) || 0;
    }
    // Antes de existir los modos, el récord se guardaba en "snake-high-score"
    // (sin modo). Era del modo clásico: lo recuperamos para no perderlo.
    const legacy = Number(this.loadFromStorage(HIGH_SCORE_KEY)) || 0;
    scores.classic = Math.max(scores.classic, legacy);
    return scores;
  }

  private loadMode(): GameMode {
    const saved = this.loadFromStorage(MODE_KEY);
    // Solo aceptamos un valor guardado si es un modo que existe.
    return GAME_MODES.find((m) => m.id === saved)?.id ?? 'classic';
  }

  // localStorage guarda texto en el navegador y sobrevive a recargas.
  // Va dentro de try/catch porque puede fallar (modo incógnito estricto,
  // almacenamiento bloqueado...); en ese caso el juego sigue sin guardar nada.
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
      // Sin almacenamiento: los datos solo duran hasta recargar.
    }
  }

  /** Elige al azar una celda que no esté ocupada por la serpiente ni por un obstáculo. */
  private randomFreeCell(snake: readonly Position[]): Position | null {
    const occupied = [...snake, ...this.obstacles()];
    const free: Position[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = { x, y };
        if (!occupied.some((part) => samePosition(part, cell))) free.push(cell);
      }
    }
    if (free.length === 0) return null;
    return free[Math.floor(Math.random() * free.length)];
  }

  /** Serpiente de 3 segmentos en el centro, mirando a la derecha. */
  private initialSnake(): Position[] {
    const x = Math.floor(this.cols / 2);
    const y = Math.floor(this.rows / 2);
    return [
      { x, y },
      { x: x - 1, y },
      { x: x - 2, y },
    ];
  }
}
