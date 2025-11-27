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
 * analyzeAttendance (final)
 * - compatible con tus types
 * - formato HH:mm y dd/mm/yyyy
 * - 12h noche: extra = max(0, salida - 07:00)
 * - 24h amanecida: observation + skip days until exit date, extra += normalExtra + 12h (720min)
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

  // Construir pares adyacentes como antes
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
          pairs.push({
            entryDate: recDate,
            entryRecordIndex: i,
            exitDate: undefined,
            exitRecordIndex: undefined,
          });
          i += 1;
        }
      } else {
        // salida huérfana
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

  // helper: stringify day key yyyy-mm-dd for skip set
  const dayKey = (d: Date) => {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // helper: add all calendar days between (startExclusive) and endInclusive to set
  const addSkipRange = (set: Set<string>, fromDate: Date, toDate: Date) => {
    const cur = new Date(fromDate.getTime());
    cur.setDate(cur.getDate() + 1); // start skipping the day after fromDate
    while (cur <= toDate) {
      set.add(dayKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
  };

  Object.keys(employees).forEach((empName) => {
    const schedule = employees[empName];
    const [sH, sM] = schedule.start.split(":").map(Number);
    const [eH, eM] = schedule.end.split(":").map(Number);

    // registros del empleado ordenados
    const allRecords = csvData
      .filter((r) => r.nombre === empName)
      .sort(
        (a, b) =>
          parseDateTime(a.tiempo).getTime() - parseDateTime(b.tiempo).getTime()
      );

    const pairs = buildPairsFor(allRecords);

    // inicializar summary
    summaryResult[empName] = {
      absences: 0,
      lates: 0,
      extraHours: 0, // minutos
      lostHours: 0, // minutos
    };

    analysisResult[empName] = [];

    // set de días a saltar por 24h amanecida (Opción B)
    const skipDates = new Set<string>();

    const cursor = new Date(startDate.getTime());
    while (cursor <= endDate) {
      const cursorKey = dayKey(cursor);
      // si el día está marcado para saltar, avanzar
      if (skipDates.has(cursorKey)) {
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      const dayStr = formatDate(cursor); // dd/mm/yyyy
      const dayStart = parseOnlyDate(dayStr);
      const dayEnd = new Date(dayStart.getTime());
      dayEnd.setHours(23, 59, 59, 999);

      // todos los registros en ese día
      const dayRecords = allRecords.filter((r) => {
        const d = parseDateTime(r.tiempo);
        return d >= dayStart && d <= dayEnd;
      });

      // 1) Sin registros (prioridad)
      if (dayRecords.length === 0) {
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

      // pares cuya entrada cae ese día OR salida huérfana cuya salida cae ese día
      const pairsForDay = pairs.filter((p) => {
        if (!p.entryDate && p.exitDate) {
          return formatDate(p.exitDate) === dayStr;
        }
        if (p.entryDate) {
          return formatDate(p.entryDate) === dayStr;
        }
        return false;
      });

      // fallback si no hay pares (pero hay registros)
      if (pairsForDay.length === 0) {
        const orphanExits = dayRecords.filter((r) => r.estado === "Salida");
        if (orphanExits.length > 0) {
          orphanExits.forEach((oe) => {
            const ex = parseDateTime(oe.tiempo);
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
          });
        } else {
          const firstEntry = dayRecords.find((r) => r.estado === "Entrada");
          if (firstEntry) {
            const e = parseDateTime(firstEntry.tiempo);
            analysisResult[empName].push({
              entryDate: dayStr,
              entryTime: formatTime(e),
              status: "—",
              exitDate: "—",
              exitTime: "—",
              extraHours: "—",
              lostHours: "—",
              observations: ["0h → Sin salida"],
            });
            summaryResult[empName].absences++;
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
        }
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      // Procesar cada par del día
      for (const p of pairsForDay) {
        // salida huérfana
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

        // entrada sin salida
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

        // caso normal
        if (p.entryDate && p.exitDate) {
          const entry = p.entryDate;
          const exit = p.exitDate;

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

          // flags
          const entryHour = entry.getHours();
          const exitHour = exit.getHours();
          const nextDay =
            exit.getDate() !== entry.getDate() ||
            exit.getTime() < entry.getTime();

          // schedule Date objects on entry's day for comparison
          const scheduleStart = new Date(entry);
          scheduleStart.setHours(sH, sM, 0, 0);
          const scheduleEnd = new Date(entry);
          scheduleEnd.setHours(eH, eM, 0, 0);

          // minutos trabajados (defensivo si exit < entry)
          let workedMin = Math.floor(
            (exit.getTime() - entry.getTime()) / 60000
          );
          if (workedMin < 0) {
            workedMin = Math.floor(
              (exit.getTime() + 24 * 60 * 60000 - entry.getTime()) / 60000
            );
          }

          // Detectar 24h amanecida:
          const is24hAmanecida =
            nextDay &&
            entryHour >= 6 &&
            entryHour <= 8 &&
            exitHour >= 6 &&
            exitHour <= 8;

          // Detectar 12h noche: según confirmación el turno noche es 19:00 → 07:00 siguiente
          const is12hNoche =
            nextDay &&
            entryHour >= 19 &&
            entryHour <= 20 &&
            exitHour >= 6 &&
            exitHour <= 8;

          // 24h Amanecida handling
          if (is24hAmanecida) {
            row.observations.push("24h → Amanecida");

            // calcular duración jornada (en minutos) basado en schedule (puede ser negativa si schedule end < start)
            let scheduleDurationMin = Math.floor(
              (scheduleEnd.getTime() - scheduleStart.getTime()) / 60000
            );
            if (scheduleDurationMin < 0) {
              // si por ejemplo schedule empieza 20:00 y termina 08:00 (raro), ajustar sumando 24h
              scheduleDurationMin += 24 * 60;
            }
            const normalExtraMin = Math.max(0, workedMin - scheduleDurationMin);
            const extraMin = normalExtraMin + 12 * 60; // +12h (720 min)
            row.extraHours = minutesToHoursMinutes(extraMin);
            row.lostHours = "—";
            summaryResult[empName].extraHours += extraMin;

            // marcar los días a saltar desde entry hasta exit (Opción B)
            addSkipRange(skipDates, entry, exit);

            analysisResult[empName].push(row);
            continue;
          }

          // 12h Noche handling
          if (is12hNoche) {
            row.observations.push("12h Noche → Turno noche");

            // calcular extra: extra = max(0, salida - 07:00)
            const exitAsDate = exit;
            // crear 07:00 del día de la salida
            const sevenDate = new Date(exitAsDate);
            sevenDate.setHours(7, 0, 0, 0);
            let extraMin = Math.max(
              0,
              Math.floor((exitAsDate.getTime() - sevenDate.getTime()) / 60000)
            );
            if (extraMin < 0) extraMin = 0;

            if (extraMin > 0) {
              row.extraHours = minutesToHoursMinutes(extraMin);
              summaryResult[empName].extraHours += extraMin;
            } else {
              row.extraHours = "0h 0m";
            }

            // No calculamos lostHours/tardanzas para turno noche según reglas previas
            row.lostHours = "—";
            analysisResult[empName].push(row);
            continue;
          }

          // Cálculo normal (no especiales)
          // tardanza: entrada > scheduleStart
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

          // extra: salida > scheduleEnd (considerando nextDay case)
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

          analysisResult[empName].push(row);
        }
      } // end pairsForDay loop

      cursor.setDate(cursor.getDate() + 1);
    } // end cursor loop
  }); // end employees loop

  return { analysis: analysisResult, summary: summaryResult };
};
