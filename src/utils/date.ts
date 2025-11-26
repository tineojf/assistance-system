/**
 * Convierte "01/11/2025 08:00:00" en un objeto Date.
 */
export const parseDateTime = (dateTimeStr: string): Date => {
  const [datePart, timePart] = dateTimeStr.split(" ");

  const [day, month, year] = datePart.split("/").map(Number);
  const [hours, minutes, seconds] = timePart.split(":").map(Number);

  return new Date(year, month - 1, day, hours, minutes, seconds);
};

/**
 * Convierte "01/11/2025" en Date.
 */
export const parseOnlyDate = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Formatea Date → "dd/mm/yyyy"
 */
export const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Formatea Date → "HH:mm"
 */
export const formatTime = (date: Date): string => {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

/**
 * Verifica si una fecha es sábado o domingo.
 */
export const isWeekend = (date: Date): boolean => {
  const d = date.getDay();
  return d === 0 || d === 6;
};

/**
 * Convierte minutos → "Xh Ym"
 * Ej: 135 → "2h 15m", -20 → "-0h 20m"
 */
export const minutesToHoursMinutes = (minutes: number): string => {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? "-" : "";
  return `${sign}${h}h ${m}m`;
};
