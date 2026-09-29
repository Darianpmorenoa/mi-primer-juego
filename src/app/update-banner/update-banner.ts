import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';

/**
 * UpdateBannerComponent: avisa cuando hay una versión nueva del juego.
 *
 * Con el service worker, el juego SIEMPRE abre la copia guardada (por eso
 * funciona sin internet). Mientras tanto descarga la versión nueva en
 * segundo plano; cuando la tiene lista, este aviso ofrece recargar.
 */
@Component({
  selector: 'app-update-banner',
  template: `
    @if (updateReady()) {
      <div class="banner" role="status">
        <span>Hay una versión nueva del juego.</span>
        <button type="button" (click)="reload()">Actualizar</button>
      </div>
    }
  `,
  styles: `
    .banner {
      position: fixed;
      left: 50%;
      bottom: 16px;
      z-index: 10;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
      width: max-content;
      max-width: calc(100vw - 32px);
      padding: 10px 12px 10px 16px;
      font-size: 0.9rem;
      background: var(--surface-alt);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 6px 24px rgb(0 0 0 / 0.5);
    }
    button {
      padding: 6px 14px;
      font-weight: bold;
      color: var(--bg);
      background: var(--accent);
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
  `,
})
export class UpdateBannerComponent {
  private readonly swUpdate = inject(SwUpdate);

  /**
   * swUpdate.versionUpdates es un Observable: emite un evento por cada paso
   * de la actualización. Con filter nos quedamos solo con "versión lista"
   * y con map lo convertimos en true.
   *
   * toSignal() convierte ese Observable en un signal, para usarlo en el
   * template igual que los demás. Empieza en false (initialValue).
   */
  protected readonly updateReady = toSignal(
    this.swUpdate.versionUpdates.pipe(
      filter((event) => event.type === 'VERSION_READY'),
      map(() => true),
    ),
    { initialValue: false },
  );

  protected reload(): void {
    document.location.reload();
  }
}
