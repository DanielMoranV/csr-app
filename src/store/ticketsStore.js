import { apiUtils } from '@/api/axios.js';
import { TicketService } from '@/api/index.js';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

export const useTicketsStore = defineStore('tickets', () => {
    // Estado reactivo
    const state = reactive({
        tickets: [],
        currentTicket: null,
        isLoading: false,
        isSaving: false,
        isDeleting: false,
        lastFetch: null,
        filters: {
            global: '',
            status: null,
            sort_by: 'created_at',
            sort_direction: 'desc'
        }
    });

    // Computadas
    const allTickets = computed(() => state.tickets);
    const pendingTickets = computed(() => state.tickets.filter((ticket) => ticket.status === 'pendiente'));
    const inProcessTickets = computed(() => state.tickets.filter((ticket) => ticket.status === 'en proceso'));
    const concludedTickets = computed(() => state.tickets.filter((ticket) => ticket.status === 'concluido'));

    // Opciones para dropdowns de estado
    const statusOptions = computed(() => [
        { label: 'Pendiente', value: 'pendiente' },
        { label: 'En Proceso', value: 'en proceso' },
        { label: 'Concluido', value: 'concluido' },
        { label: 'Rechazado', value: 'rechazado' },
        { label: 'Anulado', value: 'anulado' }
    ]);

    const sortOptions = computed(() => [
        { label: 'Título', value: 'title' },
        { label: 'Estado', value: 'status' },
        { label: 'Fecha de Creación', value: 'created_at' },
        { label: 'Fecha Límite', value: 'due_date' }
    ]);

    // Métodos de API
    const fetchTickets = async (params = {}) => {
        state.isLoading = true;
        try {
            const response = await TicketService.getTickets({
                ...state.filters,
                ...params
            });

            console.log('Fetch Tickets Response:', response);

            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.tickets = data || [];
                state.lastFetch = Date.now();
                return response;
            } else {
                throw response;
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const fetchTicket = async (id) => {
        state.isLoading = true;
        try {
            const response = await TicketService.getTicket(id);
            if (apiUtils.isSuccess(response)) {
                state.currentTicket = apiUtils.getData(response);
                return response;
            } else {
                throw response;
            }
        } catch (error) {
            console.error(`Error fetching ticket ${id}:`, error);
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const createTicket = async (ticketData) => {
        state.isSaving = true;
        try {
            const response = await TicketService.createTicket(ticketData);
            if (apiUtils.isSuccess(response)) {
                const newTicket = apiUtils.getData(response);
                state.tickets.push(newTicket);
                return response;
            } else {
                throw response;
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const updateTicket = async (id, ticketData) => {
        state.isSaving = true;
        try {
            const response = await TicketService.updateTicket(id, ticketData);
            if (apiUtils.isSuccess(response)) {
                const updatedTicket = apiUtils.getData(response);
                const index = state.tickets.findIndex((t) => t.id === id);
                if (index !== -1) {
                    state.tickets[index] = updatedTicket;
                }
                // If currentTicket is being updated, refresh it
                if (state.currentTicket && state.currentTicket.id === id) {
                    state.currentTicket = updatedTicket;
                }
                return response;
            } else {
                throw response;
            }
        } catch (error) {
            console.error(`Error updating ticket ${id}:`, error);
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const deleteTicket = async (id) => {
        state.isDeleting = true;
        try {
            const response = await TicketService.deleteTicket(id);
            if (apiUtils.isSuccess(response)) {
                const index = state.tickets.findIndex((t) => t.id === id);
                if (index !== -1) {
                    state.tickets.splice(index, 1);
                }
                return response;
            } else {
                throw response;
            }
        } catch (error) {
            console.error(`Error deleting ticket ${id}:`, error);
            throw error;
        } finally {
            state.isDeleting = false;
        }
    };

    // Métodos de filtros
    const setFilter = (key, value) => {
        state.filters[key] = value;
    };

    const clearFilters = () => {
        state.filters = {
            global: '',
            status: null,
            sort_by: 'created_at',
            sort_direction: 'desc'
        };
    };

    const setSort = (field, direction = 'asc') => {
        state.filters.sort_by = field;
        state.filters.sort_direction = direction;
    };

    // Método para resetear el estado
    const resetState = () => {
        state.tickets = [];
        state.currentTicket = null;
        state.isLoading = false;
        state.isSaving = false;
        state.isDeleting = false;
        state.lastFetch = null;
        clearFilters();
    };

    return {
        // Estado
        state,

        // Computadas
        allTickets,
        pendingTickets,
        inProcessTickets,
        concludedTickets,
        statusOptions,
        sortOptions,

        // Métodos de API
        fetchTickets,
        fetchTicket,
        createTicket,
        updateTicket,
        deleteTicket,

        // Métodos de filtros
        setFilter,
        clearFilters,
        setSort,

        // Utilidades
        resetState
    };
});
