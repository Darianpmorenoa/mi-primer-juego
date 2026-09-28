import { GameModeInfo } from './game.types';

/**
 * Lista de modos disponibles, en el orden en que se muestran.
 * Para añadir un modo nuevo: añadir su id a GameMode (game.types.ts),
 * una entrada aquí y su regla en GameService.
 */
export const GAME_MODES: readonly GameModeInfo[] = [
  {
    id: 'classic',
    name: 'Clásico',
    description: 'Los bordes y tu propio cuerpo te eliminan.',
  },
  {
    id: 'portal',
    name: 'Sin paredes',
    description: 'Atraviesa los bordes y aparece por el otro lado.',
  },
  {
    id: 'obstacles',
    name: 'Obstáculos',
    description: 'Esquiva los bloques grises. Los bordes también eliminan.',
  },
];
