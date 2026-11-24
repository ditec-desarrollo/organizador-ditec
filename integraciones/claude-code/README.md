# Commits de Claude Code → tareas del Organizador

Cada vez que Claude Code hace un `git commit` en cualquier proyecto, un hook le avisa al Organizador y este registra el trabajo en el tablero:

- crea una **tarea finalizada** en el proyecto al que pertenece el repositorio, a nombre de quien hizo el commit (el título es la primera línea del mensaje);
- si el mensaje dice **`tarea #12`**, en vez de crear una tarea anota el commit como novedad de la tarea 12 (y si estaba pendiente la pasa a "En progreso");
- si además lo dice con un verbo de cierre (**`finaliza tarea #12`**, `cierra la tarea #12`, `tarea #12 terminada`), la tarea 12 queda finalizada;
- los merges se ignoran.

```
Claude Code ──(git commit)──► hook en la máquina ──POST /integraciones/commits──► back del Organizador ──► tarea
                              commit-al-organizador.mjs        (X-Api-Key)
```

El hook solo se dispara con los commits que hace Claude Code. Un commit hecho a mano en la terminal o en VS Code no pasa por acá.

## Puesta en marcha

### 1. En el back (una sola vez)

1. Aplicar la migración: `npm run migrar` (crea `proyecto_repositorio`, `usuario_alias_git` y `commit_recibido`).
2. Generar una clave y ponerla en `back/.env` como `INTEGRACION_API_KEY`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Reiniciar el back. Sin esa variable la ruta responde `503` y no entra ningún commit.

### 2. En el Organizador (por proyecto y por persona)

- **Vincular los repositorios**: en cada proyecto, pestaña *Repositorios*, pegar la dirección de GitHub (`https://github.com/ditec-desarrollo/gaf-backend`). Un proyecto puede tener varios (back y front); un repositorio va a un solo proyecto. Si el repo no tiene remoto, se vincula el nombre de su carpeta.
- **Identificar a cada persona**: en *Usuarios → Editar*, cargar el nombre o el email con el que firma sus commits (`git config user.name` / `git config user.email`). Quien firma con su email de Ciudad Digital no necesita cargar nada.

No hace falta tener todo cargado de entrada: un commit de un repositorio o de un autor que todavía no se conoce queda **pendiente** (pantalla *Commits*, solo administradores, que dice qué falta) y se convierte en tarea solo en cuanto se carga lo que faltaba.

### 3. En cada máquina que usa Claude Code

Hace falta Node 18 o superior. Desde la raíz de este repo:

```bash
node integraciones/claude-code/instalar.mjs --url https://estadisticas.smt.gob.ar:5066
```

Pide la clave de integración (la del paso 1), copia el hook a `~/.claude/organizador/`, lo agrega a `~/.claude/settings.json` (deja una copia del archivo anterior al lado) y verifica que el back responda y acepte la clave. Claude Code lo toma al iniciar una sesión nueva.

Si la máquina firma los commits con un nombre compartido (por ejemplo `ditec-desarrollo`), se le indica de quién son con `--autor`, usando un alias que esté cargado en ese usuario:

```bash
node integraciones/claude-code/instalar.mjs --url https://estadisticas.smt.gob.ar:5066 --autor "nombre.apellido"
```

Para quitarlo: `node integraciones/claude-code/instalar.mjs --desinstalar`.

Cuando cambia `commit-al-organizador.mjs` hay que volver a correr el instalador en cada máquina (conserva la URL, la clave y el autor).

## Cómo saber si funcionó

| Dónde | Qué muestra |
|---|---|
| `~/.claude/organizador/hook.log` | Una línea por commit enviado, con lo que respondió el Organizador (`TAREA_CREADA`, `SIN_PROYECTO`…) o el error. |
| Pantalla *Commits* del Organizador | Todos los commits recibidos, su resultado y, en los pendientes, qué falta configurar. |
| `~/.claude/organizador/cola.json` | Commits que no se pudieron entregar (back caído, sin red). Se reenvían con el próximo commit. |

El hook corre en segundo plano y nunca interrumpe a Claude: si algo falla, queda en el log.

## Qué viaja al Organizador

Por cada commit: hash, dirección del remoto **sin usuario ni token**, nombre de la carpeta, rama, nombre y email del autor, fecha y mensaje. No se envía código ni el contenido de los archivos.

## Detalles

- **No se duplica.** El back identifica cada commit por su hash: reenviarlo no crea otra tarea. Un `git commit --amend` de un commit ya avisado tampoco se manda de nuevo.
- **Solo commits recientes.** Después de un comando con `git commit`, el hook manda los commits de los últimos minutos de ese repositorio. Si el commit falló (por ejemplo, no había nada para commitear), no manda nada.
- **Sesiones en la nube.** Claude Code en la web no lee `~/.claude/settings.json`, así que este hook no corre ahí. Para cubrirlas habría que poner el hook en el `.claude/settings.json` de cada repo o distribuirlo con la configuración administrada de la organización.
- **Toda la organización de una vez.** En un plan Team o Enterprise, un administrador puede publicar el mismo bloque `hooks` desde *Organization settings → Claude Code → Managed settings*, en lugar de editar el `settings.json` de cada máquina (cada persona tiene que aprobar el hook la primera vez). El script y `config.json` igual tienen que estar en cada una.

## Pruebas

```bash
node --test integraciones/claude-code/commit-al-organizador.test.mjs
```

Incluye una prueba de punta a punta con un repositorio y un servidor falsos en una carpeta temporal: no toca la configuración de la máquina ni llama al Organizador.
