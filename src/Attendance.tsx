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
import * as XLSX from "xlsx";

const AttendanceAnalyzer = () => {
  const [step, setStep] = useState(0);
  const [csvData, setCsvData] = useState([]);
  const [employees, setEmployees] = useState({
    "Elizabeth 1": { start: "08:00", end: "18:00" },
    "Principe 2": { start: "07:00", end: "19:00" },
    "Orlando 3": { start: "08:00", end: "18:00" },
    "Chino 4": { start: "07:00", end: "19:00" },
    "Mendez 6": { start: "07:00", end: "19:00" },
    "Vallejo 7": { start: "07:00", end: "19:00" },
    "Juan 10": { start: "07:00", end: "19:00" },
    "Teofilo 11": { start: "07:00", end: "19:00" },
    "Nicole 13": { start: "08:00", end: "18:00" },
    "Edgar 14": { start: "07:00", end: "19:00" },
  });
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [analysis, setAnalysis] = useState({});
  const [summary, setSummary] = useState({});
  const [error, setError] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    start: "08:00",
    end: "18:00",
  });

  const parseCSV = (text) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) throw new Error("CSV vacío o inválido");

    const headers = lines[0].split(",").map((h) => h.trim());
    const expectedHeaders = [
      "Número",
      "Nombre",
      "Tiempo",
      "Estado",
      "Dispositivos",
      "Tipo de Registro",
    ];

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length >= 4) {
        const [numero, nombre, tiempo, estado] = values;
        data.push({ numero, nombre, tiempo, estado });
      }
    }

    return data;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const data = parseCSV(text);

        if (data.length > 100000) {
          setError(
            "Advertencia: El archivo contiene más de 100,000 registros. El procesamiento puede ser lento."
          );
        }

        setCsvData(data);
        setError("");
        setStep(1);
      } catch (err) {
        setError(`Error al procesar CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const parseDateTime = (dateTimeStr) => {
    const [datePart, timePart] = dateTimeStr.split(" ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours, minutes, seconds] = timePart.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  };

  const parseDate = (dateStr) => {
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date) => {
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const minutesToHoursMinutes = (minutes) => {
    const h = Math.floor(Math.abs(minutes) / 60);
    const m = Math.abs(minutes) % 60;
    const sign = minutes < 0 ? "-" : "";
    return `${sign}${h}h ${m}m`;
  };

  const analyzeAttendance = () => {
    if (!dateRange.start || !dateRange.end) {
      setError("Debe seleccionar un rango de fechas válido");
      return;
    }

    try {
      const startDate = parseDate(dateRange.start);
      const endDate = parseDate(dateRange.end);

      const analysisResult = {};
      const summaryResult = {};

      Object.keys(employees).forEach((empName) => {
        const empSchedule = employees[empName];
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
            const recordDate = parseDateTime(r.tiempo);
            return formatDate(recordDate) === dateStr;
          });

          const dayAnalysis = {
            date: dateStr,
            entryTime: "—",
            status: "—",
            exitTime: "—",
            totalTime: "—",
            extraHours: "—",
            lostHours: "—",
            observations: [],
          };

          if (isWeekend(currentDate)) {
            dayAnalysis.observations.push("Fin de semana");
          } else {
            summaryResult[empName].totalDays++;

            if (dayRecords.length === 0) {
              dayAnalysis.observations.push("Sin registros");
              summaryResult[empName].absences++;
            } else {
              const entries = dayRecords
                .filter((r) => r.estado === "Entrada")
                .map((r) => parseDateTime(r.tiempo));
              const exits = dayRecords
                .filter((r) => r.estado === "Salida")
                .map((r) => parseDateTime(r.tiempo));

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
                    (entryTime - scheduleStart) / 60000
                  );
                  summaryResult[empName].lostHours += lostMinutes;
                  dayAnalysis.lostHours = minutesToHoursMinutes(lostMinutes);
                } else {
                  dayAnalysis.lostHours = "0h 0m";
                }
              }

              if (exits.length === 0) {
                dayAnalysis.observations.push("Faltó salida");
                summaryResult[empName].absences++;
              } else {
                const exitTime = new Date(Math.max(...exits));
                dayAnalysis.exitTime = formatTime(exitTime);

                if (entries.length > 0 && exits.length > 0) {
                  const entryTime = new Date(Math.min(...entries));
                  const totalMinutes = Math.floor(
                    (exitTime - entryTime) / 60000
                  );
                  dayAnalysis.totalTime = minutesToHoursMinutes(totalMinutes);

                  const [scheduleEndHour, scheduleEndMin] = empSchedule.end
                    .split(":")
                    .map(Number);
                  const scheduleEnd = new Date(exitTime);
                  scheduleEnd.setHours(scheduleEndHour, scheduleEndMin, 0);

                  if (exitTime > scheduleEnd) {
                    const extraMinutes = Math.floor(
                      (exitTime - scheduleEnd) / 60000
                    );
                    summaryResult[empName].extraHours += extraMinutes;
                    dayAnalysis.extraHours =
                      minutesToHoursMinutes(extraMinutes);
                  } else {
                    dayAnalysis.extraHours = "0h 0m";
                  }

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

          analysisResult[empName].push(dayAnalysis);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      setAnalysis(analysisResult);
      setSummary(summaryResult);
      setStep(3);
    } catch (err) {
      setError(`Error en el análisis: ${err.message}`);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Análisis por empleado
    const analysisData = [];
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
      analysisData.push([]);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(analysisData);
    XLSX.utils.book_append_sheet(wb, ws1, "Análisis por Empleado");

    // Hoja 2: Resumen general
    const summaryData = [
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

    XLSX.writeFile(wb, "analisis_asistencia.xlsx");
  };

  const addEmployee = () => {
    if (!newEmployee.name.trim()) {
      setError("El nombre del empleado no puede estar vacío");
      return;
    }
    if (employees[newEmployee.name]) {
      setError("Ya existe un empleado con ese nombre");
      return;
    }
    setEmployees({
      ...employees,
      [newEmployee.name]: { start: newEmployee.start, end: newEmployee.end },
    });
    setNewEmployee({ name: "", start: "08:00", end: "18:00" });
    setError("");
  };

  const deleteEmployee = (name) => {
    const newEmployees = { ...employees };
    delete newEmployees[name];
    setEmployees(newEmployees);
  };

  const saveEmployee = (oldName, newData) => {
    const newEmployees = { ...employees };
    if (oldName !== newData.name) {
      delete newEmployees[oldName];
    }
    newEmployees[newData.name] = { start: newData.start, end: newData.end };
    setEmployees(newEmployees);
    setEditingEmployee(null);
  };

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

          {/* Step 0: Upload CSV */}
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
              <div className="mt-8 text-left max-w-2xl mx-auto bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">
                  Formato esperado del CSV:
                </h3>
                <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                  Número,Nombre,Tiempo,Estado,Dispositivos,Tipo de Registro
                </pre>
              </div>
            </div>
          )}

          {/* Step 1: Employee List */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Lista de Empleados y Horarios
              </h2>
              <div className="mb-6">
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={newEmployee.name}
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
                    onClick={addEmployee}
                    className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Agregar
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Empleado</th>
                      <th className="border p-2">Hora Inicio</th>
                      <th className="border p-2">Hora Fin</th>
                      <th className="border p-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(employees).map((empName) => (
                      <tr key={empName}>
                        {editingEmployee === empName ? (
                          <>
                            <td className="border p-2">
                              <input
                                type="text"
                                defaultValue={empName}
                                id={`name-${empName}`}
                                className="border rounded px-2 py-1 w-full"
                              />
                            </td>
                            <td className="border p-2">
                              <input
                                type="time"
                                defaultValue={employees[empName].start}
                                id={`start-${empName}`}
                                className="border rounded px-2 py-1 w-full"
                              />
                            </td>
                            <td className="border p-2">
                              <input
                                type="time"
                                defaultValue={employees[empName].end}
                                id={`end-${empName}`}
                                className="border rounded px-2 py-1 w-full"
                              />
                            </td>
                            <td className="border p-2 text-center">
                              <button
                                onClick={() => {
                                  const newName = document.getElementById(
                                    `name-${empName}`
                                  ).value;
                                  const newStart = document.getElementById(
                                    `start-${empName}`
                                  ).value;
                                  const newEnd = document.getElementById(
                                    `end-${empName}`
                                  ).value;
                                  saveEmployee(empName, {
                                    name: newName,
                                    start: newStart,
                                    end: newEnd,
                                  });
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
                            <td className="border p-2">{empName}</td>
                            <td className="border p-2 text-center">
                              {employees[empName].start}
                            </td>
                            <td className="border p-2 text-center">
                              {employees[empName].end}
                            </td>
                            <td className="border p-2 text-center">
                              <button
                                onClick={() => setEditingEmployee(empName)}
                                className="text-blue-600 hover:text-blue-800 mr-2"
                              >
                                <Edit2 className="w-5 h-5 inline" />
                              </button>
                              <button
                                onClick={() => deleteEmployee(empName)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-5 h-5 inline" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 2: Date Range */}
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
              </div>
            </div>
          )}

          {/* Step 3: Analysis */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Análisis por Empleado
              </h2>
              <div className="space-y-8">
                {Object.keys(analysis).map((empName) => (
                  <div key={empName} className="border rounded-lg p-4">
                    <h3 className="text-xl font-semibold mb-3">{empName}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border p-2">Fecha</th>
                            <th className="border p-2">Hora Entrada</th>
                            <th className="border p-2">Estado</th>
                            <th className="border p-2">Hora Salida</th>
                            <th className="border p-2">Tiempo Total</th>
                            <th className="border p-2">Horas Extras</th>
                            <th className="border p-2">Horas Perdidas</th>
                            <th className="border p-2">Observaciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis[empName].slice(0, 15).map((day, idx) => (
                            <tr
                              key={idx}
                              className={
                                day.observations.includes("Fin de semana")
                                  ? "bg-gray-50"
                                  : ""
                              }
                            >
                              <td className="border p-2">{day.date}</td>
                              <td className="border p-2 text-center">
                                {day.entryTime}
                              </td>
                              <td className="border p-2 text-center">
                                {day.status}
                              </td>
                              <td className="border p-2 text-center">
                                {day.exitTime}
                              </td>
                              <td className="border p-2 text-center">
                                {day.totalTime}
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
                    {analysis[empName].length > 15 && (
                      <p className="text-sm text-gray-600 mt-2">
                        Mostrando 10 de {analysis[empName].length} días (ver
                        Excel para reporte completo)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Resumen General</h2>
              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Trabajador</th>
                      <th className="border p-2">Días Totales</th>
                      <th className="border p-2">Inasistencias</th>
                      <th className="border p-2">Tardanzas</th>
                      <th className="border p-2">Días Cumplidos</th>
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
                          <td className="border p-2">{empName}</td>
                          <td className="border p-2 text-center">
                            {s.totalDays}
                          </td>
                          <td className="border p-2 text-center">
                            {s.absences}
                          </td>
                          <td className="border p-2 text-center">{s.lates}</td>
                          <td className="border p-2 text-center">
                            {s.compliedDays}
                          </td>
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
                onClick={exportToExcel}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center mx-auto"
              >
                <Download className="w-5 h-5 mr-2" />
                Descargar Excel
              </button>
            </div>
          )}

          {/* Navigation buttons */}
          {step > 0 && (
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 flex items-center"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Anterior
              </button>
              {step < 4 && (
                <button
                  onClick={() => {
                    if (step === 2) {
                      analyzeAttendance();
                    } else {
                      setStep(step + 1);
                    }
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
