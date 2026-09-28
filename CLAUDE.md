# Handoff: Snake en Angular

Contexto para retomar el proyecto en una sesión futura. Última actualización: 2026-09-28.

## Qué es
Juego Snake clásico hecho por Darian (principiante en Angular) **para aprender Angular**. El objetivo no es solo que el juego funcione, sino entender cómo se separan las responsabilidades.

- **Jugar:** https://darianpmorenoa.github.io/mi-primer-juego/
- **Repo:** https://github.com/Darianpmorenoa/mi-primer-juego (público, rama `main`)
- **Estado:** completo y probado por Darian en PC y celular.

## Cómo trabajar con Darian
- Hablar en **español**, explicaciones para principiante.
- Trabajar **por fases** y **detenerse al final de cada una** para que pruebe (`npx ng serve` o el enlace publicado).
- Al terminar cada fase: explicar en **3–4 frases los conceptos de Angular** usados.
- Explicar **el porqué de cada decisión técnica** importante.
- Hacer **commit + push al terminar cada fase** (mensajes en español). El push publica automáticamente.
- Si una decisión es de Darian (qué modos, cómo aparecen obstáculos...), preguntar con opciones.

## Stack y entorno (Windows)
- **Angular 21.2** (no 22): su Node es 22.18 y Angular 22 exige ≥ 22.22.3. Si actualiza Node, se puede subir de versión.
- Standalone components, **signals**, **zoneless** (sin zone.js). Sin router (se quitó). Sin tests (se quitó `app.spec.ts`).
- `.npmrc` con `legacy-peer-deps=true`: npm 10.9 falla con "Cannot read properties of null (reading 'edgesOut')" al resolver peers de vitest.
- Usar `npx ng ...` (no `ng` global).
- En **Git Bash**, `--base-href /mi-primer-juego/` se convierte en ruta de Windows: usar `MSYS_NO_PATHCONV=1`. En CI (Linux) no pasa.
- Los comandos con `!` del prompt corren en **bash**, no PowerShell.
- `gh` CLI instalado (`C:\Program Files\GitHub CLI\gh.exe`) pero **sin login**; el push funciona con Git Credential Manager. Para ver Actions sin login: API pública `https://api.github.com/repos/Darianpmorenoa/mi-primer-juego/actions/runs`.
- La carpeta está dentro del repo git de `C:\Darian`, pero tiene **su propio repo**. No tocar el repo padre (tiene trabajo sin commitear de `sitio-apuestas`).
- `angular.json`: Angular a veces añade `"analytics"` al hacer `ng serve`; Darian pidió **descartarlo** (`git restore angular.json`).

## Arquitectura (la idea central)
**La lógica vive en el servicio; los componentes solo muestran datos o avisan eventos.**

| Archivo | Responsabilidad | Comunicación |
|---|---|---|
| `game/game.types.ts` | `Position`, `Direction`, `GameStatus`, `GameMode`, `GameModeInfo` | — |
| `game/game-modes.ts` | Lista `GAME_MODES` (id, nombre, descripción) | — |
| `game/obstacles.ts` | Mapa fijo `OBSTACLES` (20x20) con helper `line()` | — |
| `game/game.service.ts` | TODAS las reglas: movimiento, colisiones, comida, puntaje, niveles, pausa, modos, récords | Signals de solo lectura (`asReadonly`) + métodos |
| `board/board.ts` | Dibuja en `<canvas>` con `afterRenderEffect` | Inyecta el servicio |
| `scoreboard/scoreboard.ts` | Puntos, récord, nivel | Solo inputs (presentacional) |
| `game-screen/game-screen.ts` | Pantallas inicio/pausa/Game Over/victoria + selector de modo | Inputs + outputs (`start`, `resume`, `modeChange`) |
| `touch-controls/touch-controls.ts` | Cruceta táctil (solo `pointer: coarse`) | Output `direction` |
| `swipe/swipe.directive.ts` | Directiva `appSwipe`: deslizar el dedo sobre el tablero | Output `swipe` |
| `app.ts` / `app.html` | Organiza la pantalla, teclado, pausa al cambiar de pestaña | Conecta hijos con el servicio |

### Decisiones clave del servicio
- **Una sola fuente de verdad:** `score` = `computed` del largo de la serpiente; `level` sale de `score`; `tickMs` sale de `level`; `highScore` sale de `_highScores[mode]`; `obstacles` sale de `mode`.
- **Orden de propiedades importa:** `_mode` y `obstacles` van ANTES de `_snake`/`_food` (la comida inicial necesita saber las celdas ocupadas).
- `direction` + `nextDirection`: evita giros de 180° pulsando dos teclas en un mismo paso.
- Bucle con `setTimeout` encadenado (no `setInterval`) porque la velocidad cambia por nivel.
- Arrays/objetos **nuevos** al actualizar signals (`[newHead, ...body]`, `{ ...scores, [mode]: score }`).
- `setMode()` se ignora en `playing`/`paused`; en `ready` recoloca la comida.
- `localStorage` siempre en `try/catch`. Claves: `snake-mode`, `snake-high-score-<modo>`; la clave antigua `snake-high-score` se migra al modo `classic`.

### Reglas del juego
- Tablero 20x20. Serpiente inicial de 3 en el centro mirando a la derecha.
- 10 puntos por comida; nivel +1 cada 50 puntos; velocidad 150 ms → −12 ms por nivel, mínimo 60 ms.
- Modos: **Clásico** (bordes matan), **Sin paredes** (`portal`, se atraviesan bordes), **Obstáculos** (clásico + mapa fijo). Obstáculos **solo** en su modo y **fijos desde el inicio** (Darian lo eligió así).
- Controles: flechas/WASD, Enter/Espacio (acción principal), P/Esc (pausa), 1-2-3 (modo); celular: cruceta, deslizar, botón ❚❚.

## Estilo visual
- Paleta en variables CSS en `src/styles.css` (`--accent`, `--bg`...). El canvas repite los colores en `COLORS` (no entiende `var()`).
- Fuente "Press Start 2P" (Google Fonts) para título y números.
- Canvas escalado por `devicePixelRatio` (máx 3) para verse nítido.
- Animaciones: `animate.enter`/`animate.leave` en las pantallas, `[class.shake]` en Game Over; respeta `prefers-reduced-motion`.

## Publicación
- `.github/workflows/deploy.yml`: cada push a `main` compila con `--base-href /mi-primer-juego/` y publica en GitHub Pages (fuente = "GitHub Actions", ya activado).
- Open Graph en `src/index.html` + `public/og-image.png` (1200x630, generada con Chrome headless desde un HTML).

## Cómo verificar visualmente sin navegador interactivo
Chrome headless no renderiza por debajo de ~500 px de ancho: para simular un celular, meter el juego en un `<iframe width="360">` y capturar con
`chrome.exe --headless=new --window-size=500,740 --screenshot=... --virtual-time-budget=6000`.
Servir `dist/snake-game/browser` con `python -m http.server 4321`. No combinar iframe + redirección (sale en blanco).

## Historial (un commit por fase)
1. `6e959d7` Proyecto creado y tablero vacío
2. `c3ec5bc` Serpiente con teclado
3. `bfe667c` Comida, crecimiento y puntaje
4. `79e190d` Colisiones, pantallas de inicio y Game Over
5. `ff4623a` Pausa, récord, niveles y controles táctiles
6. `0420a6a` Pulido visual
- `54d36c4` GitHub Pages · `abf7054` README · `3ca2593` Open Graph
- `c64e61b` Deslizar el dedo · `aec7b90` Modos + Sin paredes · `fef9434` Modo Obstáculos

## Conceptos de Angular ya enseñados
Componentes standalone, servicios e inyección (`inject`), `signal`/`computed`/`asReadonly`, `viewChild`, `afterNextRender`/`afterRenderEffect`, `host` (eventos de document), inputs (`input`, `input.required`), outputs (`output`, `$event`), `@if`/`@switch`/`@for` + `track`, `[class.x]`, `[attr.x]`, `[disabled]`, `:host`, encapsulación de estilos, variables CSS, `animate.enter/leave`, directivas (`@Directive`), zoneless.

## Ideas pendientes (si Darian quiere seguir)
- **Tabla de récords compartida** con Supabase (ya lo usó en `sitio-apuestas`): enseñaría `HttpClient` y comunicación con servidor.
- Descartado por ahora: obstáculos que aparecen por nivel.
- Posible: capturas en el README (`docs/captura.png`).
