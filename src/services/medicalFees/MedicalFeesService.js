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
     * Crea un mapa de médicos por código para búsqueda rápida
     * @param {Array} doctors - Lista de médicos
     * @returns {Map} Mapa código -> médico
     */
    createDoctorCodeMap(doctors) {
        return new Map(doctors.map(doctor => [doctor.code, doctor]));
    }

    /**
     * Crea un mapa de horarios por código de médico y fecha
     * @param {Array} schedules - Lista de horarios
     * @returns {Map} Mapa "code_date" -> horario[]
     */
    createScheduleMap(schedules) {
        const map = new Map();
        schedules.forEach(schedule => {
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
