# Corrección: Filtro de Especialidad de Médicos

## Problema Identificado

Los médicos en el backend tienen un campo **`specialties`** (array) en lugar de `medical_specialty_id` (singular). Esto significa que **un médico puede tener múltiples especialidades**.

## Estructura de Datos del Backend

```javascript
{
  "id": 124,
  "name": "ACEDO REYES ENID ELISENA",
  "document_type": "dni",
  "document_number": "42779009",
  "type": "medico",
  "colegio": "cmp",
  "numero_colegiatura": "12345",
  "rne": null,
  "code": "MED001",
  "payment_payroll": "total",
  "specialties": [           // ← Array de especialidades
    {
      "id": 32,
      "name": "Cardiología",
      "code": "CARD"
    },
    {
      "id": 15,
      "name": "Medicina Interna",
      "code": "MINT"
    }
  ],
  "specialties_count": 2,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

## Cambios Realizados

### 1. Filtro de Médicos por Especialidad

**Antes (incorrecto)**:
```javascript
return doctors.value.filter(doctor => 
    doctor.medical_specialty_id === specialtyFilter.value
);
```

**Después (correcto)**:
```javascript
return doctors.value.filter(doctor => {
    if (!doctor.specialties || !Array.isArray(doctor.specialties)) {
        return false;
    }
    
    return doctor.specialties.some(specialty => 
        specialty.id === specialtyFilter.value
    );
});
```

### 2. Detección de Conflictos

**Antes (incorrecto)**:
```javascript
if (schedule.doctor?.medical_specialty_id !== specialtyFilter.value) return false;
```

**Después (correcto)**:
```javascript
const doctorHasSpecialty = schedule.doctor?.specialties?.some(
    specialty => specialty.id === specialtyFilter.value
);

if (!doctorHasSpecialty) return false;
```

## Implicaciones

### Ventajas
- ✅ Un médico puede tener múltiples especialidades
- ✅ Más flexible para la gestión de personal
- ✅ Refleja mejor la realidad (médicos con subespecialidades)

### Consideraciones
- ⚠️ Al filtrar por especialidad, se mostrarán todos los médicos que tengan esa especialidad, incluso si tienen otras
- ⚠️ Los conflictos se detectan si el médico tiene la especialidad seleccionada, independientemente de sus otras especialidades

## Recomendación para el Backend

Si aún no está implementado, el backend debería retornar el campo `specialties` con la estructura:

```json
{
  "specialties": [
    {
      "id": 32,
      "name": "Cardiología",
      "code": "CARD",
      "description": "Especialidad en enfermedades del corazón"
    }
  ]
}
```

### Endpoint de Médicos

**GET** `/api/doctors`

Debe incluir la relación `specialties` en la respuesta:

```php
// Laravel Example
public function index()
{
    return Doctor::with('specialties')->get();
}
```

## Testing

Después de estos cambios:

1. ✅ Seleccionar una especialidad debe filtrar los médicos correctamente
2. ✅ Los médicos con múltiples especialidades aparecerán en todos los filtros correspondientes
3. ✅ La detección de conflictos funcionará correctamente
4. ✅ El llenado rápido de horarios funcionará sin problemas

## Estado

✅ **CORREGIDO** - El filtro ahora funciona correctamente con el array de especialidades.
