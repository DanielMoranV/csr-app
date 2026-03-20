<script setup>
import { TreasuryService } from '@/service/TreasuryService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();

const counterparties = ref([]);
const loading = ref(true);
const counterpartyDialog = ref(false);
const deleteCounterpartyDialog = ref(false);
const counterparty = ref({});
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);

const types = ref([
    { label: 'Proveedor', value: 'Proveedor' },
    { label: 'Cliente', value: 'Cliente' },
    { label: 'Empleado', value: 'Empleado' },
    { label: 'Honorarios', value: 'Honorarios' },
    { label: 'Otro', value: 'Otro' }
]);

const typeSeverity = {
    Proveedor: 'info',
    Cliente: 'success',
    Empleado: 'warning',
    Honorarios: 'danger',
    Otro: 'secondary'
};

const loadCounterparties = async () => {
    loading.value = true;
    try {
        const response = await TreasuryService.getCounterparties();
        counterparties.value = response.data.data || response.data;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las contrapartes', life: 3000 });
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadCounterparties();
});

const openNew = () => {
    counterparty.value = { name: '', document_number: '', type: 'Proveedor' };
    submitted.value = false;
    counterpartyDialog.value = true;
};

const hideDialog = () => {
    counterpartyDialog.value = false;
    submitted.value = false;
};

const editCounterparty = (c) => {
    counterparty.value = { ...c };
    counterpartyDialog.value = true;
};

const saveCounterparty = async () => {
    submitted.value = true;
    if (counterparty.value.name.trim() && counterparty.value.document_number.trim() && counterparty.value.type) {
        try {
            if (counterparty.value.id) {
                await TreasuryService.updateCounterparty(counterparty.value.id, counterparty.value);
                toast.add({ severity: 'success', summary: 'Éxito', detail: 'Contraparte actualizada', life: 3000 });
            } else {
                await TreasuryService.createCounterparty(counterparty.value);
                toast.add({ severity: 'success', summary: 'Éxito', detail: 'Contraparte creada', life: 3000 });
            }
            hideDialog();
            loadCounterparties();
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la contraparte', life: 3000 });
        }
    }
};

const confirmDeleteCounterparty = (c) => {
    counterparty.value = c;
    deleteCounterpartyDialog.value = true;
};

const deleteCounterparty = async () => {
    try {
        await TreasuryService.deleteCounterparty(counterparty.value.id);
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Contraparte eliminada', life: 3000 });
        deleteCounterpartyDialog.value = false;
        loadCounterparties();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la contraparte', life: 3000 });
    }
};
</script>

<template>
    <div class="treasury-view">
        <div class="main-card">
            <!-- Hero Header -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-users"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Contrapartes / Terceros</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-briefcase mr-2"></i>
                        Gestión de proveedores, clientes y empleados
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
                        <span class="header-title-small">Registro de Contrapartes</span>
                        <span class="header-count" v-if="counterparties">{{ counterparties.length }} {{ counterparties.length === 1 ? 'contraparte' : 'contrapartes' }}</span>
                    </div>
                </div>
                <div class="header-actions-modern">
                    <IconField iconPosition="left" class="search-field">
                        <InputIcon>
                            <i class="pi pi-search" />
                        </InputIcon>
                        <InputText v-model="filters['global'].value" placeholder="Buscar contrapartes..." class="search-input-modern" />
                    </IconField>
                    <Button label="Nueva Contraparte" icon="pi pi-plus" class="action-button" @click="openNew" />
                </div>
            </div>

            <DataTable :value="counterparties" :paginator="true" :rows="10" dataKey="id" :filters="filters" :loading="loading" showGridlines responsiveLayout="scroll" :emptyMessage="undefined" class="modern-datatable">
                <template #empty>
                    <div class="empty-state">
                        <div class="empty-icon-wrapper">
                            <i class="pi pi-users"></i>
                        </div>
                        <h3 class="empty-title">Sin contrapartes registradas</h3>
                        <p class="empty-subtitle">No hay proveedores, clientes ni empleados registrados. Haz clic en <strong>Nueva Contraparte</strong> para agregar el primero.</p>
                    </div>
                </template>

                <Column field="name" header="Nombre / Razón Social" :sortable="true" style="min-width: 18rem">
                    <template #body="{ data }">
                        <div class="font-semibold">{{ data.name }}</div>
                    </template>
                </Column>
                <Column field="document_number" header="Nro. Documento" :sortable="true" style="min-width: 12rem">
                    <template #body="{ data }">
                        <span class="font-mono text-sm">{{ data.document_number }}</span>
                    </template>
                </Column>
                <Column field="type" header="Tipo" :sortable="true" style="min-width: 10rem">
                    <template #body="{ data }">
                        <Tag :value="data.type" :severity="typeSeverity[data.type] || 'secondary'" />
                    </template>
                </Column>

                <Column header="Acciones" :exportable="false" style="min-width: 8rem">
                    <template #body="slotProps">
                        <div class="flex gap-2">
                            <Button icon="pi pi-pencil" class="p-button-rounded p-button-success p-button-sm" @click="editCounterparty(slotProps.data)" v-tooltip.top="'Editar'" />
                            <Button icon="pi pi-trash" class="p-button-rounded p-button-danger p-button-sm" @click="confirmDeleteCounterparty(slotProps.data)" v-tooltip.top="'Eliminar'" />
                        </div>
                    </template>
                </Column>
            </DataTable>

            <!-- Dialog Contraparte -->
            <Dialog v-model:visible="counterpartyDialog" :style="{ width: '500px' }" :modal="true" :closable="true" class="counterparty-dialog" @hide="hideDialog">
                <template #header>
                    <div class="dialog-header">
                        <div class="dialog-header-icon">
                            <i :class="counterparty.id ? 'pi pi-pencil' : 'pi pi-user-plus'"></i>
                        </div>
                        <div>
                            <h3 class="dialog-title">{{ counterparty.id ? 'Editar Contraparte' : 'Nueva Contraparte' }}</h3>
                            <p class="dialog-subtitle">{{ counterparty.id ? 'Modifica los datos del tercero' : 'Registra un proveedor, cliente o empleado' }}</p>
                        </div>
                    </div>
                </template>

                <div class="dialog-body">
                    <!-- Nombre / Razón Social -->
                    <div class="form-field">
                        <label class="form-label" for="cp_name">
                            <i class="pi pi-building form-label-icon"></i>
                            Nombre / Razón Social <span class="required-star">*</span>
                        </label>
                        <InputText id="cp_name" v-model.trim="counterparty.name" autofocus placeholder="Ej: Inversiones del Sur S.A.C." class="form-input" :class="{ 'p-invalid': submitted && !counterparty.name }" />
                        <small class="p-error" v-if="submitted && !counterparty.name"> <i class="pi pi-exclamation-circle mr-1"></i>El nombre es requerido. </small>
                    </div>

                    <!-- Tipo + Nro. Documento en grid -->
                    <div class="form-grid-2">
                        <div class="form-field">
                            <label class="form-label" for="cp_type">
                                <i class="pi pi-tag form-label-icon"></i>
                                Tipo <span class="required-star">*</span>
                            </label>
                            <Dropdown id="cp_type" v-model="counterparty.type" :options="types" optionLabel="label" optionValue="value" placeholder="Seleccionar tipo" class="w-full" :class="{ 'p-invalid': submitted && !counterparty.type }" />
                            <small class="p-error" v-if="submitted && !counterparty.type">Requerido.</small>
                        </div>
                        <div class="form-field">
                            <label class="form-label" for="cp_document">
                                <i class="pi pi-id-card form-label-icon"></i>
                                Nro. Documento <span class="required-star">*</span>
                            </label>
                            <InputText id="cp_document" v-model.trim="counterparty.document_number" placeholder="Ej: 20601234567" class="form-input font-mono" :class="{ 'p-invalid': submitted && !counterparty.document_number }" />
                            <small class="p-error" v-if="submitted && !counterparty.document_number">Requerido.</small>
                        </div>
                    </div>

                    <!-- Preview del tipo seleccionado -->
                    <div v-if="counterparty.type" class="type-preview">
                        <Tag :value="counterparty.type" :severity="typeSeverity[counterparty.type] || 'secondary'" />
                        <span class="type-preview-label">
                            {{
                                { Proveedor: 'Empresa o persona que provee bienes/servicios', Cliente: 'Empresa o individuo que compra o recibe servicios', Empleado: 'Persona vinculada laboralmente', Otro: 'Otro tipo de tercero' }[counterparty.type]
                            }}
                        </span>
                    </div>
                </div>

                <template #footer>
                    <div class="dialog-footer">
                        <Button label="Cancelar" icon="pi pi-times" class="dialog-cancel-btn" text @click="hideDialog" />
                        <Button :label="counterparty.id ? 'Actualizar' : 'Guardar Tercero'" icon="pi pi-check" class="dialog-save-btn" @click="saveCounterparty" />
                    </div>
                </template>
            </Dialog>

            <!-- Dialog Confirmación Eliminar -->
            <Dialog v-model:visible="deleteCounterpartyDialog" :style="{ width: '450px' }" header="Confirmar eliminación" :modal="true">
                <div class="flex align-items-center gap-3">
                    <i class="pi pi-exclamation-triangle text-orange-500" style="font-size: 2rem" />
                    <span v-if="counterparty"
                        >¿Estás seguro que deseas eliminar <b>{{ counterparty.name }}</b
                        >?</span
                    >
                </div>
                <template #footer>
                    <Button label="No" icon="pi pi-times" class="p-button-text" @click="deleteCounterpartyDialog = false" />
                    <Button label="Sí, eliminar" icon="pi pi-check" severity="danger" @click="deleteCounterparty" />
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
}
.search-field {
    width: 280px;
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

/* ============================================================================
   DIALOG STYLES
   ============================================================================ */
:deep(.counterparty-dialog .p-dialog-header) {
    padding: 1.5rem 1.5rem 0 1.5rem;
    border-bottom: none;
}
:deep(.counterparty-dialog .p-dialog-content) {
    padding: 0;
}
:deep(.counterparty-dialog .p-dialog-footer) {
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
    font-size: 1.6rem;
    color: #fff;
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
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12) !important;
}

.form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

/* Preview del tipo */
.type-preview {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    border-radius: 10px;
    border-left: 3px solid #10b981;
    animation: fadeIn 0.2s ease;
}
.type-preview-label {
    font-size: 0.82rem;
    color: var(--text-color-secondary);
    line-height: 1.4;
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
.dialog-save-btn {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border: none !important;
    border-radius: 8px !important;
    box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3) !important;
    transition: all 0.2s ease !important;
    font-weight: 600 !important;
}
.dialog-save-btn:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 5px 14px rgba(16, 185, 129, 0.4) !important;
    background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
}
</style>
