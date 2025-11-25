# Especificación del Endpoint de Creación Masiva de Horarios

## Endpoint

**POST** `/api/doctor-schedules/batch`

## Descripción

Crea múltiples horarios médicos en una sola petición. El endpoint procesa cada horario individualmente y retorna resultados detallados de éxitos y fallos.

## Request

### Headers
```
Content-Type: application/json
Authorization: Bearer {token}
```

### Body
```json
{
  "schedules": [
    {
      "id_doctors": 1,
      "id_medical_shift": 2,
      "date": "2025-11-24",
      "start_time": "08:00:00",
      "end_time": "16:00:00",
      "category": "ambulatory",
      "status": "pending",
      "is_payment_payroll": true,
      "notes": "Turno regular"
    },
    {
      "id_doctors": 1,
      "id_medical_shift": 2,
      "date": "2025-11-25",
      "start_time": "08:00:00",
      "end_time": "16:00:00",
      "category": "ambulatory",
      "status": "pending",
      "is_payment_payroll": true,
      "notes": "Turno regular"
    }
  ]
}
```

### Campos del Schedule

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id_doctors` | integer | Sí | ID del médico |
| `id_medical_shift` | integer | Sí | ID del turno médico predefinido |
| `date` | string (date) | Sí | Fecha del horario (YYYY-MM-DD) |
| `start_time` | string (time) | Sí | Hora de inicio (HH:MM:SS) |
| `end_time` | string (time) | Sí | Hora de fin (HH:MM:SS) |
| `category` | string | Sí | Categoría: 'emergency', 'ambulatory', 'hospitable' |
| `status` | string | Sí | Estado: 'pending', 'confirmed', 'cancelled', 'completed' |
| `is_payment_payroll` | boolean | No | Incluir en planilla de pagos (default: true) |
| `notes` | string | No | Notas adicionales |

## Response

### Éxito Total (200 OK)
```json
{
  "successful": [
    {
      "date": "2025-11-24",
      "schedule": {
        "id": 101,
        "id_doctors": 1,
        "id_medical_shift": 2,
        "date": "2025-11-24",
        "start_time": "08:00:00",
        "end_time": "16:00:00",
        "category": "ambulatory",
        "status": "pending",
        "is_payment_payroll": true,
        "notes": "Turno regular",
        "created_at": "2025-11-24T10:00:00Z",
        "updated_at": "2025-11-24T10:00:00Z",
        "doctor": {
          "id": 1,
          "name": "Dr. Juan Pérez",
          "medical_specialty_id": 3
        },
        "medical_shift": {
          "id": 2,
          "description": "Mañana",
          "start_time": "08:00:00",
          "end_time": "16:00:00"
        }
      }
    },
    {
      "date": "2025-11-25",
      "schedule": {
        "id": 102,
        ...
      }
    }
  ],
  "failed": [],
  "total": 2,
  "message": "2 horarios creados exitosamente"
}
```

### Éxito Parcial (207 Multi-Status)
```json
{
  "successful": [
    {
      "date": "2025-11-24",
      "schedule": { ... }
    }
  ],
  "failed": [
    {
      "date": "2025-11-25",
      "error": "Ya existe un horario para este médico en esta fecha",
      "schedule_data": {
        "id_doctors": 1,
        "date": "2025-11-25",
        ...
      }
    }
  ],
  "total": 2,
  "message": "1 de 2 horarios creados"
}
```

### Error de Validación (422 Unprocessable Entity)
```json
{
  "error": "Validation Error",
  "message": "Los datos proporcionados no son válidos",
  "errors": {
    "schedules.0.id_doctors": ["El campo id_doctors es obligatorio"],
    "schedules.1.date": ["El formato de fecha no es válido"]
  }
}
```

### Error del Servidor (500 Internal Server Error)
```json
{
  "error": "Server Error",
  "message": "Error al procesar la solicitud"
}
```

## Validaciones del Backend

### Por cada horario:

1. **Campos Requeridos**
   - `id_doctors`, `id_medical_shift`, `date`, `start_time`, `end_time`, `category`, `status`

2. **Formato de Datos**
   - `date`: Formato YYYY-MM-DD
   - `start_time`, `end_time`: Formato HH:MM:SS
   - `category`: Debe ser uno de: 'emergency', 'ambulatory', 'hospitable'
   - `status`: Debe ser uno de: 'pending', 'confirmed', 'cancelled', 'completed'

3. **Existencia de Relaciones**
   - El médico (`id_doctors`) debe existir
   - El turno médico (`id_medical_shift`) debe existir

4. **Lógica de Negocio**
   - `start_time` debe ser anterior a `end_time`
   - La fecha no debe ser anterior a hoy (opcional, según reglas de negocio)
   - No debe existir otro horario para el mismo médico en la misma fecha (opcional)

## Comportamiento del Endpoint

1. **Procesamiento Individual**: Cada horario se procesa de forma independiente
2. **No Detener en Error**: Si un horario falla, el proceso continúa con los demás
3. **Transacciones Independientes**: Cada horario se guarda en su propia transacción
4. **Respuesta Detallada**: Se retorna información completa de éxitos y fallos

## Ejemplo de Implementación (Laravel)

```php
public function batchCreate(Request $request)
{
    $validated = $request->validate([
        'schedules' => 'required|array|min:1',
        'schedules.*.id_doctors' => 'required|integer|exists:doctors,id',
        'schedules.*.id_medical_shift' => 'required|integer|exists:medical_shifts,id',
        'schedules.*.date' => 'required|date',
        'schedules.*.start_time' => 'required|date_format:H:i:s',
        'schedules.*.end_time' => 'required|date_format:H:i:s',
        'schedules.*.category' => 'required|in:emergency,ambulatory,hospitable',
        'schedules.*.status' => 'required|in:pending,confirmed,cancelled,completed',
        'schedules.*.is_payment_payroll' => 'boolean',
        'schedules.*.notes' => 'nullable|string'
    ]);

    $results = [
        'successful' => [],
        'failed' => [],
        'total' => count($validated['schedules'])
    ];

    foreach ($validated['schedules'] as $scheduleData) {
        try {
            $schedule = DoctorSchedule::create($scheduleData);
            $schedule->load(['doctor', 'medical_shift']);
            
            $results['successful'][] = [
                'date' => $scheduleData['date'],
                'schedule' => $schedule
            ];
        } catch (\Exception $e) {
            $results['failed'][] = [
                'date' => $scheduleData['date'],
                'error' => $e->getMessage(),
                'schedule_data' => $scheduleData
            ];
        }
    }

    $statusCode = count($results['failed']) > 0 ? 207 : 200;
    $message = count($results['successful']) . ' de ' . $results['total'] . ' horarios creados';

    return response()->json([
        ...$results,
        'message' => $message
    ], $statusCode);
}
```

## Notas Importantes

1. **Performance**: Para grandes cantidades de horarios (>100), considerar procesamiento asíncrono
2. **Límite**: Establecer un límite máximo de horarios por petición (recomendado: 50-100)
3. **Logging**: Registrar todas las operaciones batch para auditoría
4. **Notificaciones**: Considerar enviar notificaciones a los médicos sobre sus nuevos horarios
