import { Component, inject } from '@angular/core';
import { BoardComponent } from './board/board';
import { GameScreenComponent } from './game-screen/game-screen';
import { GameService } from './game/game.service';
import { Direction } from './game/game.types';
import { ScoreboardComponent } from './scoreboard/scoreboard';

/** Qué dirección corresponde a cada tecla (flechas y WASD). */
const KEY_TO_DIRECTION: Record<string, Direction> = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

/**
 * Componente raíz: no tiene lógica de juego, solo ORGANIZA la pantalla
 * y traduce el teclado en órdenes para el GameService.
 */
@Component({
  selector: 'app-root',
  // Para usar un componente en el template hay que importarlo aquí.
  imports: [BoardComponent, ScoreboardComponent, GameScreenComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  // "host" escucha eventos fuera del template; con "document:" escuchamos
  // las teclas pulsadas en cualquier parte de la página.
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class App {
  // "protected" para poder usarlo en el template (app.html).
  protected readonly game = inject(GameService);

  protected onKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    // Enter o Espacio empiezan la partida cuando no se está jugando.
    // Si el foco está en un botón, dejamos que el propio botón haga su
    // (click); si no, la partida empezaría dos veces.
    if ((key === 'enter' || key === ' ') && this.game.status() !== 'playing') {
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      this.game.start();
      return;
    }

    const direction = KEY_TO_DIRECTION[key];
    if (!direction) return;

    // Evita que las flechas hagan scroll en la página.
    event.preventDefault();
    this.game.changeDirection(direction);
  }
}
