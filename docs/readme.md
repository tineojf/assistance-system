# SISTEMA DE ANÁLISIS DE ASISTENCIA LABORAL — REQUERIMIENTO

Genera una aplicación web estática (sin backend) que cumpla lo siguiente:

Stack:

- Frontend: HTML + Tailwind CSS + Vanilla JavaScript (módulos ES6).
- Procesamiento CSV: JavaScript en el navegador.
- Export: opción de exportar reporte a Excel usando SheetJS (xlsx).
- No se requiere servidor; el proyecto debe funcionar abriendo index.html.

Requerimientos funcionales:

1. Página para subir un CSV (input file). Soportar archivos con cabecera.
2. Validar y parsear el CSV (formato requerido abajo). Mostrar errores de formato.
3. Wizard de 4 pasos con botones "Anterior" y "Siguiente":
   - Paso 1: Lista editable de empleados con horario (HH:MM). Permitir agregar, eliminar, editar.
   - Paso 2: Selección de rango de fechas (dd/mm/yyyy). Fecha fin INCLUYENTE.
   - Paso 3: Mostrar, por cada empleado, el "Análisis de empleado" día a día conforme reglas.
   - Paso 4: Resumen general con totales por empleado y botón de exportar a Excel.
4. Reglas de negocio (detalladas):
   - Fecha/hora en CSV: formato `dd/mm/yyyy HH:MM:SS`.
   - Excluir sábados y domingos del análisis laboral; si aparecen, marcarlos con observación "Fin de semana".
   - Entrada: tomar hora mínima registrada en el día. Salida: hora máxima.
   - Si falta entrada -> observación "Faltó entrada"; si falta salida -> "Faltó salida".
   - Estado "tarde" si hora de entrada > hora inicio del empleado.
   - Tiempo total = salida - entrada.
   - Horas extra = max(0, salida - hora_fin_empleado).
   - Horas perdidas = max(0, hora_inicio_empleado - entrada).
   - Manejar múltiples registros por día (tomar min y max).
   - Manejar registros solo de salida o solo de entrada según observaciones.
5. UI/UX:
   - Tabla con paginación ligera si hay muchas filas.
   - Mensajes claros de error (CSV inválido, fecha malformada).
   - Botón "Descargar Excel" genera archivo con dos pestañas: Análisis por empleado y Resumen general.
6. Entregables exactos:
   - Proyecto estático con index.html, styles (Tailwind), app.js (módulos).
   - Ejemplo de archivo CSV de prueba.
   - README con instrucciones: abrir index.html y formato CSV.
7. Consideraciones extras:
   - Usar la zona horaria America/Lima (o aclarar que se interpreta la hora del CSV tal cual).
   - Tratar filas con fechas fuera del rango como ignoradas.
   - Control de tamaño (advertencia >100k filas).

## FUNCIONALIDADES PRINCIPALES

- Página web para cargar un archivo CSV.
  El usuario selecciona un archivo .csv con registros de asistencia.

- Lectura y procesamiento del CSV.
  La aplicación interpreta los datos del CSV según su estructura definida.

- Flujo guiado por pasos (con botón “Siguiente”).

- Paso 1: Mostrar lista de empleados con horarios editables. Permitir agregar, eliminar o modificar empleados y sus horarios laborales (HH:MM – HH:MM).

- Paso 2: Selección del rango de fechas (Inicio y Fin en formato dd/mm/yyyy).
  Se excluyen sábados y domingos del análisis laboral, aunque pueden aparecer en reporte con etiqueta "Fin de semana".

- Paso 3: Para cada empleado, generar un “Análisis de Empleado” día por día.

- Paso 4: Mostrar un “Resumen General” consolidado por empleado.
-

## ESTRUCTURA DEL CSV

El archivo CSV tiene cabecera y posee el siguiente formato:

Número,Nombre,Tiempo,Estado,Dispositivos,Tipo de Registro
1,Elizabeth 1,03/11/2025 08:02:31,Entrada,Asistencia,0
1,Elizabeth 1,03/11/2025 18:58:51,Salida,Asistencia,0

- Número: ID del empleado.
- Nombre: nombre del empleado.
- Tiempo: fecha y hora en formato dd/mm/yyyy HH:MM:SS.
- Estado: Entrada o Salida.
- Dispositivos: texto fijo.
- Tipo de Registro: número entero (no se usa por ahora).

## LISTA DE EMPLEADOS Y HORARIOS

Los empleados tienen horarios laborales fijos definidos como:

"Elizabeth 1": ("08:00", "18:00"),
"Principe 2": ("07:00", "19:00"),
"Orlando 3": ("08:00", "18:00"),
"Chino 4": ("07:00", "19:00"),
"Mendez 6": ("07:00", "19:00"),
"Vallejo 7": ("07:00", "19:00"),
"Juan 10": ("07:00", "19:00"),
"Teofilo 11": ("07:00", "19:00"),
"Nicole 13": ("08:00", "18:00"),
"Edgar 14": ("07:00", "19:00"),

Se permite agregar o quitar empleados.
Se permite modificar los horarios laborales de cada empleado.
El horario se expresa en formato HH:MM.

## RANGO DE FECHAS

Formato: dd/mm/yyyy.

Se excluyen sábados y domingos del análisis laboral.

Ejemplo:
Inicio: 01/11/2025
Fin: 30/11/2025

La fecha de fin es inclusiva.



---------------------

- Los turnos de 24h se deben corroborar
- En los turnos de 24h se debe marcar hora de salida (se cuenta hora extra desde las 19:00)