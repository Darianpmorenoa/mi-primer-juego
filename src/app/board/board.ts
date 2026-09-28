import { Component, ElementRef, afterRenderEffect, inject, viewChild } from '@angular/core';
import { GameService } from '../game/game.service';
import { Position } from '../game/game.types';

/**
 * BoardComponent: solo DIBUJA. No sabe nada de reglas del juego;
 * lee los datos del GameService y los pinta en un <canvas>.
 */
@Component({
  selector: 'app-board',
  template: `
    <canvas
      #canvas
      [width]="game.cols * cellSize"
      [height]="game.rows * cellSize"
    ></canvas>
  `,
  styles: `
    /* El canvas dibuja a 400x400 px internos, pero en pantalla se
       estira o encoge al ancho disponible (así cabe en un celular). */
    canvas {
      display: block;
      width: 100%;
      height: auto;
      box-sizing: border-box;
      border: 2px solid #3a3a5c;
      border-radius: 8px;
    }
  `,
})
export class BoardComponent {
  // inject() le pide a Angular la instancia compartida del servicio.
  protected readonly game = inject(GameService);

  /** Píxeles por celda. Es un detalle visual, por eso vive aquí y no en el servicio. */
  protected readonly cellSize = 20;

  // viewChild() nos da acceso al elemento marcado con #canvas en el template.
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    // afterRenderEffect: ejecuta la función cuando el canvas ya existe
    // y la VUELVE a ejecutar cada vez que cambia un signal que lea dentro
    // (aquí, game.snake() y game.food()). Así el tablero se redibuja solo.
    afterRenderEffect(() => this.draw(this.game.snake(), this.game.food()));
  }

  private draw(snake: readonly Position[], food: Position | null): void {
    const ctx = this.canvas().nativeElement.getContext('2d')!;
    const size = this.cellSize;

    // Fondo
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, this.game.cols * size, this.game.rows * size);

    // Cuadrícula tenue para ver las celdas
    ctx.strokeStyle = '#2a2a40';
    for (let x = 0; x <= this.game.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * size, 0);
      ctx.lineTo(x * size, this.game.rows * size);
      ctx.stroke();
    }
    for (let y = 0; y <= this.game.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * size);
      ctx.lineTo(this.game.cols * size, y * size);
      ctx.stroke();
    }

    // Comida: un círculo rojo en el centro de su celda
    if (food) {
      ctx.fillStyle = '#f38ba8';
      ctx.beginPath();
      ctx.arc((food.x + 0.5) * size, (food.y + 0.5) * size, size / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Serpiente: la cabeza (índice 0) más clara que el cuerpo
    snake.forEach((part, i) => {
      ctx.fillStyle = i === 0 ? '#a6e3a1' : '#40a02b';
      ctx.fillRect(part.x * size + 1, part.y * size + 1, size - 2, size - 2);
    });
  }
}
