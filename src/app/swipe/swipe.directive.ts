import { Directive, output } from '@angular/core';
import { Direction } from '../game/game.types';

/** Píxeles que hay que deslizar el dedo para que cuente como un giro. */
const SWIPE_THRESHOLD = 24;

/**
 * SwipeDirective: detecta cuando el jugador desliza el dedo sobre un
 * elemento y emite hacia qué dirección lo hizo.
 *
 * Una DIRECTIVA añade comportamiento a un elemento que ya existe, sin
 * tener template propio. Se usa como un atributo:
 *   <div appSwipe (swipe)="game.changeDirection($event)">
 */
@Directive({
  selector: '[appSwipe]',
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerEnd()',
    '(pointercancel)': 'onPointerEnd()',
    // Sin esto, al deslizar el dedo el navegador haría scroll o zoom
    // en vez de dejarnos leer el movimiento.
    '[style.touch-action]': '"none"',
  },
})
export class SwipeDirective {
  readonly swipe = output<Direction>();

  /** Dónde empezó el deslizamiento actual (null = no hay dedo apoyado). */
  private start: { x: number; y: number } | null = null;

  protected onPointerDown(event: PointerEvent): void {
    // Solo dedo o lápiz: con el ratón se juega con el teclado.
    if (event.pointerType === 'mouse') return;
    this.start = { x: event.clientX, y: event.clientY };
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.start) return;

    const dx = event.clientX - this.start.x;
    const dy = event.clientY - this.start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

    // Gana el eje en el que más se movió el dedo.
    if (Math.abs(dx) > Math.abs(dy)) {
      this.swipe.emit(dx > 0 ? 'right' : 'left');
    } else {
      this.swipe.emit(dy > 0 ? 'down' : 'up');
    }

    // Emitimos en cuanto se supera el umbral, sin esperar a que se levante
    // el dedo, y tomamos este punto como nuevo inicio: así se pueden
    // encadenar giros (por ejemplo ↑ y luego →) sin soltar la pantalla.
    this.start = { x: event.clientX, y: event.clientY };
  }

  protected onPointerEnd(): void {
    this.start = null;
  }
}
