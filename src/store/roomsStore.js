import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import { rooms as roomsApi } from '@/api/rooms';
import { beds as bedsApi } from '@/api/beds';
import { apiUtils } from '@/api/axios.js';

export const useRoomsStore = defineStore('rooms', () => {
    // State
    const state = reactive({
        rooms: [],
        currentRoom: null,
        isLoading: false,
        isSaving: false,
        isDeleting: false,
        lastFetch: null,
        filters: {
            global: '',
            is_active: null,
            sort_by: 'number',
            sort_direction: 'asc'
        }
    });

    // Getters
    const allRooms = computed(() => state.rooms);
    const activeRooms = computed(() => state.rooms.filter((room) => room.is_active));
    const inactiveRooms = computed(() => state.rooms.filter((room) => !room.is_active));

    const filteredRooms = computed(() => {
        let filtered = [...state.rooms];

        if (state.filters.global) {
            const searchTerm = state.filters.global.toLowerCase();
            filtered = filtered.filter((room) => room.number.toLowerCase().includes(searchTerm) || (room.notes && room.notes.toLowerCase().includes(searchTerm)));
        }

        if (state.filters.is_active !== null) {
            filtered = filtered.filter((room) => room.is_active === state.filters.is_active);
        }

        if (state.filters.sort_by) {
            filtered.sort((a, b) => {
                const fieldA = a[state.filters.sort_by];
                const fieldB = b[state.filters.sort_by];
                let comparison = 0;
                if (fieldA < fieldB) comparison = -1;
                if (fieldA > fieldB) comparison = 1;
                return state.filters.sort_direction === 'desc' ? -comparison : comparison;
            });
        }

        return filtered;
    });

    // Actions for Rooms
    const fetchRooms = async (params = {}) => {
        state.isLoading = true;
        try {
            const response = await roomsApi.getAll({ ...state.filters, ...params });
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.rooms = Array.isArray(data) ? data : data.data || [];
                state.lastFetch = Date.now();
                return response;
            }
            throw response;
        } catch (error) {
            console.error('Error fetching rooms:', error);
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const createRoom = async (roomData) => {
        state.isSaving = true;
        try {
            const response = await roomsApi.create(roomData);
            if (apiUtils.isSuccess(response)) {
                const newRoom = apiUtils.getData(response);
                state.rooms.push(newRoom);
                return response;
            }
            throw response;
        } catch (error) {
            console.error('Error creating room:', error);
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const updateRoom = async (id, roomData) => {
        state.isSaving = true;
        try {
            const response = await roomsApi.update(id, roomData);
            if (apiUtils.isSuccess(response)) {
                const updatedRoom = apiUtils.getData(response);
                const index = state.rooms.findIndex((r) => r.id === id);
                if (index !== -1) {
                    state.rooms[index] = { ...state.rooms[index], ...updatedRoom };
                }
                return response;
            }
            throw response;
        } catch (error) {
            console.error('Error updating room:', error);
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const deleteRoom = async (id) => {
        state.isDeleting = true;
        try {
            const response = await roomsApi.delete(id);
            if (apiUtils.isSuccess(response)) {
                const index = state.rooms.findIndex((r) => r.id === id);
                if (index !== -1) {
                    state.rooms.splice(index, 1);
                }
                return response;
            }
            throw response;
        } catch (error) {
            console.error('Error deleting room:', error);
            throw error;
        } finally {
            state.isDeleting = false;
        }
    };

    const toggleRoomStatus = async (id) => {
        state.isSaving = true;
        try {
            const response = await roomsApi.toggleStatus(id);
            if (apiUtils.isSuccess(response)) {
                const updatedRoom = apiUtils.getData(response);
                const index = state.rooms.findIndex((r) => r.id === id);
                if (index !== -1) {
                    state.rooms[index].is_active = updatedRoom.is_active;
                }
                return response;
            }
            throw response;
        } catch (error) {
            console.error('Error toggling room status:', error);
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    // Actions for Beds
    const addBed = async (bedData) => {
        state.isSaving = true;
        try {
            const response = await bedsApi.create(bedData);
            if (apiUtils.isSuccess(response)) {
                const newBed = apiUtils.getData(response);
                const roomIndex = state.rooms.findIndex((r) => r.id === newBed.id_rooms);
                if (roomIndex !== -1) {
                    state.rooms[roomIndex].beds.push(newBed);
                }
                return response;
            }
            throw response;
        } catch (error) {
            console.error('Error creating bed:', error);
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const updateBed = async (bedId, bedData) => {
        state.isSaving = true;
        try {
            const response = await bedsApi.update(bedId, bedData);
            if (apiUtils.isSuccess(response)) {
                const updatedBed = apiUtils.getData(response);
                const roomIndex = state.rooms.findIndex((r) => r.id === updatedBed.id_rooms);
                if (roomIndex !== -1) {
                    const bedIndex = state.rooms[roomIndex].beds.findIndex((b) => b.id === bedId);
                    if (bedIndex !== -1) {
                        state.rooms[roomIndex].beds[bedIndex] = updatedBed;
                    }
                }
                return response;
            }
            throw response;
        } catch (error) {
            console.error('Error updating bed:', error);
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const deleteBed = async (bedId, roomId) => {
        state.isDeleting = true;
        try {
            const response = await bedsApi.delete(bedId);
            if (apiUtils.isSuccess(response)) {
                const roomIndex = state.rooms.findIndex((r) => r.id === roomId);
                if (roomIndex !== -1) {
                    state.rooms[roomIndex].beds = state.rooms[roomIndex].beds.filter((b) => b.id !== bedId);
                }
                return response;
            }
            throw response;
        } catch (error) {
            console.error('Error deleting bed:', error);
            throw error;
        } finally {
            state.isDeleting = false;
        }
    };

    const toggleBedStatus = async (bedId, roomId) => {
        state.isSaving = true;
        try {
            const response = await bedsApi.toggleStatus(bedId);
            if (apiUtils.isSuccess(response)) {
                const updatedBed = apiUtils.getData(response);
                const roomIndex = state.rooms.findIndex((r) => r.id === roomId);
                if (roomIndex !== -1) {
                    const bedIndex = state.rooms[roomIndex].beds.findIndex((b) => b.id === bedId);
                    if (bedIndex !== -1) {
                        state.rooms[roomIndex].beds[bedIndex].is_active = updatedBed.is_active;
                    }
                }
                return response;
            }
            throw response;
        } catch (error) {
            console.error('Error toggling bed status:', error);
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    // Filters
    const setFilter = (key, value) => {
        state.filters[key] = value;
    };

    const clearFilters = () => {
        state.filters = {
            global: '',
            is_active: null,
            sort_by: 'number',
            sort_direction: 'asc'
        };
    };

    return {
        state,
        allRooms,
        activeRooms,
        inactiveRooms,
        filteredRooms,
        fetchRooms,
        createRoom,
        updateRoom,
        deleteRoom,
        toggleRoomStatus,
        addBed,
        updateBed,
        deleteBed,
        toggleBedStatus,
        setFilter,
        clearFilters
    };
});
