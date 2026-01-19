<script setup>
import labTestsData from '@/data/laboratorio.json';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
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
const data = ref(labTestsData);
const selectedItems = ref([]);
const otherInputs = ref({}); // Store inputs for 'Otros' fields: { 'Category': 'Custom Text' }
const activeIndex = ref([0]); // Manage Accordion state to prevent collapses

// Initialize
watch(
    () => props.visible,
    (newVal) => {
        if (newVal) {
            // Deep copy selected items
            selectedItems.value = props.selectedLabTests.map((item) => ({ ...item }));

            // Restore 'Otros' inputs
            otherInputs.value = {};
            selectedItems.value.forEach((item) => {
                if (item.isOther) {
                    otherInputs.value[item.category] = item.customText || '';
                }
            });
        }
    }
);

const categories = computed(() => Object.keys(data.value));

const selectedCount = computed(() => selectedItems.value.length);

// Actions
const handleSave = () => {
    // Process items before saving, ensuring 'Otros' have their text attached
    const finalSelection = selectedItems.value.map((item) => {
        if (item.isOther) {
            const customText = otherInputs.value[item.category] || '';
            return {
                ...item,
                nom_sgp: `${item.baseName}: ${customText}`,
                customText: customText
            };
        }
        return item;
    });

    emit('save', finalSelection);
    emit('hide');
};

const handleCancel = () => {
    emit('hide');
};

// Item Identification Helper
const getItemId = (name, category) => `${category}-${name}`;

// Check if test is selected
const isSelected = (name, category) => {
    return selectedItems.value.some((item) => item.id === getItemId(name, category));
};

// Toggle selection
const toggleItem = (name, category, isProfile = false, description = null) => {
    const id = getItemId(name, category);
    const index = selectedItems.value.findIndex((item) => item.id === id);
    const isOther = name.toLowerCase().includes('otros');

    if (index > -1) {
        selectedItems.value.splice(index, 1);
        if (isOther) {
            delete otherInputs.value[category];
        }
    } else {
        selectedItems.value.push({
            id,
            nom_sgp: name, // This might be updated for 'Otros' on save
            baseName: name, // Keep original name for display/logic
            category,
            isProfile,
            isOther,
            description // For profiles, contains the list of contents
        });
    }
};

const getProfileContent = (items) => {
    if (Array.isArray(items)) {
        return items.join(', ');
    }
    return '';
};
</script>

<template>
    <Dialog :visible="visible" :style="{ width: '1000px', maxWidth: '95vw', maxHeight: '90vh' }" header="Seleccionar Análisis de Laboratorio" :modal="true" class="lab-tests-dialog" @update:visible="handleCancel">
        <template #header>
            <div class="flex align-items-center gap-2 w-full">
                <i class="pi pi-flask text-blue-600 text-xl"></i>
                <span class="font-semibold">Seleccionar Análisis de Laboratorio</span>
                <Tag v-if="selectedCount > 0" :value="`${selectedCount} seleccionado${selectedCount > 1 ? 's' : ''}`" severity="info" class="ml-auto" />
            </div>
        </template>

        <div class="lab-tests-content">
            <Accordion :multiple="true" v-model:activeIndex="activeIndex">
                <AccordionTab v-for="category in categories" :key="category" :header="category.replace(/_/g, ' ')">
                    <!-- Perfiles Logic -->
                    <div v-if="category === 'Perfiles'" class="grid">
                        <div v-for="(content, profilName) in data[category]" :key="profilName" class="col-12 md:col-6 mb-2">
                            <div
                                class="p-3 border-1 surface-border border-round hover:surface-50 cursor-pointer transition-colors"
                                :class="{ 'surface-100 border-primary': isSelected(profilName, category) }"
                                @click="toggleItem(profilName, category, true, getProfileContent(content))"
                            >
                                <div class="flex align-items-start gap-3">
                                    <Checkbox :modelValue="isSelected(profilName, category)" :binary="true" readonly class="mt-1" />
                                    <div>
                                        <div class="font-bold mb-1">{{ profilName.replace(/_/g, ' ') }}</div>
                                        <div class="text-sm text-600 line-height-3">{{ getProfileContent(content) }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Regular Lists Logic -->
                    <div v-else class="tests-grid">
                        <div v-for="testName in data[category]" :key="testName" class="test-item">
                            <div
                                class="flex field-checkbox h-full align-items-start p-2 border-1 border-transparent hover:surface-50 border-round cursor-pointer transition-colors"
                                :class="{ 'surface-100 border-primary': isSelected(testName, category) }"
                                @click="toggleItem(testName, category)"
                            >
                                <Checkbox :inputId="getItemId(testName, category)" :modelValue="isSelected(testName, category)" :binary="true" readonly class="pointer-events-none mt-1" />
                                <div class="ml-2 w-full">
                                    <label :for="getItemId(testName, category)" class="cursor-pointer font-medium block mb-1 pointer-events-none">
                                        {{ testName }}
                                    </label>

                                    <!-- Input for 'Otros' -->
                                    <div v-if="isSelected(testName, category) && testName.toLowerCase().includes('otros')" class="mt-2 animation-duration-200 fadein">
                                        <InputText v-model="otherInputs[category]" placeholder="Especifique el análisis..." class="p-inputtext-sm w-full" @click.stop />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </AccordionTab>
            </Accordion>
        </div>

        <template #footer>
            <div class="flex justify-content-between align-items-center pt-3 border-top-1 border-200">
                <div class="text-sm text-600">
                    <i class="pi pi-info-circle mr-2"></i>
                    Marque las casillas para seleccionar
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
    padding: 0;
}

.lab-tests-content {
    min-height: 400px;
    max-height: 65vh;
    overflow-y: auto;
    background-color: var(--surface-ground);
    padding: 1rem;
}

:deep(.p-accordion .p-accordion-header .p-accordion-header-link) {
    background-color: var(--surface-0);
    border-bottom: 1px solid var(--surface-200);
}

:deep(.p-accordion .p-accordion-content) {
    background-color: var(--surface-0);
    border: none;
    padding: 1rem;
}

/* Header style override */
:deep(.p-dialog-header) {
    padding: 1rem 1.5rem;
    background: var(--surface-0);
    border-bottom: 1px solid var(--surface-200);
}

:deep(.p-accordion-tab) {
    margin-bottom: 0.5rem;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

@media (max-width: 768px) {
    .lab-tests-content {
        padding: 0.5rem;
    }
}

.tests-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
}
</style>
