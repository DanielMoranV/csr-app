import axios from '@/api/axios';

const resource = '/migrations';

export const migrations = {
    /**
     * Orquests the hospitalization migration process.
     * @param {Object} params - Parameters for the migration.
     * @param {string} [params.start_date] - Start date (YYYY-MM-DD).
     * @param {string} [params.end_date] - End date (YYYY-MM-DD).
     * @param {number} [params.days_back] - Number of days back to process. Default: 30.
     * @returns {Promise} Axios response promise.
     */
    orchestrateHospitalizations(params = {}) {
        return axios.post(`${resource}/orchestrate-hospitalizations`, params);
    }
};
