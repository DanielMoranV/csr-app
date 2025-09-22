<script setup>
import axios, { api_url } from '@/api/axios.js'; // Import the pre-configured axios instance and api_url
import { useAuthStore } from '@/store/authStore';
import { useTicketAttachmentsStore } from '@/store/ticketAttachmentsStore';
import Button from 'primevue/button';
import Card from 'primevue/card';
import FileUpload from 'primevue/fileupload';
import ProgressBar from 'primevue/progressbar'; // New import for ProgressBar
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { ref, watch } from 'vue';
//import ConfirmDialog from '../ConfirmDialog.vue'; // Assuming ConfirmDialog is in the same directory

const props = defineProps({
    ticketId: {
        type: Number,
        required: true
    }
});

const attachmentsStore = useTicketAttachmentsStore();
const authStore = useAuthStore();
const toast = useToast();

const confirmDeleteDialogVisible = ref(false);
const selectedAttachment = ref(null);

// Refs for custom upload
const fileUploadRef = ref(null);
const selectedFile = ref(null);
const isUploading = ref(false);
const uploadProgress = ref(0);

watch(
    () => props.ticketId,
    (newId) => {
        if (newId) {
            attachmentsStore.fetchAttachments(newId);
        }
    },
    { immediate: true }
);

// --- Custom Upload Logic ---
const onFileSelect = (event) => {
    const file = event.files[0];
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ]; // Added more types
    const maxSize = 10 * 1024 * 1024; // 10MB (from FileUpload maxFileSize prop)

    if (!allowedTypes.includes(file.type) || file.size > maxSize) {
        toast.add({ severity: 'error', summary: 'Archivo no válido', detail: 'El archivo no cumple con el formato o tamaño permitido (Max 10MB).', life: 5000 });
        fileUploadRef.value.clear();
        selectedFile.value = null;
        return;
    }

    selectedFile.value = file;
    toast.add({ severity: 'info', summary: 'Archivo listo', detail: 'El archivo está listo para ser subido.', life: 3000 });
};

const onFileClear = () => {
    selectedFile.value = null;
    uploadProgress.value = 0;
    isUploading.value = false;
};

const uploadFile = async () => {
    if (!selectedFile.value) return;

    isUploading.value = true;
    uploadProgress.value = 0;

    const formData = new FormData();
    formData.append('attachment', selectedFile.value); // Backend expects 'attachment'
    // formData.append('description', 'Mi archivo subido desde Vue'); // Optional, if backend expects it

    try {
        const response = await axios.post(`${api_url}/tickets/${props.ticketId}/attachments`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            }
        });

        if (response.success) {
            toast.add({ severity: 'success', summary: '¡Éxito!', detail: 'El archivo se ha subido correctamente.', life: 3000 });
            attachmentsStore.fetchAttachments(props.ticketId); // Refresh list
            setTimeout(() => {
                selectedFile.value = null;
                uploadProgress.value = 0;
                fileUploadRef.value.clear();
            }, 1500);
        } else {
            throw response; // Let the error interceptor handle it
        }
    } catch (error) {
        console.error('Error en la subida:', error);
        toast.add({ severity: 'error', summary: 'Error en la subida', detail: error.message || 'Ocurrió un error inesperado.', life: 5000 });
        uploadProgress.value = 0;
    } finally {
        isUploading.value = false;
    }
};

const downloadAttachment = async (attachment) => {
    toast.add({ severity: 'info', summary: 'Descargando', detail: `Descargando ${attachment.file_name}...`, life: 3000 });
    try {
        const response = await axios.get(`${api_url}/tickets/${attachment.attachable_id}/attachments/${attachment.id}`, {
            responseType: 'blob' // Important to handle binary data
        });

        // Create a URL for the blob
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', attachment.file_name); // Set the filename for download
        document.body.appendChild(link);
        link.click();

        // Clean up
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.add({ severity: 'success', summary: '¡Éxito!', detail: 'La descarga ha comenzado.', life: 3000 });
    } catch (error) {
        console.error('Error downloading attachment:', error);
        toast.add({
            severity: 'error',
            summary: 'Error en la descarga',
            detail: error.response?.data?.message || 'No se pudo descargar el archivo. Verifique su conexión o permisos.',
            life: 5000
        });
    }
};

const confirmDeleteAttachment = (attachment) => {
    selectedAttachment.value = attachment;
    confirmDeleteDialogVisible.value = true;
};

const deleteAttachment = async () => {
    if (selectedAttachment.value) {
        try {
            await attachmentsStore.deleteAttachment(props.ticketId, selectedAttachment.value.id);
            toast.add({ severity: 'success', summary: 'Eliminación Exitosa', detail: 'Adjunto eliminado correctamente', life: 3000 });
            confirmDeleteDialogVisible.value = false;
            selectedAttachment.value = null;
        } catch (error) {
            console.error('Error deleting attachment:', error);
            toast.add({ severity: 'error', summary: 'Error', detail: error.message || 'No se pudo eliminar el adjunto', life: 3000 });
        }
    }
};

const canDeleteAttachment = (attachment) => {
    const currentUser = authStore.authUser;
    if (!currentUser) return false;
    // User who uploaded the file OR the ticket creator can delete
    return currentUser.id === attachment.user_id || currentUser.id === attachmentsStore.ticketCreatorId; // Assuming attachmentsStore can get ticketCreatorId
};

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
</script>

<template>
    <div class="ticket-attachments-container">
        <h3 class="attachments-title">Adjuntos del Ticket</h3>

        <div class="p-fluid mb-4">
            <FileUpload
                ref="fileUploadRef"
                name="file"
                :multiple="false"
                :customUpload="true"
                @select="onFileSelect"
                @clear="onFileClear"
                :showUploadButton="false"
                :showCancelButton="false"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                :maxFileSize="10000000"
                :disabled="!ticketId"
            >
                <template #header="{ chooseCallback, clearCallback, files }">
                    <div class="flex flex-wrap justify-between items-center flex-1 gap-4">
                        <div class="flex gap-2">
                            <Button @click="chooseCallback()" icon="pi pi-images" rounded outlined></Button>
                            <Button @click="clearCallback()" icon="pi pi-times" rounded outlined severity="danger" :disabled="!files || files.length === 0"></Button>
                        </div>
                    </div>
                </template>
                <template #empty>
                    <p>Arrastra y suelta archivos aquí para subirlos.</p>
                </template>
            </FileUpload>

            <div v-if="selectedFile" class="mt-4">
                <ProgressBar :value="uploadProgress" class="mb-2"></ProgressBar>
                <Button label="Subir Archivo" icon="pi pi-upload" @click="uploadFile" :disabled="isUploading" :loading="isUploading" />
            </div>
        </div>

        <div v-if="attachmentsStore.isLoading" class="text-center p-4"><i class="pi pi-spin pi-spinner text-xl"></i> Cargando adjuntos...</div>
        <div v-else-if="attachmentsStore.allAttachments.length === 0" class="p-message p-message-info mt-3">
            <div class="p-message-wrapper">
                <span class="p-message-icon pi pi-info-circle"></span>
                <div class="p-message-text">No hay adjuntos para este ticket.</div>
            </div>
        </div>
        <div v-else class="attachments-list">
            <Card v-for="attachment in attachmentsStore.allAttachments" :key="attachment.id" class="attachment-item mb-3">
                <template #title>
                    <div class="flex align-items-center justify-content-between">
                        <span class="file-name">{{ attachment.file_name }}</span>
                        <Tag :value="formatBytes(attachment.file_size)" severity="info" />
                    </div>
                </template>
                <template #subtitle> Subido por {{ attachment.user?.name || 'Desconocido' }} el {{ formatDateTime(attachment.created_at) }} </template>
                <template #content>
                    <div class="flex gap-2">
                        <Button icon="pi pi-download" label="Descargar" class="p-button-sm" @click="downloadAttachment(attachment)" />
                        <Button icon="pi pi-trash" label="Eliminar" class="p-button-danger p-button-sm" @click="confirmDeleteAttachment(attachment)" :disabled="!canDeleteAttachment(attachment)" />
                    </div>
                </template>
            </Card>
        </div>

        <ConfirmDialog
            v-model:visible="confirmDeleteDialogVisible"
            :title="'Eliminar Adjunto'"
            :message="`¿Está seguro que desea eliminar el adjunto '${selectedAttachment?.file_name}'?`"
            :details="'Esta acción eliminará permanentemente el archivo adjunto y no se puede deshacer.'"
            :action-type="'delete'"
            :processing="attachmentsStore.isDeleting"
            :require-text-confirmation="true"
            :confirmation-text="'ELIMINAR'"
            @confirm="deleteAttachment"
            @cancel="confirmDeleteDialogVisible = false"
        />
    </div>
</template>

<style scoped>
.ticket-attachments-container {
    padding: 1rem;
    background-color: var(--surface-card);
    border-radius: 8px;
    box-shadow: var(--surface-shadow);
}

.attachments-title {
    font-size: 1.5rem;
    color: var(--text-color);
    margin-bottom: 1.5rem;
    text-align: center;
}

.attachments-list {
    margin-top: 1.5rem;
}

.attachment-item {
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.2s ease;
}

.attachment-item:hover {
    box-shadow: var(--surface-shadow-hover);
    transform: translateY(-2px);
}

.file-name {
    font-weight: 600;
    color: var(--text-color);
    font-size: 1.1rem;
}

.p-message {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    border-radius: 6px;
    background-color: var(--blue-50);
    border: 1px solid var(--blue-200);
    color: var(--blue-700);
}

.p-message-icon {
    margin-right: 0.5rem;
    font-size: 1.2rem;
}

.p-message-text {
    font-size: 0.9rem;
}
</style>
