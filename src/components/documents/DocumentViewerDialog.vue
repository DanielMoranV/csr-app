<script setup>
import { useDocumentManagement } from '@/composables/useDocumentManagement';
import { useAuthStore } from '@/store/authStore';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Timeline from 'primevue/timeline';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    documentId: {
        type: [String, Number],
        default: null
    }
});

const emit = defineEmits(['update:visible', 'document-action']);

const { fetchDocumentDetails, currentDocument, isLoading, isSaving, signDocumentStep, rejectDocumentStep, getSeverity } = useDocumentManagement();
const authStore = useAuthStore();

const showRejectDialog = ref(false);
const rejectComment = ref('');
const pdfUrl = ref(null);

watch(
    () => props.visible,
    async (newVal) => {
        if (newVal && props.documentId) {
            await loadDocument();
        } else {
            pdfUrl.value = null;
        }
    }
);

const loadDocument = async () => {
    try {
        await fetchDocumentDetails(props.documentId);

        // Find latest version for PDF URL
        if (currentDocument.value && currentDocument.value.versions && currentDocument.value.versions.length > 0) {
            const latestVersion = currentDocument.value.versions[currentDocument.value.versions.length - 1];
            // Construir URL completa si es necesario, o usar la ruta relativa si el backend provee la URL
            pdfUrl.value = latestVersion.ruta_archivo.startsWith('http') ? latestVersion.ruta_archivo : import.meta.env.VITE_API_URL + '/storage/' + latestVersion.ruta_archivo;
        } else {
            pdfUrl.value = null;
        }
    } catch (e) {
        console.error(e);
    }
};

const closeDialog = () => {
    emit('update:visible', false);
};

const currentUser = computed(() => authStore.user);

// Determina el paso activo actual
const activeStep = computed(() => {
    if (!currentDocument.value || !currentDocument.value.steps) return null;
    // Buscamos el primer paso "Pendiente" ordenado secuencialmente
    return currentDocument.value.steps.find((s) => s.estado_paso === 'Pendiente');
});

// Verifica si el usuario actual tiene permisos para el paso activo
const canActOnCurrentStep = computed(() => {
    if (!activeStep.value || !currentUser.value) return false;

    // Verificar si el usuario está en los assigned users
    const isAssignedUser = activeStep.value.permitted_users?.some((u) => u.id === currentUser.value.id);

    // Verificar si el rol del usuario está en assigned positions
    const isAssignedPosition = activeStep.value.permitted_positions?.includes(currentUser.value.position);

    return isAssignedUser || isAssignedPosition;
});

const handleApprove = async () => {
    if (!activeStep.value) return;

    let payload = {};
    if (activeStep.value.tipo_accion === 'Firma') {
        // Mocking firma for now. We can add vue-signature-pad later.
        payload = {
            firma_base64: 'mocked_signature',
            posicion: { page: 1, x: 100, y: 100, w: 100, h: 50 }
        };
    }

    try {
        await signDocumentStep(activeStep.value.id, payload);
        await loadDocument(); // Reload to see the next step
        emit('document-action');
    } catch (e) {
        console.error(e);
    }
};

const openRejectDialog = () => {
    showRejectDialog.value = true;
    rejectComment.value = '';
};

const submitReject = async () => {
    if (!activeStep.value || !rejectComment.value.trim()) return;

    try {
        await rejectDocumentStep(activeStep.value.id, rejectComment.value);
        showRejectDialog.value = false;
        await loadDocument();
        emit('document-action');
    } catch (e) {
        console.error(e);
    }
};

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Timeline configuration
const timelineSteps = computed(() => {
    if (!currentDocument.value || !currentDocument.value.steps) return [];
    return currentDocument.value.steps.map((step) => ({
        ...step,
        icon: getStepIcon(step.estado_paso),
        color: getStepColor(step.estado_paso)
    }));
});

const getStepIcon = (estado) => {
    switch (estado) {
        case 'Finalizado':
            return 'pi pi-check';
        case 'Pendiente':
            return 'pi pi-clock';
        case 'Rechazado':
            return 'pi pi-times';
        default:
            return 'pi pi-info-circle';
    }
};

const getStepColor = (estado) => {
    switch (estado) {
        case 'Finalizado':
            return '#10b981'; // green-500
        case 'Pendiente':
            return '#f59e0b'; // amber-500
        case 'Rechazado':
            return '#ef4444'; // red-500
        default:
            return '#6b7280'; // gray-500
    }
};
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="closeDialog"
        modal
        maximizable
        :header="currentDocument ? currentDocument.titulo : 'Cargando Documento...'"
        :style="{ width: '90vw', height: '90vh' }"
        :breakpoints="{ '1024px': '95vw', '641px': '100vw' }"
        class="viewer-dialog"
    >
        <template #header>
            <div class="flex items-center gap-3 w-full" v-if="currentDocument">
                <i class="pi pi-file-pdf text-blue-500 text-2xl"></i>
                <div class="flex-column flex">
                    <span class="font-bold text-xl">{{ currentDocument.titulo }}</span>
                    <div class="flex items-center gap-2 mt-1">
                        <Badge :value="currentDocument.estado_actual" :severity="getSeverity(currentDocument.estado_actual)" class="text-xs" />
                        <span class="text-xs text-gray-500"> Creado por: {{ currentDocument.creador ? currentDocument.creador.name : 'Desconocido' }} el {{ formatDate(currentDocument.created_at) }} </span>
                    </div>
                </div>
            </div>
        </template>

        <div class="grid h-full m-0" v-if="currentDocument">
            <!-- Left Panel: PDF Viewer -->
            <div class="col-12 md:col-8 p-0 h-full surface-ground border-right-1 surface-border relative">
                <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                    <i class="pi pi-spin pi-spinner text-4xl text-blue-500"></i>
                </div>

                <iframe v-if="pdfUrl" :src="pdfUrl" class="w-full h-full border-none" title="Vista Previa de Documento"></iframe>

                <div v-else class="flex flex-column items-center justify-center h-full text-gray-500">
                    <i class="pi pi-file-excel text-6xl mb-3"></i>
                    <span>No se pudo cargar la vista previa del documento.</span>
                </div>
            </div>

            <!-- Right Panel: Info & Timeline -->
            <div class="col-12 md:col-4 p-4 flex flex-column h-full overflow-y-auto bg-white dark:bg-gray-900">
                <!-- Action Buttons if valid -->
                <div class="mb-4 surface-card p-3 border-round border-1 surface-border shadow-1" v-if="canActOnCurrentStep">
                    <h3 class="text-lg font-semibold mb-2 m-0 text-blue-600">Es tu turno</h3>
                    <p class="text-sm text-gray-600 mb-3">
                        Se requiere tu acción <b>({{ activeStep.tipo_accion }})</b> para continuar el flujo.
                    </p>
                    <div class="flex gap-2 w-full flex-column xl:flex-row">
                        <Button :label="activeStep.tipo_accion === 'Firma' ? 'Firmar Documento' : 'Aprobar Documento'" icon="pi pi-check-circle" class="p-button-success flex-1" @click="handleApprove" :loading="isSaving" />
                        <Button label="Rechazar" icon="pi pi-times-circle" class="p-button-danger p-button-outlined flex-1" @click="openRejectDialog" :disabled="isSaving" />
                    </div>
                </div>

                <div class="mb-3">
                    <h3 class="font-bold text-gray-800 dark:text-gray-100 border-bottom-1 surface-border pb-2">Descripción</h3>
                    <p class="text-gray-600 dark:text-gray-400 text-sm line-height-3">
                        {{ currentDocument.descripcion || 'Sin descripción adicional.' }}
                    </p>
                </div>

                <div class="flex-1 mt-2">
                    <h3 class="font-bold text-gray-800 dark:text-gray-100 border-bottom-1 surface-border pb-2 mb-4">Flujo de Aprobación</h3>

                    <Timeline :value="timelineSteps" class="customized-timeline">
                        <template #marker="slotProps">
                            <span class="custom-marker shadow-2" :style="{ backgroundColor: slotProps.item.color }">
                                <i :class="slotProps.item.icon"></i>
                            </span>
                        </template>
                        <template #content="slotProps">
                            <div class="p-3 border-round surface-card shadow-1 mb-3">
                                <div class="flex justify-content-between align-items-center mb-1">
                                    <span class="font-bold text-gray-800">Paso {{ slotProps.item.orden }}: {{ slotProps.item.tipo_accion }}</span>
                                    <Badge :value="slotProps.item.estado_paso" :severity="getSeverity(slotProps.item.estado_paso)" class="text-xs"></Badge>
                                </div>
                                <div class="text-sm text-gray-600 mb-2">
                                    <div v-if="slotProps.item.user_signed">
                                        Gestionado por: <b>{{ slotProps.item.user_signed.name }}</b>
                                    </div>
                                    <div v-else>
                                        Asignado a:
                                        <span v-if="slotProps.item.permitted_positions?.length">{{ slotProps.item.permitted_positions.join(', ') }}</span>
                                        <span v-if="slotProps.item.permitted_users?.length"> / {{ slotProps.item.permitted_users.map((u) => u.name).join(', ') }}</span>
                                    </div>
                                </div>
                                <div class="text-xs text-gray-400" v-if="slotProps.item.fecha_firma"><i class="pi pi-calendar mr-1"></i> {{ formatDate(slotProps.item.fecha_firma) }}</div>
                                <div class="text-xs text-red-500 mt-2 font-medium" v-if="slotProps.item.comentario">Motivo rechazo: {{ slotProps.item.comentario }}</div>
                            </div>
                        </template>
                    </Timeline>
                </div>
            </div>
        </div>
    </Dialog>

    <!-- Dialogo de Rechazo -->
    <Dialog v-model:visible="showRejectDialog" header="Rechazar Documento" :style="{ width: '400px' }" modal>
        <div class="flex flex-column gap-3 py-3">
            <p class="m-0 text-sm text-gray-600">Por favor, indique el motivo por el cual rechaza este documento. Volverá al creador para corrección.</p>
            <div class="flex flex-column gap-2">
                <label for="comentario" class="font-bold">Motivo (Obligatorio)</label>
                <Textarea id="comentario" v-model="rejectComment" rows="4" placeholder="Firma incorrecta, datos inválidos..." autofocus />
            </div>
        </div>
        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" text @click="showRejectDialog = false" />
            <Button label="Rechazar" icon="pi pi-exclamation-triangle" class="p-button-danger" @click="submitReject" :disabled="!rejectComment.trim() || isSaving" :loading="isSaving" />
        </template>
    </Dialog>
</template>

<style scoped>
.viewer-dialog :deep(.p-dialog-content) {
    padding: 0;
    overflow: hidden;
}

.custom-marker {
    display: flex;
    width: 2rem;
    height: 2rem;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    border-radius: 50%;
    z-index: 1;
}

.customized-timeline :deep(.p-timeline-event-content) {
    padding-bottom: 0.5rem;
}
</style>
