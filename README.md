# Compañía de Bomberos Voluntarios France N° 3 — Frontend

Interfaz del panel institucional de la Compañía: acceso, Bandeja Documental y dashboard
ejecutivo. Este repositorio contiene únicamente el frontend (desplegado en AWS Amplify).
La autenticación es real contra Amazon Cognito; los datos de las vistas siguen siendo de
demostración (`src/lib/datos-demo.ts`) hasta que se conecten sus respectivos servicios.

```
Usuario ──► AWS Amplify ──── Login ────► Amazon Cognito
                 ▲                            │
                 └──────── Auth Token ────────┘
                 │
                 └──── Invoca la API ───► API Gateway ──► verifica el token
                         (Bearer)                          contra Cognito
```

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS 4 + CSS Modules

## Comandos

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

## Configuración

Copie `.env.example` como `.env.local` y complete los valores:

```bash
cp .env.example .env.local
```

| Variable | Requerida | Descripción |
|---|---|---|
| `COGNITO_REGION` | Sí | Región del User Pool, p. ej. `us-east-1` |
| `COGNITO_USER_POOL_ID` | Sí | ID del User Pool |
| `COGNITO_CLIENT_ID` | Sí | ID del App Client |
| `COGNITO_CLIENT_SECRET` | Si aplica | Solo si el App Client se creó con secreto |
| `API_GATEWAY_URL` | Sí | URL base del gateway, sin barra final |
| `API_GATEWAY_TOKEN` | No | `id` para este backend (authorizer de User Pools en REST API); `access` para un authorizer JWT de HTTP API |
| `API_GATEWAY_KEY` | No | Clave del header `x-api-key`, si el gateway la exige |

Ninguna lleva el prefijo `NEXT_PUBLIC_`: se leen solo en el servidor y no llegan al
navegador. En Amplify Hosting se definen como variables de entorno de la app.

Mientras falten las de Cognito, el login responde con un aviso de «servicio no
configurado» y `/panel` redirige a `/login`; nada se rompe. No hay perfiles de prueba:
toda sesión del panel proviene de una cuenta real del User Pool.

### Roles y cuentas (User Pool del backend)

El User Pool lo despliega `backend/serverless.yml` y tiene **cinco grupos**, que son
los roles del sistema. Las cuentas son fijas y compartidas por sección (RN-0042); las
siembra `backend/scripts/seed_users.py` y no hay registro de usuarios desde la app.
El login es por **username**, no por correo.

| Grupo de Cognito | Username (`dev`) | Qué ve |
|---|---|---|
| `Jefatura` | `jefatura` | Todo: resumen ejecutivo, las 8 secciones del dashboard, toda la bandeja y el panel de cuentas |
| `Jefe_Administracion` | `administracion` | Administración; además lee toda la bandeja y elimina archivados (RN-0028) |
| `Jefe_ServicioGeneral` | `serviciogeneral` | Servicio General |
| `Jefe_Maquinas` | `maquinas` | Máquinas |
| `Jefe_Sanidad` | `sanidad` | Sanidad |

El catálogo está en `src/lib/roles.ts`; `src/lib/secciones.ts` enlaza cada sección con su
grupo. Las secciones de KPIs por periodo (Instrucción, SSO, Proyectos, Imagen) no tienen
grupo en el pool, así que solo las consulta la Jefatura. El rol se toma del claim
`cognito:groups` del ID token; el pool solo define el atributo `name`, por lo que el
cargo y la sección del encabezado se deducen del rol.

Requisitos que ya cumple el App Client del backend: `ALLOW_USER_PASSWORD_AUTH`,
`ALLOW_REFRESH_TOKEN_AUTH`, sin secreto, tokens de 15 min y refresh de 1 día (las cookies
de sesión duran lo mismo). El API Gateway usa un authorizer `COGNITO_USER_POOLS` sobre
REST API, que valida el **IdToken**: por eso `API_GATEWAY_TOKEN=id`.

## Estructura

```
src/
  app/
    layout.tsx                      layout raíz y estilos globales
    page.tsx                        redirige a /login
    login/                          pantalla de acceso (formulario, video de fondo, reloj)
      actions.ts                    Server Action de inicio de sesión
    panel/
      layout.tsx                    shell del panel (sidebar + header + contenido)
      AvisoPlazos.tsx               aviso de documentos vencidos / por vencer (Jefatura y Administración)
      RelojLima.tsx                 fecha y hora de Lima en el header
      Sidebar.tsx                   navegación lateral, filtrada por rol
      TemaToggle.tsx                botón luna/sol
      actions.ts                    Server Action de cierre de sesión
      bandeja-documental/           resumen, listado, registro y detalle de documentos
        acciones.ts                 Server Actions: registrar, derivar, estado, envío, adjunto, eliminar
        registrar/                  formulario de ingreso (RF-0003, RF-0004)
        documentos/[id]/            detalle: ficha, trazabilidad, gestión y eliminación
      cuentas/                      panel de Jefatura: contraseñas de las cuentas compartidas (RN-0042/43)
        acciones.ts                 Server Action: PATCH /admin/cuentas/{id}/password
      dashboard/                    tablero ejecutivo
        page.tsx                    vista general (Jefatura) o redirección a la sección
        acceso.ts                   guardas por rol (RF-0012)
        Kpis.tsx                    rejilla de indicadores con estado "fuente por definir"
        administracion/             KPIs desde la gestión documental (RN-0037)
        servicio-general/           KPIs desde el inventario de mobiliario y suministros
        sanidad/                    KPIs desde el inventario de insumos médicos
        maquinas/                   KPIs desde el inventario de unidades
        [seccion]/                  secciones de registro por periodo (Instrucción, SSO, Proyectos, Imagen)
  components/
    ui/desplegable.tsx              desplegable con el estilo del panel (sustituye al <select>)
    ui/toggle-theme.tsx             botón luna/sol con revelación circular
    login-minimal/                  variante alternativa del login (no enrutada)
  middleware.ts                     renueva los tokens de Cognito antes de que venzan
  lib/
    documentos-repo.ts              repositorio de documentos (memoria hoy; gateway después)
    permisos-documentos.ts          quién ve, gestiona, registra y elimina (RF-0002, RN-0028)
    plazos.ts                       vencidos y por vencer según el plazo de cada documento
    tema.ts / tema-servidor.ts      tema visual: constantes y lectura de la cookie
    roles.ts                        los 5 grupos de Cognito del backend y sus cuentas
    cuentas-api.ts                  cliente de /admin/cuentas (listar, cambiar contraseña, política)
    secciones.ts                    las secciones del dashboard y el control por rol
    kpis.ts                         catálogo de 15 KPIs (documento "KPIs") y su cálculo
    cognito.ts                      cliente REST del User Pool (login, reto, refresh)
    jwt.ts                          verificación de firma contra el JWKS del pool
    auth.ts                         orquesta el acceso y abre la sesión
    sesion.ts                       tokens en cookies httpOnly + perfil
    tipos.ts                        tipo `Bombero` y mapeo de los claims
    api.ts                          cliente del API Gateway (adjunta el Bearer)
    datos-demo.ts                   datos ficticios que alimentan las vistas del panel
    hora-lima.ts                    hook de hora local (America/Lima)

public/                             logos, video y póster del login
```

## Rutas

| Ruta | Contenido |
|---|---|
| `/login` | Acceso |
| `/panel` | Inicio del panel |
| `/panel/bandeja-documental` | Bandeja Documental |
| `/panel/bandeja-documental/documentos` | Listado de documentos (filtrado por rol) |
| `/panel/bandeja-documental/registrar` | Registro de un documento nuevo |
| `/panel/bandeja-documental/documentos/[id]` | Detalle, gestión y eliminación |
| `/panel/cuentas` | Cuentas de sección: cambio de contraseña de las 4 cuentas compartidas (solo Jefatura) |
| `/panel/dashboard` | Dashboard ejecutivo: vista general (Jefatura) |
| `/panel/dashboard/{administracion,servicio-general,sanidad,maquinas,instruccion,sso,proyectos,imagen}` | Secciones del dashboard, según rol |

## Autenticación

El frontend no guarda ni compara contraseñas, y **no** usa el API Gateway para el login:
habla con Cognito directamente, tal como en el diagrama. El flujo es:

1. El Server Action envía usuario y contraseña a Cognito (`InitiateAuth`,
   `USER_PASSWORD_AUTH`). Se llama a la API REST de Cognito por HTTP: no hace falta el
   SDK ni ninguna dependencia nueva.
2. Los tres tokens (ID, acceso, refresco) se guardan en cookies **httpOnly**: el
   JavaScript del navegador no puede leerlos, así que un XSS no los alcanza.
3. Cada render del panel verifica la **firma** del ID token contra el JWKS del User Pool
   (`src/lib/jwt.ts`) y deriva de sus claims el perfil del bombero. El JWKS se cachea:
   no hay una llamada a AWS por render.
4. Las peticiones al API Gateway llevan el token en `Authorization: Bearer …`; el
   authorizer lo valida de nuevo contra el mismo pool.
5. `src/middleware.ts` cambia el refresh token por un par nuevo cuando al actual le
   quedan menos de dos minutos, de modo que nadie queda fuera a mitad de guardia. Es el
   único punto del App Router donde se pueden escribir cookies antes del render.
6. Cerrar sesión borra las cookies y llama a `GlobalSignOut` para revocar el refresh
   token en Cognito.

**Primer ingreso.** Los usuarios que crea la Jefatura llegan con contraseña temporal y
Cognito devuelve el reto `NEW_PASSWORD_REQUIRED`. El formulario lo detecta y muestra la
pantalla de contraseña definitiva, que se envía con `RespondToAuthChallenge`. La sesión
intermedia del reto vive en una cookie httpOnly efímera (5 min), no en el cliente.

**No cubierto todavía:** MFA y los demás retos de Cognito. Si el pool los exige, el login
lo informa con un mensaje explícito en lugar de fallar en silencio.

## Bandeja documental

Cubre los casos de uso del diseño (§10.a) sobre un repositorio en memoria sembrado con
los datos demo (`src/lib/documentos-repo.ts`): las acciones mutan y las páginas leen de
ahí, así que la maqueta se comporta como el sistema real mientras dure el proceso.

| Caso de uso | Dónde | Regla |
|---|---|---|
| Consultar bandeja | resumen y listado | Cada rol ve su ámbito (RF-0002): Jefatura y Administración todo; los demás, su sección. Un documento ajeno responde 404. |
| Registrar documento + prioridad y plazo | `/registrar` | Nace Pendiente (RN-0007); prioridad por plazo — Alta < 10 días, Media ≤ 30, Baja > 30 — salvo asignación manual (RN-0013). Jefatura elige la sección; un Jefe de Sección registra para la suya. |
| Derivar a otra sección | detalle → Gestionar | Cambia la sección responsable; si estaba Pendiente pasa a En proceso. |
| Cambiar estado | detalle → Gestionar | Pendiente / En proceso / Atendido / Archivado. |
| Registrar envío externo | detalle → Gestionar | Fecha, hora, medio y destinatario; cierra la gestión como Atendido (RN-0021, RN-0022). |
| Actualizar archivo adjunto | detalle → Gestionar | Guarda nombre y tamaño; el binario sube a Drive con el gateway. |
| Eliminar registro archivado | detalle → Eliminar registro | Solo el Jefe de Administración, solo en Archivado, con confirmación explícita de respaldo en Drive (RN-0028). |

Toda modificación agrega una entrada al historial con fecha, hora y responsable (RN-0006);
la consulta no. Los permisos se comprueban en la interfaz **y** en cada Server Action
(RNF-0004); el backend debe repetirlos.

**Pendiente con el backend:** cada función del repositorio corresponde a un endpoint
(`GET/POST /documentos`, `POST /documentos/{id}/derivar`, …). Las páginas no cambian.

## Dashboard: gráficas y periodo

La vista general ("Consultar dashboard" ⟨include⟩ "Ver gráficas") trae cuatro gráficas
con datos que la plataforma ya registra (`src/app/panel/dashboard/Graficas.tsx`):

1. **Indicadores frente al periodo anterior** — barras de los KPIs porcentuales del periodo,
   con una marca del valor anterior y el delta. Una sola escala 0–100.
2. **Documentos por estado** — columnas de los ingresados en el periodo.
3. **Documentos abiertos por sección** — barras; cada una enlaza a su sección.
4. **Estado de la flota** — una franja por unidad y el conteo por estado.

Los colores de estado están validados para daltonismo y contraste en ambos temas
(`--graf-*`); la identidad nunca depende solo del color: todas las marcas llevan etiqueta.


El chip de periodo (RN-0035) navega con `?periodo=yyyy-mm`; se listan los periodos con
datos. Los KPIs documentales cuentan los documentos ingresados en ese mes; los de registro
toman el valor cargado para ese mes; los de inventario son una foto del estado actual y lo
indican.

## Temas (oscuro / claro)

El panel usa una sola paleta en dos temas: azul marino profundo, rojo de emergencia, azul
de apoyo, ámbar y verde de estado. El oscuro es el predeterminado; el botón luna/sol del
header cambia al claro y guarda la preferencia en la cookie `f3_tema` (un año), que el
servidor lee para pintar el tema correcto desde el primer render, sin parpadeo.

Los tokens viven al inicio de `src/app/panel/panel.module.css` (`.app` y
`.app[data-theme="light"]`). Ningún color del panel está escrito como literal fuera de ese
bloque: para retocar la paleta se cambian ahí y ambos temas se actualizan. Las
transparencias se derivan con `color-mix()`, así que también siguen al tema.

El login mantiene su estética propia (video oscuro) y no participa del cambio de tema.

## Dashboard ejecutivo y KPIs

Sigue el Documento de Análisis y Diseño (RN-0034 a RN-0037, RF-0012) y el catálogo de
15 KPIs de la Compañía (`src/lib/kpis.ts`, con descripción, fórmula, unidad y área).

**Ocho secciones.** Las cuatro del diseño más las cuatro que el propio catálogo nombra en
su columna "Sección relacionada". Es una ampliación deliberada de RN-0034 (que dice cuatro)
para que ningún KPI del catálogo quede sin dueño; queda aquí documentada.

| Sección | Fuente de sus KPIs | Grupo Cognito |
|---|---|---|
| Administración | Gestión documental (RN-0037) | `Administracion` |
| Servicio General | Inventario de mobiliario y suministros (RN-0036) | `ServicioGeneral` |
| Sanidad | Inventario de insumos médicos (RN-0036) | `Sanidad` |
| Máquinas | Inventario de unidades (RN-0036) | `Maquinas` |
| Instrucción y Entrenamiento | Registro por periodo | `Instruccion` |
| Seguridad y Salud Ocupacional | Registro por periodo | `SSO` |
| Proyectos y Relaciones Institucionales | Registro por periodo | `Proyectos` |
| Imagen de Compañía | Registro por periodo | `Imagen` |

La Jefatura ve la vista general con las ocho; un Jefe de Sección entra directo a la suya y no
puede abrir las demás (redirige al dashboard).

**Tres fuentes.** Cada KPI declara de dónde sale su valor:

- `inventario` / `documental` — la plataforma lo **calcula** de lo registrado en el
  inventario o la bandeja. Hoy: Disponibilidad de unidades, Unidades fuera de servicio,
  Documentos atendidos, Procesos pendientes.
- `registro` — el Jefe de Sección **carga** el valor del periodo (o se importa de Excel). Es
  la fuente de las cuatro secciones nuevas y de los tres KPIs que, aun teniendo sección,
  no se derivan de otros módulos (Tiempo de respuesta, Files del personal, Mantenimientos).
  El modelo es `RegistroKpi` (`kpi · periodo · valor · detalle · registradoPor · fecha`), en
  `src/lib/datos-demo.ts` con datos de ejemplo. Cada tarjeta muestra quién lo registró y
  cuándo; si el periodo no tiene dato, lo dice en lugar de omitirse.

**Pendiente con el backend:** el formulario de carga por sección y la importación desde
Excel. El frontend ya consume `RegistroKpi`; falta `GET/POST /indicadores` en el gateway.

## Puntos de integración pendientes

Los datos de las vistas siguen aislados en `src/lib/datos-demo.ts` (documentos e inventarios
de las tres secciones). Al conectar sus servicios se reemplaza ese archivo por consultas al
gateway y se ajusta `calcularKpi` en `src/lib/kpis.ts`; las páginas no cambian su render.
