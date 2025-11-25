import axios from './axios';

/**
 * API service for Doctor Schedules management.
 * Gestión de horarios de médicos.
 */
export const doctorSchedules = {
    /**
     * Gets a list of all doctor schedules with filters and pagination.
     * @param {object} params - Query parameters (doctor_id, date, category, status, upcoming, past, today, paginate, per_page)
     * @returns {Promise}
     */
    getAll: (params = {}) => axios.get('/doctor-schedules', { params }),

    /**
     * Creates a new doctor schedule.
     * Opciones:
     * 1. Con turno predefinido: { id_doctors, id_medical_shift, date, category, is_payment_payroll, status }
     * 2. Horario personalizado: { id_doctors, date, start_time, end_time, category, is_payment_payroll, status }
     * 3. Turno con ajuste: { id_doctors, id_medical_shift, date, start_time, end_time, category, is_payment_payroll }
     *
     * @param {object} scheduleData - Schedule data
     * @returns {Promise}
     */
    create: (scheduleData) => axios.post('/doctor-schedules', scheduleData),

    /**
     * Creates multiple doctor schedules in batch.
     * @param {array} schedulesArray - Array of schedule data objects
     * @returns {Promise} - Returns { successful: [], failed: [], total: number }
     */
    createBatch: (schedulesArray) => axios.post('/doctor-schedules/batch', { schedules: schedulesArray }),

    /**
     * Retrieves a specific doctor schedule by ID.
     * @param {number} id - Schedule ID
     * @returns {Promise}
     */
    getById: (id) => axios.get(`/doctor-schedules/${id}`),

    /**
     * Updates an existing doctor schedule.
     * @param {number} id - Schedule ID
     * @param {object} scheduleData - Updated schedule data
     * @returns {Promise}
     */
    update: (id, scheduleData) => axios.put(`/doctor-schedules/${id}`, scheduleData),

    /**
     * Deletes a doctor schedule.
     * @param {number} id - Schedule ID
     * @returns {Promise}
     */
    delete: (id) => axios.delete(`/doctor-schedules/${id}`),

    /**
     * Gets doctor schedules statistics.
     * @returns {Promise}
     */
    getStats: () => axios.get('/doctor-schedules/stats'),

    /**
     * Confirms a pending schedule.
     * @param {number} id - Schedule ID
     * @returns {Promise}
     */
    confirm: (id) => axios.put(`/doctor-schedules/${id}`, { status: 'confirmed' }),

    /**
     * Cancels a schedule.
     * @param {number} id - Schedule ID
     * @param {string} reason - Cancellation reason
     * @returns {Promise}
     */
    cancel: (id, reason) => axios.put(`/doctor-schedules/${id}`, {
        status: 'cancelled',
        notes: reason ? `Cancelado: ${reason}` : undefined
    }),

    /**
     * Marks a schedule as completed.
     * @param {number} id - Schedule ID
     * @returns {Promise}
     */
    complete: (id) => axios.put(`/doctor-schedules/${id}`, { status: 'completed' })
};
