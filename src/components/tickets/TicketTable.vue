<script setup>
import { useAuthStore } from '@/store/authStore';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import SplitButton from 'primevue/splitbutton';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';

const props = defineProps({
    tickets: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    emptyMessage: {
        type: String,
        default: 'No se encontraron tickets con los filtros aplicados'
    },
    getStatusSeverity: {
        type: Function,
        required: true
    },
    getPrioritySeverity: {
        type: Function,
        required: true
    }
});

const emit = defineEmits(['view-ticket', 'edit-ticket', 'create-ticket', 'delete-ticket', 'refresh', 'row-select', 'row-unselect']);

const toast = useToast();
const authStore = useAuthStore();

// Campos para filtro global
const globalFilterFields = ['title', 'description', 'status', 'creator.name', 'assignee.name', 'assignee_position'];

// Métodos de utilidad
const getStatusIcon = (status) => {
    switch (status) {
        case 'pendiente':
            return 'pi pi-clock';
        case 'en proceso':
            return 'pi pi-spin pi-spinner';
        case 'concluido':
            return 'pi pi-check-circle';
        case 'rechazado':
            return 'pi pi-times-circle';
        case 'anulado':
            return 'pi pi-ban';
        default:
            return 'pi pi-question-circle';
    }
};

const getPriorityIcon = (priority) => {
    switch (priority) {
        case 'baja':
            return 'pi pi-arrow-down';
        case 'media':
            return 'pi pi-minus';
        case 'alta':
            return 'pi pi-arrow-up';
        case 'urgente':
            return 'pi pi-exclamation-triangle';
        default:
            return 'pi pi-question-circle';
    }
};

const getInitials = (name) => {
    if (!name) return '';
    return name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
};

const getAvatarColor = (name) => {
    if (!name) return '#ccc';
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#EC4899', '#14B8A6', '#F87171'];

    const hash = name.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hash) % colors.length];
};

const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
    if (days < 365) return `Hace ${Math.floor(days / 30)} meses`;
    return `Hace ${Math.floor(days / 365)} años`;
};

const onImageError = (event) => {
    event.target.style.display = 'none';
    event.target.nextElementSibling.style.display = 'flex';
};

// Estados reactivos para mejorar UX
const selectedTicket = ref(null);

// Gestión de selección con feedback mejorado
const onRowSelect = (event) => {
    selectedTicket.value = event.data;
    emit('row-select', event.data);

    toast.add({
        severity: 'info',
        summary: '🎫 Ticket seleccionado',
        detail: `${event.data.title} - ${event.data.status}`,
        life: 2000
    });
};

const onRowUnselect = (event) => {
    selectedTicket.value = null;
    emit('row-unselect', event.data);
};

// Funciones de acción mejoradas con accesibilidad
const handleViewTicket = (ticketData) => {
    emit('view-ticket', ticketData);
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Abriendo detalles del ticket ${ticketData.title}`;
    document.body.appendChild(announcement);

    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);

    toast.add({
        severity: 'info',
        summary: '👁️ Visualizando ticket',
        detail: `Abriendo detalles de ${ticketData.title}`,
        life: 2000
    });
};

const handleEditTicket = (ticketData) => {
    emit('edit-ticket', ticketData);
    toast.add({
        severity: 'info',
        summary: '✏️ Editando ticket',
        detail: `Editando ticket ${ticketData.title}`,
        life: 2000
    });
};

const handleDeleteTicket = (ticketData) => {
    emit('delete-ticket', ticketData);
};

// Generar items del menú de acciones
const getActionItems = (ticketData) => {
    const items = [
        {
            label: 'Ver detalles',
            icon: 'pi pi-eye',
            command: () => handleViewTicket(ticketData)
        },
        {
            label: 'Editar ticket',
            icon: 'pi pi-pencil',
            command: () => handleEditTicket(ticketData)
        },
        {
            separator: true
        }
    ];

    const currentUser = authStore.authUser;
    const isCreator = currentUser && currentUser.id === ticketData.creator_user_id;
    const isAssignee = currentUser && currentUser.id === ticketData.assignee_user_id;

    if (isCreator || isAssignee) {
        items.push({
            label: 'Eliminar ticket',
            icon: 'pi pi-trash',
            command: () => handleDeleteTicket(ticketData),
            class: 'text-danger-600'
        });
    }

    return items;
};
</script>

<template>
    <div class="ticket-table-container px-4">
        <!-- Header de la tabla con diseño -->
        <div class="ticket-table-header">
            <div class="header-left">
                <div class="title-section">
                    <i class="pi pi-ticket ticket-icon"></i>
                    <div class="title-content">
                        <h4 class="main-title">Tickets</h4>
                        <span class="subtitle">Gestión de solicitudes y problemas</span>
                    </div>
                </div>
                <Badge :value="tickets.length" severity="info" class="ticket-count-badge" />
            </div>
            <div class="header-actions">
                <Button icon="pi pi-refresh" @click="$emit('refresh')" v-tooltip.top="'Actualizar lista'" :loading="loading" severity="secondary" size="small" outlined />
                <Button label="Nuevo Ticket" icon="pi pi-plus" @click="$emit('create-ticket')" severity="success" />
            </div>
        </div>

        <!-- DataTable con diseño -->
        <DataTable
            :value="tickets"
            :loading="loading"
            paginator
            :rows="15"
            responsiveLayout="scroll"
            :resizableColumns="true"
            columnResizeMode="expand"
            :reorderableColumns="true"
            :globalFilterFields="globalFilterFields"
            :sortMode="'multiple'"
            :removableSort="true"
            selectionMode="single"
            @rowSelect="onRowSelect"
            @rowUnselect="onRowUnselect"
            class="ticket-datatable"
            :pt="{
                header: { class: 'ticket-table-head' },
                bodyrow: { class: 'ticket-table-row' }
            }"
            stripedRows
            scrollable
            scrollHeight="500px"
        >
            <!-- Empty state con diseño -->
            <template #empty>
                <div class="ticket-empty-state">
                    <div class="empty-icon-container">
                        <i class="pi pi-ticket empty-icon"></i>
                    </div>
                    <div class="empty-title">No hay tickets registrados</div>
                    <div class="empty-subtitle">
                        {{ emptyMessage || 'Comience agregando nuevos tickets al sistema' }}
                    </div>
                    <Button label="Agregar Ticket" icon="pi pi-plus" class="empty-action-button" @click="$emit('create-ticket')" severity="success" />
                </div>
            </template>

            <!-- Loading template -->
            <template #loading>
                <div class="ticket-loading-state">
                    <div class="loading-spinner">
                        <i class="pi pi-spin pi-spinner"></i>
                    </div>
                    <div class="loading-text">Cargando tickets...</div>
                </div>
            </template>

            <!-- Id del Ticket -->
            <Column field="id" header="ID" :sortable="true" style="min-width: 100px">
                <template #body="{ data }">
                    <span class="ticket-id">{{ data.id }}</span>
                </template>
            </Column>

            <!-- Título del Ticket -->
            <Column field="title" header="Título" :sortable="true" style="min-width: 250px">
                <template #body="{ data }">
                    <div class="ticket-title-cell">
                        <i class="pi pi-tag title-icon"></i>
                        <span class="ticket-title">{{ data.title }}</span>
                    </div>
                </template>
            </Column>

            <!-- Descripción (truncada) -->
            <Column field="description" header="Descripción" style="min-width: 300px">
                <template #body="{ data }">
                    <span class="ticket-description">{{ data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') }}</span>
                </template>
            </Column>

            <!-- Prioridad -->
            <Column field="priority" header="Prioridad" :sortable="true" style="min-width: 120px; text-align: center">
                <template #body="{ data }">
                    <Tag v-tooltip.top="data.priority" :severity="getPrioritySeverity(data.priority)" class="ticket-priority-tag" rounded>
                        <i :class="getPriorityIcon(data.priority)"></i>
                    </Tag>
                </template>
            </Column>

            <!-- Estado -->
            <Column field="status" header="Estado" :sortable="true" style="min-width: 120px; text-align: center">
                <template #body="{ data }">
                    <Tag v-tooltip.top="data.status" :severity="getStatusSeverity(data.status)" class="ticket-status-tag" rounded>
                        <i :class="getStatusIcon(data.status)"></i>
                    </Tag>
                </template>
            </Column>

            <!-- Creador -->
            <Column field="creator.name" header="Creador" :sortable="true" style="min-width: 180px">
                <template #body="{ data }">
                    <div class="ticket-user-cell">
                        <div class="ticket-avatar-container">
                            <img v-if="data.creator?.url_photo_profile" :src="data.creator.url_photo_profile" :alt="data.creator.name" class="ticket-avatar" @error="onImageError" />
                            <div v-else class="ticket-avatar-fallback" :style="{ backgroundColor: getAvatarColor(data.creator?.name || '') }">
                                {{ getInitials(data.creator?.name || '') }}
                            </div>
                        </div>
                        <span class="ticket-user-name">{{ data.creator?.name || 'N/A' }}</span>
                    </div>
                </template>
            </Column>

            <!-- Asignado -->
            <Column field="assignee.name" header="Asignado A" :sortable="true" style="min-width: 180px">
                <template #body="{ data }">
                    <div v-if="data.assignee || data.assignee_position" class="ticket-user-cell">
                        <div class="ticket-avatar-container" v-if="data.assignee">
                            <img v-if="data.assignee.url_photo_profile" :src="data.assignee.url_photo_profile" :alt="data.assignee.name" class="ticket-avatar" @error="onImageError" />
                            <div v-else class="ticket-avatar-fallback" :style="{ backgroundColor: getAvatarColor(data.assignee.name) }">
                                {{ getInitials(data.assignee.name) }}
                            </div>
                        </div>
                        <div v-else class="ticket-avatar-container">
                            <div class="ticket-avatar-fallback" :style="{ backgroundColor: getAvatarColor(data.assignee_position) }">
                                <i class="pi pi-briefcase"></i>
                            </div>
                        </div>
                        <span class="ticket-user-name">{{ data.assignee?.name || data.assignee_position || 'N/A' }}</span>
                    </div>
                    <div v-else class="ticket-user-cell no-assignee">
                        <i class="pi pi-user-slash"></i>
                        <span>Sin asignar</span>
                    </div>
                </template>
            </Column>

            <!-- Fecha Límite -->
            <Column field="due_date" header="Fecha Límite" :sortable="true" style="min-width: 150px">
                <template #body="{ data }">
                    <div v-if="data.due_date" class="ticket-date-cell">
                        <div class="date-main">
                            <i class="pi pi-calendar-times date-icon"></i>
                            <span>{{ formatDateTime(data.due_date) }}</span>
                        </div>
                        <div class="date-relative">{{ getTimeAgo(data.due_date) }}</div>
                    </div>
                    <div v-else class="ticket-date-cell no-due-date">
                        <i class="pi pi-ban"></i>
                        <span>Sin fecha límite</span>
                    </div>
                </template>
            </Column>

            <!-- Fecha de Creación -->
            <Column field="created_at" header="Creado" :sortable="true" style="min-width: 150px">
                <template #body="{ data }">
                    <div class="ticket-date-cell">
                        <div class="date-main">
                            <i class="pi pi-calendar date-icon"></i>
                            <span>{{ formatDateTime(data.created_at) }}</span>
                        </div>
                        <div class="date-relative">{{ getTimeAgo(data.created_at) }}</div>
                    </div>
                </template>
            </Column>

            <!-- Acciones -->
            <Column header="Acciones" :exportable="false" style="min-width: 100px">
                <template #body="{ data }">
                    <div class="ticket-actions-compact" role="group" :aria-label="`Acciones para ticket ${data.title}`">
                        <SplitButton :label="''" icon="pi pi-ellipsis-v" @click="handleViewTicket(data)" :model="getActionItems(data)" class="ticket-split-button" size="small" severity="secondary" v-tooltip.top="'Ver acciones'" />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<style scoped>
/* Contenedor principal con tema */
.ticket-table-container {
    background: var(--surface-card);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: all 0.3s ease;
}

/* Header */
.ticket-table-header {
    background: linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%);
    border-bottom: 2px solid var(--primary-200);
    padding: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    min-width: 0;
}

.title-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.ticket-icon {
    font-size: 2rem;
    color: var(--primary-600);
    background: var(--surface-card);
    padding: 0.75rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.title-content .main-title {
    margin: 0;
    color: var(--primary-700);
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
}

.title-content .subtitle {
    color: var(--primary-600);
    font-size: 0.9rem;
    font-weight: 500;
    opacity: 0.9;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

/* DataTable */
.ticket-datatable {
    border: none;
    background: transparent;
}

:deep(.ticket-datatable .p-datatable-header) {
    background: var(--surface-ground);
    border-bottom: 1px solid var(--surface-border);
    padding: 0;
}

:deep(.ticket-datatable .p-datatable-thead > tr > th) {
    background: var(--surface-100);
    color: var(--text-color);
    font-weight: 700;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 1.25rem 1rem;
    border-bottom: 2px solid var(--primary-200);
    position: relative;
}

:deep(.ticket-datatable .p-datatable-thead > tr > th:first-child) {
    border-left: none;
}

:deep(.ticket-datatable .p-datatable-tbody > tr > td) {
    padding: 1rem;
    border-bottom: 1px solid var(--surface-border);
    vertical-align: middle;
    transition: background-color 0.2s ease;
}

:deep(.ticket-datatable .p-datatable-tbody > tr) {
    transition: all 0.2s ease;
}

:deep(.ticket-datatable .p-datatable-tbody > tr:hover) {
    background: var(--primary-50) !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

:deep(.ticket-datatable .p-datatable-striped .p-datatable-tbody > tr:nth-child(odd)) {
    background: var(--surface-50);
}

/* Celdas específicas */
.ticket-title-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 600;
    color: var(--text-color);
}

.title-icon {
    color: var(--primary-500);
    font-size: 1.1rem;
}

.ticket-description {
    color: var(--text-color-secondary);
    font-size: 0.9rem;
}

.ticket-status-tag,
.ticket-priority-tag {
    width: 2.25rem;
    height: 2.25rem;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-size: 1.1rem;
}

.ticket-user-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.ticket-avatar-container {
    position: relative;
    flex-shrink: 0;
}

.ticket-avatar {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--surface-border);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.ticket-avatar-fallback {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
    border: 2px solid var(--surface-border);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.ticket-user-name {
    font-weight: 500;
    color: var(--text-color);
    font-size: 0.9rem;
}

.no-assignee {
    color: var(--text-color-secondary);
    font-style: italic;
    opacity: 0.7;
}

.ticket-date-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.date-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    color: var(--text-color);
    font-size: 0.9rem;
}

.date-icon {
    color: var(--primary-500);
    font-size: 0.8rem;
}

.date-relative {
    color: var(--text-color-secondary);
    font-size: 0.8rem;
    font-weight: 400;
    opacity: 0.8;
}

.no-due-date {
    color: var(--text-color-secondary);
    font-style: italic;
    opacity: 0.7;
}

/* Acciones compactas */
.ticket-actions-compact {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-start;
}

.ticket-split-button :deep(.p-splitbutton-defaultbutton) {
    border-radius: 8px 0 0 8px;
    padding: 0.5rem 0.75rem;
    min-width: 2.5rem;
}

.ticket-split-button :deep(.p-splitbutton-menubutton) {
    border-radius: 0 8px 8px 0;
    padding: 0.5rem;
    min-width: 2rem;
}

.ticket-split-button :deep(.p-menu) {
    min-width: 180px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--surface-border);
}

.ticket-split-button :deep(.p-menu .p-menuitem-link) {
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin: 0.125rem;
    transition: all 0.2s ease;
}

.ticket-split-button :deep(.p-menu .p-menuitem-link:hover) {
    background: var(--primary-50);
    color: var(--primary-600);
}

.ticket-split-button :deep(.p-menu .p-menuitem-icon) {
    margin-right: 0.75rem;
    font-size: 0.875rem;
}

.ticket-split-button :deep(.p-menu .p-menuitem-text) {
    font-weight: 500;
    font-size: 0.875rem;
}

.ticket-split-button :deep(.p-menu .p-menuitem-separator) {
    margin: 0.25rem 0;
    border-color: var(--surface-border);
}

/* Estados vacíos y carga */
.ticket-empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
}

.empty-icon-container {
    margin-bottom: 2rem;
}

.empty-icon {
    font-size: 4rem;
    color: var(--primary-400);
    opacity: 0.6;
}

.empty-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 0.75rem;
}

.empty-subtitle {
    color: var(--text-color-secondary);
    font-size: 1rem;
    margin-bottom: 2rem;
    line-height: 1.5;
}

.empty-action-button {
    padding: 0.875rem 2rem;
    border-radius: 25px;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
}

.empty-action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
}

.ticket-loading-state {
    text-align: center;
    padding: 3rem 2rem;
}

.loading-spinner {
    margin-bottom: 1rem;
}

.loading-spinner i {
    font-size: 2.5rem;
    color: var(--primary-500);
}

.loading-text {
    color: var(--primary-600);
    font-weight: 600;
    font-size: 1.1rem;
}

/* Paginación */
:deep(.p-paginator) {
    background: var(--surface-100);
    border-top: 2px solid var(--primary-200);
    border-radius: 0 0 12px 12px;
    padding: 1.25rem;
}

:deep(.p-paginator .p-paginator-pages .p-paginator-page) {
    border-radius: 8px;
    min-width: 2.75rem;
    height: 2.75rem;
    margin: 0 0.125rem;
    font-weight: 600;
    transition: all 0.2s ease;
}

:deep(.p-paginator .p-paginator-pages .p-paginator-page:hover) {
    background: var(--primary-100);
    color: var(--primary-700);
    transform: translateY(-1px);
}

:deep(.p-paginator .p-paginator-pages .p-paginator-page.p-highlight) {
    background: var(--primary-500);
    border-color: var(--primary-500);
    color: white;
}

:deep(.p-paginator .p-paginator-current) {
    background: transparent;
    color: var(--text-color);
    font-weight: 700;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    background: var(--primary-50);
    border: 1px solid var(--primary-200);
}

/* Modo oscuro */
.app-dark .ticket-table-container,
:root[data-theme='dark'] .ticket-table-container {
    background: var(--surface-card);
    border-color: var(--surface-700);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.app-dark .ticket-table-header,
:root[data-theme='dark'] .ticket-table-header {
    background: linear-gradient(135deg, var(--surface-700) 0%, var(--surface-600) 100%);
    border-bottom-color: var(--surface-500);
}

.app-dark .ticket-icon,
:root[data-theme='dark'] .ticket-icon {
    background: var(--surface-card);
    color: var(--primary-400);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.app-dark .title-content .main-title,
:root[data-theme='dark'] .title-content .main-title {
    color: var(--surface-0);
}

.app-dark .title-content .subtitle,
:root[data-theme='dark'] .title-content .subtitle {
    color: var(--surface-200);
}

.app-dark .ticket-count-badge,
:root[data-theme='dark'] .ticket-count-badge {
    background: var(--primary-600);
    color: var(--surface-0);
}

.app-dark .refresh-button,
:root[data-theme='dark'] .refresh-button {
    border-color: var(--surface-500);
    color: var(--surface-100);
}

.app-dark .refresh-button:hover,
:root[data-theme='dark'] .refresh-button:hover {
    background: var(--surface-600);
    border-color: var(--surface-400);
}

.app-dark .ticket-title-cell,
:root[data-theme='dark'] .ticket-title-cell {
    color: var(--surface-0);
}

.app-dark .ticket-description,
:root[data-theme='dark'] .ticket-description {
    color: var(--surface-300);
}

.app-dark .ticket-status-tag,
:root[data-theme='dark'] .ticket-status-tag {
    filter: brightness(0.9) saturate(1.2);
}

.app-dark .ticket-priority-tag,
:root[data-theme='dark'] .ticket-priority-tag {
    filter: brightness(0.9) saturate(1.2);
}

.app-dark .ticket-user-name,
:root[data-theme='dark'] .ticket-user-name {
    color: var(--surface-0);
}

.app-dark .no-assignee,
:root[data-theme='dark'] .no-assignee {
    color: var(--surface-500);
}

.app-dark .ticket-date-cell .date-main,
:root[data-theme='dark'] .ticket-date-cell .date-main {
    color: var(--surface-100);
}

.app-dark .ticket-date-cell .date-relative,
:root[data-theme='dark'] .ticket-date-cell .date-relative {
    color: var(--surface-400);
}

.app-dark .no-due-date,
:root[data-theme='dark'] .no-due-date {
    color: var(--surface-500);
}

/* Estilos específicos para DataTable en modo oscuro */
.app-dark .ticket-datatable :deep(.p-datatable-thead > tr > th),
:root[data-theme='dark'] .ticket-datatable :deep(.p-datatable-thead > tr > th) {
    background: var(--surface-700) !important;
    border-bottom-color: var(--surface-500) !important;
    color: var(--surface-100) !important;
}

.app-dark .ticket-datatable :deep(.p-datatable-tbody > tr > td),
:root[data-theme='dark'] .ticket-datatable :deep(.p-datatable-tbody > tr > td) {
    border-bottom-color: var(--surface-600) !important;
    color: var(--surface-100);
}

.app-dark .ticket-datatable :deep(.p-datatable-tbody > tr:hover),
:root[data-theme='dark'] .ticket-datatable :deep(.p-datatable-tbody > tr:hover) {
    background: var(--surface-600) !important;
}

.app-dark .ticket-datatable :deep(.p-datatable-striped .p-datatable-tbody > tr:nth-child(odd)),
:root[data-theme='dark'] .ticket-datatable :deep(.p-datatable-striped .p-datatable-tbody > tr:nth-child(odd)) {
    background: var(--surface-750) !important;
}

/* Estados vacíos en modo oscuro */
.app-dark .ticket-empty-state,
:root[data-theme='dark'] .ticket-empty-state {
    background: linear-gradient(135deg, var(--surface-700) 0%, var(--surface-600) 100%);
}

.app-dark .empty-icon,
:root[data-theme='dark'] .empty-icon {
    color: var(--primary-500);
}

.app-dark .empty-title,
:root[data-theme='dark'] .empty-title {
    color: var(--surface-0);
}

.app-dark .empty-subtitle,
:root[data-theme='dark'] .empty-subtitle {
    color: var(--surface-300);
}

/* Carga en modo oscuro */
.app-dark .ticket-loading-state,
:root[data-theme='dark'] .ticket-loading-state {
    background: var(--surface-700);
}

.app-dark .loading-spinner i,
:root[data-theme='dark'] .loading-spinner i {
    color: var(--primary-400);
}

.app-dark .loading-text,
:root[data-theme='dark'] .loading-text {
    color: var(--primary-400);
}

/* Botones de acción en modo oscuro */
.app-dark .ticket-split-button :deep(.p-menu),
:root[data-theme='dark'] .ticket-split-button :deep(.p-menu) {
    background: var(--surface-700);
    border-color: var(--surface-600);
}

.app-dark .ticket-split-button :deep(.p-menu .p-menuitem-link),
:root[data-theme='dark'] .ticket-split-button :deep(.p-menu .p-menuitem-link) {
    color: var(--surface-100);
}

.app-dark .ticket-split-button :deep(.p-menu .p-menuitem-link:hover),
:root[data-theme='dark'] .ticket-split-button :deep(.p-menu .p-menuitem-link:hover) {
    background: var(--surface-600);
    color: var(--surface-0);
}

/* Responsive para dispositivos móviles */
@media (max-width: 768px) {
    .ticket-table-header {
        padding: 1rem;
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }

    .header-left {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.75rem;
    }

    .title-section {
        flex-direction: column;
        gap: 0.5rem;
    }

    .ticket-icon {
        font-size: 1.5rem;
        padding: 0.5rem;
    }

    .title-content .main-title {
        font-size: 1.25rem;
    }

    .title-content .subtitle {
        font-size: 0.9rem;
    }

    :deep(.ticket-datatable .p-datatable-thead > tr > th),
    :deep(.ticket-datatable .p-datatable-tbody > tr > td) {
        padding: 0.75rem 0.5rem;
        font-size: 0.875rem;
    }

    .ticket-user-cell {
        gap: 0.75rem;
    }

    .ticket-avatar,
    .ticket-avatar-fallback {
        width: 2rem;
        height: 2rem;
    }

    .ticket-actions-compact {
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
    }

    .ticket-split-button {
        width: 100%;
        order: 1;
    }

    .ticket-split-button :deep(.p-splitbutton) {
        width: 100%;
    }

    .ticket-split-button :deep(.p-splitbutton-defaultbutton) {
        flex: 1;
        justify-content: center;
        min-width: auto;
        padding: 0.625rem 1rem;
    }

    .ticket-split-button :deep(.p-splitbutton-menubutton) {
        min-width: auto;
        padding: 0.625rem;
    }
}

@media (max-width: 480px) {
    .ticket-table-header {
        padding: 0.75rem;
    }

    .title-content .main-title {
        font-size: 1.1rem;
    }

    .title-content .subtitle {
        font-size: 0.8rem;
    }

    .empty-title {
        font-size: 1.1rem;
    }

    .empty-subtitle {
        font-size: 0.9rem;
    }

    .ticket-actions-compact {
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
    }

    .ticket-split-button {
        width: 100%;
        order: 1;
    }

    .ticket-split-button :deep(.p-splitbutton) {
        width: 100%;
    }

    .ticket-split-button :deep(.p-splitbutton-defaultbutton) {
        flex: 1;
        justify-content: center;
        min-width: auto;
        padding: 0.625rem 1rem;
    }

    .ticket-split-button :deep(.p-splitbutton-menubutton) {
        min-width: auto;
        padding: 0.625rem;
    }
}

/* Animaciones y transiciones */
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

.ticket-table-container {
    animation: fadeInUp 0.4s ease-out;
}

:deep(.ticket-datatable .p-datatable-tbody > tr) {
    animation: fadeInUp 0.3s ease-out;
}

/* Mejoras de accesibilidad */
.ticket-split-button :deep(.p-splitbutton-defaultbutton):focus,
.ticket-split-button :deep(.p-splitbutton-menubutton):focus {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}

.ticket-datatable :deep(.p-datatable-tbody > tr[tabindex='0']) {
    cursor: pointer;
}

.ticket-datatable :deep(.p-datatable-tbody > tr[tabindex='0']:focus) {
    background: var(--primary-100) !important;
    outline: 2px solid var(--primary-500);
    outline-offset: -2px;
}

/* Modo alto contraste */
@media (prefers-contrast: high) {
    .ticket-table-container {
        border: 2px solid var(--text-color);
    }

    .ticket-table-header {
        background: var(--text-color);
        color: var(--surface-card);
    }

    .ticket-status-tag {
        border: 2px solid var(--text-color);
        background: var(--surface-card);
        color: var(--text-color);
    }
}

/* Reducción de movimiento para usuarios sensibles */
@media (prefers-reduced-motion: reduce) {
    .ticket-table-container,
    .ticket-datatable :deep(.p-datatable-tbody > tr) {
        animation: none;
        transition: none;
    }
}
</style>
