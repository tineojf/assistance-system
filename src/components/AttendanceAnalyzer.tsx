import { useState } from "react";
import {
  Upload,
  Download,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import type {
  CsvRecord,
  Employees,
  NewEmployee,
  DateRange,
  AppStep,
  AnalysisResult,
  Summary,
} from "../types/attendance";

import { parseCSV } from "../utils/csv";
import { minutesToHoursMinutes } from "../utils/date";
import { exportToExcel } from "../utils/excel";

import { analyzeAttendance } from "../helpers/analyze";
import {
  addEmployee,
  deleteEmployee,
  saveEmployee,
} from "../helpers/employees";

const AttendanceAnalyzer = () => {
  // -----------------------------
  // Estados globales
  // -----------------------------
  const [step, setStep] = useState<AppStep>(0);
  const [csvData, setCsvData] = useState<CsvRecord[]>([]);

  const [employees, setEmployees] = useState<Employees>({
    "Elizabeth 1": { start: "08:00", end: "18:00" },
    "Orlando 3": { start: "08:00", end: "18:00" },
    "Nicole 13": { start: "08:00", end: "18:00" },
    "Principe 2": { start: "07:00", end: "19:00" },
    "Chino 4": { start: "07:00", end: "19:00" },
    "Mendez 6": { start: "07:00", end: "19:00" },
    "Vallejo 7": { start: "07:00", end: "19:00" },
    "Juan 10": { start: "07:00", end: "19:00" },
    "Teofilo 11": { start: "07:00", end: "19:00" },
    "Edgar 14": { start: "07:00", end: "19:00" },
  });

  const [dateRange, setDateRange] = useState<DateRange>({
    start: "01/11/2025",
    end: "15/11/2025",
  });

  const [analysis, setAnalysis] = useState<AnalysisResult>({});
  const [summary, setSummary] = useState<Summary>({});
  const [error, setError] = useState("");

  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);

  const [newEmployee, setNewEmployee] = useState<NewEmployee>({
    name: "",
    start: "07:00",
    end: "19:00",
  });

  const [openEmployee, setOpenEmployee] = useState<string | null>(null);

  const toggleEmployee = (name: string) => {
    setOpenEmployee(openEmployee === name ? null : name);
  };

  // -----------------------------
  // Subir CSV
  // -----------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const records = parseCSV(text);

        if (records.length > 100000) {
          setError(
            "Advertencia: El archivo contiene más de 100,000 registros. El procesamiento puede ser lento."
          );
        }

        setCsvData(records);
        setError("");
        setStep(1);
      } catch (err: Error | unknown) {
        setError(`Error al procesar CSV: ${(err as Error).message}`);
      }
    };

    reader.readAsText(file);
  };

  // -----------------------------
  // Ejecutar análisis
  // -----------------------------
  const runAnalysis = () => {
    try {
      const result = analyzeAttendance(employees, csvData, dateRange);
      setAnalysis(result.analysis);
      setSummary(result.summary);
      setStep(3);
    } catch (err: Error | unknown) {
      setError(`Error en el análisis: ${(err as Error).message}`);
    }
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Sistema de Análisis de Asistencia Laboral
          </h1>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {["Cargar CSV", "Empleados", "Fechas", "Análisis", "Resumen"].map(
                (label, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 text-center ${
                      idx <= step
                        ? "text-blue-600 font-semibold"
                        : "text-gray-400"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center ${
                        idx <= step ? "bg-blue-600 text-white" : "bg-gray-300"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-xs">{label}</span>
                  </div>
                )
              )}
            </div>

            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-600 rounded-full transition-all"
                style={{ width: `${(step / 4) * 100}%` }}
              ></div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* STEP 0 - Subir CSV */}
          {step === 0 && (
            <div className="text-center py-12">
              <Upload className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h2 className="text-2xl font-semibold mb-4">
                Cargar archivo CSV
              </h2>
              <p className="text-gray-600 mb-6">
                Seleccione un archivo CSV con los registros de asistencia
              </p>

              <label className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-blue-700 transition">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                Seleccionar archivo
              </label>
            </div>
          )}

          {/* STEP 1 - Empleados */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Lista de Empleados y Horarios
              </h2>

              {/* Agregar empleado */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                <input
                  type="text"
                  value={newEmployee.name}
                  placeholder="Nombre"
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, name: e.target.value })
                  }
                  className="border rounded px-3 py-2"
                />

                <input
                  type="time"
                  value={newEmployee.start}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, start: e.target.value })
                  }
                  className="border rounded px-3 py-2"
                />

                <input
                  type="time"
                  value={newEmployee.end}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, end: e.target.value })
                  }
                  className="border rounded px-3 py-2"
                />

                <button
                  onClick={() => {
                    const result = addEmployee(employees, newEmployee);
                    if (result.error) setError(result.error);
                    else {
                      setEmployees(result.updated);
                      setNewEmployee({
                        name: "",
                        start: "07:00",
                        end: "19:00",
                      });
                      setError("");
                    }
                  }}
                  className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-1" /> Agregar
                </button>
              </div>

              {/* Tabla empleados */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Empleado</th>
                      <th className="border p-2 text-center">Hora Inicio</th>
                      <th className="border p-2 text-center">Hora Fin</th>
                      <th className="border p-2 text-center">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {Object.keys(employees).map((name) => {
                      const emp = employees[name];

                      return (
                        <tr key={name}>
                          {editingEmployee === name ? (
                            <>
                              <td className="border p-2">
                                <input
                                  id={`name-${name}`}
                                  defaultValue={name}
                                  className="border rounded px-2 py-1 w-full"
                                />
                              </td>

                              <td className="border p-2">
                                <input
                                  id={`start-${name}`}
                                  type="time"
                                  defaultValue={emp.start}
                                  className="border rounded px-2 py-1 w-full"
                                />
                              </td>

                              <td className="border p-2">
                                <input
                                  id={`end-${name}`}
                                  type="time"
                                  defaultValue={emp.end}
                                  className="border rounded px-2 py-1 w-full"
                                />
                              </td>

                              <td className="border p-2 text-center">
                                <button
                                  onClick={() => {
                                    const newName = (
                                      document.getElementById(
                                        `name-${name}`
                                      ) as HTMLInputElement
                                    ).value;

                                    const start = (
                                      document.getElementById(
                                        `start-${name}`
                                      ) as HTMLInputElement
                                    ).value;

                                    const end = (
                                      document.getElementById(
                                        `end-${name}`
                                      ) as HTMLInputElement
                                    ).value;

                                    const updated = saveEmployee(
                                      employees,
                                      name,
                                      {
                                        name: newName,
                                        start,
                                        end,
                                      }
                                    );

                                    setEmployees(updated);
                                    setEditingEmployee(null);
                                  }}
                                  className="text-green-600 hover:text-green-800 mr-2"
                                >
                                  <Check className="w-5 h-5 inline" />
                                </button>

                                <button
                                  onClick={() => setEditingEmployee(null)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="w-5 h-5 inline" />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="border p-2">{name}</td>
                              <td className="border p-2 text-center">
                                {emp.start}
                              </td>
                              <td className="border p-2 text-center">
                                {emp.end}
                              </td>
                              <td className="border p-2 text-center">
                                <button
                                  onClick={() => setEditingEmployee(name)}
                                  className="text-blue-600 hover:text-blue-800 mr-2"
                                >
                                  <Edit2 className="w-5 h-5 inline" />
                                </button>

                                <button
                                  onClick={() => {
                                    const updated = deleteEmployee(
                                      employees,
                                      name
                                    );
                                    setEmployees(updated);
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-5 h-5 inline" />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 2 - Fechas */}
          {step === 2 && (
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-semibold mb-4">
                Seleccionar Rango de Fechas
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fecha de Inicio (dd/mm/yyyy)
                  </label>
                  <input
                    type="text"
                    placeholder="01/11/2025"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, start: e.target.value })
                    }
                    className="border rounded px-3 py-2 w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fecha de Fin (dd/mm/yyyy)
                  </label>
                  <input
                    type="text"
                    placeholder="30/11/2025"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, end: e.target.value })
                    }
                    className="border rounded px-3 py-2 w-full"
                  />
                </div>

                <p className="text-sm text-gray-600">
                  * Los sábados y domingos se excluyen del análisis laboral
                </p>
                <p className="text-sm text-gray-600">
                  * Los feriados no se consideran en este análisis
                </p>
              </div>
            </div>
          )}

          {/* STEP 3 - Análisis */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Análisis por Empleado
              </h2>

              <div className="space-y-8">
                {Object.keys(analysis).map((empName) => {
                  const days = analysis[empName];
                  const isOpen = openEmployee === empName;

                  return (
                    <div key={empName} className="border rounded-lg">
                      {/* Header — botón para desplegar */}
                      <button
                        onClick={() => toggleEmployee(empName)}
                        className="w-full text-left p-4 flex justify-between items-center"
                      >
                        <h3 className="text-xl font-semibold">{empName}</h3>
                        <span>{isOpen ? "▲" : "▼"}</span>
                      </button>

                      {/* Contenido del acordeón */}
                      {isOpen && (
                        <div className="p-4 border-t">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border p-2">Fecha Entrada</th>
                                  <th className="border p-2">Hora Entrada</th>
                                  <th className="border p-2">Estado</th>
                                  <th className="border p-2">Fecha Salida</th>
                                  <th className="border p-2">Hora Salida</th>
                                  <th className="border p-2">Horas Extras</th>
                                  <th className="border p-2">Horas Perdidas</th>
                                  <th className="border p-2">Observaciones</th>
                                </tr>
                              </thead>

                              <tbody>
                                {days.map((day, idx) => (
                                  <tr
                                    key={idx}
                                    className={
                                      day.observations.includes("Fin de semana")
                                        ? "bg-gray-50"
                                        : ""
                                    }
                                  >
                                    <td className="border p-2 text-center">
                                      {day.entryDate}
                                    </td>
                                    <td className="border p-2 text-center">
                                      {day.entryTime}
                                    </td>
                                    <td className="border p-2 text-center">
                                      {day.status}
                                    </td>
                                    <td className="border p-2 text-center">
                                      {day.exitDate}
                                    </td>
                                    <td className="border p-2 text-center">
                                      {day.exitTime}
                                    </td>
                                    <td className="border p-2 text-center">
                                      {day.extraHours}
                                    </td>
                                    <td className="border p-2 text-center">
                                      {day.lostHours}
                                    </td>
                                    <td className="border p-2 text-center">
                                      {day.observations.join(", ")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4 - Resumen */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Resumen General</h2>

              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Trabajador</th>
                      <th className="border p-2">Inasistencias</th>
                      <th className="border p-2">Tardanzas</th>
                      <th className="border p-2">Horas Extra</th>
                      <th className="border p-2">Horas Perdidas</th>
                      <th className="border p-2">Diferencia</th>
                    </tr>
                  </thead>

                  <tbody>
                    {Object.keys(summary).map((empName) => {
                      const s = summary[empName];
                      const diff = s.extraHours - s.lostHours;

                      return (
                        <tr key={empName}>
                          <td className="border p-2 text-center">{empName}</td>

                          <td className="border p-2 text-center">
                            {s.absences}
                          </td>
                          <td className="border p-2 text-center">{s.lates}</td>
                          <td className="border p-2 text-center">
                            {minutesToHoursMinutes(s.extraHours)}
                          </td>
                          <td className="border p-2 text-center">
                            {minutesToHoursMinutes(s.lostHours)}
                          </td>

                          <td
                            className={`border p-2 text-center font-semibold ${
                              diff >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {diff >= 0 ? "+" : ""}
                            {minutesToHoursMinutes(diff)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => exportToExcel(analysis, summary)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center mx-auto"
              >
                <Download className="w-5 h-5 mr-2" />
                Descargar Excel
              </button>
            </div>
          )}

          {/* Navegación */}
          {step > 0 && (
            <div className="flex justify-between mt-8">
              <button
                onClick={() =>
                  setStep((prev) => Math.max(0, prev - 1) as AppStep)
                }
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 flex items-center"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Anterior
              </button>

              {step < 4 && (
                <button
                  onClick={() => {
                    if (step === 2) runAnalysis();
                    else setStep((step + 1) as AppStep);
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  Siguiente
                  <ChevronRight className="w-5 h-5 ml-1" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceAnalyzer;
