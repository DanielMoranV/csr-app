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
    <div class="rooms-view">
        <div class="main-card">
            <!-- Header Principal -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-home"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Gestión de Habitaciones</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-building mr-2"></i>
                        Administración de habitaciones y camas del hospital
                    </p>
                </div>
                <Button label="Nueva Habitación" icon="pi pi-plus" class="add-room-button" @click="openNewRoom" />
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
        </div>

        <RoomDialog v-model:visible="roomDialogVisible" :room="selectedRoom" :editing="isEditingRoom" @save="handleSaveRoom" />

        <BedDialog v-model:visible="bedDialogVisible" :bed="selectedBed" :editing="isEditingBed" :room-id="currentRoomId" @save="handleSaveBed" />

        <ConfirmDeleteDialog v-model:visible="confirmDialogVisible" type="room" :room="roomToDelete" @confirm="handleDeleteRoom" />

        <ConfirmDeleteDialog v-model:visible="confirmBedDialogVisible" type="bed" :bed="bedToDelete" @confirm="handleDeleteBed" />
    </div>
</template>

<style scoped>
/* ============================================================================
   ANIMATIONS
   ============================================================================ */
@keyframes shimmer {
    0%,
    100% {
        transform: translateX(-100%) rotate(45deg);
    }
    50% {
        transform: translateX(100%) rotate(45deg);
    }
}

@keyframes pulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
}

@keyframes gradientShift {
    0%,
    100% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ============================================================================
   MAIN CONTAINER
   ============================================================================ */
.rooms-view {
    padding: 1rem;
    animation: fadeIn 0.5s ease-out;
}

.main-card {
    background: linear-gradient(145deg, var(--surface-section), var(--surface-card));
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
}

.main-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #0891b2, #14b8a6, #0891b2, #06b6d4);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

:global(.dark) .main-card {
    background: linear-gradient(145deg, #1e293b, #0f172a);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* ============================================================================
   HEADER SECTION
   ============================================================================ */
.header-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
}

.header-icon-wrapper {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0891b2 0%, #14b8a6 50%, #06b6d4 100%);
    box-shadow:
        0 8px 20px rgba(8, 145, 178, 0.3),
        0 4px 12px rgba(20, 184, 166, 0.4);
    animation: pulse 2s ease-in-out infinite;
    position: relative;
    overflow: hidden;
}

.header-icon-wrapper::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: shimmer 3s infinite;
}

.header-icon-wrapper i {
    font-size: 2rem;
    color: #ffffff;
    z-index: 1;
}

:global(.dark) .header-icon-wrapper {
    background: linear-gradient(135deg, #22d3ee 0%, #2dd4bf 50%, #06b6d4 100%);
    box-shadow:
        0 8px 20px rgba(34, 211, 238, 0.4),
        0 4px 12px rgba(45, 212, 191, 0.5);
}

.header-content {
    flex: 1;
    min-width: 250px;
}

.header-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #0891b2 0%, #14b8a6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.dark) .header-title {
    background: linear-gradient(135deg, #22d3ee 0%, #2dd4bf 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.header-subtitle {
    color: var(--text-color-secondary);
    font-size: 1rem;
    display: flex;
    align-items: center;
    margin: 0;
}

.add-room-button {
    background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%) !important;
    border: none !important;
    box-shadow: 0 3px 12px rgba(8, 145, 178, 0.3) !important;
    transition: all 0.3s ease !important;
    position: relative;
    overflow: hidden;
    font-weight: 600 !important;
}

.add-room-button::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
}

.add-room-button:hover::before {
    transform: translateX(100%);
}

.add-room-button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(8, 145, 178, 0.4) !important;
    background: linear-gradient(135deg, #0e7490 0%, #155e75 100%) !important;
}

:global(.dark) .add-room-button {
    background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%) !important;
    box-shadow: 0 3px 12px rgba(34, 211, 238, 0.3) !important;
}

:global(.dark) .add-room-button:hover {
    background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%) !important;
    box-shadow: 0 6px 20px rgba(34, 211, 238, 0.5) !important;
}

/* ============================================================================
   RESPONSIVE DESIGN
   ============================================================================ */
@media (max-width: 768px) {
    .rooms-view {
        padding: 0.5rem;
    }

    .main-card {
        padding: 1rem;
        border-radius: 12px;
    }

    .header-section {
        gap: 1rem;
    }

    .header-icon-wrapper {
        width: 48px;
        height: 48px;
    }

    .header-icon-wrapper i {
        font-size: 1.5rem;
    }

    .header-title {
        font-size: 1.25rem;
    }

    .header-subtitle {
        font-size: 0.875rem;
    }

    .add-room-button {
        width: 100%;
    }
}
</style>
