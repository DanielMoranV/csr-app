<script setup>
import BedReservationDialog from '@/components/hospitalization/BedReservationDialog.vue';
import BedReservationsTable from '@/components/hospitalization/BedReservationsTable.vue';
import ConfirmDeleteDialog from '@/components/rooms/ConfirmDeleteDialog.vue'; // Reusing this component
import { useBedReservationsStore } from '@/store/bedReservationsStore';
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';

const bedReservationsStore = useBedReservationsStore();
const { reservations } = storeToRefs(bedReservationsStore);

const reservationDialog = ref(false);
const deleteReservationDialog = ref(false);
const reservation = ref({});

onMounted(() => {
    bedReservationsStore.fetchReservations();
});

const editReservation = (selectedReservation) => {
    reservation.value = { ...selectedReservation };
    reservationDialog.value = true;
};

const confirmDeleteReservation = (selectedReservation) => {
    reservation.value = selectedReservation;
    deleteReservationDialog.value = true;
};

const saveReservation = async (reservationData) => {
    if (reservationData.id) {
        await bedReservationsStore.updateReservation(reservationData);
    } else {
        await bedReservationsStore.createReservation(reservationData);
    }
    reservationDialog.value = false;
};

const deleteReservation = async () => {
    await bedReservationsStore.deleteReservation(reservation.value.id);
    deleteReservationDialog.value = false;
};

const hideDialog = () => {
    reservationDialog.value = false;
};
</script>

<template>
    <div class="reservations-view">
        <div class="main-card">
            <!-- Header Principal -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-calendar-plus"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Gestión de Reservas de Camas</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-bookmark mr-2"></i>
                        Administración de reservas para hospitalización
                    </p>
                </div>
            </div>

            <BedReservationsTable :reservations="reservations" @edit-reservation="editReservation" @delete-reservation="confirmDeleteReservation" />
        </div>

        <BedReservationDialog :reservation="reservation" :visible="reservationDialog" @save="saveReservation" @close="hideDialog" />

        <ConfirmDeleteDialog :visible="deleteReservationDialog" item-name="reserva" @close="deleteReservationDialog = false" @confirm="deleteReservation" />
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
.reservations-view {
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
    background: linear-gradient(90deg, #9333ea, #a855f7, #9333ea, #7e22ce);
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
    background: linear-gradient(135deg, #9333ea 0%, #a855f7 50%, #7e22ce 100%);
    box-shadow: 0 8px 20px rgba(147, 51, 234, 0.3), 0 4px 12px rgba(168, 85, 247, 0.4);
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
    background: linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #9333ea 100%);
    box-shadow: 0 8px 20px rgba(192, 132, 252, 0.4), 0 4px 12px rgba(168, 85, 247, 0.5);
}

.header-content {
    flex: 1;
    min-width: 250px;
}

.header-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.dark) .header-title {
    background: linear-gradient(135deg, #c084fc 0%, #a855f7 100%);
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

/* ============================================================================
   RESPONSIVE DESIGN
   ============================================================================ */
@media (max-width: 768px) {
    .reservations-view {
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
}
</style>
