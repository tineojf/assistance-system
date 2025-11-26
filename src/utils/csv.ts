import type { CsvRecord } from "../types/attendance";

/**
 * Parsea un CSV de asistencia con formato:
 * Número,Nombre,Tiempo,Estado,Dispositivos,Tipo de Registro
 */
export const parseCSV = (text: string): CsvRecord[] => {
  const lines = text.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("CSV vacío o inválido");
  }

  // Headers esperados (solo para validación simple)
  const expectedHeaders = [
    "Número",
    "Nombre",
    "Tiempo",
    "Estado",
    "Dispositivos",
    "Tipo de Registro",
  ];

  const headerLine = lines[0].split(",").map((h) => h.trim());
  if (headerLine.length < 4) {
    throw new Error("El CSV no contiene las columnas mínimas requeridas.");
  }

  const data: CsvRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());

    if (values.length >= 4) {
      const [numero, nombre, tiempo, estado] = values;

      data.push({
        numero,
        nombre,
        tiempo,
        estado,
      });
    }
  }

  return data;
};
