import { Component, ElementRef, afterRenderEffect, inject, viewChild } from '@angular/core';
import { GameService } from '../game/game.service';
import { GameStatus, Position } from '../game/game.types';

/**
 * Colores del canvas. El canvas no entiende var(--...) de CSS,
 * así que los repetimos aquí (son los mismos que en styles.css).
 */
const COLORS = {
  cellLight: '#1e1e2e',
  cellDark: '#1a1a29',
  food: '#f38ba8',
  head: '#a6e3a1',
  tail: '#2f7a3a',
  crashed: '#f38ba8',
  eye: '#11111b',
};

/**
 * BoardComponent: solo DIBUJA. No sabe nada de reglas del juego;
 * lee los datos del GameService y los pinta en un <canvas>.
 */
@Component({
  selector: 'app-board',
  template: `
    <canvas
      #canvas
      [width]="game.cols * cellSize * pixelRatio"
      [height]="game.rows * cellSize * pixelRatio"
    ></canvas>
  `,
  styles: `
    /* El canvas dibuja a su tamaño interno, pero en pantalla se
       estira o encoge al ancho disponible (así cabe en un celular). */
    canvas {
      display: block;
      width: 100%;
      height: auto;
      box-sizing: border-box;
      border: 2px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 10px 40px rgb(0 0 0 / 0.4);
    }
  `,
})
export class BoardComponent {
  // inject() le pide a Angular la instancia compartida del servicio.
  protected readonly game = inject(GameService);

  /** Píxeles por celda. Es un detalle visual, por eso vive aquí y no en el servicio. */
  protected readonly cellSize = 20;

  /**
   * Pantallas "retina" (casi todos los celulares) tienen 2 o 3 píxeles
   * físicos por cada píxel CSS. Si el canvas no lo tiene en cuenta se ve
   * borroso, así que lo creamos más grande y escalamos el dibujo.
   */
  protected readonly pixelRatio = Math.min(window.devicePixelRatio || 1, 3);

  // viewChild() nos da acceso al elemento marcado con #canvas en el template.
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    // afterRenderEffect: ejecuta la función cuando el canvas ya existe
    // y la VUELVE a ejecutar cada vez que cambia un signal que lea dentro
    // (snake, food y status). Así el tablero se redibuja solo.
    afterRenderEffect(() => this.draw(this.game.snake(), this.game.food(), this.game.status()));
  }

  private draw(snake: readonly Position[], food: Position | null, status: GameStatus): void {
    const ctx = this.canvas().nativeElement.getContext('2d')!;
    // A partir de aquí dibujamos en "píxeles CSS"; el escalado hace el resto.
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    this.drawBackground(ctx);
    if (food) this.drawFood(ctx, food);
    this.drawSnake(ctx, snake, status === 'over');
  }

  /** Fondo de cuadros alternos, como un tablero de ajedrez muy suave. */
  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const size = this.cellSize;
    for (let y = 0; y < this.game.rows; y++) {
      for (let x = 0; x < this.game.cols; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.cellLight : COLORS.cellDark;
        ctx.fillRect(x * size, y * size, size, size);
      }
    }
  }

  /** Comida: círculo con un brillo alrededor. */
  private drawFood(ctx: CanvasRenderingContext2D, food: Position): void {
    const size = this.cellSize;
    const cx = (food.x + 0.5) * size;
    const cy = (food.y + 0.5) * size;

    // save()/restore() guardan y recuperan la configuración del pincel,
    // así el brillo (shadow) solo afecta a la comida.
    ctx.save();
    ctx.shadowColor = COLORS.food;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.food;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Pequeño reflejo para que parezca una fruta
    ctx.fillStyle = 'rgb(255 255 255 / 0.5)';
    ctx.beginPath();
    ctx.arc(cx - 2.5, cy - 2.5, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Serpiente: segmentos redondeados que se oscurecen hacia la cola. */
  private drawSnake(ctx: CanvasRenderingContext2D, snake: readonly Position[], crashed: boolean): void {
    const size = this.cellSize;

    // Dibujamos de la cola a la cabeza para que la cabeza quede encima.
    for (let i = snake.length - 1; i >= 0; i--) {
      const part = snake[i];
      // t va de 0 (cabeza) a 1 (cola): sirve para mezclar los dos colores.
      const t = snake.length > 1 ? i / (snake.length - 1) : 0;
      ctx.fillStyle = i === 0 && crashed ? COLORS.crashed : mixColors(COLORS.head, COLORS.tail, t);
      ctx.beginPath();
      ctx.roundRect(part.x * size + 1, part.y * size + 1, size - 2, size - 2, i === 0 ? 6 : 4);
      ctx.fill();
    }

    this.drawEyes(ctx, snake);
  }

  /**
   * Ojos en la cabeza, mirando hacia donde avanza. La dirección no la
   * pedimos al servicio: la deducimos comparando la cabeza con el cuello.
   */
  private drawEyes(ctx: CanvasRenderingContext2D, snake: readonly Position[]): void {
    const size = this.cellSize;
    const head = snake[0];
    const neck = snake[1] ?? { x: head.x - 1, y: head.y };
    const dx = head.x - neck.x; // 1 = derecha, -1 = izquierda
    const dy = head.y - neck.y; // 1 = abajo,   -1 = arriba

    const cx = (head.x + 0.5) * size;
    const cy = (head.y + 0.5) * size;
    // Los ojos se adelantan en la dirección de avance y se separan
    // hacia los lados (perpendicular al avance).
    const forward = 3;
    const apart = 4;

    ctx.fillStyle = COLORS.eye;
    for (const side of [-1, 1]) {
      const ex = cx + dx * forward + dy * apart * side;
      const ey = cy + dy * forward + dx * apart * side;
      ctx.beginPath();
      ctx.arc(ex, ey, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Mezcla dos colores "#rrggbb": t=0 da el primero, t=1 el segundo. */
function mixColors(from: string, to: string, t: number): string {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const channel = (shift: number) => {
    const ca = (a >> shift) & 0xff;
    const cb = (b >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * t);
  };
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}
