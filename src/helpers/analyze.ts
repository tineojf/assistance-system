import type {
  AnalysisResult,
  Summary,
  Employees,
  DateRange,
  CsvRecord,
  AnalysisDay,
  Pair,
  SummaryItem,
} from "../types/attendance";

import {
  parseDateTime,
  parseOnlyDate,
  formatDate,
  formatTime,
  isWeekend,
} from "../utils/date";

// ----------------------------------
// Función de análisis de asistencia
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
  // Agrupa en pares entrada-salida
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
    // Crear AnalysisDay por cada pair
    // ----------------------------------------
    const analysisDays: AnalysisDay[] = [];
    const summary: SummaryItem = {
      absences: 0,
      lates: 0,
      extraHours: 0,
      lostHours: 0,
    };

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

      // Fin de semana
      if (p.entryDate && isWeekend(p.entryDate)) {
        day.observations.push("Fin de semana");
      }

      // Registros incompletos
      if (!p.entryDate) {
        day.observations.push("Sin entrada");
        summary.absences++;
      }
      if (!p.exitDate) {
        day.observations.push("Sin salida");
        summary.absences++;
      }

      // ----------------------------------------
      // Determinar schedule
      // ----------------------------------------
      let schedule = "-";
      if (
        (!p.entryDate && !p.exitDate) ||
        (p.entryDate && isWeekend(p.entryDate) && !p.exitDate)
      ) {
        schedule = "—";
      } else if (employee.type === "office") {
        schedule = "08:00 -> 18:00 (10h-dia)";
      } else if (p.entryDate && p.exitDate) {
        const entryH = p.entryDate.getHours();
        let hoursWorked =
          (p.exitDate.getTime() - p.entryDate.getTime()) / (1000 * 60 * 60);
        if (hoursWorked < 0) hoursWorked += 24;

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

      day.schedule = schedule;

      // ----------------------------------------
      // Calcular horas extra, perdidas y status
      // ----------------------------------------
      if (p.entryDate && p.exitDate && schedule !== "—") {
        let shiftHours = 0;
        switch (schedule) {
          case "08:00 -> 18:00 (10h-dia)":
            shiftHours = 10;
            break;
          case "07:00 -> 19:00 (12h-dia)":
          case "19:00 -> 07:00 (12h-noche)":
            shiftHours = 12;
            break;
          case "07:00 -> 07:00 (24h)":
            shiftHours = 24;
            break;
        }

        let hoursWorked =
          (p.exitDate.getTime() - p.entryDate.getTime()) / (1000 * 60 * 60);
        if (hoursWorked < 0) hoursWorked += 24;

        let extraMinutes = 0;
        let lostMinutes = 0;
        if (hoursWorked > shiftHours)
          extraMinutes = Math.round((hoursWorked - shiftHours) * 60);
        else if (hoursWorked < shiftHours)
          lostMinutes = Math.round((shiftHours - hoursWorked) * 60);

        day.extraHours = `${Math.floor(extraMinutes / 60)}h ${
          extraMinutes % 60
        }m`;
        day.lostHours = `${Math.floor(lostMinutes / 60)}h ${lostMinutes % 60}m`;

        summary.extraHours += extraMinutes;
        summary.lostHours += lostMinutes;

        // Status: tarde si llega después de hora de inicio + 5 min
        let status = "—";
        if (schedule !== "07:00 -> 07:00 (24h)") {
          const startHour = schedule.startsWith("07:00")
            ? 7
            : schedule.startsWith("08:00")
            ? 8
            : 19;
          const scheduledMinutes = startHour * 60;
          const entryMinutes =
            p.entryDate.getHours() * 60 + p.entryDate.getMinutes();
          if (entryMinutes > scheduledMinutes) {
            status = "tarde";
            summary.lates++;
          }
        }
        day.status = status;
      }

      analysisDays.push(day);
    });

    analysisResult[empName] = analysisDays;
    summaryResult[empName] = summary;

    console.log("Analisis:", analysisDays);
  });

  return { analysis: analysisResult, summary: summaryResult };
};
