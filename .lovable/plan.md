# Rediseño de PostCard

## Objetivo
Reorganizar cada publicación en desktop para que la imagen tenga proporción cuadrada (1:1) y los comentarios se muestren en una columna a la derecha. En móvil se mantiene el diseño apilado actual, pero con la imagen también en 1:1.

## Cambios

### 1. `ImageCarousel.tsx`
- Cambiar `aspect-video` → `aspect-square` en los tres bloques (single image, multi image container).
- Mantener `object-cover` (cover inteligente centrado) para que la foto llene el cuadrado recortando lo mínimo.
- Sin barras/fondo blur — cover puro.

### 2. `PostCard.tsx` — nuevo layout responsivo
Estructura en desktop (`md:` breakpoint):

```text
┌─────────────────────────────────────────────┐
│ Header autor (ancho completo)               │
├───────────────────────┬─────────────────────┤
│                       │ Texto del post      │
│                       │ Link externo        │
│   Imagen 1:1          │ Barra de acciones   │
│   (carrusel)          │ ─────────────────── │
│                       │ Comentarios         │
│                       │ (siempre visibles   │
│                       │  o toggle)          │
└───────────────────────┴─────────────────────┘
```

- Wrapper interno: `md:grid md:grid-cols-2 md:gap-4`.
- Columna izquierda (desktop): solo el `ImageCarousel` cuadrado. Si el post no tiene media, la columna se colapsa y el contenido ocupa el ancho completo.
- Columna derecha (desktop): texto, external link, botones de acciones y `CommentsSection`.
- Los comentarios en desktop se muestran expandidos por defecto cuando hay media (aprovechando el espacio vertical del cuadrado); el botón de comentario sigue funcionando como toggle en móvil.

### 3. Móvil (sin cambios estructurales)
- Layout apilado tal como ahora: header → texto → imagen 1:1 → acciones → comentarios (toggle).
- Solo cambia la relación de aspecto de la imagen (video→square).

## Detalles técnicos
- Se usará `md:` (768px+) de Tailwind para el grid lateral.
- Cuando `displayPost.media_urls` esté vacío en desktop, renderizar sin grid (una sola columna) para no dejar hueco.
- Se conserva la lógica actual de reposts, favoritos, editar/eliminar y `showComments` state (el toggle se sigue usando en móvil; en desktop con media se fuerza `true` inicial).
- No se tocan hooks, tipos, ni backend.
- Los márgenes negativos actuales de la imagen en móvil (`-mx-4`) se mantienen solo bajo breakpoint móvil.

## Archivos modificados
- `src/components/posts/ImageCarousel.tsx`
- `src/components/posts/PostCard.tsx`

## Fuera de alcance
- Cambios en el feed, filtros o backend.
- Rediseño de la barra de acciones (íconos y estilos se mantienen).
- Modo lightbox / zoom de imágenes.
