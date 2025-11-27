export interface Employee {
  type: "operator" | "office";
}

export interface NewEmployee {
  name: string;
  type: "operator" | "office";
}

export type Employees = Record<string, Employee>;

export interface CsvRecord {
  numero: string;
  nombre: string;
  tiempo: string; // "01/11/2025 08:00:00"
  estado: string; // "Entrada" | "Salida" (no se fuerza enum aquí para mantener simple)
  // permite campos adicionales del CSV si existen
  [key: string]: string;
}

export interface AnalysisDay {
  entryDate: string; // "dd/mm/yyyy"
  entryTime: string; // "08:00" o "—"
  status: string; // "—" | "tarde"
  exitDate: string; // "dd/mm/yyyy"
  exitTime: string; // "18:00" o "—"
  extraHours: string; // "0h 0m" o "1h 15m"
  lostHours: string; // "0h 0m" o "-10m"
  schedule: string;
  observations: string[];
}

export type AnalysisResult = Record<string, AnalysisDay[]>;

export interface SummaryItem {
  absences: number;
  lates: number;
  extraHours: number; // en minutos
  lostHours: number; // en minutos
}

export type Summary = Record<string, SummaryItem>;

export interface DateRange {
  start: string; // "dd/mm/yyyy"
  end: string; // "dd/mm/yyyy"
}

export type AppStep = 0 | 1 | 2 | 3 | 4;

export type Pair = {
  entryDate?: Date;
  entryRecordIndex?: number;
  exitDate?: Date;
  exitRecordIndex?: number;
};
