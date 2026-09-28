import { Component, ElementRef, computed, input, output, viewChild } from '@angular/core';
import { GAME_MODES } from '../game/game-modes';
import { GameMode, GameStatus } from '../game/game.types';

/**
 * GameScreenComponent: las pantallas que se ponen encima del tablero
 * (inicio, pausa, Game Over y victoria), con el selector de modo.
 *
 * Igual que el marcador, no inyecta el GameService:
 * - recibe datos del padre con inputs (status, score, mode...)
 * - AVISA al padre con outputs (start, resume, modeChange).
 * Quien decide qué hacer con esos avisos es el padre.
 */
@Component({
  selector: 'app-game-screen',
  template: `
    <!-- @switch muestra solo el bloque cuyo @case coincide con status() -->
    @switch (status()) {
      @case ('ready') {
        <h2>Snake</h2>
        <p>Elige un modo y come la comida roja para crecer.</p>
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

    <!-- En pausa no se puede cambiar de modo (la partida sigue viva) -->
    @if (status() !== 'paused') {
      <div class="modes" role="radiogroup" aria-label="Modo de juego">
        <!-- @for repite el bloque por cada modo de la lista.
             "track m.id" le dice a Angular cómo identificar cada elemento. -->
        @for (m of modes; track m.id) {
          <button
            type="button"
            class="mode-option"
            role="radio"
            [attr.aria-checked]="m.id === mode()"
            [class.selected]="m.id === mode()"
            (click)="selectMode(m.id)"
          >
            {{ m.name }}
          </button>
        }
      </div>
      <p class="description">{{ selectedMode().description }}</p>
    }

    <!-- #playButton marca el botón para poder darle el foco desde el código -->
    @if (status() === 'paused') {
      <button type="button" class="play" (click)="resume.emit()">Continuar</button>
    } @else {
      <button #playButton type="button" class="play" (click)="start.emit()">
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
      gap: 10px;
      padding: 12px;
      text-align: center;
      line-height: 1.4;
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

    /* Selector de modo: botones unidos, como un interruptor de varias posiciones */
    .modes {
      display: flex;
      padding: 3px;
      background: var(--control);
      border-radius: 8px;
    }
    .mode-option {
      padding: 6px 12px;
      font-size: 0.85rem;
      color: var(--text-muted);
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .mode-option.selected {
      font-weight: bold;
      color: var(--bg);
      background: var(--accent);
    }
    .description {
      max-width: 280px;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .play {
      margin-top: 6px;
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
    .play:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgb(166 227 161 / 0.4);
    }
    .play:active {
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
    /* En pantallas táctiles la ayuda del teclado sobra (y quita espacio) */
    @media (hover: none) and (pointer: coarse) {
      .hint {
        display: none;
      }
    }
  `,
})
export class GameScreenComponent {
  readonly status = input.required<GameStatus>();
  readonly score = input.required<number>();
  readonly mode = input.required<GameMode>();
  readonly isNewRecord = input(false);

  // output(): un evento propio del componente. El padre lo escucha con
  // <app-game-screen (start)="..." />, igual que escucharía un (click).
  readonly start = output<void>();
  readonly resume = output<void>();
  readonly modeChange = output<GameMode>();

  protected readonly modes = GAME_MODES;

  /** Datos (nombre, descripción) del modo elegido. */
  protected readonly selectedMode = computed(
    () => GAME_MODES.find((m) => m.id === this.mode()) ?? GAME_MODES[0],
  );

  private readonly playButton = viewChild<ElementRef<HTMLButtonElement>>('playButton');

  protected selectMode(mode: GameMode): void {
    this.modeChange.emit(mode);
    // Tras elegir un modo con el ratón, el foco queda en ese botón y Enter
    // lo "pulsaría" otra vez. Pasamos el foco a "Jugar" para que Enter juegue.
    this.playButton()?.nativeElement.focus();
  }
}
