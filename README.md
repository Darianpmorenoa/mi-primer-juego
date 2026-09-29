# 🐍 Snake en Angular

El clásico juego de la serpiente, hecho con **Angular 21** para aprender cómo se organiza una aplicación Angular: servicios, componentes, signals, inputs y outputs.

**▶ Jugar ahora:** https://darianpmorenoa.github.io/mi-primer-juego/

## Cómo jugar

Come la comida roja para crecer y sumar puntos. Elige un modo antes de empezar:

| Modo | Reglas |
|---|---|
| **Clásico** | Los bordes y tu propio cuerpo te eliminan. |
| **Sin paredes** | Atraviesas los bordes y apareces por el lado contrario. Solo te eliminas al chocar contigo. |
| **Obstáculos** | Como el clásico, pero con bloques grises que también te eliminan. |

| Acción | Teclado | Celular |
|---|---|---|
| Moverse | Flechas o <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | Deslizar el dedo sobre el tablero o usar la cruceta |
| Elegir modo | <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> | Botones de la pantalla de inicio |
| Empezar / jugar otra vez | <kbd>Enter</kbd> o <kbd>Espacio</kbd> | Botón **Jugar** |
| Pausar / continuar | <kbd>P</kbd>, <kbd>Esc</kbd> o <kbd>Espacio</kbd> | Botón **❚❚** |

- Cada comida vale **10 puntos** y hace que la serpiente vaya un poco más rápido.
- Cada **50 puntos** subes de nivel.
- Cada modo tiene su propio **récord**, guardado en tu navegador (se conserva al recargar).
- Si cambias de pestaña, la partida se pausa sola.

## 🏆 Tabla de récords compartida

Los 10 mejores puntajes de cada modo se guardan en una base de datos (**Supabase**) y los ve todo el mundo: botón **Récords** en la pantalla de inicio o de Game Over.

- Si tu puntaje entra al top 10, al perder puedes escribir tu nombre (se recuerda para la próxima vez).
- **Sin internet:** se muestra la última tabla guardada, y si guardas un récord queda en cola y se envía solo cuando vuelve la conexión.

## 📲 Instalarlo como app

El juego es una **PWA**: después de la primera visita abre **sin internet** y se puede instalar con su propio icono.

- **iPhone (Safari):** Compartir → *Añadir a pantalla de inicio*.
- **Android (Chrome):** menú ⋮ → *Instalar aplicación*.
- **PC (Chrome/Edge):** icono de instalar en la barra de direcciones.

Cuando se publica una versión nueva, aparece el aviso *"Hay una versión nueva del juego"* con el botón **Actualizar**. El número de versión se ve al pie de la página.

## Cómo está organizado

La idea principal: **la lógica vive en un servicio y los componentes solo muestran datos o avisan de lo que hace el jugador.**

```
src/app/
├── game/
│   ├── game.types.ts        Tipos: Position, Direction, GameStatus, GameMode
│   ├── game-modes.ts        Lista de modos (nombre y descripción)
│   ├── obstacles.ts         Mapa de obstáculos del modo Obstáculos
│   └── game.service.ts      GameService: TODAS las reglas del juego
├── leaderboard/
│   ├── leaderboard.service.ts  LeaderboardService: habla con Supabase (top 10, envíos, modo sin conexión)
│   ├── leaderboard.ts       Pantalla de Récords
│   └── supabase.config.ts   Dirección y clave pública de Supabase
├── update-banner/update-banner.ts  Aviso de versión nueva (service worker)
├── version.ts               Número de versión visible
├── board/board.ts           Dibuja el tablero en un <canvas>
├── scoreboard/scoreboard.ts Muestra puntos, récord y nivel
├── game-screen/game-screen.ts  Pantallas de inicio, pausa, Game Over y victoria
├── touch-controls/touch-controls.ts  Cruceta para celular
├── swipe/swipe.directive.ts  Directiva: detecta deslizamientos del dedo
└── app.ts / app.html        Componente raíz: junta las piezas y escucha el teclado
```

| Pieza | Responsabilidad | Cómo se comunica |
|---|---|---|
| `GameService` | Movimiento, colisiones, comida, puntaje, niveles, pausa, modos y récords | Expone *signals* de solo lectura y métodos (`start()`, `changeDirection()`...) |
| `LeaderboardService` | Pedir y enviar récords a Supabase, copia sin conexión y cola de pendientes | Signals + métodos (`load()`, `submit()`...) usando `HttpClient` |
| `LeaderboardComponent` | Mostrar el top 10 de cada modo | **Inputs** + **outputs** (`close`, `retry`, `modeChange`) |
| `BoardComponent` | Dibujar en el canvas | Inyecta el servicio y lee sus signals |
| `ScoreboardComponent` | Mostrar puntos, récord y nivel | Recibe datos por **inputs** |
| `GameScreenComponent` | Pantallas sobre el tablero y formulario del nombre | **Inputs** para los datos y **outputs** (`start`, `resume`, `submitScore`...) para avisar |
| `TouchControlsComponent` | Cruceta táctil | **Output** (`direction`) |
| `SwipeDirective` | Detectar deslizamientos sobre el tablero | **Output** (`swipe`) |
| `App` | Organizar la pantalla y traducir el teclado en órdenes | Conecta los componentes con el servicio |

## Conceptos de Angular que se usan

- **Componentes standalone:** cada pieza de la pantalla es una clase con `@Component` que importa lo que usa.
- **Servicios e inyección de dependencias:** `@Injectable({ providedIn: 'root' })` crea una única instancia compartida, que se pide con `inject()`.
- **Signals:** `signal()` guarda un valor que avisa cuando cambia; `computed()` calcula valores a partir de otros (el puntaje sale del largo de la serpiente y el nivel sale del puntaje).
- **Directivas:** `appSwipe` añade comportamiento (detectar deslizamientos) a un elemento existente, sin template propio.
- **Inputs y outputs:** los datos bajan del padre al hijo con `[input]` y los eventos suben del hijo al padre con `(output)`.
- **Control de flujo en templates:** `@if` y `@switch`.
- **Enlaces de clase y animaciones:** `[class.shake]`, `animate.enter` y `animate.leave`.
- **`afterRenderEffect()`:** vuelve a dibujar el canvas cuando cambian los signals que lee.
- **Zoneless:** la pantalla se actualiza porque cambian los signals, sin zone.js.
- **`HttpClient` y Observables:** `get()` y `post()` hablan con la API REST de Supabase; la respuesta llega al hacer `subscribe()`.
- **`effect()`:** recarga la tabla cuando se abre o cuando termina una partida.
- **Formularios simples:** variable de plantilla `#nameInput` y evento `(submit)`.
- **Pipes:** `| date` para mostrar la fecha de la tabla guardada.
- **Service worker (PWA):** `@angular/service-worker` guarda el juego para usarlo sin internet; `SwUpdate` + `toSignal()` avisan de versiones nuevas.

El juego se construyó en 6 fases, cada una en su propio commit. Puedes recorrerlas en el [historial de commits](https://github.com/Darianpmorenoa/mi-primer-juego/commits/main).

## Ejecutarlo en tu computador

Necesitas **Node.js** en una de estas versiones: 20.19 o superior dentro de la 20, 22.12 o superior dentro de la 22, o la 24 en adelante.

```bash
git clone https://github.com/Darianpmorenoa/mi-primer-juego.git
cd mi-primer-juego
npm install
npx ng serve
```

Abre http://localhost:4200. La página se recarga sola al guardar cambios.

> El archivo `.npmrc` activa `legacy-peer-deps` para evitar un error de npm 10.9 al instalar las dependencias de pruebas.

**Probarlo en el celular** (misma red WiFi): ejecuta `npx ng serve --host 0.0.0.0` y abre `http://<IP-de-tu-PC>:4200` en el celular. La IP la ves con `ipconfig` (Windows) o `ifconfig` (Mac/Linux).

## Base de datos

El esquema de la tabla está en [`supabase/schema.sql`](supabase/schema.sql). Las reglas **RLS** solo permiten leer y añadir récords (no modificarlos ni borrarlos), y las reglas `check` rechazan nombres vacíos y puntajes imposibles. La clave de `supabase.config.ts` es la *publishable key*: está hecha para ir en el navegador.

## Publicación

Cada `git push` a `main` ejecuta el workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), que compila el juego y lo publica en **GitHub Pages** automáticamente.
