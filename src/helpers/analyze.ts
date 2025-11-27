import type {
  AnalysisResult,
  Summary,
  Employees,
  DateRange,
  CsvRecord,
  AnalysisDay,
  Pair,
} from "../types/attendance";

import {
  parseDateTime,
  parseOnlyDate,
  formatDate,
  formatTime,
  isWeekend,
  minutesToHoursMinutes,
} from "../utils/date";

/**
 * Nuevo analyzeAttendance con:
 * - Orden de prioridad de observaciones (Sin registros, Fin de semana, Sin entrada, Sin salida, 24h, 12h noche)
 * - Cálculo de tarde, horas perdidas y horas extra solo cuando aplique
 * - Resumen con inasistencias, tardanzas, extra (minutos) y perdidas (minutos)
 */
export const analyzeAttendance = (
  employees: Employees,
  csvData: CsvRecord[],
  dateRange: DateRange
): { analysis: AnalysisResult; summary: Summary } => {
  if (!dateRange.start || !dateRange.end) {
    throw new Error("Debe seleccionar un rango de fechas válido");
  }

  const startDate = parseOnlyDate(dateRange.start);
  const endDate = parseOnlyDate(dateRange.end);

  const analysisResult: AnalysisResult = {};
  const summaryResult: Summary = {};

  // Helper: crear pares ADYACENTES (entrada/salida) por empleado (misma lógica que tenías)
  const buildPairsFor = (records: CsvRecord[]): Pair[] => {
    const pairs: Pair[] = [];
    let i = 0;
    while (i < records.length) {
      const rec = records[i];
      const recDate = parseDateTime(rec.tiempo);

      if (rec.estado === "Entrada") {
        if (i + 1 < records.length && records[i + 1].estado === "Salida") {
          pairs.push({
            entryDate: recDate,
            entryRecordIndex: i,
            exitDate: parseDateTime(records[i + 1].tiempo),
            exitRecordIndex: i + 1,
          });
          i += 2;
        } else {
          // entrada sin salida
          pairs.push({
            entryDate: recDate,
            entryRecordIndex: i,
            exitDate: undefined,
            exitRecordIndex: undefined,
          });
          i += 1;
        }
      } else {
        // Salida sin entrada previa emparejada
        pairs.push({
          entryDate: undefined,
          entryRecordIndex: undefined,
          exitDate: recDate,
          exitRecordIndex: i,
        });
        i += 1;
      }
    }
    return pairs;
  };

  Object.keys(employees).forEach((empName) => {
    const schedule = employees[empName];
    const sParts = schedule.start.split(":").map(Number);
    const eParts = schedule.end.split(":").map(Number);
    const scheduleStartHour = sParts[0];
    const scheduleStartMinute = sParts[1];
    const scheduleEndHour = eParts[0];
    const scheduleEndMinute = eParts[1];

    // registros del empleado ordenados cronológicamente
    const allRecords = csvData
      .filter((r) => r.nombre === empName)
      .sort(
        (a, b) =>
          parseDateTime(a.tiempo).getTime() - parseDateTime(b.tiempo).getTime()
      );

    const pairs = buildPairsFor(allRecords);

    // inicializar summary (minutos para extra/lost)
    summaryResult[empName] = {
      absences: 0,
      lates: 0,
      extraHours: 0, // en minutos
      lostHours: 0, // en minutos
    };

    analysisResult[empName] = [];

    // recorrer días
    const cursor = new Date(startDate.getTime());
    while (cursor <= endDate) {
      const dayStr = formatDate(cursor);
      const dayStart = parseOnlyDate(dayStr);
      const dayEnd = new Date(dayStart.getTime());
      dayEnd.setHours(23, 59, 59, 999);

      // detectar si hay registros en el dia
      const dayRecords = allRecords.filter((r) => {
        const d = parseDateTime(r.tiempo);
        return d >= dayStart && d <= dayEnd;
      });

      // 1) Prioridad: Sin registros
      if (dayRecords.length === 0) {
        // Si fin de semana sin registros: "Fin de semana" y NO cuentan como inasistencia
        if (isWeekend(cursor)) {
          analysisResult[empName].push({
            entryDate: dayStr,
            entryTime: "—",
            status: "—",
            exitDate: "—",
            exitTime: "—",
            extraHours: "—",
            lostHours: "—",
            observations: ["Fin de semana"],
          });
        } else {
          analysisResult[empName].push({
            entryDate: dayStr,
            entryTime: "—",
            status: "—",
            exitDate: "—",
            exitTime: "—",
            extraHours: "—",
            lostHours: "—",
            observations: ["Sin registros"],
          });
          summaryResult[empName].absences++;
        }
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      // Si es fin de semana pero hay registros: procesar normalmente (se permite calcular extras)
      // Filtrar pares del día: entradas del día o salidas huérfanas cuya salida cae ese día
      const pairsForDay = pairs.filter((p) => {
        if (!p.entryDate && p.exitDate) {
          return formatDate(p.exitDate) === dayStr;
        }
        if (p.entryDate) {
          return formatDate(p.entryDate) === dayStr;
        }
        return false;
      });

      // Si no hay pares filtrados pero sí registros (fallback)
      if (pairsForDay.length === 0) {
        const orphanExits = dayRecords.filter((r) => r.estado === "Salida");
        if (orphanExits.length > 0) {
          // varias salidas huérfanas -> cada una su fila
          orphanExits.forEach((oe) => {
            const exitDate = parseDateTime(oe.tiempo);
            analysisResult[empName].push({
              entryDate: dayStr,
              entryTime: "—",
              status: "—",
              exitDate: formatDate(exitDate),
              exitTime: formatTime(exitDate),
              extraHours: "—",
              lostHours: "—",
              observations: ["0h → Sin entrada"],
            });
            summaryResult[empName].absences++;
          });
        } else {
          // buscar entrada suelta (primera)
          const firstEntry = dayRecords.find((r) => r.estado === "Entrada");
          if (firstEntry) {
            const eDate = parseDateTime(firstEntry.tiempo);
            analysisResult[empName].push({
              entryDate: dayStr,
              entryTime: formatTime(eDate),
              status: "—",
              exitDate: "—",
              exitTime: "—",
              extraHours: "—",
              lostHours: "—",
              observations: ["0h → Sin salida"],
            });
            summaryResult[empName].absences++;
          } else {
            // no debería pasar (ya filtrado) pero por seguridad
            analysisResult[empName].push({
              entryDate: dayStr,
              entryTime: "—",
              status: "—",
              exitDate: "—",
              exitTime: "—",
              extraHours: "—",
              lostHours: "—",
              observations: ["Sin registros"],
            });
            summaryResult[empName].absences++;
          }
        }
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      // Procesar cada par del día con la prioridad requerida
      for (const p of pairsForDay) {
        // 1) Salida huérfana -> "0h -> Sin entrada"
        if (!p.entryDate && p.exitDate) {
          const ex = p.exitDate;
          analysisResult[empName].push({
            entryDate: dayStr,
            entryTime: "—",
            status: "—",
            exitDate: formatDate(ex),
            exitTime: formatTime(ex),
            extraHours: "—",
            lostHours: "—",
            observations: ["0h → Sin entrada"],
          });
          summaryResult[empName].absences++;
          continue;
        }

        // 2) Entrada sin salida -> "0h -> Sin salida"
        if (p.entryDate && !p.exitDate) {
          const en = p.entryDate;
          analysisResult[empName].push({
            entryDate: formatDate(en),
            entryTime: formatTime(en),
            status: "—",
            exitDate: "—",
            exitTime: "—",
            extraHours: "—",
            lostHours: "—",
            observations: ["0h → Sin salida"],
          });
          summaryResult[empName].absences++;
          continue;
        }

        // A partir de aquí, p.entryDate y p.exitDate están definidas
        if (p.entryDate && p.exitDate) {
          const entry = p.entryDate;
          const exit = p.exitDate;

          // base de fila
          const row: AnalysisDay = {
            entryDate: formatDate(entry),
            entryTime: formatTime(entry),
            status: "—",
            exitDate: formatDate(exit),
            exitTime: formatTime(exit),
            extraHours: "—",
            lostHours: "—",
            observations: [],
          };

          // Detectar si es paso de día
          const nextDay =
            exit.getDate() !== entry.getDate() ||
            exit.getTime() < entry.getTime();

          // Convertir horarios de schedule a Date para el mismo día que entry (para comparaciones)
          const scheduleStart = new Date(entry);
          scheduleStart.setHours(scheduleStartHour, scheduleStartMinute, 0, 0);
          const scheduleEnd = new Date(entry);
          scheduleEnd.setHours(scheduleEndHour, scheduleEndMinute, 0, 0);

          // Calcular minutos trabajados
          let workedMinutes = Math.floor(
            (exit.getTime() - entry.getTime()) / 60000
          );
          if (workedMinutes < 0) {
            // si exit esta en nextDay y getTime resultó negativo por comparación de fecha (defensivo)
            workedMinutes = Math.floor(
              (exit.getTime() + 24 * 60 * 60000 - entry.getTime()) / 60000
            );
          }

          // ---------- PRIORIDAD DE OBSERVACIONES ESPECIALIZADAS ----------
          const entryHour = entry.getHours();
          const exitHour = exit.getHours();

          // 5) 24h Amanecida: entrada entre 06-08 y salida nextDay entre 06-08
          const is24hAmanecida =
            nextDay &&
            entryHour >= 6 &&
            entryHour <= 8 &&
            exitHour >= 6 &&
            exitHour <= 8;

          // 6) 12h Noche: entrada entre 18-20 y salida nextDay entre 06-08
          const is12hNoche =
            nextDay &&
            entryHour >= 18 &&
            entryHour <= 20 &&
            exitHour >= 6 &&
            exitHour <= 8;

          // 10h/12h día: no se muestran en observaciones (no hacemos nada especial)

          if (is24hAmanecida) {
            // marcar para verificación
            row.observations.push("24h → 24h Amanecida");
            // Segun tu regla: "24h: se cuenta como horas extra completa (total hora extra +12h)"
            // Calculamos horas extra normales y luego sumamos 12h (720 min) adicional.
            const scheduleDurationMin = Math.max(
              0,
              Math.floor(
                (scheduleEnd.getTime() - scheduleStart.getTime()) / 60000
              )
            );
            // extra normal
            const normalExtraMin = Math.max(
              0,
              workedMinutes - scheduleDurationMin
            );
            const extraMin = normalExtraMin + 12 * 60; // +12h en minutos
            row.extraHours = minutesToHoursMinutes(extraMin);
            summaryResult[empName].extraHours += extraMin;

            // Por especificación: para amanecidas siempre marcar hora de entrada y salida y verificar.
            // No calculamos tardanzas ni lostHours en este caso (según prioridad).
            row.lostHours = "—";
            analysisResult[empName].push(row);
            continue;
          } else if (is12hNoche) {
            // marcar turno noche para verificación posterior
            row.observations.push("12h Noche → Turno noche");
            // calcular extras normales si aplica (se deja la regla normal)
            const scheduleEndForExit = new Date(exit);
            scheduleEndForExit.setHours(
              scheduleEndHour,
              scheduleEndMinute,
              0,
              0
            );
            // Si la salida es nextDay, scheduleEndForExit podría quedar en la madrugada
            // pero la comparación de extra será: exit vs scheduleEnd (del día del entry)
            const extraMin = Math.max(
              0,
              Math.floor((exit.getTime() - scheduleEnd.getTime()) / 60000)
            );
            if (extraMin > 0) {
              row.extraHours = minutesToHoursMinutes(extraMin);
              summaryResult[empName].extraHours += extraMin;
            } else {
              row.extraHours = "0h 0m";
            }
            // No calculamos "12h Dia" en observaciones
            row.lostHours = "—";
            analysisResult[empName].push(row);
            continue;
          }

          // ---------- CALCULO NORMAL (solo si no fue Sin entrada/salida ni casos especiales) ----------
          // Tarde / horas perdidas: comparar hora de entrada con scheduleStart
          if (entry.getTime() > scheduleStart.getTime()) {
            row.status = "tarde";
            const lostMin = Math.floor(
              (entry.getTime() - scheduleStart.getTime()) / 60000
            );
            row.lostHours = minutesToHoursMinutes(lostMin);
            summaryResult[empName].lostHours += lostMin;
            summaryResult[empName].lates++;
          } else {
            row.status = "—";
            row.lostHours = "0h 0m";
          }

          // Horas extra: comparar salida con scheduleEnd
          // Si exit es nextDay, scheduleEnd (same-day) estará antes -> extra será positivo
          const extraMin = Math.max(
            0,
            Math.floor((exit.getTime() - scheduleEnd.getTime()) / 60000)
          );
          // Si exit es nextDay, la diferencia ya será >0 y contaría como extra (correcto)
          if (extraMin > 0) {
            row.extraHours = minutesToHoursMinutes(extraMin);
            summaryResult[empName].extraHours += extraMin;
          } else {
            row.extraHours = "0h 0m";
          }

          // Observaciones de duración: 10h/12h día NO se muestran.
          // Si deseas marcar 10h o 12h en otro campo, podrías hacerlo; por ahora no agregamos.
          // Añadir fila final
          analysisResult[empName].push(row);
        }
      } // end for pairsForDay

      cursor.setDate(cursor.getDate() + 1);
    } // end while fechas
  }); // end for employees

  return { analysis: analysisResult, summary: summaryResult };
};
