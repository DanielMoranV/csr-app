/**
 * Convierte un texto a formato slug (lowercase, sin espacios, con guiones)
 * Útil para generar nombres de canales de Pusher/Echo válidos
 *
 * @param {string} text - El texto a convertir
 * @returns {string} - El texto en formato slug
 *
 * @example
 * slugify('DIRECTOR MEDICO') // 'director-medico'
 * slugify('JEFE DE ENFERMERIA') // 'jefe-de-enfermeria'
 * slugify('Recepción 24/7') // 'recepcion-247'
 */
export const slugify = (text) => {
    if (!text) return '';

    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Reemplazar espacios con -
        .replace(/[^\w\-]+/g, '') // Eliminar caracteres no-word
        .replace(/\-\-+/g, '-'); // Reemplazar múltiples - con uno solo
};

/**
 * Genera el nombre de canal de Pusher para posiciones de tickets
 *
 * @param {string} position - La posición del usuario
 * @returns {string|null} - El nombre del canal o null si no se proporciona posición
 *
 * @example
 * getTicketPositionChannel('DIRECTOR MEDICO')
 * // 'presence-tickets.position.director-medico'
 */
export const getTicketPositionChannel = (position) => {
    if (!position) return null;

    const slug = slugify(position);
    return `presence-tickets.position.${slug}`;
};
