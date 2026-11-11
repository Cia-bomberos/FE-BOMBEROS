# Compañía de Bomberos Voluntarios France N° 3 — Frontend

Panel institucional de la Compañía: acceso con Amazon Cognito, Bandeja Documental,
gestión de cuentas compartidas, configuración del respaldo en Google Drive y un tablero
de indicadores. Este repositorio contiene **solo el frontend**; los datos vienen de dos
microservicios detrás de API Gateway:

- **MS-SEGURIDAD-BOMBEROS** — User Pool de Cognito, cuentas (`/admin/cuentas`).
- **MS-BANDEJA-BOMBEROS** — documentos, PDF en S3 y configuración de Drive.

```
Navegador ──► Next.js (servidor) ──── login ────► Amazon Cognito
                    │                                   │
                    │◄────────── tokens (cookies httpOnly)
                    │
                    ├── Bearer ──► API Gateway seguridad ──► MS-SEGURIDAD
                    └── Bearer ──► API Gateway bandeja   ──► MS-BANDEJA ──► S3 (PDF)
```

El navegador nunca habla con Cognito ni con los gateways: todo pasa por Server Actions
y rutas del servidor de Next.js.

## Stack

- Next.js 16 (App Router, `output: "standalone"`) + React 19
- TypeScript
- CSS Modules (Tailwind 4 se importa en `globals.css`, pero las vistas no usan sus clases)
- `pdf-lib` para validar que los PDF sean legibles
- Vitest + Testing Library (unitarias) y Playwright (E2E)

## Comandos

```bash
npm install
npm run dev            # http://localhost:3000
npm run build
npm run lint
npm run typecheck      # tsc --noEmit
npm test               # Vitest con cobertura
npm run test:e2e       # Playwright contra PLAYWRIGHT_BASE_URL (por defecto, QA)
npm run test:e2e:ui
```

## Configuración

Las URLs y los IDs de AWS se leen de **dos archivos JSON publicados en S3**, según
`STAGE` (`dev` por defecto):

| Archivo | Lo publica | Trae | Si no se puede leer |
|---|---|---|---|
| `https://bomberos-config-{STAGE}.s3.amazonaws.com/config.json` | MS-SEGURIDAD | `userPoolId`, `clientId`, `apiUrl` (gateway de seguridad) | Usa las variables de entorno de abajo |
| `https://bomberos-f3-bandeja-cfg-{STAGE}.s3.amazonaws.com/bandeja-config.json` | MS-BANDEJA | `apiUrl` (gateway de la bandeja) | La bandeja muestra el error; **no hay** variable de respaldo |

Lógica en `src/lib/config-remote.ts`. Variables de entorno (en `.env.local` para
desarrollo; ninguna lleva `NEXT_PUBLIC_`, todas se leen solo en el servidor):

| Variable | Uso |
|---|---|
| `STAGE` | `dev`, `qa`, `uat`…; elige los JSON de S3 |
| `COGNITO_REGION` | Respaldo si falla `config.json` |
| `COGNITO_USER_POOL_ID` | Respaldo si falla `config.json` |
| `COGNITO_CLIENT_ID` | Respaldo si falla `config.json` |
| `COGNITO_CLIENT_SECRET` | Solo si el App Client tiene secreto |
| `API_GATEWAY_URL` | Respaldo del gateway de seguridad |
| `API_GATEWAY_TOKEN` | Token que viaja en el Bearer: `id` (authorizer de User Pools en REST API) o `access` |
| `API_GATEWAY_KEY` | Header `x-api-key`, si el gateway lo exige |

## Roles

Los roles son los **cinco grupos** del User Pool (`src/lib/roles.ts`). Las cuentas son
fijas y compartidas por sección (RN-0042); no hay registro de usuarios. El login es por
**username**. El rol se toma solo de `cognito:groups` del ID token verificado.

| Grupo | Username | Puede |
|---|---|---|
| `Jefatura` | `jefatura` | Consultar toda la bandeja **en solo lectura**; administrar las cuentas de sección; ver el dashboard completo |
| `Jefe_Administracion` | `administracion` | Ver y gestionar toda la bandeja; eliminar registros Archivados (RN-0028); configurar el respaldo en Drive |
| `Jefe_ServicioGeneral` | `serviciogeneral` | Su sección |
| `Jefe_Maquinas` | `maquinas` | Su sección |
| `Jefe_Sanidad` | `sanidad` | Su sección |

Reglas de la bandeja en `src/lib/permisos-documentos.ts`. La sección que registró o derivó
un documento lo sigue viendo en solo lectura (RN-0021, campo `solo_lectura` del backend).
Cada Server Action vuelve a comprobar sesión y permisos (RNF-0004), y el backend también.

## Rutas

| Ruta | Contenido | Quién |
|---|---|---|
| `/login` | Acceso y cambio de contraseña temporal | Todos |
| `/panel` | Redirige al resumen | — |
| `/panel/bandeja-documental` | Resumen: cifras, documentos por mes, distribución por tipo, recientes | Todos |
| `/panel/bandeja-documental/documentos` | Listado con filtros y búsqueda (`?seccion=`) | Todos |
| `/panel/bandeja-documental/registrar` | Registro de un documento con PDF | Jefes de sección |
| `/panel/bandeja-documental/documentos/[id]` | Detalle, visor del PDF, trazabilidad y gestión | Según permisos |
| `/panel/bandeja-documental/documentos/[id]/ver` | PDF en línea (para el visor) | Según permisos |
| `/panel/bandeja-documental/documentos/[id]/descargar` | Descarga del PDF | Según permisos |
| `/panel/cuentas` | Cambio de contraseña y de username de las cuentas de sección | Jefatura |
| `/panel/configuracion/drive` | Carpeta de Google Drive para el respaldo | Administración (lo valida el backend) |
| `/panel/dashboard` | Indicadores por sección y periodo | Jefatura / su sección |
| `/panel/dashboard/administracion` | Indicadores documentales de Administración | Jefatura, Administración |
| `/panel/*` inexistente | 404 dentro del panel (`[...resto]`) | — |

La barra superior muestra **Resumen**, **Documentos** (con menú por sección para Jefatura
y Administración), **Cuentas** (Jefatura) y **Respaldo** (Administración). El dashboard
**no está enlazado** en la navegación: se entra por URL.

## Autenticación y sesión

1. `solicitarAcceso` (Server Action) envía usuario y contraseña a Cognito con
   `InitiateAuth` / `USER_PASSWORD_AUTH`, por la API REST y sin SDK (`src/lib/cognito.ts`).
2. Si Cognito responde `NEW_PASSWORD_REQUIRED`, el formulario pide la contraseña
   definitiva y la envía con `RespondToAuthChallenge`. La sesión del reto vive en una
   cookie httpOnly de 5 minutos.
3. Los tres tokens se guardan en cookies **httpOnly** (`src/lib/sesion.ts`).
4. Cada render verifica la firma del ID token contra el JWKS del pool (`src/lib/jwt.ts`,
   JWKS en caché).
5. `src/proxy.ts` (el middleware de Next 16) renueva los tokens cuando les quedan menos de
   dos minutos, controla la inactividad y añade la Content-Security-Policy.
6. Cerrar sesión borra las cookies y llama a `GlobalSignOut`.

**Inactividad.** Tras 5 minutos sin actividad la sesión se cierra, con aviso durante el
último minuto (`src/lib/inactividad.ts`). En el navegador lo vigila
`VigilanteInactividad.tsx`, que se sincroniza entre pestañas y avisa al servidor por
`/panel/actividad`. Como respaldo, el proxy compara una cookie de última actividad y
redirige al login si ya pasó el límite.

MFA y otros retos de Cognito no están cubiertos; el login lo informa con un mensaje.

## Bandeja Documental

Toda la bandeja consume el gateway de MS-BANDEJA (`src/lib/documentos-repo.ts`), que
traduce entre el contrato del backend (snake_case, `ServicioGeneral`, ISO) y el modelo
de las vistas. Si el backend rechaza una operación, su mensaje se muestra tal cual.

| Operación | Regla |
|---|---|
| Registrar | Tipo (Oficio, Nota Informativa, Informe, Memorando, Carta, Solicitud, Acta), asunto, plazo y PDF obligatorio. Nace Pendiente. Prioridad por plazo (Alta < 10 días, Media ≤ 30, Baja > 30) o manual. La sección sale del token. |
| Derivar | Cambia la sección responsable con una nota; pasa a En proceso. |
| Marcar Atendido | Único cambio de estado manual (RN-0008, RN-0011). Archivado lo pone el sistema a los 3 días (RN-0026). |
| Prioridad / plazo | Ajuste manual (RN-0018, RF-0005). |
| Envío externo | Medio y destinatario; cierra la gestión como Atendido. |
| Reemplazar adjunto | Solo En proceso (RN-0010). |
| Eliminar | Solo Administración, solo Archivado, confirmando el respaldo en Drive (RN-0028). |

**PDF.** Hasta 20 MB (RNF-0006, se revisa en el navegador antes de enviar) y se valida
que sea un PDF legible con al menos una página, no por la extensión (RNF-0007,
`src/lib/validar-pdf.ts`). El archivo se sube directo a S3 con una URL pre-firmada
(`POST /documentos/upload-url`). Para verlo o descargarlo, el servidor pide una URL
pre-firmada y reenvía el PDF en streaming desde el mismo origen
(`documentos/[id]/responder-pdf.ts`); el bucket es privado y la CSP no deja salir a S3.
Ver el PDF no cuenta como descarga (RN-0027).

**Buscador global.** ⌘K / Ctrl+K abre una paleta que busca por número, asunto,
remitente, tipo o sección entre los documentos que el usuario puede ver
(`BuscadorGlobal.tsx`, criterio compartido con el listado en `src/lib/busqueda.ts`).

## Dashboard

`src/lib/kpis.ts` calcula hoy **tres indicadores documentales** a partir de la bandeja:
Documentos atendidos, Procesos administrativos pendientes y Tiempo promedio de respuesta.
Se filtran por periodo (`?periodo=yyyy-mm`); por ahora solo se ofrece el mes actual.

`src/lib/secciones.ts` define ocho secciones (Administración, Servicio General, Sanidad,
Máquinas, Instrucción, SSO, Proyectos, Imagen), pero solo **Administración** tiene página
propia. Las otras rutas `/panel/dashboard/{seccion}` responden 404.

## Temas

El oscuro es el predeterminado. El botón luna/sol guarda la preferencia en la cookie
`f3_tema` y el servidor la lee para pintar el tema correcto desde el primer render.
Los colores son variables al inicio de `src/app/panel/panel.module.css` (`.app` y
`.app[data-theme="light"]`). El escudo de la Compañía aparece como marca de agua
(`public/marca_agua.jpeg`), salvo en el 404.

El login tiene su propio tema claro/oscuro y una foto de fondo (`public/login-background.jpg`).

## Estructura

```
src/
  proxy.ts                      renovación de tokens, inactividad y CSP
  app/
    page.tsx                    redirige a /login
    not-found.tsx               404 fuera del panel
    login/                      pantalla de acceso y Server Action
    panel/
      layout.tsx                sesión, barra superior, buscador, pie, vigilante
      NavegacionSuperior.tsx    pestañas por rol
      BuscadorGlobal.tsx        paleta ⌘K
      VigilanteInactividad.tsx  cierre por inactividad (cliente)
      actividad/, inactividad/  rutas del vigilante
      NoEncontrada.tsx          contenido del 404
      bandeja-documental/       resumen, listado, registro, detalle y acciones
      cuentas/                  cuentas compartidas (Jefatura)
      configuracion/drive/      carpeta de respaldo (Administración)
      dashboard/                vista general y Administración
  components/ui/                desplegable, selector de fecha, selector de archivo, tema
  lib/                          clientes (Cognito, API, bandeja, cuentas, Drive), sesión,
                                permisos, plazos, KPIs, búsqueda y validación de PDF
  __test__/                     pruebas unitarias (Vitest)
tests_e2e/                      pruebas E2E (Playwright) y PDF de prueba
public/                         logos, insignias de sección, foto del login, marca de agua
```

## Despliegue y CI

- **Docker:** `Dockerfile` multi-etapa sobre `node:24-alpine`, con salida `standalone` y
  usuario no-root. Hay un `docker-compose.{dev,qa,uat}.yml` por ambiente.
- **Jenkins** (`Jenkinsfile`):
  - En todas las ramas: typecheck, pruebas con cobertura y build.
  - En `qa` y `uat`: SonarQube y Quality Gate.
  - En `qa`: build de la imagen con escaneo de Trivy, deploy, E2E con Playwright y
    OWASP ZAP (reglas en `zap/frontend-rules.conf`).
  - En `development`: deploy al ambiente de desarrollo.
