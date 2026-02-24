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

    // 2. Cuentas Bancarias
    getBankAccounts() {
        return axios.get('/bank-accounts');
    },
    createBankAccount(accountData) {
        return axios.post('/bank-accounts', accountData);
    },

    // 3. Movimientos Bancarios
    getBankMovements(params) {
        return axios.get('/bank-movements', { params });
    },
    createBankMovement(movementData) {
        return axios.post('/bank-movements', movementData);
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
    }
};
