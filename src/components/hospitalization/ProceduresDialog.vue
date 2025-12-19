<script setup>
import { generalTariffs as generalTariffsApi } from '@/api';
import { apiUtils } from '@/api/axios';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: Boolean,
    selectedProcedures: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['hide', 'save']);

// State
const allProcedures = ref([]); // Store all procedures
const selectedItems = ref([]);
const searchQuery = ref('');
const isLoading = ref(false);

// Initialize selected items from props and load procedures when dialog opens
watch(
    () => props.visible,
    (newVal) => {
        if (newVal) {
            selectedItems.value = [...props.selectedProcedures];
            // Load procedures if not already loaded
            if (allProcedures.value.length === 0) {
                fetchAllProcedures();
            }
        }
    }
);

// Fetch all procedures once on mount
const fetchAllProcedures = async () => {
    isLoading.value = true;
    try {
        const response = await generalTariffsApi.getAll();

        // Handle direct array response (backend returns array directly, not wrapped)
        let data;
        if (Array.isArray(response)) {
            data = response;
        } else if (apiUtils.isSuccess(response)) {
            data = apiUtils.getData(response);
        } else {
            data = [];
        }

        allProcedures.value = data || [];
    } catch (error) {
        console.error('Error fetching procedures:', error);
    } finally {
        isLoading.value = false;
    }
};

// Computed: Filter procedures locally based on search query
const filteredProcedures = computed(() => {
    // Show nothing if search is empty or less than 4 characters
    if (!searchQuery.value || searchQuery.value.trim().length < 4) {
        return [];
    }

    const query = searchQuery.value.toLowerCase().trim();
    return allProcedures.value.filter((procedure) => {
        return (procedure.code && procedure.code.toLowerCase().includes(query)) || (procedure.name && procedure.name.toLowerCase().includes(query)) || (procedure.title && procedure.title.toLowerCase().includes(query));
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

// Check if procedure is selected
const isProcedureSelected = (procedure) => {
    return selectedItems.value.some((item) => item.id === procedure.id);
};

// Toggle procedure selection
const toggleProcedure = (procedure) => {
    const index = selectedItems.value.findIndex((item) => item.id === procedure.id);
    if (index > -1) {
        selectedItems.value.splice(index, 1);
    } else {
        selectedItems.value.push(procedure);
    }
};
</script>

<template>
    <Dialog :visible="visible" :style="{ width: '800px', maxHeight: '90vh' }" header="Seleccionar Procedimientos" :modal="true" class="procedures-dialog" @update:visible="handleCancel">
        <template #header>
            <div class="flex align-items-center gap-2 w-full">
                <i class="pi pi-list text-blue-600 text-xl"></i>
                <span class="font-semibold">Seleccionar Procedimientos</span>
                <Tag v-if="selectedCount > 0" :value="`${selectedCount} seleccionado${selectedCount > 1 ? 's' : ''}`" severity="info" class="ml-auto" />
            </div>
        </template>

        <div class="procedures-content">
            <!-- Search Input -->
            <div class="mb-3">
                <IconField>
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="searchQuery" placeholder="Buscar por código o nombre..." class="w-full" />
                </IconField>
            </div>

            <!-- Procedures List -->
            <div class="procedures-list" v-if="!isLoading">
                <div v-if="filteredProcedures.length === 0" class="text-center text-500 py-4">
                    <i class="pi pi-inbox text-4xl mb-3"></i>
                    <p>No se encontraron procedimientos</p>
                </div>

                <div v-for="procedure in filteredProcedures" :key="procedure.id" class="procedure-item" :class="{ selected: isProcedureSelected(procedure) }" @click="toggleProcedure(procedure)">
                    <div class="flex align-items-start gap-3">
                        <Checkbox :modelValue="isProcedureSelected(procedure)" :binary="true" @click.stop="toggleProcedure(procedure)" />
                        <div class="flex-1">
                            <div class="font-semibold text-900">{{ procedure.name }}</div>
                            <div class="text-sm text-600 mt-1"><span class="font-medium">Código:</span> {{ procedure.code }}</div>
                            <div v-if="procedure.title" class="text-xs text-500 mt-1">
                                {{ procedure.title }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Loading State -->
            <div v-else class="text-center py-5">
                <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
                <p class="text-500 mt-3">Cargando procedimientos...</p>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-content-between align-items-center pt-3 border-top-1 border-200">
                <div class="text-sm text-600">
                    <i class="pi pi-info-circle mr-2"></i>
                    Seleccione uno o más procedimientos
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
.procedures-dialog :deep(.p-dialog-content) {
    padding: 1.25rem;
}

.procedures-content {
    min-height: 400px;
    max-height: 60vh;
}

.procedures-list {
    max-height: 50vh;
    overflow-y: auto;
    border: 1px solid var(--surface-border);
    border-radius: var(--border-radius);
    padding: 0.5rem;
}

.procedure-item {
    padding: 1rem;
    border: 1px solid var(--surface-border);
    border-radius: var(--border-radius);
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--surface-0);
}

.procedure-item:hover {
    background: var(--surface-50);
    border-color: var(--primary-color);
    transform: translateX(4px);
}

.procedure-item.selected {
    background: var(--primary-50);
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
}

.procedure-item:last-child {
    margin-bottom: 0;
}

/* Scrollbar styling */
.procedures-list::-webkit-scrollbar {
    width: 8px;
}

.procedures-list::-webkit-scrollbar-track {
    background: var(--surface-50);
    border-radius: 4px;
}

.procedures-list::-webkit-scrollbar-thumb {
    background: var(--surface-300);
    border-radius: 4px;
}

.procedures-list::-webkit-scrollbar-thumb:hover {
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
    .procedures-dialog {
        max-width: 100vw;
        margin: 0.5rem;
    }

    .procedure-item {
        padding: 0.75rem;
    }
}
</style>
