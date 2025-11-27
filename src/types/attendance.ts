export type Employee = {
  start: string; // "08:00"
  end: string; // "18:00"
};

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
  observations: string[];
  totalTime: string; // "8h 0m" o "—" -- delete
  date: string; // "dd/mm/yyyy" -- delete
}

export type AnalysisResult = Record<string, AnalysisDay[]>;

export interface SummaryItem {
  totalDays: number;
  absences: number;
  lates: number;
  compliedDays: number;
  extraHours: number; // en minutos
  lostHours: number; // en minutos
}

export type Summary = Record<string, SummaryItem>;

export interface DateRange {
  start: string; // "dd/mm/yyyy"
  end: string; // "dd/mm/yyyy"
}

export interface NewEmployee {
  name: string;
  start: string;
  end: string;
}

export type AppStep = 0 | 1 | 2 | 3 | 4;
