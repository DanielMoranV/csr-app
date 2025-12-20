# ✅ Validación Pre-Producción: Sistema de Comisiones Médicas

**Fecha:** 2025-12-20  
**Versión:** 1.0  
**Estado:** Listo para revisión

---

## 📋 Resumen Ejecutivo

Se ha realizado una validación exhaustiva del sistema de cálculo de comisiones médicas para identificar posibles contradicciones, casos edge y problemas de lógica antes del despliegue a producción.

### ✅ Resultado General: **APROBADO CON OBSERVACIONES**

- **Reglas principales:** Sin contradicciones detectadas
- **Casos edge:** 3 escenarios requieren atención
- **Recomendaciones:** 2 mejoras sugeridas

---

## 🔍 Análisis de Reglas de Negocio

### 1. Flujo de Decisión (if-else if-else)

```javascript
// Líneas 62-112 en useMedicalFees.js
if (isPlanilla && !isConsultationCode) {
    // REGLA 1: PLANILLA
} else if (isReten && company !== 'PARTICULAR') {
    // REGLA 2: RETÉN + Seguros/EPS
} else if (isReten && company === 'PARTICULAR') {
    // REGLA 3: RETÉN + PARTICULAR
}
```

**✅ Validación:** La estructura `if-else if-else` es **mutuamente excluyente**, lo que garantiza que solo se ejecute una regla a la vez.

---

## ⚠️ Casos Edge Identificados

### Caso Edge 1: PLANILLA + Código de Consulta + Seguros

**Escenario:**

```javascript
type: 'PLANILLA'
segusCode: '50.01.00' (código de consulta)
company: 'ESSALUD'
commission_percentage: 40%
```

**Comportamiento actual:**

- La condición `isPlanilla && !isConsultationCode` es **FALSE** (porque ES código de consulta)
- Pasa a evaluar `isReten && company !== 'PARTICULAR'` → **FALSE** (no es RETÉN)
- Pasa a evaluar `isReten && company === 'PARTICULAR'` → **FALSE** (no es RETÉN)
- **Resultado:** `comision = 0` ✅

**✅ Validación:** Comportamiento correcto. Los códigos de consulta en PLANILLA no reciben comisión.

---

### Caso Edge 2: PLANILLA + PARTICULAR sin Tarifario ✅ RESUELTO

**Escenario:**

```javascript
type: 'PLANILLA'
company: 'PARTICULAR'
segusCode: 'ECO-001'
tariff: undefined (no existe tarifario personalizado)
commission_percentage: 40%
```

**Comportamiento actual:**

```javascript
// Línea 72
shouldApplyCommission = tariff && parseFloat(tariff.clinic_commission) > 0 && (tariff.doctor_commission === null || parseFloat(tariff.doctor_commission) === 0);
```

- `tariff` es `undefined`
- `shouldApplyCommission = false`
- **Resultado:** `comision = 0`

**✅ SOLUCIÓN IMPLEMENTADA:**

Se agregó validación automática que detecta este caso y añade alerta:

```javascript
// Líneas 244-256
if (isParticular && !hasCommission) {
    const tariff = doctorTariffsStore.allTariffs.find((t) => t.tariff_code === codSeg && t.doctor_code === doctorCode);

    if (!tariff) {
        detalle += ' ⚠️ SIN TARIFARIO PARTICULAR - Revisar si ingreso fue para clínica o médico cobró con tarifa general';
    }
}
```

**Comportamiento final:**

- **Comisión:** S/ 0.00 (correcto, requiere revisión manual)
- **Alerta:** "⚠️ SIN TARIFARIO PARTICULAR - Revisar si ingreso fue para clínica o médico cobró con tarifa general"
- **Acción:** El administrador debe revisar manualmente si corresponde pagar comisión

**Justificación de negocio:**

- Si todo el ingreso fue para la clínica → Debe recibir comisión (ajuste manual)
- Si el médico cobró con tarifa general → Ya recibió su pago (sin comisión adicional)

---

### Caso Edge 3: RETÉN + PARTICULAR sin Tarifario ✅ RESUELTO

**Escenario:**

```javascript
type: 'RETÉN'
company: 'PARTICULAR'
segusCode: 'ECO-001'
tariff: undefined (no existe tarifario personalizado)
commission_percentage: 40%
```

**Comportamiento actual:**

```javascript
// Línea 101
if (tariff && parseFloat(tariff.clinic_commission) > 0 && (tariff.doctor_commission === null || parseFloat(tariff.doctor_commission) === 0)) {
    // Aplicar comisión
}
```

- `tariff` es `undefined`
- Condición es **FALSE**
- **Resultado:** `comision = 0`

**✅ SOLUCIÓN IMPLEMENTADA:**

La misma validación del Caso Edge 2 aplica para RETÉN:

```javascript
// Líneas 244-256
if (isParticular && !hasCommission) {
    const tariff = doctorTariffsStore.allTariffs.find((t) => t.tariff_code === codSeg && t.doctor_code === doctorCode);

    if (!tariff) {
        detalle += ' ⚠️ SIN TARIFARIO PARTICULAR - Revisar si ingreso fue para clínica o médico cobró con tarifa general';
    }
}
```

**Comportamiento final:**

- **Comisión:** S/ 0.00 (correcto, requiere revisión manual)
- **Alerta:** "⚠️ SIN TARIFARIO PARTICULAR - Revisar si ingreso fue para clínica o médico cobró con tarifa general"
- **Acción:** El administrador debe revisar manualmente si corresponde pagar comisión

**Justificación de negocio:**

- Si todo el ingreso fue para la clínica → Debe recibir comisión por trabajar en guardia (ajuste manual)
- Si el médico cobró con tarifa general → Ya recibió su pago (sin comisión adicional)

---

### Caso Edge 4: Médico sin `commission_percentage`

**Escenario:**

```javascript
type: 'PLANILLA'
company: 'ESSALUD'
doctor.commission_percentage: null o 0
```

**Comportamiento actual:**

```javascript
// Líneas 81-87
if (commissionPercentage && parseFloat(commissionPercentage) > 0) {
    comision = parseFloat((importe * percentage).toFixed(2));
}
```

- **Resultado:** `comision = 0` ✅

**✅ Validación:** Comportamiento correcto. Si el médico no tiene porcentaje configurado, no recibe comisión.

---

## 🧪 Matriz de Decisión Completa

| #   | Tipo     | Compañía   | Código     | Tarifario     | `doctor_commission` | `clinic_commission` | `commission_percentage` | Comisión Esperada | ✅/⚠️ |
| --- | -------- | ---------- | ---------- | ------------- | ------------------- | ------------------- | ----------------------- | ----------------- | ----- |
| 1   | PLANILLA | ESSALUD    | Normal     | N/A           | N/A                 | N/A                 | 40%                     | `monto × 40%`     | ✅    |
| 2   | PLANILLA | ESSALUD    | 50.01.00   | N/A           | N/A                 | N/A                 | 40%                     | S/ 0.00           | ✅    |
| 3   | PLANILLA | PARTICULAR | Normal     | Existe        | 0                   | 150                 | 40%                     | `monto × 40%`     | ✅    |
| 4   | PLANILLA | PARTICULAR | Normal     | Existe        | 120                 | 30                  | 40%                     | S/ 0.00           | ✅    |
| 5   | PLANILLA | PARTICULAR | Normal     | **No existe** | N/A                 | N/A                 | 40%                     | **S/ 0.00**       | ⚠️    |
| 6   | RETÉN    | ESSALUD    | Cualquiera | N/A           | N/A                 | N/A                 | N/A                     | `monto × 92.5%`   | ✅    |
| 7   | RETÉN    | PARTICULAR | Normal     | Existe        | 0                   | 150                 | 40%                     | `monto × 40%`     | ✅    |
| 8   | RETÉN    | PARTICULAR | Normal     | Existe        | 120                 | 30                  | 40%                     | S/ 0.00           | ✅    |
| 9   | RETÉN    | PARTICULAR | Normal     | **No existe** | N/A                 | N/A                 | 40%                     | **S/ 0.00**       | ⚠️    |
| 10  | PLANILLA | ESSALUD    | Normal     | N/A           | N/A                 | N/A                 | **0 o null**            | S/ 0.00           | ✅    |

**Leyenda:**

- ✅ = Comportamiento validado y correcto
- ⚠️ = Requiere validación de negocio

---

## 🔄 Validación de Clasificación (ServiceClassifier)

### Prioridad de Clasificación

```javascript
1. Sin horarios → RETÉN
2. Sin hora de atención → RETÉN
3. Hora dentro de horario con is_payment_payroll = true → PLANILLA
4. Hora dentro de horario con is_payment_payroll = false → RETÉN
5. Hora fuera de todos los horarios → RETÉN
```

**✅ Validación:** La lógica de clasificación es **determinística** y **sin ambigüedades**.

### Validación de Alertas

#### Alerta 1: SEGUS indica RETÉN pero horario es PLANILLA

```javascript
// Líneas 44-49
if (segusIndicatesReten && schedule.is_payment_payroll) {
    return {
        type: 'PLANILLA',
        reason: '⚠️ OBSERVACIÓN: Código SEGUS indica RETÉN...'
    };
}
```

**✅ Validación:** Correcto. Prioriza el horario sobre el código SEGUS, pero alerta al usuario.

#### Alerta 2: Clasificado RETÉN pero código NO indica RETÉN

```javascript
// Líneas 61-66
if (!segusIndicatesReten && !schedule.is_payment_payroll) {
    return {
        type: 'RETÉN',
        reason: '⚠️ Revisar atención, codigo NO RETEN'
    };
}
```

**✅ Validación:** Correcto. Alerta cuando hay inconsistencia entre clasificación y código.

---

## 🧩 Posibles Contradicciones

### ❌ No se encontraron contradicciones lógicas

Las reglas están correctamente estructuradas con `if-else if-else`, garantizando que:

1. Solo se ejecuta una regla a la vez
2. No hay solapamiento de condiciones
3. El orden de evaluación es correcto

---

## 📊 Escenarios de Prueba Críticos

### Test 1: PLANILLA + PARTICULAR con Tarifario (Todo para Clínica)

```javascript
Input:
  type: 'PLANILLA'
  company: 'PARTICULAR'
  amount: 150
  segusCode: 'ECO-001'
  tariff: { clinic_commission: 150, doctor_commission: 0 }
  doctor: { commission_percentage: 40 }

Expected: comision = 60.00 (150 × 0.40)
```

### Test 2: PLANILLA + PARTICULAR con Tarifario (Médico cobra especial)

```javascript
Input:
  type: 'PLANILLA'
  company: 'PARTICULAR'
  amount: 150
  segusCode: 'ECO-001'
  tariff: { clinic_commission: 30, doctor_commission: 120 }
  doctor: { commission_percentage: 40 }

Expected: comision = 0.00 (tiene tarifa especial)
```

### Test 3: RETÉN + ESSALUD

```javascript
Input:
  type: 'RETEN'
  company: 'ESSALUD'
  amount: 200

Expected: comision = 185.00 (200 × 0.925)
```

### Test 4: RETÉN + PARTICULAR con Tarifario (Todo para Clínica) ✨ NUEVO

```javascript
Input:
  type: 'RETEN'
  company: 'PARTICULAR'
  amount: 150
  segusCode: 'ECO-001'
  tariff: { clinic_commission: 150, doctor_commission: 0 }
  doctor: { commission_percentage: 40 }

Expected: comision = 60.00 (150 × 0.40)
```

### Test 5: PLANILLA + Código de Consulta

```javascript
Input:
  type: 'PLANILLA'
  company: 'ESSALUD'
  amount: 80
  segusCode: '50.01.00'
  doctor: { commission_percentage: 35 }

Expected: comision = 0.00 (código excluido)
```

### Test 6: PLANILLA + Código 50.03.00 (Excepción)

```javascript
Input:
  type: 'PLANILLA'
  company: 'ESSALUD'
  amount: 100
  segusCode: '50.03.00'
  doctor: { commission_percentage: 35 }

Expected: comision = 35.00 (100 × 0.35) - Excepción válida
```

### Test 7: PLANILLA + PARTICULAR sin Tarifario ⚠️

```javascript
Input:
  type: 'PLANILLA'
  company: 'PARTICULAR'
  amount: 150
  segusCode: 'ECO-001'
  tariff: undefined
  doctor: { commission_percentage: 40 }

Expected Actual: comision = 0.00
Expected Deseado: ¿Validar con negocio?
```

### Test 8: RETÉN + PARTICULAR sin Tarifario ⚠️

```javascript
Input:
  type: 'RETEN'
  company: 'PARTICULAR'
  amount: 150
  segusCode: 'ECO-001'
  tariff: undefined
  doctor: { commission_percentage: 40 }

Expected Actual: comision = 0.00
Expected Deseado: ¿Validar con negocio?
```

---

## 🎯 Recomendaciones Pre-Producción

### 1. ⚠️ CRÍTICO: Validar Casos sin Tarifario

**Acción requerida:** Confirmar con el equipo de negocio el comportamiento esperado para:

- PLANILLA + PARTICULAR sin tarifario configurado
- RETÉN + PARTICULAR sin tarifario configurado

**Opciones:**

- **Opción A (Actual):** No pagar comisión si no hay tarifario
- **Opción B:** Pagar comisión según `commission_percentage` aunque no haya tarifario

### 2. ✅ Agregar Validación de Datos

**Sugerencia:** Agregar validación para detectar médicos sin `commission_percentage` configurado:

```javascript
// Al inicio de calculateCommissionRule
if (!doctor?.commission_percentage || parseFloat(doctor.commission_percentage) <= 0) {
    console.warn(`[Comisiones] Médico ${doctorCode} sin commission_percentage configurado`);
    // Opcionalmente: registrar en log para auditoría
}
```

### 3. ✅ Documentar Casos Edge en Código

**Sugerencia:** Agregar comentarios explicativos para casos edge:

```javascript
// Regla 1: PLANILLA
if (isPlanilla && !isConsultationCode) {
    // ...
    if (company === 'PARTICULAR') {
        // IMPORTANTE: Si no existe tarifario, NO se paga comisión
        // Esto es intencional para evitar pagos sin configuración previa
        shouldApplyCommission = tariff && parseFloat(tariff.clinic_commission) > 0 && (tariff.doctor_commission === null || parseFloat(tariff.doctor_commission) === 0);
    }
}
```

---

## ✅ Checklist Pre-Producción

- [x] Validar estructura lógica de reglas (sin contradicciones)
- [x] Identificar casos edge
- [x] Crear matriz de decisión completa
- [x] Definir escenarios de prueba
- [ ] **PENDIENTE:** Validar con negocio casos sin tarifario (Casos Edge 2 y 3)
- [ ] **PENDIENTE:** Ejecutar tests unitarios con escenarios críticos
- [ ] **PENDIENTE:** Validar con datos reales de producción (muestra pequeña)
- [ ] **PENDIENTE:** Revisar logs de importación para detectar casos no contemplados

---

## 📝 Conclusión

El sistema de comisiones médicas tiene una **lógica sólida y bien estructurada** sin contradicciones detectadas. Sin embargo, se identificaron **2 casos edge** que requieren validación de negocio antes del despliegue:

1. **PLANILLA + PARTICULAR sin tarifario** → Actualmente: S/ 0.00
2. **RETÉN + PARTICULAR sin tarifario** → Actualmente: S/ 0.00

**Recomendación final:**

- ✅ **Aprobar para producción** si el comportamiento actual para casos sin tarifario es el esperado
- ⚠️ **Retener despliegue** si se requiere modificar el comportamiento para casos sin tarifario

---

**Validado por:** Sistema de Análisis Automático  
**Fecha:** 2025-12-20  
**Próxima revisión:** Después de validación de negocio
