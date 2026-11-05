# CONTEXTO DEL PROYECTO — SII Planner (Examen 3)

> **Para Claude:** este documento es la fuente de verdad del proyecto. Léelo completo antes de escribir código.
> Estás ayudando a **la Persona B**. La Persona A trabaja en paralelo con otro chat de Claude, usando este
> mismo documento. Respeta los contratos de la sección 6 y la sección 8: si algo necesita cambiar, avísale a tu usuario
> para que lo acuerde con A y actualicen este archivo **antes** de cambiar el código.
> Ambos integrantes usan **macOS** (MacBook).

Última actualización: 5 nov 2026, 16:00 — por A (rama `a/demanda-grupos`) · **Repo:** https://github.com/ricardo-rodriguezdesk/Examen3TOPW · **App:** https://examen3-topw.vercel.app · **API:** https://sii-planner-api.onrender.com

---

## 0A. NUEVO: Demanda de grupos para la coordinación (léelo primero, B)

**Idea:** el alumno **guarda** en el Generador el horario que planea cursar, y el panel de admin muestra **cuántos alumnos
planean cada grupo**, su ocupación contra el cupo y una **recomendación** por materia (abrir otro grupo, redistribuir,
demanda baja, sin demanda). Con esto el backend de administración deja de ser solo un catálogo: es una **herramienta de
decisión para la coordinación** (qué grupos abrir o ampliar). Usa este argumento en la propuesta escrita y en la exposición.

**Backend (A) — listo y probado** en la rama `a/demanda-grupos` (PR de A). Contrato en §7.2. Resumen:
- Tablas nuevas `planes_alumno` y `planes_alumno_grupos` (se crean solas al arrancar).
- **Privacidad:** no se guarda el número de control, solo un **hash HMAC**. La coordinación ve **conteos**, nunca quién eligió qué.
- Un horario por alumno y periodo; si vuelve a guardar, **se reemplaza**. Valida: grupos de la oferta vigente, de materias que
  el alumno **sí puede cursar**, un grupo por materia, **sin choques** y ≤ 36 créditos (si falla, `DATOS_INVALIDOS` con mensaje claro).
- **Demanda simulada:** al arrancar se generan **150 alumnos ficticios** (marcados `simulado`) para que la pantalla de admin
  tenga datos en la demo. Salen siempre iguales (semilla fija) y muestran todos los casos: grupos llenos, materias a las que
  les faltan lugares, una para redistribuir y varias con poca demanda. El admin puede **ocultarlos** (`simulados=false`),
  **regenerarlos** o **borrarlos**.

**Lo que le toca a B (frontend):**
1. **Generador** (`pages/planificador/Generador.tsx`): en cada opción, botón **"Guardar este horario"** →
   `useGuardarMiHorario().mutate(opcion.grupos.map((g) => g.id))`. Arriba (o en Avance), una tarjeta **"Mi horario para
   {periodoTexto}"** con `useMiHorario()`: si `guardado` existe, muéstralo con `HorarioGrid` + créditos + "Guardado el …" y
   botones **Cambiar** / **Quitar** (`useBorrarMiHorario()`). Texto de privacidad corto: *"Se guarda de forma anónima: la
   coordinación solo ve cuántos alumnos planean cada grupo."* Muestra `error.message` si el backend rechaza (choque, etc.).
2. **Admin → nueva página "Demanda"** (`pages/admin/Demanda.tsx`, ruta `/admin/demanda`, pestaña en `AdminLayout`) con `useDemanda()`:
   - Tarjetas de resumen: alumnos que planearon (reales / simulados), grupos llenos, materias con faltante, lugares faltantes.
   - Interruptor **"Incluir datos simulados"** (`useDemanda({ simulados: false })` cuando está apagado) y botones
     **Regenerar** / **Borrar simulados** (`useRegenerarSimulados`, `useBorrarSimulados`, con confirmación).
   - Lista por materia (ya viene ordenada: primero las que necesitan atención): nombre, clave, semestre, `planeados/cupoTotal`,
     badge de la `recomendacion` (abrir = rojo, redistribuir = naranja, baja = gris, sin_demanda = gris claro) con su `mensaje`,
     y por cada grupo una **barra de ocupación** (`ocupacion`, puede pasar de 100 %) con color por `nivel`
     (lleno rojo · alto naranja · normal verde · bajo gris), `planeados/cupo` y docente.
   - (Opcional) Gráfica pequeña de `porEspecialidad`.
3. Agregar estas pantallas al README (capturas) y a la propuesta escrita.

---

## 0. Novedades del 5 nov (léelo primero, A)

**Ya está en `main`:**
| PR | Qué | Notas para A |
|---|---|---|
| #1 | Calificaciones y Kardex | — |
| #2 | Planificador: Avance, Mapa y Generador | Usa tus hooks y tipos (`api/planificador.ts`, `types/api.ts`). Selector de especialidad en `PlanificadorLayout` (se guarda en `localStorage`). |
| #3 | Panel de administración (login, Materias, Oferta, Planes) | **Toqué tus archivos:** `api/admin.ts` (+4 hooks de planes/especialidades) y `main.tsx` (ruta `/admin/planes`). |
| #4 | Especialidad **Administración Gerencial** (INTE-ADG-2025-02) | **Toqué tus archivos:** `db/semilla.ts` y `db/index.ts`. Nueva `completarEspecialidades()`: agrega especialidades faltantes a una BD con datos. Producción ya la tiene (`/api/salud/bd` → 66 materias, 126 grupos). |
| #5 | README con instalación, tecnologías, arquitectura y capturas | Confirma que los comandos de Render de la sección "Despliegue" sean los que configuraste. |
| #6 | **Rediseño estilo iOS 27** con modo oscuro (toda la app) | **Toqué tus archivos:** `index.css`, `components/ui`, `AppLayout`, `Login`, colores de `HorarioGrid`. Inicio y Horario se adaptaron solos con los tokens. Reglas en §8.2. |

**Cosas que necesito de ti (A):**
1. ~~Deploy del PR #6~~ ✅ A confirmó que el rediseño está en producción.
2. ✅ **Revisado por A y en `main` (PR #7).** ~~Revisar el PR del Generador~~ (rama `b/generador-mejoras`). Toca tu `backend/src/planificador/logica.ts`:
   regla nueva **"si el co-requisito de una materia está bloqueado, la materia también"**. Caso real: *Ciberseguridad* (IDD-2502) salía *disponible*
   aunque su co-requisito *Administración de Redes* (SCA-1002) está bloqueado, y el generador no podía armar nada con ella.
   El co-requisito bloqueado se agrega a `requisitosPendientes` (sin cambiar el contrato; el front distingue pre/co con `correquisitos`).
3. ✅ **Mensajes del generador con nombres** desde `logica.ts` (pedido por A), en el mismo PR. Además, si no hay combinación, el backend sugiere qué materia quitar y cuántas opciones hay con cualquier turno (campos nuevos `sugerencias` y `opcionesSinTurno`, ver §7.1).
4. Pásame por privado la **contraseña de admin de producción** (para probar `/admin` en la app desplegada y para la demo).
5. **Límite de intentos de login:** al probar mucho en local se activa `DEMASIADOS_INTENTOS`. Es correcto; solo tenlo presente en la demo (no hacer login muchas veces seguidas).

---

## 1. Qué es el proyecto

Examen 3 de la materia: una **aplicación web** que consume la API REST del **SII del TecNM Celaya** para que el
alumno inicie sesión y vea su información académica, más una **funcionalidad original con backend propio**.

**Requisitos del examen (resumen):**

1. **Autenticación**: login con correo y contraseña contra `POST /api/login`, token guardado de forma segura,
   manejo de errores (credenciales incorrectas, servidor caído, campos vacíos), rutas privadas protegidas.
2. **Información del estudiante**: dashboard con tarjetas o gráficas, indicador de carga (skeleton), mensajes de error.
3. **Calificaciones**: tabla o tarjetas con materia, periodo y calificación; **filtro en tiempo real** por materia o
   periodo; **colores verde/amarillo/rojo** según el desempeño.
4. **Kardex y Horario**: rutas independientes; kardex completo y estructurado; horario en cuadrícula días × horas.
5. **Funcionalidad adicional** con **su propio backend de administración** (los datos pueden ser simulados) y
   una propuesta escrita que justifique su utilidad.

**Reglas importantes:** los puntos 1–4 deben usar la **API real** (no simulada). Se evalúan la calidad visual,
la creatividad y la justificación de la tecnología. Entregables: repositorio de GitHub, README con instalación,
tecnología y capturas, y despliegue público. La exposición incluye una demo en vivo y **ambos deben participar**.
Copiar de otros equipos anula el examen.

**Nuestra funcionalidad adicional: el _Planificador de trayectoria académica_** (detalle en la sección 7).

---

## 2. Decisiones ya tomadas (no reabrir sin acordarlo)

| Tema | Decisión | Por qué |
|---|---|---|
| Frontend | **React + Vite + TypeScript** | SPA rápida, HMR, fácil de justificar |
| Backend | **Node + Express 5 + TypeScript** | simple, los dos lo entienden |
| Base de datos (Planificador) | **PostgreSQL**: Neon en producción, **PGlite** en desarrollo, con SQL directo (`pg`) | sin instalar nada en local; SQL claro de explicar; las tablas y la retícula se crean solas al arrancar |
| Despliegue | Front en **Vercel**, back en **Render**, BD en **Neon** | arquitectura de 2 capas visible |
| Comunicación front→back | Rewrite de Vercel `/api/*` → Render | mismo dominio: sin CORS y la cookie funciona en Safari |
| Sesión | Token del SII en **cookie httpOnly** puesta por el backend | el JS del navegador nunca ve el token |
| Estilos | **Tailwind CSS** con sistema de diseño **estilo iOS 27** (tokens en `src/index.css`) | se ve como app nativa; modo oscuro automático; ver §8.2 |
| Peticiones en el front | **TanStack Query** | caché, loading y error gratis |
| Gráficas | **Recharts** | sencillo con React |
| Íconos | **lucide-react** | |
| Mapa de seriación | **React Flow** (`@xyflow/react`) | grafos interactivos |

---

## 3. Arquitectura

```
Navegador ──► Vercel (React)  ──/api/* rewrite──►  Render (Express)  ──►  API SII ITC
                                                          │
                                                          └──►  Neon (Postgres)
                                                                (solo Planificador)
```

- La API del SII es la **única fuente de verdad** de la autenticación y los datos académicos.
- Nuestro backend es el **intermediario seguro** y el dueño de la lógica del Planificador.
- El frontend **solo** llama a nuestro backend (`/api/...`), **nunca** al SII directamente.

---

## 4. Lo que sabemos de la API del SII (probado con datos reales)

Base: `https://sii.celaya.tecnm.mx/api`

- **Formato del correo:** `l<numeroControl>@celaya.tecnm.mx` con **L minúscula**. Con mayúscula o con otro dominio falla.
  El backend lo arma solo: el alumno puede escribir `20030123`, `L20030123` o el correo completo.
- **El login responde HTTP 200 siempre**, incluso si falla. Si sale bien, trae
  `{ status: 200, flag: "success", message: { login: { token } } }`; si falla, `{ status: 401, flag: null, message: null }`.
- El token es un **JWT que dura 60 minutos** (`exp`).
- Los endpoints protegidos **sí** responden con HTTP 401 real: `{"error":"Token not provided"}` o `{"error":"Token is invalid or expired"}`.
- Muchos números vienen como **texto** (`"83.83"`), y hay errores de escritura en el SII (`calificaiones`, `percentaje_avance_cursando`).
- **Calificaciones**: solo el **periodo actual**, con calificaciones **por unidad** (hasta 4; las faltantes en `null`), **sin calificación final**.
- **Kardex**: cada intento es un registro (ordinario, repetición, curso especial). `"0"` = no acreditada, `"AC"` = acreditada sin número.
  Periodos con formato `21/2` (Ago–Dic), `22/1` (Ene–Jun), `23/V` (verano).
- **Horario**: una fila por materia, cada día es un texto `"15:00-17:00"` más el salón (`lunes_clave_salon`).

**Todo esto ya lo resuelve el backend.** El frontend recibe datos limpios (sección 6).

---

## 5. Estado actual

| Pieza | Responsable | Estado |
|---|---|---|
| Pruebas a la API del SII | A | ✅ Hecho |
| Backend SII: login, logout, sesión, cookie, middleware | A | ✅ Hecho y probado |
| Backend: `/api/estudiante`, `/calificaciones`, `/kardex`, `/horario` normalizados | A | ✅ Hecho y probado |
| Backend: **modo mock** con alumna ficticia | A | ✅ Hecho |
| Esqueleto del frontend (Vite, router, Tailwind, cliente API, hooks, layout) | A | ✅ Hecho y probado en navegador |
| Login, rutas protegidas, layout y navegación (front) | A | ✅ Hecho y probado |
| Dashboard y horario (front) + componente `HorarioGrid` | A | ✅ Hecho y probado (mock y datos reales) |
| **Calificaciones (front)** | **B** | ✅ En `main` (PR #1) |
| **Kardex (front)** | **B** | ✅ En `main` (PR #1) |
| Planificador — backend (BD, retícula OFICIAL, lógica, generador, admin API) | A | ✅ Hecho y probado (con kardex real y mock) |
| **Planificador — frontend: avance, mapa y generador** (con selector de especialidad) | **B** | ✅ En `main` (PR #2) |
| **Planificador — frontend: panel admin** (login, materias, oferta, planes) | **B** | ✅ En `main` (PR #3) |
| Despliegue Render + Vercel | A | ✅ En producción |
| Base de datos Neon en producción | A | ✅ Conectada (`/api/salud/bd` → postgresql, 59 materias, 112 grupos) |
| **Rediseño estilo iOS 27 (toda la app, claro y oscuro)** | **B** | ✅ En `main` (PR #6) y en producción |
| **Generador: co-requisitos, nombres en mensajes y "qué materia quitar"** | **B** (+ revisión de A en `logica.ts`) | ✅ En `main` (PR #7), revisado por A |
| **Demanda de grupos — backend** (guardar horario, demanda por grupo, recomendaciones, simulados) | A | ✅ Rama `a/demanda-grupos` (PR de A) |
| **Demanda de grupos — frontend** (guardar en Generador, página Admin → Demanda) | **B** | ⏳ Pendiente (ver §0A) |
| **README** | **B** | ✅ En `main` (PR #5) — **las capturas muestran el diseño viejo: hay que retomarlas** |
| **Propuesta escrita del Planificador** (`docs/propuesta-planificador.md`, el README ya la enlaza) | **B** | ⏳ Pendiente |
| Retícula oficial de ISC con seriación | A | ✅ Cargada (especialidades IDP, GTE y ADG — esta última por B, PR #4) |

> Cuando terminen algo, **actualicen esta tabla** en el mismo commit.

---

## 6. Contrato del backend (lo que el frontend recibe)

Todas las rutas van bajo `/api`. La cookie viaja sola: en `fetch` usar **`credentials: "include"`**.

### Errores (todas las rutas)

```ts
// HTTP 4xx/5xx con este cuerpo:
{ error: CodigoError; mensaje: string } // `mensaje` ya viene listo para mostrarse al usuario
type CodigoError =
  | "CAMPOS_VACIOS" | "CREDENCIALES_INVALIDAS" | "SESION_REQUERIDA" | "SESION_EXPIRADA"
  | "SII_NO_DISPONIBLE" | "SII_RESPUESTA_INVALIDA" | "DEMASIADOS_INTENTOS" | "NO_ENCONTRADO" | "ERROR_INTERNO";
```

Si llega `SESION_REQUERIDA` o `SESION_EXPIRADA`, el frontend manda al login. Esto lo resuelve A en el cliente API, así que B no tiene que manejarlo.

### Autenticación

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/api/auth/login` | `{ usuario, password }` | `{ ok: true, expiraEn: number }` (ms epoch) |
| POST | `/api/auth/logout` | — | `{ ok: true }` |
| GET | `/api/auth/sesion` | — | `{ autenticado: boolean, expiraEn?: number }` |

### Datos académicos (requieren sesión)

```ts
interface Periodo { clave: string; anio: number; descripcion: string } // "26/2", 2026, "Agosto - Diciembre 2026"

type Desempeno = "alto" | "medio" | "bajo" | "sin_datos";
// alto ≥ 90 → verde · medio 70–89 → amarillo · bajo < 70 → rojo · sin_datos → gris

// GET /api/estudiante
interface Estudiante {
  numeroControl: string; nombre: string; email: string; semestre: number;
  foto: string | null; // ya lista para <img src>
  promedioPonderado: number; promedioAritmetico: number;
  creditosAcumulados: number; creditosComplementarios: number;
  porcentajeAvance: number; porcentajeAvanceCursando: number;
  materiasCursadas: number; materiasAprobadas: number; materiasReprobadas: number;
  materiasNoAcreditadasPendientes: number; materiasEnRepeticion: number; materiasEnEspecial: number;
}

// GET /api/calificaciones   (solo periodo actual)
interface CalificacionesActuales {
  periodo: Periodo | null;
  materias: {
    idGrupo: number; clave: string; nombre: string; grupo: string;
    unidades: { numero: number; calificacion: number | null }[];
    unidadesCapturadas: number;
    promedioActual: number | null; // promedio de las unidades capturadas
    desempeno: Desempeno;
  }[];
}

// GET /api/kardex
type TipoCurso = "ordinario" | "repeticion" | "especial" | "otro";
interface MateriaKardex {
  clave: string; nombre: string;
  periodo: string; periodoTexto: string; // "21/2", "Ago–Dic 2021"
  creditos: number;
  calificacion: number | null; // null si es "AC"
  textoCalificacion: string;    // "84" | "AC" | "NA"
  acreditada: boolean;
  tipo: TipoCurso; tipoTexto: string; // "REPETICIÓN"…
  semestre: number;
  desempeno: Desempeno;
}
interface Kardex {
  porcentajeAvance: number;
  totalCreditosAcreditados: number;
  promedioGeneral: number | null;
  materias: MateriaKardex[];                       // ordenadas por semestre y periodo
  semestres: { semestre: number; materias: MateriaKardex[]; creditosAcreditados: number; promedio: number | null }[];
  periodos: { clave: string; texto: string }[];    // listos para un <select> de filtro
}

// GET /api/horario
type DiaSemana = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado";
interface Horario {
  periodo: Periodo | null;
  materias: { idGrupo: number; clave: string; nombre: string; grupo: string; colorIndice: number; horasSemana: number }[];
  bloques: {
    dia: DiaSemana; diaIndice: number; inicio: string; fin: string;
    inicioMin: number; finMin: number; // minutos desde 00:00
    idGrupo: number; clave: string; nombre: string; grupo: string; salon: string | null; colorIndice: number;
  }[];
  dias: DiaSemana[];  // columnas a mostrar
  horaInicio: number; // primera fila (ej. 7)
  horaFin: number;    // última fila (ej. 15)
}
```

La fuente oficial de estos tipos es `backend/src/sii/tipos-app.ts`. En el frontend vivirán copiados en
`frontend/src/types/api.ts`. **Si cambian, se cambian en los dos lados en el mismo commit.**

---

## 7. El Planificador de trayectoria académica

**Problema:** el alumno no sabe con claridad qué le falta para egresar, qué materias tiene bloqueadas por
seriación ni qué combinación de grupos le conviene el próximo semestre.

**Qué hace:**
1. **Mapa de retícula**: todas las materias del plan, en columnas por semestre, con flechas de seriación.
   Colores por estado: aprobada (verde), cursando (azul), disponible (blanco), bloqueada (gris), reprobada pendiente (rojo).
2. **Avance**: créditos aprobados contra el total, % de avance, semestres restantes estimados y fecha estimada de egreso.
3. **Alertas**: materias en repetición o curso especial, y semestres cursados frente al límite reglamentario.
4. **Generador de horarios**: el alumno elige materias **disponibles** y preferencias (turno, evitar sábado,
   máximo de créditos), y el sistema propone combinaciones de grupos **sin choques**, ordenadas por puntuación (menos huecos, etc.).
5. **Panel de administración** (backend propio, requisito del examen): CRUD de planes, materias de la retícula
   con su seriación, y la oferta de grupos del próximo periodo (datos simulados).

**De dónde salen los datos:** el estado de cada materia se calcula cruzando el **kardex real** (SII) con la
**retícula** (nuestra BD), usando la **clave de la materia** (ej. `AED-1026`).

- **Retícula: OFICIAL**, transcrita de los PDF del TecNM Celaya: ISIC-2010-224 (260 créditos), con las especialidades
  **Inteligencia de Datos y Plataformas en la Nube (ISIE-IDP-2025-01)**, con toda su seriación, **Gestión de
  Tecnologías Emergentes (ISIE-GTE-2026-01)**, solo módulos, y **Administración Gerencial (INTE-ADG-2025-02)**, 7 módulos
  que piden 60 % de créditos (el PDF dice 25 créditos de módulo, pero sus materias suman 36). Flecha horizontal = **pre-requisito**; vertical = **co-requisito**
  (se cursan juntas). Algunas materias piden **% de créditos** (IA 40 %, Prog. Lógica 50 %, Taller Inv. I 60 %,
  IDD-2503/2504 65 %, Servicio Social 70 %, Residencias 80 %).
- **Oferta de grupos: SIMULADA** para el periodo 27/1 (2 grupos por materia, A matutino y B vespertino), editable desde el admin.
- **Especialidad:** se **detecta sola** con las claves del kardex; si no se detecta, se usa IDP. Se puede forzar con `?especialidad=CLAVE`.
- **Especialidades nuevas en la semilla** se agregan solas al arrancar aunque la BD ya tenga datos (`completarEspecialidades()`), sin tocar lo existente.
  Ojo: si se borra una especialidad de la semilla desde el admin, vuelve a aparecer en el siguiente arranque.
- Servicio Social y Actividades Complementarias se consideran **en paralelo** (no suman semestres a la estimación).
- Validado con un kardex real: 49 materias aprobadas (igual que el SII), 260 créditos en el plan (igual que el PDF).

### 7.2 Contrato de la Demanda de grupos (IMPLEMENTADO — rama `a/demanda-grupos`)

Tipos en `frontend/src/types/api.ts` (sección DEMANDA DE GRUPOS). Hooks listos:

```ts
// ---- Alumno (sesión del SII) — src/api/planificador.ts ----
useMiHorario()          // GET    /api/planificador/mi-horario → MiHorario
useGuardarMiHorario()   // PUT    /api/planificador/mi-horario { grupoIds: number[] } → MiHorario   (mutate(ids))
useBorrarMiHorario()    // DELETE /api/planificador/mi-horario → MiHorario                        (mutate())

MiHorario = { periodo: "27/1", periodoTexto: "Ene–Jun 2027", guardado: { grupos: GrupoOferta[], creditos, actualizado: ISO } | null }
// Errores 400 DATOS_INVALIDOS con mensaje listo: "Elegiste dos grupos de X", "X (grupo A) choca con Y (grupo B)",
// "Suman 40 créditos; la carga máxima es 36", "Algún grupo ya no está disponible o no puedes cursar esa materia".

// ---- Coordinación (sesión de admin) — src/api/admin.ts ----
useDemanda({ periodo?, simulados?: boolean })   // GET    /api/admin/demanda[?periodo=27/1][&simulados=false] → Demanda
useRegenerarSimulados()                          // POST   /api/admin/demanda/simulados { alumnos?: 10–300 }  (mutate(150))
useBorrarSimulados()                             // DELETE /api/admin/demanda/simulados

Demanda = {
  periodo, periodoTexto, incluyeSimulados,
  resumen: { alumnos, alumnosReales, alumnosSimulados, gruposLlenos, materiasConFaltante, lugaresFaltantes },
  porEspecialidad: { especialidad, alumnos }[],
  materias: {                                    // ordenadas: abrir → redistribuir → baja → sin_demanda → sin recomendación
    clave, nombre, semestre, planeados, cupoTotal, faltan,
    grupos: { id, grupo, docente, cupo, planeados, reales, simulados, ocupacion /* 1 = lleno */, nivel: "lleno"|"alto"|"normal"|"bajo" }[],
    recomendacion: { tipo: "abrir"|"redistribuir"|"baja"|"sin_demanda", mensaje } | null
  }[]
}
```

Reglas de las recomendaciones (en `backend/src/planificador/demanda.ts`, función pura `recomendar()`):
**abrir** si los planeados superan el cupo total · **redistribuir** si un grupo está lleno y otro bajo el 50 % ·
**baja** si con varios grupos la demanda no llena ni el 40 % de uno · **sin_demanda** si nadie la planeó.

### 7.1 Contrato del Planificador (IMPLEMENTADO — ya funciona)

Tipos completos en `frontend/src/types/api.ts` (sección PLANIFICADOR y ADMINISTRACIÓN).
**Hooks listos:** `src/api/planificador.ts` y `src/api/admin.ts`. No hace falta escribir `fetch`.

```ts
// ---- Alumno (requiere sesión del SII) ----
useAvance(especialidad?)      // GET  /api/planificador/avance[?especialidad=ISIE-IDP-2025-01]
useOferta(especialidad?)      // GET  /api/planificador/oferta  → grupos del próximo periodo que SÍ puede cursar
useGenerarHorarios()          // POST /api/planificador/generar { claves: string[], preferencias?: { turno?, evitarSabado?, maxCreditos? } }

AvancePlan = {
  plan, especialidad: { clave, nombre, detectada } | null, especialidades: { clave, nombre }[],   // para un <select>
  materias: {
    clave, nombre, creditos, semestreSugerido, tipo,      // tipo: basica|especialidad|residencia|servicio|complementaria
    requisitos: string[], correquisitos: string[],        // aristas del mapa (pre = flecha sólida, co = punteada)
    porcentajeRequerido: number | null,
    estado: "aprobada" | "cursando" | "disponible" | "bloqueada" | "reprobada",
    calificacion, intentos,
    requisitosPendientes: string[], faltaPorcentaje: boolean   // por qué está bloqueada (incluye co-requisitos bloqueados:
                                                               //   si la pareja no se puede inscribir, esta tampoco)
  }[],
  resumen: { creditosAprobados, creditosCursando, creditosTotales, porcentaje, semestresCursados, semestresRestantesEstimados, egresoEstimado },
  alertas: { nivel: "info" | "advertencia" | "critica", mensaje, clave? }[]   // ya vienen ordenadas por gravedad
}
Oferta = { periodo: "27/1", periodoTexto: "Ene–Jun 2027", grupos: GrupoOferta[] }
GrupoOferta = { id, clave, nombre, creditos, grupo, docente, cupo, bloques: { dia, inicio: "07:00", fin: "09:00", salon }[] }
OpcionesHorario = {
  opciones: { grupos: GrupoOferta[], creditos, horasHueco, diasConClase, horaEntrada, horaSalida, puntuacion /* 0–100 */ }[], // máx. 10, la mejor primero
  sinSolucion: string[],     // claves sin grupo compatible
  advertencias: string[],    // co-requisitos faltantes, carga > 36 créditos, etc., YA CON NOMBRES → mostrarlas
  sugerencias?: { quitar, nombre, opciones }[],  // solo si no hubo combinación: qué materia quitar y cuántas opciones salen sin ella
  opcionesSinTurno?: number  // solo si se pidió turno y no hubo combinación: opciones con cualquier turno
}
// Error 400 DATOS_INVALIDOS si las materias superan maxCreditos (mostrar error.message).

// ---- Administración (sesión PROPIA, no usa el SII). Local: admin / admin123 · Producción: A te pasa la contraseña por privado ----
useSesionAdmin() · useLoginAdmin() · useLogoutAdmin()        // /api/admin/sesion · login · logout
usePlanesAdmin()                                              // planes con sus especialidades (ids para filtros)
useMateriasAdmin({ especialidadId?: number | "comun" })       // lista con requisitos [{ id, clave, nombre, tipo }]
useGuardarMateria()  → mutate({ id?, datos: MateriaAdminEntrada })   // sin id = crear; requisitos: [{ id, tipo: "pre"|"co" }]
useEliminarMateria() → mutate(id)
useOfertaAdmin(periodo?) · useGuardarGrupo() → mutate({ id?, datos: GrupoAdminEntrada }) · useEliminarGrupo()
useGuardarPlan() · useEliminarPlan() · useGuardarEspecialidad() · useEliminarEspecialidad()   // agregados por B (pantalla /admin/planes)
// Errores que muestra el backend: CONFLICTO (clave repetida), DATOS_INVALIDOS (con mensaje específico), ADMIN_REQUERIDO (→ /admin/login)
```

**Para probar todo en local:** backend con `SII_MODE=mock` y usuario `99030001` / `demo123`. La alumna ficticia está en
7.º semestre y tiene materias disponibles, bloqueadas y cursando, así que sirve para ver todos los estados y probar el generador.
Las rutas de admin se prueban con `admin` / `admin123`.

---

## 8. Estructura del repositorio y reglas de colaboración

```
sii-planner/
├── CONTEXTO.md          ← este documento
├── README.md            ← entregable (B)
├── backend/             ← Express + TS (A)
│   └── src/
│       ├── sii/          cliente SII, tipos, normalizadores, mock
│       ├── routes/       auth, academico  (+ planificador, admin: A)
│       └── middleware/
└── frontend/            ← React + Vite + TS
    └── src/
        ├── api/          cliente fetch + hooks de TanStack Query  (A)
        ├── types/api.ts  copia del contrato (sección 6)
        ├── components/   ui/ compartidos (Card, Skeleton, Badge, ErrorState…) + HorarioGrid (A)
        ├── layouts/      AppLayout con navegación (A)
        ├── pages/
        │   ├── Login.tsx, Dashboard.tsx, Horario.tsx               (A)
        │   ├── Calificaciones.tsx, Kardex.tsx                      (B)
        │   ├── planificador/  Mapa, Avance, Generador              (B)
        │   └── admin/         Login, Materias, Oferta, Planes      (B)
        └── mocks/        datos de ejemplo del Planificador (B)
```

**Reglas:**
- **Flujo:** rama → probar en local → push de la rama → PR → el otro revisa (y la vista previa de Vercel) → merge. **Nunca commits directos a `main`.**
- **Ramas**: `main` siempre funciona. Cada quien trabaja en su rama (`b/calificaciones`, `a/dashboard`…) y
  une con **Pull Request**; el otro le da un vistazo rápido antes del merge.
- **Antes de empezar el día**: `git pull origin main` y unir `main` a tu rama.
- **No editar archivos del otro** sin avisar. Si B necesita algo en `api/`, `components/ui/` o en el backend, se lo pide a A, o lo hace y lo avisa en el PR.
- **Commits en español**, cortos y en imperativo: `Agrega filtro por periodo en calificaciones`. Sin líneas de atribución a herramientas de IA.
- **Nunca subir** `.env`, tokens ni datos personales reales. Los datos de ejemplo siempre son **ficticios**.
- Si cambia una decisión o un contrato, **primero se actualiza este archivo**.

## 8.1 Cómo está armado el frontend (ya existe — úsalo así)

- **Rutas** (`src/main.tsx`): `/login` · `/` (Inicio) · `/calificaciones` · `/kardex` · `/horario` ·
  `/planificador` (Avance) · `/planificador/mapa` · `/planificador/generador` · `/admin/login` · `/admin` (Materias) · `/admin/oferta` · `/admin/planes`.
  Las del alumno están protegidas por `RutaProtegida`; las de admin, por `AdminLayout` con la sesión de admin (y `ADMIN_REQUERIDO` regresa a `/admin/login`).
- **Las páginas de B ya existen** como "Pendiente": solo hay que reemplazar su contenido. No toques `main.tsx` salvo para agregar rutas nuevas.
- **Datos:** usa solo los hooks de `src/api/hooks.ts`: `useEstudiante()`, `useCalificaciones()`, `useKardex()`, `useHorario()`.
  Cada uno da `{ data, isPending, error, refetch }`. Nunca uses `fetch` directo. Para rutas nuevas (planificador o admin), agrega hooks en ese mismo archivo usando `api()` / `post()` de `src/api/cliente.ts`.
- **Sesión expirada:** la maneja `cliente.ts` + `RutaProtegida` (regresa al login con aviso). B no tiene que hacer nada.
- **Componentes compartidos** (`src/components/ui/index.tsx`): `Card`, `Skeleton`, `Badge` (tonos `neutro|marca|alto|medio|bajo`),
  `Calificacion` (número con su color de semáforo), `ErrorState` (con botón Reintentar), `EncabezadoPagina`.
- **Colores y utilidades** (`src/lib/desempeno.ts`): `estiloDesempeno[desempeno]` da las clases de texto, fondo, borde y punto;
  `desempenoDe(numero)`; `tituloBonito("ESTRUCTURA DE DATOS")` → "Estructura de Datos" (el SII manda todo en mayúsculas).
- **Tailwind v4**: colores propios en `src/index.css` → `marca-50…900` (azul institucional), `alto`, `medio`, `bajo` y sus versiones `-suave`.
  Ejemplos: `bg-marca-700`, `text-alto`, `bg-bajo-suave`. Fuente: Plus Jakarta Sans.
- **Patrón de una página:**
  ```tsx
  const { data, isPending, error, refetch } = useKardex();
  if (isPending) return <Skeleton className="h-64" />;          // o varios skeletons con la forma del contenido
  if (error) return <ErrorState mensaje={error.message} onReintentar={refetch} />;
  return (<><EncabezadoPagina titulo="Kardex" subtitulo="…" /> … </>);
  ```
- **`HorarioGrid`** (`src/components/HorarioGrid.tsx`), para el Generador de B:
  ```tsx
  import HorarioGrid, { aBloqueGrid } from "../../components/HorarioGrid";
  // GrupoOferta trae bloques con "07:00"; aBloqueGrid los convierte (colorIndice = índice del grupo)
  const bloques = opcion.grupos.flatMap((g, i) => g.bloques.map((b) => aBloqueGrid({ ...b, clave: g.clave, nombre: g.nombre, grupo: g.grupo }, i)));
  <HorarioGrid bloques={bloques} dias={["lunes","martes","miercoles","jueves","viernes"]} horaInicio={7} horaFin={21} marcarHoy={false} />
  ```
  También exporta `colorMateria(i)`, `NOMBRE_DIA`, `aHora(min)`, `aMinutos("07:30")` y `diaDeHoy()`.
- `tituloBonito()` ya respeta números romanos ("Lenguajes y Autómatas II").
- **Desarrollo:** Vite reenvía `/api/*` a `localhost:4000` (`vite.config.ts`), así que corre siempre el backend en otra terminal.
- **Producción:** `frontend/vercel.json` reenvía `/api/*` a Render. A pone la URL real al desplegar.

---

## 8.2 Sistema de diseño (estilo iOS 27) — acordado A + B

- **Tipografía:** fuente del sistema (`-apple-system`: SF Pro en Mac/iPhone). Títulos de página de 34 px (`EncabezadoPagina`).
- **Colores:** las mismas clases de siempre, pero reasignadas a colores de sistema de Apple con **modo oscuro automático**:
  `slate-*` = grises de sistema, `marca-*` = azul de sistema (#007AFF), `alto/medio/bajo` = verde/naranja/rojo de iOS.
  Superficies: `bg-fondo` (fondo agrupado), `bg-superficie` (tarjetas; **no usar `bg-white`**), `bg-relleno` (campos y controles), `border-separador`.
- **Material Liquid Glass:** clase `.vidrio` solo para lo que flota (barra lateral, barra de pestañas, menús, paneles sobre el mapa).
  `.borde-scroll` para barras que se difuminan al hacer scroll. Ambas se vuelven sólidas con "Reducir transparencia".
- **Componentes CSS:** `.segmentado` + `.segmento` (control segmentado en cápsula; se activa con `aria-selected`, `aria-pressed` o `aria-current`) y `.campo` (campo de texto/select).
- **Reglas:** sin etiquetas en MAYÚSCULAS; listas agrupadas (filas con separador) en vez de tablas cuando se pueda; botones en cápsula (`rounded-full`); esquinas de tarjeta 22 px.

## 9. Configurar la Mac (B, una sola vez)

```bash
# 1. Herramientas (si no las tienes)
xcode-select --install                    # incluye git
# Node 20 o superior: descárgalo de https://nodejs.org (LTS) y verifica:
node -v && npm -v

# 2. Clonar el repositorio (A te agrega como colaborador en GitHub)
git clone https://github.com/ricardo-rodriguezdesk/Examen3TOPW.git
cd Examen3TOPW

# 3. Backend en modo mock (no necesitas credenciales del SII)
cd backend
npm install
cp .env.example .env
# en .env cambia:  SII_MODE=mock
npm run dev                               # → http://localhost:4000/api/salud

# 4. Frontend, en otra pestaña de la terminal (el backend debe estar corriendo)
cd ../frontend
npm install
npm run dev                               # → http://localhost:5173
```

**Login en modo mock:** usuario `99030001` · contraseña `demo123` (alumna ficticia de ISC, 7.º semestre).
Para probar con datos reales, cada quien pone `SII_MODE=real` en **su propio** `.env` y usa **sus propias** credenciales.

Editor recomendado: VS Code con las extensiones *ESLint*, *Prettier* y *Tailwind CSS IntelliSense*.

---

## 10. Tareas de B, paso a paso

### Estado de B (5 nov)
B1, B2, B3 (incluido el panel admin) y el README ya están en `main`. Lo que queda de B:
1. ~~`b/generador-mejoras`~~ ✅ en `main` (PR #7).
1b. **Demanda de grupos — frontend** (§0A): guardar horario en el Generador y página Admin → Demanda.
2. Propuesta escrita del Planificador en `docs/propuesta-planificador.md`.
3. Volver a tomar las capturas del README con el diseño nuevo (claro y oscuro, escritorio y celular).

### Para arrancar (el esqueleto del frontend ya está)
1. Clonar, levantar el backend en modo mock y probar las rutas en el navegador
   (después de hacer login, `GET /api/kardex` muestra el JSON).
2. Leer `backend/src/sii/normalizar.ts` y `tipos-app.ts` para entender los datos.
3. El backend del Planificador **ya está listo**: usa los hooks de `src/api/planificador.ts` y `src/api/admin.ts` (sección 7.1). No hacen falta datos de ejemplo.
4. Empezar a redactar la **propuesta escrita del Planificador**: problema, a quién afecta, cómo lo resuelve y beneficios concretos (1 página).

### B1 — Calificaciones (`pages/Calificaciones.tsx`)
- Usa `useCalificaciones()` (periodo actual) **y** `useKardex()` (historial). Pon dos pestañas: **"Periodo actual"** e **"Historial"**.
- **Periodo actual**: una tarjeta por materia con clave, nombre, grupo, las 4 unidades (las vacías como "—"),
  el promedio parcial y una etiqueta "En curso". Color de la tarjeta según `desempeno`.
- **Historial**: tabla con materia, periodo (`periodoTexto`), tipo de curso y calificación final.
- **Filtro en tiempo real**: un input que busca por nombre o clave, y un `<select>` de periodo (`kardex.periodos`).
  Filtrar con `useMemo` en cada tecla, sin botón de "buscar".
- **Colores**: verde ≥ 90, amarillo 70–89, rojo < 70, gris sin datos. "AC" cuenta como verde.
- Estados: skeleton mientras carga y `ErrorState` (componente de A) si falla.

### B2 — Kardex (`pages/Kardex.tsx`)
- Arriba, **tarjetas resumen**: % de avance (barra), créditos acreditados, promedio general, materias en repetición o especial.
- **Gráfica de línea** (Recharts) del promedio por semestre (`kardex.semestres[].promedio`).
- **Secciones por semestre** que se abren y cierran, cada una con su tabla (clave, materia, periodo, créditos, calificación, tipo).
  Badge de tipo: Ordinario (neutro), Repetición (ámbar), Especial (rojo). Las no acreditadas, en rojo con "NA".
- Las materias cursadas varias veces aparecen varias veces (es correcto: el kardex guarda cada intento).

### B3 — Planificador, frontend (`pages/planificador/`)
- **Mapa** (`Mapa.tsx`): React Flow, columnas por `semestreSugerido`, nodos coloreados por `estado`, aristas desde los `requisitos`.
  Al hacer clic en un nodo, un panel lateral muestra los detalles, los intentos y qué la bloquea.
- **Avance** (`Avance.tsx`): resumen, barra de créditos, egreso estimado y lista de alertas por nivel.
- **Generador** (`Generador.tsx`): checklist de materias disponibles, preferencias, botón "Generar" y la lista de opciones,
  cada una mostrada con el componente **`HorarioGrid`** de A (el mismo de la página Horario).
  Muestra `advertencias` y `sinSolucion`. Para dibujar una opción:
  `opcion.grupos.flatMap((g, i) => g.bloques.map((b) => aBloqueGrid({ ...b, clave: g.clave, nombre: g.nombre, grupo: g.grupo }, i)))`.
  Si `oferta.grupos` viene vacío, muestra un mensaje tipo "No tienes materias por inscribir" (pasa con alumnos a punto de egresar).
- Selector de especialidad (opcional) con `avance.especialidades`; pásala a los 3 hooks.
- **Panel admin** (`pages/admin/`): `LoginAdmin.tsx` con `useLoginAdmin()`; protege `AdminLayout` con `useSesionAdmin()`
  (si `autenticado` es false → `/admin/login`); botón de cerrar sesión. **Materias**: tabla filtrable por especialidad,
  formulario crear/editar (clave, nombre, HT, HP, créditos, semestre, tipo, % requerido) con selector múltiple de
  requisitos (pre/co); eliminar con confirmación. **Oferta**: tabla por periodo, formulario con materia, grupo, docente, cupo y
  editor de bloques (día, inicio, fin, salón; agregar/quitar filas).

### B4 — Entregables
- `README.md`: descripción, tecnologías y su justificación, arquitectura (diagrama de la sección 3),
  instalación (sección 9), credenciales mock, **capturas** de cada pantalla y links del despliegue.
- Propuesta escrita del Planificador.

---

## 11. Tareas de A (para que B sepa qué esperar)

1. ~~Esqueleto del frontend, login, rutas protegidas y layout~~ ✅
2. ~~Dashboard, horario y el componente `HorarioGrid`~~ ✅
3. ~~Backend del Planificador: BD, retícula oficial, cálculo de estados, generador, rutas admin, hooks del front~~ ✅
4. ~~Despliegue Render + Vercel + Neon~~ ✅

**La parte de A está terminada.** Pendientes chicos que surgieron el 5 nov (detalle en §0):
5. ~~Deploy de Vercel del PR #6~~ ✅
6. ~~Revisar el PR `b/generador-mejoras`~~ ✅ aprobado (los 3 casos de co-requisitos están bien).
7. Pasar a B la contraseña de admin de producción (por WhatsApp).
8. ~~Backend de **Demanda de grupos**~~ ✅ (rama `a/demanda-grupos`, §0A y §7.2).

Si B necesita algo del backend o de `api/`, que lo pida.

---

## 12. Cosas pendientes de decidir o conseguir

- [ ] Fecha de entrega y de la exposición: ______
- [x] Retícula oficial de ISC con seriación (cargada).
- [x] El SII sí responde desde Render (`/api/salud/sii` → alcanzable).
- [ ] Nombre final de la app (provisional: **SII Planner**).
- [x] El diseño nuevo ya está en producción (PR #6).
- [ ] Contraseña de admin de producción para B.
- [ ] Ensayar la demo: para el Generador con una cuenta real a punto de egresar, cambiar la **especialidad** en el selector
      (sus materias salen disponibles); respaldo: modo mock en local (`99030001` / `demo123`).
- [ ] Despertar Render unos minutos antes de exponer (abrir `/api/salud`), por el arranque en frío del plan gratis.
- [ ] Grabar un video de respaldo de la demo, por si el SII se cae en la exposición.

## 13. Exposición (reparto)

- **A**: arquitectura, flujo de autenticación y seguridad del token, particularidades del SII, despliegue.
- **B**: React + Vite (ventajas), presentación de los datos académicos, el Planificador y su justificación.
- **Demo en vivo**: uno opera la app y el otro narra.
