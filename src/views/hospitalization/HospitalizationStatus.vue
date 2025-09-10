<script setup>
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useHospitalizationStore } from '@/store/hospitalizationStore';
import RoomCard from '@/components/hospitalization/RoomCard.vue';

const store = useHospitalizationStore();
const { state } = storeToRefs(store);

onMounted(() => {
    store.fetchHospitalizationStatus();
});
</script>

<template>
    <div class="hospitalization-status-container">
        <!-- Header -->
        <div class="flex justify-content-between align-items-center mb-4">
            <h2 class="m-0 text-primary">Estado de Hospitalización</h2>
            <div class="flex align-items-center gap-2">
                <i class="pi pi-hospital text-2xl text-primary"></i>
                <span class="text-600">{{ state.status?.length || 0 }} habitaciones</span>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="state.isLoading" class="flex justify-content-center align-items-center" style="min-height: 400px;">
            <div class="text-center">
                <i class="pi pi-spin pi-spinner text-primary" style="font-size: 4rem"></i>
                <p class="mt-3 text-xl text-600">Cargando estado de hospitalización...</p>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="state.error" class="flex justify-content-center align-items-center" style="min-height: 400px;">
            <div class="text-center">
                <i class="pi pi-exclamation-triangle text-red-500" style="font-size: 4rem"></i>
                <h3 class="mt-3 text-red-600">Error al cargar datos</h3>
                <p class="text-600">{{ state.error }}</p>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!state.status || state.status.length === 0" class="flex justify-content-center align-items-center" style="min-height: 400px;">
            <div class="text-center">
                <i class="pi pi-home text-gray-400" style="font-size: 4rem"></i>
                <h3 class="mt-3 text-gray-600">No hay habitaciones disponibles</h3>
                <p class="text-600">No se encontraron datos de hospitalización para mostrar.</p>
            </div>
        </div>

        <!-- Rooms Grid -->
        <div v-else class="rooms-grid">
            <div v-for="room in state.status" :key="room.id" class="room-card-container">
                <RoomCard :room="room" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.hospitalization-status-container {
    padding: 1.5rem;
    background-color: var(--surface-ground);
    min-height: calc(100vh - 10rem);
}

.rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
    width: 100%;
}

.room-card-container {
    display: flex;
    width: 100%;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .hospitalization-status-container {
        padding: 1rem;
    }
    
    .rooms-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
}

@media (min-width: 769px) and (max-width: 1200px) {
    .rooms-grid {
        grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    }
}

@media (min-width: 1201px) and (max-width: 1600px) {
    .rooms-grid {
        grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
    }
}

@media (min-width: 1601px) {
    .rooms-grid {
        grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    }
}
</style>
