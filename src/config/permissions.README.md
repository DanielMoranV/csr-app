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
