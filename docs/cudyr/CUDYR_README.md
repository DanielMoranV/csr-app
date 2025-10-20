# 🏥 Sistema CUDYR - Cuidados Según Dependencia y Riesgo

> Sistema completo de evaluación de enfermería integrado en la plataforma hospitalaria

---

## 📖 ¿Qué es CUDYR?

CUDYR es un **sistema de clasificación de pacientes** desarrollado por la Pontificia Universidad Católica de Chile y adoptado oficialmente por el MINSAL en 2008. Evalúa a los pacientes hospitalizados en dos escalas:

1. **Dependencia** - Capacidad del paciente para autocuidado (6 dimensiones, 0-18 puntos)
2. **Riesgo** - Complejidad de cuidados médicos requeridos (8 dimensiones, 0-24 puntos)

El cruce de ambas escalas genera **12 categorías** (A1 a D3) que permiten:

✅ Asignar recursos de enfermería adecuadamente
✅ Identificar pacientes críticos que requieren atención prioritaria
✅ Calcular carga de trabajo del personal de enfermería
✅ Generar estadísticas para gestión hospitalaria
✅ Mejorar calidad de atención y seguridad del paciente

---

## 🎯 Objetivo de la Implementación

Reemplazar el sistema simplificado anterior (`score_CUDYR: 0-100`) con una **evaluación CUDYR completa y detallada** que sigue la metodología oficial.

### Antes
```
score_CUDYR: 75  # ¿Qué significa? 🤷
```

### Ahora
```json
{
  "cudyr_category": "A1",
  "risk_level": "critical",
  "dependency": {
    "total_score": 15,
    "classification": "B",
    "classification_text": "Dependencia Total",
    "dimensions": {
      "mobility": 3,      // No se levanta
      "hygiene": 3,       // Cambio ropa 3+ veces/día
      "nutrition": 3,     // Alimentación parenteral
      ...
    }
  },
  "risk": {
    "total_score": 20,
    "classification": "1",
    "classification_text": "Máximo Riesgo",
    "dimensions": {
      "oxygen_therapy": 3,      // Ventilación mecánica
      "airway_management": 3,   // Vía artificial
      "vital_signs": 3,         // Medición cada 2h
      ...
    }
  }
}
```

**Resultado:** Clasificación clara, justificada y auditable.

---

## 📊 Las 12 Categorías CUDYR

```
              RIESGO →
DEPENDENCIA ↓  Máximo  Alto   Mediano  Bajo
═══════════════════════════════════════════
Total (B)      🔴 A1   🔴 A2   🟠 A3   🟠 A3
Parcial (C)    🔴 B1   🔴 B2   🟡 B3   🟡 B3
Autosuf. (D)   🔴 C1   🟡 C2   🟢 C3   🟢 D3
```

### Niveles de Prioridad

- 🔴 **Crítico** (A1, A2, B1, B2, C1): Atención intensiva, ratio enfermera:paciente 1:2
- 🟠 **Alto** (A3): Monitoreo cercano, ratio 1:4
- 🟡 **Medio** (B3, C2): Atención regular, ratio 1:6
- 🟢 **Bajo** (C3, D3): Atención básica, ratio 1:8

---

## 🗂️ Archivos del Proyecto

### Backend

```
app/
├── Models/
│   ├── CudyrEvaluation.php          # Modelo principal
│   └── DetailsAttention.php          # Actualizado con relación
├── Services/
│   └── CudyrCalculationService.php   # Lógica de cálculo
├── Http/
│   ├── Controllers/
│   │   └── CudyrEvaluationController.php  # 11 endpoints
│   ├── Requests/
│   │   ├── CudyrEvaluationRequest.php     # Validaciones
│   │   └── DetailsAttentionRequest.php    # Actualizado (0-18)
│   └── Resources/
│       ├── CudyrEvaluationResource.php
│       └── DetailsAttentionResource.php   # Incluye CUDYR
├── database/
│   ├── migrations/
│   │   └── 2025_10_18_184827_create_cudyr_evaluations_table.php
│   └── factories/
│       └── CudyrEvaluationFactory.php
└── routes/
    └── api.php  # Nuevas rutas
```

### Documentación

```
📁 Documentación Frontend
├── CUDYR_API_DOCUMENTATION.md   # 📘 Documentación completa
├── CUDYR_QUICK_REFERENCE.md     # 🚀 Guía rápida + ejemplos
└── CUDYR_README.md               # 📖 Este archivo (overview)
```

---

## 🔧 Instalación

### 1. Ejecutar Migración

```bash
php artisan migrate --force
```

Esto creará la tabla `cudyr_evaluations` con todas las dimensiones.

### 2. Verificar Rutas

```bash
php artisan route:list --path=cudyr
```

Deberías ver 11 rutas nuevas.

### 3. Probar con Tinker (opcional)

```bash
php artisan tinker
```

```php
// Crear evaluación de prueba
$evaluation = \App\Models\CudyrEvaluation::factory()->create();

// Ver categoría
$evaluation->cudyr_category; // "A1", "B2", etc.

// Ver nivel de riesgo
$evaluation->risk_level; // "critical", "medium", "low"
```

---

## 📡 API Endpoints

### CRUD Básico
```
POST   /api/cudyr-evaluations           # Crear
GET    /api/cudyr-evaluations/{id}      # Ver
PUT    /api/cudyr-evaluations/{id}      # Actualizar
DELETE /api/cudyr-evaluations/{id}      # Eliminar
GET    /api/cudyr-evaluations           # Listar (con filtros)
```

### Endpoints Especializados
```
GET    /api/cudyr-evaluations/detail/{detailId}         # Por detalle atención
GET    /api/cudyr-evaluations/attention/{attentionId}   # Por atención hospital
GET    /api/cudyr-evaluations/by-category               # Filtrar por categoría
GET    /api/cudyr-evaluations/high-risk                 # Pacientes críticos
GET    /api/cudyr-evaluations/statistics                # Estadísticas
POST   /api/cudyr-evaluations/calculate                 # Preview (sin guardar)
```

**Ver documentación completa:** `CUDYR_API_DOCUMENTATION.md`

---

## 🎨 Casos de Uso

### 1. Evaluación de Enfermería

**Flujo:**
1. Enfermera abre expediente del paciente
2. Accede a "Nueva Evaluación CUDYR"
3. Completa 14 dimensiones (6 dependencia + 8 riesgo)
4. Ve preview en tiempo real de categoría CUDYR
5. Guarda evaluación
6. Sistema actualiza automáticamente `score_CUDYR` en `details_attention`

**Resultado:** Paciente clasificado en categoría oficial CUDYR.

---

### 2. Dashboard de Pacientes Críticos

**Flujo:**
1. Jefa de enfermería accede al dashboard
2. Sistema muestra pacientes en categorías A1, A2, B1, B2, C1
3. Ordenados por nivel de riesgo y fecha de evaluación
4. Puede filtrar por rango de fechas
5. Puede exportar reporte

**Resultado:** Visibilidad inmediata de pacientes que requieren atención intensiva.

---

### 3. Asignación de Recursos

**Flujo:**
1. Administración consulta estadísticas CUDYR
2. Ve distribución de pacientes por categoría
3. Calcula ratio enfermera:paciente requerido
4. Ajusta turnos según carga de trabajo

**Resultado:** Asignación eficiente de personal de enfermería.

---

### 4. Seguimiento de Evolución

**Flujo:**
1. Médico revisa historial de paciente
2. Ve gráfico de evolución de categorías CUDYR
3. Identifica tendencias (mejora/deterioro)
4. Ajusta plan de cuidados

**Resultado:** Toma de decisiones basada en datos objetivos.

---

## 🔐 Permisos

Endpoints CUDYR requieren autenticación JWT y uno de estos roles:
- Director Médico
- Administración
- Médicos
- Emergencia
- Hospitalización
- Quirófano
- Admisión

---

## ⚡ Performance

- ✅ Caché inteligente (5-30 minutos según endpoint)
- ✅ Paginación disponible en listados
- ✅ Índices en campos clave (categoría, clasificaciones)
- ✅ Eager loading de relaciones
- ✅ Rate limiting (throttling)

---

## 🧪 Testing

### Test Manual con Postman/Insomnia

```json
POST /api/cudyr-evaluations
Authorization: Bearer {token}
Content-Type: application/json

{
  "id_details_attention": 1,
  "dependency_mobility": 2,
  "dependency_hygiene": 3,
  "dependency_nutrition": 2,
  "dependency_elimination": 3,
  "dependency_psychosocial": 1,
  "dependency_surveillance": 3,
  "risk_oxygen_therapy": 3,
  "risk_airway_management": 2,
  "risk_vital_signs": 3,
  "risk_fluid_balance": 2,
  "risk_wound_care": 1,
  "risk_invasive_devices": 3,
  "risk_procedures": 2,
  "risk_medications": 3,
  "notes": "Paciente en estado crítico"
}
```

**Respuesta esperada:**
- `cudyr_category: "A1"` (Dependencia Total + Máximo Riesgo)
- `risk_level: "critical"`
- `dependency_total_score: 14`
- `risk_total_score: 19`

---

## 📚 Recursos Adicionales

### Documentación
- **API Completa:** `CUDYR_API_DOCUMENTATION.md` (20+ páginas)
- **Guía Rápida:** `CUDYR_QUICK_REFERENCE.md` (snippets de código)
- **Este archivo:** `CUDYR_README.md` (overview general)

### Metodología CUDYR
- Basada en sistema oficial chileno (MINSAL 2008)
- Validado científicamente
- Usado en hospitales de Chile, Perú y otros países de Latinoamérica

### Soporte Técnico
- **Backend:** `app/Http/Controllers/CudyrEvaluationController.php`
- **Cálculos:** `app/Services/CudyrCalculationService.php`
- **Modelo:** `app/Models/CudyrEvaluation.php`

---

## ⚠️ Cambios Importantes

### BREAKING CHANGE: `score_CUDYR`

El campo `score_CUDYR` en la tabla `details_attention` ha cambiado:

```diff
- Rango anterior: 0-100
+ Rango nuevo: 0-18
```

**Acción requerida:**
- Actualizar validaciones de frontend
- Actualizar rangos de inputs
- Actualizar mensajes de error
- Revisar dashboards que usen este campo

**Nota:** Este cambio fue necesario para alinear con la metodología CUDYR oficial.

---

## 🎯 Próximos Pasos (Recomendados)

### Para Backend
- [ ] Ejecutar migración en producción
- [ ] Monitorear logs de errores
- [ ] Revisar performance de queries

### Para Frontend
- [ ] Leer `CUDYR_API_DOCUMENTATION.md`
- [ ] Actualizar validación de `score_CUDYR` (0-100 → 0-18)
- [ ] Implementar formulario de evaluación CUDYR
- [ ] Crear dashboard de pacientes críticos
- [ ] Implementar visualización de estadísticas
- [ ] Agregar badges de categorías CUDYR en vistas de pacientes

### Testing Conjunto
- [ ] Crear evaluación de prueba
- [ ] Verificar cálculos automáticos
- [ ] Probar preview en tiempo real
- [ ] Validar filtros y búsquedas
- [ ] Revisar estadísticas

---

## 🤝 Contribuciones

### ¿Encontraste un bug?
1. Revisar documentación primero
2. Revisar código del controller/service
3. Revisar logs de Laravel
4. Reportar con reproducción clara

### ¿Necesitas una nueva funcionalidad?
1. Verificar que no exista en endpoints actuales
2. Revisar si se puede lograr con endpoints existentes
3. Documentar caso de uso
4. Discutir con equipo

---

## 📊 Métricas de Éxito

Indicadores de que el sistema funciona correctamente:

✅ Todas las evaluaciones tienen categoría CUDYR válida (A1-D3)
✅ `score_CUDYR` en `details_attention` siempre coincide con `dependency_total_score`
✅ Pacientes críticos se identifican en <2 segundos
✅ Estadísticas se cargan en <1 segundo (con caché)
✅ Sin errores 500 en logs
✅ Enfermeras completan evaluación en <3 minutos

---

## 📞 Contacto y Soporte

**Equipo Backend:**
- Revisar código en `/app/Http/Controllers/CudyrEvaluationController.php`
- Servicio de cálculo en `/app/Services/CudyrCalculationService.php`

**Equipo Frontend:**
- Leer `CUDYR_API_DOCUMENTATION.md`
- Usar `CUDYR_QUICK_REFERENCE.md` para ejemplos de código

**Metodología CUDYR:**
- Basada en sistema oficial MINSAL Chile
- Validación científica disponible en literatura médica

---

## 📝 Changelog

### v1.0 (18 Oct 2025) - Release Inicial

**Nuevas funcionalidades:**
- ✅ Sistema CUDYR completo (14 dimensiones)
- ✅ 11 endpoints de API
- ✅ Clasificación automática en 12 categorías
- ✅ Estadísticas y reportes
- ✅ Identificación de pacientes críticos
- ✅ Preview en tiempo real

**Cambios:**
- ⚠️ `score_CUDYR` cambió de 0-100 a 0-18
- ⚠️ Ahora representa "Score de Dependencia Total"

**Migraciones:**
- ✅ Tabla `cudyr_evaluations` creada
- ✅ Relación con `details_attention`

---

## 🎓 Aprendizaje

Para entender el sistema completo, recomendamos este orden:

1. **Este archivo** (`CUDYR_README.md`) - Contexto general
2. **Quick Reference** (`CUDYR_QUICK_REFERENCE.md`) - Ejemplos de código
3. **Documentación API** (`CUDYR_API_DOCUMENTATION.md`) - Detalles técnicos
4. **Código fuente** - Para detalles de implementación

---

**Sistema implementado el:** 18 de Octubre, 2025
**Versión:** 1.0
**Estado:** ✅ Listo para integración frontend

---

¡Feliz codificación! 🚀
