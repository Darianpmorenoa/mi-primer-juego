import { Injectable, computed, signal } from '@angular/core';
import { Direction, Position } from './game.types';

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

  /** Milisegundos entre cada paso de la serpiente. */
  private readonly tickMs = 150;

  // Un signal es un valor que AVISA cuando cambia: quien lo lea
  // (por ejemplo el tablero) se actualiza solo.
  // La versión con "_" es privada y se puede modificar; hacia afuera
  // exponemos una de solo lectura para que nadie más cambie la serpiente.
  private readonly _snake = signal<Position[]>(this.initialSnake());
  readonly snake = this._snake.asReadonly();

  /** Dónde está la comida (null si no queda ninguna celda libre). */
  private readonly _food = signal<Position | null>(this.randomFreeCell(this._snake()));
  readonly food = this._food.asReadonly();

  // computed(): un signal que se CALCULA a partir de otros.
  // No guardamos el puntaje aparte: se deduce del largo de la serpiente,
  // así nunca pueden quedar desincronizados.
  readonly score = computed(() => (this._snake().length - INITIAL_LENGTH) * POINTS_PER_FOOD);

  /** Dirección con la que se dio el último paso. */
  private direction: Direction = 'right';
  /** Dirección que se usará en el próximo paso. */
  private nextDirection: Direction = 'right';

  private timerId: ReturnType<typeof setInterval> | null = null;

  /** Lo llaman los componentes cuando el jugador pulsa una dirección. */
  changeDirection(newDirection: Direction): void {
    // Comparamos con la dirección del último paso real (no con nextDirection).
    // Si no, pulsando ↑ y ← muy rápido yendo a la derecha, la serpiente
    // podría girar 180° dentro del mismo paso.
    if (newDirection === OPPOSITE[this.direction]) return;
    this.nextDirection = newDirection;

    // El juego arranca con la primera tecla.
    if (this.timerId === null) {
      this.timerId = setInterval(() => this.tick(), this.tickMs);
    }
  }

  /** Un paso del juego: la serpiente avanza una celda. */
  private tick(): void {
    this.direction = this.nextDirection;
    const head = this._snake()[0];
    const move = MOVES[this.direction];

    // Por ahora, al salir por un borde aparece por el lado contrario
    // (el operador % "da la vuelta"). En la Fase 4 los bordes matarán.
    const newHead: Position = {
      x: (head.x + move.x + this.cols) % this.cols,
      y: (head.y + move.y + this.rows) % this.rows,
    };

    const food = this._food();
    const ate = food !== null && samePosition(newHead, food);

    // Avanzar = poner una cabeza nueva delante y quitar el último segmento.
    // Si comió, NO quitamos la cola: así la serpiente crece un segmento.
    // Creamos un array NUEVO en vez de modificar el viejo: así el signal
    // detecta el cambio.
    const newSnake = ate ? [newHead, ...this._snake()] : [newHead, ...this._snake().slice(0, -1)];
    this._snake.set(newSnake);

    if (ate) {
      this._food.set(this.randomFreeCell(newSnake));
    }
  }

  /** Elige al azar una celda que no esté ocupada por la serpiente. */
  private randomFreeCell(snake: readonly Position[]): Position | null {
    const free: Position[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = { x, y };
        if (!snake.some((part) => samePosition(part, cell))) free.push(cell);
      }
    }
    // Si la serpiente llena todo el tablero no hay dónde poner comida.
    // (Ese caso, "ganar", lo trataremos en la Fase 4.)
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
