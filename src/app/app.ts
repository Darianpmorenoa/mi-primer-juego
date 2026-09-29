import { Component, computed, effect, inject, signal } from '@angular/core';
import { BoardComponent } from './board/board';
import { GameScreenComponent, ScoreFormState } from './game-screen/game-screen';
import { GAME_MODES } from './game/game-modes';
import { GameService } from './game/game.service';
import { Direction } from './game/game.types';
import { LeaderboardComponent } from './leaderboard/leaderboard';
import { LeaderboardService } from './leaderboard/leaderboard.service';
import { ScoreboardComponent } from './scoreboard/scoreboard';
import { SwipeDirective } from './swipe/swipe.directive';
import { TouchControlsComponent } from './touch-controls/touch-controls';
import { UpdateBannerComponent } from './update-banner/update-banner';
import { APP_VERSION } from './version';

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
    LeaderboardComponent,
    TouchControlsComponent,
    SwipeDirective,
    UpdateBannerComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  // "host" escucha eventos fuera del template; con "document:" escuchamos
  // las teclas pulsadas en cualquier parte de la página.
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(document:visibilitychange)': 'onVisibilityChange()',
    // El navegador avisa con "online" cuando vuelve la conexión.
    '(window:online)': 'leaderboard.reconnect()',
  },
})
export class App {
  // "protected" para poder usarlo en el template (app.html).
  protected readonly game = inject(GameService);
  protected readonly leaderboard = inject(LeaderboardService);

  /**
   * ¿Se está viendo la tabla de récords? Es estado de la PANTALLA
   * (qué se muestra), no del juego: por eso vive aquí y no en GameService.
   */
  protected readonly showLeaderboard = signal(false);

  protected readonly version = APP_VERSION;

  /** Nombre del modo actual, para mostrarlo bajo el título. */
  protected readonly modeName = computed(
    () => GAME_MODES.find((m) => m.id === this.game.mode())?.name ?? '',
  );

  /**
   * Qué mostrar sobre el envío del récord en la pantalla de Game Over.
   * Combina el resultado de la partida (GameService) con la tabla y el
   * envío (LeaderboardService).
   */
  protected readonly scoreForm = computed<ScoreFormState>(() => {
    const result = this.game.lastResult();
    if (!result) return 'hidden';
    // Ya se está enviando, se envió o falló: eso manda sobre lo demás.
    const submit = this.leaderboard.submitStatus();
    if (submit !== 'idle') return submit;
    return this.leaderboard.qualifies(result.mode, result.score) ? 'form' : 'hidden';
  });

  constructor() {
    // effect(): se ejecuta ahora y cada vez que cambie un signal que lea.
    // Aquí lee showLeaderboard(), game.status() y game.mode(). Pedimos el
    // top a Supabase al abrir la tabla, al terminar una partida (para saber
    // si el puntaje entra) y al cambiar de modo en esos momentos.
    effect(() => {
      const status = this.game.status();
      const needsTop = this.showLeaderboard() || status === 'over' || status === 'won';
      if (needsTop) this.leaderboard.load(this.game.mode());
    });
  }

  /** Empieza una partida nueva, olvidando el envío de la anterior. */
  protected startGame(): void {
    this.leaderboard.resetSubmit();
    this.game.start();
  }

  /** El jugador escribió su nombre en Game Over: enviamos su resultado. */
  protected submitScore(name: string): void {
    const result = this.game.lastResult();
    if (result) this.leaderboard.submit(name, result.mode, result.score);
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Si se está escribiendo en un campo de texto (el nombre), las teclas
    // son letras, no órdenes: "w" no mueve, "1" no cambia de modo...
    if (event.target instanceof HTMLInputElement) return;

    const key = event.key.toLowerCase();
    const status = this.game.status();

    // Con la tabla de récords abierta, el teclado solo cierra la tabla
    // (Escape) o cambia de modo (1, 2, 3); el resto no hace nada.
    if (this.showLeaderboard()) {
      if (key === 'escape') {
        this.showLeaderboard.set(false);
        return;
      }
      if (!GAME_MODES[Number(key) - 1]) return;
    }

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
        this.startGame();
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
