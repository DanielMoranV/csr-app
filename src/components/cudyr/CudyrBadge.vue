<script setup>
import { computed } from 'vue';
import { cudyrUtils } from '@/api/cudyr';
import Tag from 'primevue/tag';

const props = defineProps({
    category: {
        type: String,
        required: true,
        validator: (value) => {
            return ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D3'].includes(value);
        }
    },
    size: {
        type: String,
        default: 'normal',
        validator: (value) => ['small', 'normal', 'large'].includes(value)
    },
    showLabel: {
        type: Boolean,
        default: true
    },
    showIcon: {
        type: Boolean,
        default: true
    }
});

// Obtener configuración de la categoría
const config = computed(() => cudyrUtils.getCategoryConfig(props.category));

// Clases de tamaño
const sizeClasses = computed(() => {
    const sizes = {
        small: 'cudyr-badge--small',
        normal: 'cudyr-badge--normal',
        large: 'cudyr-badge--large'
    };
    return sizes[props.size];
});
</script>

<template>
    <Tag :value="category" :severity="config.color" :class="['cudyr-badge', sizeClasses]">
        <template #default>
            <div class="cudyr-badge__content">
                <span v-if="showIcon" class="cudyr-badge__icon">{{ config.icon }}</span>
                <span class="cudyr-badge__category">{{ category }}</span>
                <span v-if="showLabel" class="cudyr-badge__label">({{ config.label }})</span>
            </div>
        </template>
    </Tag>
</template>

<style scoped>
.cudyr-badge {
    font-weight: 600;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
}

.cudyr-badge__content {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.cudyr-badge__icon {
    font-size: 1em;
    line-height: 1;
}

.cudyr-badge__category {
    font-weight: 700;
    letter-spacing: 0.5px;
}

.cudyr-badge__label {
    opacity: 0.9;
    font-weight: 600;
    margin-left: 0.125rem;
}

/* Tamaños */
.cudyr-badge--small {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
}

.cudyr-badge--small .cudyr-badge__icon {
    font-size: 0.875em;
}

.cudyr-badge--normal {
    font-size: 0.875rem;
    padding: 0.375rem 0.75rem;
}

.cudyr-badge--large {
    font-size: 1rem;
    padding: 0.5rem 1rem;
}

.cudyr-badge--large .cudyr-badge__icon {
    font-size: 1.25em;
}
</style>
