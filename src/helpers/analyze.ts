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
  // minutesToHoursMinutes,
} from "../utils/date";

// ----------------------------------
// Función inicial de análisis
// ----------------------------------
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

  if (startDate > endDate) {
    throw new Error(
      "Rango de fechas inválido. Usa fechas en orden pasado → futuro."
    );
  }

  const analysisResult: AnalysisResult = {};
  const summaryResult: Summary = {};

  // ----------------------------------------
  // 1) Emparejar SOLO registros ADYACENTES
  // Filtra los del empleado
  // Ordena los registros
  // Aagrupa en pares entrada-salida
  // ----------------------------------------
  Object.keys(employees).forEach((empName) => {
    const employee = employees[empName];

    const allRecords = csvData
      .filter((r) => r.nombre === empName)
      .sort(
        (a, b) =>
          parseDateTime(a.tiempo).getTime() - parseDateTime(b.tiempo).getTime()
      );
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
          // entrada sin salida (siguiente es entrada o no existe)
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

    // ----------------------------------------
    // Crear AnalysisDay por pair
    // ----------------------------------------
    const analysisDays: AnalysisDay[] = [];
    pairs.forEach((p) => {
      const day: AnalysisDay = {
        entryDate: p.entryDate ? formatDate(p.entryDate) : "—",
        entryTime: p.entryDate ? formatTime(p.entryDate) : "—",
        status: "—",
        exitDate: p.exitDate ? formatDate(p.exitDate) : "—",
        exitTime: p.exitDate ? formatTime(p.exitDate) : "—",
        extraHours: "0h 0m",
        lostHours: "0h 0m",
        schedule: "-",
        observations: [],
      };

      // marcar fin de semana
      if (p.entryDate && isWeekend(p.entryDate)) {
        day.observations.push("Fin de semana");
      }

      // sin entrada o sin salida
      if (!p.entryDate) day.observations.push("Sin entrada");
      if (!p.exitDate) day.observations.push("Sin salida");

      // ----------------------------------------
      // Determinar schedule
      // ----------------------------------------
      let schedule = "-";

      // fin de semana sin registros
      if (
        (!p.entryDate && !p.exitDate) ||
        (p.entryDate && isWeekend(p.entryDate) && !p.exitDate)
      ) {
        schedule = "—";
      } else if (employee.type === "office") {
        schedule = "08:00 -> 18:00 (10h-dia)";
      } else {
        // operador
        if (p.entryDate && p.exitDate) {
          // duración total en horas
          let hoursWorked =
            (p.exitDate.getTime() - p.entryDate.getTime()) / (1000 * 60 * 60);
          if (hoursWorked < 0) hoursWorked += 24;

          const entryH = p.entryDate.getHours();

          if (hoursWorked >= 20) {
            schedule = "07:00 -> 07:00 (24h)";
          } else if (hoursWorked < 2) {
            schedule =
              entryH < 12
                ? "07:00 -> 19:00 (12h-dia)"
                : "19:00 -> 07:00 (12h-noche)";
          } else {
            schedule =
              entryH < 12
                ? "07:00 -> 19:00 (12h-dia)"
                : "19:00 -> 07:00 (12h-noche)";
          }
        }
        // si no hay entrada o salida, schedule queda "-" y no se infiere nada
      }

      day.schedule = schedule;

      // TODO: calcular tardanzas, horas extra y horas perdidas según turno
      // ej: day.status = "tarde", day.extraHours = minutesToHoursMinutes(...)

      analysisDays.push(day);
    });

    analysisResult[empName] = analysisDays;

    summaryResult[empName] = {
      absences: 0,
      lates: 0,
      extraHours: 0,
      lostHours: 0,
    };
  });

  return { analysis: analysisResult, summary: summaryResult };
};
