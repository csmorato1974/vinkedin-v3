
# Recuperación de contraseña

Añadir flujo de "¿Olvidaste tu contraseña?" en la pantalla de login, usando el sistema de auth ya existente (Lovable Cloud). El usuario recibe un email con un enlace que lo lleva a una nueva página donde puede establecer una nueva contraseña.

## Flujo

```text
[Auth /auth]
   └─ link "¿Olvidaste tu contraseña?"
        └─ abre modal / vista con campo de email
             └─ envía email de recuperación
                  └─ usuario hace clic en el enlace del email
                       └─ [ResetPassword /reset-password]
                            └─ formulario nueva contraseña + confirmar
                                 └─ vuelve al feed autenticado
```

## Cambios

1. **`src/pages/Auth.tsx`**
   - Añadir enlace "¿Olvidaste tu contraseña?" debajo del campo de contraseña (solo visible en modo login).
   - Añadir un estado extra `mode: 'login' | 'signup' | 'forgot'` (o vista condicional) que muestra un formulario con un solo campo (email) y un botón "Enviar enlace de recuperación".
   - Al enviar: llamar a `supabase.auth.resetPasswordForEmail(email, { redirectTo: \`\${window.location.origin}/reset-password\` })`, mostrar toast de éxito y volver al login.

2. **`src/pages/ResetPassword.tsx` (nuevo)**
   - Página pública (no protegida) con el mismo estilo visual que `Auth.tsx` (video de fondo, tarjeta glass, logo).
   - Detecta que llega desde el enlace de recuperación (sesión temporal establecida por Supabase al abrir el link).
   - Formulario con dos campos: nueva contraseña + confirmar contraseña, validación con Zod (mínimo 6 caracteres, coincidencia).
   - Llama a `supabase.auth.updateUser({ password })`. En éxito: toast, y redirige a `/`.
   - Si no hay sesión de recuperación válida, muestra un mensaje "Enlace inválido o expirado" con botón para volver a `/auth`.

3. **`src/App.tsx`**
   - Registrar la ruta pública `/reset-password` apuntando al nuevo componente (fuera de `ProtectedRoute`).

## Detalles técnicos

- Idioma: todos los textos en español, coherente con el resto de la app.
- Validación con `zod`, ya usado en `Auth.tsx`.
- Toasts con `sonner`, igual que en el resto de la app.
- No se requieren cambios de backend (Supabase gestiona el email de recuperación con la plantilla por defecto).
- Nota al usuario: el email de recuperación se enviará con la plantilla por defecto de Lovable. Si quieren personalizar el diseño / dominio del email, sería un paso posterior (scaffold de plantillas de auth email + dominio propio).

## Fuera de alcance

- Personalización de la plantilla del email de recuperación.
- Configuración de dominio de envío propio.
- Cambio de flujo a OTP en vez de enlace mágico.
