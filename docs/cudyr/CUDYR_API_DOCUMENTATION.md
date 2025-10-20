# 📘 Documentación API - Sistema CUDYR

**Versión:** 1.0
**Fecha:** 18 de Octubre, 2025
**Para:** Equipo Frontend

---

## 📋 Índice

1. [Resumen de Cambios](#resumen-de-cambios)
2. [¿Qué es CUDYR?](#qué-es-cudyr)
3. [Cambios en Endpoints Existentes](#cambios-en-endpoints-existentes)
4. [Nuevos Endpoints CUDYR](#nuevos-endpoints-cudyr)
5. [Estructura de Datos](#estructura-de-datos)
6. [Validaciones](#validaciones)
7. [Ejemplos de Uso](#ejemplos-de-uso)
8. [Códigos de Error](#códigos-de-error)
9. [Casos de Uso Comunes](#casos-de-uso-comunes)

---

## 🎯 Resumen de Cambios

### Cambios en `DetailsAttention`

**IMPORTANTE:** El campo `score_CUDYR` ha cambiado su rango:

| Antes | Después |
|-------|---------|
| 0-100 | **0-18** |
| Score genérico | **Score de Dependencia Total** |

⚠️ **Acción requerida:** Actualizar validaciones del frontend que usen este campo.

### Nuevas Funcionalidades

✅ Sistema completo de evaluación CUDYR
✅ 14 dimensiones de evaluación (6 dependencia + 8 riesgo)
✅ Clasificación automática en 12 categorías
✅ Identificación de pacientes de alto riesgo
✅ Estadísticas y reportes detallados

---

## 🏥 ¿Qué es CUDYR?

CUDYR (Cuidados Según Dependencia y Riesgo) es un sistema de evaluación de enfermería que clasifica a los pacientes según:

### Escala de Dependencia (0-18 puntos)
Evalúa 6 dimensiones de autocuidado:
- Movilización
- Higiene
- Alimentación
- Eliminación
- Apoyo Psicosocial
- Vigilancia

### Escala de Riesgo (0-24 puntos)
Evalúa 8 dimensiones de complejidad médica:
- Oxigenoterapia
- Manejo de Vía Aérea
- Signos Vitales
- Balance Hídrico
- Curaciones
- Elementos Invasivos
- Procedimientos
- Medicamentos

### Clasificación Final
Las dos escalas se cruzan para generar **12 categorías** (A1 a D3):

| Dependencia | Riesgo Máximo (1) | Alto Riesgo (2) | Mediano Riesgo (3) | Bajo Riesgo (4) |
|-------------|-------------------|-----------------|-------------------|-----------------|
| Total (B: 13-18) | **A1** 🔴 | **A2** 🔴 | **A3** 🟠 | **A3** 🟠 |
| Parcial (C: 7-12) | **B1** 🔴 | **B2** 🔴 | **B3** 🟡 | **B3** 🟡 |
| Autosuficiencia (D: 0-6) | **C1** 🔴 | **C2** 🟡 | **C3** 🟢 | **D3** 🟢 |

🔴 Crítico | 🟠 Alto | 🟡 Medio | 🟢 Bajo

---

## 🔄 Cambios en Endpoints Existentes

### `GET /api/details-attention/{id}`

#### Nueva respuesta incluye:

```json
{
  "id": 1,
  "score_CUDYR": 15,
  "cudyr_evaluation": {
    "id": 1,
    "dependency": {
      "dimensions": {
        "mobility": 2,
        "hygiene": 3,
        "nutrition": 2,
        "elimination": 3,
        "psychosocial": 2,
        "surveillance": 3
      },
      "total_score": 15,
      "classification": "B",
      "classification_text": "Dependencia Total"
    },
    "risk": {
      "dimensions": {
        "oxygen_therapy": 3,
        "airway_management": 2,
        "vital_signs": 3,
        "fluid_balance": 2,
        "wound_care": 1,
        "invasive_devices": 3,
        "procedures": 2,
        "medications": 3
      },
      "total_score": 19,
      "classification": "1",
      "classification_text": "Máximo Riesgo"
    },
    "cudyr_category": "A1",
    "risk_level": "critical",
    "notes": "Paciente en estado crítico",
    "evaluated_by": {
      "id": 5,
      "nick": "enfermera.maria"
    },
    "evaluated_at": "2025-10-18T10:30:00Z",
    "created_at": "2025-10-18T10:30:00Z",
    "updated_at": "2025-10-18T10:30:00Z"
  }
}
```

**Nota:** `cudyr_evaluation` será `null` si no existe evaluación CUDYR para ese detalle de atención.

---

## 🆕 Nuevos Endpoints CUDYR

### Autenticación
Todos los endpoints requieren:
- Token JWT: `Authorization: Bearer {token}`
- Permisos: Personal médico, hospitalización, director médico, administración

---

### 1️⃣ Listar Evaluaciones CUDYR

```http
GET /api/cudyr-evaluations
```

#### Query Parameters (Opcionales)

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `cudyr_category` | string | Filtrar por categoría | `A1`, `B2`, `C3` |
| `dependency_classification` | string | Filtrar por dependencia | `B`, `C`, `D` |
| `risk_classification` | string | Filtrar por riesgo | `1`, `2`, `3`, `4` |
| `start_date` | date | Fecha inicial | `2025-10-01` |
| `end_date` | date | Fecha final | `2025-10-18` |
| `sort_by` | string | Campo de ordenamiento | `evaluated_at`, `dependency_total_score` |
| `sort_direction` | string | Dirección | `asc`, `desc` |
| `paginate` | boolean | Activar paginación | `true` |
| `per_page` | integer | Elementos por página | `15` (max: 100) |
| `page` | integer | Número de página | `1` |

#### Respuesta

```json
{
  "success": true,
  "message": "Evaluaciones CUDYR obtenidas exitosamente",
  "data": {
    "data": [
      {
        "id": 1,
        "id_details_attention": 10,
        "dependency": { ... },
        "risk": { ... },
        "cudyr_category": "A1",
        "risk_level": "critical",
        "notes": null,
        "evaluated_by": { ... },
        "evaluated_at": "2025-10-18T10:30:00Z"
      }
    ],
    "total": 45
  }
}
```

**Con paginación:**

```json
{
  "data": {
    "data": [ ... ],
    "pagination": {
      "current_page": 1,
      "last_page": 3,
      "per_page": 15,
      "total": 45,
      "from": 1,
      "to": 15
    }
  }
}
```

---

### 2️⃣ Crear Evaluación CUDYR

```http
POST /api/cudyr-evaluations
```

#### Request Body (todos los campos requeridos)

```json
{
  "id_details_attention": 10,

  "dependency_mobility": 2,
  "dependency_hygiene": 3,
  "dependency_nutrition": 2,
  "dependency_elimination": 3,
  "dependency_psychosocial": 2,
  "dependency_surveillance": 3,

  "risk_oxygen_therapy": 3,
  "risk_airway_management": 2,
  "risk_vital_signs": 3,
  "risk_fluid_balance": 2,
  "risk_wound_care": 1,
  "risk_invasive_devices": 3,
  "risk_procedures": 2,
  "risk_medications": 3,

  "notes": "Observaciones adicionales (opcional)"
}
```

#### Respuesta Exitosa (201 Created)

```json
{
  "success": true,
  "message": "Evaluación CUDYR creada exitosamente",
  "data": {
    "id": 1,
    "id_details_attention": 10,
    "dependency": {
      "dimensions": {
        "mobility": 2,
        "hygiene": 3,
        "nutrition": 2,
        "elimination": 3,
        "psychosocial": 2,
        "surveillance": 3
      },
      "total_score": 15,
      "classification": "B",
      "classification_text": "Dependencia Total"
    },
    "risk": {
      "dimensions": {
        "oxygen_therapy": 3,
        "airway_management": 2,
        "vital_signs": 3,
        "fluid_balance": 2,
        "wound_care": 1,
        "invasive_devices": 3,
        "procedures": 2,
        "medications": 3
      },
      "total_score": 19,
      "classification": "1",
      "classification_text": "Máximo Riesgo"
    },
    "cudyr_category": "A1",
    "risk_level": "critical",
    "notes": "Observaciones adicionales",
    "evaluated_by": {
      "id": 5,
      "nick": "enfermera.maria"
    },
    "evaluated_at": "2025-10-18T10:30:00Z",
    "created_at": "2025-10-18T10:30:00Z",
    "updated_at": "2025-10-18T10:30:00Z"
  }
}
```

**Nota:** Los campos `evaluated_by` y `evaluated_at` se asignan automáticamente con el usuario autenticado y la hora actual.

---

### 3️⃣ Ver Evaluación CUDYR

```http
GET /api/cudyr-evaluations/{id}
```

#### Respuesta (200 OK)

Igual estructura que la respuesta de creación.

---

### 4️⃣ Actualizar Evaluación CUDYR

```http
PUT /api/cudyr-evaluations/{id}
```

#### Request Body

Mismo formato que crear evaluación. Todos los campos son requeridos.

---

### 5️⃣ Eliminar Evaluación CUDYR

```http
DELETE /api/cudyr-evaluations/{id}
```

#### Respuesta (200 OK)

```json
{
  "success": true,
  "message": "Evaluación CUDYR eliminada exitosamente",
  "data": null
}
```

**Nota:** Al eliminar, el campo `score_CUDYR` en `details_attention` se limpia (null).

---

### 6️⃣ Obtener Evaluación por Detalle de Atención

```http
GET /api/cudyr-evaluations/detail/{detailId}
```

Retorna la evaluación CUDYR asociada a un `details_attention` específico.

---

### 7️⃣ Obtener Evaluaciones por Atención Hospitalaria

```http
GET /api/cudyr-evaluations/attention/{attentionId}
```

#### Query Parameters (Opcionales)

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `start_date` | date | Filtrar desde fecha |
| `end_date` | date | Filtrar hasta fecha |

Retorna todas las evaluaciones CUDYR de una atención hospitalaria (a través de sus detalles de atención).

---

### 8️⃣ Filtrar por Categoría CUDYR

```http
GET /api/cudyr-evaluations/by-category?category=A1
```

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category` | string | **Sí** | Categoría CUDYR (`A1`, `A2`, `A3`, `B1`, `B2`, `B3`, `C1`, `C2`, `C3`, `D3`) |
| `start_date` | date | No | Filtrar desde fecha |
| `end_date` | date | No | Filtrar hasta fecha |

---

### 9️⃣ Pacientes de Alto Riesgo

```http
GET /api/cudyr-evaluations/high-risk
```

#### Query Parameters (Opcionales)

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `start_date` | date | Filtrar desde fecha |
| `end_date` | date | Filtrar hasta fecha |

Retorna pacientes en categorías críticas: **A1, A2, A3, B1, B2, C1**

---

### 🔟 Estadísticas CUDYR

```http
GET /api/cudyr-evaluations/statistics
```

#### Respuesta (200 OK)

```json
{
  "success": true,
  "message": "Estadísticas de evaluaciones CUDYR obtenidas exitosamente",
  "data": {
    "total_evaluations": 150,
    "dependency": {
      "average_score": 10.5,
      "distribution": {
        "B_total_dependencia": 45,
        "C_parcial_dependencia": 60,
        "D_autosuficiencia": 45
      }
    },
    "risk": {
      "average_score": 12.3,
      "distribution": {
        "1_maximo_riesgo": 20,
        "2_alto_riesgo": 40,
        "3_mediano_riesgo": 50,
        "4_bajo_riesgo": 40
      }
    },
    "categories": {
      "A1": 10,
      "A2": 15,
      "A3": 20,
      "B1": 12,
      "B2": 18,
      "B3": 20,
      "C1": 8,
      "C2": 17,
      "C3": 15,
      "D3": 15
    },
    "alerts": {
      "high_risk_patients": 63,
      "critical_dependency": 45,
      "maximum_risk": 20
    },
    "recent": {
      "last_7_days": 35,
      "today": 8
    }
  }
}
```

**Uso sugerido:** Dashboards, KPIs, alertas de enfermería.

---

### 1️⃣1️⃣ Calcular CUDYR (Preview - Sin Guardar)

```http
POST /api/cudyr-evaluations/calculate
```

#### Request Body

```json
{
  "dependency_mobility": 2,
  "dependency_hygiene": 3,
  "dependency_nutrition": 2,
  "dependency_elimination": 3,
  "dependency_psychosocial": 2,
  "dependency_surveillance": 3,

  "risk_oxygen_therapy": 3,
  "risk_airway_management": 2,
  "risk_vital_signs": 3,
  "risk_fluid_balance": 2,
  "risk_wound_care": 1,
  "risk_invasive_devices": 3,
  "risk_procedures": 2,
  "risk_medications": 3
}
```

#### Respuesta (200 OK)

```json
{
  "success": true,
  "message": "Cálculo CUDYR realizado exitosamente",
  "data": {
    "dependency": {
      "total_score": 15,
      "classification": "B",
      "classification_text": "Dependencia Total"
    },
    "risk": {
      "total_score": 19,
      "classification": "1",
      "classification_text": "Máximo Riesgo"
    },
    "cudyr_category": "A1",
    "priority_level": "critical"
  }
}
```

**Uso sugerido:** Feedback en tiempo real mientras el usuario completa el formulario.

---

## 📊 Estructura de Datos

### Campos de Evaluación CUDYR

#### Dimensiones de Dependencia

| Campo | Tipo | Rango | Descripción |
|-------|------|-------|-------------|
| `dependency_mobility` | integer | 0-3 | **Movilización**<br>0: Deambula sin ayuda<br>1: Se levanta con ayuda<br>2: Levantado a silla (4-9 cambios/día)<br>3: No se levanta (10+ cambios/día) |
| `dependency_hygiene` | integer | 0-3 | **Higiene**<br>0: Se baña y viste solo<br>1: Participa con supervisión<br>2: Cambio de ropa 1-2 veces/día<br>3: Cambio de ropa 3+ veces/día |
| `dependency_nutrition` | integer | 0-3 | **Alimentación**<br>0: Se alimenta sin ayuda<br>1: Con ayuda y supervisión<br>2: Alimentación administrada<br>3: Alimentación parenteral/enteral |
| `dependency_elimination` | integer | 0-3 | **Eliminación**<br>0: Usa WC sin ayuda<br>1: Usa colectores con ayuda<br>2: Se le entregan colectores<br>3: Sonda, diálisis, pañales |
| `dependency_psychosocial` | integer | 0-3 | **Apoyo Psicosocial**<br>0: < 5 min/turno<br>1: 5-14 min/turno<br>2: 15-30 min/turno<br>3: > 30 min/turno |
| `dependency_surveillance` | integer | 0-3 | **Vigilancia**<br>0: Consciente, orientado<br>1: Inestabilidad de marcha<br>2: Riesgo caída (fármacos, invasivos)<br>3: Alteración consciencia/conducta |

#### Dimensiones de Riesgo

| Campo | Tipo | Rango | Descripción |
|-------|------|-------|-------------|
| `risk_oxygen_therapy` | integer | 0-3 | **Oxigenoterapia**<br>0: No requiere<br>1: Cánula nasal<br>2: Mascarilla simple/reservorio<br>3: Ventilación mecánica/FiO2 >40% |
| `risk_airway_management` | integer | 0-3 | **Manejo Vía Aérea**<br>0: No requiere<br>1: Apoyo kinésico 1 vez/día<br>2: 1-3 aspiraciones/día<br>3: Vía artificial o 4+ aspiraciones/día |
| `risk_vital_signs` | integer | 0-3 | **Signos Vitales**<br>0: No requiere<br>1: Cada 8-12h<br>2: Cada 4h<br>3: Cada 2h o menos |
| `risk_fluid_balance` | integer | 0-3 | **Balance Hídrico**<br>0: No requiere<br>1: 1 vez (24h)<br>2: 2-5 veces/día<br>3: 6+ veces/día |
| `risk_wound_care` | integer | 0-3 | **Curaciones**<br>0: No requiere<br>1: 1 curación simple<br>2: 1-2 curaciones complejas<br>3: 3+ curaciones complejas |
| `risk_invasive_devices` | integer | 0-3 | **Elementos Invasivos**<br>0: Sin elementos<br>1: 1 vía venosa periférica<br>2: 1-2 elementos o 2+ vías periféricas<br>3: 3+ elementos invasivos |
| `risk_procedures` | integer | 0-3 | **Procedimientos**<br>0: No requiere<br>1: Procedimientos menores<br>2: 1-2 procedimientos invasivos<br>3: 3+ procedimientos o 1+ médico |
| `risk_medications` | integer | 0-3 | **Medicamentos**<br>0: Sin tratamiento o solo VO<br>1: EV ocasional o IM/SC<br>2: EV intermitente (3+ dosis/día)<br>3: EV continua (vasoactivos, sedación) |

#### Campos Calculados Automáticamente

| Campo | Tipo | Descripción | Valores Posibles |
|-------|------|-------------|------------------|
| `dependency_total_score` | integer | Suma de 6 dimensiones de dependencia | 0-18 |
| `risk_total_score` | integer | Suma de 8 dimensiones de riesgo | 0-24 |
| `dependency_classification` | string(1) | Clasificación de dependencia | `D`, `C`, `B` |
| `risk_classification` | string(1) | Clasificación de riesgo | `4`, `3`, `2`, `1` |
| `cudyr_category` | string(2) | Categoría CUDYR final | `A1`, `A2`, `A3`, `B1`, `B2`, `B3`, `C1`, `C2`, `C3`, `D3` |

#### Campos Adicionales

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id_details_attention` | integer | **Sí** | ID del detalle de atención (único) |
| `notes` | string/null | No | Observaciones adicionales |
| `evaluated_by` | integer | Auto | ID del usuario que evaluó (automático) |
| `evaluated_at` | datetime | Auto | Fecha/hora de evaluación (automático) |

---

## ✅ Validaciones

### Creación de Evaluación CUDYR

#### Campos Requeridos (14 dimensiones)

Todas las dimensiones son **obligatorias**:

```javascript
const requiredFields = [
  // Dependencia (6)
  'dependency_mobility',
  'dependency_hygiene',
  'dependency_nutrition',
  'dependency_elimination',
  'dependency_psychosocial',
  'dependency_surveillance',

  // Riesgo (8)
  'risk_oxygen_therapy',
  'risk_airway_management',
  'risk_vital_signs',
  'risk_fluid_balance',
  'risk_wound_care',
  'risk_invasive_devices',
  'risk_procedures',
  'risk_medications'
];
```

#### Validación de Valores

```javascript
// Cada dimensión debe ser un entero entre 0 y 3
const validateDimension = (value) => {
  return Number.isInteger(value) && value >= 0 && value <= 3;
};
```

#### Validación de Unicidad

```javascript
// Solo puede existir UNA evaluación CUDYR por detalle de atención
// Error si ya existe:
{
  "success": false,
  "message": "Validación fallida",
  "errors": {
    "id_details_attention": [
      "Ya existe una evaluación CUDYR para este detalle de atención."
    ]
  }
}
```

### Actualización en `details_attention`

```javascript
// Campo score_CUDYR actualizado a rango 0-18
const validateScoreCUDYR = (value) => {
  if (value === null) return true; // Permitir null
  return Number.isInteger(value) && value >= 0 && value <= 18;
};
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Crear Evaluación para Paciente Crítico

```javascript
const createCriticalPatientEvaluation = async (detailsAttentionId) => {
  const response = await fetch('/api/cudyr-evaluations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      id_details_attention: detailsAttentionId,

      // Dependencia Total (B)
      dependency_mobility: 3,        // No se levanta
      dependency_hygiene: 3,         // Cambio ropa 3+ veces/día
      dependency_nutrition: 3,       // Alimentación parenteral
      dependency_elimination: 3,     // Sonda/diálisis
      dependency_psychosocial: 2,    // 15-30 min apoyo
      dependency_surveillance: 3,    // Alteración consciencia

      // Máximo Riesgo (1)
      risk_oxygen_therapy: 3,        // Ventilación mecánica
      risk_airway_management: 3,     // Vía artificial
      risk_vital_signs: 3,           // Cada 2h
      risk_fluid_balance: 3,         // 6+ veces/día
      risk_wound_care: 3,            // 3+ curaciones complejas
      risk_invasive_devices: 3,      // 3+ elementos invasivos
      risk_procedures: 3,            // Procedimientos médicos
      risk_medications: 3,           // Drogas vasoactivas

      notes: "Paciente post-operatorio complicado, UCI"
    })
  });

  const data = await response.json();

  if (data.success) {
    console.log('Categoría CUDYR:', data.data.cudyr_category); // "A1"
    console.log('Nivel de riesgo:', data.data.risk_level);     // "critical"
    console.log('Dependencia:', data.data.dependency.total_score); // 17
    console.log('Riesgo:', data.data.risk.total_score);            // 24
  }
};
```

### Ejemplo 2: Calcular en Tiempo Real (Preview)

```javascript
const calculateCUDYRPreview = async (formData) => {
  const response = await fetch('/api/cudyr-evaluations/calculate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(formData)
  });

  const data = await response.json();

  if (data.success) {
    return {
      category: data.data.cudyr_category,
      priority: data.data.priority_level,
      dependencyScore: data.data.dependency.total_score,
      riskScore: data.data.risk.total_score
    };
  }
};

// Uso en componente React/Vue
const handleFormChange = async (formValues) => {
  if (allFieldsFilled(formValues)) {
    const preview = await calculateCUDYRPreview(formValues);
    setPreview(preview); // Mostrar resultado al usuario
  }
};
```

### Ejemplo 3: Obtener Pacientes de Alto Riesgo para Dashboard

```javascript
const getHighRiskPatients = async () => {
  const response = await fetch(
    '/api/cudyr-evaluations/high-risk?start_date=2025-10-01&end_date=2025-10-18',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (data.success) {
    // Mapear para dashboard
    return data.data.data.map(evaluation => ({
      patientId: evaluation.details_attention.hospital_attention.patient.id,
      patientName: evaluation.details_attention.hospital_attention.patient.full_name,
      bed: evaluation.details_attention.hospital_attention.bed.name,
      category: evaluation.cudyr_category,
      riskLevel: evaluation.risk_level,
      evaluatedAt: evaluation.evaluated_at
    }));
  }
};
```

### Ejemplo 4: Mostrar Estadísticas

```javascript
const loadCUDYRStatistics = async () => {
  const response = await fetch('/api/cudyr-evaluations/statistics', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (data.success) {
    const stats = data.data;

    return {
      totalEvaluations: stats.total_evaluations,
      avgDependency: stats.dependency.average_score,
      avgRisk: stats.risk.average_score,
      alerts: {
        highRisk: stats.alerts.high_risk_patients,
        critical: stats.alerts.critical_dependency,
        maximum: stats.alerts.maximum_risk
      },
      distributionByCategory: stats.categories,
      recentActivity: stats.recent
    };
  }
};
```

### Ejemplo 5: Componente de Formulario (React)

```jsx
import React, { useState, useEffect } from 'react';

const CUDYREvaluationForm = ({ detailsAttentionId, onSuccess }) => {
  const [formData, setFormData] = useState({
    id_details_attention: detailsAttentionId,
    dependency_mobility: 0,
    dependency_hygiene: 0,
    dependency_nutrition: 0,
    dependency_elimination: 0,
    dependency_psychosocial: 0,
    dependency_surveillance: 0,
    risk_oxygen_therapy: 0,
    risk_airway_management: 0,
    risk_vital_signs: 0,
    risk_fluid_balance: 0,
    risk_wound_care: 0,
    risk_invasive_devices: 0,
    risk_procedures: 0,
    risk_medications: 0,
    notes: ''
  });

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Preview en tiempo real
  useEffect(() => {
    const calculatePreview = async () => {
      try {
        const response = await fetch('/api/cudyr-evaluations/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (data.success) {
          setPreview(data.data);
        }
      } catch (error) {
        console.error('Error calculando preview:', error);
      }
    };

    calculatePreview();
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/cudyr-evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.data);
      } else {
        setErrors(data.errors || {});
      }
    } catch (error) {
      console.error('Error creando evaluación:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDimensionInput = (field, label, descriptions) => (
    <div className="dimension-field">
      <label>{label}</label>
      <select
        value={formData[field]}
        onChange={(e) => setFormData({
          ...formData,
          [field]: parseInt(e.target.value)
        })}
      >
        {descriptions.map((desc, index) => (
          <option key={index} value={index}>
            {index} - {desc}
          </option>
        ))}
      </select>
      {errors[field] && <span className="error">{errors[field][0]}</span>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <h2>Evaluación CUDYR</h2>

      {/* Preview */}
      {preview && (
        <div className="preview-card">
          <h3>Resultado Calculado</h3>
          <div className={`category-badge ${preview.priority_level}`}>
            {preview.cudyr_category}
          </div>
          <p>
            Dependencia: {preview.dependency.total_score}/18
            ({preview.dependency.classification_text})
          </p>
          <p>
            Riesgo: {preview.risk.total_score}/24
            ({preview.risk.classification_text})
          </p>
        </div>
      )}

      {/* Sección Dependencia */}
      <section>
        <h3>Escala de Dependencia</h3>

        {renderDimensionInput(
          'dependency_mobility',
          'Movilización',
          [
            'Deambula sin ayuda',
            'Se levanta con ayuda',
            'Levantado a silla (4-9 cambios/día)',
            'No se levanta (10+ cambios/día)'
          ]
        )}

        {renderDimensionInput(
          'dependency_hygiene',
          'Higiene',
          [
            'Se baña y viste solo',
            'Participa con supervisión',
            'Cambio de ropa 1-2 veces/día',
            'Cambio de ropa 3+ veces/día'
          ]
        )}

        {/* ... resto de dimensiones de dependencia ... */}
      </section>

      {/* Sección Riesgo */}
      <section>
        <h3>Escala de Riesgo</h3>

        {renderDimensionInput(
          'risk_oxygen_therapy',
          'Oxigenoterapia',
          [
            'No requiere',
            'Cánula nasal',
            'Mascarilla simple/reservorio',
            'Ventilación mecánica/FiO2 >40%'
          ]
        )}

        {/* ... resto de dimensiones de riesgo ... */}
      </section>

      {/* Notas */}
      <div className="notes-field">
        <label>Observaciones (opcional)</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({
            ...formData,
            notes: e.target.value
          })}
          rows={4}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar Evaluación'}
      </button>
    </form>
  );
};
```

---

## ⚠️ Códigos de Error

### Errores de Validación (422)

```json
{
  "success": false,
  "message": "Validación fallida",
  "errors": {
    "dependency_mobility": [
      "La evaluación de movilización es obligatoria."
    ],
    "risk_oxygen_therapy": [
      "La evaluación de oxigenoterapia debe ser 0, 1, 2 o 3."
    ],
    "id_details_attention": [
      "Ya existe una evaluación CUDYR para este detalle de atención."
    ]
  }
}
```

### No Encontrado (404)

```json
{
  "success": false,
  "message": "Evaluación CUDYR no encontrada",
  "data": null
}
```

```json
{
  "success": false,
  "message": "No se encontró evaluación CUDYR para este detalle de atención",
  "data": null
}
```

### No Autorizado (401)

```json
{
  "success": false,
  "message": "Token inválido o expirado"
}
```

### Permisos Insuficientes (403)

```json
{
  "success": false,
  "message": "No tiene permisos para realizar esta acción"
}
```

### Error del Servidor (500)

```json
{
  "success": false,
  "message": "Error al crear evaluación CUDYR",
  "error": "Mensaje técnico del error"
}
```

---

## 🎨 Casos de Uso Comunes

### Caso 1: Formulario de Evaluación con Feedback en Tiempo Real

**Flujo:**
1. Usuario completa dimensiones una por una
2. Después de cada dimensión, llamar a `/calculate` para mostrar preview
3. Mostrar badge con categoría CUDYR y nivel de riesgo
4. Al finalizar, guardar con `POST /cudyr-evaluations`

**Beneficio:** Usuario sabe inmediatamente la categoría del paciente.

---

### Caso 2: Dashboard de Pacientes Críticos

**Flujo:**
1. Llamar a `/high-risk` al cargar dashboard
2. Mostrar tabla con pacientes categoría A1, A2, A3, B1, B2, C1
3. Ordenar por `risk_level` y `evaluated_at`
4. Permitir filtrar por rango de fechas

**Beneficio:** Visibilidad inmediata de pacientes que requieren atención prioritaria.

---

### Caso 3: Estadísticas de Enfermería

**Flujo:**
1. Llamar a `/statistics`
2. Crear gráficos:
   - Gráfico de dona: Distribución por categorías CUDYR
   - Gráfico de barras: Distribución por dependencia/riesgo
   - KPIs: Pacientes críticos, promedio dependencia, promedio riesgo
3. Actualizar cada 5 minutos

**Beneficio:** KPIs en tiempo real para gestión de enfermería.

---

### Caso 4: Historial de Evaluaciones por Paciente

**Flujo:**
1. Obtener `id_attentions` del paciente
2. Llamar a `/attention/{attentionId}`
3. Mostrar línea de tiempo con evolución de categorías CUDYR
4. Graficar tendencias de dependencia y riesgo

**Beneficio:** Seguimiento de evolución del paciente.

---

### Caso 5: Edición de Evaluación Existente

**Flujo:**
1. Obtener evaluación actual: `GET /details-attention/{id}` (incluye `cudyr_evaluation`)
2. Pre-llenar formulario con valores existentes
3. Actualizar: `PUT /cudyr-evaluations/{id}`

**Beneficio:** Corrección de evaluaciones o actualización según evolución.

---

## 🔍 Consideraciones de UX

### Visualización de Categorías CUDYR

Sugerimos usar colores consistentes:

```css
.category-A1, .category-A2, .category-B1, .category-B2, .category-C1 {
  background-color: #ef4444; /* Rojo - Crítico */
  color: white;
}

.category-A3 {
  background-color: #f97316; /* Naranja - Alto */
  color: white;
}

.category-B3, .category-C2, .category-D1 {
  background-color: #eab308; /* Amarillo - Medio */
  color: black;
}

.category-C3, .category-D3 {
  background-color: #22c55e; /* Verde - Bajo */
  color: white;
}
```

### Iconos Sugeridos

- 🔴 Categorías A1, A2, B1, B2, C1 (Crítico)
- 🟠 Categoría A3 (Alto)
- 🟡 Categorías B3, C2, D1 (Medio)
- 🟢 Categorías C3, D3 (Bajo)

### Tooltips Informativos

Agregar tooltips en cada dimensión con descripciones completas:

```javascript
const tooltips = {
  dependency_mobility: `
    0: Deambula sin ayuda, se moviliza solo en cama
    1: Se levanta y deambula con ayuda
    2: Es levantado a silla, requiere cambio de posición 4-9 veces/día
    3: No se levanta, requiere cambio de posición 10 o más veces/día
  `,
  // ... resto de tooltips
};
```

---

## 📱 Endpoints Resumidos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/cudyr-evaluations` | Listar evaluaciones |
| `POST` | `/api/cudyr-evaluations` | Crear evaluación |
| `GET` | `/api/cudyr-evaluations/{id}` | Ver evaluación |
| `PUT` | `/api/cudyr-evaluations/{id}` | Actualizar evaluación |
| `DELETE` | `/api/cudyr-evaluations/{id}` | Eliminar evaluación |
| `GET` | `/api/cudyr-evaluations/detail/{detailId}` | Por detalle de atención |
| `GET` | `/api/cudyr-evaluations/attention/{attentionId}` | Por atención hospitalaria |
| `GET` | `/api/cudyr-evaluations/by-category` | Filtrar por categoría |
| `GET` | `/api/cudyr-evaluations/high-risk` | Pacientes de alto riesgo |
| `GET` | `/api/cudyr-evaluations/statistics` | Estadísticas |
| `POST` | `/api/cudyr-evaluations/calculate` | Calcular sin guardar |

---

## 🆘 Soporte

**Dudas técnicas:**
- Backend: Revisar código en `/app/Http/Controllers/CudyrEvaluationController.php`
- Servicio de cálculo: `/app/Services/CudyrCalculationService.php`
- Modelo: `/app/Models/CudyrEvaluation.php`

**Documentación oficial CUDYR:**
- Sistema basado en metodología oficial chilena (MINSAL 2008)

---

**Última actualización:** 18 de Octubre, 2025
**Versión:** 1.0
