<script setup>
import { useBoletas } from '@/composables/useBoletas';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import ConfirmDialog from 'primevue/confirmdialog';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { onMounted, ref } from 'vue';

const { canManage, employees, isLoadingEmployees, isSavingEmployee, isDeletingEmployee, fetchEmployees, createEmployee, updateEmployee, deleteEmployee } = useBoletas();
const confirm = useConfirm();

// ── Filtros ──────────────────────────────────────────────────────────────────
const search = ref('');
const activeFilter = ref(null);
const activeOptions = [
    { label: 'Todos', value: null },
    { label: 'Activos', value: 1 },
    { label: 'Inactivos', value: 0 }
];

const loadEmployees = async () => {
    try {
        await fetchEmployees({ q: search.value, active: activeFilter.value });
    } catch {
        // notificado por el composable
    }
};

onMounted(loadEmployees);

// ── Editor (crear / editar) ──────────────────────────────────────────────────
const dialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const form = ref({ dni: '', full_name: '', email: '', area: '', is_active: true });
const errors = ref({});

const resetForm = () => {
    form.value = { dni: '', full_name: '', email: '', area: '', is_active: true };
    errors.value = {};
};

const openNew = () => {
    isEditing.value = false;
    editingId.value = null;
    resetForm();
    dialogVisible.value = true;
};

const openEdit = (emp) => {
    isEditing.value = true;
    editingId.value = emp.id;
    // El backend devuelve `nombre`; el formulario (input) usa `full_name`.
    form.value = {
        dni: emp.dni || '',
        full_name: emp.nombre || emp.full_name || '',
        email: emp.email || '',
        area: emp.area || '',
        is_active: emp.is_active === undefined ? true : !!emp.is_active
    };
    errors.value = {};
    dialogVisible.value = true;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = () => {
    errors.value = {};
    if (!/^\d{8}$/.test(String(form.value.dni).trim())) errors.value.dni = 'El DNI debe tener 8 dígitos';
    if (!form.value.full_name.trim()) errors.value.full_name = 'El nombre es obligatorio';
    if (!EMAIL_RE.test(form.value.email.trim())) errors.value.email = 'Email no válido';
    return Object.keys(errors.value).length === 0;
};

const handleSave = async () => {
    if (!validate()) return;
    const payload = {
        dni: String(form.value.dni).trim(),
        full_name: form.value.full_name.trim(),
        email: form.value.email.trim(),
        area: form.value.area.trim() || null,
        is_active: form.value.is_active
    };
    try {
        if (isEditing.value) {
            await updateEmployee(editingId.value, payload);
        } else {
            await createEmployee(payload);
        }
        dialogVisible.value = false;
        resetForm();
    } catch (error) {
        // Mapear errores de validación del backend (422) a los campos del form.
        if (error?.status === 422 && error?.errors && typeof error.errors === 'object') {
            const mapped = {};
            Object.entries(error.errors).forEach(([field, msgs]) => {
                const key = field === 'full_name' ? 'full_name' : field;
                mapped[key] = Array.isArray(msgs) ? msgs[0] : String(msgs);
            });
            errors.value = { ...errors.value, ...mapped };
        }
    }
};

const confirmDelete = (emp) => {
    confirm.require({
        message: `¿Eliminar al empleado "${emp.nombre || emp.full_name}" (DNI ${emp.dni})?`,
        header: 'Confirmar eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await deleteEmployee(emp.id);
            } catch {
                // El composable muestra el motivo (p. ej. usuario vinculado, 422).
            }
        }
    });
};
</script>

<template>
    <div class="boletas-view">
        <div class="main-card">
            <div class="header-section">
                <div class="header-icon-wrapper"><i class="pi pi-users"></i></div>
                <div class="header-content">
                    <h1 class="header-title">Padrón de empleados</h1>
                    <p class="header-subtitle"><i class="pi pi-info-circle mr-2"></i>Destinatarios para el envío masivo. El DNI conecta con el PDF del periodo.</p>
                </div>
                <div class="header-actions">
                    <Button v-if="canManage" label="Nuevo empleado" icon="pi pi-plus" @click="openNew" />
                </div>
            </div>

            <!-- Filtros -->
            <div class="filters-bar">
                <IconField class="flex-1">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="search" placeholder="Buscar por nombre, DNI o email…" class="w-full" @keyup.enter="loadEmployees" />
                </IconField>
                <Select v-model="activeFilter" :options="activeOptions" optionLabel="label" optionValue="value" class="w-44" @change="loadEmployees" />
                <Button label="Buscar" icon="pi pi-search" :loading="isLoadingEmployees" @click="loadEmployees" />
            </div>

            <DataTable
                :value="employees"
                :loading="isLoadingEmployees"
                responsiveLayout="scroll"
                stripedRows
                class="p-datatable-sm"
                :paginator="employees.length > 25"
                :rows="25"
                :rowsPerPageOptions="[25, 50, 100]"
                emptyMessage="No hay empleados para los filtros seleccionados."
            >
                <Column field="nombre" header="Nombre" :sortable="true" style="min-width: 220px">
                    <template #body="{ data }"
                        ><span class="font-semibold">{{ data.nombre || data.full_name }}</span></template
                    >
                </Column>
                <Column field="dni" header="DNI" :sortable="true" style="min-width: 120px">
                    <template #body="{ data }"
                        ><span class="mono">{{ data.dni }}</span></template
                    >
                </Column>
                <Column field="email" header="Email" style="min-width: 220px" />
                <Column field="area" header="Área" style="min-width: 150px">
                    <template #body="{ data }">{{ data.area || '—' }}</template>
                </Column>
                <Column header="Estado" style="min-width: 110px">
                    <template #body="{ data }">
                        <Tag :value="data.is_active ? 'Activo' : 'Inactivo'" :severity="data.is_active ? 'success' : 'secondary'" />
                    </template>
                </Column>
                <Column v-if="canManage" header="Acciones" style="min-width: 130px">
                    <template #body="{ data }">
                        <div class="flex gap-1">
                            <Button icon="pi pi-pencil" size="small" rounded severity="success" outlined v-tooltip.top="'Editar'" @click="openEdit(data)" />
                            <Button icon="pi pi-trash" size="small" rounded severity="danger" outlined v-tooltip.top="'Eliminar'" :loading="isDeletingEmployee" @click="confirmDelete(data)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Diálogo crear / editar -->
        <Dialog v-model:visible="dialogVisible" :header="isEditing ? 'Editar empleado' : 'Nuevo empleado'" :modal="true" :closable="!isSavingEmployee" class="w-full sm:w-[520px]" :style="{ maxWidth: '95vw' }">
            <div class="form-stack">
                <div class="field">
                    <label class="field-label">DNI <span class="req">*</span></label>
                    <InputText v-model="form.dni" class="w-full" :class="{ 'p-invalid': errors.dni }" maxlength="8" inputmode="numeric" placeholder="12345678" @input="errors.dni = ''" />
                    <small v-if="errors.dni" class="p-error">{{ errors.dni }}</small>
                </div>
                <div class="field">
                    <label class="field-label">Nombre completo <span class="req">*</span></label>
                    <InputText v-model="form.full_name" class="w-full" :class="{ 'p-invalid': errors.full_name }" placeholder="JUAN PÉREZ" @input="errors.full_name = ''" />
                    <small v-if="errors.full_name" class="p-error">{{ errors.full_name }}</small>
                </div>
                <div class="field">
                    <label class="field-label">Email <span class="req">*</span></label>
                    <InputText v-model="form.email" class="w-full" :class="{ 'p-invalid': errors.email }" placeholder="correo@empresa.com" @input="errors.email = ''" />
                    <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
                </div>
                <div class="field">
                    <label class="field-label">Área</label>
                    <InputText v-model="form.area" class="w-full" placeholder="Ej: Contabilidad" />
                </div>
                <div class="field-inline">
                    <Checkbox v-model="form.is_active" :binary="true" inputId="emp-active" />
                    <label for="emp-active">Empleado activo</label>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="Cancelar" severity="secondary" :disabled="isSavingEmployee" @click="dialogVisible = false" />
                    <Button :label="isEditing ? 'Actualizar' : 'Guardar'" icon="pi pi-save" :loading="isSavingEmployee" @click="handleSave" />
                </div>
            </template>
        </Dialog>

        <ConfirmDialog />
    </div>
</template>

<style scoped>
.boletas-view {
    padding: 1rem;
}
.main-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.header-section {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
}
.header-icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 60%, #000));
    box-shadow: 0 6px 16px color-mix(in srgb, var(--primary-color) 35%, transparent);
}
.header-icon-wrapper i {
    font-size: 1.75rem;
    color: #fff;
}
.header-content {
    flex: 1;
}
.header-title {
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0 0 0.25rem 0;
    color: var(--text-color);
}
.header-subtitle {
    color: var(--text-color-secondary);
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    margin: 0;
}
.filters-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
}
.form-stack {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: 0.5rem;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}
.field-label {
    font-weight: 600;
    color: var(--text-color);
}
.req {
    color: var(--red-500, #ef4444);
}
.field-inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
@media (max-width: 768px) {
    .main-card {
        padding: 1rem;
    }
}
</style>
