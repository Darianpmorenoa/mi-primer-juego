import { Position } from './game.types';

/** Crea una línea de celdas desde (x, y), avanzando "length" celdas en (dx, dy). */
function line(x: number, y: number, dx: number, dy: number, length: number): Position[] {
  return Array.from({ length }, (_, i) => ({ x: x + dx * i, y: y + dy * i }));
}

/**
 * Mapa de obstáculos del modo "Obstáculos", pensado para un tablero de 20x20.
 * La serpiente nace en la fila 10 mirando a la derecha, así que esa fila
 * queda libre para que los primeros pasos sean seguros.
 *
 *   . . . . . . . . . . . . . . . . . . . .
 *   . . . . . . . . . . . . . . . . . . . .
 *   . . . . . . . . . . . . . . . . . . . .
 *   . . . ■ ■ ■ . . . . . . . . ■ ■ ■ . . .
 *   . . . ■ . . . . . . . . . . . . ■ . . .
 *   . . . ■ . . . . . . . . . . . . ■ . . .
 *   . . . . . . . . ■ ■ ■ ■ . . . . . . . .
 *   ...                (fila 10 libre)                ...
 *   . . . . . . . . ■ ■ ■ ■ . . . . . . . .
 *   . . . ■ . . . . . . . . . . . . ■ . . .
 *   . . . ■ . . . . . . . . . . . . ■ . . .
 *   . . . ■ ■ ■ . . . . . . . . ■ ■ ■ . . .
 */
export const OBSTACLES: readonly Position[] = [
  // Esquina superior izquierda (forma de L)
  ...line(3, 3, 1, 0, 3),
  ...line(3, 4, 0, 1, 2),
  // Esquina superior derecha
  ...line(14, 3, 1, 0, 3),
  ...line(16, 4, 0, 1, 2),
  // Esquina inferior izquierda
  ...line(3, 16, 1, 0, 3),
  ...line(3, 14, 0, 1, 2),
  // Esquina inferior derecha
  ...line(14, 16, 1, 0, 3),
  ...line(16, 14, 0, 1, 2),
  // Barras centrales, encima y debajo de la fila de salida
  ...line(8, 6, 1, 0, 4),
  ...line(8, 13, 1, 0, 4),
];
