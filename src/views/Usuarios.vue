<template>
    <div class="card">
        <div class="flex justify-content-between align-items-center mb-4">
            <div>
                <h2>Gestión de Usuarios</h2>
                <p class="text-color-secondary m-0">Administración de usuarios del sistema</p>
            </div>
            <Button 
                label="Nuevo Usuario" 
                icon="pi pi-plus" 
                @click="openNewUser"
                class="p-button-success"
            />
        </div>

        <!-- Filtros -->
        <div class="grid mb-4">
            <div class="col-12 md:col-4">
                <span class="p-input-icon-left w-full">
                    <i class="pi pi-search" />
                    <InputText 
                        v-model="filters.global" 
                        placeholder="Buscar usuarios..." 
                        class="w-full"
                    />
                </span>
            </div>
            <div class="col-12 md:col-3">
                <Dropdown
                    v-model="filters.position"
                    :options="positionOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Todas las posiciones"
                    class="w-full"
                    :showClear="true"
                />
            </div>
            <div class="col-12 md:col-2">
                <Dropdown
                    v-model="filters.status"
                    :options="statusOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Todos los estados"
                    class="w-full"
                    :showClear="true"
                />
            </div>
        </div>

        <!-- Tabla de usuarios -->
        <DataTable 
            :value="filteredUsers" 
            :paginator="true" 
            :rows="10"
            :loading="loading"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} usuarios"
            :rowsPerPageOptions="[5, 10, 25, 50]"
            responsiveLayout="scroll"
            :globalFilterFields="['name', 'dni', 'email', 'position']"
        >
            <Column field="name" header="Nombre" :sortable="true">
                <template #body="{ data }">
                    <div class="flex align-items-center gap-2">
                        <div class="w-2rem h-2rem border-circle bg-primary-100 text-primary-900 flex align-items-center justify-content-center text-sm font-semibold">
                            {{ data.name.charAt(0).toUpperCase() }}
                        </div>
                        <div>
                            <div class="font-semibold">{{ data.name }}</div>
                            <div class="text-color-secondary text-sm">{{ data.nick }}</div>
                        </div>
                    </div>
                </template>
            </Column>
            
            <Column field="dni" header="DNI" :sortable="true"></Column>
            
            <Column field="email" header="Email" :sortable="true">
                <template #body="{ data }">
                    <a :href="`mailto:${data.email}`" class="text-primary no-underline">
                        {{ data.email }}
                    </a>
                </template>
            </Column>
            
            <Column field="position" header="Posición" :sortable="true">
                <template #body="{ data }">
                    <Tag 
                        :value="data.position" 
                        :severity="getPositionSeverity(data.position)"
                        class="text-sm"
                    />
                </template>
            </Column>
            
            <Column field="phone" header="Teléfono">
                <template #body="{ data }">
                    <a :href="`tel:${data.phone}`" class="text-color no-underline">
                        {{ data.phone }}
                    </a>
                </template>
            </Column>
            
            <Column field="active" header="Estado" :sortable="true">
                <template #body="{ data }">
                    <Tag 
                        :value="data.active ? 'Activo' : 'Inactivo'" 
                        :severity="data.active ? 'success' : 'danger'"
                    />
                </template>
            </Column>
            
            <Column header="Acciones">
                <template #body="{ data }">
                    <div class="flex gap-2">
                        <Button 
                            icon="pi pi-pencil" 
                            class="p-button-text p-button-sm p-button-warning"
                            @click="editUser(data)"
                            v-tooltip.top="'Editar'"
                        />
                        <Button 
                            icon="pi pi-key" 
                            class="p-button-text p-button-sm p-button-info"
                            @click="resetPassword(data)"
                            v-tooltip.top="'Resetear contraseña'"
                        />
                        <Button 
                            :icon="data.active ? 'pi pi-ban' : 'pi pi-check'" 
                            :class="data.active ? 'p-button-text p-button-sm p-button-danger' : 'p-button-text p-button-sm p-button-success'"
                            @click="toggleUserStatus(data)"
                            :v-tooltip.top="data.active ? 'Desactivar' : 'Activar'"
                        />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>

    <!-- Dialog para crear/editar usuario -->
    <Dialog 
        v-model:visible="userDialog" 
        :header="isEditing ? 'Editar Usuario' : 'Nuevo Usuario'" 
        :modal="true" 
        class="p-fluid" 
        :style="{ width: '600px' }"
    >
        <div class="formgrid grid">
            <div class="field col-12 md:col-6">
                <label for="name" class="font-semibold">Nombre Completo *</label>
                <InputText 
                    id="name" 
                    v-model="selectedUser.name" 
                    :class="{ 'p-invalid': submitted && !selectedUser.name }" 
                    placeholder="Nombres y apellidos"
                />
                <small class="p-error" v-if="submitted && !selectedUser.name">
                    El nombre es obligatorio.
                </small>
            </div>
            
            <div class="field col-12 md:col-6">
                <label for="dni" class="font-semibold">DNI *</label>
                <InputText 
                    id="dni" 
                    v-model="selectedUser.dni" 
                    :class="{ 'p-invalid': submitted && (!selectedUser.dni || selectedUser.dni.length !== 8) }"
                    placeholder="12345678"
                    maxlength="8"
                    @input="formatDNI"
                />
                <small class="p-error" v-if="submitted && (!selectedUser.dni || selectedUser.dni.length !== 8)">
                    DNI debe tener 8 dígitos.
                </small>
            </div>
            
            <div class="field col-12 md:col-6">
                <label for="email" class="font-semibold">Email *</label>
                <InputText 
                    id="email" 
                    v-model="selectedUser.email" 
                    :class="{ 'p-invalid': submitted && !isValidEmail(selectedUser.email) }"
                    placeholder="usuario@clinicasantarosa.com"
                />
                <small class="p-error" v-if="submitted && !isValidEmail(selectedUser.email)">
                    Email debe ser válido.
                </small>
            </div>
            
            <div class="field col-12 md:col-6">
                <label for="phone" class="font-semibold">Teléfono *</label>
                <InputText 
                    id="phone" 
                    v-model="selectedUser.phone" 
                    :class="{ 'p-invalid': submitted && (!selectedUser.phone || selectedUser.phone.length !== 9) }"
                    placeholder="987654321"
                    maxlength="9"
                    @input="formatPhone"
                />
                <small class="p-error" v-if="submitted && (!selectedUser.phone || selectedUser.phone.length !== 9)">
                    Teléfono debe tener 9 dígitos.
                </small>
            </div>
            
            <div class="field col-12 md:col-6">
                <label for="position" class="font-semibold">Posición *</label>
                <Dropdown 
                    id="position"
                    v-model="selectedUser.position" 
                    :options="positionOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Seleccionar posición"
                    :class="{ 'p-invalid': submitted && !selectedUser.position }"
                />
                <small class="p-error" v-if="submitted && !selectedUser.position">
                    La posición es obligatoria.
                </small>
            </div>
            
            <div class="field col-12 md:col-6">
                <label for="nick" class="font-semibold">Nick *</label>
                <InputText 
                    id="nick" 
                    v-model="selectedUser.nick" 
                    :class="{ 'p-invalid': submitted && !selectedUser.nick }"
                    placeholder="nickname"
                    maxlength="20"
                />
                <small class="p-error" v-if="submitted && !selectedUser.nick">
                    El nick es obligatorio.
                </small>
            </div>
            
            <div class="field col-12" v-if="!isEditing">
                <label for="password" class="font-semibold">Contraseña *</label>
                <Password 
                    id="password" 
                    v-model="selectedUser.password" 
                    :class="{ 'p-invalid': submitted && (!selectedUser.password || selectedUser.password.length < 8) }"
                    toggleMask
                    :feedback="true"
                    placeholder="Mínimo 8 caracteres"
                />
                <small class="p-error" v-if="submitted && (!selectedUser.password || selectedUser.password.length < 8)">
                    La contraseña debe tener al menos 8 caracteres.
                </small>
            </div>
        </div>

        <template #footer>
            <Button 
                label="Cancelar" 
                icon="pi pi-times" 
                class="p-button-text" 
                @click="hideDialog"
            />
            <Button 
                label="Guardar" 
                icon="pi pi-check" 
                @click="saveUser" 
                :loading="saving"
            />
        </template>
    </Dialog>

    <!-- Dialog de confirmación -->
    <Dialog 
        v-model:visible="confirmDialog" 
        header="Confirmar Acción" 
        :modal="true" 
        :style="{ width: '400px' }"
    >
        <div class="flex align-items-center gap-3">
            <i class="pi pi-exclamation-triangle text-orange-500 text-2xl"></i>
            <span>{{ confirmMessage }}</span>
        </div>
        <template #footer>
            <Button 
                label="Cancelar" 
                icon="pi pi-times" 
                class="p-button-text" 
                @click="confirmDialog = false"
            />
            <Button 
                label="Confirmar" 
                icon="pi pi-check" 
                @click="confirmAction" 
                :loading="processing"
            />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { USER_POSITIONS } from '@/composables/usePermissions';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';
import Password from 'primevue/password';

const toast = useToast();

// Estado
const loading = ref(false);
const saving = ref(false);
const processing = ref(false);
const userDialog = ref(false);
const confirmDialog = ref(false);
const submitted = ref(false);
const isEditing = ref(false);

// Datos
const users = ref([]);
const selectedUser = ref({});
const confirmMessage = ref('');
const currentAction = ref(null);

// Filtros
const filters = ref({
    global: '',
    position: null,
    status: null
});

// Opciones para dropdowns
const positionOptions = ref([
    { label: 'Administración', value: 'ADMINISTRACION' },
    { label: 'Admisión', value: 'ADMISION' },
    { label: 'Archivo Historias', value: 'ARCHIVO HISTORIAS' },
    { label: 'Consultorios', value: 'CONSULTORIOS' },
    { label: 'Contabilidad', value: 'CONTABILIDAD' },
    { label: 'Director Médico', value: 'DIRECTOR MEDICO' },
    { label: 'Emergencia', value: 'EMERGENCIA' },
    { label: 'Facturación', value: 'FACTURACION' },
    { label: 'Farmacia', value: 'FARMACIA' },
    { label: 'Hospitalización', value: 'HOSPITALIZACION' },
    { label: 'Laboratorio', value: 'LABORATORIO' },
    { label: 'Logística', value: 'LOGISTICA' },
    { label: 'Médicos', value: 'MEDICOS' },
    { label: 'Quirófano', value: 'QUIROFANO' },
    { label: 'Rayos X', value: 'RAYOS X' },
    { label: 'RRHH', value: 'RRHH' },
    { label: 'Sistemas', value: 'SISTEMAS' }
]);

const statusOptions = ref([
    { label: 'Activos', value: true },
    { label: 'Inactivos', value: false }
]);

// Computadas
const filteredUsers = computed(() => {
    let filtered = users.value;

    // Filtro global
    if (filters.value.global) {
        const globalFilter = filters.value.global.toLowerCase();
        filtered = filtered.filter(user =>
            user.name.toLowerCase().includes(globalFilter) ||
            user.dni.includes(globalFilter) ||
            user.email.toLowerCase().includes(globalFilter) ||
            user.position.toLowerCase().includes(globalFilter) ||
            user.nick.toLowerCase().includes(globalFilter)
        );
    }

    // Filtro por posición
    if (filters.value.position) {
        filtered = filtered.filter(user => user.position === filters.value.position);
    }

    // Filtro por estado
    if (filters.value.status !== null) {
        filtered = filtered.filter(user => user.active === filters.value.status);
    }

    return filtered;
});

// Métodos
const loadUsers = async () => {
    loading.value = true;
    try {
        // Simular datos demo
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        users.value = [
            {
                id: 1,
                name: 'Juan Carlos Pérez',
                dni: '12345678',
                email: 'jperez@clinicasantarosa.com',
                phone: '987654321',
                position: 'MEDICOS',
                nick: 'drperez',
                active: true
            },
            {
                id: 2,
                name: 'María García López',
                dni: '87654321',
                email: 'mgarcia@clinicasantarosa.com',
                phone: '987654322',
                position: 'ADMISION',
                nick: 'mgarcia',
                active: true
            },
            {
                id: 3,
                name: 'Carlos Ruiz Mendoza',
                dni: '11223344',
                email: 'cruiz@clinicasantarosa.com',
                phone: '987654323',
                position: 'SISTEMAS',
                nick: 'cruiz',
                active: true
            },
            {
                id: 4,
                name: 'Ana Martínez Flores',
                dni: '44332211',
                email: 'amartinez@clinicasantarosa.com',
                phone: '987654324',
                position: 'RRHH',
                nick: 'amartinez',
                active: false
            }
        ];
    } finally {
        loading.value = false;
    }
};

const openNewUser = () => {
    selectedUser.value = {
        name: '',
        dni: '',
        email: '',
        phone: '',
        position: '',
        nick: '',
        password: '',
        active: true
    };
    submitted.value = false;
    isEditing.value = false;
    userDialog.value = true;
};

const editUser = (user) => {
    selectedUser.value = { ...user };
    submitted.value = false;
    isEditing.value = true;
    userDialog.value = true;
};

const hideDialog = () => {
    userDialog.value = false;
    submitted.value = false;
};

const saveUser = async () => {
    submitted.value = true;

    if (!isValidUserData()) {
        return;
    }

    saving.value = true;

    try {
        // Simular API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (isEditing.value) {
            // Actualizar usuario existente
            const index = users.value.findIndex(u => u.id === selectedUser.value.id);
            if (index !== -1) {
                users.value[index] = { ...selectedUser.value };
            }
            
            toast.add({
                severity: 'success',
                summary: 'Usuario Actualizado',
                detail: 'El usuario se ha actualizado correctamente',
                life: 3000
            });
        } else {
            // Crear nuevo usuario
            selectedUser.value.id = users.value.length + 1;
            users.value.push({ ...selectedUser.value });
            
            toast.add({
                severity: 'success',
                summary: 'Usuario Creado',
                detail: 'El usuario se ha creado correctamente',
                life: 3000
            });
        }

        hideDialog();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar el usuario',
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};

const resetPassword = (user) => {
    confirmMessage.value = `¿Está seguro que desea resetear la contraseña de ${user.name}?`;
    currentAction.value = () => performResetPassword(user);
    confirmDialog.value = true;
};

const performResetPassword = async (user) => {
    processing.value = true;
    
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast.add({
            severity: 'success',
            summary: 'Contraseña Reseteada',
            detail: `Se ha enviado una nueva contraseña a ${user.email}`,
            life: 4000
        });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo resetear la contraseña',
            life: 3000
        });
    } finally {
        processing.value = false;
        confirmDialog.value = false;
    }
};

const toggleUserStatus = (user) => {
    const action = user.active ? 'desactivar' : 'activar';
    confirmMessage.value = `¿Está seguro que desea ${action} a ${user.name}?`;
    currentAction.value = () => performToggleStatus(user);
    confirmDialog.value = true;
};

const performToggleStatus = async (user) => {
    processing.value = true;
    
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        user.active = !user.active;
        const status = user.active ? 'activado' : 'desactivado';
        
        toast.add({
            severity: 'info',
            summary: 'Estado Actualizado',
            detail: `El usuario ${user.name} ha sido ${status}`,
            life: 3000
        });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cambiar el estado del usuario',
            life: 3000
        });
    } finally {
        processing.value = false;
        confirmDialog.value = false;
    }
};

const confirmAction = () => {
    if (currentAction.value) {
        currentAction.value();
    }
};

const isValidUserData = () => {
    return selectedUser.value.name &&
           selectedUser.value.dni && selectedUser.value.dni.length === 8 &&
           isValidEmail(selectedUser.value.email) &&
           selectedUser.value.phone && selectedUser.value.phone.length === 9 &&
           selectedUser.value.position &&
           selectedUser.value.nick &&
           (isEditing.value || (selectedUser.value.password && selectedUser.value.password.length >= 8));
};

const isValidEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email && emailPattern.test(email);
};

const formatDNI = (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 8);
    selectedUser.value.dni = value;
};

const formatPhone = (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 9);
    selectedUser.value.phone = value;
};

const getPositionSeverity = (position) => {
    const severityMap = {
        'SISTEMAS': 'info',
        'DIRECTOR MEDICO': 'success',
        'ADMINISTRACION': 'warning',
        'RRHH': 'warning',
        'MEDICOS': 'success',
        'EMERGENCIA': 'danger'
    };
    return severityMap[position] || 'secondary';
};

// Lifecycle
onMounted(() => {
    loadUsers();
});
</script>