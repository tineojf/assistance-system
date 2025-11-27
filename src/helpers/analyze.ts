import type {
  AnalysisResult,
  Summary,
  Employees,
  DateRange,
  CsvRecord,
  AnalysisDay,
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
 * Realiza el análisis completo de asistencia.
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

  Object.keys(employees).forEach((empName) => {
    const schedule = employees[empName];

    // todos los registros del empleado, ordenados cronológicamente
    const allRecords = csvData
      .filter((r) => r.nombre === empName)
      .sort(
        (a, b) =>
          parseDateTime(a.tiempo).getTime() - parseDateTime(b.tiempo).getTime()
      );

    summaryResult[empName] = {
      absences: 0,
      lates: 0,
      extraHours: 0,
      lostHours: 0,
    };
    analysisResult[empName] = [];

    // 1) Emparejar SOLO registros ADYACENTES según la regla que diste
    type Pair = {
      entryDate?: Date;
      entryRecordIndex?: number;
      exitDate?: Date;
      exitRecordIndex?: number;
      orphanExit?: boolean; // salida sin entrada
    };
    const pairs: Pair[] = [];

    let i = 0;
    while (i < allRecords.length) {
      const rec = allRecords[i];
      const recDate = parseDateTime(rec.tiempo);

      if (rec.estado === "Entrada") {
        // si el siguiente existe y es Salida -> emparejar
        if (
          i + 1 < allRecords.length &&
          allRecords[i + 1].estado === "Salida"
        ) {
          pairs.push({
            entryDate: recDate,
            entryRecordIndex: i,
            exitDate: parseDateTime(allRecords[i + 1].tiempo),
            exitRecordIndex: i + 1,
          });
          i += 2; // consumimos ambos registros
        } else {
          // entrada sin salida inmediata (siguiente es entrada o no existe)
          pairs.push({
            entryDate: recDate,
            entryRecordIndex: i,
            exitDate: undefined,
            exitRecordIndex: undefined,
          });
          i += 1;
        }
      } else {
        // rec.estado === "Salida" -> salida sin entrada previa emparejada
        pairs.push({
          entryDate: undefined,
          entryRecordIndex: undefined,
          exitDate: recDate,
          exitRecordIndex: i,
          orphanExit: true,
        });
        i += 1;
      }
    }

    // 2) Mapear pares al rango de fechas y construir filas por día
    const cursor = new Date(startDate.getTime());
    while (cursor <= endDate) {
      const dayStr = formatDate(cursor);
      const dayStart = parseOnlyDate(dayStr);
      const dayEnd = new Date(dayStart.getTime());
      dayEnd.setHours(23, 59, 59, 999);

      // encontrar pares cuya entrada cae este día OR orphanExit cuya salida cae este día
      const pairsForDay = pairs.filter((p) => {
        if (p.orphanExit && p.exitDate) {
          return formatDate(p.exitDate) === dayStr;
        }
        if (p.entryDate) {
          return formatDate(p.entryDate) === dayStr;
        }
        return false;
      });

      // Base de fila
      if (isWeekend(cursor) && pairsForDay.length === 0) {
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
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      // si no hay registros en el día
      const anyRecordInDay = allRecords.some((r) => {
        const d = parseDateTime(r.tiempo);
        return d >= dayStart && d <= dayEnd;
      });
      if (!anyRecordInDay) {
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
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      // Procesar cada par del día (normalmente 1, pero puede haber varios)
      if (pairsForDay.length === 0) {
        // fallback: si hay registros pero no pares filtrados (raro) -> marcar según registros sueltos
        const dayRecs = allRecords.filter((r) => {
          const d = parseDateTime(r.tiempo);
          return d >= dayStart && d <= dayEnd;
        });
        // salidas sueltas
        const orphanExits = dayRecs.filter((r) => r.estado === "Salida");
        if (orphanExits.length > 0) {
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
          // primera entrada sin salida
          const firstEntry = dayRecs.find((r) => r.estado === "Entrada");
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

      // Para cada par del día construir la fila
      for (const p of pairsForDay) {
        // salida huérfana
        if (p.orphanExit && p.exitDate) {
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

        // caso normal: entrada + salida adyacentes
        if (p.entryDate && p.exitDate) {
          const entry = p.entryDate;
          const exit = p.exitDate;

          // construir fila base
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

          // Tarde / horas perdidas (comparar con schedule.start)
          const [sH, sM] = schedule.start.split(":").map(Number);
          const scheduleStart = new Date(entry);
          scheduleStart.setHours(sH, sM, 0, 0);
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

          // Horas extras (comparar con schedule.end)
          const [eH, eM] = schedule.end.split(":").map(Number);
          const scheduleEnd = new Date(exit);
          scheduleEnd.setHours(eH, eM, 0, 0);
          if (exit.getTime() > scheduleEnd.getTime()) {
            const extraMin = Math.floor(
              (exit.getTime() - scheduleEnd.getTime()) / 60000
            );
            row.extraHours = minutesToHoursMinutes(extraMin);
            summaryResult[empName].extraHours += extraMin;
          } else {
            row.extraHours = "0h 0m";
          }

          // Detección de 24h / 12h noche (Opción A)
          const entryHour = entry.getHours();
          const exitHour = exit.getHours();
          const nextDay = exit.getDate() !== entry.getDate();
          if (
            entryHour >= 6 &&
            entryHour <= 8 &&
            nextDay &&
            exitHour >= 6 &&
            exitHour <= 8
          ) {
            row.observations.push("24h → Amanecida");
          } else if (
            entryHour >= 18 &&
            entryHour <= 20 &&
            nextDay &&
            exitHour >= 6 &&
            exitHour <= 8
          ) {
            row.observations.push("12h → Noche");
          }

          analysisResult[empName].push(row);
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    } // end while days
  }); // end for employees

  return { analysis: analysisResult, summary: summaryResult };
};
