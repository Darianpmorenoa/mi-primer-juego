import { Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { GameService } from '../game/game.service';

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
    canvas {
      display: block;
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
    // El canvas no existe hasta que Angular renderiza el template,
    // así que esperamos a ese momento para dibujar.
    afterNextRender(() => this.draw());
  }

  private draw(): void {
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
  }
}
