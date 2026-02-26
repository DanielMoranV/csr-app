<script setup>
import { TreasuryService } from '@/service/TreasuryService';
import { FilterMatchMode } from '@primevue/core/api';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref, watch } from 'vue';

const toast = useToast();
const confirm = useConfirm();

const vAutofocus = {
    mounted(el) {
        const input = el.tagName === 'INPUT' ? el : el.querySelector('input');
        if (input) input.focus();
    }
};

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

const transferDialog = ref(false);
const submitted = ref(false);
const processingMovement = ref(false);
const showAddMovement = ref(false);

const transfer = ref({});

const newMovement = ref({
    bank_account_id: null,
    movement_date: new Date(),
    voucher: '',
    movement_category_id: null,
    counterparty_id: null,
    beneficiary: '',
    reference: '',
    amount: null,
    movement_direction: 'OUT'
});

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

const onCellEditComplete = async (event) => {
    let { data, field, newValue } = event;

    // Custom handling for derived fields amount_in and amount_out
    if (field === 'amount_in') {
        data.amount = newValue;
        data.movement_direction = 'IN';
    } else if (field === 'amount_out') {
        data.amount = newValue;
        data.movement_direction = 'OUT';
    } else {
        data[field] = newValue;
    }

    if (!data.id) return;

    const idx = movements.value.findIndex((m) => m.id === data.id);
    if (idx !== -1) movements.value[idx] = data;

    processingMovement.value = true;
    try {
        const payload = { ...data };
        if (payload.movement_date && payload.movement_date.includes('T')) {
            payload.movement_date = payload.movement_date.split('T')[0];
        }

        const response = await TreasuryService.updateBankMovement(data.id, payload);
        movements.value[idx] = response.data?.data || response.data || data;
        toast.add({ severity: 'success', summary: 'Guardado', detail: 'Movimiento actualizado', life: 1500 });
    } catch (error) {
        console.error('Error updating:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar', life: 3000 });
    } finally {
        processingMovement.value = false;
    }
};

const toggleAddMovement = () => {
    if (!filterAccount.value) {
        toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'Seleccione una cuenta primero', life: 3000 });
        return;
    }
    showAddMovement.value = !showAddMovement.value;
    if (showAddMovement.value) {
        newMovement.value = {
            bank_account_id: filterAccount.value,
            movement_date: new Date(),
            voucher: '',
            movement_category_id: null,
            counterparty_id: null,
            beneficiary: '',
            reference: '',
            amount: null,
            movement_direction: 'OUT'
        };
    }
};

const saveNewMovementInline = async () => {
    if (!newMovement.value.amount || !newMovement.value.movement_category_id || !newMovement.value.movement_date) {
        toast.add({ severity: 'warn', summary: 'Validación', detail: 'Faltan campos requeridos (Fecha, Monto, Categoría)', life: 3000 });
        return;
    }

    processingMovement.value = true;
    try {
        const dataToSave = { ...newMovement.value, bank_account_id: filterAccount.value };
        dataToSave.movement_date = new Date(dataToSave.movement_date).toISOString().split('T')[0];

        await TreasuryService.createBankMovement(dataToSave);
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Movimiento registrado', life: 3000 });

        showAddMovement.value = false;
        loadMovements();
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al registrar', life: 3000 });
    } finally {
        processingMovement.value = false;
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
    <div class="bank-movements">
        <!-- ================================================================ -->
        <!-- FILTER BAR                                                        -->
        <!-- ================================================================ -->
        <div class="filter-card card mb-3">
            <div class="flex flex-wrap gap-4 align-items-center">
                <!-- Title -->
                <div class="flex align-items-center gap-2">
                    <div class="filter-title-icon">
                        <i class="pi pi-money-bill"></i>
                    </div>
                    <h2 class="text-lg font-bold m-0 text-900">Administración de Movimientos</h2>
                </div>

                <Divider layout="vertical" class="mx-0 hidden md:block" style="height: 2rem" />

                <!-- Account filter -->
                <div class="filter-group">
                    <label class="filter-label">
                        <i class="pi pi-building"></i>
                        Cuenta Bancaria
                    </label>
                    <Dropdown id="filterAccount" v-model="filterAccount" :options="accounts" optionLabel="displayName" optionValue="id" placeholder="Seleccione una cuenta" class="filter-input" />
                </div>

                <!-- Start Date filter -->
                <div class="filter-group">
                    <label class="filter-label">
                        <i class="pi pi-calendar"></i>
                        Fecha Desde
                    </label>
                    <Calendar id="filterStartDate" v-model="filterStartDate" dateFormat="dd/mm/yy" :showIcon="true" class="filter-input-date" placeholder="Desde" />
                </div>

                <!-- End Date filter -->
                <div class="filter-group">
                    <label class="filter-label">
                        <i class="pi pi-calendar"></i>
                        Fecha Hasta
                    </label>
                    <Calendar id="filterEndDate" v-model="filterEndDate" dateFormat="dd/mm/yy" :showIcon="true" class="filter-input-date" placeholder="Hasta" />
                </div>

                <!-- Search Button -->
                <div class="flex align-items-end mt-2 md:mt-0">
                    <Button label="Buscar" icon="pi pi-search" @click="loadMovements" class="p-button-primary" />
                </div>
            </div>
        </div>

        <div class="card">
            <Toolbar class="mb-4">
                <template #start>
                    <Button label="Nuevo Movimiento" icon="pi pi-plus" class="p-button-success mr-2" @click="toggleAddMovement" />
                    <Button label="Transferencia" icon="pi pi-arrow-right-arrow-left" class="p-button-info" @click="openNewTransfer" />
                </template>
                <template #end>
                    <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                    </span>
                </template>
            </Toolbar>

            <!-- INLINE ADD FORM -->
            <transition name="slide-down">
                <div v-if="showAddMovement" class="add-patient-form mb-4 p-3 surface-50 border-round border-1 surface-border">
                    <h5 class="mt-0 mb-3"><i class="pi pi-file-edit mr-2 text-primary"></i>Nuevo Movimiento</h5>
                    <div class="formgrid grid align-items-end">
                        <div class="field col-12 md:col-2">
                            <label>Fecha</label>
                            <Calendar v-model="newMovement.movement_date" dateFormat="dd/mm/yy" :showIcon="true" class="w-full p-inputtext-sm" />
                        </div>
                        <div class="field col-12 md:col-2">
                            <label>Tipo</label>
                            <Dropdown
                                v-model="newMovement.movement_direction"
                                :options="[
                                    { label: 'Ingreso', value: 'IN' },
                                    { label: 'Egreso', value: 'OUT' }
                                ]"
                                optionLabel="label"
                                optionValue="value"
                                class="w-full p-inputtext-sm"
                            />
                        </div>
                        <div class="field col-12 md:col-2">
                            <label>Monto</label>
                            <InputNumber v-model="newMovement.amount" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" class="w-full p-inputtext-sm" />
                        </div>
                        <div class="field col-12 md:col-3">
                            <label>Categoría</label>
                            <Dropdown v-model="newMovement.movement_category_id" :options="categories" optionLabel="name" optionValue="id" filter class="w-full p-inputtext-sm" placeholder="Categoría" />
                        </div>
                        <div class="field col-12 md:col-3">
                            <label>Tercero (Opcional)</label>
                            <Dropdown v-model="newMovement.counterparty_id" :options="counterparties" optionLabel="name" optionValue="id" filter showClear class="w-full p-inputtext-sm" placeholder="Tercero" />
                        </div>
                        <div class="field col-12 md:col-4">
                            <label>Beneficiario Libre (Si no hay Tercero)</label>
                            <InputText v-model="newMovement.beneficiary" class="w-full p-inputtext-sm" />
                        </div>
                        <div class="field col-12 md:col-3">
                            <label>Voucher</label>
                            <InputText v-model="newMovement.voucher" class="w-full p-inputtext-sm" />
                        </div>
                        <div class="field col-12 md:col-3">
                            <label>Referencia</label>
                            <InputText v-model="newMovement.reference" class="w-full p-inputtext-sm" @keyup.enter="saveNewMovementInline" />
                        </div>
                        <div class="field col-12 md:col-2 flex gap-2">
                            <Button icon="pi pi-check" severity="success" label="Guardar" :loading="processingMovement" @click="saveNewMovementInline" class="flex-1" />
                            <Button icon="pi pi-times" severity="secondary" text @click="showAddMovement = false" />
                        </div>
                    </div>
                </div>
            </transition>

            <DataTable
                :value="movements"
                :paginator="true"
                :rows="10"
                dataKey="id"
                :filters="filters"
                :loading="loading"
                showGridlines
                responsiveLayout="scroll"
                emptyMessage="No se encontraron movimientos."
                editMode="cell"
                @cell-edit-complete="onCellEditComplete"
                class="p-datatable-sm editable-cells"
            >
                <Column field="movement_date" header="Fecha" :sortable="true">
                    <template #body="{ data }">
                        {{ data.movement_date }}
                    </template>
                    <template #editor="{ data, field }">
                        <InputText v-autofocus v-model="data[field]" class="w-full p-inputtext-sm" placeholder="YYYY-MM-DD" />
                    </template>
                </Column>
                <Column field="voucher" header="Voucher/Operación" :sortable="true">
                    <template #editor="{ data, field }">
                        <InputText v-autofocus v-model="data[field]" class="w-full p-inputtext-sm" />
                    </template>
                </Column>
                <Column field="movement_category_id" header="Categoría" :sortable="true">
                    <template #body="{ data }">
                        {{ data.category?.name || '-' }}
                    </template>
                    <template #editor="{ data, field }">
                        <Dropdown v-model="data[field]" :options="categories" optionLabel="name" optionValue="id" filter class="w-full p-inputtext-sm" autofocus />
                    </template>
                </Column>
                <Column field="counterparty_id" header="Tercero" :sortable="true">
                    <template #body="{ data }">
                        {{ data.counterparty?.name || data.beneficiary || '-' }}
                    </template>
                    <template #editor="{ data, field }">
                        <Dropdown v-model="data[field]" :options="counterparties" optionLabel="name" optionValue="id" filter showClear class="w-full p-inputtext-sm" autofocus />
                    </template>
                </Column>
                <Column field="reference" header="Referencia" :sortable="true">
                    <template #editor="{ data, field }">
                        <InputText v-autofocus v-model="data[field]" class="w-full p-inputtext-sm" />
                    </template>
                </Column>

                <Column field="amount_in" header="Ingreso" :sortable="true" style="text-align: right">
                    <template #body="{ data }">
                        <span class="text-green-500 font-bold" v-if="data.movement_direction === 'IN'">
                            {{ formatCurrency(data.amount) }}
                        </span>
                    </template>
                    <template #editor="{ data }">
                        <InputNumber v-autofocus v-model="data.amount" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" class="w-full p-inputtext-sm" v-if="data.movement_direction === 'IN'" />
                        <InputNumber v-autofocus v-model="data.amount" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" class="w-full p-inputtext-sm" v-else placeholder="Ingresar..." />
                    </template>
                </Column>

                <Column field="amount_out" header="Egreso" :sortable="true" style="text-align: right">
                    <template #body="{ data }">
                        <span class="text-red-500 font-bold" v-if="data.movement_direction === 'OUT'">
                            {{ formatCurrency(data.amount) }}
                        </span>
                    </template>
                    <template #editor="{ data }">
                        <InputNumber v-autofocus v-model="data.amount" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" class="w-full p-inputtext-sm" v-if="data.movement_direction === 'OUT'" />
                        <InputNumber v-autofocus v-model="data.amount" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" class="w-full p-inputtext-sm" v-else placeholder="Ingresar..." />
                    </template>
                </Column>
            </DataTable>

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
    </div>
</template>

<style scoped>
.filter-card {
    border-top: 4px solid var(--primary-color);
    padding: 1.5rem;
}

.filter-title-icon {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 8px;
    background: var(--primary-50, #eff6ff);
    border: 1px solid var(--primary-100, #dbeafe);
    display: flex;
    align-items: center;
    justify-content: center;
}

.filter-title-icon i {
    font-size: 1rem;
    color: var(--primary-500, #3b82f6);
}

.filter-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
}

.filter-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    display: flex;
    align-items: center;
    gap: 0.3rem;
    white-space: nowrap;
}

.filter-label i {
    font-size: 0.75rem;
    color: var(--primary-400, #60a5fa);
}

:deep(.filter-input) {
    width: 14rem;
}

:deep(.filter-input-date) {
    width: 10rem;
}

:deep(.filter-input .p-inputtext),
:deep(.filter-input-date .p-inputtext) {
    padding-top: 0.4rem;
    padding-bottom: 0.4rem;
    font-size: 0.875rem;
}
:deep(.editable-cells .p-datatable-tbody > tr > td) {
    cursor: pointer;
}
:deep(.editable-cells .p-datatable-tbody > tr > td:hover) {
    background-color: var(--highlight-bg, var(--surface-100));
    outline: 1px solid var(--primary-200);
    outline-offset: -1px;
}
:deep(.editable-cells .p-datatable-tbody > tr > td.p-cell-editing) {
    padding: 0.1rem 0.25rem;
}

/* Add patient form fade-in */
.add-patient-form {
    animation: fadeIn 0.15s ease-out;
}
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
