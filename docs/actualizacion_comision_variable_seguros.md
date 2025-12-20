# ✅ Actualización: Comisión Variable para Seguros/EPS

**Fecha:** 2025-12-20  
**Cambio:** Regla 2 - De porcentaje fijo (92.5%) a porcentaje variable

---

## 📋 Resumen del Cambio

### Antes (Fijo)

```javascript
// Regla 2: 92.5% fijo para todos los médicos
else if (isReten && company !== 'PARTICULAR') {
    comision = parseFloat((importe * 0.925).toFixed(2));
}
```

### Después (Variable)

```javascript
// Regla 2: Porcentaje variable según configuración del médico
else if (isReten && company !== 'PARTICULAR') {
    const insurancePercentage = doctor?.insurance_commission_percentage;

    if (insurancePercentage && parseFloat(insurancePercentage) > 0) {
        // Usar porcentaje personalizado
        const percentage = parseFloat(insurancePercentage) / 100;
        comision = parseFloat((importe * percentage).toFixed(2));
    } else {
        // Fallback: 92.5% (compatibilidad)
        comision = parseFloat((importe * 0.925).toFixed(2));
    }
}
```

---

## 🎯 Funcionamiento

### Campo en Base de Datos

- **Tabla:** `doctors`
- **Campo:** `insurance_commission_percentage` (decimal, nullable)
- **Ubicación:** Mismo nivel que `commission_percentage`

### Lógica de Aplicación

| Escenario                | `insurance_commission_percentage` | Comisión Aplicada          |
| ------------------------ | --------------------------------- | -------------------------- |
| Médico con % configurado | 85%                               | `monto × 85%`              |
| Médico con % configurado | 90%                               | `monto × 90%`              |
| Médico sin % configurado | `null` o `0`                      | `monto × 92.5%` (fallback) |

---

## 📊 Ejemplos

### Ejemplo 1: Médico con porcentaje personalizado

```
Dr. Juan Pérez
insurance_commission_percentage: 85%

Servicio: Atención de Emergencia RETÉN
Monto: S/ 200.00
Compañía: ESSALUD

Cálculo:
Comisión = 200.00 × (85 / 100)
Comisión = 200.00 × 0.85
Comisión = S/ 170.00
```

### Ejemplo 2: Médico sin porcentaje configurado (fallback)

```
Dr. María López
insurance_commission_percentage: null

Servicio: Atención de Emergencia RETÉN
Monto: S/ 200.00
Compañía: RIMAC

Cálculo:
Comisión = 200.00 × 0.925 (fallback)
Comisión = S/ 185.00
```

### Ejemplo 3: Médico con porcentaje bajo

```
Dr. Carlos Ruiz
insurance_commission_percentage: 70%

Servicio: Consulta RETÉN
Monto: S/ 100.00
Compañía: PACIFICO

Cálculo:
Comisión = 100.00 × (70 / 100)
Comisión = 100.00 × 0.70
Comisión = S/ 70.00
```

---

## ✅ Ventajas del Cambio

1. **Flexibilidad:** Cada médico puede tener su propio porcentaje para seguros
2. **Compatibilidad:** Médicos sin configuración siguen usando 92.5%
3. **Sin Breaking Changes:** No afecta datos existentes
4. **Fácil Configuración:** Solo actualizar el campo en la tabla `doctors`

---

## 🔧 Configuración de Médicos

Para configurar el porcentaje de un médico:

```sql
-- Ejemplo: Configurar 85% para el Dr. Juan Pérez (código 5001)
UPDATE doctors
SET insurance_commission_percentage = 85.00
WHERE code = '5001';

-- Ejemplo: Configurar 90% para el Dr. María López (código 5002)
UPDATE doctors
SET insurance_commission_percentage = 90.00
WHERE code = '5002';

-- Ejemplo: Volver a usar el valor por defecto (92.5%)
UPDATE doctors
SET insurance_commission_percentage = NULL
WHERE code = '5003';
```

---

## 📝 Tabla Comparativa de Reglas

| Regla   | Tipo     | Compañía    | Porcentaje Usado                  | Fuente                                    |
| ------- | -------- | ----------- | --------------------------------- | ----------------------------------------- |
| Regla 1 | PLANILLA | Cualquiera  | `commission_percentage`           | `doctors.commission_percentage`           |
| Regla 2 | RETÉN    | Seguros/EPS | `insurance_commission_percentage` | `doctors.insurance_commission_percentage` |
| Regla 3 | RETÉN    | PARTICULAR  | `commission_percentage`           | `doctors.commission_percentage`           |

---

## 🚀 Estado

✅ **Implementado y listo para producción**

- Código actualizado en `useMedicalFees.js`
- Lógica con fallback para compatibilidad
- Sin breaking changes
- Funciona con datos existentes

---

**Implementado por:** Sistema de Comisiones Médicas  
**Fecha:** 2025-12-20  
**Versión:** 2.0
