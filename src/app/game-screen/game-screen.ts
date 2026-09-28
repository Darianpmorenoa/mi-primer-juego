import { Component, input, output } from '@angular/core';
import { GameStatus } from '../game/game.types';

/**
 * GameScreenComponent: las pantallas que se ponen encima del tablero
 * (inicio, pausa, Game Over y victoria).
 *
 * Igual que el marcador, no inyecta el GameService:
 * - recibe datos del padre con inputs (status, score)
 * - AVISA al padre con outputs (start, resume) cuando el jugador quiere jugar.
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
      @case ('paused') {
        <h2>Pausa</h2>
        <p>Puntaje: <strong>{{ score() }}</strong></p>
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

    @if (isNewRecord()) {
      <p class="record">¡Nuevo récord!</p>
    }

    <!-- (click) escucha el evento; .emit() se lo avisa al padre -->
    @if (status() === 'paused') {
      <button type="button" (click)="resume.emit()">Continuar</button>
    } @else {
      <button type="button" (click)="start.emit()">
        {{ status() === 'ready' ? 'Jugar' : 'Jugar otra vez' }}
      </button>
    }
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
      line-height: 1.5;
      background: rgb(17 17 27 / 0.8);
      /* Desenfoca el tablero que queda detrás */
      backdrop-filter: blur(3px);
      border-radius: 10px;
    }
    h2 {
      margin: 0 0 4px;
      font-family: var(--font-retro);
      font-size: 1.4rem;
      color: var(--accent);
      text-shadow: 0 0 12px rgb(166 227 161 / 0.5);
    }
    p {
      margin: 0;
    }
    strong {
      color: var(--accent);
    }
    button {
      margin-top: 8px;
      padding: 12px 28px;
      font-size: 1rem;
      font-weight: bold;
      color: var(--bg);
      background: var(--accent);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgb(166 227 161 / 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    .record {
      font-family: var(--font-retro);
      font-size: 0.75rem;
      color: var(--gold);
      animation: pulse 0.8s ease-in-out infinite alternate;
    }
    @keyframes pulse {
      from { transform: scale(1); }
      to   { transform: scale(1.1); }
    }
    .hint {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
  `,
})
export class GameScreenComponent {
  readonly status = input.required<GameStatus>();
  readonly score = input.required<number>();
  readonly isNewRecord = input(false);

  // output(): un evento propio del componente. El padre lo escucha con
  // <app-game-screen (start)="..." />, igual que escucharía un (click).
  readonly start = output<void>();
  readonly resume = output<void>();
}
