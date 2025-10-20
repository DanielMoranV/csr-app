# 🚀 CUDYR - Guía Rápida de Referencia

> Documento de referencia rápida para integración frontend

---

## 📌 Cambios Críticos

### ⚠️ BREAKING CHANGE: Campo `score_CUDYR`

```diff
// ANTES
- score_CUDYR: 0-100 (score genérico)

// AHORA
+ score_CUDYR: 0-18 (score de dependencia total)
```

**Actualizar validaciones en:**
- Formularios de `details_attention`
- Validaciones de frontend
- Rangos de inputs
- Mensajes de error

---

## 🎯 Categorías CUDYR - Referencia Visual

```
┌─────────────────────────────────────────────────────────────┐
│                  MATRIZ CUDYR (12 CATEGORÍAS)               │
├─────────────────┬────────┬────────┬────────┬────────────────┤
│ DEPENDENCIA →   │ Máximo │  Alto  │ Mediano│     Bajo       │
│ RIESGO ↓        │ (1)    │  (2)   │  (3)   │     (4)        │
├─────────────────┼────────┼────────┼────────┼────────────────┤
│ Total (B)       │  🔴A1  │  🔴A2  │  🟠A3  │     🟠A3       │
│ 13-18 pts       │        │        │        │                │
├─────────────────┼────────┼────────┼────────┼────────────────┤
│ Parcial (C)     │  🔴B1  │  🔴B2  │  🟡B3  │     🟡B3       │
│ 7-12 pts        │        │        │        │                │
├─────────────────┼────────┼────────┼────────┼────────────────┤
│ Autosuf. (D)    │  🔴C1  │  🟡C2  │  🟢C3  │     🟢D3       │
│ 0-6 pts         │        │        │        │                │
└─────────────────┴────────┴────────┴────────┴────────────────┘

🔴 CRÍTICO: A1, A2, B1, B2, C1 → Atención prioritaria
🟠 ALTO:    A3                 → Monitoreo cercano
🟡 MEDIO:   B3, C2, D1         → Atención regular
🟢 BAJO:    C3, D3             → Atención básica
```

---

## 📋 Checklist de Integración

### Paso 1: Actualizar Componentes Existentes
- [ ] Actualizar validación de `score_CUDYR` (0-100 → 0-18)
- [ ] Modificar inputs/sliders de `score_CUDYR`
- [ ] Actualizar mensajes de validación
- [ ] Probar formularios de `details_attention`

### Paso 2: Crear Componentes CUDYR
- [ ] Formulario de evaluación CUDYR (14 dimensiones)
- [ ] Vista de evaluación existente
- [ ] Componente de preview/cálculo en tiempo real
- [ ] Badge de categoría CUDYR
- [ ] Indicador de nivel de riesgo

### Paso 3: Dashboards y Reportes
- [ ] Dashboard de pacientes críticos
- [ ] Gráfico de distribución por categorías
- [ ] KPIs de enfermería
- [ ] Historial de evaluaciones por paciente

### Paso 4: Testing
- [ ] Probar creación de evaluaciones
- [ ] Probar actualización de evaluaciones
- [ ] Probar cálculo en tiempo real
- [ ] Probar filtros y búsquedas
- [ ] Probar estadísticas

---

## 🔥 Snippets de Código Esenciales

### 1. Hook de React para CUDYR

```javascript
// hooks/useCUDYR.js
import { useState, useEffect } from 'react';

export const useCUDYR = (initialData = null) => {
  const [formData, setFormData] = useState(
    initialData || {
      id_details_attention: null,
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
    }
  );

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const calculatePreview = async () => {
      try {
        const response = await fetch('/api/cudyr-evaluations/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (data.success) {
          setPreview(data.data);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    if (formData.id_details_attention) {
      calculatePreview();
    }
  }, [formData]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cudyr-evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  return { formData, preview, loading, updateField, save };
};
```

### 2. Componente Badge de Categoría

```javascript
// components/CUDYRBadge.jsx
import React from 'react';

const CATEGORY_CONFIG = {
  A1: { color: 'bg-red-600', text: 'text-white', label: 'CRÍTICO', icon: '🔴' },
  A2: { color: 'bg-red-600', text: 'text-white', label: 'CRÍTICO', icon: '🔴' },
  A3: { color: 'bg-orange-500', text: 'text-white', label: 'ALTO', icon: '🟠' },
  B1: { color: 'bg-red-600', text: 'text-white', label: 'CRÍTICO', icon: '🔴' },
  B2: { color: 'bg-red-600', text: 'text-white', label: 'CRÍTICO', icon: '🔴' },
  B3: { color: 'bg-yellow-500', text: 'text-black', label: 'MEDIO', icon: '🟡' },
  C1: { color: 'bg-red-600', text: 'text-white', label: 'CRÍTICO', icon: '🔴' },
  C2: { color: 'bg-yellow-500', text: 'text-black', label: 'MEDIO', icon: '🟡' },
  C3: { color: 'bg-green-500', text: 'text-white', label: 'BAJO', icon: '🟢' },
  D3: { color: 'bg-green-500', text: 'text-white', label: 'BAJO', icon: '🟢' },
};

export const CUDYRBadge = ({ category, size = 'md' }) => {
  const config = CATEGORY_CONFIG[category] || {
    color: 'bg-gray-400',
    text: 'text-white',
    label: 'N/A',
    icon: '⚪'
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-semibold
        ${config.color} ${config.text} ${sizeClasses[size]}
      `}
    >
      <span>{config.icon}</span>
      <span>{category}</span>
      <span className="ml-1 opacity-80">({config.label})</span>
    </span>
  );
};
```

### 3. Selector de Dimensión Reutilizable

```javascript
// components/DimensionSelector.jsx
import React from 'react';

export const DimensionSelector = ({
  value,
  onChange,
  label,
  descriptions,
  error
}) => {
  return (
    <div className="dimension-field">
      <label className="block text-sm font-medium mb-2">
        {label}
      </label>

      <div className="space-y-2">
        {descriptions.map((desc, index) => (
          <label
            key={index}
            className={`
              flex items-start p-3 border rounded cursor-pointer
              transition-colors
              ${value === index
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <input
              type="radio"
              name={label}
              value={index}
              checked={value === index}
              onChange={(e) => onChange(parseInt(e.target.value))}
              className="mt-1 mr-3"
            />
            <div>
              <span className="font-semibold text-blue-600 mr-2">
                {index}
              </span>
              <span className="text-gray-700">{desc}</span>
            </div>
          </label>
        ))}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
```

### 4. Service/API Client

```javascript
// services/cudyrAPI.js
const API_BASE = '/api/cudyr-evaluations';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const cudyrAPI = {
  // Listar evaluaciones
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}?${query}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Crear evaluación
  create: async (data) => {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Ver evaluación
  get: async (id) => {
    const response = await fetch(`${API_BASE}/${id}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Actualizar evaluación
  update: async (id, data) => {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Eliminar evaluación
  delete: async (id) => {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Por detalle de atención
  getByDetail: async (detailId) => {
    const response = await fetch(`${API_BASE}/detail/${detailId}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Por atención hospitalaria
  getByAttention: async (attentionId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE}/attention/${attentionId}?${query}`,
      { headers: getAuthHeaders() }
    );
    return response.json();
  },

  // Filtrar por categoría
  getByCategory: async (category, params = {}) => {
    const query = new URLSearchParams({ category, ...params }).toString();
    const response = await fetch(`${API_BASE}/by-category?${query}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Pacientes de alto riesgo
  getHighRisk: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/high-risk?${query}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Estadísticas
  getStatistics: async () => {
    const response = await fetch(`${API_BASE}/statistics`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Calcular sin guardar
  calculate: async (data) => {
    const response = await fetch(`${API_BASE}/calculate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  }
};
```

### 5. TypeScript Types

```typescript
// types/cudyr.ts

export type DimensionValue = 0 | 1 | 2 | 3;

export type DependencyClassification = 'D' | 'C' | 'B';
export type RiskClassification = '4' | '3' | '2' | '1';

export type CUDYRCategory =
  | 'A1' | 'A2' | 'A3'
  | 'B1' | 'B2' | 'B3'
  | 'C1' | 'C2' | 'C3'
  | 'D3';

export type RiskLevel = 'critical' | 'medium' | 'low';

export interface CUDYRFormData {
  id_details_attention: number;

  // Dependencia (6 dimensiones)
  dependency_mobility: DimensionValue;
  dependency_hygiene: DimensionValue;
  dependency_nutrition: DimensionValue;
  dependency_elimination: DimensionValue;
  dependency_psychosocial: DimensionValue;
  dependency_surveillance: DimensionValue;

  // Riesgo (8 dimensiones)
  risk_oxygen_therapy: DimensionValue;
  risk_airway_management: DimensionValue;
  risk_vital_signs: DimensionValue;
  risk_fluid_balance: DimensionValue;
  risk_wound_care: DimensionValue;
  risk_invasive_devices: DimensionValue;
  risk_procedures: DimensionValue;
  risk_medications: DimensionValue;

  notes?: string;
}

export interface CUDYREvaluation extends CUDYRFormData {
  id: number;
  dependency_total_score: number;
  risk_total_score: number;
  dependency_classification: DependencyClassification;
  risk_classification: RiskClassification;
  cudyr_category: CUDYRCategory;
  evaluated_by: number;
  evaluated_at: string;
  created_at: string;
  updated_at: string;
}

export interface CUDYRDependency {
  dimensions: {
    mobility: DimensionValue;
    hygiene: DimensionValue;
    nutrition: DimensionValue;
    elimination: DimensionValue;
    psychosocial: DimensionValue;
    surveillance: DimensionValue;
  };
  total_score: number;
  classification: DependencyClassification;
  classification_text: string;
}

export interface CUDYRRisk {
  dimensions: {
    oxygen_therapy: DimensionValue;
    airway_management: DimensionValue;
    vital_signs: DimensionValue;
    fluid_balance: DimensionValue;
    wound_care: DimensionValue;
    invasive_devices: DimensionValue;
    procedures: DimensionValue;
    medications: DimensionValue;
  };
  total_score: number;
  classification: RiskClassification;
  classification_text: string;
}

export interface CUDYRResponse {
  id: number;
  id_details_attention: number;
  dependency: CUDYRDependency;
  risk: CUDYRRisk;
  cudyr_category: CUDYRCategory;
  risk_level: RiskLevel;
  notes: string | null;
  evaluated_by: {
    id: number;
    nick: string;
  } | null;
  evaluated_at: string;
  created_at: string;
  updated_at: string;
}

export interface CUDYRPreview {
  dependency: {
    total_score: number;
    classification: DependencyClassification;
    classification_text: string;
  };
  risk: {
    total_score: number;
    classification: RiskClassification;
    classification_text: string;
  };
  cudyr_category: CUDYRCategory;
  priority_level: RiskLevel;
}

export interface CUDYRStatistics {
  total_evaluations: number;
  dependency: {
    average_score: number;
    distribution: {
      B_total_dependencia: number;
      C_parcial_dependencia: number;
      D_autosuficiencia: number;
    };
  };
  risk: {
    average_score: number;
    distribution: {
      '1_maximo_riesgo': number;
      '2_alto_riesgo': number;
      '3_mediano_riesgo': number;
      '4_bajo_riesgo': number;
    };
  };
  categories: Record<CUDYRCategory, number>;
  alerts: {
    high_risk_patients: number;
    critical_dependency: number;
    maximum_risk: number;
  };
  recent: {
    last_7_days: number;
    today: number;
  };
}
```

---

## 📚 Descripciones de Dimensiones

### Dependencia

```javascript
export const DEPENDENCY_DESCRIPTIONS = {
  mobility: [
    'Deambula sin ayuda, se moviliza solo en cama',
    'Se levanta y deambula con ayuda',
    'Es levantado a silla, requiere cambio de posición 4-9 veces/día',
    'No se levanta, requiere cambio de posición 10 o más veces/día'
  ],
  hygiene: [
    'Se baña y viste sin ayuda',
    'Participa en su higiene con supervisión',
    'Requiere cambio de ropa 1-2 veces/día',
    'Requiere cambio de ropa 3 o más veces/día'
  ],
  nutrition: [
    'Se alimenta sin ayuda',
    'Se alimenta con ayuda y supervisión',
    'Alimentación oral que le es administrada',
    'Alimentación parenteral total/parcial o enteral permanente'
  ],
  elimination: [
    'Usa colectores sin ayuda o usa WC',
    'Usuario y familia realizan recolección con ayuda',
    'Se le entregan/colocan colectores (chata, pato)',
    'Sonda, prótesis, diálisis, colectores adhesivos o pañales'
  ],
  psychosocial: [
    'Requiere menos de 5 minutos de apoyo durante el turno',
    'Requiere entre 5-14 minutos de apoyo',
    'Requiere entre 15-30 minutos de apoyo',
    'Requiere más de 30 minutos de apoyo durante el turno'
  ],
  surveillance: [
    'Consciente, orientado, autónomo',
    'Consciente con inestabilidad de la marcha',
    'Consciente pero intranquilo, con riesgo de caída',
    'Alteración de consciencia/conducta o alto riesgo de caída'
  ]
};
```

### Riesgo

```javascript
export const RISK_DESCRIPTIONS = {
  oxygen_therapy: [
    'No requiere oxígeno adicional',
    'Oxígeno por cánula nasal',
    'Oxígeno por mascarilla simple o con reservorio',
    'Ventilación mecánica o FiO2 >40%'
  ],
  airway_management: [
    'No requiere apoyo ventilatorio adicional',
    'Vía natural, apoyo kinésico 1 vez/día',
    'Vía natural con 1-3 aspiraciones y/o apoyo kinésico 2-3 veces/día',
    'Vía aérea artificial o 4+ aspiraciones con apoyo kinésico >4 veces/día'
  ],
  vital_signs: [
    'No requiere medición',
    'Medición cada 8-12 horas',
    'Medición cada 4 horas',
    'Medición de 2+ parámetros cada 2 horas o menos'
  ],
  fluid_balance: [
    'No requiere balance hídrico',
    'Balance 1 vez (cada 24 horas)',
    'Balance 2-5 veces (cada 12, 8, 6 o 5 horas)',
    'Balance 6 veces o más (cada 4 horas o más frecuente)'
  ],
  wound_care: [
    'No requiere curaciones',
    '1 curación simple',
    '1-2 curaciones de heridas complejas',
    '3 o más curaciones de heridas complejas en 24 horas'
  ],
  invasive_devices: [
    'Sin elementos invasivos',
    '1 vía venosa periférica',
    '1-2 elementos invasivos o 2+ vías venosas periféricas',
    '3 o más elementos invasivos (catéteres, sondas, drenajes)'
  ],
  procedures: [
    'No requiere procedimientos',
    'Procedimientos menores',
    '1-2 procedimientos de enfermería invasivos',
    '3+ procedimientos enfermería o 1+ procedimiento médico invasivo'
  ],
  medications: [
    'Sin tratamiento farmacológico o solo VO',
    'Medicación EV ocasional o IM/SC',
    'Medicación EV intermitente (3 o más dosis/día)',
    'Medicación EV continua (vasoactivos, sedación, quimioterapia)'
  ]
};
```

---

## 🎨 Colores CSS

```css
/* Categorías CUDYR */
.cudyr-A1, .cudyr-A2, .cudyr-B1, .cudyr-B2, .cudyr-C1 {
  --bg: #dc2626; /* red-600 */
  --text: #ffffff;
  --border: #991b1b; /* red-800 */
}

.cudyr-A3 {
  --bg: #ea580c; /* orange-600 */
  --text: #ffffff;
  --border: #9a3412; /* orange-800 */
}

.cudyr-B3, .cudyr-C2 {
  --bg: #ca8a04; /* yellow-600 */
  --text: #000000;
  --border: #854d0e; /* yellow-800 */
}

.cudyr-C3, .cudyr-D3 {
  --bg: #16a34a; /* green-600 */
  --text: #ffffff;
  --border: #166534; /* green-800 */
}

/* Niveles de riesgo */
.risk-critical {
  color: #dc2626;
  font-weight: bold;
}

.risk-medium {
  color: #ca8a04;
}

.risk-low {
  color: #16a34a;
}
```

---

## ⚡ Performance Tips

1. **Caché de estadísticas:** Las estadísticas se cachean 30 minutos
2. **Debounce en cálculos:** Usar debounce de 300ms en preview
3. **Paginación:** Usar `paginate=true` para listas grandes
4. **Eager loading:** El API ya incluye relaciones necesarias

---

## 🐛 Debugging

### Consola del navegador

```javascript
// Ver preview en tiempo real
window.debugCUDYR = async (formData) => {
  const response = await fetch('/api/cudyr-evaluations/calculate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(formData)
  });
  const data = await response.json();
  console.table(data.data);
  return data;
};

// Usar en consola:
// await window.debugCUDYR({ dependency_mobility: 2, ... })
```

---

## 📞 Contacto

**Backend API:** `/app/Http/Controllers/CudyrEvaluationController.php`
**Cálculos:** `/app/Services/CudyrCalculationService.php`
**Modelo:** `/app/Models/CudyrEvaluation.php`

---

**Última actualización:** 18 de Octubre, 2025
