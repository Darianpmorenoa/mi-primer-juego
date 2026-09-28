import { Component, input } from '@angular/core';

/**
 * ScoreboardComponent: muestra el puntaje.
 *
 * A diferencia del tablero, este componente NO inyecta el GameService:
 * recibe el puntaje desde su componente padre mediante un input.
 * Es un componente "de presentación": solo muestra lo que le pasan,
 * así que podría reutilizarse en cualquier otro juego.
 */
@Component({
  selector: 'app-scoreboard',
  template: `
    <div class="score">
      <span class="label">Puntos</span>
      <span class="value">{{ score() }}</span>
    </div>
  `,
  styles: `
    .score {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .label {
      text-transform: uppercase;
      font-size: 0.8rem;
      opacity: 0.7;
    }
    .value {
      font-size: 1.6rem;
      font-weight: bold;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class ScoreboardComponent {
  // input.required(): el padre DEBE pasar este valor: <app-scoreboard [score]="..." />
  // Un input también es un signal, por eso en el template se lee con score().
  readonly score = input.required<number>();
}
