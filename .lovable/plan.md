# Actualizar iconos PWA con el logo VinkedIn subido

Usar la imagen subida (`user-uploads://image.png` — logo "V/M" con gradiente verde-cian-azul sobre fondo blanco) como icono oficial de la PWA, sustituyendo los iconos generados anteriormente.

## Cambios

1. **`public/icon-512.png`** — Redimensionar el logo subido a 512×512 sobre fondo blanco (any purpose).
2. **`public/icon-192.png`** — Versión 192×192 del mismo.
3. **`public/icon-maskable-512.png`** — 512×512 con el logo centrado dentro de la safe zone (~80% central) y padding blanco alrededor, para que Android no recorte partes al aplicar máscara.
4. **`public/apple-touch-icon.png`** — 180×180 con esquinas rellenas (iOS aplica su propio redondeo).

No se toca `manifest.webmanifest` ni `index.html` (los paths de icono ya apuntan a estos archivos). No se toca lógica de negocio, auth ni backend.

## Detalles técnicos

- Copiar `/mnt/user-uploads/image.png` a `/tmp/` y usar Python/Pillow para generar las 4 variantes.
- Para el maskable, componer el logo escalado al ~80% sobre un lienzo blanco de 512×512 centrado.
- Sobrescribir los PNGs existentes en `public/`.

## Validación

- Verificar dimensiones de los 4 PNGs.
- Confirmar que `manifest.webmanifest` sigue resolviendo los mismos paths.
- Recordar al usuario que iOS/Android cachean iconos: puede requerir reinstalar la app para ver el cambio.
