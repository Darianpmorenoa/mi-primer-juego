# Handoff: Snake en Angular

Contexto para retomar el proyecto en una sesión futura. Última actualización: 2026-09-28 (noche).

## Qué es
Juego Snake clásico hecho por Darian (principiante en Angular) **para aprender Angular**. El objetivo no es solo que el juego funcione, sino entender cómo se separan las responsabilidades.

- **Jugar:** https://darianpmorenoa.github.io/mi-primer-juego/ (versión visible al pie: `v1.5`)
- **Repo:** https://github.com/Darianpmorenoa/mi-primer-juego (público, rama `main`)
- **Estado:** juego completo + tabla de récords compartida (Supabase) + PWA instalable. Darian lo usa en **iPhone** (Safari, app instalada en pantalla de inicio).

## ⚠️ PENDIENTE al retomar: tabla de récords sin internet en iPhone
- **Síntoma:** en la app instalada en el iPhone, con modo avión, el juego abre y se puede jugar (el service worker funciona), pero **Récords** muestra error en vez de la copia guardada.
- **Lo que sí funciona:** en Chromium (Playwright), con la versión PUBLICADA y el service worker activo, la tabla offline sale bien con el aviso "Sin conexión · tabla guardada el…". El código está bien en Chrome.
- **Lo último que se hizo:** se publicó `v1.5` (número visible al pie) y un mensaje de error nuevo ("…aún no hay una copia guardada de este modo…") para distinguir versión vieja/nueva. Darian dijo "sigue sin verse" pero **no confirmó** si veía `v1.5` ni **qué texto exacto** salía.
- **Siguiente paso:** preguntarle (1) ¿ve `v1.5` al pie?, (2) ¿qué mensaje exacto sale?, (3) ¿abrió Récords CON internet dentro de la app instalada (no en Safari) antes del modo avión? Recordar: en iOS la app instalada tiene **almacenamiento separado** de Safari.
- **Hipótesis/ideas:** app sigue en versión vieja; copia nunca guardada en el almacenamiento de la app; algo de WebKit con el service worker (Angular SW responde 504 a peticiones fallidas no cacheadas; en Chrome eso cae al `error` y usa la copia). Alternativa robusta: añadir un `dataGroup` en `ngsw-config.json` para `GET .../rest/v1/scores` con estrategia `freshness`, o mostrar info de diagnóstico en pantalla. Playwright **no tiene WebKit instalado** (no instalarlo sin preguntar).

## Cómo trabajar con Darian
- Hablar en **español**, explicaciones para principiante.
- Trabajar **por fases** y **detenerse al final de cada una** para que pruebe (`npx ng serve` o el enlace publicado).
- Al terminar cada fase: explicar en **3–4 frases los conceptos de Angular** usados.
- Explicar **el porqué de cada decisión técnica** importante.
- Hacer **commit + push al terminar cada fase** (mensajes en español). El push publica automáticamente.
- Si una decisión es de Darian, preguntar con opciones.
- Para pasos en paneles web (Supabase, iPhone) ir **paso a paso**, con nombres exactos de botones; pedir captura si se atasca.
- Al publicar, **subir `APP_VERSION`** en `src/app/version.ts` (así se sabe qué versión tiene el celular).

## Stack y entorno (Windows)
- **Angular 21.2** (no 22): su Node es 22.18 y Angular 22 exige ≥ 22.22.3. Al añadir paquetes de Angular, fijar `@21` (ej. `ng add @angular/pwa@21`).
- Standalone components, **signals**, **zoneless** (sin zone.js). Sin router. Sin tests.
- `httpResource`/`resource` siguen **experimentales** en 21 → se usa `HttpClient` + Observables.
- `.npmrc` con `legacy-peer-deps=true`: npm 10.9 falla con "Cannot read properties of null (reading 'edgesOut')".
- Usar `npx ng ...` (no `ng` global).
- En **Git Bash**, `--base-href /mi-primer-juego/` se convierte en ruta de Windows: usar `MSYS_NO_PATHCONV=1`. En CI (Linux) no pasa.
- Los comandos con `!` del prompt corren en **bash**, no PowerShell.
- `gh` CLI instalado pero **sin login**; el push funciona con Git Credential Manager. Ver Actions: `https://api.github.com/repos/Darianpmorenoa/mi-primer-juego/actions/runs`.
- La carpeta está dentro del repo git de `C:\Darian`, pero tiene **su propio repo**. No tocar el repo padre.
- `angular.json`: Angular a veces añade `"analytics"` al hacer `ng serve`; Darian pidió **descartarlo** (`git restore angular.json`).
- Chrome de Darian: el **traductor de Chrome rompe el panel de Supabase** (error `removeChild`); ya lo desactivó para supabase.com.

## Supabase (tabla de récords)
- Proyecto **`snake`** (plan gratis, `ca-central-1`), aparte de `sitio-apuestas`. Plan gratis: máx. 2 proyectos activos; se **pausa** tras días sin actividad.
- URL y **publishable key** en `src/app/leaderboard/supabase.config.ts` (la clave es pública a propósito; la seguridad es RLS). **Nunca** usar la secret/service_role en el front.
- Esquema en `supabase/schema.sql`: tabla `scores(id, name, mode, score, created_at)`, `check` (nombre 1–12, modo válido, score > 0, múltiplo de 10, ≤ 3970), RLS con solo `select` e `insert` para `anon`. Borrar filas: SQL Editor del panel (como admin).
- API REST: `GET /rest/v1/scores?select=name,score&mode=eq.<modo>&order=score.desc,created_at.asc&limit=10`; `POST` con cabeceras `apikey` y `Prefer: return=minimal` (acepta un array para varias filas).
- Probar sin ensuciar la tabla: Playwright con `ctx.route('**/rest/v1/scores**', ...)` y `serviceWorkers: 'block'`.

## Arquitectura (la idea central)
**La lógica vive en los servicios; los componentes solo muestran datos o avisan eventos.**

| Archivo | Responsabilidad | Comunicación |
|---|---|---|
| `game/game.types.ts` | `Position`, `Direction`, `GameStatus`, `GameMode`, `GameResult`, `GameModeInfo` | — |
| `game/game-modes.ts` | Lista `GAME_MODES` (id, nombre, descripción) | — |
| `game/obstacles.ts` | Mapa fijo `OBSTACLES` (20x20) con helper `line()` | — |
| `game/game.service.ts` | TODAS las reglas: movimiento, colisiones, comida, puntaje, niveles, velocidad, pausa, modos, récord local, `lastResult` | Signals de solo lectura (`asReadonly`) + métodos |
| `leaderboard/leaderboard.service.ts` | Supabase: cargar top 10, `qualifies()`, enviar, copia offline, cola de pendientes, nombre del jugador | Signals + métodos (`load`, `submit`, `reconnect`, `resetSubmit`) |
| `leaderboard/leaderboard.ts` | Pantalla "Récords" (pestañas por modo, avisos offline/pendientes) | Inputs + outputs (`close`, `retry`, `modeChange`) |
| `leaderboard/supabase.config.ts` | URL y clave pública | — |
| `board/board.ts` | Dibuja en `<canvas>` con `afterRenderEffect` | Inyecta `GameService` |
| `scoreboard/scoreboard.ts` | Puntos, récord, nivel | Solo inputs |
| `game-screen/game-screen.ts` | Inicio/pausa/Game Over/victoria + selector de modo + botón Récords + formulario del nombre | Inputs (`scoreForm`, `playerName`...) + outputs (`start`, `resume`, `modeChange`, `showLeaderboard`, `submitScore`) |
| `touch-controls/touch-controls.ts` | Cruceta táctil (solo `pointer: coarse`) | Output `direction` |
| `swipe/swipe.directive.ts` | Directiva `appSwipe` | Output `swipe` |
| `update-banner/update-banner.ts` | Aviso "Hay una versión nueva" (`SwUpdate` + `toSignal`) | Inyecta `SwUpdate` |
| `version.ts` | `APP_VERSION` (se muestra al pie) | — |
| `app.ts` / `app.html` | Organiza la pantalla, teclado, pausa al cambiar de pestaña, `showLeaderboard`, `scoreForm`, evento `online` | Conecta hijos con los servicios |

### Decisiones clave
- **Una sola fuente de verdad:** `score` = `computed` del largo de la serpiente; `level` y `tickMs` salen de `score`; `highScore` de `_highScores[mode]`; `obstacles` de `mode`.
- **Orden de propiedades importa:** `_mode` y `obstacles` van ANTES de `_snake`/`_food`.
- `direction` + `nextDirection`: evita giros de 180°.
- Bucle con `setTimeout` encadenado (la velocidad cambia).
- Arrays/objetos **nuevos** al actualizar signals.
- `setMode()` se ignora en `playing`/`paused`; borra `isNewRecord` y `lastResult`.
- `lastResult` ({mode, score}) se fija en `endGame` si score > 0; se borra en `start()` y `setMode()`.
- `showLeaderboard` es estado de **pantalla** → vive en `App`, no en un servicio.
- `effect` en `App`: carga el top al abrir Récords o al terminar partida (over/won), y al cambiar de modo en esos momentos.
- `scoreForm` (`computed` en App) combina `lastResult` + `submitStatus` + `qualifies()`. Empate con el 10º no entra (gana el más antiguo).
- `App.startGame()` = `resetSubmit()` + `game.start()` (no llamar `game.start()` directo).
- `onKeydown` ignora teclas si el foco está en un `<input>`; con Récords abierto solo Escape y 1-2-3.
- Petición del top: se guarda la `Subscription` y se cancela la anterior (evita respuestas viejas).
- **Offline:** cada tabla recibida se guarda en `snake-leaderboard-<modo>` ({entries, savedAt}); si falla la carga se muestra con status `'offline'`. Si falla un envío por conexión (`status 0` o `>= 500`) va a la cola `snake-pending-scores` (status `'queued'`); errores 4xx no se reintentan. La cola se envía en un solo POST al arrancar el servicio y con `(window:online)` → `reconnect()`.
- `localStorage` siempre en `try/catch`. Claves: `snake-mode`, `snake-high-score-<modo>` (la antigua `snake-high-score` migra a `classic`), `snake-player-name`, `snake-leaderboard-<modo>`, `snake-pending-scores`.

### Reglas del juego
- Tablero 20x20. Serpiente inicial de 3 en el centro mirando a la derecha.
- 10 puntos por comida; nivel +1 cada 50 puntos (solo indicador).
- **Velocidad** (pedido de Darian): empieza en 200 ms y baja 4 ms **por comida**, mínimo 60 ms (a los 350 puntos). Constantes `START_TICK_MS` / `TICK_STEP_MS` / `MIN_TICK_MS`.
- Modos: **Clásico**, **Sin paredes** (`portal`), **Obstáculos** (mapa fijo desde el inicio).
- Controles: flechas/WASD, Enter/Espacio, P/Esc (pausa), 1-2-3 (modo); celular: cruceta, deslizar, botón ❚❚.
- Récords compartidos: al perder, si el puntaje entra al top 10 del modo, se pide nombre (máx. 12, se recuerda).

## PWA
- `@angular/pwa@21`: `ngsw-config.json` (grupos `app` prefetch, `assets` lazy, `fonts` lazy para Google Fonts), `public/manifest.webmanifest` (nombre "Snake", colores `#11111b`, `orientation: portrait`), `provideServiceWorker` solo si `!isDevMode()`.
- Iconos `public/icons/icon-*.png`: serpiente en "S" + comida, generados con canvas en Chrome headless (`--dump-dom` con `toDataURL`, porque no hay PIL). Diseño maskable (contenido en el 50% central).
- `index.html`: `<link rel="manifest">` + `apple-touch-icon`.
- El service worker sirve la copia guardada; la versión nueva llega en segundo plano → aviso "Actualizar". En iPhone la app instalada tiene **almacenamiento propio** (récord local, nombre y copia de la tabla separados de Safari) y necesita abrirse con internet una vez.
- Diagnóstico del SW: `https://darianpmorenoa.github.io/mi-primer-juego/ngsw/state`.

## Estilo visual
- Paleta en variables CSS en `src/styles.css` (`--accent`, `--gold`, `--bg`...). El canvas repite colores en `COLORS`.
- Fuente "Press Start 2P" (Google Fonts) para título y números.
- Canvas escalado por `devicePixelRatio` (máx 3).
- Animaciones `animate.enter`/`animate.leave` (clases `screen-enter`/`screen-leave`), `[class.shake]`; respeta `prefers-reduced-motion`.
- Listas con scroll dentro de un flex: centrar con `margin: auto` en hijos, no `justify-content: center` (corta el inicio).

## Publicación
- `.github/workflows/deploy.yml`: cada push a `main` compila con `--base-href /mi-primer-juego/` y publica en GitHub Pages.
- Open Graph en `src/index.html` + `public/og-image.png`.

## Cómo verificar
- **Playwright** (`playwright-cli`, global) es lo más útil: `run-code --filename=script.js` con `browser().newContext(...)`, `ctx.setOffline(true)`, `ctx.route(...)`. Tras activar el SW, **esperar ~10 s** antes de probar offline (si no, `ERR_FAILED`).
- Servir la compilación en su subruta: copiar `dist/snake-game/browser` a `dist/site/mi-primer-juego/` y `python -m http.server 4321` desde `dist/site`. Cerrar el servidor por PID del puerto (no matar todos los `python.exe`).
- Compilaciones de prueba con datos falsos: modificar temporalmente, `ng build --output-path dist/preview`, y **restaurar** el archivo.
- No borrar una carpeta mientras es el directorio de trabajo (el `rm -rf` queda bloqueado).
- Chrome headless (alternativa): no renderiza < ~500 px de ancho → usar `<iframe width="360">`.

## Historial (un commit por fase)
1. `6e959d7` Proyecto creado · 2. `c3ec5bc` Serpiente · 3. `bfe667c` Comida y puntaje · 4. `79e190d` Colisiones y pantallas · 5. `ff4623a` Pausa, récord, niveles, táctil · 6. `0420a6a` Pulido visual
- `54d36c4` GitHub Pages · `abf7054` README · `3ca2593` Open Graph · `c64e61b` Deslizar · `aec7b90` Modos + Sin paredes · `fef9434` Obstáculos · `9f00827` Handoff
- **Sesión 2026-09-28 (récords compartidos + offline):** `8d57cf0` Esquema Supabase · `5bdba6a` Leer top 10 · `7313c68` Enviar récord · `6568fb8` PWA · `0c22d55` Velocidad por comida · `aa87f5c` Récords sin conexión · `7f809ef` Versión visible (v1.5)

## Conceptos de Angular ya enseñados
Componentes standalone, servicios e inyección (`inject`), `signal`/`computed`/`asReadonly`/`effect`, `viewChild`, `afterNextRender`/`afterRenderEffect`, `host` (eventos de `document` y `window`), inputs, outputs, `@if`/`@else if`/`@switch`/`@default`/`@for` + `track`/`$index`, `[class.x]`, `[attr.x]`, `[disabled]`, `[value]`, `:host`, encapsulación de estilos, variables CSS, `animate.enter/leave`, directivas, zoneless, **`HttpClient` (`get`/`post`, `provideHttpClient(withFetch())`), Observables y `subscribe`/`unsubscribe`, `HttpErrorResponse`, variables de plantilla (`#ref`), formularios con `(submit)` + `preventDefault`, pipes (`DatePipe`), service worker / PWA, `SwUpdate`, `toSignal`, operadores `filter`/`map`**.

## Ideas pendientes
- **Resolver la tabla offline en iPhone** (ver arriba).
- Actualizar capturas del README (`docs/captura.png`).
- Descartado por ahora: obstáculos que aparecen por nivel.
- Posible: borrar la tabla de récords para empezar de cero (los primeros récords se hicieron con la velocidad anterior).
