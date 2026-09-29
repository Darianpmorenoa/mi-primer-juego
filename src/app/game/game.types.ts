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

/**
 * En qué momento está la partida:
 * - 'ready':   pantalla de inicio, aún no se ha jugado
 * - 'playing': jugando
 * - 'paused':  en pausa
 * - 'over':    Game Over (chocó)
 * - 'won':     la serpiente llenó todo el tablero
 */
export type GameStatus = 'ready' | 'playing' | 'paused' | 'over' | 'won';

/**
 * Modos de juego:
 * - 'classic': los bordes matan
 * - 'portal':    sin paredes, se atraviesan los bordes
 * - 'obstacles': como el clásico, pero con bloques que también matan
 */
export type GameMode = 'classic' | 'portal' | 'obstacles';

/** Resultado de una partida terminada: en qué modo y con cuántos puntos. */
export interface GameResult {
  mode: GameMode;
  score: number;
}

/** Datos de un modo para mostrarlo en pantalla. */
export interface GameModeInfo {
  id: GameMode;
  name: string;
  description: string;
}
