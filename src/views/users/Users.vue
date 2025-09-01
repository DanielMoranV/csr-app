<script setup>
import { useUsers } from '@/composables/useUsers.js';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { onMounted, reactive, ref } from 'vue';

// Componentes modulares
import ConfirmDialog from '@/components/users/ConfirmDialog.vue';
import UserDialog from '@/components/users/UserDialog.vue';
import UserFilters from '@/components/users/UserFilters.vue';
import UserStats from '@/components/users/UserStats.vue';
import UserTable from '@/components/users/UserTable.vue';

// Composables
const {
    // Estados
    users,
    allUsers,
    isLoading,
    isSaving,
    //isDeleting,
    userStats,
    operationInProgress,

    // Opciones
    positionOptions,
    statusOptions,
    sortOptions,

    // Métodos principales
    initializeUsers,
    refreshUsers,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
    resetUserPassword,

    // Métodos de filtrado
    setGlobalFilter,
    setPositionFilter,
    setStatusFilter,
    setSorting,
    clearAllFilters,

    // Métodos de estadísticas
    loadUserStats,

    // Utilidades
    //getUserById,
    formatPositionLabel
} = useUsers();

const toast = useToast();

// Estado local de la vista
const userDialogVisible = ref(false);
const confirmDialogVisible = ref(false);
const selectedUser = ref(null);
const isEditing = ref(false);
const currentSelectedUser = ref(null);

// Datos del diálogo de confirmación
const confirmData = reactive({
    title: '',
    message: '',
    details: null,
    actionType: 'default',
    user: null,
    action: null,
    processingMessage: null,
    requireTextConfirmation: false,
    confirmationText: 'CONFIRMAR'
});

// Métodos de inicialización
onMounted(async () => {
    try {
        await initializeUsers();
        await loadUserStats();
    } catch (error) {
        console.error('Error al inicializar usuarios:', error);
        toast.add({
            severity: 'error',
            summary: 'Error de Inicialización',
            detail: 'No se pudo cargar la lista de usuarios',
            life: 5000
        });
    }
});

// Métodos de gestión de usuarios
const openCreateUserDialog = () => {
    selectedUser.value = null;
    isEditing.value = false;
    userDialogVisible.value = true;
};

const editUser = (user) => {
    selectedUser.value = { ...user };
    isEditing.value = true;
    userDialogVisible.value = true;
};

const viewUserDetails = (user) => {
    // Por ahora simplemente editamos, pero se puede expandir para vista de solo lectura
    editUser(user);
};

const closeUserDialog = () => {
    userDialogVisible.value = false;
    selectedUser.value = null;
    isEditing.value = false;
};

const handleSaveUser = async (userData) => {
    try {
        if (isEditing.value && selectedUser.value?.id) {
            await updateUser(selectedUser.value.id, userData);
        } else {
            await createUser(userData);
        }
        closeUserDialog();
    } catch (error) {
        // El error ya es manejado por el composable
        console.error('Error al guardar usuario:', error);
    }
};

// Métodos de confirmación
const confirmDeleteUser = (user) => {
    Object.assign(confirmData, {
        title: 'Eliminar Usuario',
        message: `¿Está seguro que desea eliminar a ${user.name}?`,
        details: 'Esta acción eliminará permanentemente el usuario y no se puede deshacer.',
        actionType: 'delete',
        user: user,
        action: () => deleteUser(user),
        processingMessage: 'Eliminando usuario...',
        requireTextConfirmation: true,
        confirmationText: 'ELIMINAR'
    });
    confirmDialogVisible.value = true;
};

const confirmToggleUserStatus = (user) => {
    const action = user.is_active ? 'desactivar' : 'activar';
    const actionType = user.is_active ? 'deactivate' : 'activate';

    Object.assign(confirmData, {
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Usuario`,
        message: `¿Está seguro que desea ${action} a ${user.name}?`,
        details: user.is_active ? 'El usuario no podrá iniciar sesión hasta que se reactive.' : 'El usuario podrá volver a acceder al sistema.',
        actionType: actionType,
        user: user,
        action: () => toggleUserStatus(user),
        processingMessage: `${action.charAt(0).toUpperCase() + action.slice(1)}ando usuario...`,
        requireTextConfirmation: false
    });
    confirmDialogVisible.value = true;
};

const confirmResetPassword = (user) => {
    Object.assign(confirmData, {
        title: 'Resetear Contraseña',
        message: `¿Está seguro que desea resetear la contraseña de ${user.name}?`,
        details: 'Se enviará una nueva contraseña temporal al email del usuario.',
        actionType: 'reset',
        user: user,
        action: () => resetUserPassword(user),
        processingMessage: 'Reseteando contraseña...',
        requireTextConfirmation: false
    });
    confirmDialogVisible.value = true;
};

const handleConfirmAction = async () => {
    if (confirmData.action) {
        try {
            await confirmData.action();
            closeConfirmDialog();
        } catch (error) {
            // El error ya es manejado por el composable
            console.error('Error en acción confirmada:', error);
        }
    }
};

const closeConfirmDialog = () => {
    confirmDialogVisible.value = false;
    Object.assign(confirmData, {
        title: '',
        message: '',
        details: null,
        actionType: 'default',
        user: null,
        action: null,
        processingMessage: null,
        requireTextConfirmation: false,
        confirmationText: 'CONFIRMAR'
    });
};

// Métodos de búsqueda avanzada
const handleAdvancedSearch = async (searchParams) => {
    try {
        // Implementar búsqueda avanzada si es necesario
        console.log('búsqueda avanzada:', searchParams);
    } catch (error) {
        console.error('Error en búsqueda avanzada:', error);
    }
};

// Métodos de tabla
const onUserSelect = (user) => {
    currentSelectedUser.value = user;
};

const onUserUnselect = () => {
    currentSelectedUser.value = null;
};

// Métodos de utilidad
const getEmptyMessage = () => {
    if (isLoading.value) {
        return 'Cargando usuarios...';
    }

    const hasFilters = users.value.length !== allUsers.value.length;

    if (hasFilters) {
        return 'No se encontraron usuarios que coincidan con los filtros aplicados. Intente ajustar los criterios de b�squeda.';
    }

    return 'No hay usuarios registrados en el sistema. Haga clic en "Nuevo Usuario" para agregar el primero.';
};

const exportUsers = () => {
    try {
        // Crear datos para exportar
        const dataToExport = users.value.map((user) => ({
            Nombre: user.name,
            DNI: user.dni,
            Email: user.email,
            Teléfono: user.phone,
            Posición: formatPositionLabel(user.position),
            Nick: user.nick,
            Estado: user.is_active ? 'Activo' : 'Inactivo',
            'Fecha de Registro': new Date(user.created_at).toLocaleDateString('es-PE')
        }));

        // Convertir a CSV
        const csvContent = convertToCSV(dataToExport);

        // Descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.add({
            severity: 'success',
            summary: 'Exportación Completa',
            detail: `Se exportaron ${users.value.length} usuarios`,
            life: 3000
        });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error de Exportación',
            detail: 'No se pudo exportar la lista de usuarios',
            life: 4000
        });
    }
};

const convertToCSV = (data) => {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map((row) =>
        headers
            .map((header) => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            })
            .join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
};
</script>

<template>
    <div class="users-management" :data-loading="isLoading">
        <!-- Header mejorado -->
        <div class="header-section">
            <div class="header-content">
                <div class="title-section">
                    <div class="title-wrapper">
                        <div class="icon-container">
                            <i class="pi pi-users"></i>
                        </div>
                        <div class="title-text">
                            <h1>Gestión de Usuarios</h1>
                            <p>Administración completa del personal de Clínica Santa Rosa</p>
                        </div>
                    </div>
                    <div class="breadcrumb-section">
                        <span class="breadcrumb-item">Dashboard</span>
                        <i class="pi pi-chevron-right breadcrumb-separator"></i>
                        <span class="breadcrumb-current">Usuarios</span>
                    </div>
                </div>

                <!-- Acciones rápidas mejoradas -->
                <div class="actions-section">
                    <div class="quick-actions">
                        <Button icon="pi pi-refresh" class="p-button-outlined action-btn" @click="refreshUsers" v-tooltip.bottom="'Actualizar lista'" :loading="isLoading" severity="secondary" />
                        <Button icon="pi pi-download" class="p-button-outlined action-btn" @click="exportUsers" v-tooltip.bottom="'Exportar usuarios'" severity="info" />
                        <Button label="Nuevo Usuario" icon="pi pi-plus" class="primary-action-btn" @click="openCreateUserDialog" severity="success" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Contenido principal -->
        <div class="main-content">
            <!-- Estadísticas mejoradas -->
            <div class="stats-section">
                <UserStats :stats="userStats" :loading="isLoading" @refresh-stats="loadUserStats" />
            </div>

            <!-- Panel de filtros -->
            <div class="filters-section">
                <UserFilters
                    :position-options="positionOptions"
                    :status-options="statusOptions"
                    :sort-options="sortOptions"
                    :result-count="users.length"
                    :total-count="allUsers.length"
                    :is-filtering="isLoading"
                    @update-global-filter="setGlobalFilter"
                    @update-position-filter="setPositionFilter"
                    @update-status-filter="setStatusFilter"
                    @update-sort="setSorting"
                    @clear-filters="clearAllFilters"
                    @advanced-search="handleAdvancedSearch"
                />
            </div>

            <!-- Tabla de usuarios mejorada -->
            <div class="table-section">
                <UserTable
                    :users="users"
                    :loading="isLoading"
                    :empty-message="getEmptyMessage()"
                    :rows-per-page="25"
                    @view-user="viewUserDetails"
                    @edit-user="editUser"
                    @create-user="openCreateUserDialog"
                    @delete-user="confirmDeleteUser"
                    @toggle-status="confirmToggleUserStatus"
                    @reset-password="confirmResetPassword"
                    @refresh="refreshUsers"
                    @row-select="onUserSelect"
                    @row-unselect="onUserUnselect"
                />
            </div>
        </div>

        <!-- Diálogo de usuario -->
        <UserDialog v-model:visible="userDialogVisible" :user="selectedUser" :position-options="positionOptions" :saving="isSaving" @save-user="handleSaveUser" @close="closeUserDialog" />

        <!-- Diálogo de confirmación -->
        <ConfirmDialog
            v-model:visible="confirmDialogVisible"
            :title="confirmData.title"
            :message="confirmData.message"
            :details="confirmData.details"
            :action-type="confirmData.actionType"
            :user="confirmData.user"
            :processing="operationInProgress"
            :processing-message="confirmData.processingMessage"
            :require-text-confirmation="confirmData.requireTextConfirmation"
            :confirmation-text="confirmData.confirmationText"
            @confirm="handleConfirmAction"
            @cancel="closeConfirmDialog"
        />

        <!-- Toast container ya está disponible globalmente -->
    </div>
</template>

<style scoped>
.users-management {
    min-height: 100vh;
    background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
}

/* Header Section */
.header-section {
    background: var(--surface-card);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    margin-bottom: 2rem;
    overflow: hidden;
    position: relative;
}

.header-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--primary-500) 0%, var(--primary-300) 100%);
}

.header-content {
    padding: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
}

.title-section {
    flex: 1;
}

.title-wrapper {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.icon-container {
    width: 60px;
    height: 60px;
    background: var(--surface-100);
    border: 1px solid var(--surface-200);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    transition: all 0.3s ease;
}

.icon-container:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
}

.icon-container i {
    font-size: 1.75rem;
    color: var(--text-color);
}

.title-text h1 {
    margin: 0;
    font-size: 2.25rem;
    font-weight: 700;
    color: var(--text-color);
    line-height: 1.2;
}

.title-text p {
    margin: 0.5rem 0 0 0;
    font-size: 1.125rem;
    color: var(--text-color-secondary);
    line-height: 1.4;
}

.breadcrumb-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.breadcrumb-item {
    color: var(--text-color-secondary);
    transition: color 0.2s ease;
}

.breadcrumb-item:hover {
    color: var(--primary-500);
    cursor: pointer;
}

.breadcrumb-separator {
    color: var(--text-color-secondary);
    font-size: 0.75rem;
}

.breadcrumb-current {
    color: var(--primary-500);
    font-weight: 600;
}

.actions-section {
    flex-shrink: 0;
}

.quick-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.action-btn {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 12px;
    transition: all 0.3s ease;
    border: 2px solid var(--surface-border);
}

.action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.primary-action-btn {
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-weight: 600;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    transition: all 0.3s ease;
}

.primary-action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
}

/* Main Content */
.main-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.stats-section,
.filters-section,
.table-section {
    animation: fadeInUp 0.6s ease-out;
}

.stats-section {
    animation-delay: 0.1s;
}

.filters-section {
    animation-delay: 0.2s;
}

.table-section {
    animation-delay: 0.3s;
}

/* Animations */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive Design */
@media (max-width: 1024px) {
    .header-content {
        padding: 1.5rem;
        gap: 1.5rem;
    }

    .title-text h1 {
        font-size: 2rem;
    }

    .icon-container {
        width: 50px;
        height: 50px;
    }

    .icon-container i {
        font-size: 1.5rem;
    }
}

@media (max-width: 768px) {
    .users-management {
        background: var(--surface-ground);
    }

    .header-content {
        flex-direction: column;
        align-items: stretch;
        padding: 1rem;
        gap: 1.5rem;
    }

    .title-wrapper {
        gap: 0.75rem;
    }

    .icon-container {
        width: 45px;
        height: 45px;
    }

    .icon-container i {
        font-size: 1.25rem;
    }

    .title-text h1 {
        font-size: 1.75rem;
    }

    .title-text p {
        font-size: 1rem;
    }

    .quick-actions {
        justify-content: space-between;
        width: 100%;
    }

    .primary-action-btn {
        flex: 1;
        margin-left: 1rem;
    }

    .main-content {
        gap: 1.5rem;
    }
}

@media (max-width: 576px) {
    .header-section {
        margin-bottom: 1rem;
    }

    .breadcrumb-section {
        flex-wrap: wrap;
    }

    .quick-actions {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
    }

    .action-btn {
        width: 100%;
        height: 2.5rem;
    }

    .primary-action-btn {
        margin-left: 0;
        width: 100%;
    }

    .main-content {
        gap: 1rem;
    }
}

/* Dark theme support */
:root.app-dark .header-section::before {
    background: linear-gradient(90deg, var(--primary-400) 0%, var(--primary-500) 100%);
}

/* Loading states */
.users-management[data-loading='true'] .main-content > * {
    opacity: 0.7;
    pointer-events: none;
}

/* Focus styles for accessibility */
.action-btn:focus,
.primary-action-btn:focus {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
}

.breadcrumb-item:focus {
    outline: 2px solid var(--primary-500);
    outline-offset: 1px;
    border-radius: 4px;
}
</style>
