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
```
