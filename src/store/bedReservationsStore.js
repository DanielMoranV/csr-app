import { bedReservations } from '@/api/bedReservations';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

export const useBedReservationsStore = defineStore('bedReservations', () => {
    // State
    const state = reactive({
        reservations: [],
        activeReservations: [],
        isLoading: false,
        error: null,
        lastFetch: null,
        pagination: null
    });

    // Getters
    const allReservations = computed(() => state.reservations);
    const activeReservations = computed(() => state.activeReservations);
    const isLoading = computed(() => state.isLoading);
    const error = computed(() => state.error);

    /**
     * Get reservations for a specific bed
     */
    const getReservationsByBed = computed(() => (bedId) => {
        return state.activeReservations.filter((reservation) => reservation.id_beds === bedId);
    });

    /**
     * Get active reservation for a specific bed
     */
    const getActiveReservationForBed = computed(() => (bedId) => {
        return state.activeReservations.find((reservation) => reservation.id_beds === bedId && reservation.status === 'activa');
    });

    // Actions

    /**
     * Fetch all reservations with optional filters
     */
    const fetchReservations = async (params = {}) => {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await bedReservations.getAll(params);

            console.log('[BedReservationsStore] Fetched reservations:', response);

            if (response && response.data) {
                const responseData = response.data.data || response.data;

                // Handle both paginated and non-paginated responses
                if (Array.isArray(responseData)) {
                    state.reservations = responseData;
                } else if (responseData.data && Array.isArray(responseData.data)) {
                    state.reservations = responseData.data;
                    state.pagination = responseData.pagination || null;
                } else {
                    state.reservations = [];
                }

                state.lastFetch = Date.now();
            } else {
                throw new Error('Invalid response structure');
            }
        } catch (error) {
            console.error('[BedReservationsStore] Error fetching reservations:', error);
            state.error = 'Failed to fetch reservations';
            state.reservations = [];
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Fetch only active reservations
     */
    const fetchActiveReservations = async () => {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await bedReservations.getActive();

            console.log('[BedReservationsStore] Fetched active reservations:', response);

            if (response && response.data) {
                const responseData = response.data.data || response.data;

                if (Array.isArray(responseData)) {
                    state.activeReservations = responseData;
                } else if (responseData.data && Array.isArray(responseData.data)) {
                    state.activeReservations = responseData.data;
                } else {
                    state.activeReservations = [];
                }

                state.lastFetch = Date.now();
            } else {
                throw new Error('Invalid response structure');
            }
        } catch (error) {
            console.error('[BedReservationsStore] Error fetching active reservations:', error);
            state.error = 'Failed to fetch active reservations';
            state.activeReservations = [];
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Fetch a single reservation by ID
     */
    const fetchReservationById = async (id) => {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await bedReservations.getById(id);

            console.log('[BedReservationsStore] Fetched reservation:', response);

            if (response && response.data) {
                return response.data.data || response.data;
            } else {
                throw new Error('Invalid response structure');
            }
        } catch (error) {
            console.error('[BedReservationsStore] Error fetching reservation:', error);
            state.error = 'Failed to fetch reservation';
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Create a new reservation
     */
    const createReservation = async (reservationData) => {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await bedReservations.create(reservationData);

            console.log('[BedReservationsStore] Created reservation:', response);

            if (response && response.data) {
                const newReservation = response.data.data || response.data;

                // Add to reservations list
                state.reservations.unshift(newReservation);

                // Add to active reservations if status is 'activa'
                if (newReservation.status === 'activa') {
                    state.activeReservations.unshift(newReservation);
                }

                return newReservation;
            } else {
                throw new Error('Invalid response structure');
            }
        } catch (error) {
            console.error('[BedReservationsStore] Error creating reservation:', error);
            state.error = error.response?.data?.message || 'Failed to create reservation';
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Update an existing reservation
     */
    const updateReservation = async (id, reservationData) => {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await bedReservations.update(id, reservationData);

            console.log('[BedReservationsStore] Updated reservation:', response);

            if (response && response.data) {
                const updatedReservation = response.data.data || response.data;

                // Update in reservations list
                const index = state.reservations.findIndex((r) => r.id === id);
                if (index !== -1) {
                    state.reservations[index] = updatedReservation;
                }

                // Update in active reservations
                const activeIndex = state.activeReservations.findIndex((r) => r.id === id);
                if (updatedReservation.status === 'activa') {
                    if (activeIndex !== -1) {
                        state.activeReservations[activeIndex] = updatedReservation;
                    } else {
                        state.activeReservations.unshift(updatedReservation);
                    }
                } else {
                    // Remove from active if status changed
                    if (activeIndex !== -1) {
                        state.activeReservations.splice(activeIndex, 1);
                    }
                }

                return updatedReservation;
            } else {
                throw new Error('Invalid response structure');
            }
        } catch (error) {
            console.error('[BedReservationsStore] Error updating reservation:', error);
            state.error = error.response?.data?.message || 'Failed to update reservation';
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Cancel a reservation
     */
    const cancelReservation = async (id) => {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await bedReservations.cancel(id);

            console.log('[BedReservationsStore] Cancelled reservation:', response);

            if (response && response.data) {
                const cancelledReservation = response.data.data || response.data;

                // Update in reservations list
                const index = state.reservations.findIndex((r) => r.id === id);
                if (index !== -1) {
                    state.reservations[index] = cancelledReservation;
                }

                // Remove from active reservations
                const activeIndex = state.activeReservations.findIndex((r) => r.id === id);
                if (activeIndex !== -1) {
                    state.activeReservations.splice(activeIndex, 1);
                }

                return cancelledReservation;
            } else {
                throw new Error('Invalid response structure');
            }
        } catch (error) {
            console.error('[BedReservationsStore] Error cancelling reservation:', error);
            state.error = error.response?.data?.message || 'Failed to cancel reservation';
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Fetch reservations for a specific bed
     */
    const fetchReservationsByBed = async (bedId, params = {}) => {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await bedReservations.getByBed(bedId, params);

            console.log('[BedReservationsStore] Fetched reservations for bed:', response);

            if (response && response.data) {
                const responseData = response.data.data || response.data;
                return Array.isArray(responseData) ? responseData : responseData.data || [];
            } else {
                throw new Error('Invalid response structure');
            }
        } catch (error) {
            console.error('[BedReservationsStore] Error fetching reservations for bed:', error);
            state.error = 'Failed to fetch reservations for bed';
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Fetch reservations for a specific user
     */
    const fetchReservationsByUser = async (userId, params = {}) => {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await bedReservations.getByUser(userId, params);

            console.log('[BedReservationsStore] Fetched reservations for user:', response);

            if (response && response.data) {
                const responseData = response.data.data || response.data;
                return Array.isArray(responseData) ? responseData : responseData.data || [];
            } else {
                throw new Error('Invalid response structure');
            }
        } catch (error) {
            console.error('[BedReservationsStore] Error fetching reservations for user:', error);
            state.error = 'Failed to fetch reservations for user';
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Clear error state
     */
    const clearError = () => {
        state.error = null;
    };

    /**
     * Reset store to initial state
     */
    const resetStore = () => {
        state.reservations = [];
        state.activeReservations = [];
        state.isLoading = false;
        state.error = null;
        state.lastFetch = null;
        state.pagination = null;
    };

    return {
        // State
        state,

        // Getters
        allReservations,
        activeReservations,
        isLoading,
        error,
        getReservationsByBed,
        getActiveReservationForBed,

        // Actions
        fetchReservations,
        fetchActiveReservations,
        fetchReservationById,
        createReservation,
        updateReservation,
        cancelReservation,
        fetchReservationsByBed,
        fetchReservationsByUser,
        clearError,
        resetStore
    };
});
