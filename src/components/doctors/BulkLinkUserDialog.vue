<script setup>
import { ref, computed, watch } from 'vue';
import { useDoctorsStore } from '@/store/doctorsStore';
import { useUsersStore } from '@/store/usersStore';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Checkbox from 'primevue/checkbox';
import ProgressBar from 'primevue/progressbar';
import Message from 'primevue/message';
import Tag from 'primevue/tag';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    doctors: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['update:visible', 'completed']);

const toast = useToast();
const doctorsStore = useDoctorsStore();
const usersStore = useUsersStore();

// Estado
const matches = ref([]);
const isAnalyzing = ref(false);
const isProcessing = ref(false);
const currentProcessing = ref(0);
const totalToProcess = ref(0);
const results = ref([]);
const showResults = ref(false);

// Computed
const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const selectedMatches = computed(() => matches.value.filter(m => m.selected));

const selectedCount = computed(() => selectedMatches.value.length);

const progressPercentage = computed(() => {
    if (totalToProcess.value === 0) return 0;
    return Math.round((currentProcessing.value / totalToProcess.value) * 100);
});

const successCount = computed(() => results.value.filter(r => r.success).length);
const errorCount = computed(() => results.value.filter(r => !r.success).length);

// Methods
function findMatches() {
    isAnalyzing.value = true;
    matches.value = [];
    
    try {

        // Crear mapa de usuarios por DNI para búsqueda O(1)
        const usersByDni = new Map();
        const medicalPositions = ['MEDICOS', 'EMERGENCIA', 'DIRECTOR MEDICO', 'AUDITOR MEDICO'];
        
        usersStore.allUsers.forEach(user => {
            if (medicalPositions.includes(user.position) && user.dni) {
                usersByDni.set(user.dni, user);
            }
        });
        

        
        // Crear set de usuarios ya vinculados (verificar TODOS los médicos en el store)
        const linkedUserIds = new Set();
        
        // Verificar todos los médicos del store, no solo los de props
        doctorsStore.allDoctors.forEach(doctor => {
            if (doctor.user_id) {
                linkedUserIds.add(doctor.user_id);
            }
        });
        

        
        // Buscar coincidencias
        props.doctors.forEach(doctor => {
            // Excluir médicos ya vinculados
            if (doctor.user_id) return;
            
            // Buscar usuario con mismo DNI
            const matchingUser = usersByDni.get(doctor.document_number);
            
            // Verificar que el usuario existe y NO está vinculado a ningún médico
            if (matchingUser && !linkedUserIds.has(matchingUser.id)) {
                matches.value.push({
                    doctor: doctor,
                    user: matchingUser,
                    selected: true
                });
            }
        });
        

        if (matches.value.length === 0) {
            toast.add({
                severity: 'info',
                summary: 'Sin coincidencias',
                detail: 'No se encontraron médicos sin vincular que coincidan con usuarios por DNI',
                life: 5000
            });
        }
    } finally {
        isAnalyzing.value = false;
    }
}

function selectAll() {
    matches.value.forEach(match => match.selected = true);
}

function deselectAll() {
    matches.value.forEach(match => match.selected = false);
}

async function processBulkLink() {
    const toProcess = selectedMatches.value;
    
    if (toProcess.length === 0) {
        toast.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'Debe seleccionar al menos un médico para vincular',
            life: 3000
        });
        return;
    }
    
    isProcessing.value = true;
    currentProcessing.value = 0;
    totalToProcess.value = toProcess.length;
    results.value = [];
    
    for (let i = 0; i < toProcess.length; i++) {
        const match = toProcess[i];
        currentProcessing.value = i + 1;
        
        try {
            const response = await doctorsStore.linkUser(match.doctor.id, match.user.id);
            
            results.value.push({
                doctor: match.doctor,
                user: match.user,
                success: true,
                message: 'Vinculado exitosamente'
            });
        } catch (error) {
            results.value.push({
                doctor: match.doctor,
                user: match.user,
                success: false,
                message: error.response?.data?.message || error.message || 'Error desconocido'
            });
        }
        
        // Pequeña pausa para evitar sobrecarga del servidor
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    isProcessing.value = false;
    showResults.value = true;
    
    // Mostrar resumen
    toast.add({
        severity: successCount.value > 0 ? 'success' : 'error',
        summary: 'Vinculación Masiva Completada',
        detail: `${successCount.value} exitosas, ${errorCount.value} fallidas`,
        life: 5000
    });
}

function handleClose() {
    if (showResults.value && successCount.value > 0) {
        emit('completed', results.value);
    }
    
    // Reset
    matches.value = [];
    results.value = [];
    showResults.value = false;
    currentProcessing.value = 0;
    totalToProcess.value = 0;
    
    dialogVisible.value = false;
}

function backToSelection() {
    showResults.value = false;
    // Remover matches exitosos
    const successfulDoctorIds = new Set(
        results.value.filter(r => r.success).map(r => r.doctor.id)
    );
    matches.value = matches.value.filter(m => !successfulDoctorIds.has(m.doctor.id));
}

// Watchers
watch(() => props.visible, async (newVal) => {
    if (newVal) {
        await usersStore.fetchUsers();
        findMatches();
    }
});
</script>

<template>
    <Dialog
        v-model:visible="dialogVisible"
        header="Vinculación Masiva por DNI"
        :modal="true"
        :closable="!isProcessing"
        :style="{ width: '900px' }"
        @hide="handleClose"
    >
        <!-- Vista de Selección -->
        <div v-if="!showResults" class="bulk-link-dialog">
            <!-- Información -->
            <Message severity="info" :closable="false" class="mb-4">
                <strong>Matching automático por DNI:</strong> El sistema ha encontrado {{ matches.length }} 
                {{ matches.length === 1 ? 'coincidencia' : 'coincidencias' }} entre médicos sin vincular y usuarios médicos.
            </Message>

            <!-- Acciones de selección -->
            <div v-if="matches.length > 0" class="selection-actions mb-3">
                <div class="flex gap-2">
                    <Button 
                        label="Seleccionar Todos" 
                        icon="pi pi-check-square" 
                        size="small"
                        severity="secondary"
                        outlined
                        @click="selectAll"
                        :disabled="isProcessing"
                    />
                    <Button 
                        label="Deseleccionar Todos" 
                        icon="pi pi-stop" 
                        size="small"
                        severity="secondary"
                        outlined
                        @click="deselectAll"
                        :disabled="isProcessing"
                    />
                </div>
                <Tag :value="`${selectedCount} seleccionados`" severity="info" />
            </div>

            <!-- Tabla de coincidencias -->
            <DataTable
                v-if="matches.length > 0"
                :value="matches"
                :loading="isAnalyzing"
                class="p-datatable-sm"
                stripedRows
                :paginator="matches.length > 10"
                :rows="10"
            >
                <Column style="width: 50px">
                    <template #body="{ data }">
                        <Checkbox v-model="data.selected" :binary="true" :disabled="isProcessing" />
                    </template>
                </Column>

                <Column header="Médico" style="min-width: 250px">
                    <template #body="{ data }">
                        <div class="flex flex-col">
                            <span class="font-semibold">{{ data.doctor.name }}</span>
                            <small class="text-muted">Código: {{ data.doctor.code }}</small>
                        </div>
                    </template>
                </Column>

                <Column header="DNI" style="min-width: 120px">
                    <template #body="{ data }">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-check-circle text-green-500"></i>
                            <span class="font-mono">{{ data.doctor.document_number }}</span>
                        </div>
                    </template>
                </Column>

                <Column header="Usuario" style="min-width: 250px">
                    <template #body="{ data }">
                        <div class="flex flex-col">
                            <span class="font-semibold">{{ data.user.name }}</span>
                            <small class="text-muted">{{ data.user.email }}</small>
                        </div>
                    </template>
                </Column>

                <Column header="Posición" style="min-width: 150px">
                    <template #body="{ data }">
                        <Tag :value="data.user.position" severity="info" />
                    </template>
                </Column>
            </DataTable>

            <!-- Estado vacío -->
            <div v-else class="empty-state text-center py-5">
                <i class="pi pi-info-circle text-4xl text-muted mb-3"></i>
                <h3 class="text-muted">No se encontraron coincidencias</h3>
                <p class="text-muted">
                    No hay médicos sin vincular que coincidan con usuarios por DNI.
                </p>
            </div>

            <!-- Barra de progreso -->
            <div v-if="isProcessing" class="progress-section mt-4">
                <div class="flex justify-content-between mb-2">
                    <span class="font-semibold">Procesando vinculaciones...</span>
                    <span>{{ currentProcessing }} / {{ totalToProcess }}</span>
                </div>
                <ProgressBar :value="progressPercentage" />
            </div>
        </div>

        <!-- Vista de Resultados -->
        <div v-else class="results-view">
            <Message :severity="errorCount === 0 ? 'success' : 'warn'" :closable="false" class="mb-4">
                <strong>Proceso completado:</strong> {{ successCount }} vinculaciones exitosas, {{ errorCount }} fallidas.
            </Message>

            <DataTable
                :value="results"
                class="p-datatable-sm"
                stripedRows
                :paginator="results.length > 10"
                :rows="10"
            >
                <Column header="Estado" style="width: 80px">
                    <template #body="{ data }">
                        <i 
                            :class="data.success ? 'pi pi-check-circle text-green-500' : 'pi pi-times-circle text-red-500'"
                            class="text-xl"
                        ></i>
                    </template>
                </Column>

                <Column header="Médico" style="min-width: 200px">
                    <template #body="{ data }">
                        <div class="flex flex-col">
                            <span class="font-semibold">{{ data.doctor.name }}</span>
                            <small class="text-muted">{{ data.doctor.code }}</small>
                        </div>
                    </template>
                </Column>

                <Column header="Usuario" style="min-width: 200px">
                    <template #body="{ data }">
                        <div class="flex flex-col">
                            <span class="font-semibold">{{ data.user.name }}</span>
                            <small class="text-muted">{{ data.user.dni }}</small>
                        </div>
                    </template>
                </Column>

                <Column header="Resultado" style="min-width: 250px">
                    <template #body="{ data }">
                        <span :class="data.success ? 'text-green-600' : 'text-red-600'">
                            {{ data.message }}
                        </span>
                    </template>
                </Column>
            </DataTable>
        </div>

        <template #footer>
            <div class="flex justify-content-between">
                <Button
                    v-if="showResults && errorCount > 0"
                    label="Volver a Selección"
                    icon="pi pi-arrow-left"
                    severity="secondary"
                    @click="backToSelection"
                />
                <div v-else></div>
                
                <div class="flex gap-2">
                    <Button
                        label="Cerrar"
                        icon="pi pi-times"
                        severity="secondary"
                        @click="handleClose"
                        :disabled="isProcessing"
                    />
                    <Button
                        v-if="!showResults"
                        label="Vincular Seleccionados"
                        icon="pi pi-link"
                        severity="success"
                        @click="processBulkLink"
                        :loading="isProcessing"
                        :disabled="selectedCount === 0 || isProcessing"
                    />
                </div>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.bulk-link-dialog {
    padding: 0.5rem 0;
}

.selection-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.progress-section {
    padding: 1rem;
    background: var(--surface-50);
    border-radius: 8px;
}

.empty-state {
    padding: 3rem 1rem;
}

.results-view {
    padding: 0.5rem 0;
}

.text-muted {
    color: var(--text-color-secondary);
}

:deep(.p-datatable-sm .p-datatable-tbody > tr > td) {
    padding: 0.75rem;
}
</style>
