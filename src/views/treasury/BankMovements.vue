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
const processingMovement = ref(false);

const filterAccount = ref(null);
const filterStartDate = ref(null);
const filterEndDate = ref(null);

const filters = ref({ global: { value: null, matchMode: FilterMatchMode.CONTAINS } });

// Row editing state
const editingRows = ref([]);

// Transfer dialog
const transferDialog = ref(false);
const submitted = ref(false);
const transfer = ref({});

// ─── DIRECTION OPTIONS ────────────────────────────────────────────────────────
const directionOptions = [
    { label: '▲ Ingreso', value: 'IN' },
    { label: '▼ Egreso', value: 'OUT' }
];

// ─── LOAD DATA ────────────────────────────────────────────────────────────────
const loadData = async () => {
    loading.value = true;
    try {
        const [accountsRes, counterpartiesRes, categoriesRes] = await Promise.all([
            TreasuryService.getBankAccounts(),
            TreasuryService.getCounterparties(),
            TreasuryService.getMovementCategories()
        ]);
        accounts.value = (accountsRes.data.data || accountsRes.data).map((acc) => ({
            ...acc,
            displayName: `${acc.bank.name} - ${acc.description} (${acc.currency})`
        }));
        counterparties.value = counterpartiesRes.data.data || counterpartiesRes.data;
        categories.value = categoriesRes.data.data || categoriesRes.data;
        if (accounts.value.length > 0) filterAccount.value = accounts.value[0].id;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar datos base', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const loadMovements = async () => {
    if (!filterAccount.value) return;
    loading.value = true;
    try {
        const params = { bank_account_id: filterAccount.value };
        if (filterStartDate.value) params.start_date = filterStartDate.value.toISOString().split('T')[0];
        if (filterEndDate.value) params.end_date = filterEndDate.value.toISOString().split('T')[0];
        const response = await TreasuryService.getBankMovements(params);
        movements.value = (response.data.data || response.data).map((m) => ({ ...m }));
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los movimientos', life: 3000 });
    } finally {
        loading.value = false;
    }
};

onMounted(async () => {
    await loadData();
    if (filterAccount.value) loadMovements();
});
watch([filterAccount, filterStartDate, filterEndDate], loadMovements);

// ─── INLINE NEW ROW ───────────────────────────────────────────────────────────
const addNewRow = () => {
    if (!filterAccount.value) {
        toast.add({ severity: 'warn', summary: 'Advertencia', detail: 'Seleccione una cuenta primero', life: 3000 });
        return;
    }
    // Remove any existing unsaved new row first
    movements.value = movements.value.filter((m) => !m._isNew);

    const today = new Date().toISOString().split('T')[0];
    const newRow = {
        _isNew: true,
        _id: `new_${Date.now()}`,
        movement_date: today,
        voucher: '',
        movement_category_id: null,
        counterparty_id: null,
        beneficiary: '',
        reference: '',
        amount: null,
        movement_direction: 'OUT'
    };
    movements.value.unshift(newRow);
    editingRows.value = [newRow];
};

const cancelNewRow = (row) => {
    movements.value = movements.value.filter((m) => m._id !== row._id);
    editingRows.value = [];
};

const saveRow = async (row) => {
    if (!row.movement_date || !row.movement_category_id || !row.amount) {
        toast.add({ severity: 'warn', summary: 'Validación', detail: 'Fecha, Categoría y Monto son obligatorios', life: 3000 });
        return;
    }
    // Validate direction vs category type
    const catType = getCategoryType(row.movement_category_id);
    if (catType === 'IN' && row.movement_direction !== 'IN') {
        toast.add({ severity: 'error', summary: 'Tipo incompatible', detail: 'La categoría seleccionada es de tipo Ingreso. El tipo de movimiento debe ser Ingreso.', life: 4000 });
        row.movement_direction = 'IN'; // auto-fix
        return;
    }
    if (catType === 'OUT' && row.movement_direction !== 'OUT') {
        toast.add({ severity: 'error', summary: 'Tipo incompatible', detail: 'La categoría seleccionada es de tipo Egreso. El tipo de movimiento debe ser Egreso.', life: 4000 });
        row.movement_direction = 'OUT'; // auto-fix
        return;
    }
    processingMovement.value = true;
    try {
        if (row._isNew) {
            const payload = {
                bank_account_id: filterAccount.value,
                movement_date: row.movement_date,
                voucher: row.voucher || '',
                movement_category_id: row.movement_category_id,
                counterparty_id: row.counterparty_id || null,
                beneficiary: row.beneficiary || '',
                reference: row.reference || '',
                amount: row.amount,
                movement_direction: row.movement_direction
            };
            await TreasuryService.createBankMovement(payload);
            toast.add({ severity: 'success', summary: 'Guardado', detail: 'Movimiento registrado', life: 2000 });
            await loadMovements();
        } else {
            const payload = { ...row };
            await TreasuryService.updateBankMovement(row.id, payload);
            const idx = movements.value.findIndex((m) => m.id === row.id);
            if (idx !== -1) movements.value[idx] = { ...row };
            toast.add({ severity: 'success', summary: 'Guardado', detail: 'Movimiento actualizado', life: 1500 });
        }
        editingRows.value = [];
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar', life: 3000 });
    } finally {
        processingMovement.value = false;
    }
};

const cancelEdit = (row) => {
    if (row._isNew) {
        cancelNewRow(row);
        return;
    }
    editingRows.value = [];
    loadMovements();
};

const onRowEditInit = (event) => {
    editingRows.value = [event.data];
};

// ─── TRANSFER ─────────────────────────────────────────────────────────────────
const openNewTransfer = () => {
    transfer.value = {};
    submitted.value = false;
    transferDialog.value = true;
};
const hideTransferDialog = () => {
    transferDialog.value = false;
    submitted.value = false;
};
const saveTransfer = async () => {
    submitted.value = true;
    if (transfer.value.source_account_id && transfer.value.destination_account_id && transfer.value.movement_category_id && transfer.value.amount > 0 && transfer.value.movement_date) {
        if (transfer.value.source_account_id === transfer.value.destination_account_id) {
            toast.add({ severity: 'warn', summary: 'Cuentas iguales', detail: 'Origen y destino deben ser distintos', life: 3000 });
            return;
        }
        try {
            const payload = { ...transfer.value };
            payload.movement_date = new Date(payload.movement_date).toISOString().split('T')[0];
            await TreasuryService.createTransfer(payload);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Transferencia registrada', life: 3000 });
            hideTransferDialog();
            loadMovements();
        } catch {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Error registrando transferencia', life: 3000 });
        }
    }
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const formatCurrency = (value) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
const clearDateFilter = () => {
    filterStartDate.value = null;
    filterEndDate.value = null;
};
const isEditing = (row) => editingRows.value.some((r) => (r._id && r._id === row._id) || (r.id && r.id === row.id));

// ─── CATEGORY / DIRECTION HELPERS ─────────────────────────────────────────────
/**
 * Returns 'IN' | 'OUT' | 'MIX' based on category's movement_type.name
 * Handles: "Ingreso" → IN, "Egreso" → OUT, anything else (e.g. "Mixto") → MIX
 */
const getCategoryType = (categoryId) => {
    const cat = categories.value.find((c) => c.id === categoryId);
    if (!cat?.movement_type) return 'MIX';
    const name = cat.movement_type.name?.toLowerCase() || '';
    if (name.includes('ingreso')) return 'IN';
    if (name.includes('egreso') || name.includes('salida')) return 'OUT';
    return 'MIX';
};

/** Badge label for display in the table body (I / E / M) */
const categoryTypeBadge = (categoryId) => {
    const t = getCategoryType(categoryId);
    return { IN: 'I', OUT: 'E', MIX: 'M' }[t];
};

/** Severity for the badge Tag */
const categoryTypeSeverity = (categoryId) => {
    const t = getCategoryType(categoryId);
    return { IN: 'success', OUT: 'danger', MIX: 'info' }[t];
};

/**
 * Called when user changes the category dropdown in an inline row.
 * Auto-sets direction if category type is not MIX.
 */
const onCategoryChange = (row, newCategoryId) => {
    row.movement_category_id = newCategoryId;
    const type = getCategoryType(newCategoryId);
    if (type === 'IN') row.movement_direction = 'IN';
    else if (type === 'OUT') row.movement_direction = 'OUT';
    // MIX → leave the user's current choice
};

/** Whether the direction dropdown should be disabled (locked by category) */
const directionLocked = (categoryId) => {
    if (!categoryId) return false;
    return getCategoryType(categoryId) !== 'MIX';
};
</script>

<template>
    <div class="treasury-view">
        <div class="main-card">
            <!-- Hero Header -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-money-bill"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Movimientos Bancarios</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-arrow-right-arrow-left mr-2"></i>
                        Registro y seguimiento de ingresos y egresos
                    </p>
                </div>
            </div>

            <!-- Filters Card -->
            <div class="filters-card">
                <div class="filters-content-inline">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-filter filter-icon"></i>
                        <span class="filter-label">Filtros:</span>
                    </div>

                    <!-- Account filter -->
                    <div class="filter-group">
                        <label class="filter-label-sm"><i class="pi pi-building mr-1"></i>Cuenta</label>
                        <Dropdown id="filterAccount" v-model="filterAccount" :options="accounts" optionLabel="displayName" optionValue="id" placeholder="Seleccione cuenta" class="filter-dropdown" />
                    </div>

                    <!-- Start Date -->
                    <div class="filter-group">
                        <label class="filter-label-sm"><i class="pi pi-calendar mr-1"></i>Desde</label>
                        <Calendar id="filterStartDate" v-model="filterStartDate" dateFormat="dd/mm/yy" :showIcon="true" class="calendar-compact" placeholder="Fecha inicio" />
                    </div>

                    <!-- End Date -->
                    <div class="filter-group">
                        <label class="filter-label-sm"><i class="pi pi-calendar mr-1"></i>Hasta</label>
                        <Calendar id="filterEndDate" v-model="filterEndDate" dateFormat="dd/mm/yy" :showIcon="true" class="calendar-compact" placeholder="Fecha fin" />
                    </div>

                    <div class="flex items-end gap-2">
                        <Button label="Buscar" icon="pi pi-search" class="search-btn" @click="loadMovements" />
                        <Button v-if="filterStartDate || filterEndDate" icon="pi pi-times" class="clear-btn" @click="clearDateFilter" v-tooltip.top="'Limpiar fechas'" />
                    </div>

                    <div v-if="movements.length > 0" class="ml-auto">
                        <Tag :value="`${movements.length} movimientos`" severity="info" class="result-tag" />
                    </div>
                </div>
            </div>

            <!-- Table Header -->
            <div class="table-header-modern">
                <div class="header-left">
                    <div class="header-icon-badge">
                        <i class="pi pi-list"></i>
                    </div>
                    <div class="header-info">
                        <span class="header-title-small">Registro de Movimientos</span>
                        <span class="header-count" v-if="movements">{{ movements.length }} movimientos</span>
                    </div>
                </div>
                <div class="header-actions-modern">
                    <IconField iconPosition="left" class="search-field">
                        <InputIcon>
                            <i class="pi pi-search" />
                        </InputIcon>
                        <InputText v-model="filters['global'].value" placeholder="Buscar movimientos..." class="search-input-modern" />
                    </IconField>
                    <Button label="+ Agregar fila" icon="pi pi-plus" class="action-button" @click="addNewRow" />
                    <Button label="Transferencia" icon="pi pi-arrow-right-arrow-left" class="transfer-button" @click="openNewTransfer" />
                </div>
            </div>

            <!-- DataTable con row editing Excel-like -->
            <DataTable
                :value="movements"
                :paginator="true"
                :rows="15"
                dataKey="_id"
                :filters="filters"
                :loading="loading"
                showGridlines
                responsiveLayout="scroll"
                :emptyMessage="undefined"
                editMode="row"
                v-model:editingRows="editingRows"
                @row-edit-init="onRowEditInit"
                class="modern-datatable excel-grid"
                :rowClass="(row) => ({ 'row-new': row._isNew, 'row-editing': isEditing(row) })"
            >
                <template #empty>
                    <div class="empty-state">
                        <div class="empty-icon-wrapper">
                            <i class="pi pi-money-bill"></i>
                        </div>
                        <h3 class="empty-title">Sin movimientos registrados</h3>
                        <p class="empty-subtitle">No hay movimientos para la cuenta y período seleccionados. Usa <strong>+ Agregar fila</strong> para registrar uno.</p>
                    </div>
                </template>

                <!-- Fecha -->
                <Column field="movement_date" header="Fecha" :sortable="true" style="min-width: 8rem">
                    <template #body="{ data }">
                        <span :class="{ 'date-new': data._isNew }">{{ data.movement_date || '—' }}</span>
                    </template>
                    <template #editor="{ data, field }">
                        <InputText v-model="data[field]" class="cell-input" placeholder="YYYY-MM-DD" autofocus />
                    </template>
                </Column>

                <!-- Dirección (Ingreso/Egreso) -->
                <Column field="movement_direction" header="Tipo" style="min-width: 8rem">
                    <template #body="{ data }">
                        <div class="direction-cell">
                            <Tag :value="data.movement_direction === 'IN' ? 'Ingreso' : 'Egreso'" :severity="data.movement_direction === 'IN' ? 'success' : 'danger'" class="direction-tag" />
                            <i v-if="data.movement_category_id && directionLocked(data.movement_category_id)" class="pi pi-lock direction-lock-icon" v-tooltip.top="'Dirección fijada por la categoría'" />
                        </div>
                    </template>
                    <template #editor="{ data, field }">
                        <div class="direction-editor">
                            <Dropdown v-model="data[field]" :options="directionOptions" optionLabel="label" optionValue="value" class="cell-dropdown" :disabled="directionLocked(data.movement_category_id)" />
                            <span v-if="directionLocked(data.movement_category_id)" class="direction-locked-hint">
                                <i class="pi pi-lock"></i>
                            </span>
                        </div>
                    </template>
                </Column>

                <!-- Voucher -->
                <Column field="voucher" header="Voucher/Op." style="min-width: 8rem">
                    <template #body="{ data }">{{ data.voucher || '—' }}</template>
                    <template #editor="{ data, field }">
                        <InputText v-model="data[field]" class="cell-input" placeholder="Nro. operación" />
                    </template>
                </Column>

                <Column field="movement_category_id" header="Categoría" :sortable="true" style="min-width: 14rem">
                    <template #body="{ data }">
                        <div v-if="data.category?.name || data.movement_category_id" class="category-body">
                            <span class="category-tag">
                                {{ data.category?.name || categories.find((c) => c.id === data.movement_category_id)?.name || '-' }}
                            </span>
                            <Tag
                                :value="categoryTypeBadge(data.movement_category_id)"
                                :severity="categoryTypeSeverity(data.movement_category_id)"
                                class="cat-type-badge"
                                v-tooltip.top="getCategoryType(data.movement_category_id) === 'IN' ? 'Solo Ingreso' : getCategoryType(data.movement_category_id) === 'OUT' ? 'Solo Egreso' : 'Mixto'"
                            />
                        </div>
                        <span v-else class="text-required">Requerido *</span>
                    </template>
                    <template #editor="{ data, field }">
                        <Dropdown :modelValue="data[field]" @update:modelValue="(val) => onCategoryChange(data, val)" :options="categories" optionLabel="name" optionValue="id" filter placeholder="Seleccionar..." class="cell-dropdown">
                            <template #option="{ option }">
                                <div class="category-option">
                                    <span>{{ option.name }}</span>
                                    <Tag
                                        v-if="option.movement_type"
                                        :value="option.movement_type.name?.toLowerCase().includes('ingreso') ? 'I' : option.movement_type.name?.toLowerCase().includes('egreso') ? 'E' : 'M'"
                                        :severity="option.movement_type.name?.toLowerCase().includes('ingreso') ? 'success' : option.movement_type.name?.toLowerCase().includes('egreso') ? 'danger' : 'info'"
                                        class="cat-type-badge"
                                    />
                                </div>
                            </template>
                        </Dropdown>
                    </template>
                </Column>

                <!-- Tercero -->
                <Column field="counterparty_id" header="Tercero" style="min-width: 12rem">
                    <template #body="{ data }">
                        {{ data.counterparty?.name || counterparties.find((c) => c.id === data.counterparty_id)?.name || data.beneficiary || '—' }}
                    </template>
                    <template #editor="{ data, field }">
                        <Dropdown v-model="data[field]" :options="counterparties" optionLabel="name" optionValue="id" filter showClear placeholder="Tercero..." class="cell-dropdown" />
                    </template>
                </Column>

                <!-- Referencia -->
                <Column field="reference" header="Referencia" style="min-width: 10rem">
                    <template #body="{ data }">{{ data.reference || '—' }}</template>
                    <template #editor="{ data, field }">
                        <InputText v-model="data[field]" class="cell-input" placeholder="Glosa / referencia" />
                    </template>
                </Column>

                <!-- Monto -->
                <Column field="amount" header="Monto" :sortable="true" style="min-width: 10rem; text-align: right">
                    <template #body="{ data }">
                        <span :class="data.movement_direction === 'IN' ? 'amount-in' : 'amount-out'">
                            {{ data.amount ? formatCurrency(data.amount) : '—' }}
                        </span>
                    </template>
                    <template #editor="{ data, field }">
                        <InputNumber v-model="data[field]" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" class="cell-number" placeholder="0.00" />
                    </template>
                </Column>

                <!-- Acciones fila -->
                <Column header="" style="min-width: 6rem; text-align: center" :exportable="false">
                    <template #body="{ data }">
                        <div class="row-actions" v-if="!isEditing(data)">
                            <Button icon="pi pi-pencil" class="row-edit-btn" v-tooltip.top="'Editar fila'" text rounded @click="editingRows = [data]" />
                        </div>
                    </template>
                    <template #editor="{ data }">
                        <div class="row-save-actions">
                            <Button icon="pi pi-check" class="row-save-btn" v-tooltip.top="'Guardar'" :loading="processingMovement" rounded @click="saveRow(data)" />
                            <Button icon="pi pi-times" class="row-cancel-btn" v-tooltip.top="'Cancelar'" text rounded @click="cancelEdit(data)" />
                        </div>
                    </template>
                </Column>
            </DataTable>

            <!-- Modal Transferencia -->
            <Dialog v-model:visible="transferDialog" :style="{ width: '580px' }" :modal="true" :closable="true" class="transfer-dialog" @hide="hideTransferDialog">
                <template #header>
                    <div class="dialog-header">
                        <div class="dialog-header-icon transfer-icon">
                            <i class="pi pi-arrow-right-arrow-left"></i>
                        </div>
                        <div>
                            <h3 class="dialog-title">Transferencia entre Cuentas</h3>
                            <p class="dialog-subtitle">Mueve fondos de una cuenta a otra de forma registrada</p>
                        </div>
                    </div>
                </template>

                <div class="dialog-body">
                    <!-- Origen → Destino con flecha -->
                    <div class="transfer-accounts-row">
                        <div class="form-field flex-1">
                            <label class="form-label" for="tr_source">
                                <i class="pi pi-sign-out form-label-icon"></i>
                                Cuenta Origen <span class="required-star">*</span>
                            </label>
                            <Dropdown
                                id="tr_source"
                                v-model="transfer.source_account_id"
                                :options="accounts"
                                optionLabel="displayName"
                                optionValue="id"
                                filter
                                placeholder="Seleccione cuenta origen"
                                class="w-full"
                                :class="{ 'p-invalid': submitted && !transfer.source_account_id }"
                            />
                            <small class="p-error" v-if="submitted && !transfer.source_account_id"> <i class="pi pi-exclamation-circle mr-1"></i>Requerido. </small>
                        </div>

                        <div class="transfer-arrow">
                            <i class="pi pi-arrow-right"></i>
                        </div>

                        <div class="form-field flex-1">
                            <label class="form-label" for="tr_dest">
                                <i class="pi pi-sign-in form-label-icon"></i>
                                Cuenta Destino <span class="required-star">*</span>
                            </label>
                            <Dropdown
                                id="tr_dest"
                                v-model="transfer.destination_account_id"
                                :options="accounts"
                                optionLabel="displayName"
                                optionValue="id"
                                filter
                                placeholder="Seleccione cuenta destino"
                                class="w-full"
                                :class="{ 'p-invalid': submitted && !transfer.destination_account_id }"
                            />
                            <small class="p-error" v-if="submitted && !transfer.destination_account_id"> <i class="pi pi-exclamation-circle mr-1"></i>Requerido. </small>
                        </div>
                    </div>

                    <!-- Alerta si son la misma cuenta -->
                    <div v-if="transfer.source_account_id && transfer.destination_account_id && transfer.source_account_id === transfer.destination_account_id" class="same-account-alert">
                        <i class="pi pi-exclamation-triangle"></i>
                        La cuenta origen y destino no pueden ser la misma.
                    </div>

                    <!-- Separador importe -->
                    <div class="section-divider">
                        <span class="section-divider-label"> <i class="pi pi-dollar mr-1"></i>Importe y Fecha </span>
                    </div>

                    <!-- Fecha + Monto -->
                    <div class="form-grid-2">
                        <div class="form-field">
                            <label class="form-label" for="tr_date">
                                <i class="pi pi-calendar form-label-icon"></i>
                                Fecha <span class="required-star">*</span>
                            </label>
                            <Calendar id="tr_date" v-model="transfer.movement_date" dateFormat="dd/mm/yy" :showIcon="true" class="w-full" :class="{ 'p-invalid': submitted && !transfer.movement_date }" />
                            <small class="p-error" v-if="submitted && !transfer.movement_date">Requerido.</small>
                        </div>
                        <div class="form-field">
                            <label class="form-label" for="tr_amount">
                                <i class="pi pi-wallet form-label-icon"></i>
                                Monto a Transferir <span class="required-star">*</span>
                            </label>
                            <InputNumber
                                id="tr_amount"
                                v-model="transfer.amount"
                                mode="decimal"
                                :minFractionDigits="2"
                                :maxFractionDigits="2"
                                placeholder="0.00"
                                class="w-full"
                                :class="{ 'p-invalid': submitted && (!transfer.amount || transfer.amount <= 0) }"
                            />
                            <small class="p-error" v-if="submitted && (!transfer.amount || transfer.amount <= 0)">Monto mayor a 0 requerido.</small>
                        </div>
                    </div>

                    <!-- Categoría -->
                    <div class="form-field">
                        <label class="form-label" for="tr_category">
                            <i class="pi pi-tag form-label-icon"></i>
                            Categoría / Motivo <span class="required-star">*</span>
                        </label>
                        <Dropdown
                            id="tr_category"
                            v-model="transfer.movement_category_id"
                            :options="categories"
                            optionLabel="name"
                            optionValue="id"
                            filter
                            placeholder="Ej: TRANSFERENCIA ENTRE CUENTAS"
                            class="w-full"
                            :class="{ 'p-invalid': submitted && !transfer.movement_category_id }"
                        />
                        <small class="p-error" v-if="submitted && !transfer.movement_category_id">Categoría requerida.</small>
                    </div>

                    <!-- Separador detalles -->
                    <div class="section-divider">
                        <span class="section-divider-label">
                            <i class="pi pi-file mr-1"></i>Detalles Adicionales
                            <span class="optional-tag">Opcional</span>
                        </span>
                    </div>

                    <!-- Voucher + Referencia -->
                    <div class="form-grid-2">
                        <div class="form-field">
                            <label class="form-label" for="tr_voucher">
                                <i class="pi pi-receipt form-label-icon"></i>
                                Nro. Operación / Voucher
                            </label>
                            <InputText id="tr_voucher" v-model="transfer.voucher" placeholder="Ej: 0012345678" class="form-input" />
                        </div>
                        <div class="form-field">
                            <label class="form-label" for="tr_reference">
                                <i class="pi pi-align-left form-label-icon"></i>
                                Referencia / Glosa
                            </label>
                            <InputText id="tr_reference" v-model="transfer.reference" placeholder="Descripción de la transferencia" class="form-input" />
                        </div>
                    </div>
                </div>

                <template #footer>
                    <div class="dialog-footer">
                        <Button label="Cancelar" icon="pi pi-times" class="dialog-cancel-btn" text @click="hideTransferDialog" />
                        <Button label="Registrar Transferencia" icon="pi pi-arrow-right-arrow-left" class="dialog-transfer-btn" @click="saveTransfer" />
                    </div>
                </template>
            </Dialog>
        </div>
    </div>
</template>

<style scoped>
@keyframes shimmer {
    0%,
    100% {
        transform: translateX(-100%) rotate(45deg);
    }
    50% {
        transform: translateX(100%) rotate(45deg);
    }
}
@keyframes pulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
}
@keyframes gradientShift {
    0%,
    100% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
}
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
@keyframes iconPulse {
    0%,
    100% {
        transform: scale(1);
        box-shadow:
            0 4px 12px rgba(16, 185, 129, 0.3),
            0 2px 8px rgba(5, 150, 105, 0.2);
    }
    50% {
        transform: scale(1.05);
        box-shadow:
            0 6px 16px rgba(16, 185, 129, 0.4),
            0 3px 10px rgba(5, 150, 105, 0.3);
    }
}

.treasury-view {
    padding: 1rem;
    animation: fadeIn 0.5s ease-out;
}

.main-card {
    background: linear-gradient(145deg, var(--surface-section), var(--surface-card));
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
}
.main-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #10b981, #059669, #10b981, #047857);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}
:global(.dark) .main-card {
    background: linear-gradient(145deg, #1e293b, #0f172a);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* ============ HEADER ============ */
.header-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.header-icon-wrapper {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    box-shadow:
        0 8px 20px rgba(16, 185, 129, 0.3),
        0 4px 12px rgba(5, 150, 105, 0.4);
    animation: pulse 2s ease-in-out infinite;
    position: relative;
    overflow: hidden;
}
.header-icon-wrapper::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: shimmer 3s infinite;
}
.header-icon-wrapper i {
    font-size: 2rem;
    color: #ffffff;
    z-index: 1;
}

.header-content {
    flex: 1;
}
.header-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
.header-subtitle {
    color: var(--text-color-secondary);
    font-size: 1rem;
    display: flex;
    align-items: center;
    margin: 0;
}

/* ============ FILTERS CARD ============ */
.filters-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
:global(.dark) .filters-card {
    background: var(--surface-ground);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.filters-content-inline {
    display: flex;
    align-items: flex-end;
    gap: 1.25rem;
    flex-wrap: wrap;
}
.filter-icon {
    color: #10b981;
    font-size: 1.25rem;
}
.filter-label {
    font-weight: 600;
    color: var(--text-color);
    font-size: 0.95rem;
}
.filter-label-sm {
    font-weight: 500;
    color: var(--text-color-secondary);
    font-size: 0.8rem;
    display: block;
    margin-bottom: 0.25rem;
}
.filter-group {
    display: flex;
    flex-direction: column;
}

:deep(.filter-dropdown) {
    width: 16rem;
}
:deep(.filter-dropdown .p-inputtext),
:deep(.calendar-compact .p-inputtext) {
    padding-top: 0.4rem;
    padding-bottom: 0.4rem;
    font-size: 0.875rem;
}
.calendar-compact {
    max-width: 160px;
}

.search-btn {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border: none !important;
    border-radius: 8px !important;
    transition: all 0.3s ease !important;
}
.search-btn:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35) !important;
}

.clear-btn {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
    border: none !important;
    color: white !important;
    border-radius: 8px !important;
    transition: all 0.3s ease !important;
}
.result-tag {
    font-weight: 600;
}

/* ============ TABLE HEADER ============ */
.table-header-modern {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, var(--surface-section) 0%, var(--surface-card) 100%);
    border-bottom: 2px solid color-mix(in srgb, var(--green-500) 20%, var(--surface-border));
    gap: 1rem;
    position: relative;
}
.table-header-modern::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #10b981, #059669, #10b981);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}
.header-icon-badge {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
        0 4px 12px rgba(16, 185, 129, 0.3),
        0 2px 8px rgba(5, 150, 105, 0.2);
    position: relative;
    overflow: hidden;
    animation: iconPulse 2s ease-in-out infinite;
}
.header-icon-badge::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%);
    animation: shimmer 3s ease-in-out infinite;
}
.header-icon-badge i {
    font-size: 1.5rem;
    color: white;
    position: relative;
    z-index: 1;
}

.header-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}
.header-title-small {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-color);
}
.header-count {
    font-size: 0.813rem;
    font-weight: 600;
    color: #059669;
    background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%);
    padding: 0.188rem 0.625rem;
    border-radius: 6px;
    display: inline-block;
    width: fit-content;
    border: 1px solid #6ee7b7;
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
}

.header-actions-modern {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
}
.search-field {
    width: 250px;
}
.search-input-modern {
    border-radius: 10px;
    border: 2px solid var(--surface-border);
    padding: 0.625rem 0.875rem 0.625rem 2.5rem;
    font-size: 0.875rem;
    transition: all 0.3s ease;
    background: var(--surface-ground);
    color: var(--text-color);
}
.search-input-modern:hover {
    border-color: #a7f3d0;
}
.search-input-modern:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.action-button {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border: none !important;
    border-radius: 10px !important;
    box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3) !important;
    transition: all 0.3s ease !important;
    white-space: nowrap;
}
.action-button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4) !important;
    background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
}

.transfer-button {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
    border: none !important;
    border-radius: 10px !important;
    box-shadow: 0 3px 10px rgba(59, 130, 246, 0.3) !important;
    transition: all 0.3s ease !important;
    white-space: nowrap;
}
.transfer-button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 5px 15px rgba(59, 130, 246, 0.4) !important;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
}

/* ============ INLINE ADD FORM ============ */
.add-movement-form {
    padding: 1.25rem 1.5rem;
    background: var(--surface-50, var(--surface-ground));
    border-bottom: 1px solid var(--surface-border);
    animation: fadeIn 0.15s ease-out;
}
.add-form-title {
    margin: 0 0 1rem 0;
    font-weight: 700;
    color: var(--text-color);
    display: flex;
    align-items: center;
}
.add-form-title i {
    color: #10b981;
}

.slide-down-enter-active,
.slide-down-leave-active {
    transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}

/* ============ DATATABLE ============ */
.modern-datatable {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--surface-border);
}
:deep(.modern-datatable .p-datatable-thead > tr > th) {
    background: var(--surface-section);
    color: var(--text-color);
    font-weight: 700;
    border: none;
    padding: 1rem;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
:deep(.modern-datatable .p-datatable-tbody > tr) {
    transition: background-color 0.2s ease;
}
:deep(.modern-datatable .p-datatable-tbody > tr:hover) {
    background-color: color-mix(in srgb, var(--green-50) 60%, var(--surface-card)) !important;
}
:deep(.editable-cells .p-datatable-tbody > tr > td) {
    cursor: pointer;
}
:deep(.editable-cells .p-datatable-tbody > tr > td:hover) {
    background-color: var(--highlight-bg, var(--surface-100));
    outline: 1px solid var(--green-300);
    outline-offset: -1px;
}
:deep(.editable-cells .p-datatable-tbody > tr > td.p-cell-editing) {
    padding: 0.1rem 0.25rem;
}

/* ============================================================================
   EMPTY STATE
   ============================================================================ */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    animation: fadeIn 0.4s ease-out;
}
.empty-icon-wrapper {
    width: 80px;
    height: 80px;
    border-radius: 20px;
    background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%);
    border: 2px solid #a7f3d0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.12);
}
.empty-icon-wrapper i {
    font-size: 2.25rem;
    color: #10b981;
}
.empty-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
}
.empty-subtitle {
    font-size: 0.9rem;
    color: var(--text-color-secondary);
    margin: 0;
    max-width: 360px;
    line-height: 1.6;
}
:global(.dark) .empty-icon-wrapper {
    background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
    border-color: #047857;
}

.amount-in {
    color: #10b981;
    font-weight: 700;
}
.amount-out {
    color: #ef4444;
    font-weight: 700;
}

.category-tag {
    background: color-mix(in srgb, var(--green-100) 50%, transparent);
    color: #047857;
    padding: 0.15rem 0.5rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    border: 1px solid var(--green-200);
}

/* ============================================================================
   EXCEL GRID STYLES
   ============================================================================ */

/* New row highlight */
:deep(.excel-grid .row-new > td) {
    background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%) !important;
    border-left: 3px solid #10b981 !important;
}
:deep(.excel-grid .row-new > td:first-child) {
    border-left: 3px solid #10b981 !important;
}

/* Editing row highlight */
:deep(.excel-grid .row-editing > td) {
    background: color-mix(in srgb, var(--green-50) 30%, var(--surface-card)) !important;
}
:global(.dark) :deep(.excel-grid .row-new > td) {
    background: linear-gradient(135deg, #064e3b22 0%, #065f4622 100%) !important;
}

/* Cell inputs — transparent, full width, no border when idle */
:deep(.cell-input) {
    width: 100% !important;
    border: 1px solid transparent !important;
    background: transparent !important;
    border-radius: 4px !important;
    padding: 0.3rem 0.4rem !important;
    font-size: 0.85rem !important;
    transition:
        border-color 0.15s,
        background 0.15s !important;
}
:deep(.cell-input:focus) {
    border-color: #10b981 !important;
    background: var(--surface-card) !important;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15) !important;
    outline: none !important;
}

:deep(.cell-dropdown) {
    width: 100% !important;
}
:deep(.cell-dropdown .p-inputtext) {
    font-size: 0.85rem !important;
    padding: 0.3rem 0.5rem !important;
}

:deep(.cell-number) {
    width: 100% !important;
}
:deep(.cell-number .p-inputtext) {
    font-size: 0.85rem !important;
    padding: 0.3rem 0.5rem !important;
    text-align: right !important;
}

/* Row action buttons */
.row-actions,
.row-save-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
}

.row-edit-btn {
    width: 28px !important;
    height: 28px !important;
    color: var(--text-color-secondary) !important;
    opacity: 0.3;
    transition:
        opacity 0.2s,
        color 0.2s !important;
}
:deep(.excel-grid tr:hover) .row-edit-btn {
    opacity: 1 !important;
}
.row-edit-btn:hover {
    color: #10b981 !important;
    opacity: 1 !important;
}

.row-save-btn {
    width: 28px !important;
    height: 28px !important;
    background: #10b981 !important;
    color: white !important;
    border: none !important;
    transition: background 0.2s !important;
}
.row-save-btn:hover {
    background: #059669 !important;
}

.row-cancel-btn {
    width: 28px !important;
    height: 28px !important;
    color: #ef4444 !important;
    transition: background 0.2s !important;
}
.row-cancel-btn:hover {
    background: #fef2f2 !important;
}

/* Row cell padding in excel grid */
:deep(.excel-grid .p-datatable-tbody > tr > td) {
    padding: 0.45rem 0.6rem !important;
    vertical-align: middle;
}

/* Required text placeholder */
.text-required {
    font-size: 0.78rem;
    color: #f59e0b;
    font-style: italic;
    font-weight: 500;
}

/* Direction tag compact */
.direction-tag {
    font-size: 0.75rem !important;
    padding: 0.1rem 0.45rem !important;
}

/* Date styling for new rows */
.date-new {
    font-weight: 600;
    color: #059669;
}

/* ============================================================================
   TRANSFER DIALOG STYLES
   ============================================================================ */
:deep(.transfer-dialog .p-dialog-header) {
    padding: 1.5rem 1.5rem 0 1.5rem;
    border-bottom: none;
}
:deep(.transfer-dialog .p-dialog-content) {
    padding: 0;
}
:deep(.transfer-dialog .p-dialog-footer) {
    padding: 0;
    border-top: 1px solid var(--surface-border);
}

.dialog-header {
    display: flex;
    align-items: center;
    gap: 1rem;
}
.dialog-header-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
    flex-shrink: 0;
}
.dialog-header-icon i {
    font-size: 1.5rem;
    color: #fff;
}

/* Transfer icon — blue/indigo gradient */
.transfer-icon {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%) !important;
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3) !important;
}

.dialog-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 0.15rem 0;
}
.dialog-subtitle {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    margin: 0;
}

.dialog-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* Accounts row with arrow */
.transfer-accounts-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
}
.transfer-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    margin-top: 1.8rem;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    border-radius: 50%;
    box-shadow: 0 3px 10px rgba(99, 102, 241, 0.3);
}
.transfer-arrow i {
    font-size: 0.9rem;
    color: white;
}

/* Same account warning */
.same-account-alert {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.65rem 1rem;
    background: #fff7ed;
    border: 1px solid #fdba74;
    border-radius: 8px;
    color: #c2410c;
    font-size: 0.82rem;
    font-weight: 500;
    animation: fadeIn 0.2s ease;
}
:global(.dark) .same-account-alert {
    background: #431407;
    border-color: #9a3412;
    color: #fb923c;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.form-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    display: flex;
    align-items: center;
    gap: 0.35rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.form-label-icon {
    font-size: 0.75rem;
    color: #10b981;
}
.required-star {
    color: #ef4444;
    font-weight: 700;
}

.form-input {
    width: 100%;
    border-radius: 8px;
    transition: all 0.2s ease;
}
:deep(.form-input:focus) {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12) !important;
}

.form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.section-divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.25rem 0;
}
.section-divider::before,
.section-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--surface-border);
}
.section-divider-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.optional-tag {
    background: var(--surface-100);
    color: var(--text-color-secondary);
    font-size: 0.68rem;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    font-weight: 500;
    border: 1px solid var(--surface-border);
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
}
.dialog-cancel-btn {
    color: var(--text-color-secondary) !important;
    border-radius: 8px !important;
}
.dialog-transfer-btn {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
    border: none !important;
    border-radius: 8px !important;
    box-shadow: 0 3px 10px rgba(99, 102, 241, 0.3) !important;
    transition: all 0.2s ease !important;
    font-weight: 600 !important;
}
.dialog-transfer-btn:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 5px 14px rgba(99, 102, 241, 0.4) !important;
    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%) !important;
}

/* ============================================================================
   CATEGORY / DIRECTION VALIDATION STYLES
   ============================================================================ */

/* Category body: name + I/E/M badge inline */
.category-body {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

/* Small I/E/M badge */
.cat-type-badge {
    font-size: 0.65rem !important;
    padding: 0.05rem 0.35rem !important;
    font-weight: 700 !important;
    min-width: 1.4rem;
    text-align: center;
}

/* Category option row in dropdown */
.category-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
}

/* Direction cell: tag + lock icon */
.direction-cell {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.direction-lock-icon {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    opacity: 0.6;
}

/* Direction editor: dropdown + lock hint */
.direction-editor {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
}
.direction-locked-hint {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    flex-shrink: 0;
}

/* Disabled direction dropdown visual */
:deep(.cell-dropdown.p-disabled) {
    opacity: 0.65;
    cursor: not-allowed;
    background: var(--surface-ground) !important;
}

/* ============================================================================
   BENEFICIARY COLUMN STYLES
   ============================================================================ */

.beneficiary-cell {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.beneficiary-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
}

.beneficiary-icon {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    flex-shrink: 0;
    width: 14px;
    text-align: center;
}
</style>
