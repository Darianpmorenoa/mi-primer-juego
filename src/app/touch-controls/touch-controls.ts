import { Component, output } from '@angular/core';
import { Direction } from '../game/game.types';

/**
 * TouchControlsComponent: cruceta de botones para jugar en el celular.
 *
 * Tampoco inyecta el GameService: solo emite qué dirección se tocó.
 * El padre la conecta con game.changeDirection(), igual que hace con
 * el teclado. Así el servicio no sabe (ni le importa) de dónde vino la orden.
 */
@Component({
  selector: 'app-touch-controls',
  template: `
    <button type="button" class="up" aria-label="Arriba" (pointerdown)="press($event, 'up')">▲</button>
    <button type="button" class="left" aria-label="Izquierda" (pointerdown)="press($event, 'left')">◀</button>
    <button type="button" class="right" aria-label="Derecha" (pointerdown)="press($event, 'right')">▶</button>
    <button type="button" class="down" aria-label="Abajo" (pointerdown)="press($event, 'down')">▼</button>
  `,
  styles: `
    /* Cruceta en una cuadrícula de 3x3 */
    :host {
      display: grid;
      grid-template-columns: repeat(3, 64px);
      grid-template-rows: repeat(3, 64px);
      gap: 6px;
    }
    .up    { grid-area: 1 / 2; }
    .left  { grid-area: 2 / 1; }
    .right { grid-area: 2 / 3; }
    .down  { grid-area: 3 / 2; }

    button {
      font-size: 1.4rem;
      color: #cdd6f4;
      background: #313244;
      border: none;
      border-radius: 12px;
      /* Evita el zoom por doble toque y la selección de texto */
      touch-action: manipulation;
      user-select: none;
    }
    button:active {
      background: #45475a;
    }
  `,
})
export class TouchControlsComponent {
  readonly direction = output<Direction>();

  // Usamos (pointerdown) en vez de (click): el click se dispara al SOLTAR
  // el dedo, y en un juego rápido esa pequeña espera se nota.
  protected press(event: PointerEvent, direction: Direction): void {
    event.preventDefault();
    this.direction.emit(direction);
  }
}
