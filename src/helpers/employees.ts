import type { Employees, NewEmployee, Employee } from "../types/attendance";

/**
 * Agrega un nuevo empleado a la lista.
 * Valida nombre duplicado y nombre vacío.
 */
export const addEmployee = (
  employees: Employees,
  newEmployee: NewEmployee
): { updated: Employees; error: string } => {
  if (!newEmployee.name.trim()) {
    return {
      updated: employees,
      error: "El nombre del empleado no puede estar vacío",
    };
  }

  if (employees[newEmployee.name]) {
    return {
      updated: employees,
      error: "Ya existe un empleado con ese nombre",
    };
  }

  const updated: Employees = {
    ...employees,
    [newEmployee.name]: {
      start: newEmployee.start,
      end: newEmployee.end,
    },
  };

  return { updated, error: "" };
};

/**
 * Elimina un empleado por nombre.
 */
export const deleteEmployee = (
  employees: Employees,
  name: string
): Employees => {
  const updated = { ...employees };
  delete updated[name];
  return updated;
};

/**
 * Edita un empleado: si cambia el nombre, elimina el anterior.
 */
export const saveEmployee = (
  employees: Employees,
  oldName: string,
  newData: NewEmployee
): Employees => {
  const updated = { ...employees };

  // Si cambia el nombre del empleado, borrar el registro anterior
  if (oldName !== newData.name) {
    delete updated[oldName];
  }

  const employee: Employee = {
    start: newData.start,
    end: newData.end,
  };

  updated[newData.name] = employee;

  return updated;
};
