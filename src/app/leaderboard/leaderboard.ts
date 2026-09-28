import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { GAME_MODES } from '../game/game-modes';
import { GameMode } from '../game/game.types';
import { LeaderboardEntry, LeaderboardStatus } from './leaderboard.service';

/**
 * LeaderboardComponent: la pantalla con el top 10 compartido de cada modo.
 *
 * Es presentacional, como el marcador: no sabe nada de Supabase.
 * Recibe los datos por inputs y avisa al padre con outputs.
 */
@Component({
  selector: 'app-leaderboard',
  template: `
    <h2>Récords</h2>

    <div class="modes" role="radiogroup" aria-label="Modo de juego">
      @for (m of modes; track m.id) {
        <button
          type="button"
          class="mode-option"
          role="radio"
          [attr.aria-checked]="m.id === mode()"
          [class.selected]="m.id === mode()"
          (click)="modeChange.emit(m.id)"
        >
          {{ m.name }}
        </button>
      }
    </div>

    <div class="content" aria-live="polite">
      @switch (status()) {
        @case ('loading') {
          <p class="message">Cargando…</p>
        }
        @case ('error') {
          <p class="message">No se pudo cargar la tabla.<br />¿Tienes conexión a internet?</p>
          <button type="button" class="secondary" (click)="retry.emit()">Reintentar</button>
        }
        @case ('loaded') {
          @if (entries().length > 0) {
            <ol>
              @for (entry of entries(); track $index) {
                <!-- $index es la posición en la lista (empieza en 0) -->
                <li [class.podium]="$index < 3">
                  <span class="rank">{{ $index + 1 }}</span>
                  <!-- {{ }} convierte el nombre en texto: aunque alguien escriba
                       HTML en su nombre, Angular lo muestra tal cual, sin ejecutarlo. -->
                  <span class="name">{{ entry.name }}</span>
                  <span class="score">{{ entry.score }}</span>
                </li>
              }
            </ol>
          } @else {
            <p class="message">Aún no hay récords en este modo.<br />¡Sé el primero!</p>
          }
        }
      }
    </div>

    <button #closeButton type="button" class="play" (click)="close.emit()">Volver</button>
  `,
  styles: `
    /* Igual que la pantalla de inicio: cubre el tablero por completo. */
    :host {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 16px 12px;
      text-align: center;
      background: rgb(17 17 27 / 0.92);
      backdrop-filter: blur(3px);
      border-radius: 10px;
    }
    h2 {
      margin: 0;
      font-family: var(--font-retro);
      font-size: 1.2rem;
      color: var(--gold);
    }

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

    /* La lista ocupa el espacio que sobre; si no cabe, se desplaza. */
    .content {
      flex: 1;
      width: 100%;
      max-width: 300px;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      /* Barra de desplazamiento fina y con los colores del juego */
      scrollbar-width: thin;
      scrollbar-color: var(--control-hover) transparent;
    }
    /* Centrado vertical con márgenes automáticos (y no con
       justify-content: center), porque si la lista no cabe, el centrado
       la sacaría por arriba y esas filas no se podrían ver ni con scroll. */
    .content > :first-child {
      margin-top: auto;
    }
    .content > :last-child {
      margin-bottom: auto;
    }
    .message {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.5;
      color: var(--text-muted);
    }
    ol {
      width: 100%;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 3px 8px;
      font-size: 0.85rem;
      border-radius: 6px;
    }
    li:nth-child(odd) {
      background: rgb(255 255 255 / 0.04);
    }
    .rank {
      width: 1.6em;
      font-family: var(--font-retro);
      font-size: 0.65rem;
      color: var(--text-muted);
      text-align: right;
    }
    .podium .rank {
      color: var(--gold);
    }
    .name {
      flex: 1;
      text-align: left;
      /* Nombres largos: cortar con "…" en vez de romper la fila */
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .score {
      font-family: var(--font-retro);
      font-size: 0.7rem;
      color: var(--accent);
    }

    .play,
    .secondary {
      font-weight: bold;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .play {
      padding: 10px 28px;
      font-size: 1rem;
      color: var(--bg);
      background: var(--accent);
    }
    .secondary {
      padding: 6px 16px;
      font-size: 0.85rem;
      color: var(--text);
      background: var(--control);
    }
    .secondary:hover {
      background: var(--control-hover);
    }
  `,
})
export class LeaderboardComponent {
  readonly entries = input.required<readonly LeaderboardEntry[]>();
  readonly status = input.required<LeaderboardStatus>();
  readonly mode = input.required<GameMode>();

  readonly close = output<void>();
  readonly retry = output<void>();
  readonly modeChange = output<GameMode>();

  protected readonly modes = GAME_MODES;

  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

  constructor() {
    // Al abrir la tabla, el foco va a "Volver": así Enter la cierra
    // y quien juega con teclado sabe dónde está.
    afterNextRender(() => this.closeButton().nativeElement.focus());
  }
}
