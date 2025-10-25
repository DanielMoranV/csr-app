# Documentación API - Sistema de Gestión de Tareas

## Tabla de Contenidos
- [Modelo Task](#modelo-task)
- [Endpoints disponibles](#endpoints-disponibles)
- [Eventos del sistema](#eventos-del-sistema)
- [Sistema de alertas](#sistema-de-alertas)
- [Ejemplos de uso](#ejemplos-de-uso)

---

## Modelo Task

### Campos del modelo

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | integer | Auto | ID único de la tarea |
| `description` | string | Sí | Descripción de la tarea |
| `status` | enum | Sí | Estado: `pendiente`, `anulado`, `realizado`, `supervisado` |
| `id_attentions` | integer | Sí | ID de la atención hospitalaria asociada |
| `due_date` | datetime | **No** | Fecha y hora límite para completar la tarea (OPCIONAL) |
| `created_at` | datetime | Auto | Fecha de creación |
| `updated_at` | datetime | Auto | Fecha de última actualización |

### Campos calculados (solo lectura)

Estos campos solo están presentes cuando la tarea tiene `due_date` definida:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `alert_status` | string\|null | Estado de alerta: `por_vencer`, `vencida` o `null` |
| `is_overdue` | boolean | `true` si la tarea está vencida |
| `is_nearing_due` | boolean | `true` si ha alcanzado el 80% del tiempo disponible |

### Relaciones incluidas (con eager loading)

- `hospital_attention`: Atención hospitalaria asociada
- `status_history`: Historial de cambios de estado
- `alerts`: Alertas generadas para la tarea

---

## Endpoints disponibles

Base URL: `/api/v1`

### 1. Listar tareas

**GET** `/tasks`

#### Query Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | string | Filtrar por estado |
| `attention_id` | integer | Filtrar por atención hospitalaria |
| `sort_by` | string | Campo de ordenamiento (default: `created_at`) |
| `sort_direction` | string | Dirección: `asc` o `desc` (default: `desc`) |
| `paginate` | boolean | Si se incluye, pagina los resultados |
| `per_page` | integer | Cantidad por página (max: 100, default: 15) |
| `page` | integer | Número de página |

#### Respuesta exitosa (200)

```json
{
  "success": true,
  "message": "Tareas obtenidas exitosamente",
  "data": {
    "data": [
      {
        "id": 1,
        "description": "Administrar medicamento",
        "status": "pendiente",
        "id_attentions": 42,
        "due_date": "2025-10-25T14:00:00.000000Z",
        "alert_status": "por_vencer",
        "is_overdue": false,
        "is_nearing_due": true,
        "hospital_attention": { ... },
        "status_history": [ ... ],
        "alerts": [ ... ],
        "created_at": "2025-10-24T10:00:00.000000Z",
        "updated_at": "2025-10-24T10:00:00.000000Z"
      }
    ],
    "total": 45
  }
}
```

---

### 2. Crear tarea

**POST** `/tasks`

#### Request Body

```json
{
  "description": "Administrar medicamento XYZ",
  "status": "pendiente",
  "id_attentions": 42,
  "due_date": "2025-10-25T14:00:00Z"  // OPCIONAL
}
```

#### Validaciones

- `description`: obligatorio, string
- `status`: obligatorio, string, max 255 caracteres
- `id_attentions`: obligatorio, integer, debe existir en `hospital_attentions`
- `due_date`: **opcional**, fecha válida, debe ser posterior a la fecha actual

#### Respuesta exitosa (201)

```json
{
  "success": true,
  "message": "Tarea creada exitosamente",
  "data": {
    "id": 123,
    "description": "Administrar medicamento XYZ",
    "status": "pendiente",
    "id_attentions": 42,
    "due_date": "2025-10-25T14:00:00.000000Z",
    "alert_status": null,
    "is_overdue": false,
    "is_nearing_due": false,
    "hospital_attention": { ... },
    "status_history": [ ... ],
    "created_at": "2025-10-24T22:15:00.000000Z",
    "updated_at": "2025-10-24T22:15:00.000000Z"
  }
}
```

---

### 3. Obtener tarea por ID

**GET** `/tasks/{id}`

#### Respuesta exitosa (200)

```json
{
  "success": true,
  "message": "Tarea obtenida exitosamente",
  "data": {
    "id": 123,
    "description": "Administrar medicamento XYZ",
    "status": "pendiente",
    "id_attentions": 42,
    "due_date": "2025-10-25T14:00:00.000000Z",
    "alert_status": "por_vencer",
    "is_overdue": false,
    "is_nearing_due": true,
    "hospital_attention": { ... },
    "status_history": [ ... ],
    "alerts": [
      {
        "id": 5,
        "task_id": 123,
        "alert_type": "por_vencer",
        "is_resolved": false,
        "notified_at": "2025-10-24T22:00:00.000000Z",
        "resolved_at": null,
        "created_at": "2025-10-24T22:00:00.000000Z",
        "updated_at": "2025-10-24T22:00:00.000000Z"
      }
    ],
    "created_at": "2025-10-24T22:15:00.000000Z",
    "updated_at": "2025-10-24T22:15:00.000000Z"
  }
}
```

---

### 4. Actualizar tarea

**PUT** `/tasks/{id}`

#### Request Body

```json
{
  "description": "Administrar medicamento XYZ cada 8 horas",
  "status": "realizado",
  "id_attentions": 42,
  "due_date": "2025-10-26T14:00:00Z",  // OPCIONAL - puede extender o cambiar
  "reason": "Medicamento administrado correctamente"  // OPCIONAL - razón del cambio
}
```

**Nota importante:** Si cambias el estado a `realizado` o `supervisado`, todas las alertas pendientes se resolverán automáticamente.

#### Respuesta exitosa (200)

```json
{
  "success": true,
  "message": "Tarea actualizada exitosamente",
  "data": { ... }
}
```

---

### 5. Eliminar tarea

**DELETE** `/tasks/{id}`

#### Respuesta exitosa (200)

```json
{
  "success": true,
  "message": "Tarea eliminada exitosamente",
  "data": null
}
```

---

### 6. Buscar tareas

**GET** `/tasks/search`

#### Query Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `q` | string | Término de búsqueda (busca en description y status) |
| `status` | string | Filtrar por estado |
| `attention_id` | integer | Filtrar por atención hospitalaria |

**Nota:** Debe proporcionar al menos un criterio de búsqueda.

#### Respuesta exitosa (200)

```json
{
  "success": true,
  "message": "Búsqueda completada exitosamente",
  "data": [ ... ]
}
```

---

### 7. Estadísticas de tareas

**GET** `/tasks/stats`

#### Respuesta exitosa (200)

```json
{
  "success": true,
  "message": "Estadísticas de tareas obtenidas exitosamente",
  "data": {
    "total_tasks": 245,
    "tasks_by_status": {
      "pendiente": 89,
      "realizado": 120,
      "supervisado": 30,
      "anulado": 6
    },
    "recent_tasks": 45,
    "tasks_today": 12
  }
}
```

---

## Eventos del sistema

El sistema dispara eventos públicos que puedes escuchar mediante listeners o broadcasting para notificaciones en tiempo real.

### 1. TaskCreated

**Cuándo se dispara:** Al crear una nueva tarea

**Datos disponibles:**
```php
$event->task  // Instancia del modelo Task
```

---

### 2. TaskUpdated

**Cuándo se dispara:** Al actualizar una tarea

**Datos disponibles:**
```php
$event->task          // Instancia del modelo Task actualizada
$event->originalData  // Array con los datos originales antes de la actualización
```

---

### 3. TaskNearingDue

**Cuándo se dispara:** Cuando una tarea alcanza el 80% del tiempo disponible (ejecutado automáticamente cada hora)

**Datos disponibles:**
```php
$event->task   // Instancia del modelo Task
$event->alert  // Instancia del modelo TaskAlert
```

**Ejemplo de uso:**
```php
// En un listener, puedes enviar notificaciones push, emails, etc.
public function handle(TaskNearingDue $event)
{
    $task = $event->task;
    $alert = $event->alert;

    // Enviar notificación
    Notification::send(
        $task->hospitalAttention->assignedUsers,
        new TaskNearingDueNotification($task)
    );
}
```

---

### 4. TaskOverdue

**Cuándo se dispara:** Cuando una tarea sobrepasa su fecha límite sin completarse (ejecutado automáticamente cada hora)

**Datos disponibles:**
```php
$event->task   // Instancia del modelo Task
$event->alert  // Instancia del modelo TaskAlert
```

---

## Sistema de alertas

### Cómo funciona

1. **Evaluación automática cada hora:** Un comando programado verifica todas las tareas con `due_date`
2. **Detección de alertas:**
   - **Por vencer:** Cuando se ha consumido ≥80% del tiempo desde creación hasta `due_date`
   - **Vencida:** Cuando `due_date` < fecha actual y status != 'realizado' o 'supervisado'
3. **Eventos públicos:** Se disparan `TaskNearingDue` o `TaskOverdue` según corresponda
4. **Auto-resolución:** Al completar una tarea (status = 'realizado' o 'supervisado'), todas sus alertas se resuelven automáticamente

### Cálculo del 80%

**Ejemplo:**
```
Creación:    2025-10-20 08:00
Due Date:    2025-10-25 08:00
Tiempo total: 5 días = 120 horas
80% del tiempo: 96 horas
Alerta desde: 2025-10-24 08:00 (4 días después)
```

### Estructura de TaskAlert

```json
{
  "id": 5,
  "task_id": 123,
  "alert_type": "por_vencer",  // o "vencida"
  "is_resolved": false,
  "notified_at": "2025-10-24T22:00:00.000000Z",
  "resolved_at": null,
  "created_at": "2025-10-24T22:00:00.000000Z",
  "updated_at": "2025-10-24T22:00:00.000000Z"
}
```

---

## Ejemplos de uso

### Crear tarea sin fecha límite

```javascript
const response = await fetch('/api/v1/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: 'Tomar signos vitales',
    status: 'pendiente',
    id_attentions: 42
    // due_date es OPCIONAL, no se incluye
  })
});
```

### Crear tarea con fecha límite

```javascript
const response = await fetch('/api/v1/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: 'Administrar antibiótico',
    status: 'pendiente',
    id_attentions: 42,
    due_date: '2025-10-25T14:00:00Z'  // Fecha límite OPCIONAL
  })
});
```

### Actualizar tarea y marcar como realizada

```javascript
const response = await fetch('/api/v1/tasks/123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: 'Administrar antibiótico',
    status: 'realizado',
    id_attentions: 42,
    due_date: '2025-10-25T14:00:00Z',
    reason: 'Medicamento administrado correctamente a las 14:00'
  })
});

// Al marcar como 'realizado', todas las alertas se resuelven automáticamente
```

### Filtrar tareas por estado y paginación

```javascript
const response = await fetch('/api/v1/tasks?status=pendiente&paginate=true&per_page=20&page=1');
```

### Obtener tareas con alertas activas (solo lectura)

```javascript
const response = await fetch('/api/v1/tasks?status=pendiente');
const data = await response.json();

// Filtrar en el frontend las que tienen alertas
const tasksWithAlerts = data.data.data.filter(task =>
  task.alert_status !== null && task.alert_status !== undefined
);

// Tareas por vencer
const nearingDueTasks = tasksWithAlerts.filter(task =>
  task.alert_status === 'por_vencer'
);

// Tareas vencidas
const overdueTasks = tasksWithAlerts.filter(task =>
  task.alert_status === 'vencida'
);
```

### Escuchar eventos en tiempo real (usando Laravel Echo)

```javascript
// Asumiendo que tienes Laravel Echo configurado
window.Echo.channel('tasks')
  .listen('TaskNearingDue', (e) => {
    console.log('Tarea por vencer:', e.task);
    // Mostrar notificación en UI
    showNotification(`La tarea #${e.task.id} está por vencer`, 'warning');
  })
  .listen('TaskOverdue', (e) => {
    console.log('Tarea vencida:', e.task);
    // Mostrar notificación en UI
    showNotification(`La tarea #${e.task.id} está vencida`, 'danger');
  });
```

---

## Notas importantes

1. **Campo `due_date` es completamente OPCIONAL:** Puedes crear y gestionar tareas sin fecha límite.

2. **Validación automática:** Si incluyes `due_date`, debe ser una fecha válida posterior al momento actual.

3. **Sistema de alertas automático:** No necesitas crear alertas manualmente. El sistema las genera cada hora.

4. **Auto-resolución de alertas:** Al completar una tarea (realizado/supervisado), todas sus alertas se resuelven automáticamente.

5. **Campos calculados:** `alert_status`, `is_overdue` y `is_nearing_due` son de solo lectura y solo aparecen cuando la tarea tiene `due_date`.

6. **Estados válidos:** `pendiente`, `anulado`, `realizado`, `supervisado`

7. **Throttling:**
   - Rutas de consulta (GET): throttle general
   - Rutas de modificación (POST/PUT/DELETE): throttle sensible

---

## Soporte

Para más información o reportar problemas, contacta al equipo de desarrollo.

**Última actualización:** 2025-10-24
