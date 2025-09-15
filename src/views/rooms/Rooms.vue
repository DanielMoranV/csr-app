<script setup>
import ConfirmDeleteDialog from '@/components/rooms/ConfirmDeleteDialog.vue';
import RoomDialog from '@/components/rooms/RoomDialog.vue';
import RoomTable from '@/components/rooms/RoomTable.vue';
import { useRooms } from '@/composables/useRooms';
import { onMounted, ref } from 'vue';
import BedDialog from '@/components/rooms/BedDialog.vue';

const { rooms, isLoading, fetchRooms, createRoom, updateRoom, deleteRoom, toggleRoomStatus, addBed, updateBed, deleteBed, toggleBedStatus: toggleBed } = useRooms();

const roomDialogVisible = ref(false);
const bedDialogVisible = ref(false);
const confirmDialogVisible = ref(false);
const selectedRoom = ref(null);
const selectedBed = ref(null);
const isEditingRoom = ref(false);
const isEditingBed = ref(false);
const currentRoomId = ref(null);

onMounted(() => {
    fetchRooms();
});

// Room Handlers
const openNewRoom = () => {
    selectedRoom.value = {};
    isEditingRoom.value = false;
    roomDialogVisible.value = true;
};

const editRoom = (room) => {
    selectedRoom.value = { ...room };
    isEditingRoom.value = true;
    roomDialogVisible.value = true;
};

const handleSaveRoom = async (roomData) => {
    if (isEditingRoom.value) {
        await updateRoom(selectedRoom.value.id, roomData);
    } else {
        await createRoom(roomData);
    }
    roomDialogVisible.value = false;
};

const roomToDelete = ref(null);
const confirmDeleteRoom = (room) => {
    roomToDelete.value = room;
    confirmDialogVisible.value = true;
};

const handleDeleteRoom = async () => {
    if (roomToDelete.value) {
        await deleteRoom(roomToDelete.value.id);
        confirmDialogVisible.value = false;
        roomToDelete.value = null;
    }
};

// Bed Handlers
const openNewBed = (roomId) => {
    selectedBed.value = {};
    isEditingBed.value = false;
    currentRoomId.value = roomId;
    bedDialogVisible.value = true;
};

const editBed = (bed) => {
    selectedBed.value = { ...bed };
    isEditingBed.value = true;
    currentRoomId.value = bed.id_rooms;
    bedDialogVisible.value = true;
};

const handleSaveBed = async (bedData) => {
    if (isEditingBed.value) {
        await updateBed(selectedBed.value.id, bedData);
    } else {
        await addBed(bedData);
    }
    bedDialogVisible.value = false;
};

const confirmDeleteBed = (bed) => {
    // For now, we can use the same confirm dialog if it is generic enough
    // or create a new one for beds.
    console.log('Delete bed', bed);
    // Implement deletion confirmation logic
    deleteBed(bed.id, bed.id_rooms); // Direct deletion for now
};
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Gestión de Habitaciones</h2>
            <Button label="Nueva Habitación" icon="pi pi-plus" @click="openNewRoom" />
        </div>

        <RoomTable :rooms="rooms" :loading="isLoading" @edit-room="editRoom" @delete-room="confirmDeleteRoom" @toggle-status="toggleRoomStatus" @add-bed="openNewBed" @edit-bed="editBed" @delete-bed="confirmDeleteBed" @toggle-bed-status="toggleBed" />

        <RoomDialog v-model:visible="roomDialogVisible" :room="selectedRoom" :editing="isEditingRoom" @save="handleSaveRoom" />

        <BedDialog v-model:visible="bedDialogVisible" :bed="selectedBed" :editing="isEditingBed" :room-id="currentRoomId" @save="handleSaveBed" />

        <ConfirmDeleteDialog v-model:visible="confirmDialogVisible" :room="roomToDelete" @confirm="handleDeleteRoom" />
    </div>
</template>
