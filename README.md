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
| `API_GATEWAY_TOKEN` | No | `access` (por defecto) o `id`, según el authorizer |
| `API_GATEWAY_KEY` | No | Clave del header `x-api-key`, si el gateway la exige |

Ninguna lleva el prefijo `NEXT_PUBLIC_`: se leen solo en el servidor y no llegan al
navegador. En Amplify Hosting se definen como variables de entorno de la app.

Mientras falten las de Cognito, el login responde con un aviso de «servicio no
configurado» y `/panel` redirige a `/login`; nada se rompe.

### Perfiles de prueba (solo `npm run dev`)

Para ver el panel sin Cognito, el login muestra en desarrollo un perfil de prueba de
Jefatura, que ve todas las secciones. Está en `src/lib/demo.ts` y funciona con la cookie
`f3_demo`. Todo el mecanismo está condicionado a
`NODE_ENV === "development"`: en `next build` / `next start` / Amplify los botones no se
renderizan y la cookie se ignora (verificado). Cerrar sesión también la borra.

### Requisitos en el User Pool

1. **Flujos del App Client**: habilitar `ALLOW_USER_PASSWORD_AUTH` y
   `ALLOW_REFRESH_TOKEN_AUTH`. El primero es el que permite enviar usuario y contraseña
   desde el servidor; sin él Cognito responde `InvalidParameterException`.
2. **Atributos personalizados** (opcionales pero recomendados), legibles por el App
   Client: `custom:codigo`, `custom:grado`, `custom:cargo`, `custom:seccion`. Alimentan
   la cabecera del panel. Si faltan, se usan valores neutros.
3. **Grupos** (RF-0002 / RF-0012): el rol se toma del grupo de Cognito del usuario.
   Nombres esperados: `Jefatura`, `Administracion`, `ServicioGeneral`, `Sanidad`,
   `Maquinas`, `Instruccion`, `SSO`, `Proyectos`, `Imagen` (se comparan sin tildes ni
   mayúsculas). Si el usuario no está en ningún
   grupo, se usa `custom:seccion` como respaldo; sin ninguno de los dos, el dashboard
   muestra "sin sección asignada".

## Estructura

```
src/
  app/
    layout.tsx                      layout raíz y estilos globales
    page.tsx                        redirige a /login
    login/                          pantalla de acceso (formulario, video de fondo, reloj)
      actions.ts                    Server Action de inicio de sesión
    panel/
      layout.tsx                    shell del panel (sidebar + contenido + tema)
      Sidebar.tsx                   navegación lateral, filtrada por rol
      TemaToggle.tsx                botón luna/sol
      actions.ts                    Server Action de cierre de sesión
      bandeja-documental/           listado, gráfico y detalle de documentos
        documentos/[id]/            detalle de un documento
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
    login-minimal/                  variante alternativa del login (no enrutada)
  middleware.ts                     renueva los tokens de Cognito antes de que venzan
  lib/
    tema.ts / tema-servidor.ts      tema visual: constantes y lectura de la cookie
    demo.ts                         perfiles de prueba por rol (inertes fuera de `next dev`)
    secciones.ts                    las 4 secciones del dashboard y el control por rol
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
| `/panel/bandeja-documental/documentos` | Listado de documentos |
| `/panel/bandeja-documental/documentos/[id]` | Detalle de documento |
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
