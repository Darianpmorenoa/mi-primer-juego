import { Component, input, output } from '@angular/core';
import { GameStatus } from '../game/game.types';

/**
 * GameScreenComponent: las pantallas que se ponen encima del tablero
 * (inicio, Game Over y victoria).
 *
 * Igual que el marcador, no inyecta el GameService:
 * - recibe datos del padre con inputs (status, score)
 * - AVISA al padre con un output (start) cuando el jugador quiere jugar.
 * Quien decide qué hacer con ese aviso es el padre.
 */
@Component({
  selector: 'app-game-screen',
  template: `
    <!-- @switch muestra solo el bloque cuyo @case coincide con status() -->
    @switch (status()) {
      @case ('ready') {
        <h2>Snake</h2>
        <p>Come la comida roja para crecer.<br />No choques con los bordes ni contigo.</p>
      }
      @case ('over') {
        <h2>Game Over</h2>
        <p>Puntaje: <strong>{{ score() }}</strong></p>
      }
      @case ('won') {
        <h2>¡Ganaste!</h2>
        <p>Llenaste todo el tablero con {{ score() }} puntos.</p>
      }
    }

    <!-- (click) escucha el evento; start.emit() se lo avisa al padre -->
    <button type="button" (click)="start.emit()">
      {{ status() === 'ready' ? 'Jugar' : 'Jugar otra vez' }}
    </button>
    <p class="hint">o pulsa Enter / Espacio</p>
  `,
  styles: `
    /* :host es el propio elemento <app-game-screen>: lo ponemos
       encima del tablero cubriéndolo por completo. */
    :host {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px;
      text-align: center;
      background: rgba(17, 17, 27, 0.85);
      border-radius: 8px;
    }
    h2 {
      margin: 0;
      font-size: 2rem;
    }
    p {
      margin: 0;
    }
    button {
      padding: 10px 28px;
      font-size: 1.1rem;
      font-weight: bold;
      color: #11111b;
      background: #a6e3a1;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .hint {
      font-size: 0.85rem;
      opacity: 0.6;
    }
  `,
})
export class GameScreenComponent {
  readonly status = input.required<GameStatus>();
  readonly score = input.required<number>();

  // output(): un evento propio del componente. El padre lo escucha con
  // <app-game-screen (start)="..." />, igual que escucharía un (click).
  readonly start = output<void>();
}
