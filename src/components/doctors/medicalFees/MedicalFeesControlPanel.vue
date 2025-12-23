<script setup>
import Button from 'primevue/button';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Dropdown from 'primevue/dropdown';

const props = defineProps({
    specialtyOptions: {
        type: Array,
        required: true
    },
    doctorOptions: {
        type: Array,
        required: true
    },
    typeOptions: {
        type: Array,
        required: true
    },
    selectedSpecialty: {
        type: Number,
        default: null
    },
    selectedMonth: {
        type: Date,
        required: true
    },
    selectedDoctor: {
        type: String,
        default: null
    },
    selectedType: {
        type: String,
        default: null
    },
    isLoading: {
        type: Boolean,
        default: false
    },
    showSummaryTable: {
        type: Boolean,
        default: false
    },
    canRecalculate: {
        type: Boolean,
        default: false
    },
    filteredServicesLength: {
        type: Number,
        default: 0
    }
});

const emit = defineEmits(['update:selectedSpecialty', 'update:selectedMonth', 'update:selectedDoctor', 'update:selectedType', 'update:showSummaryTable', 'search', 'export', 'bulk-approval', 'recalculate', 'month-change']);

function updateSpecialty(value) {
    emit('update:selectedSpecialty', value);
}

function updateMonth(value) {
    emit('update:selectedMonth', value);
}

function updateDoctor(value) {
    emit('update:selectedDoctor', value);
}

function updateType(value) {
    emit('update:selectedType', value);
}

function toggleSummaryTable() {
    emit('update:showSummaryTable', !props.showSummaryTable);
}

function handleSearch() {
    emit('search');
}

function handleExport() {
    emit('export');
}

function handleBulkApproval() {
    emit('bulk-approval');
}

function handleRecalculate() {
    emit('recalculate');
}

function handleMonthChange() {
    emit('month-change');
}
</script>

<template>
    <Card class="control-panel">
        <template #title> <i class="pi pi-sliders-h"></i> Panel de Control </template>
        <template #content>
            <div class="control-grid">
                <div class="control-item">
                    <label>Especialidad</label>
                    <Dropdown :model-value="selectedSpecialty" @update:model-value="updateSpecialty" :options="specialtyOptions" optionLabel="label" optionValue="value" placeholder="Seleccionar especialidad" :filter="true" class="w-full" />
                </div>

                <div class="control-item">
                    <label>Mes</label>
                    <DatePicker :model-value="selectedMonth" @update:model-value="updateMonth" view="month" dateFormat="MM yy" @date-select="handleMonthChange" placeholder="Seleccionar mes" class="w-full" />
                </div>

                <div class="control-item">
                    <label>Médico</label>
                    <Dropdown :model-value="selectedDoctor" @update:model-value="updateDoctor" :options="doctorOptions" optionLabel="label" optionValue="value" placeholder="Seleccionar médico" :filter="true" class="w-full" showClear />
                </div>

                <div class="control-item">
                    <label>Tipo</label>
                    <Dropdown :model-value="selectedType" @update:model-value="updateType" :options="typeOptions" optionLabel="label" optionValue="value" placeholder="Seleccionar tipo" class="w-full" />
                </div>

                <div class="control-item">
                    <label>&nbsp;</label>
                    <div class="flex gap-2">
                        <Button icon="pi pi-search" v-tooltip.top="'Buscar en BD'" @click="handleSearch" :loading="isLoading" severity="info" />
                        <Button
                            :icon="showSummaryTable ? 'pi pi-eye-slash' : 'pi pi-chart-bar'"
                            v-tooltip.top="showSummaryTable ? 'Ocultar Resumen' : 'Ver Resumen por Médico'"
                            @click="toggleSummaryTable"
                            :severity="showSummaryTable ? 'secondary' : 'help'"
                            :disabled="filteredServicesLength === 0"
                        />
                        <Button icon="pi pi-check-circle" v-tooltip.top="'Aprobar/Rechazar Atenciones'" @click="handleBulkApproval" severity="warn" :disabled="!selectedDoctor || filteredServicesLength === 0" />
                        <Button icon="pi pi-calculator" v-tooltip.top="'Recalcular Comisiones'" @click="handleRecalculate" severity="warning" :disabled="!canRecalculate" />
                        <Button icon="pi pi-file-excel" v-tooltip.top="'Exportar Excel'" @click="handleExport" class="p-button-success" :disabled="filteredServicesLength === 0" />
                    </div>
                </div>
            </div>
        </template>
    </Card>
</template>

<style scoped>
.control-panel {
    margin-bottom: 2rem;
}

.control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
}

.control-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.control-item label {
    font-weight: 600;
    color: #4a5568;
    font-size: 0.875rem;
}

@media (max-width: 768px) {
    .control-grid {
        grid-template-columns: 1fr;
    }
}
</style>
