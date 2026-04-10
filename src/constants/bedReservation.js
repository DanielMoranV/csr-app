/**
 * Constantes compartidas para el módulo de Reservas de Camas.
 * Importar desde aquí para garantizar consistencia en toda la app.
 */

export const RESERVATION_STATUS = {
    activa:     { label: 'Activa',      severity: 'info',    icon: 'pi pi-calendar' },
    confirmada: { label: 'Confirmada',  severity: 'success', icon: 'pi pi-check' },
    completada: { label: 'Completada',  severity: 'success', icon: 'pi pi-check-circle' },
    cancelada:  { label: 'Cancelada',   severity: 'danger',  icon: 'pi pi-times-circle' },
    expirada:   { label: 'Expirada',    severity: 'secondary', icon: 'pi pi-clock' }
};

export const AUDIT_EVENTS = {
    created:     { label: 'Creada',          severity: 'info',    icon: 'pi pi-plus-circle' },
    completed:   { label: 'Completada',      severity: 'success', icon: 'pi pi-check-circle' },
    cancelled:   { label: 'Cancelada',       severity: 'danger',  icon: 'pi pi-times-circle' },
    expired:     { label: 'Expirada (auto)', severity: 'secondary', icon: 'pi pi-clock' },
    bed_changed: { label: 'Cambio de cama',  severity: 'warn',    icon: 'pi pi-arrows-h' }
};

/** Etiquetas legibles para los campos que aparecen en los diffs de auditoría */
export const FIELD_LABELS = {
    status:            'Estado',
    id_beds:           'Cama',
    notes:             'Notas',
    admission_number:  'N° Admisión',
    completed_by_nick: 'Usuario Sisclin',
    completed_at:      'Completado en'
};

/**
 * Posiciones con acceso al historial de auditoría de reservas.
 * Deben coincidir con los roles que el backend autoriza en el endpoint:
 * GET /bed-reservations/audits
 */
export const AUDIT_ALLOWED_POSITIONS = [
    'ADMINISTRACION',
    'GERENCIA',
    'ADMISION',
    'HOSPITALIZACION',
    'SISTEMAS',
    'COORDINADOR HOSPITALIZACION',
    'DIRECTOR MEDICO'
];

/**
 * Retorna el descriptor de un estado de reserva, con fallback seguro.
 * @param {string} status
 */
export function getStatusConfig(status) {
    return RESERVATION_STATUS[status] ?? { label: status, severity: 'secondary', icon: 'pi pi-circle' };
}

/**
 * Retorna el descriptor de un evento de auditoría, con fallback seguro.
 * @param {string} event
 */
export function getAuditEventConfig(event) {
    return AUDIT_EVENTS[event] ?? { label: event, severity: 'secondary', icon: 'pi pi-info-circle' };
}
