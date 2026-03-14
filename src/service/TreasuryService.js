import axios from '@/api/axios';

export const TreasuryService = {
    // 1. Bancos
    getBanks() {
        return axios.get('/banks');
    },
    createBank(bankData) {
        return axios.post('/banks', bankData);
    },
    deleteBank(id) {
        return axios.delete(`/banks/${id}`);
    },
    updateBank(id, bankData) {
        return axios.put(`/banks/${id}`, bankData);
    },

    // 2. Cuentas Bancarias
    getBankAccounts() {
        return axios.get('/bank-accounts');
    },
    createBankAccount(accountData) {
        return axios.post('/bank-accounts', accountData);
    },
    updateBankAccount(id, accountData) {
        return axios.put(`/bank-accounts/${id}`, accountData);
    },
    deleteBankAccount(id) {
        return axios.delete(`/bank-accounts/${id}`);
    },

    // 3. Movimientos Bancarios
    getBankMovements(params) {
        return axios.get('/bank-movements', { params });
    },
    createBankMovement(movementData) {
        return axios.post('/bank-movements', movementData);
    },
    updateBankMovement(id, movementData) {
        return axios.put(`/bank-movements/${id}`, movementData);
    },
    deleteBankMovement(id) {
        return axios.delete(`/bank-movements/${id}`);
    },

    // 4. Contrapartes
    getCounterparties() {
        return axios.get('/counterparties');
    },
    createCounterparty(counterpartyData) {
        return axios.post('/counterparties', counterpartyData);
    },
    updateCounterparty(id, counterpartyData) {
        return axios.put(`/counterparties/${id}`, counterpartyData);
    },
    deleteCounterparty(id) {
        return axios.delete(`/counterparties/${id}`);
    },

    // 5. Datos Maestros (Dropdowns)
    getMovementTypes() {
        return axios.get('/treasury/data/movement-types');
    },
    getMovementCategories() {
        return axios.get('/treasury/data/movement-categories');
    },

    // 6. Transferencias
    createTransfer(transferData) {
        return axios.post('/treasury/transfers', transferData);
    },

    // 7. Importación de Honorarios Médicos
    importMedicalHonorary(formData) {
        return axios.post('/treasury/import/medical-honorary', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // 8. Reporte Anual
    getYearSummary(year, accountIds = []) {
        const params = new URLSearchParams();
        params.append('year', year);
        accountIds.forEach((id) => params.append('account_ids[]', id));
        return axios.get(`/treasury/reports/year-summary?${params.toString()}`);
    },

    // 9. Auditoría de Movimientos
    getMovementAudit(id) {
        return axios.get(`/bank-movements/${id}/audit`);
    },
    getDeletedMovements(page = 1) {
        return axios.get('/bank-movements/audit/deleted', { params: { page } });
    }
};
