import axios from '@/api/axios';

/**
 * Servicio para gestión de tarifarios generales y personalizados
 */
class TariffService {
    /**
     * Obtener tarifarios generales
     * @param {Object} filters - Filtros opcionales { grouper, control_group, search }
     * @returns {Promise<Array>}
     */
    async getGeneralTariffs(filters = {}) {
        const params = new URLSearchParams();

        if (filters.grouper) params.append('grouper', filters.grouper);
        if (filters.control_group) params.append('control_group', filters.control_group);
        if (filters.search) params.append('search', filters.search);

        const response = await axios.get('/general-tariffs', { params });
        return response.data;
    }

    /**
     * Importar tarifarios generales desde Excel
     * @param {File} file - Archivo Excel
     * @returns {Promise<Object>}
     */
    async importGeneralTariffs(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post('/general-tariffs/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }

    /**
     * Obtener tarifarios de médicos
     * @param {Object} filters - Filtros opcionales { doctor_id, doctor_code, tariff_code, search }
     * @returns {Promise<Array>}
     */
    async getDoctorTariffs(filters = {}) {
        const params = new URLSearchParams();

        if (filters.doctor_id) params.append('doctor_id', filters.doctor_id);
        if (filters.doctor_code) params.append('doctor_code', filters.doctor_code);
        if (filters.tariff_code) params.append('tariff_code', filters.tariff_code);
        if (filters.search) params.append('search', filters.search);

        const response = await axios.get('/doctor-tariffs', { params });
        return response.data;
    }

    /**
     * Importar tarifarios de médicos desde Excel
     * @param {File} file - Archivo Excel
     * @returns {Promise<Object>}
     */
    async importDoctorTariffs(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post('/doctor-tariffs/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }

    /**
     * Sincronizar tarifarios desde Sisclin
     * @returns {Promise<Object>}
     */
    async syncTariffs() {
        const response = await axios.post('/tariffs/sync');

        // DEBUG: Ver qué devuelve el backend
        console.log('🔄 Respuesta del backend /tariffs/sync:', response.data);
        console.log('🔄 Tipo de response.data:', typeof response.data);
        console.log('🔄 Tiene success?:', response.data?.success);
        console.log('🔄 Estructura completa:', JSON.stringify(response.data, null, 2));

        // Compatibilidad: manejar diferentes formatos de respuesta
        // Si la respuesta ya tiene success, devolverla tal cual
        if (response.data && typeof response.data.success !== 'undefined') {
            return response.data;
        }

        // Si no tiene success, envolver en formato estándar
        return {
            success: true,
            data: response.data,
            message: 'Sincronización completada'
        };
    }

    /**
     * Obtener todos los tarifarios para consulta (general + personalizados)
     * @returns {Promise<Array>}
     */
    async getTariffs() {
        const response = await axios.get('/tariffs/consultation');

        // Compatibilidad temporal: el servidor puede devolver directamente un array
        // TODO: Remover cuando el backend devuelva la estructura estándar
        if (Array.isArray(response.data)) {
            return {
                success: true,
                data: response.data
            };
        }

        return response.data;
    }

    /**
     * Buscar tarifarios por término de búsqueda
     * @param {string} query - Término de búsqueda
     * @returns {Promise<Array>}
     */
    async searchTariffs(query) {
        const response = await axios.get('/tariffs/consultation/search', {
            params: { q: query }
        });

        // Compatibilidad temporal: el servidor puede devolver directamente un array
        // TODO: Remover cuando el backend devuelva la estructura estándar
        if (Array.isArray(response.data)) {
            return {
                success: true,
                data: response.data
            };
        }

        return response.data;
    }
}

export default new TariffService();
