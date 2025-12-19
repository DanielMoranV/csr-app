<script setup>
import labTestsData from '@/data/analisis_laboratorio.json';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: Boolean,
    selectedLabTests: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['hide', 'save']);

// State
const allLabTests = ref(labTestsData); // Load from JSON
const selectedItems = ref([]);
const searchQuery = ref('');

// Initialize selected items from props
watch(
    () => props.visible,
    (newVal) => {
        if (newVal) {
            selectedItems.value = [...props.selectedLabTests];
        }
    }
);

// Computed: Filter lab tests locally based on search query
const filteredLabTests = computed(() => {
    // Show nothing if search is empty or less than 4 characters
    if (!searchQuery.value || searchQuery.value.trim().length < 4) {
        return [];
    }

    const query = searchQuery.value.toLowerCase().trim();
    return allLabTests.value.filter((test) => {
        return (test.cod_seg && test.cod_seg.toLowerCase().includes(query)) || (test.nom_sgp && test.nom_sgp.toLowerCase().includes(query));
    });
});

// Computed
const selectedCount = computed(() => selectedItems.value.length);

// Actions
const handleSave = () => {
    emit('save', selectedItems.value);
    emit('hide');
};

const handleCancel = () => {
    emit('hide');
};

// Check if test is selected
const isTestSelected = (test) => {
    return selectedItems.value.some((item) => item.cod_sgp === test.cod_sgp);
};

// Toggle test selection
const toggleTest = (test) => {
    const index = selectedItems.value.findIndex((item) => item.cod_sgp === test.cod_sgp);
    if (index > -1) {
        selectedItems.value.splice(index, 1);
    } else {
        selectedItems.value.push(test);
    }
};
</script>

<template>
    <Dialog :visible="visible" :style="{ width: '800px', maxHeight: '90vh' }" header="Seleccionar Análisis de Laboratorio" :modal="true" class="lab-tests-dialog" @update:visible="handleCancel">
        <template #header>
            <div class="flex align-items-center gap-2 w-full">
                <i class="pi pi-flask text-blue-600 text-xl"></i>
                <span class="font-semibold">Seleccionar Análisis de Laboratorio</span>
                <Tag v-if="selectedCount > 0" :value="`${selectedCount} seleccionado${selectedCount > 1 ? 's' : ''}`" severity="info" class="ml-auto" />
            </div>
        </template>

        <div class="lab-tests-content">
            <!-- Search Input -->
            <div class="mb-3">
                <IconField>
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchQuery" placeholder="Buscar por código o nombre (mínimo 4 caracteres)..." class="w-full" />
                </IconField>
            </div>

            <!-- Lab Tests List -->
            <div class="lab-tests-list" v-if="filteredLabTests.length > 0">
                <div v-for="test in filteredLabTests" :key="test.cod_sgp" class="lab-test-item" :class="{ selected: isTestSelected(test) }" @click="toggleTest(test)">
                    <div class="flex align-items-start gap-3">
                        <Checkbox :modelValue="isTestSelected(test)" :binary="true" @click.stop="toggleTest(test)" />
                        <div class="flex-1">
                            <div class="font-semibold text-900">{{ test.nom_sgp }}</div>
                            <div class="text-sm text-600 mt-1" v-if="test.cod_seg"><span class="font-medium">Código:</span> {{ test.cod_seg }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center text-500 py-5">
                <i class="pi pi-search text-4xl mb-3"></i>
                <p v-if="!searchQuery || searchQuery.trim().length < 4">Ingrese al menos 4 caracteres para buscar</p>
                <p v-else>No se encontraron análisis</p>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-content-between align-items-center pt-3 border-top-1 border-200">
                <div class="text-sm text-600">
                    <i class="pi pi-info-circle mr-2"></i>
                    Seleccione uno o más análisis
                </div>
                <div class="flex gap-2">
                    <Button label="Cancelar" icon="pi pi-times" class="p-button-text p-button-sm" @click="handleCancel" />
                    <Button label="Guardar Selección" icon="pi pi-check" class="p-button-sm" @click="handleSave" :disabled="selectedCount === 0" />
                </div>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.lab-tests-dialog :deep(.p-dialog-content) {
    padding: 1.25rem;
}

.lab-tests-content {
    min-height: 400px;
    max-height: 60vh;
}

.lab-tests-list {
    max-height: 50vh;
    overflow-y: auto;
    border: 1px solid var(--surface-border);
    border-radius: var(--border-radius);
    padding: 0.5rem;
}

.lab-test-item {
    padding: 1rem;
    border: 1px solid var(--surface-border);
    border-radius: var(--border-radius);
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--surface-0);
}

.lab-test-item:hover {
    background: var(--surface-50);
    border-color: var(--primary-color);
    transform: translateX(4px);
}

.lab-test-item.selected {
    background: var(--primary-50);
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
}

.lab-test-item:last-child {
    margin-bottom: 0;
}

/* Scrollbar styling */
.lab-tests-list::-webkit-scrollbar {
    width: 8px;
}

.lab-tests-list::-webkit-scrollbar-track {
    background: var(--surface-50);
    border-radius: 4px;
}

.lab-tests-list::-webkit-scrollbar-thumb {
    background: var(--surface-300);
    border-radius: 4px;
}

.lab-tests-list::-webkit-scrollbar-thumb:hover {
    background: var(--surface-400);
}

/* Header styling */
:deep(.p-dialog-header) {
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, var(--surface-0) 0%, var(--surface-50) 100%);
    border-bottom: 1px solid var(--surface-200);
}

/* Footer styling */
:deep(.p-dialog-footer) {
    padding: 1rem 1.25rem;
    background: var(--surface-0);
}

/* Responsive */
@media (max-width: 768px) {
    .lab-tests-dialog {
        max-width: 100vw;
        margin: 0.5rem;
    }

    .lab-test-item {
        padding: 0.75rem;
    }
}
</style>
