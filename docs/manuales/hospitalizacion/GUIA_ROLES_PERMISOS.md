# Guía de Roles y Permisos - Hospitalización

El sistema adapta las funciones disponibles según el perfil del usuario. A continuación, se detallan las capacidades de cada rol:

## 1. Rol: Secretaría
Este es un perfil principalmente de visualización.
*   **Qué puede hacer:**
    *   Ver el tablero general de hospitalización.
    *   Ver qué camas están ocupadas o libres.
    *   Ver el sexo de los pacientes y cuántas tareas tienen pendientes.
    *   Usar filtros y el ordenamiento inteligente.
    *   Acceder a la Vista TV.
*   **Qué NO puede hacer:**
    *   Abrir el panel de detalles del paciente (Cajón lateral).
    *   Crear, modificar o eliminar tareas.
    *   Registrar evoluciones médicas.
    *   Sincronizar datos con Sisclin.

## 2. Rol: Personal de Enfermería y Médico
Este perfil es responsable del seguimiento operativo del paciente.
*   **Qué puede hacer:**
    *   Todo lo disponible para Secretaría.
    *   **Gestión de Tareas:** Crear nuevas tareas, marcarlas como completadas o eliminarlas.
    *   **Evolución Médica:** Registrar detalles de la atención diaria del paciente.
    *   **Alertas:** Ver alertas críticas (como pacientes sin diagnóstico CIE10).
    *   **Liberación de Camas:** Si tiene permisos especiales, puede liberar una cama anticipadamente.

## 3. Rol: Coordinación y Administración
Este perfil tiene control total sobre el flujo de hospitalización.
*   **Qué puede hacer:**
    *   Todo lo disponible para Personal Médico.
    *   **Sincronización:** Forzar la actualización de datos desde el sistema central Sisclin (botón "Sincronizar").
    *   **Gestión de Reservas:** Gestionar las reservas de camas para futuros ingresos.
    *   **Configuración:** Acceso a configuraciones avanzadas del módulo.

## 4. Rol: Sistemas / Administrador
*   **Qué puede hacer:**
    *   Acceso total sin restricciones.
    *   Acciones peligrosas (eliminación definitiva de registros).
    *   Mantenimiento técnico del módulo.

---

### ¿Cómo sé qué rol tengo?
Su rol es asignado por el administrador del sistema al momento de crear su cuenta. Si considera que le falta alguna función necesaria para su trabajo, por favor contacte al departamento de Sistemas.
