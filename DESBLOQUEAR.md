# Desbloquear la sesión para implementar A0

La sesión de OpenCode vive en este repo (la app) y su guard bloquea `..\boton-de-seguridad-api`.
En vez de editar la regla, el guard ahora autoriza el repo hermano solo si existe la variable de
entorno `GUARD_HERMANO_AUTORIZADO`, y OpenCode hereda el entorno de la terminal.

## Paso 1 · Abrir OpenCode con la variable (Git Bash)

```bash
cd /c/Users/LUIS/boton-de-seguridad-app
GUARD_HERMANO_AUTORIZADO=boton-de-seguridad-api opencode
```

En PowerShell:

```powershell
cd C:\Users\LUIS\boton-de-seguridad-app
$env:GUARD_HERMANO_AUTORIZADO="boton-de-seguridad-api"; opencode
```

## Paso 2 · Escribir

**"sigue con A0"**. La spec aprobada está en `docs/specs-a0-borrador.md` (P1–P4 aceptadas) y se copiará
a `boton-de-seguridad-api/docs/specs/a0-base.md`.

## Al terminar · cerrar la excepción

Basta con cerrar esa sesión de OpenCode y volver a abrirlo **sin** la variable. La variable no se
guarda en ningún archivo: no hay nada que revertir.

Comprobación de que vuelve a estar cerrado:

```bash
npm run check
```

Las 14 pruebas de `ia/` incluyen el caso de la carpeta hermana bloqueada.

## Alternativa sin variables

```bash
cd /c/Users/LUIS/boton-de-seguridad-api
opencode
```

y pedir A0 allí, indicando la spec: `C:\Users\LUIS\boton-de-seguridad-app\docs\specs-a0-borrador.md`.
