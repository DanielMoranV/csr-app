<template>
    <Dialog :visible="visible" :modal="true" :closable="true" :draggable="false" :style="{ width: '500px' }" @update:visible="$emit('update:visible', $event)">
        <template #header>
            <h3>
                <i class="pi pi-upload mr-2"></i>
                Importar {{ type === 'general' ? 'Tarifario General' : 'Tarifario de Médicos' }}
            </h3>
        </template>

        <div class="import-content">
            <Message severity="info" :closable="false" class="mb-4">
                <p class="m-0">
                    <strong>Formato:</strong> Archivo Excel (.xlsx, .xls)<br />
                    <strong>Tamaño máximo:</strong> 10 MB<br />
                    <strong>Acción:</strong> Crea nuevos registros o actualiza existentes
                </p>
            </Message>

            <FileUpload ref="fileUploader" mode="basic" accept=".xlsx,.xls" :maxFileSize="10485760" :auto="false" chooseLabel="Seleccionar Archivo" class="w-full mb-3" @select="onFileSelect" />

            <div v-if="selectedFile" class="selected-file p-3 border-round bg-primary-50 mb-3">
                <div class="flex align-items-center justify-content-between">
                    <div class="flex align-items-center">
                        <i class="pi pi-file-excel text-2xl text-green-600 mr-3"></i>
                        <div>
                            <p class="m-0 font-semibold">{{ selectedFile.name }}</p>
                            <p class="m-0 text-sm text-gray-600">{{ formatFileSize(selectedFile.size) }}</p>
                        </div>
                    </div>
                    <Button icon="pi pi-times" class="p-button-rounded p-button-text p-button-danger" @click="clearFile" />
                </div>
            </div>

            <div v-if="importResult" class="import-result">
                <Message :severity="importResult.severity" :closable="false">
                    <div class="result-details">
                        <p class="font-semibold mb-2">{{ importResult.message }}</p>
                        <ul class="m-0 pl-3">
                            <li v-if="importResult.data.created"><strong>Creados:</strong> {{ importResult.data.created }}</li>
                            <li v-if="importResult.data.updated"><strong>Actualizados:</strong> {{ importResult.data.updated }}</li>
                            <li v-if="importResult.data.skipped"><strong>Omitidos:</strong> {{ importResult.data.skipped }}</li>
                            <li v-if="importResult.data.doctors_not_found"><strong>Médicos no encontrados:</strong> {{ importResult.data.doctors_not_found }}</li>
                            <li v-if="importResult.data.tariffs_not_found"><strong>Tarifarios no encontrados:</strong> {{ importResult.data.tariffs_not_found }}</li>
                        </ul>
                    </div>
                </Message>
            </div>
        </div>

        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="closeDialog" :disabled="importing" />
            <Button label="Importar" icon="pi pi-check" class="p-button-success" @click="handleImport" :loading="importing" :disabled="!selectedFile" />
        </template>
    </Dialog>
</template>

<script setup>
import { useDoctorTariffs, useGeneralTariffs } from '@/composables/useTariffs';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import FileUpload from 'primevue/fileupload';
import Message from 'primevue/message';
import { ref } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    type: {
        type: String,
        required: true,
        validator: (value) => ['general', 'doctor'].includes(value)
    }
});

const emit = defineEmits(['update:visible', 'import-success']);

const { importTariffs: importGeneral } = useGeneralTariffs();
const { importTariffs: importDoctor } = useDoctorTariffs();

const fileUploader = ref(null);
const selectedFile = ref(null);
const importing = ref(false);
const importResult = ref(null);

const onFileSelect = (event) => {
    selectedFile.value = event.files[0];
    importResult.value = null;
};

const clearFile = () => {
    selectedFile.value = null;
    importResult.value = null;
    if (fileUploader.value) {
        fileUploader.value.clear();
    }
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const handleImport = async () => {
    if (!selectedFile.value) return;

    importing.value = true;
    importResult.value = null;

    try {
        const importFn = props.type === 'general' ? importGeneral : importDoctor;
        const result = await importFn(selectedFile.value);

        importResult.value = {
            severity: 'success',
            message: 'Importación completada exitosamente',
            data: result.data
        };

        emit('import-success', result);

        // Cerrar después de 3 segundos
        setTimeout(() => {
            closeDialog();
        }, 3000);
    } catch (error) {
        importResult.value = {
            severity: 'error',
            message: error.response?.data?.message || 'Error al importar el archivo',
            data: {}
        };
    } finally {
        importing.value = false;
    }
};

const closeDialog = () => {
    clearFile();
    importResult.value = null;
    emit('update:visible', false);
};
</script>

<style scoped>
.import-content {
    padding: 1rem 0;
}

.selected-file {
    border: 1px solid var(--primary-200);
}

.result-details ul {
    list-style: none;
}

.result-details li {
    padding: 0.25rem 0;
}
</style>
