<template>
    <Dialog v-model:visible="dialogVisible" header="⚠️ Recalcular Comisiones" :modal="true" :closable="!isProcessing" :closeOnEscape="!isProcessing" class="w-full md:w-[600px]">
        <div class="flex flex-col gap-4 py-4">
            <!-- Información del Médico -->
            <div v-if="doctor" class="doctor-info p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p class="font-semibold text-lg">{{ doctor.name }}</p>
                <p class="text-sm text-gray-600">Código: {{ doctor.code }}</p>
            </div>

            <!-- Advertencia -->
            <Message severity="warn" :closable="false"> <strong>ADVERTENCIA:</strong> Esta acción recalculará las comisiones de todos los servicios de este médico. <br />Los cambios manuales previos serán sobrescritos. </Message>

            <!-- Información de servicios -->
            <div class="info-box p-3 bg-gray-50 rounded-lg">
                <p><strong>Servicios a recalcular:</strong> {{ serviceCount }}</p>
                <p class="text-sm text-gray-600 mt-2"><strong>Reglas que se aplicarán:</strong></p>
                <ul class="ml-4 mt-1 text-sm text-gray-700">
                    <li>✓ Regla 1: PLANILLA (Comisión Base)</li>
                    <li>✓ Regla 2: RETÉN + Seguros (Comisión Seguros RETÉN)</li>
                    <li>✓ Regla 3: RETÉN + PARTICULAR con tarifario</li>
                </ul>
            </div>

            <!-- Progreso -->
            <div v-if="isProcessing" class="progress-section">
                <ProgressBar :value="progress" />
                <p class="text-center mt-2 text-sm">Procesando... {{ processedCount }}/{{ serviceCount }}</p>
            </div>

            <!-- Resultados -->
            <div v-if="results" class="results-section">
                <Message severity="success" :closable="false">
                    <strong>✅ Recálculo completado</strong>
                </Message>
                <div class="stats p-3 bg-green-50 rounded-lg mt-2">
                    <p class="text-sm">
                        ✅ Actualizados: <strong>{{ results.updated }}</strong>
                    </p>
                    <p class="text-sm">
                        ⏭️ Omitidos (aprobados/rechazados): <strong>{{ results.skipped }}</strong>
                    </p>
                    <p v-if="results.errors && results.errors.length > 0" class="text-sm text-red-600">
                        ❌ Errores: <strong>{{ results.errors.length }}</strong>
                    </p>
                </div>

                <!-- Mostrar errores si existen -->
                <div v-if="results.errors && results.errors.length > 0" class="errors-list mt-2 max-h-40 overflow-y-auto">
                    <p class="text-sm font-semibold mb-1">Errores detallados:</p>
                    <div v-for="error in results.errors" :key="error.id" class="text-xs bg-red-50 p-2 rounded mb-1">Admisión {{ error.admision }} (ID: {{ error.id }}): {{ error.error }}</div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="Cancelar" severity="secondary" @click="handleClose" :disabled="isProcessing" />
                <Button v-if="!results" label="Confirmar Recálculo" severity="danger" icon="pi pi-calculator" :loading="isProcessing" :disabled="isProcessing" @click="handleRecalculate" />
                <Button v-else label="Cerrar" icon="pi pi-check" @click="handleClose" />
            </div>
        </template>
    </Dialog>
</template>

<script setup>
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import ProgressBar from 'primevue/progressbar';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    doctor: {
        type: Object,
        default: null
    },
    serviceCount: {
        type: Number,
        default: 0
    }
});

const emit = defineEmits(['update:visible', 'recalculate', 'complete']);

const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const isProcessing = ref(false);
const processedCount = ref(0);
const results = ref(null);

const progress = computed(() => {
    if (props.serviceCount === 0) return 0;
    return Math.round((processedCount.value / props.serviceCount) * 100);
});

// Resetear estado cuando se abre el diálogo
watch(
    () => props.visible,
    (newVal) => {
        if (newVal) {
            results.value = null;
            processedCount.value = 0;
            isProcessing.value = false;
        }
    }
);

async function handleRecalculate() {
    console.log('[RecalculateDialog] handleRecalculate iniciado');
    console.log('[RecalculateDialog] doctor:', props.doctor);
    console.log('[RecalculateDialog] serviceCount:', props.serviceCount);

    if (!props.doctor) {
        console.error('[RecalculateDialog] No hay doctor seleccionado');
        return;
    }

    isProcessing.value = true;
    processedCount.value = 0;

    try {
        // Simular progreso incremental
        const progressInterval = setInterval(() => {
            if (processedCount.value < props.serviceCount) {
                processedCount.value++;
            }
        }, 50);

        console.log('[RecalculateDialog] Emitiendo evento recalculate con doctorId:', props.doctor.id);

        // Emitir evento para que el padre ejecute el recálculo
        const recalculateResults = await new Promise((resolve) => {
            emit('recalculate', props.doctor.id, resolve);
        });

        console.log('[RecalculateDialog] Resultados recibidos:', recalculateResults);

        clearInterval(progressInterval);
        processedCount.value = props.serviceCount;
        results.value = recalculateResults;

        emit('complete', recalculateResults);
    } catch (error) {
        console.error('[RecalculateDialog] Error en recálculo:', error);
        results.value = {
            total: props.serviceCount,
            updated: 0,
            skipped: 0,
            errors: [{ id: 0, admision: 'N/A', error: error.message }]
        };
    } finally {
        isProcessing.value = false;
    }
}

function handleClose() {
    if (!isProcessing.value) {
        emit('update:visible', false);
    }
}
</script>

<style scoped>
.doctor-info {
    border-left: 4px solid #3b82f6;
}

.info-box ul {
    list-style: none;
}

.stats p {
    margin: 0.25rem 0;
}

.errors-list {
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    padding: 0.5rem;
    background: #fef2f2;
}
</style>
