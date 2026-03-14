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
const deleteAccountDialog = ref(false);
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

const editAccount = (a) => {
    account.value = { ...a, bank_id: a.bank_id ?? a.bank?.id };
    submitted.value = false;
    accountDialog.value = true;
};

const confirmDeleteAccount = (a) => {
    account.value = a;
    deleteAccountDialog.value = true;
};

const deleteAccount = async () => {
    try {
        await TreasuryService.deleteBankAccount(account.value.id);
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Cuenta eliminada', life: 3000 });
        deleteAccountDialog.value = false;
        loadData();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la cuenta', life: 3000 });
    }
};

const hideDialog = () => {
    accountDialog.value = false;
    submitted.value = false;
};

const saveAccount = async () => {
    submitted.value = true;
    if (account.value.account_number && account.value.bank_id && account.value.cci && account.value.description) {
        try {
            if (account.value.id) {
                await TreasuryService.updateBankAccount(account.value.id, account.value);
                toast.add({ severity: 'success', summary: 'Éxito', detail: 'Cuenta actualizada correctamente', life: 3000 });
            } else {
                await TreasuryService.createBankAccount(account.value);
                toast.add({ severity: 'success', summary: 'Éxito', detail: 'Cuenta bancaria creada', life: 3000 });
            }
            hideDialog();
            loadData();
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la cuenta', life: 3000 });
        }
    }
};

const formatCurrency = (value, currency) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: currency || 'PEN' }).format(value);
};
</script>

<template>
    <div class="treasury-view">
        <div class="main-card">
            <!-- Hero Header -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-credit-card"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Cuentas Bancarias</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-wallet mr-2"></i>
                        Administración de cuentas y saldos bancarios
                    </p>
                </div>
            </div>

            <!-- Table Header -->
            <div class="table-header-modern">
                <div class="header-left">
                    <div class="header-icon-badge">
                        <i class="pi pi-table"></i>
                    </div>
                    <div class="header-info">
                        <span class="header-title-small">Registro de Cuentas</span>
                        <span class="header-count" v-if="bankAccounts">{{ bankAccounts.length }} {{ bankAccounts.length === 1 ? 'cuenta' : 'cuentas' }}</span>
                    </div>
                </div>
                <div class="header-actions-modern">
                    <IconField iconPosition="left" class="search-field">
                        <InputIcon>
                            <i class="pi pi-search" />
                        </InputIcon>
                        <InputText v-model="filters['global'].value" placeholder="Buscar cuentas..." class="search-input-modern" />
                    </IconField>
                    <Button label="Nueva Cuenta" icon="pi pi-plus" class="action-button" @click="openNew" />
                </div>
            </div>

            <DataTable
                :value="bankAccounts"
                :paginator="true"
                :rows="10"
                dataKey="id"
                :filters="filters"
                :loading="loading"
                showGridlines
                responsiveLayout="scroll"
                :emptyMessage="undefined"
                class="modern-datatable"
            >
                <template #empty>
                    <div class="empty-state">
                        <div class="empty-icon-wrapper">
                            <i class="pi pi-credit-card"></i>
                        </div>
                        <h3 class="empty-title">Sin cuentas bancarias registradas</h3>
                        <p class="empty-subtitle">No hay cuentas bancarias configuradas. Haz clic en <strong>Nueva Cuenta</strong> para agregar una.</p>
                    </div>
                </template>

                <Column field="bank.name" header="Banco" :sortable="true" style="min-width: 12rem">
                    <template #body="{ data }">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-building text-green-500"></i>
                            <span class="font-semibold">{{ data.bank?.name }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="description" header="Descripción" :sortable="true" style="min-width: 14rem"></Column>
                <Column field="account_number" header="Número Cuenta" :sortable="true" style="min-width: 12rem">
                    <template #body="{ data }">
                        <span class="font-mono text-sm">{{ data.account_number }}</span>
                    </template>
                </Column>
                <Column field="currency" header="Moneda" :sortable="true" style="min-width: 8rem">
                    <template #body="{ data }">
                        <Tag :value="data.currency" :severity="data.currency === 'USD' ? 'info' : 'success'" />
                    </template>
                </Column>
                <Column field="balance" header="Saldo Actual" :sortable="true" style="min-width: 12rem; text-align: right">
                    <template #body="slotProps">
                        <span :class="{ 'text-green-500 font-bold': slotProps.data.balance > 0, 'text-red-500 font-bold': slotProps.data.balance < 0, 'text-gray-500': slotProps.data.balance === 0 }">
                            {{ formatCurrency(slotProps.data.balance, slotProps.data.currency) }}
                        </span>
                    </template>
                </Column>
                <Column field="is_active" header="Estado" :sortable="true" style="min-width: 8rem">
                    <template #body="slotProps">
                        <Tag :severity="slotProps.data.is_active ? 'success' : 'danger'" :value="slotProps.data.is_active ? 'Activa' : 'Inactiva'" />
                    </template>
                </Column>

                <Column header="Acciones" :exportable="false" style="min-width: 10rem">
                    <template #body="slotProps">
                        <div class="action-buttons">
                            <Button icon="pi pi-pencil" rounded severity="warning" size="small" @click="editAccount(slotProps.data)" v-tooltip.top="'Editar cuenta'" />
                            <Button icon="pi pi-trash" rounded severity="danger" size="small" @click="confirmDeleteAccount(slotProps.data)" v-tooltip.top="'Eliminar cuenta'" />
                        </div>
                    </template>
                </Column>
            </DataTable>

            <!-- Dialog Nueva Cuenta Bancaria -->
            <Dialog v-model:visible="accountDialog" :style="{ width: '560px' }" :modal="true" :closable="true" class="account-dialog" @hide="hideDialog">
                <template #header>
                    <div class="dialog-header">
                        <div class="dialog-header-icon">
                            <i class="pi pi-credit-card"></i>
                        </div>
                        <div>
                            <h3 class="dialog-title">{{ account.id ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria' }}</h3>
                            <p class="dialog-subtitle">{{ account.id ? 'Modifique los datos de la cuenta' : 'Configure los datos de la cuenta' }}</p>
                        </div>
                    </div>
                </template>

                <div class="dialog-body">
                    <!-- Banco -->
                    <div class="form-field">
                        <label class="form-label" for="bank_id">
                            <i class="pi pi-building form-label-icon"></i>
                            Banco <span class="required-star">*</span>
                        </label>
                        <Dropdown
                            id="bank_id"
                            v-model="account.bank_id"
                            :options="banks"
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Seleccione una entidad bancaria"
                            filter
                            :class="['w-full', { 'p-invalid': submitted && !account.bank_id }]"
                        />
                        <small class="p-error" v-if="submitted && !account.bank_id">
                            <i class="pi pi-exclamation-circle mr-1"></i>El banco es requerido.
                        </small>
                    </div>

                    <!-- Descripción -->
                    <div class="form-field">
                        <label class="form-label" for="description">
                            <i class="pi pi-pencil form-label-icon"></i>
                            Descripción Interna <span class="required-star">*</span>
                        </label>
                        <InputText
                            id="description"
                            v-model.trim="account.description"
                            placeholder="Ej: Cuenta Principal Soles"
                            class="form-input"
                            :class="{ 'p-invalid': submitted && !account.description }"
                        />
                        <small class="p-error" v-if="submitted && !account.description">
                            <i class="pi pi-exclamation-circle mr-1"></i>La descripción es requerida.
                        </small>
                    </div>

                    <!-- Separador: Identificadores -->
                    <div class="section-divider">
                        <span class="section-divider-label">
                            <i class="pi pi-hashtag mr-1"></i>Identificadores de Cuenta
                        </span>
                    </div>

                    <!-- Nro Cuenta + CCI -->
                    <div class="form-grid-2">
                        <div class="form-field">
                            <label class="form-label" for="account_number">
                                <i class="pi pi-list-check form-label-icon"></i>
                                Nº de Cuenta <span class="required-star">*</span>
                            </label>
                            <InputText
                                id="account_number"
                                v-model.trim="account.account_number"
                                placeholder="Ej: 19120456789078"
                                class="form-input font-mono"
                                :class="{ 'p-invalid': submitted && !account.account_number }"
                            />
                            <small class="p-error" v-if="submitted && !account.account_number">Requerido.</small>
                        </div>
                        <div class="form-field">
                            <label class="form-label" for="cci">
                                <i class="pi pi-barcode form-label-icon"></i>
                                Código CCI <span class="required-star">*</span>
                            </label>
                            <InputText
                                id="cci"
                                v-model.trim="account.cci"
                                placeholder="Ej: 00219100456789078015"
                                class="form-input font-mono"
                                :class="{ 'p-invalid': submitted && !account.cci }"
                            />
                            <small class="p-error" v-if="submitted && !account.cci">Requerido.</small>
                        </div>
                    </div>

                    <!-- Separador: Configuración -->
                    <div class="section-divider">
                        <span class="section-divider-label">
                            <i class="pi pi-sliders-h mr-1"></i>Configuración
                        </span>
                    </div>

                    <!-- Moneda + Tipo -->
                    <div class="form-grid-2">
                        <div class="form-field">
                            <label class="form-label" for="currency">
                                <i class="pi pi-dollar form-label-icon"></i>
                                Moneda
                            </label>
                            <Dropdown
                                id="currency"
                                v-model="account.currency"
                                :options="currencies"
                                optionLabel="label"
                                optionValue="value"
                                class="w-full"
                            />
                        </div>
                        <div class="form-field">
                            <label class="form-label" for="account_type">
                                <i class="pi pi-folder form-label-icon"></i>
                                Tipo de Cuenta
                            </label>
                            <Dropdown
                                id="account_type"
                                v-model="account.account_type"
                                :options="accountTypes"
                                optionLabel="label"
                                optionValue="value"
                                class="w-full"
                            />
                        </div>
                    </div>

                    <!-- Saldo Inicial + Estado -->
                    <div class="form-grid-2">
                        <div class="form-field">
                            <label class="form-label" for="initial_balance">
                                <i class="pi pi-wallet form-label-icon"></i>
                                Saldo Inicial
                            </label>
                            <InputNumber
                                id="initial_balance"
                                v-model="account.initial_balance"
                                mode="currency"
                                :currency="account.currency === 'USD' ? 'USD' : 'PEN'"
                                locale="es-PE"
                                class="w-full"
                                :disabled="!!account.id"
                            />
                            <small class="hint-text" v-if="!account.id">
                                <i class="pi pi-info-circle mr-1"></i>Solo se puede establecer al crear.
                            </small>
                            <small class="hint-text" v-else>
                                <i class="pi pi-lock mr-1"></i>El saldo inicial no es editable.
                            </small>
                        </div>
                        <div class="form-field">
                            <label class="form-label">
                                <i class="pi pi-shield form-label-icon"></i>
                                Estado
                            </label>
                            <div class="status-toggle">
                                <Checkbox id="is_active_acc" v-model="account.is_active" :binary="true" />
                                <label for="is_active_acc" class="status-label">
                                    <Tag :value="account.is_active ? 'Activa' : 'Inactiva'" :severity="account.is_active ? 'success' : 'danger'" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <div class="dialog-footer">
                        <Button label="Cancelar" icon="pi pi-times" class="dialog-cancel-btn" text @click="hideDialog" />
                        <Button :label="account.id ? 'Actualizar Cuenta' : 'Guardar Cuenta'" icon="pi pi-check" class="dialog-save-btn" @click="saveAccount" />
                    </div>
                </template>
            </Dialog>

            <!-- Dialog Eliminar Cuenta -->
            <Dialog v-model:visible="deleteAccountDialog" :style="{ width: '450px' }" header="Confirmar eliminación" :modal="true">
                <div class="flex align-items-center gap-3">
                    <i class="pi pi-exclamation-triangle text-orange-500" style="font-size: 2rem" />
                    <span v-if="account">¿Estás seguro que deseas eliminar la cuenta <b>{{ account.description }}</b>?</span>
                </div>
                <template #footer>
                    <Button label="No" icon="pi pi-times" class="p-button-text" @click="deleteAccountDialog = false" />
                    <Button label="Sí, eliminar" icon="pi pi-check" severity="danger" @click="deleteAccount" />
                </template>
            </Dialog>
        </div>
    </div>
</template>

<style scoped>
@keyframes shimmer {
    0%, 100% { transform: translateX(-100%) rotate(45deg); }
    50% { transform: translateX(100%) rotate(45deg); }
}
@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}
@keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes iconPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(16,185,129,0.3), 0 2px 8px rgba(5,150,105,0.2); }
    50% { transform: scale(1.05); box-shadow: 0 6px 16px rgba(16,185,129,0.4), 0 3px 10px rgba(5,150,105,0.3); }
}

.treasury-view { padding: 1rem; animation: fadeIn 0.5s ease-out; }

.main-card {
    background: linear-gradient(145deg, var(--surface-section), var(--surface-card));
    border: 1px solid var(--surface-border);
    border-radius: 16px; padding: 2rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    position: relative; overflow: hidden;
}
.main-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #10b981, #059669, #10b981, #047857);
    background-size: 200% 100%; animation: gradientShift 3s ease infinite;
}
:global(.dark) .main-card { background: linear-gradient(145deg, #1e293b, #0f172a); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }

.header-section { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; }

.header-icon-wrapper {
    width: 64px; height: 64px; border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    box-shadow: 0 8px 20px rgba(16,185,129,0.3), 0 4px 12px rgba(5,150,105,0.4);
    animation: pulse 2s ease-in-out infinite;
    position: relative; overflow: hidden;
}
.header-icon-wrapper::before {
    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
    background: linear-gradient(135deg, transparent, rgba(255,255,255,0.2), transparent);
    animation: shimmer 3s infinite;
}
.header-icon-wrapper i { font-size: 2rem; color: #ffffff; z-index: 1; }

.header-content { flex: 1; }
.header-title {
    font-size: 1.75rem; font-weight: 700; margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.header-subtitle { color: var(--text-color-secondary); font-size: 1rem; display: flex; align-items: center; margin: 0; }

.table-header-modern {
    display: flex; justify-content: space-between; align-items: center;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, var(--surface-section) 0%, var(--surface-card) 100%);
    border-bottom: 2px solid color-mix(in srgb, var(--green-500) 20%, var(--surface-border));
    gap: 1rem; position: relative;
}
.table-header-modern::after {
    content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #10b981, #059669, #10b981);
    background-size: 200% 100%; animation: gradientShift 3s ease infinite;
}

.header-left { display: flex; align-items: center; gap: 1rem; }
.header-icon-badge {
    width: 48px; height: 48px; border-radius: 12px;
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(16,185,129,0.3), 0 2px 8px rgba(5,150,105,0.2);
    position: relative; overflow: hidden;
    animation: iconPulse 2s ease-in-out infinite;
}
.header-icon-badge::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
    animation: shimmer 3s ease-in-out infinite;
}
.header-icon-badge i { font-size: 1.5rem; color: white; position: relative; z-index: 1; }

.header-info { display: flex; flex-direction: column; gap: 0.25rem; }
.header-title-small { font-size: 1.125rem; font-weight: 700; color: var(--text-color); }
.header-count {
    font-size: 0.813rem; font-weight: 600; color: #059669;
    background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%);
    padding: 0.188rem 0.625rem; border-radius: 6px;
    display: inline-block; width: fit-content;
    border: 1px solid #6ee7b7; box-shadow: 0 2px 4px rgba(16,185,129,0.1);
}

.header-actions-modern { display: flex; gap: 0.75rem; align-items: center; }
.search-field { width: 280px; }
.search-input-modern {
    border-radius: 10px; border: 2px solid var(--surface-border);
    padding: 0.625rem 0.875rem 0.625rem 2.5rem;
    font-size: 0.875rem; transition: all 0.3s ease;
    background: var(--surface-ground); color: var(--text-color);
}
.search-input-modern:hover { border-color: #a7f3d0; }
.search-input-modern:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }

.action-button {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border: none !important; border-radius: 10px !important;
    box-shadow: 0 3px 10px rgba(16,185,129,0.3) !important;
    transition: all 0.3s ease !important; white-space: nowrap;
}
.action-button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 5px 15px rgba(16,185,129,0.4) !important;
    background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
}

/* ============================================================================
   EMPTY STATE
   ============================================================================ */
.empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 4rem 2rem; text-align: center; animation: fadeIn 0.4s ease-out;
}
.empty-icon-wrapper {
    width: 80px; height: 80px; border-radius: 20px;
    background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%);
    border: 2px solid #a7f3d0;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1.25rem;
    box-shadow: 0 8px 20px rgba(16,185,129,0.12);
}
.empty-icon-wrapper i { font-size: 2.25rem; color: #10b981; }
.empty-title { font-size: 1.2rem; font-weight: 700; color: var(--text-color); margin: 0 0 0.5rem 0; }
.empty-subtitle { font-size: 0.9rem; color: var(--text-color-secondary); margin: 0; max-width: 360px; line-height: 1.6; }
:global(.dark) .empty-icon-wrapper { background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); border-color: #047857; }

.modern-datatable { border-radius: 12px; overflow: hidden; border: 1px solid var(--surface-border); }
:deep(.modern-datatable .p-datatable-thead > tr > th) {
    background: var(--surface-section); color: var(--text-color);
    font-weight: 700; border: none; padding: 1rem;
    font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em;
}
:deep(.modern-datatable .p-datatable-tbody > tr) { transition: background-color 0.2s ease; }
:deep(.modern-datatable .p-datatable-tbody > tr:hover) {
    background-color: color-mix(in srgb, var(--green-50) 60%, var(--surface-card)) !important;
}

/* ============================================================================
   DIALOG STYLES
   ============================================================================ */
:deep(.account-dialog .p-dialog-header) { padding: 1.5rem 1.5rem 0 1.5rem; border-bottom: none; }
:deep(.account-dialog .p-dialog-content) { padding: 0; }
:deep(.account-dialog .p-dialog-footer) { padding: 0; border-top: 1px solid var(--surface-border); }

.dialog-header { display: flex; align-items: center; gap: 1rem; }
.dialog-header-icon {
    width: 52px; height: 52px; border-radius: 14px;
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 16px rgba(16,185,129,0.3); flex-shrink: 0;
}
.dialog-header-icon i { font-size: 1.6rem; color: #fff; }
.dialog-title { font-size: 1.2rem; font-weight: 700; color: var(--text-color); margin: 0 0 0.15rem 0; }
.dialog-subtitle { font-size: 0.8rem; color: var(--text-color-secondary); margin: 0; }

.dialog-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

.form-field { display: flex; flex-direction: column; gap: 0.4rem; }
.form-label {
    font-size: 0.8rem; font-weight: 600; color: var(--text-color-secondary);
    display: flex; align-items: center; gap: 0.35rem;
    text-transform: uppercase; letter-spacing: 0.04em;
}
.form-label-icon { font-size: 0.75rem; color: #10b981; }
.required-star { color: #ef4444; font-weight: 700; }
.hint-text { font-size: 0.78rem; color: var(--text-color-secondary); display: flex; align-items: center; }

.form-input { width: 100%; border-radius: 8px; transition: all 0.2s ease; }
:deep(.form-input:focus) { border-color: #10b981 !important; box-shadow: 0 0 0 3px rgba(16,185,129,0.12) !important; }

.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.section-divider { display: flex; align-items: center; gap: 0.75rem; margin: 0.25rem 0; }
.section-divider::before, .section-divider::after { content: ''; flex: 1; height: 1px; background: var(--surface-border); }
.section-divider-label {
    font-size: 0.75rem; font-weight: 600; color: var(--text-color-secondary);
    white-space: nowrap; display: flex; align-items: center; gap: 0.4rem;
}

.status-toggle {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.6rem 0.875rem;
    background: var(--surface-ground); border: 1px solid var(--surface-border);
    border-radius: 8px; cursor: pointer; transition: border-color 0.2s;
}
.status-toggle:hover { border-color: #10b981; }
.status-label { cursor: pointer; }

.dialog-footer { display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem; }
.dialog-cancel-btn { color: var(--text-color-secondary) !important; border-radius: 8px !important; }
.dialog-save-btn {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border: none !important; border-radius: 8px !important;
    box-shadow: 0 3px 10px rgba(16,185,129,0.3) !important;
    transition: all 0.2s ease !important; font-weight: 600 !important;
}
.dialog-save-btn:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 5px 14px rgba(16,185,129,0.4) !important;
    background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}
</style>
