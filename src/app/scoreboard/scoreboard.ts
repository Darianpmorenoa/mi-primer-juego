import { Component, input } from '@angular/core';

/**
 * ScoreboardComponent: muestra puntaje, récord y nivel.
 *
 * A diferencia del tablero, este componente NO inyecta el GameService:
 * recibe los datos desde su componente padre mediante inputs.
 * Es un componente "de presentación": solo muestra lo que le pasan,
 * así que podría reutilizarse en cualquier otro juego.
 */
@Component({
  selector: 'app-scoreboard',
  template: `
    <div class="stat">
      <span class="label">Puntos</span>
      <span class="value">{{ score() }}</span>
    </div>
    <div class="stat">
      <span class="label">Récord</span>
      <span class="value">{{ highScore() }}</span>
    </div>
    <div class="stat">
      <span class="label">Nivel</span>
      <span class="value">{{ level() }}</span>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      gap: 20px;
    }
    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      min-width: 64px;
    }
    .label {
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    .value {
      font-family: var(--font-retro);
      font-size: 1rem;
      color: var(--accent);
    }
  `,
})
export class ScoreboardComponent {
  // input.required(): el padre DEBE pasar estos valores: <app-scoreboard [score]="..." />
  // Un input también es un signal, por eso en el template se lee con score().
  readonly score = input.required<number>();
  readonly highScore = input.required<number>();
  readonly level = input.required<number>();
}
