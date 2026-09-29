import { Component, ElementRef, computed, input, output, viewChild } from '@angular/core';
import { GAME_MODES } from '../game/game-modes';
import { GameMode, GameStatus } from '../game/game.types';

/**
 * Qué se muestra sobre el envío a la tabla de récords:
 * - 'hidden':  nada (no entró al top, o no terminó ninguna partida)
 * - 'form':    el campo para escribir el nombre
 * - 'sending' / 'error': el formulario, enviando o con aviso de error
 * - 'sent':    confirmación de que se guardó
 */
export type ScoreFormState = 'hidden' | 'form' | 'sending' | 'sent' | 'error';

/**
 * GameScreenComponent: las pantallas que se ponen encima del tablero
 * (inicio, pausa, Game Over y victoria), con el selector de modo.
 *
 * Igual que el marcador, no inyecta el GameService:
 * - recibe datos del padre con inputs (status, score, mode...)
 * - AVISA al padre con outputs (start, resume, modeChange, showLeaderboard,
 *   submitScore).
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

    @if (showForm()) {
      <!-- (submit) salta al pulsar "Guardar" o Enter dentro del campo.
           #nameInput es una "variable de plantilla": da acceso al <input>
           desde otras partes del template (aquí, para leer su valor). -->
      <form class="submit-score" (submit)="onSubmit($event, nameInput.value)">
        <p class="top-message">¡Entraste al top 10!</p>
        <div class="row">
          <input
            #nameInput
            name="name"
            maxlength="12"
            placeholder="Tu nombre"
            aria-label="Tu nombre para la tabla de récords"
            autocomplete="nickname"
            [value]="playerName()"
            [disabled]="scoreForm() === 'sending'"
          />
          <button type="submit" class="save" [disabled]="scoreForm() === 'sending'">
            {{ scoreForm() === 'sending' ? '…' : 'Guardar' }}
          </button>
        </div>
        @if (scoreForm() === 'error') {
          <p class="error">No se pudo guardar. Inténtalo otra vez.</p>
        }
      </form>
    } @else if (scoreForm() === 'sent') {
      <p class="saved">✔ Guardado en la tabla de récords</p>
    }

    <!-- En pausa no se puede cambiar de modo (la partida sigue viva).
         Mientras se escribe el nombre lo ocultamos: cambiar de modo
         descartaría este puntaje, y además así cabe todo en el celular. -->
    @if (status() !== 'paused' && !showForm()) {
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
      <button type="button" class="secondary" (click)="showLeaderboard.emit()">
        🏆 Récords
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
    .secondary {
      padding: 6px 16px;
      font-size: 0.85rem;
      color: var(--text);
      background: var(--control);
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .secondary:hover {
      background: var(--control-hover);
    }
    .submit-score {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .top-message {
      font-weight: bold;
      color: var(--gold);
    }
    .row {
      display: flex;
      gap: 6px;
    }
    input {
      width: 9.5em;
      padding: 7px 10px;
      font: inherit;
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    input:focus {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }
    .save {
      padding: 7px 14px;
      font-weight: bold;
      color: var(--bg);
      background: var(--gold);
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .save:disabled,
    input:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .error {
      font-size: 0.8rem;
      color: var(--danger);
    }
    .saved {
      font-size: 0.9rem;
      color: var(--accent);
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
  readonly scoreForm = input<ScoreFormState>('hidden');
  readonly playerName = input('');

  // output(): un evento propio del componente. El padre lo escucha con
  // <app-game-screen (start)="..." />, igual que escucharía un (click).
  readonly start = output<void>();
  readonly resume = output<void>();
  readonly modeChange = output<GameMode>();
  readonly showLeaderboard = output<void>();
  /** Avisa con el nombre escrito (ya sin espacios en los bordes). */
  readonly submitScore = output<string>();

  protected readonly modes = GAME_MODES;

  /** Datos (nombre, descripción) del modo elegido. */
  protected readonly selectedMode = computed(
    () => GAME_MODES.find((m) => m.id === this.mode()) ?? GAME_MODES[0],
  );

  /** ¿Se ve el formulario del nombre? (también mientras envía o si falló) */
  protected readonly showForm = computed(() => {
    const state = this.scoreForm();
    return state === 'form' || state === 'sending' || state === 'error';
  });

  private readonly playButton = viewChild<ElementRef<HTMLButtonElement>>('playButton');

  protected onSubmit(event: SubmitEvent, name: string): void {
    // Sin esto, el navegador "enviaría" el formulario recargando la página.
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed) this.submitScore.emit(trimmed);
  }

  protected selectMode(mode: GameMode): void {
    this.modeChange.emit(mode);
    // Tras elegir un modo con el ratón, el foco queda en ese botón y Enter
    // lo "pulsaría" otra vez. Pasamos el foco a "Jugar" para que Enter juegue.
    this.playButton()?.nativeElement.focus();
  }
}
