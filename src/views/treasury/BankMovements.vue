<script setup>
import { TreasuryService } from '@/service/TreasuryService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref, watch } from 'vue';

const toast = useToast();

const movements = ref([]);
const accounts = ref([]);
const counterparties = ref([]);
const categories = ref([]);
const loading = ref(true);

const filterAccount = ref(null);
const filterStartDate = ref(null);
const filterEndDate = ref(null);

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const movementDialog = ref(false);
const transferDialog = ref(false);
const submitted = ref(false);

const movement = ref({});
const transfer = ref({});

const loadData = async () => {
    loading.value = true;
    try {
        const [accountsResponse, counterpartiesResponse, categoriesResponse] = await Promise.all([TreasuryService.getBankAccounts(), TreasuryService.getCounterparties(), TreasuryService.getMovementCategories()]);

        accounts.value = (accountsResponse.data.data || accountsResponse.data).map((acc) => ({
            ...acc,
            displayName: `${acc.bank.name} - ${acc.description} (${acc.currency})`
        }));

        counterparties.value = counterpartiesResponse.data.data || counterpartiesResponse.data;
        categories.value = categoriesResponse.data.data || categoriesResponse.data;

        if (accounts.value.length > 0) {
            filterAccount.value = accounts.value[0].id;
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar datos base', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const loadMovements = async () => {
    if (!filterAccount.value) return;

    loading.value = true;
    try {
        const params = {
            bank_account_id: filterAccount.value
        };

        if (filterStartDate.value) {
            params.start_date = filterStartDate.value.toISOString().split('T')[0];
        }
        if (filterEndDate.value) {
            params.end_date = filterEndDate.value.toISOString().split('T')[0];
        }

        const response = await TreasuryService.getBankMovements(params);
        movements.value = response.data.data || response.data;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los movimientos', life: 3000 });
    } finally {
        loading.value = false;
    }
};

onMounted(async () => {
    await loadData();
    if (filterAccount.value) {
        loadMovements();
    }
});

watch([filterAccount, filterStartDate, filterEndDate], () => {
    loadMovements();
});

const openNewMovement = () => {
    movement.value = {
        bank_account_id: filterAccount.value,
        counterparty_id: null,
        movement_category_id: null,
        movement_date: new Date(),
        movement_direction: 'OUT',
        amount: 0,
        voucher: '',
        reference: '',
        beneficiary: ''
    };
    submitted.value = false;
    movementDialog.value = true;
};

const openNewTransfer = () => {
    transfer.value = {
        source_account_id: filterAccount.value,
        destination_account_id: null,
        movement_category_id: null,
        movement_date: new Date(),
        amount: 0,
        voucher: '',
        reference: ''
    };
    submitted.value = false;
    transferDialog.value = true;
};

const hideMovementDialog = () => {
    movementDialog.value = false;
    submitted.value = false;
};

const hideTransferDialog = () => {
    transferDialog.value = false;
    submitted.value = false;
};

const saveMovement = async () => {
    submitted.value = true;

    if (movement.value.bank_account_id && movement.value.movement_category_id && movement.value.amount > 0 && movement.value.movement_date) {
        try {
            const dataToSave = { ...movement.value };
            // Format date to YYYY-MM-DD
            dataToSave.movement_date = new Date(dataToSave.movement_date).toISOString().split('T')[0];

            await TreasuryService.createBankMovement(dataToSave);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Movimiento registrado', life: 3000 });
            hideMovementDialog();
            loadMovements();
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Error registrando movimiento', life: 3000 });
        }
    }
};

const saveTransfer = async () => {
    submitted.value = true;

    if (transfer.value.source_account_id && transfer.value.destination_account_id && transfer.value.movement_category_id && transfer.value.amount > 0 && transfer.value.movement_date) {
        if (transfer.value.source_account_id === transfer.value.destination_account_id) {
            toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'La cuenta origen y destino deben ser distintas', life: 3000 });
            return;
        }

        try {
            const dataToSave = { ...transfer.value };
            // Format date to YYYY-MM-DD
            dataToSave.movement_date = new Date(dataToSave.movement_date).toISOString().split('T')[0];

            await TreasuryService.createTransfer(dataToSave);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Transferencia registrada', life: 3000 });
            hideTransferDialog();
            loadMovements();
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Error registrando transferencia', life: 3000 });
        }
    }
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
};
</script>

<template>
    <div class="card">
        <h5>Administración de Movimientos</h5>

        <div class="p-fluid formgrid grid mb-4 align-items-end">
            <div class="field col-12 md:col-4">
                <label for="filterAccount">Cuenta Bancaria</label>
                <Dropdown id="filterAccount" v-model="filterAccount" :options="accounts" optionLabel="displayName" optionValue="id" placeholder="Seleccione una cuenta" />
            </div>
            <div class="field col-12 md:col-3">
                <label for="filterStartDate">Fecha Desde</label>
                <Calendar id="filterStartDate" v-model="filterStartDate" dateFormat="dd/mm/yy" :showIcon="true" />
            </div>
            <div class="field col-12 md:col-3">
                <label for="filterEndDate">Fecha Hasta</label>
                <Calendar id="filterEndDate" v-model="filterEndDate" dateFormat="dd/mm/yy" :showIcon="true" />
            </div>
            <div class="field col-12 md:col-2">
                <Button label="Buscar" icon="pi pi-search" @click="loadMovements" />
            </div>
        </div>

        <Toolbar class="mb-4">
            <template #start>
                <Button label="Nuevo Movimiento" icon="pi pi-plus" class="p-button-success mr-2" @click="openNewMovement" />
                <Button label="Transferencia" icon="pi pi-arrow-right-arrow-left" class="p-button-info" @click="openNewTransfer" />
            </template>
            <template #end>
                <span class="p-input-icon-left">
                    <i class="pi pi-search" />
                    <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                </span>
            </template>
        </Toolbar>

        <DataTable :value="movements" :paginator="true" :rows="10" dataKey="id" :filters="filters" :loading="loading" showGridlines responsiveLayout="scroll" emptyMessage="No se encontraron movimientos.">
            <Column field="movement_date" header="Fecha" :sortable="true"></Column>
            <Column field="voucher" header="Voucher/Operación" :sortable="true"></Column>
            <Column field="category.name" header="Categoría" :sortable="true"></Column>
            <Column header="Tercero" :sortable="true">
                <template #body="slotProps">
                    {{ slotProps.data.counterparty?.name || slotProps.data.beneficiary || '-' }}
                </template>
            </Column>
            <Column field="reference" header="Referencia" :sortable="true"></Column>

            <Column header="Ingreso" :sortable="true" style="text-align: right">
                <template #body="slotProps">
                    <span class="text-green-500 font-bold" v-if="slotProps.data.movement_direction === 'IN'">
                        {{ formatCurrency(slotProps.data.amount) }}
                    </span>
                </template>
            </Column>

            <Column header="Egreso" :sortable="true" style="text-align: right">
                <template #body="slotProps">
                    <span class="text-red-500 font-bold" v-if="slotProps.data.movement_direction === 'OUT'">
                        {{ formatCurrency(slotProps.data.amount) }}
                    </span>
                </template>
            </Column>
        </DataTable>

        <!-- Modal de Movimiento -->
        <Dialog v-model:visible="movementDialog" :style="{ width: '600px' }" header="Nuevo Movimiento" :modal="true" class="p-fluid">
            <div class="formgrid grid">
                <div class="field col-12 md:col-6">
                    <label for="mov_account">Cuenta Bancaria</label>
                    <Dropdown id="mov_account" v-model="movement.bank_account_id" :options="accounts" optionLabel="displayName" optionValue="id" :class="{ 'p-invalid': submitted && !movement.bank_account_id }" />
                    <small class="p-error" v-if="submitted && !movement.bank_account_id">Cuenta es requerida.</small>
                </div>
                <div class="field col-12 md:col-6">
                    <label for="mov_direction">Tipo de Movimiento</label>
                    <Dropdown
                        id="mov_direction"
                        v-model="movement.movement_direction"
                        :options="[
                            { label: 'Ingreso (IN)', value: 'IN' },
                            { label: 'Egreso (OUT)', value: 'OUT' }
                        ]"
                        optionLabel="label"
                        optionValue="value"
                    />
                </div>
            </div>

            <div class="formgrid grid">
                <div class="field col-12 md:col-6">
                    <label for="mov_date">Fecha</label>
                    <Calendar id="mov_date" v-model="movement.movement_date" dateFormat="dd/mm/yy" :showIcon="true" :class="{ 'p-invalid': submitted && !movement.movement_date }" />
                    <small class="p-error" v-if="submitted && !movement.movement_date">Fecha es requerida.</small>
                </div>
                <div class="field col-12 md:col-6">
                    <label for="mov_amount">Monto</label>
                    <InputNumber id="mov_amount" v-model="movement.amount" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" :class="{ 'p-invalid': submitted && (!movement.amount || movement.amount <= 0) }" />
                    <small class="p-error" v-if="submitted && (!movement.amount || movement.amount <= 0)">Monto mayor a 0 es requerido.</small>
                </div>
            </div>

            <div class="field">
                <label for="mov_category">Categoría</label>
                <Dropdown
                    id="mov_category"
                    v-model="movement.movement_category_id"
                    :options="categories"
                    optionLabel="name"
                    optionValue="id"
                    filter
                    placeholder="Selecciona categoría"
                    :class="{ 'p-invalid': submitted && !movement.movement_category_id }"
                />
                <small class="p-error" v-if="submitted && !movement.movement_category_id">Categoría requerida.</small>
            </div>

            <div class="field">
                <label for="mov_counterparty">Contraparte (Opcional)</label>
                <Dropdown id="mov_counterparty" v-model="movement.counterparty_id" :options="counterparties" optionLabel="name" optionValue="id" filter showClear placeholder="Selecciona tercero" />
            </div>

            <div class="field" v-if="!movement.counterparty_id">
                <label for="mov_beneficiary">Beneficiario (Texto Libre)</label>
                <InputText id="mov_beneficiary" v-model="movement.beneficiary" />
            </div>

            <div class="formgrid grid">
                <div class="field col-12 md:col-6">
                    <label for="mov_voucher">Nro Operación / Voucher</label>
                    <InputText id="mov_voucher" v-model="movement.voucher" />
                </div>
                <div class="field col-12 md:col-6">
                    <label for="mov_reference">Referencia</label>
                    <InputText id="mov_reference" v-model="movement.reference" />
                </div>
            </div>

            <template #footer>
                <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="hideMovementDialog" />
                <Button label="Guardar" icon="pi pi-check" class="p-button-text" @click="saveMovement" />
            </template>
        </Dialog>

        <!-- Modal de Transferencia -->
        <Dialog v-model:visible="transferDialog" :style="{ width: '600px' }" header="Transferencia entre Cuentas" :modal="true" class="p-fluid">
            <div class="formgrid grid">
                <div class="field col-12 md:col-6">
                    <label for="tr_source">Cuenta Origen</label>
                    <Dropdown id="tr_source" v-model="transfer.source_account_id" :options="accounts" optionLabel="displayName" optionValue="id" :class="{ 'p-invalid': submitted && !transfer.source_account_id }" />
                    <small class="p-error" v-if="submitted && !transfer.source_account_id">Origen es requerido.</small>
                </div>
                <div class="field col-12 md:col-6">
                    <label for="tr_dest">Cuenta Destino</label>
                    <Dropdown id="tr_dest" v-model="transfer.destination_account_id" :options="accounts" optionLabel="displayName" optionValue="id" :class="{ 'p-invalid': submitted && !transfer.destination_account_id }" />
                    <small class="p-error" v-if="submitted && !transfer.destination_account_id">Destino es requerido.</small>
                </div>
            </div>

            <div class="formgrid grid">
                <div class="field col-12 md:col-6">
                    <label for="tr_date">Fecha</label>
                    <Calendar id="tr_date" v-model="transfer.movement_date" dateFormat="dd/mm/yy" :showIcon="true" :class="{ 'p-invalid': submitted && !transfer.movement_date }" />
                    <small class="p-error" v-if="submitted && !transfer.movement_date">Fecha es requerida.</small>
                </div>
                <div class="field col-12 md:col-6">
                    <label for="tr_amount">Monto</label>
                    <InputNumber id="tr_amount" v-model="transfer.amount" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" :class="{ 'p-invalid': submitted && (!transfer.amount || transfer.amount <= 0) }" />
                    <small class="p-error" v-if="submitted && (!transfer.amount || transfer.amount <= 0)">Monto mayor a 0 requerido.</small>
                </div>
            </div>

            <div class="field">
                <label for="tr_category">Categoría (Motivo)</label>
                <Dropdown
                    id="tr_category"
                    v-model="transfer.movement_category_id"
                    :options="categories"
                    optionLabel="name"
                    optionValue="id"
                    filter
                    placeholder="Ej: TRANSFERENCIA ENTRE CUENTAS"
                    :class="{ 'p-invalid': submitted && !transfer.movement_category_id }"
                />
                <small class="p-error" v-if="submitted && !transfer.movement_category_id">Categoría requerida.</small>
            </div>

            <div class="formgrid grid">
                <div class="field col-12 md:col-6">
                    <label for="tr_voucher">Nro Operación / Voucher</label>
                    <InputText id="tr_voucher" v-model="transfer.voucher" />
                </div>
                <div class="field col-12 md:col-6">
                    <label for="tr_reference">Referencia</label>
                    <InputText id="tr_reference" v-model="transfer.reference" />
                </div>
            </div>

            <template #footer>
                <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="hideTransferDialog" />
                <Button label="Guardar" icon="pi pi-check" class="p-button-text" @click="saveTransfer" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped></style>
