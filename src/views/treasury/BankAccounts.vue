<script setup>
import { TreasuryService } from '@/service/TreasuryService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();

const bankAccounts = ref([]);
const banks = ref([]);
const loading = ref(true);
const accountDialog = ref(false);
const account = ref({});
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);

const currencies = ref([
    { label: 'Soles (PEN)', value: 'PEN' },
    { label: 'Dólares (USD)', value: 'USD' }
]);

const accountTypes = ref([
    { label: 'Corriente', value: 'Corriente' },
    { label: 'Ahorros', value: 'Ahorros' }
]);

const loadData = async () => {
    loading.value = true;
    try {
        const [accountsResponse, banksResponse] = await Promise.all([TreasuryService.getBankAccounts(), TreasuryService.getBanks()]);
        bankAccounts.value = accountsResponse.data.data || accountsResponse.data;
        banks.value = banksResponse.data.data || banksResponse.data;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar datos', life: 3000 });
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadData();
});

const openNew = () => {
    account.value = {
        bank_id: null,
        account_number: '',
        cci: '',
        currency: 'PEN',
        account_type: 'Corriente',
        description: '',
        initial_balance: 0,
        is_active: true
    };
    submitted.value = false;
    accountDialog.value = true;
};

const hideDialog = () => {
    accountDialog.value = false;
    submitted.value = false;
};

const saveAccount = async () => {
    submitted.value = true;

    if (account.value.account_number && account.value.bank_id && account.value.cci && account.value.description) {
        try {
            await TreasuryService.createBankAccount(account.value);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Cuenta bancaria creada', life: 3000 });
            hideDialog();
            loadData();
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la cuenta', life: 3000 });
        }
    }
};

const formatCurrency = (value, currency) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: currency || 'PEN' }).format(value);
};
</script>

<template>
    <div class="card">
        <h5>Cuentas Bancarias</h5>
        <Toolbar class="mb-4">
            <template #start>
                <Button label="Nueva Cuenta" icon="pi pi-plus" class="p-button-success mr-2" @click="openNew" />
            </template>
            <template #end>
                <span class="p-input-icon-left">
                    <i class="pi pi-search" />
                    <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                </span>
            </template>
        </Toolbar>

        <DataTable :value="bankAccounts" :paginator="true" :rows="10" dataKey="id" :filters="filters" :loading="loading" showGridlines responsiveLayout="scroll" emptyMessage="No se encontraron cuentas bancarias.">
            <Column field="bank.name" header="Banco" :sortable="true"></Column>
            <Column field="description" header="Descripción" :sortable="true"></Column>
            <Column field="account_number" header="Número Cuenta" :sortable="true"></Column>
            <Column field="currency" header="Moneda" :sortable="true"></Column>
            <Column field="balance" header="Saldo Actual" :sortable="true">
                <template #body="slotProps">
                    <span :class="{ 'text-green-500 font-bold': slotProps.data.balance > 0, 'text-red-500 font-bold': slotProps.data.balance < 0 }">
                        {{ formatCurrency(slotProps.data.balance, slotProps.data.currency) }}
                    </span>
                </template>
            </Column>
            <Column field="is_active" header="Estado" :sortable="true">
                <template #body="slotProps">
                    <Tag :severity="slotProps.data.is_active ? 'success' : 'danger'" :value="slotProps.data.is_active ? 'Activa' : 'Inactiva'" />
                </template>
            </Column>
        </DataTable>

        <Dialog v-model:visible="accountDialog" :style="{ width: '500px' }" header="Detalles de la Cuenta" :modal="true" class="p-fluid">
            <div class="field">
                <label for="bank_id">Banco</label>
                <Dropdown id="bank_id" v-model="account.bank_id" :options="banks" optionLabel="name" optionValue="id" placeholder="Seleccione un banco" :class="{ 'p-invalid': submitted && !account.bank_id }" />
                <small class="p-error" v-if="submitted && !account.bank_id">El banco es requerido.</small>
            </div>

            <div class="field">
                <label for="description">Descripción Interna</label>
                <InputText id="description" v-model.trim="account.description" required="true" :class="{ 'p-invalid': submitted && !account.description }" placeholder="Ej: Cuenta Principal Soles" />
                <small class="p-error" v-if="submitted && !account.description">La descripción es requerida.</small>
            </div>

            <div class="formgrid grid">
                <div class="field col-6">
                    <label for="account_number">Número de Cuenta</label>
                    <InputText id="account_number" v-model.trim="account.account_number" :class="{ 'p-invalid': submitted && !account.account_number }" />
                    <small class="p-error" v-if="submitted && !account.account_number">Requerido.</small>
                </div>
                <div class="field col-6">
                    <label for="cci">Código CCI</label>
                    <InputText id="cci" v-model.trim="account.cci" :class="{ 'p-invalid': submitted && !account.cci }" />
                    <small class="p-error" v-if="submitted && !account.cci">Requerido.</small>
                </div>
            </div>

            <div class="formgrid grid">
                <div class="field col-6">
                    <label for="currency">Moneda</label>
                    <Dropdown id="currency" v-model="account.currency" :options="currencies" optionLabel="label" optionValue="value" />
                </div>
                <div class="field col-6">
                    <label for="account_type">Tipo de Cuenta</label>
                    <Dropdown id="account_type" v-model="account.account_type" :options="accountTypes" optionLabel="label" optionValue="value" />
                </div>
            </div>

            <div class="field">
                <label for="initial_balance">Saldo Inicial</label>
                <InputNumber id="initial_balance" v-model="account.initial_balance" mode="currency" :currency="account.currency === 'USD' ? 'USD' : 'PEN'" locale="es-PE" />
                <small>El saldo inicial sólo se puede establecer al crear la cuenta.</small>
            </div>

            <div class="field-checkbox">
                <Checkbox id="is_active" v-model="account.is_active" :binary="true" />
                <label for="is_active">Activa</label>
            </div>

            <template #footer>
                <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
                <Button label="Guardar" icon="pi pi-check" class="p-button-text" @click="saveAccount" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped></style>
