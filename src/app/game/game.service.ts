import { Injectable, signal } from '@angular/core';
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

    // Avanzar = poner una cabeza nueva delante y quitar el último segmento.
    // Creamos un array NUEVO en vez de modificar el viejo: así el signal
    // detecta el cambio.
    this._snake.update((snake) => [newHead, ...snake.slice(0, -1)]);
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
