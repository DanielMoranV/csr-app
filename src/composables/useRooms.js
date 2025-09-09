import { useRoomsStore } from '@/store/roomsStore';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';
import { apiUtils } from '@/api/axios.js';

export function useRooms() {
    const roomsStore = useRoomsStore();
    const toast = useToast();

    const operationInProgress = ref(false);

    // Store state
    const rooms = computed(() => roomsStore.filteredRooms);
    const allRooms = computed(() => roomsStore.allRooms);
    const isLoading = computed(() => roomsStore.state.isLoading);
    const isSaving = computed(() => roomsStore.state.isSaving);

    // Filter options
    const statusOptions = computed(() => [
        { label: 'Activas', value: true },
        { label: 'Inactivas', value: false }
    ]);

    const sortOptions = computed(() => [
        { label: 'Número', value: 'number' },
        { label: 'Fecha de creación', value: 'created_at' }
    ]);

    // Actions for Rooms
    const fetchRooms = async () => {
        try {
            await roomsStore.fetchRooms();
        } catch (error) {
            handleError(error, 'Error al cargar las habitaciones');
        }
    };

    const createRoom = async (roomData) => {
        operationInProgress.value = true;
        try {
            const response = await roomsStore.createRoom(roomData);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Habitación creada correctamente', life: 3000 });
            return response;
        } catch (error) {
            handleError(error, 'Error al crear la habitación');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const updateRoom = async (id, roomData) => {
        operationInProgress.value = true;
        try {
            const response = await roomsStore.updateRoom(id, roomData);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Habitación actualizada correctamente', life: 3000 });
            return response;
        } catch (error) {
            handleError(error, 'Error al actualizar la habitación');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const deleteRoom = async (id) => {
        operationInProgress.value = true;
        try {
            await roomsStore.deleteRoom(id);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Habitación eliminada correctamente', life: 3000 });
        } catch (error) {
            handleError(error, 'Error al eliminar la habitación');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const toggleRoomStatus = async (room) => {
        operationInProgress.value = true;
        const action = room.is_active ? 'desactivada' : 'activada';
        try {
            await roomsStore.toggleRoomStatus(room.id);
            toast.add({ severity: 'info', summary: 'Estado Cambiado', detail: `La habitación ha sido ${action}`, life: 3000 });
        } catch (error) {
            handleError(error, 'Error al cambiar el estado de la habitación');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    // Actions for Beds
    const addBed = async (bedData) => {
        operationInProgress.value = true;
        try {
            const response = await roomsStore.addBed(bedData);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Cama creada correctamente', life: 3000 });
            return response;
        } catch (error) {
            handleError(error, 'Error al crear la cama');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const updateBed = async (bedId, bedData) => {
        operationInProgress.value = true;
        try {
            const response = await roomsStore.updateBed(bedId, bedData);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Cama actualizada correctamente', life: 3000 });
            return response;
        } catch (error) {
            handleError(error, 'Error al actualizar la cama');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const deleteBed = async (bedId, roomId) => {
        operationInProgress.value = true;
        try {
            await roomsStore.deleteBed(bedId, roomId);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Cama eliminada correctamente', life: 3000 });
        } catch (error) {
            handleError(error, 'Error al eliminar la cama');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const toggleBedStatus = async (bed) => {
        operationInProgress.value = true;
        const action = bed.is_active ? 'desactivada' : 'activada';
        try {
            await roomsStore.toggleBedStatus(bed.id, bed.id_rooms);
            toast.add({ severity: 'info', summary: 'Estado Cambiado', detail: `La cama ha sido ${action}`, life: 3000 });
        } catch (error) {
            handleError(error, 'Error al cambiar el estado de la cama');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    // Filters
    const setGlobalFilter = (value) => roomsStore.setFilter('global', value);
    const setStatusFilter = (value) => roomsStore.setFilter('is_active', value);
    const clearFilters = () => roomsStore.clearFilters();

    // Error handler
    const handleError = (error, defaultMessage) => {
        const message = apiUtils.getMessage(error) || defaultMessage;
        toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
    };

    return {
        rooms,
        allRooms,
        isLoading,
        isSaving,
        operationInProgress,
        statusOptions,
        sortOptions,
        fetchRooms,
        createRoom,
        updateRoom,
        deleteRoom,
        toggleRoomStatus,
        addBed,
        updateBed,
        deleteBed,
        toggleBedStatus,
        setGlobalFilter,
        setStatusFilter,
        clearFilters
    };
}
