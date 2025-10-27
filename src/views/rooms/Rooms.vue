<script setup>
import BedDialog from '@/components/rooms/BedDialog.vue';
import ConfirmDeleteDialog from '@/components/rooms/ConfirmDeleteDialog.vue';
import RoomDialog from '@/components/rooms/RoomDialog.vue';
import RoomTable from '@/components/rooms/RoomTable.vue';
import { useRooms } from '@/composables/useRooms';
import { usePermissions } from '@/composables/usePermissions';
import { onMounted, ref } from 'vue';

const { rooms, isLoading, fetchRooms, createRoom, updateRoom, deleteRoom, toggleRoomStatus, addBed, updateBed, deleteBed, toggleBedStatus } = useRooms();
const { canPerformDangerousActions } = usePermissions();

const roomDialogVisible = ref(false);
const bedDialogVisible = ref(false);
const confirmDialogVisible = ref(false);
const confirmBedDialogVisible = ref(false);
const selectedRoom = ref(null);
const selectedBed = ref(null);
const isEditingRoom = ref(false);
const isEditingBed = ref(false);
const currentRoomId = ref(null);

onMounted(async () => {
    await fetchRooms();
    console.log('Rooms data from backend:', JSON.parse(JSON.stringify(rooms.value)));
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

const bedToDelete = ref(null);
const confirmDeleteBed = (bed) => {
    bedToDelete.value = bed;
    confirmBedDialogVisible.value = true;
};

const handleDeleteBed = async () => {
    if (bedToDelete.value) {
        await deleteBed(bedToDelete.value.id, bedToDelete.value.id_rooms);
        confirmBedDialogVisible.value = false;
        bedToDelete.value = null;
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
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Gestión de Habitaciones</h2>
            <Button label="Nueva Habitación" icon="pi pi-plus" @click="openNewRoom" />
        </div>

        <RoomTable
            :rooms="rooms"
            :loading="isLoading"
            @edit-room="editRoom"
            @delete-room="confirmDeleteRoom"
            @toggle-status="toggleRoomStatus"
            @add-bed="openNewBed"
            @edit-bed="editBed"
            @delete-bed="confirmDeleteBed"
            @toggle-bed-status="toggleBedStatus"
            :can-delete="canPerformDangerousActions"
        />

        <RoomDialog v-model:visible="roomDialogVisible" :room="selectedRoom" :editing="isEditingRoom" @save="handleSaveRoom" />

        <BedDialog v-model:visible="bedDialogVisible" :bed="selectedBed" :editing="isEditingBed" :room-id="currentRoomId" @save="handleSaveBed" />

        <ConfirmDeleteDialog v-model:visible="confirmDialogVisible" type="room" :room="roomToDelete" @confirm="handleDeleteRoom" />

        <ConfirmDeleteDialog v-model:visible="confirmBedDialogVisible" type="bed" :bed="bedToDelete" @confirm="handleDeleteBed" />
    </div>
</template>
