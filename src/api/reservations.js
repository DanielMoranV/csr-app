import axios from './axios';

/**
 * Servicio API para la gestión de listas de reservas médicas.
 */
export const reservationService = {
    /**
     * Obtiene una lista paginada de reservas.
     * @param {Object} params - Parámetros de filtro (doctor_id, date, page).
     * @returns {Promise}
     */
    listDocs: (params = {}) => axios.get('/reservations', { params }),

    /**
     * Crea una nueva lista de reservas.
     * @param {Object} data - Datos de la reserva (doctor_id, doctor_schedule_id, notes, patients).
     * @returns {Promise}
     */
    createDoc: (data) => axios.post('/reservations', data),

    /**
     * Obtiene el detalle completo de una reserva específica.
     * @param {number|string} id - ID de la reserva.
     * @returns {Promise}
     */
    getDoc: (id) => axios.get(`/reservations/${id}`),

    /**
     * Actualiza una lista de reservas existente.
     * @param {number|string} id - ID de la reserva.
     * @param {Object} data - Datos a actualizar (notes, patients).
     * @returns {Promise}
     */
    updateDoc: (id, data) => axios.put(`/reservations/${id}`, data),

    /**
     * Elimina permanentemente una lista de reservas.
     * @param {number|string} id - ID de la reserva.
     * @returns {Promise}
     */
    deleteDoc: (id) => axios.delete(`/reservations/${id}`)
};

/**
 * Servicio API para la gestión individual de detalles de reserva (pacientes).
 */
export const reservationDetailService = {
    /**
     * Actualiza los datos básicos de un paciente (nombre, DNI, turno, modalidad).
     * No modifica el estado del detalle.
     * @param {number|string} id - ID del detalle de reserva.
     * @param {Object} data - Campos a actualizar (patient_name, document_number, turn_number, modality, observations).
     * @returns {Promise}
     */
    update: (id, data) => axios.put(`/reservation-details/${id}`, data),

    /**
     * Cambia el estado de un detalle de reserva.
     * Al cambiar a 'registered', el backend ejecuta validación contra Sisclin.
     * Si el DNI existe en Sisclin pero el nombre no coincide → error 400.
     * Si no existe en Sisclin → registra con is_out_of_schedule = true.
     * @param {number|string} id - ID del detalle de reserva.
     * @param {string} status - Nuevo estado ('pending' | 'registered' | 'cancelled').
     * @returns {Promise}
     */
    changeStatus: (id, status) => axios.patch(`/reservation-details/${id}/status`, { status }),

    /**
     * Elimina un detalle de reserva (paciente) de forma permanente.
     * @param {number|string} id - ID del detalle de reserva.
     * @returns {Promise}
     */
    delete: (id) => axios.delete(`/reservation-details/${id}`)
};
