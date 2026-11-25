# Guía para Claude: instalar el aviso de commits al Organizador en esta máquina

Esta guía está escrita para vos, Claude Code. La persona que te la pasó es un integrante de DITEC y quiere que los commits que vos hagas en su máquina se registren solos como tareas en el Organizador (el tablero de trabajo del equipo). Tu trabajo es dejarlo instalado, comprobar que funciona y explicarle cómo se usa.

Cómo se pide: la persona abre Claude Code en la carpeta de este repositorio y escribe algo como *"Leé `integraciones/claude-code/GUIA-PARA-CLAUDE.md` y seguila"*.

## Qué vas a dejar funcionando

Después de cada comando de consola que ejecutás, Claude Code corre un hook (`commit-al-organizador.mjs`). Si el comando fue un `git commit`, el hook le manda el commit al back del Organizador, y el back crea o actualiza una tarea:

| El mensaje del commit… | Qué pasa en el Organizador |
|---|---|
| no nombra ninguna tarea | Se crea una tarea **finalizada** en el proyecto del repositorio, a nombre de quien hizo el commit. El título es la primera línea del mensaje. |
| dice `tarea #12` | No se crea nada: el commit queda como novedad de la tarea 12 (y si estaba pendiente pasa a "En progreso"). |
| dice `finaliza tarea #12` (o `cierra la tarea #12`, `tarea #12 terminada`…) | Además de la novedad, la tarea 12 queda finalizada. |
| es un merge | Se ignora. |

Dos cosas las decide el back con datos que alguien cargó antes en el Organizador:

- **A qué proyecto va:** por la dirección del remoto del repositorio (`git remote get-url origin`), que tiene que estar vinculada en la pestaña *Repositorios* de ese proyecto.
- **De quién es:** por el nombre o el email con el que firma git, o por un alias fijo de la máquina (`--autor`), que tiene que estar cargado en *Usuarios → Editar* de esa persona. Eso lo carga un administrador.

Si falta alguno de los dos, el commit no se pierde: queda pendiente en el Organizador y se convierte en tarea cuando se carga lo que faltaba.

## Reglas que tenés que respetar

- **Nunca pidas, muestres ni escribas la clave de integración.** No la pidas por chat, no la imprimas, no la pongas en un comando ni en un archivo del repo. La tipea la persona en su propia terminal cuando el instalador se la pide.
- **No edites `~/.claude/settings.json` a mano.** Lo modifica el instalador, que además deja una copia del archivo anterior.
- **No toques el back ni la base de datos.** Esta guía es solo para la máquina de la persona. Si el servidor no está listo (ver paso 2), frená y avisá.
- **No hagas commits de prueba sin permiso.** El commit de prueba del paso 6 es un commit real: pedí confirmación y usá un cambio que la persona realmente quiera commitear.
- **Informá lo que pasó de verdad.** Si un paso falla o no lo pudiste comprobar, decilo con el mensaje de error.

## Paso 1: comprobar lo que hace falta en la máquina

Corré y revisá:

```bash
node --version
git --version
git config --global user.name
git config --global user.email
```

- Node tiene que ser 18 o superior. Si no, frená: hay que actualizarlo.
- Anotá el nombre y el email de git: los vas a necesitar en el paso 3.

Confirmá también que estás en la raíz de este repositorio y que existen `integraciones/claude-code/instalar.mjs` y `integraciones/claude-code/commit-al-organizador.mjs`. Si faltan, la persona tiene que actualizar el repo (`git pull`) en una rama que los tenga.

## Paso 2: comprobar que el back está listo

Preguntale a la persona a qué back hay que avisar. Si no sabe, es el de producción: `https://estadisticas.smt.gob.ar:5066`.

Comprobá, sin usar la clave, que ese back tiene la integración publicada y encendida:

```bash
node -e "const u=process.argv[1];fetch(u+'/integraciones/commits',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>console.log('HTTP',r.status)).catch(e=>console.log('sin conexion:',e.cause?.code??e.message))" https://estadisticas.smt.gob.ar:5066
```

| Respuesta | Significa | Qué hacés |
|---|---|---|
| `HTTP 401` | Está publicada y pide la clave. | Seguí con el paso 3. |
| `HTTP 404` | Ese back todavía no tiene la integración. | Frená. Hay que publicar la versión nueva del back y aplicar la migración; eso lo hace quien administra el Organizador. |
| `HTTP 503` | Está publicada pero sin clave configurada. | Frená. Falta `INTEGRACION_API_KEY` en el `.env` del back. |
| `sin conexion: UNABLE_TO_VERIFY_LEAF_SIGNATURE` | El back entrega su certificado sin la cadena intermedia. Un navegador lo tolera; Node, que es lo que usa el hook, no. | Frená. Lo arregla quien administra el servidor: `HTTPS_CERT` del `.env` del back tiene que apuntar al certificado con la cadena completa (*fullchain*). **Nunca** lo resuelvas desactivando la validación de certificados. |
| `sin conexion` (otro motivo) | No se llega al back desde esta máquina. | Revisá la dirección y la red con la persona. |

## Paso 3: decidir cómo se identifica a la persona

Mirá el nombre y el email de git del paso 1 y preguntale a la persona:

1. **¿Esa identidad de git es solo suya?** Si es un nombre compartido por el equipo (por ejemplo `ditec-desarrollo`), todos los commits firmados así irían a parar a un solo usuario del Organizador. En ese caso hay que instalar con `--autor` y un alias propio, por ejemplo `nombre.apellido`.
2. **¿Usa esta máquina alguien más con el mismo usuario de Windows?** Si es así, avisale que el hook no puede distinguir quién hizo cada commit: todos se atribuirían al mismo alias. No hay solución dentro de esta guía; que lo consulte con quien administra el Organizador.

Con eso definís uno de estos dos casos:

- **Identidad propia:** se instala sin `--autor`. Lo que hay que cargar en el Organizador es su nombre o su email de git. Si firma con el mismo email que tiene en Ciudad Digital, no hace falta cargar nada.
- **Identidad compartida:** se instala con `--autor "alias"`. Lo que hay que cargar en el Organizador es ese alias.

Decile a la persona exactamente qué texto tiene que pedirle a un administrador que cargue en *Usuarios → Editar → Identidades de git* de su usuario. Puede hacerse antes o después de instalar.

## Paso 4: instalar

El instalador pide la clave por teclado, así que **lo corre la persona en su terminal, no vos**. Pasale el comando armado con los datos de los pasos 2 y 3, desde la raíz de este repo.

Identidad propia:

```powershell
node integraciones/claude-code/instalar.mjs --url https://estadisticas.smt.gob.ar:5066
```

Identidad compartida:

```powershell
node integraciones/claude-code/instalar.mjs --url https://estadisticas.smt.gob.ar:5066 --autor "nombre.apellido"
```

Explicale qué va a pasar: le pide la clave de integración (se la da quien administra el Organizador), copia el hook a `~/.claude/organizador/`, lo agrega a `~/.claude/settings.json` dejando una copia del archivo anterior, y verifica que el back acepte la clave. Pedile que te avise cuando termine y qué mensaje mostró.

| Mensaje del instalador | Qué hacés |
|---|---|
| `Listo: … responde y aceptó la clave.` | Seguí con el paso 5. |
| `El back rechazó la clave` | La clave no es la de ese back. Que la vuelva a pedir y corra de nuevo el instalador definiendo antes la variable de entorno `ORGANIZADOR_API_KEY` en su terminal (el instalador reutiliza la clave guardada si no se le pasa otra). |
| `No se pudo conectar` | El hook quedó instalado y va a encolar los commits, pero hay que resolver la conexión. Volvé al paso 2. |

## Paso 5: comprobar la instalación

Verificá vos, sin mostrar la clave:

```bash
node -e "const c=require(require('os').homedir()+'/.claude/organizador/config.json');console.log({url:c.url,autor:c.autor||'(firma de git)',clave:c.apiKey?c.apiKey.length+' caracteres':'FALTA'})"
node -e "const s=require(require('os').homedir()+'/.claude/settings.json');console.log(JSON.stringify(s.hooks?.PostToolUse??'SIN HOOK',null,2))"
```

Tiene que verse la dirección correcta, el autor esperado, una clave de 32 caracteres o más, y una entrada con `"matcher": "Bash|PowerShell"` cuyo comando termina en `commit-al-organizador.mjs`.

Después comprobá que el hook ignora lo que no es un commit (no tiene que escribir nada ni fallar):

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"git status"},"cwd":"."}' | node "$HOME/.claude/organizador/commit-al-organizador.mjs"; echo "codigo de salida: $?"
```

## Paso 6: prueba con un commit real

1. Elegí con la persona un repositorio en el que tenga un cambio listo para commitear. Mostrale la dirección que tiene que estar vinculada a un proyecto del Organizador:

   ```bash
   git remote get-url origin
   ```

   Si el repo no tiene remoto, lo que se vincula es el nombre de su carpeta. Vincular lo hace quien gestiona el proyecto, en la pestaña *Repositorios*.
2. Con su confirmación, hacé el commit como siempre.
3. Leé la última línea del registro del hook:

   ```bash
   tail -n 3 "$HOME/.claude/organizador/hook.log"
   ```

| Lo que dice el registro | Significa | Qué le decís a la persona |
|---|---|---|
| `TAREA_CREADA: Se creó la tarea #N` | Funcionó. | Que la busque en la columna "Finalizada" del proyecto. |
| `TAREA_ACTUALIZADA` / `TAREA_FINALIZADA` | El mensaje nombraba una tarea y se actualizó. | Que mire el historial de esa tarea. |
| `SIN_PROYECTO` | El repositorio no está vinculado a ningún proyecto. | La dirección exacta que hay que vincular. El commit queda pendiente y se resuelve solo al vincularla. |
| `SIN_USUARIO` | El Organizador no sabe de quién es esa firma. | El alias exacto que un administrador tiene que cargar en su usuario. Se resuelve solo al cargarlo. |
| `PROYECTO_ARCHIVADO` | El proyecto del repositorio está archivado. | Que lo consulte con quien lo gestiona. |
| `HTTP 401` | La clave guardada no es la del back. | Reinstalar con la clave correcta (paso 4). |
| `sin conexión … queda en cola` | El back no respondió. | El commit se reenvía solo con el próximo commit. |
| No hay ninguna línea nueva | El hook no se disparó. | Que cierre y vuelva a abrir Claude Code: toma la configuración al iniciar la sesión. Si sigue igual, repetí el paso 5. |

## Paso 7: explicarle cómo se usa

Cerrá contándole esto, en pocas líneas:

- **No cambia la forma de trabajar.** Cuando termina algo, te pide "hacé el commit" y la tarea se registra sola.
- **Solo cuentan los commits que hacés vos.** Un commit hecho a mano en la terminal o en VS Code no se avisa.
- **Un commit por trabajo terminado.** Cada commit es una tarea en el tablero.
- **Para sumar a una tarea que ya existe**, que te diga el número: "hacé el commit y mencioná la tarea #45". El número está en la dirección del navegador al abrir la tarea (`?tarea=45`).
- **Para cerrarla con el commit**, que te lo pida: "hacé el commit y finalizá la tarea #45".
- **El push no influye:** la tarea se crea al commitear.
- **Dónde mirar si algo no aparece:** `~/.claude/organizador/hook.log` en su máquina.

## Cómo tenés que escribir los commits de ahora en más

Estas reglas valen para cualquier commit que hagas en una máquina con el hook instalado:

- **La primera línea es el título de la tarea.** Escribila como describirías el trabajo en el tablero: clara, en español y sin prefijos técnicos que nadie del equipo entienda.
- **Un número de tarea en el mensaje siempre se interpreta como referencia.** Escribí `tarea #45` solo si el commit es de verdad un avance de la tarea 45. Para dar un ejemplo en un mensaje, usá `tarea #N`.
- **Un verbo de cierre junto a la referencia finaliza la tarea.** Escribí `finaliza tarea #45`, `cierra la tarea #45` o `tarea #45 terminada` solo si la persona te pidió cerrarla o el trabajo quedó completo. "Lista para revisar" no la cierra.
- **No uses `--amend` para corregir un commit ya avisado** salvo que la persona lo pida: el hook no vuelve a mandarlo, así que la tarea conserva el mensaje original.
- **Los merges no generan tareas**, no hace falta hacer nada especial.

## Si hay que sacarlo o cambiarlo

- **Quitar el hook:** `node integraciones/claude-code/instalar.mjs --desinstalar`. La configuración y el registro quedan en `~/.claude/organizador/`.
- **Cambiar de back o de autor:** volver a correr el instalador con los valores nuevos (paso 4). Conserva lo que no se le pasa.
- **Actualizar el hook** cuando cambie `commit-al-organizador.mjs` en el repo: volver a correr el instalador, que copia la versión nueva.

Más detalle sobre qué viaja al Organizador y cómo funciona por dentro: [README.md](README.md).
