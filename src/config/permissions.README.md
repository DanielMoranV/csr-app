# Sistema de Permisos Centralizado

Este sistema permite gestionar los permisos de acceso a los módulos de la aplicación desde un único archivo de configuración.

## Archivo de configuración

**Ubicación:** `/src/config/permissions.js`

## Cómo modificar permisos

### 1. Para cambiar permisos de un módulo existente

Edita el objeto correspondiente en `MODULE_PERMISSIONS`:

```javascript
// Ejemplo: Dar acceso al dashboard solo a SISTEMAS
dashboard: {
    name: 'dashboard',
    path: '/dashboard',
    positions: [POSITIONS.SISTEMAS], // ← Modificar aquí
    label: 'Dashboard',
    icon: 'pi pi-fw pi-home',
    menuSection: 'Principal'
}
```

Puedes usar:
- **Posiciones individuales:** `[POSITIONS.SISTEMAS, POSITIONS.RRHH]`
- **Grupos predefinidos:** `PERMISSION_GROUPS.HIGH_MANAGEMENT`
- **Acceso universal:** `PERMISSION_GROUPS.ALL` o `['*']`

### 2. Para agregar un nuevo módulo

Agrega una nueva entrada en `MODULE_PERMISSIONS`:

```javascript
miNuevoModulo: {
    name: 'mi-nuevo-modulo',           // nombre de la ruta
    path: '/mi-nuevo-modulo',          // URL
    positions: [POSITIONS.SISTEMAS],   // permisos
    label: 'Mi Nuevo Módulo',          // texto del menú
    icon: 'pi pi-fw pi-star',          // ícono PrimeVue
    menuSection: 'Mi Sección',         // sección del menú
    showInMenu: true                   // mostrar en menú (opcional, default: true)
}
```

Luego agrégalo al router en `/src/router/index.js`:

```javascript
{
    path: MODULE_PERMISSIONS.miNuevoModulo.path,
    name: MODULE_PERMISSIONS.miNuevoModulo.name,
    component: () => import('@/views/MiNuevoModulo.vue'),
    meta: {
        requiresAuth: true,
        positions: MODULE_PERMISSIONS.miNuevoModulo.positions
    }
}
```

### 3. Para crear un nuevo grupo de permisos

Agrega una nueva entrada en `PERMISSION_GROUPS`:

```javascript
export const PERMISSION_GROUPS = {
    // ... grupos existentes

    MI_NUEVO_GRUPO: [
        POSITIONS.SISTEMAS,
        POSITIONS.ADMINISTRACION,
        POSITIONS.CONTABILIDAD
    ]
};
```

Luego úsalo en cualquier módulo:

```javascript
miModulo: {
    // ...
    positions: PERMISSION_GROUPS.MI_NUEVO_GRUPO
}
```

## Posiciones disponibles

### Administrativas
- `SISTEMAS` - Acceso global total
- `DIRECTOR_MEDICO`
- `ADMINISTRACION`
- `RRHH`
- `CONTABILIDAD`

### Operativas
- `FACTURACION`
- `ADMISION`
- `LOGISTICA`

### Médicas
- `MEDICOS`
- `EMERGENCIA`
- `HOSPITALIZACION`
- `QUIROFANO`
- `CONSULTORIOS`

### Diagnóstico
- `LABORATORIO`
- `RAYOS_X`

### Otras
- `FARMACIA`
- `ARCHIVO_HISTORIAS`

## Grupos de permisos predefinidos

- `ADMIN_FULL` - Solo SISTEMAS
- `HIGH_MANAGEMENT` - SISTEMAS, ADMINISTRACION, DIRECTOR_MEDICO
- `ADMINISTRATIVE` - Personal administrativo
- `OPERATIONAL` - Personal operativo (ADMISION, FACTURACION)
- `MEDICAL` - Personal médico
- `HOSPITALIZATION_STAFF` - Personal con acceso a hospitalización
- `ATTENTIONS_ACCESS` - Personal con acceso a atenciones
- `ALL` - Todos los usuarios autenticados

## Ventajas de este sistema

✅ **Un solo lugar para modificar permisos** - Edita `permissions.js` y los cambios se aplican en router y menú automáticamente

✅ **Consistencia garantizada** - Router y menú siempre usan los mismos permisos

✅ **Fácil de mantener** - No duplicar arrays de posiciones en múltiples archivos

✅ **Documentación clara** - Todas las rutas y permisos están centralizados y documentados

## Permisos a nivel de componente/funcionalidad

Además de los permisos de módulos (acceso a rutas), algunos componentes pueden tener permisos específicos para funcionalidades individuales dentro de una vista.

### Ejemplo: HospitalAttentions.vue

**Ubicación:** `/src/views/attentions/HospitalAttentions.vue` (líneas 19-29)

Este componente tiene tres niveles de permisos:

```javascript
// PERMISOS DE EDICIÓN: HOSPITALIZACION, DIRECTOR_MEDICO y MEDICOS pueden editar detalles y tareas de atención
const canEdit = computed(() =>
    hasPosition(USER_POSITIONS.HOSPITALIZACION) ||
    hasPosition(USER_POSITIONS.DIRECTOR_MEDICO) ||
    hasPosition(USER_POSITIONS.MEDICOS)
);

// PERMISOS DE AUDITORÍA: Solo DIRECTOR_MEDICO puede registrar/editar auditorías médicas diarias
const canEditAudits = computed(() => hasPosition(USER_POSITIONS.DIRECTOR_MEDICO));

// PERMISOS DE APROBACIÓN: Solo DIRECTOR_MEDICO puede aprobar alta de atención
const isDirectorMedico = computed(() => hasPosition(USER_POSITIONS.DIRECTOR_MEDICO));
```

**¿Cuándo usar permisos a nivel de componente?**
- Cuando múltiples roles pueden **ver** la misma pantalla pero solo algunos pueden **editar** ciertas secciones
- Cuando hay acciones específicas dentro de un módulo que requieren permisos especiales
- Para ocultar/deshabilitar botones o formularios según el rol del usuario

**Cómo modificar:**
1. Localiza la sección de "CONFIGURACIÓN DE PERMISOS POR FUNCIONALIDAD" en el componente
2. Modifica la posición requerida en el computed correspondiente
3. El componente aplicará automáticamente la restricción (botones ocultos, formularios en modo solo lectura, etc.)

### Ubicaciones de permisos a nivel de componente

| Componente | Funcionalidad | Posición Requerida | Línea Aprox. |
|------------|---------------|-------------------|--------------|
| `HospitalAttentions.vue` | Editar detalles y tareas | `HOSPITALIZACION`, `DIRECTOR_MEDICO`, `MEDICOS` | 23 |
| `HospitalAttentions.vue` | Auditorías médicas | `DIRECTOR_MEDICO` | 30 |
| `HospitalAttentions.vue` | Aprobar alta de atención | `DIRECTOR_MEDICO` | 33 |

## Ejemplos comunes

### Agregar CONTABILIDAD a un módulo existente

```javascript
usuarios: {
    // ... configuración existente
    positions: [POSITIONS.SISTEMAS, POSITIONS.ADMINISTRACION, POSITIONS.RRHH, POSITIONS.CONTABILIDAD]
}
```

### Hacer un módulo accesible a todo el personal médico

```javascript
consultasMedicas: {
    // ... configuración
    positions: PERMISSION_GROUPS.MEDICAL
}
```

### Crear módulo solo para SISTEMAS

```javascript
configuracion: {
    // ... configuración
    positions: PERMISSION_GROUPS.ADMIN_FULL
}
```

### Cambiar quién puede registrar auditorías médicas

En `/src/views/attentions/HospitalAttentions.vue`, modifica:

```javascript
// Antes: Solo DIRECTOR_MEDICO
const canEditAudits = computed(() => hasPosition(USER_POSITIONS.DIRECTOR_MEDICO));

// Después: DIRECTOR_MEDICO y MEDICOS
const canEditAudits = computed(() =>
    hasPosition(USER_POSITIONS.DIRECTOR_MEDICO) || hasPosition(USER_POSITIONS.MEDICOS)
);
```
