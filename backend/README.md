# Backend local — SII Planner

Intermediario seguro entre el frontend y la API del SII ITC. El token del SII vive en una
cookie **httpOnly**: el JavaScript del navegador nunca lo ve.

## Ejecutar

```bash
cd backend
npm install
cp .env.example .env     # en Windows: copy .env.example .env
npm run dev              # http://localhost:4000
```

En `.env`, usa `SII_MODE=mock` para trabajar sin el SII (datos ficticios).
Credenciales mock: usuario `99030001` · contraseña `demo123`.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | `{ usuario, password }`. `usuario` puede ser `20030123`, `L20030123` o el correo completo. |
| POST | `/api/auth/logout` | Borra la cookie. |
| GET | `/api/auth/sesion` | `{ autenticado, expiraEn }` |
| GET | `/api/estudiante` | Perfil normalizado |
| GET | `/api/calificaciones` | Periodo actual, unidades y promedio parcial |
| GET | `/api/kardex` | Historial agrupado por semestre, con periodos para filtros |
| GET | `/api/horario` | Bloques listos para dibujar la cuadrícula días × horas |
| GET | `/api/salud` | Comprobación de vida (útil en Render) |
| GET | `/api/salud/sii` | ¿El servidor alcanza al SII? |
| GET | `/api/salud/bd` | Motor de BD y conteo de materias/grupos |

### Planificador (sesión de alumno)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/planificador/avance[?especialidad=]` | Estado de cada materia (kardex × retícula), resumen y alertas |
| GET | `/api/planificador/oferta` | Grupos del próximo periodo que el alumno puede cursar |
| POST | `/api/planificador/generar` | `{ claves, preferencias }` → combinaciones sin choques |

### Administración (sesión propia: `ADMIN_USER` / `ADMIN_PASSWORD`)

`POST /api/admin/login` · `POST /api/admin/logout` · `GET /api/admin/sesion` y CRUD de
`/api/admin/planes`, `/especialidades`, `/materias` (con requisitos) y `/oferta` (con bloques).

## Base de datos

- **Producción:** PostgreSQL en Neon (`DATABASE_URL`).
- **Desarrollo:** si `DATABASE_URL` está vacío se usa **PGlite** (PostgreSQL dentro de Node, datos en `backend/.pglite`).
  Borra esa carpeta para empezar de cero.
- Al arrancar se crean las tablas (`src/db/esquema.ts`) y, si están vacías, se carga la **retícula oficial**
  de ISIC-2010-224 y una oferta simulada (`src/db/semilla.ts`).

Errores: siempre `{ error: CODIGO, mensaje }` con códigos `CAMPOS_VACIOS`, `CREDENCIALES_INVALIDAS`,
`SESION_REQUERIDA`, `SESION_EXPIRADA`, `SII_NO_DISPONIBLE`, `SII_RESPUESTA_INVALIDA`, `DEMASIADOS_INTENTOS`.

## Particularidades del SII que resuelve este backend

- El login responde **HTTP 200 aunque falle**; el resultado real está en `status` / `flag` del cuerpo.
- El correo debe ser `l<número>@celaya.tecnm.mx` con **L minúscula**.
- El JWT dura **60 minutos**; la cookie expira al mismo tiempo.
- Números que llegan como texto, campos con errores de escritura (`calificaiones`, `percentaje_…`),
  calificación `"0"` = no acreditada y `"AC"` = acreditada.

## Estructura

```
src/
  config.ts              variables de entorno
  app.ts                 Express, CORS, manejador central de errores
  routes/auth.ts         login / logout / sesión
  routes/academico.ts    estudiante, calificaciones, kardex, horario
  middleware/auth.ts     lectura y validación de la cookie
  sii/cliente.ts         único módulo que habla con el SII
  sii/tipos-sii.ts       formato CRUDO del SII
  sii/tipos-app.ts       formato LIMPIO que recibe el frontend (contrato)
  sii/normalizar.ts      SII crudo → contrato limpio
  sii/mock/              cliente y datos ficticios
  db/                    conexión (Neon/PGlite), esquema y semilla (retícula oficial)
  planificador/logica.ts lógica pura: estados, estimación de egreso, alertas, generador de horarios
  planificador/repositorio.ts consultas SQL
  routes/planificador.ts rutas del alumno
  routes/admin.ts        backend de administración (CRUD)
  middleware/admin.ts    sesión de admin firmada (HMAC)
```
