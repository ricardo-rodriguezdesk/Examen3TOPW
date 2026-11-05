# Propuesta: Planificador de trayectoria académica

**SII Planner · Examen 3 — Consumo de API y Desarrollo de Interfaz Web**
Ricardo Rodríguez Arellano · Victor Manuel Mendoza Lara — Instituto Tecnológico de Celaya

## El problema

El SII muestra la información académica, pero no ayuda a decidir con ella. El kardex es una lista de intentos,
y la retícula de la carrera, con su seriación y sus módulos de especialidad, vive en un PDF aparte. Para saber qué
le falta para egresar, qué materias tiene bloqueadas y por qué, o qué combinación de grupos le conviene el próximo
semestre, el alumno tiene que cruzar esos documentos a mano. Es fácil equivocarse: olvidar un co-requisito, no notar
que una materia pide cierto porcentaje de créditos o armar un horario que choca.

Del otro lado, la coordinación abre los grupos de cada periodo sin saber cuántos alumnos piensan tomarlos.
Se entera de que un grupo no alcanzó cuando ya empezó la reinscripción, y de que otro quedó casi vacío cuando
ya tiene docente y salón asignados.

## A quién afecta

- **Alumnos de Ingeniería en Sistemas Computacionales**, sobre todo a partir de la mitad de la carrera, cuando empiezan
  la seriación larga, los módulos de especialidad, el servicio social y la residencia.
- **Alumnos en repetición o curso especial**, para quienes un error de planeación puede costar un semestre o la baja.
- **La coordinación de la carrera**, que decide cuántos grupos abrir de cada materia y en qué horario.

## Cómo lo resuelve

El Planificador cruza el **kardex real** del alumno (consultado en el SII a través de nuestro backend) con la
**retícula oficial** del plan ISIC-2010-224, guardada en nuestra base de datos con toda su seriación.

1. **Mapa de retícula.** Todas las materias por semestre, coloreadas según su estado: aprobada, cursando, disponible,
   bloqueada o reprobada. Al elegir una materia se ilumina su cadena de requisitos y se explica en una frase por qué
   está bloqueada: un pre-requisito sin acreditar, un co-requisito que todavía no se puede inscribir o un porcentaje de créditos.
2. **Avance y egreso estimado.** Créditos aprobados contra los 260 del plan, semestres restantes al ritmo del alumno y
   alertas: materias en repetición, riesgo en el periodo actual o semestres frente al límite reglamentario.
3. **Generador de horarios.** El alumno marca las materias que puede inscribir y sus preferencias (turno, evitar sábado,
   máximo de créditos). Recibe combinaciones de grupos sin choques, ordenadas por menos horas libres y menos días de
   clase. Si no cabe todo, el sistema dice qué materia conviene quitar.
4. **Demanda de grupos para la coordinación.** El alumno puede **guardar** el horario que planea cursar. El panel de
   administración muestra cuántos alumnos planean cada grupo, su ocupación contra el cupo y una recomendación por
   materia: **abrir otro grupo**, **redistribuir**, **demanda baja** o **sin demanda**.
5. **Panel de administración propio.** La coordinación da de alta planes, especialidades, materias con su seriación y
   la oferta de grupos con su horario. Lo que se captura ahí es exactamente lo que ve el alumno.

## Beneficios concretos

**Para el alumno**
- Ve en una pantalla lo que antes requería cruzar el kardex con un PDF, sin errores de interpretación.
- Entiende por qué no puede inscribir una materia y qué tiene que acreditar primero.
- Arma su próximo semestre en minutos, con la seguridad de que el horario no choca y respeta la seriación.
- Detecta a tiempo situaciones de riesgo (repetición, curso especial, límite de semestres).

**Para la coordinación**
- El panel de administración deja de ser solo un catálogo y se vuelve una **herramienta de decisión**: sabe *antes* de
  la reinscripción qué grupos van a faltar, cuáles conviene ampliar y cuáles casi nadie eligió.
- Puede actualizar la retícula y la oferta sin tocar código, por ejemplo al llegar una nueva especialidad.

## Privacidad y seguridad

- El token del SII se guarda en una cookie `httpOnly`: el navegador nunca lo expone a JavaScript.
- El horario planeado se guarda de forma **anónima**: en lugar del número de control se guarda un hash HMAC que no se
  puede revertir sin el secreto del servidor. La coordinación solo ve **conteos por grupo**, nunca quién eligió qué.
- El panel de administración tiene su propia sesión, independiente de las credenciales del SII.

## Alcance y limitaciones

- Los datos académicos son **reales** (API del SII). La retícula se transcribió de los PDF oficiales de la carrera
  (tronco común y especialidades *Inteligencia de Datos y Plataformas en la Nube*, *Gestión de Tecnologías Emergentes*
  y *Administración Gerencial*).
- La **oferta de grupos** del próximo periodo y los **150 alumnos de la demanda** son **simulados** para la demostración,
  como permite el examen. Se pueden ocultar, regenerar o borrar desde el panel, y el sistema ya distingue la demanda
  real de la simulada.
- Las recomendaciones de la demanda son reglas simples y explicables (por ejemplo, "abrir" si los alumnos que planean
  la materia superan el cupo total). Su valor crece con el número de alumnos que guarden su horario.
