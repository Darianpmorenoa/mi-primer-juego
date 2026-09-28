import { Component, computed, inject } from '@angular/core';
import { BoardComponent } from './board/board';
import { GameScreenComponent } from './game-screen/game-screen';
import { GAME_MODES } from './game/game-modes';
import { GameService } from './game/game.service';
import { Direction } from './game/game.types';
import { ScoreboardComponent } from './scoreboard/scoreboard';
import { SwipeDirective } from './swipe/swipe.directive';
import { TouchControlsComponent } from './touch-controls/touch-controls';

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
  // Para usar un componente o directiva en el template hay que importarlo aquí.
  imports: [
    BoardComponent,
    ScoreboardComponent,
    GameScreenComponent,
    TouchControlsComponent,
    SwipeDirective,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  // "host" escucha eventos fuera del template; con "document:" escuchamos
  // las teclas pulsadas en cualquier parte de la página.
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
})
export class App {
  // "protected" para poder usarlo en el template (app.html).
  protected readonly game = inject(GameService);

  /** Nombre del modo actual, para mostrarlo bajo el título. */
  protected readonly modeName = computed(
    () => GAME_MODES.find((m) => m.id === this.game.mode())?.name ?? '',
  );

  protected onKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const status = this.game.status();

    // Enter / Espacio: la "acción principal" según el momento.
    // Si el foco está en un botón, dejamos que el propio botón haga su
    // (click); si no, la acción se ejecutaría dos veces.
    if (key === 'enter' || key === ' ') {
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      if (status === 'playing') {
        if (key === ' ') this.game.pause();
      } else if (status === 'paused') {
        this.game.resume();
      } else {
        this.game.start();
      }
      return;
    }

    // 1, 2...: elegir modo (el servicio lo ignora si hay una partida en curso).
    const mode = GAME_MODES[Number(key) - 1];
    if (mode) {
      this.game.setMode(mode.id);
      return;
    }

    // P o Escape: pausar / continuar.
    if (key === 'p' || key === 'escape') {
      event.preventDefault();
      this.game.togglePause();
      return;
    }

    const direction = KEY_TO_DIRECTION[key];
    if (!direction) return;

    // Evita que las flechas hagan scroll en la página.
    event.preventDefault();
    this.game.changeDirection(direction);
  }

  /** Si el jugador cambia de pestaña o bloquea el celular, pausamos. */
  protected onVisibilityChange(): void {
    if (document.hidden) this.game.pause();
  }
}
