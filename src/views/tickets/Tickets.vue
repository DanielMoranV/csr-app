<script setup>
import { useTicketsStore } from '@/store/ticketsStore.js';
import { useToast } from 'primevue/usetoast';
import { onMounted, onUnmounted, reactive, ref } from 'vue';

// Componentes modulares
import ConfirmDialog from '@/components/tickets/ConfirmDialog.vue';
import TicketDialog from '@/components/tickets/TicketDialog.vue';
import TicketFilters from '@/components/tickets/TicketFilters.vue';
import TicketTable from '@/components/tickets/TicketTable.vue';

const ticketsStore = useTicketsStore();
const toast = useToast();

// Estado local de la vista
const ticketDialogVisible = ref(false);
const confirmDialogVisible = ref(false);
const selectedTicket = ref(null);
const isEditing = ref(false);

// Datos del diálogo de confirmación
const confirmData = reactive({
    title: '',
    message: '',
    details: null,
    actionType: 'default',
    ticket: null,
    action: null,
    processingMessage: null,
    requireTextConfirmation: false,
    confirmationText: 'CONFIRMAR'
});

onMounted(() => {
    // Si no hay tickets en el store, los carga
    if (!ticketsStore.tickets || ticketsStore.tickets.length === 0) {
        ticketsStore.fetchTickets();
    }

    // Inicializar listeners de eventos en tiempo real
    ticketsStore.initEchoListeners();
    console.log('[Tickets] Started listening for real-time events');
});

onUnmounted(() => {
    // Limpiar listeners de eventos en tiempo real
    ticketsStore.leaveEchoChannels();
    console.log('[Tickets] Stopped listening for real-time events');
});

// Métodos de gestión de tickets
const openCreateTicketDialog = () => {
    selectedTicket.value = null;
    isEditing.value = false;
    ticketDialogVisible.value = true;
};

const editTicket = (ticket) => {
    selectedTicket.value = { ...ticket };
    isEditing.value = true;
    ticketDialogVisible.value = true;
};

const viewTicketDetails = (ticket) => {
    editTicket(ticket); // Por ahora, usa el mismo diálogo de edición
};

const closeTicketDialog = () => {
    ticketDialogVisible.value = false;
    selectedTicket.value = null;
    isEditing.value = false;
};

const handleSaveTicket = async (ticketData) => {
    try {
        if (isEditing.value && selectedTicket.value?.id) {
            await ticketsStore.updateTicket(selectedTicket.value.id, ticketData);
        } else {
            await ticketsStore.createTicket(ticketData);
        }
        closeTicketDialog();
        toast.add({
            severity: 'success',
            summary: 'Ticket Guardado',
            detail: `Ticket ${isEditing.value ? 'actualizado' : 'creado'} correctamente`,
            life: 3000
        });
        // Refrescar la lista de tickets para mostrar los cambios
        await ticketsStore.fetchTickets();
    } catch (error) {
        console.error('Error al guardar ticket:', error);
        toast.add({
            severity: 'error',
            summary: 'Error al Guardar',
            detail: error.message || 'No se pudo guardar el ticket',
            life: 5000
        });
    }
};

// Métodos de confirmación
const confirmDeleteTicket = (ticket) => {
    Object.assign(confirmData, {
        title: 'Eliminar Ticket',
        message: `¿Está seguro que desea eliminar el ticket "${ticket.title}"?`,
        details: 'Esta acción eliminará permanentemente el ticket y no se puede deshacer.',
        actionType: 'delete',
        ticket: ticket,
        action: () => ticketsStore.deleteTicket(ticket.id),
        processingMessage: 'Eliminando ticket...',
        requireTextConfirmation: true,
        confirmationText: 'ELIMINAR'
    });
    confirmDialogVisible.value = true;
};

const handleConfirmAction = async () => {
    if (confirmData.action) {
        try {
            await confirmData.action();
            closeConfirmDialog();
            toast.add({
                severity: 'success',
                summary: 'Ticket Eliminado',
                detail: `El ticket "${confirmData.ticket.title}" ha sido eliminado`,
                life: 3000
            });
            // Refrescar la lista de tickets para mostrar los cambios
            await ticketsStore.fetchTickets();
        } catch (error) {
            console.error('Error en acción confirmada:', error);
            toast.add({
                severity: 'error',
                summary: 'Error al Eliminar',
                detail: error.message || 'No se pudo eliminar el ticket',
                life: 5000
            });
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
        ticket: null,
        action: null,
        processingMessage: null,
        requireTextConfirmation: false,
        confirmationText: 'CONFIRMAR'
    });
};

// Métodos de utilidad
const getEmptyMessage = () => {
    if (ticketsStore.isLoading) {
        return 'Cargando tickets...';
    }
    if (ticketsStore.tickets.length === 0 && (ticketsStore.filters.search || ticketsStore.filters.status || ticketsStore.filters.priority)) {
        return 'No se encontraron tickets que coincidan con los filtros aplicados. Intente ajustar los criterios de búsqueda.';
    }
    return 'No hay tickets registrados en el sistema. Haga clic en "Nuevo Ticket" para agregar el primero.';
};

const exportTickets = () => {
    try {
        const dataToExport = ticketsStore.tickets.map((ticket) => ({
            ID: ticket.id,
            Título: ticket.title,
            Descripción: ticket.description,
            Estado: ticket.status,
            Prioridad: ticket.priority,
            'Creador ID': ticket.creator_user_id,
            'Creador Nombre': ticket.creator?.name,
            'Asignado ID': ticket.assignee_user_id,
            'Asignado Nombre': ticket.assignee?.name,
            'Posición Asignada': ticket.assignee_position,
            'Fecha Límite': ticket.due_date ? new Date(ticket.due_date).toLocaleString('es-PE') : '',
            'Fecha de Creación': new Date(ticket.created_at).toLocaleString('es-PE')
        }));

        const csvContent = convertToCSV(dataToExport);

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `tickets_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.add({
            severity: 'success',
            summary: 'Exportación Completa',
            detail: `Se exportaron ${ticketsStore.tickets.length} tickets`,
            life: 3000
        });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error de Exportación',
            detail: 'No se pudo exportar la lista de tickets',
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

const getStatusSeverity = (status) => {
    switch (status) {
        case 'pendiente':
            return 'info';
        case 'en proceso':
            return 'warning';
        case 'concluido':
            return 'success';
        case 'rechazado':
            return 'danger';
        case 'anulado':
            return 'secondary';
        default:
            return null;
    }
};

const getPrioritySeverity = (priority) => {
    switch (priority) {
        case 'baja':
            return 'info';
        case 'media':
            return 'warning';
        case 'alta':
            return 'danger';
        case 'urgente':
            return 'danger'; // Or a specific urgent color
        default:
            return null;
    }
};
</script>

<template>
    <div class="tickets-management" :data-loading="ticketsStore.isLoading">
        <!-- Header mejorado -->
        <div class="header-section">
            <div class="header-content">
                <div class="title-section">
                    <div class="title-wrapper">
                        <div class="icon-container">
                            <i class="pi pi-ticket"></i>
                        </div>
                        <div class="title-text">
                            <h1>Gestión de Tickets</h1>
                            <p>Administración y seguimiento de solicitudes y problemas</p>
                        </div>
                    </div>
                    <div class="breadcrumb-section">
                        <span class="breadcrumb-item">Dashboard</span>
                        <i class="pi pi-chevron-right breadcrumb-separator"></i>
                        <span class="breadcrumb-current">Tickets</span>
                    </div>
                </div>

                <!-- Acciones rápidas mejoradas -->
                <div class="actions-section">
                    <div class="quick-actions">
                        <Button icon="pi pi-refresh" class="p-button-outlined action-btn" @click="ticketsStore.fetchTickets()" v-tooltip.bottom="'Actualizar lista'" :loading="ticketsStore.isLoading" severity="secondary" />
                        <Button icon="pi pi-download" class="p-button-outlined action-btn" @click="exportTickets" v-tooltip.bottom="'Exportar tickets'" severity="info" />
                        <Button label="Nuevo Ticket" icon="pi pi-plus" class="primary-action-btn" @click="openCreateTicketDialog" severity="success" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Contenido principal -->
        <div class="main-content">
            <!-- Panel de filtros -->
            <div class="filters-section">
                <TicketFilters />
            </div>

            <!-- Tabla de tickets -->
            <div class="table-section">
                <TicketTable
                    :tickets="ticketsStore.tickets"
                    :loading="ticketsStore.isLoading"
                    :empty-message="getEmptyMessage()"
                    @view-ticket="viewTicketDetails"
                    @edit-ticket="editTicket"
                    @create-ticket="openCreateTicketDialog"
                    @delete-ticket="confirmDeleteTicket"
                    @refresh="ticketsStore.fetchTickets()"
                    :get-status-severity="getStatusSeverity"
                    :get-priority-severity="getPrioritySeverity"
                />
            </div>
        </div>

        <!-- Diálogo de ticket -->
        <TicketDialog v-model:visible="ticketDialogVisible" :ticket="selectedTicket" :saving="ticketsStore.isSaving" @save-ticket="handleSaveTicket" @close="closeTicketDialog" />

        <!-- Diálogo de confirmación -->
        <ConfirmDialog
            v-model:visible="confirmDialogVisible"
            :title="confirmData.title"
            :message="confirmData.message"
            :details="confirmData.details"
            :action-type="confirmData.actionType"
            :ticket="confirmData.ticket"
            :processing="ticketsStore.isDeleting"
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
.tickets-management {
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
    .tickets-management {
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
.tickets-management[data-loading='true'] .main-content > * {
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
