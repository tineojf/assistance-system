import * as XLSX from "xlsx";
import type { AnalysisResult, Summary } from "../types/attendance";
import { minutesToHoursMinutes } from "./date";

/**
 * Exporta el análisis y el resumen a un archivo Excel.
 */
export const exportToExcel = (
  analysis: AnalysisResult,
  summary: Summary
): void => {
  const wb = XLSX.utils.book_new();

  // -----------------------------
  // Hoja 1: Análisis por empleado
  // -----------------------------
  const analysisData: (string | number)[][] = [];

  Object.keys(analysis).forEach((empName) => {
    analysisData.push([empName]);
    analysisData.push([
      "Fecha",
      "Hora Entrada",
      "Estado",
      "Hora Salida",
      "Tiempo Total",
      "Horas Extras",
      "Horas Perdidas",
      "Observaciones",
    ]);

    analysis[empName].forEach((day) => {
      analysisData.push([
        day.date,
        day.entryTime,
        day.status,
        day.exitTime,
        day.totalTime,
        day.extraHours,
        day.lostHours,
        day.observations.join(", "),
      ]);
    });

    analysisData.push([]); // línea de separación
  });

  const ws1 = XLSX.utils.aoa_to_sheet(analysisData);
  XLSX.utils.book_append_sheet(wb, ws1, "Análisis por Empleado");

  // -----------------------------
  // Hoja 2: Resumen General
  // -----------------------------
  const summaryData: (string | number)[][] = [
    [
      "Trabajador",
      "Días Totales",
      "Inasistencias",
      "Tardanzas",
      "Días Cumplidos",
      "Horas Extra",
      "Horas Perdidas",
      "Diferencia",
    ],
  ];

  Object.keys(summary).forEach((empName) => {
    const s = summary[empName];
    const diff = s.extraHours - s.lostHours;

    summaryData.push([
      empName,
      s.totalDays,
      s.absences,
      s.lates,
      s.compliedDays,
      minutesToHoursMinutes(s.extraHours),
      minutesToHoursMinutes(s.lostHours),
      (diff >= 0 ? "+" : "") + minutesToHoursMinutes(diff),
    ]);
  });

  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws2, "Resumen General");

  // Guardar archivo
  XLSX.writeFile(wb, "analisis_asistencia.xlsx");
};
