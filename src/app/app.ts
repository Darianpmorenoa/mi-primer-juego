import { Component, inject } from '@angular/core';
import { BoardComponent } from './board/board';
import { GameService } from './game/game.service';
import { ScoreboardComponent } from './scoreboard/scoreboard';
import { Direction } from './game/game.types';

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
  // Para usar <app-board> y <app-scoreboard> en el template hay que importarlos aquí.
  imports: [BoardComponent, ScoreboardComponent],
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
    const direction = KEY_TO_DIRECTION[event.key.toLowerCase()];
    if (!direction) return;

    // Evita que las flechas hagan scroll en la página.
    event.preventDefault();
    this.game.changeDirection(direction);
  }
}
