# Sistema de Permisos Centralizado (RBAC)

El acceso al **menú lateral** y a las **rutas** se gobierna por **permisos RBAC dinámicos**
(`modulo.accion`, ej. `treasury.view`), no por el cargo (`position`) del usuario.

> Histórico: el sistema migró de autorización por `position` (cargo) a roles + permisos.
> El campo `positions` aún existe en algunos módulos como **dato legado inerte** (no lo usan
> ni el menú ni el router). La autorización de navegación es 100% por permiso.

## Archivo de configuración

**Ubicación:** `/src/config/permissions.js` — fuente única de verdad para router y menú.

## Cómo funciona el acceso

El objeto `user` (de login / `GET /api/auth/me`) incluye:

```jsonc
{
  "permissions": ["treasury.view", "roles.manage", "..."], // slugs efectivos del usuario
  "is_superuser": false,                                    // true = SISTEMAS, acceso global
  "roles": [{ "id": 21, "name": "Auditor Médico", "slug": "auditor-medico" }]
}
```

Regla de visibilidad de un módulo (menú y ruta):

```js
visible = user.is_superuser || requiredPermission.some(p => user.permissions.includes(p))
```

- **`is_superuser`** (SISTEMAS) ve y accede a todo.
- Un módulo **sin `permission`** es **público**: visible para cualquier sesión válida.
- `permission` puede ser un **slug (string)** o un **arreglo de slugs** ("cualquiera de").

El catálogo de permisos es **dinámico**: se administra desde el módulo "Roles y Permisos"
(`/admin/roles`) y se lee del backend (`GET /api/permissions`). No se hardcodea en el front.

## Cómo modificar permisos

### 1. Cambiar el permiso de un módulo existente

Edita el campo `permission` del módulo en `MODULE_PERMISSIONS`:

```javascript
treasuryBanks: {
    name: 'treasury-banks',
    path: '/tesoreria/bancos',
    permission: 'treasury.view',   // ← slug requerido (o ['treasury.view', 'treasury.manage'])
    label: 'Bancos',
    icon: 'pi pi-fw pi-building',
    menuSection: 'Tesorería'
}
```

> El slug debe existir en el backend y estar asignado a los roles correspondientes,
> de lo contrario el módulo quedará oculto para los no-superusuarios.

### 2. Agregar un nuevo módulo

Agrega la entrada en `MODULE_PERMISSIONS`:

```javascript
miNuevoModulo: {
    name: 'mi-nuevo-modulo',
    path: '/mi-nuevo-modulo',
    permission: 'mi-modulo.view',  // omitir el campo => módulo público (toda sesión válida)
    label: 'Mi Nuevo Módulo',
    icon: 'pi pi-fw pi-star',
    menuSection: 'Mi Sección',
    showInMenu: true               // opcional, default: true
}
```

Y la ruta en `/src/router/index.js`:

```javascript
{
    path: MODULE_PERMISSIONS.miNuevoModulo.path,
    name: MODULE_PERMISSIONS.miNuevoModulo.name,
    component: () => import('@/views/MiNuevoModulo.vue'),
    meta: { requiresAuth: true }   // el guard resuelve el permiso desde MODULE_PERMISSIONS por nombre de ruta
}
```

> El guard del router (`beforeEach` en `router/index.js`) resuelve el permiso requerido
> desde `MODULE_PERMISSIONS` usando `to.name` (índice `moduleByName`). También respeta
> `meta.permission` si se define explícitamente. **No es necesario** repetir el permiso en el `meta`.

## Helpers de autorización

En componentes/vistas usa el composable `useAuth()`:

```js
const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperuser, permissions, roles } = useAuth();

if (hasPermission('treasury.manage')) { /* mostrar botón de edición */ }
```

`isSuperuser` y `hasPermission` ya contemplan el acceso global del superusuario.

## Permisos a nivel de componente/funcionalidad

Varios roles pueden **ver** una pantalla pero solo algunos **editar** ciertas secciones.
Para eso se usa `hasPermission(slug)` dentro de la vista (ocultar/deshabilitar botones, modo
solo-lectura, etc.). Ejemplo:

```javascript
// Ver la lista la permite el permiso de módulo; gestionar requiere el permiso ".manage"
const canManage = computed(() => hasPermission('hospitalization.manage'));
const canApprove = computed(() => hasPermission('hospital-attentions.approve'));
```

> Nota: algunos componentes aún usan helpers por **posición** (`hasAnyPosition`,
> `PERMISSION_GROUPS` de `usePermissions`) para lógica intra-vista heredada. Esto es
> independiente de la autorización de navegación (que es por permiso) y se migrará por separado.

## Ventajas

✅ **Una sola fuente de verdad** (`permissions.js`): router y menú coinciden automáticamente.
✅ **Permisos dinámicos**: roles y permisos se administran en runtime desde `/admin/roles`.
✅ **Superusuario** (`is_superuser`) con acceso global, sin asignaciones explícitas.
✅ **Públicos explícitos**: un módulo sin `permission` es accesible para toda sesión válida.
