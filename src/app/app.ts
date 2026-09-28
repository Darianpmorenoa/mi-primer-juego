import { Component } from '@angular/core';
import { BoardComponent } from './board/board';

/**
 * Componente raíz: no tiene lógica, solo ORGANIZA la pantalla
 * juntando los demás componentes.
 */
@Component({
  selector: 'app-root',
  // Para usar <app-board> en el template hay que importarlo aquí.
  imports: [BoardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
