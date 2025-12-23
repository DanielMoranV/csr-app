<template>
    <OverlayPanel ref="op">
        <div class="p-fluid" style="width: 320px">
            <h4 class="mt-0 mb-3">Editar Comisión</h4>

            <div class="field mb-3">
                <label class="font-semibold">Monto del Servicio</label>
                <p class="font-bold text-lg mt-2 mb-0">S/ {{ service?.amount?.toFixed(2) || '0.00' }}</p>
            </div>

            <div class="field mb-3">
                <label class="font-semibold" for="percentage">Porcentaje de Comisión</label>
                <InputNumber id="percentage" v-model="percentage" :min="0" :max="100" suffix="%" :minFractionDigits="1" :maxFractionDigits="2" locale="en-US" class="mt-2" />
            </div>

            <div class="field mb-4">
                <label class="font-semibold">Comisión Resultante</label>
                <p class="text-primary font-bold text-2xl mt-2 mb-0">S/ {{ calculatedCommission.toFixed(2) }}</p>
            </div>

            <div class="flex gap-2 justify-content-end">
                <Button label="Cancelar" text @click="hide" />
                <Button label="Aplicar" @click="apply" severity="success" icon="pi pi-check" />
            </div>
        </div>
    </OverlayPanel>
</template>

<script setup>
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import OverlayPanel from 'primevue/overlaypanel';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    service: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['apply']);

const op = ref();
const percentage = ref(0);

const calculatedCommission = computed(() => {
    if (!props.service?.amount) return 0;
    return (props.service.amount * percentage.value) / 100;
});

// Actualizar porcentaje cuando cambia el servicio
watch(
    () => props.service,
    (newService) => {
        if (newService && newService.amount > 0) {
            percentage.value = parseFloat(((newService.comision / newService.amount) * 100).toFixed(2));
        }
    },
    { immediate: true }
);

const show = (event) => {
    if (props.service && props.service.amount > 0) {
        percentage.value = parseFloat(((props.service.comision / props.service.amount) * 100).toFixed(2));
    }
    op.value.show(event);
};

const apply = () => {
    emit('apply', calculatedCommission.value);
    op.value.hide();
};

const hide = () => {
    op.value.hide();
};

defineExpose({ show, hide });
</script>

<style scoped>
.p-fluid .field {
    margin-bottom: 1rem;
}
</style>
