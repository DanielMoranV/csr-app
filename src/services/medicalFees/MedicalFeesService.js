import axios from '@/api/axios';

/**
 * Servicio para gestión de honorarios médicos
 * Responsabilidad: Comunicación con el backend
 */
class MedicalFeesService {
    /**
     * Obtiene lista completa de médicos
     * @returns {Promise<Array>} Lista de médicos
     */
    async getDoctors() {
        const response = await axios.get('/doctors');

        // El interceptor devuelve {success, data, message}
        // data puede ser un array directo o un objeto con paginación {data: [], ...}
        if (Array.isArray(response.data)) {
            return response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
            // Respuesta paginada
            return response.data.data;
        }

        return [];
    }

    /**
     * Obtiene horarios de médicos por rango de fechas
     * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
     * @param {string} endDate - Fecha fin (YYYY-MM-DD)
     * @returns {Promise<Array>} Lista de horarios
     */
    async getDoctorSchedules(startDate, endDate) {
        const response = await axios.get('/doctor-schedules', {
            params: {
                start_date: startDate,
                end_date: endDate
            }
        });

        // El interceptor devuelve {success, data, message}
        // data puede ser un array directo o un objeto con schedules
        if (Array.isArray(response.data)) {
            return response.data;
        } else if (response.data && Array.isArray(response.data.schedules)) {
            // Respuesta con estructura {schedules: [...]}
            return response.data.schedules;
        } else if (response.data && Array.isArray(response.data.data)) {
            // Respuesta paginada
            return response.data.data;
        }

        return [];
    }

    /**
     * Obtiene servicios médicos filtrados por rango de fechas
     * @param {string} startDate - Fecha inicio YYYY-MM-DD
     * @param {string} endDate - Fecha fin YYYY-MM-DD
     * @param {Object} filters - Filtros opcionales (medical_specialty_id, doctor_id)
     * @returns {Promise<Object>} Respuesta con datos paginados
     */
    async getMedicalServices(startDate, endDate, filters = {}) {
        const response = await axios.get('/medical-services', {
            params: {
                start_date: startDate,
                end_date: endDate,
                ...filters
            }
        });
        console.log('Respuesta endpoint medical-services:', response.data);
        return response.data; // { success, data: { data: [...] } }
    }

    /**
     * Crea un mapa de médicos por código para búsqueda rápida
     * @param {Array} doctors - Lista de médicos
     * @returns {Map} Mapa código -> médico
     */
    createDoctorCodeMap(doctors) {
        return new Map(doctors.map((doctor) => [doctor.code, doctor]));
    }

    /**
     * Guarda servicios médicos masivamente en base de datos
     * @param {Array} servicesPayload - Array de servicios con estructura de backend
     * @returns {Promise<Object>} Resultado de la importación
     */
    async saveMedicalServices(servicesPayload) {
        const response = await axios.post('/medical-services/import', {
            services: servicesPayload
        });

        return response.data; // { success, message, data }
    }

    /**
     * Actualiza un servicio médico
     * @param {number} id - ID del servicio
     * @param {Object} data - Datos a actualizar
     * @returns {Promise<Object>} Resultado de la actualización
     */
    async updateMedicalService(id, data) {
        const response = await axios.put(`/medical-services/${id}`, data);
        return response.data;
    }

    /**
     * Aprobación masiva de servicios médicos por IDs
     * @param {Array} ids - Array de IDs de servicios
     * @param {string} status - Nuevo estado
     * @param {string} observation - Observación opcional
     * @returns {Promise<Object>} Resultado de la aprobación masiva
     */
    async bulkApprove(ids, status, observation = null) {
        const response = await axios.post('/medical-services/bulk-approve', {
            ids,
            status,
            observation
        });
        return response.data;
    }

    /**
     * Actualización masiva de estado con filtros
     * @param {Object} params - Parámetros de filtrado y nuevo estado
     * @returns {Promise<Object>} Resultado de la actualización masiva
     */
    async bulkUpdateStatus(params) {
        const response = await axios.post('/medical-services/bulk-update-status', params);
        return response.data;
    }

    /**
     * Actualización masiva de comisiones
     * @param {Array} updates - Array de {id, commission_amount}
     * @returns {Promise<Object>} Resultado de la actualización masiva
     */
    async bulkUpdateCommissions(updates) {
        const response = await axios.put('/medical-services/bulk-update-commissions', {
            updates
        });

        // El interceptor de axios (línea 134 en axios.js) devuelve response.data directamente
        // Entonces 'response' aquí ya es el objeto {success, message, data}
        // No necesitamos hacer response.data.data, solo response.data

        if (response?.data) {
            return response.data;
        } else if (response) {
            // Fallback si la estructura es diferente
            return response;
        }

        throw new Error('Respuesta inválida del servidor');
    }

    /**
     * Elimina un servicio médico (soft delete)
     * @param {number} id - ID del servicio
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async deleteMedicalService(id) {
        const response = await axios.delete(`/medical-services/${id}`);
        return response.data;
    }

    /**
     * Crea un mapa de horarios por código de médico y fecha
     * @param {Array} schedules - Lista de horarios
     * @returns {Map} Mapa "code_date" -> horario[]
     */
    createScheduleMap(schedules) {
        const map = new Map();
        schedules.forEach((schedule) => {
            const key = `${schedule.doctor.code}_${schedule.date}`;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(schedule);
        });
        return map;
    }
}

export default new MedicalFeesService();
