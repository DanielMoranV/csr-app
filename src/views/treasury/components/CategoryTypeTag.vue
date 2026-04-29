<script setup>
import { computed } from 'vue';

const props = defineProps({
    type: {
        type: String,
        required: true
    }
});

const config = computed(() => {
    const map = {
        I: { label: 'Ingreso', severity: 'success', icon: 'pi pi-arrow-down-left' },
        E: { label: 'Egreso', severity: 'danger', icon: 'pi pi-arrow-up-right' },
        M: { label: 'Mixto', severity: 'info', icon: 'pi pi-arrows-h' }
    };
    return map[props.type] ?? { label: props.type, severity: 'secondary', icon: 'pi pi-tag' };
});
</script>

<template>
    <Tag :value="config.label" :severity="config.severity" :icon="config.icon" />
</template>
