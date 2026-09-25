# AGENTS.md — Asteroids

Clon del juego Asteroids en HTML5 Canvas con JavaScript vanilla. Sin dependencias, sin bundler, sin package manager.

## Estructura

- `index.html` — carga el canvas de 800×600 y `game.js`.
- `game.js` — toda la lógica del juego en un solo archivo.
- `favicon.svg` — ícono.

## Cómo ejecutar

```bash
npx serve .
```

Luego abre `http://localhost:3000`.

También funciona abriendo `index.html` directamente en el navegador, aunque algunos navegadores restringen APIs cuando se abre un archivo local.

## Convenciones del código

- Canvas fijo de 800×600 px; el espacio es toroidal (función `wrap` en ambos ejes).
- Estados del juego: `'playing' | 'dead' | 'gameover'`.
- Asteroides usan tamaños 1 (pequeño), 2 (mediano), 3 (grande). `RADII`, `SPEEDS` y `POINTS` están indexados por tamaño.
- La nave tiene 3 vidas e invencibilidad de reaparición con parpadeo (`ship.invincible` y la lógica de `Math.floor(...)` en `ship.draw`).
- Input: `keys` para estado continuo; `justPressed` / `pressed()` para eventos de un solo disparo (evita autofuego).

## Notas

- No hay tests, linter ni formateador configurados.
- El README menciona power-ups y una "estrella fugaz". Los power-ups "Velocidad", "Triple disparo" (tecla `T`) y "Escudo" (3 cargas que absorben impactos de asteroides, ver `SHIELD_MAX` y `ship.shield`), y la "estrella fugaz" ya están implementados en `game.js`. `PowerUp` es la clase base (rayo cian) con subclases `PowerUpTriple` y `PowerUpShield`.
- Sistema de skins de la nave ya implementado: constante `SKINS` (silueta + color + llama por skin), cambio en pleno juego con `S`/`Q` (`cycleSkin`, funciona en cualquier estado), persistencia en localStorage (clave `asteroids-skin`, con `try/catch`) e íconos de vida que usan la skin activa. La hitbox (`radius 12`) es igual para todas.
