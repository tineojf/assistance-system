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
    const empSchedule = employees[empName];

    // Filtrar registros del empleado
    const empRecords = csvData.filter((r) => r.nombre === empName);

    analysisResult[empName] = [];
    summaryResult[empName] = {
      totalDays: 0,
      absences: 0,
      lates: 0,
      compliedDays: 0,
      extraHours: 0,
      lostHours: 0,
    };

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = formatDate(currentDate);

      const dayRecords = empRecords.filter((r) => {
        const d = parseDateTime(r.tiempo);
        return formatDate(d) === dateStr;
      });

      const dayAnalysis: AnalysisDay = {
        date: dateStr,
        entryTime: "—",
        status: "—",
        exitTime: "—",
        totalTime: "—",
        extraHours: "—",
        lostHours: "—",
        observations: [],
      };

      // -------------------------
      // Fines de semana
      // -------------------------
      if (isWeekend(currentDate)) {
        dayAnalysis.observations.push("Fin de semana");
      } else {
        summaryResult[empName].totalDays++;

        // -------------------------
        // No hay registros
        // -------------------------
        if (dayRecords.length === 0) {
          dayAnalysis.observations.push("Sin registros");
          summaryResult[empName].absences++;
        } else {
          // Entradas y salidas
          const entries = dayRecords
            .filter((r) => r.estado === "Entrada")
            .map((r) => parseDateTime(r.tiempo));

          const exits = dayRecords
            .filter((r) => r.estado === "Salida")
            .map((r) => parseDateTime(r.tiempo));

          // -------------------------
          // Entrada
          // -------------------------
          if (entries.length === 0) {
            dayAnalysis.observations.push("Faltó entrada");
            summaryResult[empName].absences++;
          } else {
            const entryTime = new Date(Math.min(...entries));
            dayAnalysis.entryTime = formatTime(entryTime);

            const [scheduleStartHour, scheduleStartMin] = empSchedule.start
              .split(":")
              .map(Number);

            const scheduleStart = new Date(entryTime);
            scheduleStart.setHours(scheduleStartHour, scheduleStartMin, 0);

            if (entryTime > scheduleStart) {
              dayAnalysis.status = "tarde";
              summaryResult[empName].lates++;

              const lostMinutes = Math.floor(
                (entryTime.getTime() - scheduleStart.getTime()) / 60000
              );

              summaryResult[empName].lostHours += lostMinutes;
              dayAnalysis.lostHours = minutesToHoursMinutes(lostMinutes);
            } else {
              dayAnalysis.lostHours = "0h 0m";
            }
          }

          // -------------------------
          // Salida
          // -------------------------
          if (exits.length === 0) {
            dayAnalysis.observations.push("Faltó salida");
            summaryResult[empName].absences++;
          } else {
            const exitTime = new Date(Math.max(...exits));
            dayAnalysis.exitTime = formatTime(exitTime);

            if (entries.length > 0) {
              const entry = new Date(Math.min(...entries));

              const totalMinutes = Math.floor(
                (exitTime.getTime() - entry.getTime()) / 60000
              );
              dayAnalysis.totalTime = minutesToHoursMinutes(totalMinutes);

              const [scheduleEndHour, scheduleEndMin] = empSchedule.end
                .split(":")
                .map(Number);

              const scheduleEnd = new Date(exitTime);
              scheduleEnd.setHours(scheduleEndHour, scheduleEndMin, 0);

              // Horas extra
              if (exitTime > scheduleEnd) {
                const extraMinutes = Math.floor(
                  (exitTime.getTime() - scheduleEnd.getTime()) / 60000
                );
                summaryResult[empName].extraHours += extraMinutes;
                dayAnalysis.extraHours = minutesToHoursMinutes(extraMinutes);
              } else {
                dayAnalysis.extraHours = "0h 0m";
              }

              // Día cumplido
              if (
                dayAnalysis.observations.length === 0 &&
                dayAnalysis.status !== "tarde"
              ) {
                summaryResult[empName].compliedDays++;
              }
            }
          }
        }
      }

      // Guardar el análisis del día
      analysisResult[empName].push(dayAnalysis);

      // avanzar día
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  return { analysis: analysisResult, summary: summaryResult };
};
