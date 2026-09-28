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
      gap: 24px;
    }
    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .label {
      text-transform: uppercase;
      font-size: 0.75rem;
      opacity: 0.7;
    }
    .value {
      font-size: 1.5rem;
      font-weight: bold;
      font-variant-numeric: tabular-nums;
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
