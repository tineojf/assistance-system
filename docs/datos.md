## MÉTODO DE “ANÁLISIS DE EMPLEADO”

Estado (entrada):

- “tarde” si la hora de entrada es posterior al horario laboral del empleado.

Horas extra:

- Tiempo por encima de la hora de salida del empleado.

Horas perdidas:

- Tiempo que el empleado ingresó después de su hora de entrada.

## Horarios

Turno operario: (opciones)

- 07:00 -> 07:00 del dia siguiente (24h)
- 19:00 -> 07:00 del dia siguiente (12h-noche)
- 07:00 -> 19:00 (12h-dia)

Turno oficina: 
- 08:00 -> 18:00 (10h-dia) 

## OBSERVACIONES

- Sin registros
- Fin de semana
- Sin entrada
- Sin salida
- 10h Dia
- 12h Dia
- 12h Noche -> Turno noche
- 24h -> 24h Amanecida

Detalles:

- si es sabado o domingo, no se realizan validaciones, se coloca fin de semana
- 10h Dia & 12h Dia & 12h Noche: no se muestran en columna observaciones
- 24h: se marcan para verificación posterior
- 12h noche: el horario laboral se cuenta de 19:00 a 07:00 del día siguiente ( se cuenta las horas extra y perdidas según este horario y tarde si aplica)
- 24h: las horas extra se cuenta desde las 19:00 hasta por ejemplo las 7:34
- sin entrada o sin salida: no se calcula horas extra ni horas perdidas

- para amanecidas siempre marcar hora de entrada y salida, se debe verificar posteriormente

## ESTRUCTURA DEL “ANÁLISIS DE EMPLEADO”

Fecha Entrada | Hora Entrada | Estado | Fecha Entrada | Hora Salida | Horas Extras | Horas Perdidas | Observaciones
03/11/2025 | 07:02 | tarde | 03/11/2025 | 19:53 | 00:53 | 00:02 | Sin entrada
04/11/2025 | 07:03 | — | 04/11/2025 | 22:14 | 00:03 | —
05/11/2025 | 06:47 | — | — | — | — | — | — | Sin salida

## RESUMEN GENERAL

- Inasistencias: registros con observaciones “Faltó entrada” o “Faltó salida" o "Sin registros”.
- Tardanzas: entradas marcadas como “tarde”.
- Horas extra: suma total del empleado.
- Horas perdidas: suma total del empleado.
- Diferencia: Horas extra − Horas perdidas.

## ESTRUCTURA DEL RESUMEN GENERAL

Trabajador | Inasistencias | Tardanzas | Horas Extra | Horas Perdidas | Diferencia
Mendez 6 | 0 | 7 | 5h 52m | 0h 0m | +5h 52m

## Horarios

- 8 a 18 (10h-dia) -> turno oficina
- de 7 a 19 (12h-dia), de 19 a 7 (12h-noche), 7 a 7 (24h) -> turno operario

## REGLAS DEL SISTEMA

- la funcion analyzeAttendance recibe: empleados, csv, rango de fecha
- verifica los rangos de fecha, deben ser pasado-futuro, sino lanza error
- crea un arreglo empleado y todos los registros del csv asociados a ese nombre ordenados por la fila del csv
  Chino 4: [
  4,Chino 4,05/11/2025 18:55:24,Entrada,Asistencia,0
  4,Chino 4,06/11/2025 07:19:13,Salida,Asistencia,0
  ...
  ]
- analiza cada empleado y agrupa de entrada-salida, llenando este tipo
  export type Pair = {
  entryDate?: Date;
  entryRecordIndex?: number;
  exitDate?: Date;
  exitRecordIndex?: number;
  };
  si es que el primer registro es salida, el entrydate es indefinido
  si el primer registro es entrada, y el que le sigue es salida, se asocian llenando el tipo pair
  si el registro es entrada, y el siguiente es entrada o no hay más, el exitdate es indefinido
-
- de ahi analiza el rango desde el primer dia del rango de inicio, hasta el ultimo, pero hay varias formas de saltar algun dia
-
