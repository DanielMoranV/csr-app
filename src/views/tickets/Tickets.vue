<script setup>
import { useTicketsStore } from '@/store/ticketsStore.js';
import { useToast } from 'primevue/usetoast';
import { onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';

// Componentes modulares
import ConfirmActionDialog from '@/components/tickets/ConfirmActionDialog.vue';
import TicketDialog from '@/components/tickets/TicketDialog.vue';
import TicketFilters from '@/components/tickets/TicketFilters.vue';
import TicketTable from '@/components/tickets/TicketTable.vue';

const ticketsStore = useTicketsStore();
const toast = useToast();
const route = useRoute();
const router = useRouter();

// Estado local de la vista
const ticketDialogVisible = ref(false);
const confirmDialogVisible = ref(false);
const selectedTicket = ref(null);
const isEditing = ref(false);
const dialogMode = ref('view'); // 'view' | 'edit' | 'create'
const dialogInitialTab = ref(0); // tab inicial para el dialog (0=Detalles, 1=Historial, 2=Comentarios, 3=Adjuntos)
const dialogInitialCommentId = ref(null); // scroll al comentario específico al abrir

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

// Mapa de nombre de tab → índice (0=Detalles, 1=Historial, 2=Comentarios, 3=Adjuntos)
const TAB_INDEX = { details: 0, history: 1, comments: 2, attachments: 3 };

/**
 * Abre el dialog de un ticket por su ID (viene del query param ticket_id).
 * open_tab puede ser: 'comments', 'history', 'attachments' o vacío (Detalles).
 */
const openTicketFromQuery = async (ticketId, openTab = '', commentId = null) => {
    if (!ticketId) return;

    // Buscar el ticket en el store (ya cargado) o hacer fetch individual
    let ticket = ticketsStore.tickets.find((t) => t.id === Number(ticketId));
    if (!ticket) {
        try {
            const { TicketService } = await import('@/api/tickets');
            const { apiUtils } = await import('@/api/axios');
            const response = await TicketService.getTicket(ticketId);
            if (apiUtils.isSuccess(response)) {
                ticket = apiUtils.getData(response);
            }
        } catch {
            return;
        }
    }
    if (!ticket) return;

    dialogInitialTab.value = TAB_INDEX[openTab] ?? 0;
    dialogInitialCommentId.value = commentId ? Number(commentId) : null;
    selectedTicket.value = { ...ticket };
    isEditing.value = true;
    dialogMode.value = 'view';
    ticketDialogVisible.value = true;

    // Limpiar query params para que no se re-abra al navegar back/forward
    router.replace({ path: route.path });
};

onMounted(async () => {
    // Si no hay tickets en el store, los carga
    if (!ticketsStore.tickets || ticketsStore.tickets.length === 0) {
        await ticketsStore.fetchTickets();
    }

    // Abrir ticket si viene de una notificación via query params
    if (route.query.ticket_id) {
        openTicketFromQuery(route.query.ticket_id, route.query.open_tab, route.query.comment_id);
    }
});

// Manejar navegación por query params mientras la vista ya está montada
watch(
    () => route.query.ticket_id,
    (ticketId) => {
        if (ticketId) {
            openTicketFromQuery(ticketId, route.query.open_tab, route.query.comment_id);
        }
    }
);

// Los canales Echo se gestionan globalmente desde authStore (login/logout).
// Esta vista no necesita suscribir ni cancelar canales en su ciclo de vida.

// Métodos de gestión de tickets
const openCreateTicketDialog = () => {
    selectedTicket.value = null;
    isEditing.value = false;
    dialogMode.value = 'create';
    ticketDialogVisible.value = true;
};

const editTicket = (ticket) => {
    selectedTicket.value = { ...ticket };
    isEditing.value = true;
    dialogMode.value = 'edit';
    ticketDialogVisible.value = true;
};

const viewTicketDetails = (ticket) => {
    selectedTicket.value = { ...ticket };
    isEditing.value = true; // Es un ticket existente
    dialogMode.value = 'view'; // Pero abre en modo lectura
    ticketDialogVisible.value = true;
};

const switchToEditMode = () => {
    dialogMode.value = 'edit';
};

const closeTicketDialog = () => {
    ticketDialogVisible.value = false;
    selectedTicket.value = null;
    isEditing.value = false;
    dialogMode.value = 'view';
    dialogInitialTab.value = 0;
    dialogInitialCommentId.value = null;
};

const handleSaveTicket = async (ticketData) => {
    try {
        if (isEditing.value && selectedTicket.value?.id) {
            await ticketsStore.updateTicket(selectedTicket.value.id, ticketData);
        } else {
            await ticketsStore.createTicket(ticketData);
        }
        closeTicketDialog();
        // El store ya muestra el toast de éxito; la lista se actualiza por broadcast
    } catch (error) {
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
            const deletedTitle = confirmData.ticket.title;
            await confirmData.action();
            closeConfirmDialog();
            toast.add({
                severity: 'success',
                summary: 'Ticket Eliminado',
                detail: `El ticket "${deletedTitle}" ha sido eliminado`,
                life: 3000
            });
            // deleteTicket ya actualiza el state local (splice); no se necesita refetch
        } catch (error) {
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
            'Creador ID': ticket.creator?.id,
            'Creador Nombre': ticket.creator?.name,
            'Asignado ID': ticket.assignee?.id,
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
    <div class="page">

        <!-- ═══ Header unificado ═══ -->
        <div class="page-header">

            <!-- Franja de color superior -->
            <div class="header-accent"></div>

            <!-- Fila principal: título | KPI chips | acciones -->
            <div class="header-main">

                <!-- Título + breadcrumb -->
                <div class="ph-title">
                    <div class="title-line">
                        <div class="title-icon">
                            <i class="pi pi-ticket"></i>
                        </div>
                        <div class="title-text">
                            <h1 class="title-h1">Gestión de Tickets</h1>
                            <div class="breadcrumb">
                                <span>Dashboard</span>
                                <i class="pi pi-chevron-right"></i>
                                <span class="bc-active">Tickets</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- KPI chips (se posicionan en el centro en desktop, bajan a fila propia en tablet/mobile) -->
                <div class="ph-kpi" v-if="ticketsStore.mySummary.total > 0">
                    <button
                        class="kpi-chip kpi-total"
                        @click="ticketsStore.clearFilters()"
                        v-tooltip.bottom="'Ver todos mis tickets asignados'"
                    >
                        <i class="pi pi-ticket"></i>
                        <span class="kpi-n">{{ ticketsStore.mySummary.total }}</span>
                        <span class="kpi-l">Mis Tickets</span>
                    </button>
                    <button
                        v-if="ticketsStore.mySummary.by_status.pendiente"
                        class="kpi-chip kpi-pendiente"
                        @click="ticketsStore.setFilter('status', 'pendiente')"
                        v-tooltip.bottom="'Filtrar por Pendiente'"
                    >
                        <i class="pi pi-clock"></i>
                        <span class="kpi-n">{{ ticketsStore.mySummary.by_status.pendiente }}</span>
                        <span class="kpi-l">Pendientes</span>
                    </button>
                    <button
                        v-if="ticketsStore.mySummary.by_status['en proceso']"
                        class="kpi-chip kpi-proceso"
                        @click="ticketsStore.setFilter('status', 'en proceso')"
                        v-tooltip.bottom="'Filtrar por En Proceso'"
                    >
                        <i class="pi pi-sync"></i>
                        <span class="kpi-n">{{ ticketsStore.mySummary.by_status['en proceso'] }}</span>
                        <span class="kpi-l">En Proceso</span>
                    </button>
                </div>

                <!-- Acciones -->
                <div class="ph-actions">
                    <Button
                        icon="pi pi-refresh"
                        class="action-btn secondary-action"
                        outlined
                        severity="secondary"
                        @click="ticketsStore.fetchTickets()"
                        v-tooltip.bottom="'Actualizar lista'"
                        :loading="ticketsStore.isLoading"
                    />
                    <Button
                        icon="pi pi-download"
                        class="action-btn secondary-action"
                        outlined
                        severity="info"
                        @click="exportTickets"
                        v-tooltip.bottom="'Exportar tickets'"
                    />
                    <Button
                        icon="pi pi-sliders-h"
                        class="action-btn secondary-action"
                        outlined
                        severity="warn"
                        @click="router.push({ name: 'ticket-gantt' })"
                        v-tooltip.bottom="'Diagrama de Gantt'"
                    />
                    <Button
                        label="Nuevo Ticket"
                        icon="pi pi-plus"
                        class="new-btn"
                        severity="success"
                        @click="openCreateTicketDialog"
                    />
                </div>

            </div>

            <!-- Fila de filtros (dentro de la misma card, separada con borde) -->
            <div class="header-filters">
                <TicketFilters />
            </div>

        </div>

        <!-- ═══ Tabla de tickets ═══ -->
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

        <!-- Diálogo de ticket -->
        <TicketDialog
            v-model:visible="ticketDialogVisible"
            :ticket="selectedTicket"
            :saving="ticketsStore.isSaving"
            :mode="dialogMode"
            :initial-tab="dialogInitialTab"
            :initial-comment-id="dialogInitialCommentId"
            @save-ticket="handleSaveTicket"
            @close="closeTicketDialog"
            @switch-to-edit="switchToEditMode"
        />

        <!-- Diálogo de confirmación -->
        <ConfirmActionDialog
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

    </div>
</template>

<style scoped>
/* ─── Página ─── */
.page {
    min-height: 100vh;
    background: var(--surface-ground);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* ─── Header card ─── */
.page-header {
    background: var(--surface-card);
    border-radius: 12px;
    border: 1px solid var(--surface-border);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
    overflow: hidden;
}

.header-accent {
    height: 3px;
    background: linear-gradient(90deg, var(--primary-500) 0%, var(--primary-300) 50%, var(--primary-500) 100%);
    background-size: 200% 100%;
    animation: shimmer 4s linear infinite;
}

@keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* ─── Fila principal: título | kpi-chips | acciones ─── */
.header-main {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.9rem 1.25rem;
    flex-wrap: wrap;
}

/* ── Título ── */
.ph-title {
    flex: 0 0 auto;
    order: 1;
}

.title-line {
    display: flex;
    align-items: center;
    gap: 0.65rem;
}

.title-icon {
    width: 38px;
    height: 38px;
    background: var(--primary-50);
    border: 1px solid var(--primary-100);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-600);
    font-size: 1rem;
    flex-shrink: 0;
}

.title-h1 {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0;
    line-height: 1.2;
    white-space: nowrap;
}

.breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    margin-top: 0.1rem;
}

.breadcrumb i { font-size: 0.55rem; }
.bc-active { color: var(--primary-500); font-weight: 600; }

/* ── KPI chips ── */
.ph-kpi {
    flex: 1 1 auto;
    order: 2;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
    justify-content: center;
    min-width: 0;
}

.kpi-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.32rem 0.7rem;
    border-radius: 20px;
    border: 1px solid transparent;
    background: none;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
    user-select: none;
}

.kpi-chip:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
    filter: brightness(0.95);
}

.kpi-chip i { font-size: 0.76rem; }

.kpi-n {
    font-size: 0.95rem;
    font-weight: 800;
    line-height: 1;
}

.kpi-l {
    font-size: 0.7rem;
    font-weight: 600;
    opacity: 0.85;
}

.kpi-total     { background: var(--primary-50);  color: var(--primary-700);  border-color: var(--primary-200); }
.kpi-pendiente { background: #fef3c7;             color: #92400e;             border-color: #fde68a; }
.kpi-proceso   { background: #dbeafe;             color: #1e40af;             border-color: #bfdbfe; }

/* ── Acciones ── */
.ph-actions {
    flex: 0 0 auto;
    order: 3;
    display: flex;
    align-items: center;
    gap: 0.45rem;
}

.action-btn {
    width: 2.25rem !important;
    height: 2.25rem !important;
    padding: 0 !important;
    border-radius: 8px !important;
    transition: transform 0.15s, box-shadow 0.15s !important;
}

.action-btn:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
}

.new-btn {
    border-radius: 8px;
    font-weight: 600;
    white-space: nowrap;
    transition: transform 0.15s, box-shadow 0.15s;
}

.new-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

/* ─── Fila de filtros ─── */
.header-filters {
    border-top: 1px solid var(--surface-100);
}

/* Anular estilos de Card de TicketFilters dentro del header */
:deep(.header-filters .p-card) {
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    margin: 0 !important;
}

:deep(.header-filters .p-card:hover) {
    box-shadow: none !important;
    transform: none !important;
}

:deep(.header-filters .p-card-header) {
    display: none !important;
}

:deep(.header-filters .p-card-body) {
    padding: 0 !important;
}

:deep(.header-filters .p-card-content) {
    padding: 0 !important;
}

:deep(.header-filters .filter-grid) {
    padding: 0.75rem 1.25rem !important;
    gap: 0.75rem !important;
}

/* ─── Tablet (768–1023px): KPIs bajan a fila propia ─── */
@media (min-width: 768px) and (max-width: 1023px) {
    .ph-kpi {
        order: 4;
        flex: 0 0 100%;
        justify-content: flex-start;
        padding: 0.5rem 0 0.15rem;
        border-top: 1px solid var(--surface-100);
        margin-top: 0.35rem;
    }
}

/* ─── Mobile (<768px): apilado, botones secundarios ocultos ─── */
@media (max-width: 767px) {
    .page { padding: 0.75rem; gap: 0.75rem; }
    .header-main { padding: 0.75rem; gap: 0.5rem; }

    .ph-kpi {
        order: 4;
        flex: 0 0 100%;
        justify-content: flex-start;
        padding: 0.45rem 0 0;
        border-top: 1px solid var(--surface-100);
        margin-top: 0.25rem;
    }

    .kpi-l { display: none; }
    .kpi-chip { padding: 0.3rem 0.55rem; }
    .kpi-n { font-size: 0.9rem; }

    .secondary-action { display: none !important; }

    .title-h1 { font-size: 0.95rem; }

    :deep(.header-filters .filter-grid) {
        padding: 0.65rem 0.75rem !important;
    }
}

/* ─── Accesibilidad ─── */
.kpi-chip:focus-visible,
.action-btn:focus-visible,
.new-btn:focus-visible {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
}
</style>
