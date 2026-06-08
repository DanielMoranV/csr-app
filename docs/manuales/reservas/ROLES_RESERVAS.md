# Roles y Permisos - Gestión de Reservas

El acceso a este módulo está restringido al personal que gestiona la atención ambulatoria y de emergencia.

## 1. Admisión y Recepción
Es el usuario principal del módulo.
*   **Capacidades:**
    *   Consultar horarios de todos los médicos y especialidades.
    *   Crear y editar listas de pacientes locales.
    *   Validar asistencia contra Sisclin.
    *   Importar turnos desde Sisclin.
    *   Registrar notas y observaciones del turno.

## 2. Administración y Gerencia
*   **Capacidades:**
    *   Todo lo disponible para Admisión.
    *   Supervisión de estadísticas de asistencia y cumplimiento de horarios.
    *   Gestión de configuraciones maestras de médicos y especialidades (en otros módulos relacionados).

## 3. Personal Médico (Vista Personal)
*   **Nota:** Los médicos suelen tener acceso a su propia vista ("Mis Horarios"), pero pueden consultar la Gestión de Reservas general para ver la disponibilidad de sus colegas.
*   **Capacidades:**
    *   Visualización de la cartelera de disponibilidad diaria.
    *   Consulta de listas de pacientes (solo lectura en algunos casos, según configuración específica).

## 4. Sistemas
*   **Capacidades:**
    *   Acceso total para resolución de problemas de sincronización con Sisclin.
    *   Mantenimiento de la integridad de los datos de reservas.

---

### Seguridad de los Datos
Toda modificación en la lista de pacientes (quién agregó, quién editó) queda registrada en el sistema con el nombre de usuario (Nick) para fines de auditoría, visible en las columnas "Asig. Por" y "Mod. Por".
