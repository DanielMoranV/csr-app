# Manual de Usuario - Gestión de Reservas Médicas

Este manual explica cómo utilizar el módulo de **Gestión de Reservas**, diseñado para que el personal de Admisión y Recepción pueda organizar las citas diarias de los médicos y validar la asistencia de los pacientes.

## 1. Navegación por el Calendario
El centro del módulo es el calendario, donde podrá ver la disponibilidad de los médicos.

### Cómo buscar un horario:
1.  **Por Especialidad:** Seleccione la especialidad (ej: "Cardiología") para ver los horarios de todos los médicos de esa área.
2.  **Por Categoría:** Filtre por "Ambulatorio", "Emergencia" o "Hospitalizado".
3.  **Por Médico:** Si busca a un profesional específico, use el buscador de Médicos.
4.  **Colores:** Cada médico tiene un color asignado para identificarlo fácilmente en la vista de toda la especialidad.

## 2. Gestión de la Lista de Pacientes
Al hacer clic en un turno en el calendario, se abrirá el panel inferior con dos secciones principales:

### Reservas Locales (Izquierda)
Es la lista de pacientes que usted registra manualmente para ese turno.
*   **Agregar Paciente:** Haga clic en "+ Agregar" para añadir un nombre, número de admisión y observaciones.
*   **Editar:** Puede hacer clic en cualquier celda (Nombre, Admisión, etc.) para corregir la información en el momento.
*   **Estado del Paciente:**
    *   **Pendiente (Naranja):** El paciente está en lista pero aún no se ha validado su pago/ingreso.
    *   **Registrado (Verde):** El paciente ya fue validado con el sistema Sisclin.
    *   **Cancelado (Rojo):** El paciente no asistirá.

### Turnos Sisclin (Derecha)
Esta lista se obtiene directamente del sistema principal de la clínica.
*   Muestra los pacientes que ya tienen una cita formal pagada o programada en Sisclin.
*   **Importar:** Puede hacer clic en el botón azul de "descarga" para traer un paciente de Sisclin a su lista local automáticamente.

## 3. Registro de Asistencia
El proceso fundamental es validar que el paciente que llegó a recepción coincide con el que pagó en caja.
1.  Busque al paciente en la lista local.
2.  Haga clic en el botón de **"Check" (Validar)**.
3.  El sistema verificará automáticamente en Sisclin si existe un pago o admisión para ese paciente hoy.
4.  Si todo es correcto, el paciente pasará a estado **Registrado**.

## 4. Notas del Turno
En la parte superior del panel de detalles, encontrará un área de **"Notas"** (con fondo amarillo). Use este espacio para dejar mensajes importantes para el médico o para el siguiente turno (ej: "Médico llegará 15 min tarde"). Estas notas se guardan automáticamente al hacer clic fuera del cuadro.
