import type {
  AnalysisResult,
  Summary,
  Employees,
  DateRange,
  CsvRecord,
  // AnalysisDay,
  Pair,
} from "../types/attendance";

import {
  parseDateTime,
  parseOnlyDate,
  // formatDate,
  // formatTime,
  // isWeekend,
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

    // log simple
    console.log(empName, pairs);

    // guardar pairs en analysisResult (todavía no procesamos extra/lates)
    // analysisResult[empName] = pairs;
  });

  return { analysis: analysisResult, summary: summaryResult };
};
