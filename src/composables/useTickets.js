import { apiUtils } from '@/api/axios.js';
import { useTicketsStore } from '@/store/ticketsStore.js';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';

/**
 * Composable para manejo de tickets con lógica de negocio
 * Proporciona métodos de alto nivel para operaciones CRUD y filtrado
 */
export function useTickets() {
    const ticketsStore = useTicketsStore();
    const toast = useToast();

    // Estados locales para operaciones específicas
    const isInitialized = ref(false);
    const operationInProgress = ref(false);

    // Computadas del store
    const tickets = computed(() => ticketsStore.state.tickets);
    const allTickets = computed(() => ticketsStore.allTickets);
    const isLoading = computed(() => ticketsStore.state.isLoading);
    const isSaving = computed(() => ticketsStore.state.isSaving);
    const isDeleting = computed(() => ticketsStore.state.isDeleting);
    const currentTicket = computed(() => ticketsStore.state.currentTicket);

    const statusOptions = computed(() => ticketsStore.statusOptions);
    const sortOptions = computed(() => ticketsStore.sortOptions);

    // Métodos de inicialización
    const initializeTickets = async (showLoading = true) => {
        if (isInitialized.value && ticketsStore.state.lastFetch) {
            // Si ya está inicializado y tiene datos recientes, no recargar
            const timeSinceLastFetch = Date.now() - ticketsStore.state.lastFetch;
            if (timeSinceLastFetch < 60000) {
                // 1 minuto de caché
                return;
            }
        }

        try {
            await loadTickets(showLoading);
            isInitialized.value = true;
        } catch (error) {
            handleError(error, 'Error al inicializar tickets');
            throw error;
        }
    };

    const loadTickets = async (showLoading = true) => {
        try {
            const response = await ticketsStore.fetchTickets();

            if (!showLoading) return response;

            const message = apiUtils.getMessage(response);
            if (message && message !== 'Tickets obtenidos exitosamente') {
                // Customize this message if API returns one
                toast.add({
                    severity: 'success',
                    summary: 'Tickets Cargados',
                    detail: message,
                    life: 3000
                });
            }

            return response;
        } catch (error) {
            handleError(error, 'Error al cargar tickets');
            throw error;
        }
    };

    const refreshTickets = async () => {
        try {
            ticketsStore.state.lastFetch = null; // Force refresh
            await loadTickets(false);

            toast.add({
                severity: 'info',
                summary: 'Lista Actualizada',
                detail: 'Los tickets han sido actualizados correctamente',
                life: 2000
            });
        } catch (error) {
            handleError(error, 'Error al actualizar tickets');
        }
    };

    const loadTicket = async (id) => {
        try {
            const response = await ticketsStore.fetchTicket(id);
            return response;
        } catch (error) {
            handleError(error, `Error al cargar ticket ${id}`);
            throw error;
        }
    };

    // Métodos CRUD con manejo de errores y feedback
    const createTicket = async (ticketData) => {
        operationInProgress.value = true;
        try {
            const response = await ticketsStore.createTicket(ticketData);
            const message = apiUtils.getMessage(response);

            toast.add({
                severity: 'success',
                summary: 'Ticket Creado',
                detail: message || 'El ticket se ha creado correctamente',
                life: 4000
            });

            // Refresh the list to ensure new ticket is visible and filters are applied
            await refreshTickets();

            return response;
        } catch (error) {
            handleError(error, 'Error al crear ticket', true);
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const updateTicket = async (id, ticketData) => {
        operationInProgress.value = true;
        try {
            const response = await ticketsStore.updateTicket(id, ticketData);
            const message = apiUtils.getMessage(response);

            toast.add({
                severity: 'success',
                summary: 'Ticket Actualizado',
                detail: message || 'El ticket se ha actualizado correctamente',
                life: 4000
            });

            // Refresh the list to ensure updated ticket is reflected
            await refreshTickets();

            return response;
        } catch (error) {
            handleError(error, 'Error al actualizar ticket', true);
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const deleteTicket = async (ticket) => {
        operationInProgress.value = true;
        try {
            const response = await ticketsStore.deleteTicket(ticket.id);

            toast.add({
                severity: 'success',
                summary: 'Ticket Eliminado',
                detail: `El ticket "${ticket.title}" ha sido eliminado del sistema`,
                life: 4000
            });

            return response;
        } catch (error) {
            handleError(error, 'Error al eliminar ticket');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    // Métodos de búsqueda y filtrado
    const setGlobalFilter = (value) => {
        ticketsStore.setFilter('global', value);
    };

    const setStatusFilter = (status) => {
        ticketsStore.setFilter('status', status);
    };

    const setSorting = (field, direction = 'asc') => {
        ticketsStore.setSort(field, direction);
    };

    const clearAllFilters = () => {
        ticketsStore.clearFilters();
        toast.add({
            severity: 'info',
            summary: 'Filtros Limpiados',
            detail: 'Se han restablecido todos los filtros de tickets',
            life: 2000
        });
    };

    // Utilidades
    const getTicketById = (id) => {
        return ticketsStore.allTickets.find((ticket) => ticket.id === id);
    };

    const getStatusSeverity = (status) => {
        switch (status) {
            case 'pendiente':
                return 'warning';
            case 'en proceso':
                return 'info';
            case 'concluido':
                return 'success';
            case 'rechazado':
                return 'danger';
            case 'anulado':
                return 'secondary';
            default:
                return 'secondary';
        }
    };

    // Manejo de errores centralizado
    const handleError = (error, defaultMessage, showValidationErrors = false) => {
        console.error(defaultMessage, error);

        const errorMessage = apiUtils.getMessage(error) || defaultMessage;

        if (showValidationErrors && error.errors && typeof error.errors === 'object') {
            const validationErrors = apiUtils.getValidationErrorsFlat(error);

            toast.add({
                severity: 'error',
                summary: 'Errores de Validación',
                detail: validationErrors.length > 0 ? validationErrors.join(', ') : errorMessage,
                life: 6000
            });
        } else if (error.status === 429 || apiUtils.isRateLimited(error)) {
            toast.add({
                severity: 'warn',
                summary: 'Demasiadas Solicitudes',
                detail: 'Por favor, espere un momento antes de intentar nuevamente',
                life: 5000
            });
        } else if (error.status === 403) {
            toast.add({
                severity: 'warn',
                summary: 'Sin Permisos',
                detail: 'No tiene permisos para realizar esta acción',
                life: 4000
            });
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage,
                life: 5000
            });
        }
    };

    return {
        // Estados
        tickets,
        allTickets,
        isLoading,
        isSaving,
        isDeleting,
        currentTicket,
        isInitialized,
        operationInProgress,

        // Opciones
        statusOptions,
        sortOptions,

        // Métodos de inicialización
        initializeTickets,
        loadTickets,
        refreshTickets,
        loadTicket,

        // Métodos CRUD
        createTicket,
        updateTicket,
        deleteTicket,

        // Métodos de búsqueda y filtrado
        setGlobalFilter,
        setStatusFilter,
        setSorting,
        clearAllFilters,

        // Utilidades
        getTicketById,
        getStatusSeverity,
        handleError
    };
}
