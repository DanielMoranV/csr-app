/**
 * Constantes para el módulo de Honorarios Médicos
 */

import { FilterMatchMode, FilterOperator } from '@primevue/core/api';

/**
 * Opciones de tipo de servicio
 */
export const TYPE_OPTIONS = [
    { label: 'Todos', value: null },
    { label: 'Planilla', value: 'PLANILLA' },
    { label: 'Retén', value: 'RETEN' }
];

/**
 * Opciones de estado de servicio
 */
export const STATUS_OPTIONS = [
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Revisado', value: 'revisado' },
    { label: 'Aprobado', value: 'aprobado' },
    { label: 'Rechazado', value: 'rechazado' }
];

/**
 * Mapeo de colores para tipos de servicio
 */
export const TYPE_COLORS = {
    PLANILLA: 'success',
    RETEN: 'warning',
    RETÉN: 'warning'
};

/**
 * Mapeo de colores para estados
 */
export const STATUS_COLORS = {
    pendiente: 'warn',
    revisado: 'info',
    aprobado: 'success',
    rechazado: 'danger'
};

/**
 * Mapeo de etiquetas para estados
 */
export const STATUS_LABELS = {
    pendiente: 'Pendiente',
    revisado: 'Revisado',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado'
};

/**
 * Estados válidos para servicios médicos
 */
export const VALID_STATUSES = ['pendiente', 'revisado', 'aprobado', 'rechazado'];

/**
 * Estados inmutables (no se pueden modificar una vez alcanzados)
 */
export const IMMUTABLE_STATUSES = ['aprobado', 'rechazado'];

/**
 * Configuración de filtros para DataTable de PrimeVue
 */
export const DEFAULT_FILTERS = {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    'rawData.admision': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    patientName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    'doctor.name': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    'rawData.segus': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    serviceType: { value: null, matchMode: FilterMatchMode.EQUALS },
    status: { value: null, matchMode: FilterMatchMode.EQUALS },
    comision: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
    cia: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    tipoate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    serviceTypeReason: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
};

/**
 * Campos globales para búsqueda en DataTable
 */
export const GLOBAL_FILTER_FIELDS = ['id', 'rawData.admision', 'patientName', 'doctor.name', 'rawData.segus', 'cia', 'tipoate', 'serviceTypeReason'];

/**
 * Configuración de paginación para DataTable
 */
export const PAGINATION_CONFIG = {
    rows: 10,
    rowsPerPageOptions: [10, 20, 50, 100],
    paginatorTemplate: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown',
    currentPageReportTemplate: 'Mostrando {first} a {last} de {totalRecords} servicios'
};

/**
 * Configuración de paginación para tabla de resumen
 */
export const SUMMARY_PAGINATION_CONFIG = {
    rows: 10,
    rowsPerPageOptions: [10, 20, 50],
    paginatorTemplate: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown',
    currentPageReportTemplate: 'Mostrando {first} a {last} de {totalRecords} médicos'
};

/**
 * ID de especialidad de Pediatría (pre-seleccionada por defecto)
 */
export const DEFAULT_SPECIALTY_ID = 32;
