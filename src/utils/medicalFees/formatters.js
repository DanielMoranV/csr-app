/**
 * Funciones de formateo para el módulo de Honorarios Médicos
 */

import { STATUS_COLORS, STATUS_LABELS, TYPE_COLORS } from './constants';

/**
 * Formatea un monto como moneda peruana
 * @param {number} amount - Monto a formatear
 * @param {number} decimals - Número de decimales (default: 2)
 * @returns {string} Monto formateado
 */
export function formatCurrency(amount, decimals = 2) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return 'S/ 0.00';
    }
    return `S/ ${Number(amount).toFixed(decimals)}`;
}

/**
 * Formatea una fecha en formato local
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
export function formatDate(date) {
    if (!date) return 'N/A';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return 'N/A';

    return dateObj.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Formatea una fecha y hora en formato local
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha y hora formateada
 */
export function formatDateTime(date) {
    if (!date) return 'N/A';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return 'N/A';

    return dateObj.toLocaleString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Obtiene el color de severidad para un tipo de servicio
 * @param {string} type - Tipo de servicio (PLANILLA, RETEN)
 * @returns {string} Color de severidad de PrimeVue
 */
export function getTypeColor(type) {
    return TYPE_COLORS[type] || 'secondary';
}

/**
 * Obtiene el color de severidad para un estado
 * @param {string} status - Estado del servicio
 * @returns {string} Color de severidad de PrimeVue
 */
export function getStatusColor(status) {
    return STATUS_COLORS[status] || 'secondary';
}

/**
 * Obtiene la etiqueta traducida para un estado
 * @param {string} status - Estado del servicio
 * @returns {string} Etiqueta del estado
 */
export function getStatusLabel(status) {
    return STATUS_LABELS[status] || status;
}

/**
 * Formatea el nombre de un archivo para exportación
 * @param {string} prefix - Prefijo del archivo
 * @param {Date} date - Fecha para el nombre del archivo
 * @returns {string} Nombre del archivo formateado
 */
export function formatExportFilename(prefix = 'honorarios_medicos', date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    return `${prefix}_${dateStr}.xlsx`;
}

/**
 * Formatea un número con separadores de miles
 * @param {number} num - Número a formatear
 * @returns {string} Número formateado
 */
export function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) {
        return '0';
    }
    return Number(num).toLocaleString('es-PE');
}

/**
 * Formatea un porcentaje
 * @param {number} value - Valor del porcentaje (0-100)
 * @param {number} decimals - Número de decimales (default: 2)
 * @returns {string} Porcentaje formateado
 */
export function formatPercentage(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0%';
    }
    return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Trunca un texto a una longitud máxima
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto truncado
 */
export function truncateText(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Formatea el nombre de un médico
 * @param {Object} doctor - Objeto doctor
 * @returns {string} Nombre formateado
 */
export function formatDoctorName(doctor) {
    if (!doctor) return 'N/A';
    return doctor.name || 'Médico no identificado';
}

/**
 * Formatea el código de un médico
 * @param {Object} doctor - Objeto doctor
 * @returns {string} Código formateado
 */
export function formatDoctorCode(doctor) {
    if (!doctor) return 'N/A';
    return doctor.code || 'SIN_CODIGO';
}
