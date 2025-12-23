<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" header="Aplicar Comisión a Servicios Seleccionados" :style="{ width: '700px' }" :modal="true">
        <div class="p-fluid">
            <Message severity="info" :closable="false" class="mb-3">
                <strong>{{ selectedServices.length }}</strong> servicios seleccionados
            </Message>

            <div class="field mb-4">
                <label class="font-semibold" for="bulk-percentage">Porcentaje de Comisión (%)</label>
                <InputNumber id="bulk-percentage" v-model="percentage" :min="0" :max="100" suffix="%" :minFractionDigits="1" :maxFractionDigits="2" locale="en-US" class="mt-2" placeholder="Ej: 15.5" />
            </div>

            <div class="field mb-3">
                <label class="font-semibold">Preview de Cambios</label>
                <DataTable :value="previewData" size="small" :rows="5" :paginator="previewData.length > 5" class="mt-2" stripedRows>
                    <Column field="serviceName" header="Servicio" style="width: 40%">
                        <template #body="slotProps">
                            <div class="text-sm">{{ slotProps.data.serviceName }}</div>
                        </template>
                    </Column>
                    <Column field="amount" header="Monto" style="width: 25%">
                        <template #body="slotProps">
                            <span class="text-sm">S/ {{ slotProps.data.amount.toFixed(2) }}</span>
                        </template>
                    </Column>
                    <Column field="newCommission" header="Nueva Comisión" style="width: 35%">
                        <template #body="slotProps">
                            <span class="text-primary font-bold text-sm"> S/ {{ slotProps.data.newCommission.toFixed(2) }} </span>
                            <small class="text-500 ml-2">({{ percentage }}%)</small>
                        </template>
                    </Column>
                </DataTable>
            </div>

            <div class="field">
                <div class="surface-100 border-round p-3">
                    <div class="flex justify-content-between align-items-center">
                        <span class="font-semibold">Total de Comisiones:</span>
                        <span class="text-primary font-bold text-2xl"> S/ {{ totalCommissions.toFixed(2) }} </span>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="Cancelar" text @click="close" />
            <Button label="Aplicar a Todos" @click="apply" severity="success" icon="pi pi-check" :disabled="!percentage || percentage <= 0" />
        </template>
    </Dialog>
</template>

<script setup>
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import Message from 'primevue/message';
import { computed, ref } from 'vue';

const props = defineProps({
    selectedServices: {
        type: Array,
        default: () => []
    },
    visible: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['apply', 'update:visible']);

const percentage = ref(0);

const previewData = computed(() => {
    return props.selectedServices.map((service) => ({
        ...service,
        newCommission: (service.amount * percentage.value) / 100
    }));
});

const totalCommissions = computed(() => {
    return previewData.value.reduce((sum, item) => sum + item.newCommission, 0);
});

const apply = () => {
    if (percentage.value > 0) {
        emit('apply', percentage.value);
        close();
    }
};

const close = () => {
    emit('update:visible', false);
    percentage.value = 0;
};
</script>
