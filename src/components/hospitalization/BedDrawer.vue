<script setup>
import { computed, ref, watch } from 'vue';
import Drawer from 'primevue/drawer';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Badge from 'primevue/badge';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import AttentionDetails from '@/components/attentions/AttentionDetails.vue';
import AttentionTasks from '@/components/attentions/AttentionTasks.vue';
import { useHospitalAttentionsStore } from '@/store/hospitalAttentionsStore';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    bed: {
        type: Object,
        default: () => null
    }
});

const emit = defineEmits(['update:visible']);

const hospitalAttentionsStore = useHospitalAttentionsStore();

const drawerVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const activeTab = ref('0');

// Computed para obtener los datos de la atención
const attention = computed(() => {
    if (!props.bed?.attention) return null;
    
    // La estructura de los datos puede ser diferente, intentamos adaptarla
    const bedAttention = props.bed.attention;
    
    return {
        id: bedAttention.hospital_attention_id,
        hospital_attention_id: bedAttention.hospital_attention_id,
        patient: bedAttention.patient,
        entry_date: bedAttention.entry_date,
        details_attention: bedAttention.details,
        tasks: bedAttention.tasks || [],
        // Campos adicionales necesarios para compatibilidad
        is_active: true, // Asumimos que es activa si aparece en el estado de hospitalización
        bed: {
            name: props.bed.bed_number,
            room: {
                number: extractRoomFromBed(props.bed.bed_number)
            }
        }
    };
});

// Función para extraer el número de habitación del nombre de la cama
function extractRoomFromBed(bedNumber) {
    if (!bedNumber) return '';
    // Extraer números del inicio de la string (ej: "206A" -> "206")
    const match = bedNumber.match(/^(\d+)/);
    return match ? match[1] : '';
}

// Formatear fecha
const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (isNaN(date)) return value;
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Obtener severidad del estado de la cama
const getBedStatusSeverity = (status) => {
    return status === 'occupied' ? 'danger' : 'success';
};

// Handlers para las acciones
const handleCreateTask = async (taskData) => {
    try {
        await hospitalAttentionsStore.createTask(taskData);
        // Recargar datos si es necesario
    } catch (error) {
        console.error('Error creating task:', error);
    }
};

const handleUpdateTask = async (taskData) => {
    try {
        await hospitalAttentionsStore.updateTask(taskData.id, taskData);
    } catch (error) {
        console.error('Error updating task:', error);
    }
};

const handleDeleteTask = async (taskId) => {
    try {
        await hospitalAttentionsStore.deleteTask(taskId);
    } catch (error) {
        console.error('Error deleting task:', error);
    }
};

const handleCreateDetails = async (detailsData) => {
    try {
        await hospitalAttentionsStore.createDetails(detailsData);
    } catch (error) {
        console.error('Error creating details:', error);
    }
};

const handleUpdateDetails = async (detailsId, detailsData) => {
    try {
        await hospitalAttentionsStore.updateDetails(detailsId, detailsData);
    } catch (error) {
        console.error('Error updating details:', error);
    }
};

const handleDeleteDetails = async (detailsId) => {
    try {
        await hospitalAttentionsStore.deleteDetails(detailsId);
    } catch (error) {
        console.error('Error deleting details:', error);
    }
};

// Watch para resetear el tab activo cuando se cambia de cama
watch(() => props.bed, () => {
    activeTab.value = '0';
});
</script>

<template>
    <Drawer 
        v-model:visible="drawerVisible" 
        position="right" 
        class="!w-full md:!w-[48rem] lg:!w-[56rem] xl:!w-[64rem]"
    >
        <template #header>
            <div v-if="bed && attention" class="flex flex-col gap-3 w-full">
                <!-- Título principal -->
                <h3 class="text-xl font-bold flex items-center gap-2 m-0">
                    <i class="pi pi-bed text-primary"></i>
                    Gestión de Cama {{ bed.bed_number }}
                </h3>
                
                <!-- Estado de la cama -->
                <div class="flex items-center gap-2">
                    <Tag 
                        :value="bed.status === 'occupied' ? 'OCUPADA' : 'LIBRE'" 
                        :severity="getBedStatusSeverity(bed.status)" 
                    />
                    <span v-if="bed.status === 'occupied'" class="text-sm text-600">
                        Atención #{{ attention.hospital_attention_id }}
                    </span>
                </div>
                
                <!-- Información del paciente -->
                <div v-if="bed.status === 'occupied' && attention.patient" 
                     class="bg-primary-50 p-3 border-round border-l-4 border-primary-500">
                    <div class="grid">
                        <div class="col-12 md:col-6">
                            <div class="flex items-center gap-2 mb-2">
                                <i class="pi pi-user text-primary"></i>
                                <span class="font-semibold">{{ attention.patient.name }}</span>
                            </div>
                            <div class="text-sm text-600 flex items-center gap-1">
                                <i class="pi pi-id-card"></i>
                                <span>{{ attention.patient.document_number }}</span>
                            </div>
                        </div>
                        <div class="col-12 md:col-6">
                            <div class="flex items-center gap-1 text-sm text-600 mb-1">
                                <i class="pi pi-calendar"></i>
                                <span>Ingreso: {{ formatDate(attention.entry_date) }}</span>
                            </div>
                            <div v-if="attention.tasks && attention.tasks.length > 0" 
                                 class="flex items-center gap-1 text-sm">
                                <i class="pi pi-list-check text-orange-500"></i>
                                <span class="text-600">{{ attention.tasks.length }} tareas</span>
                                <Tag 
                                    v-if="attention.tasks.some(t => t.status === 'pendiente')" 
                                    value="Pendientes" 
                                    severity="warning" 
                                    class="text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Estado cuando la cama está libre -->
                <div v-else class="bg-green-50 p-3 border-round border-l-4 border-green-500">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-check-circle text-green-600"></i>
                        <span class="text-green-800">Cama disponible para nueva atención</span>
                    </div>
                </div>
            </div>
        </template>

        <!-- Contenido principal -->
        <div v-if="bed" class="h-full">
            <!-- Solo mostrar contenido si la cama está ocupada -->
            <div v-if="bed.status === 'occupied' && attention">
                <Tabs v-model:value="activeTab" class="bed-drawer-tabs h-full">
                    <TabList class="mb-4">
                        <Tab value="0">
                            <i class="pi pi-file-edit mr-2"></i>
                            Detalles Médicos
                        </Tab>
                        <Tab value="1">
                            <i class="pi pi-list-check mr-2"></i>
                            Tareas
                            <Badge 
                                v-if="attention.tasks?.length" 
                                :value="attention.tasks.length" 
                                severity="info" 
                                class="ml-2"
                            />
                        </Tab>
                    </TabList>
                    
                    <TabPanels class="flex-1">
                        <TabPanel value="0" class="h-full">
                            <AttentionDetails
                                :details="attention.details_attention"
                                :attention-id="attention.hospital_attention_id"
                                @create-details="handleCreateDetails"
                                @update-details="handleUpdateDetails"
                                @delete-details="handleDeleteDetails"
                            />
                        </TabPanel>
                        
                        <TabPanel value="1" class="h-full">
                            <AttentionTasks
                                :tasks="attention.tasks || []"
                                :attention-id="attention.hospital_attention_id"
                                @create-task="handleCreateTask"
                                @update-task="handleUpdateTask"
                                @delete-task="handleDeleteTask"
                            />
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </div>
            
            <!-- Estado cuando la cama está libre -->
            <div v-else class="flex flex-col items-center justify-center h-full text-center py-8">
                <i class="pi pi-bed text-6xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">Cama Libre</h3>
                <p class="text-gray-500 mb-4">
                    Esta cama está disponible para recibir un nuevo paciente.
                </p>
                <Button 
                    label="Cerrar" 
                    icon="pi pi-times" 
                    outlined 
                    @click="drawerVisible = false"
                />
            </div>
        </div>
    </Drawer>
</template>

<style scoped>
.bed-drawer-tabs :deep(.p-tablist) {
    background: var(--surface-50);
    border-radius: 8px;
    padding: 4px;
    border: 1px solid var(--surface-200);
}

.bed-drawer-tabs :deep(.p-tab) {
    border-radius: 6px;
    margin: 0 2px;
    transition: all 0.2s ease;
}

.bed-drawer-tabs :deep(.p-tab:hover) {
    background: var(--surface-100);
}

.bed-drawer-tabs :deep(.p-tab[aria-selected='true']) {
    background: var(--surface-0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--surface-200);
}

.bed-drawer-tabs :deep(.p-tabpanel) {
    padding: 0;
    height: calc(100vh - 280px);
    overflow-y: auto;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .bed-drawer-tabs :deep(.p-tablist) {
        flex-wrap: wrap;
    }
    
    .bed-drawer-tabs :deep(.p-tab) {
        flex: 1;
        min-width: 120px;
    }
    
    .bed-drawer-tabs :deep(.p-tabpanel) {
        height: calc(100vh - 320px);
    }
}
</style>
