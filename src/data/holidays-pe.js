/**
 * Feriados Oficiales de Perú
 * Fuente: Decreto Supremo que establece los días feriados no laborables para el sector público
 * https://www.gob.pe/institucion/pcm/normas-legales
 *
 * Este archivo debe actualizarse anualmente con los feriados oficiales
 */

export const PERU_HOLIDAYS = {
    // Año 2024
    2024: [
        { date: '2024-01-01', name: 'Año Nuevo' },
        { date: '2024-03-28', name: 'Jueves Santo' },
        { date: '2024-03-29', name: 'Viernes Santo' },
        { date: '2024-05-01', name: 'Día del Trabajo' },
        { date: '2024-06-07', name: 'Batalla de Arica' },
        { date: '2024-06-29', name: 'San Pedro y San Pablo' },
        { date: '2024-07-23', name: 'Día de la Fuerza Aérea del Perú' },
        { date: '2024-07-28', name: 'Día de la Independencia' },
        { date: '2024-07-29', name: 'Día de la Independencia' },
        { date: '2024-08-06', name: 'Batalla de Junín' },
        { date: '2024-08-30', name: 'Santa Rosa de Lima' },
        { date: '2024-10-08', name: 'Combate de Angamos' },
        { date: '2024-11-01', name: 'Día de Todos los Santos' },
        { date: '2024-12-08', name: 'Inmaculada Concepción' },
        { date: '2024-12-09', name: 'Batalla de Ayacucho' },
        { date: '2024-12-25', name: 'Navidad' }
    ],

    // Año 2025
    2025: [
        { date: '2025-01-01', name: 'Año Nuevo' },
        { date: '2025-04-17', name: 'Jueves Santo' },
        { date: '2025-04-18', name: 'Viernes Santo' },
        { date: '2025-05-01', name: 'Día del Trabajo' },
        { date: '2025-06-07', name: 'Batalla de Arica' },
        { date: '2025-06-29', name: 'San Pedro y San Pablo' },
        { date: '2025-07-23', name: 'Día de la Fuerza Aérea del Perú' },
        { date: '2025-07-28', name: 'Día de la Independencia' },
        { date: '2025-07-29', name: 'Día de la Independencia' },
        { date: '2025-08-06', name: 'Batalla de Junín' },
        { date: '2025-08-30', name: 'Santa Rosa de Lima' },
        { date: '2025-10-08', name: 'Combate de Angamos' },
        { date: '2025-11-01', name: 'Día de Todos los Santos' },
        { date: '2025-12-08', name: 'Inmaculada Concepción' },
        { date: '2025-12-09', name: 'Batalla de Ayacucho' },
        { date: '2025-12-25', name: 'Navidad' }
    ],

    // Año 2026
    2026: [
        { date: '2026-01-01', name: 'Año Nuevo' },
        { date: '2026-04-02', name: 'Jueves Santo' },
        { date: '2026-04-03', name: 'Viernes Santo' },
        { date: '2026-05-01', name: 'Día del Trabajo' },
        { date: '2026-06-07', name: 'Batalla de Arica' },
        { date: '2026-06-29', name: 'San Pedro y San Pablo' },
        { date: '2026-07-23', name: 'Día de la Fuerza Aérea del Perú' },
        { date: '2026-07-28', name: 'Día de la Independencia' },
        { date: '2026-07-29', name: 'Día de la Independencia' },
        { date: '2026-08-06', name: 'Batalla de Junín' },
        { date: '2026-08-30', name: 'Santa Rosa de Lima' },
        { date: '2026-10-08', name: 'Combate de Angamos' },
        { date: '2026-11-01', name: 'Día de Todos los Santos' },
        { date: '2026-12-08', name: 'Inmaculada Concepción' },
        { date: '2026-12-09', name: 'Batalla de Ayacucho' },
        { date: '2026-12-25', name: 'Navidad' }
    ]
};

/**
 * Get holidays for a specific year
 * @param {number} year - The year to get holidays for
 * @returns {Array} Array of holiday objects
 */
export function getHolidaysForYear(year) {
    return PERU_HOLIDAYS[year] || [];
}

/**
 * Check if a date is a holiday
 * @param {string} dateStr - Date string in format YYYY-MM-DD
 * @returns {boolean} True if the date is a holiday
 */
export function isHoliday(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const year = date.getFullYear();
    const holidays = getHolidaysForYear(year);

    return holidays.some(h => h.date === dateStr);
}

/**
 * Get holiday information for a specific date
 * @param {string} dateStr - Date string in format YYYY-MM-DD
 * @returns {string|null} Holiday name or null if not a holiday
 */
export function getHolidayInfo(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const year = date.getFullYear();
    const holidays = getHolidaysForYear(year);

    const holiday = holidays.find(h => h.date === dateStr);
    return holiday ? holiday.name : null;
}

/**
 * Get all holidays as a Set for fast lookup
 * @param {number} year - The year to get holidays for
 * @returns {Set<string>} Set of holiday date strings
 */
export function getHolidayDatesSet(year) {
    const holidays = getHolidaysForYear(year);
    return new Set(holidays.map(h => h.date));
}
