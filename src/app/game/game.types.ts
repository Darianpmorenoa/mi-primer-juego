// Tipos compartidos del juego.
// Una "interface" describe la forma de un objeto: TypeScript nos avisará
// si intentamos crear una posición sin "x" o con un valor que no sea número.

/** Una celda del tablero, medida en columnas (x) y filas (y), no en píxeles. */
export interface Position {
  x: number;
  y: number;
}

/**
 * Las cuatro direcciones posibles.
 * Un "union type" de strings: solo estos 4 valores son válidos,
 * así un error de tipeo como 'uppp' se detecta al compilar.
 */
export type Direction = 'up' | 'down' | 'left' | 'right';
