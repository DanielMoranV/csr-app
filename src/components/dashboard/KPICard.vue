<script setup>
import { computed } from 'vue';

const props = defineProps({
    title: {
        type: String,
        required: true
    },
    value: {
        type: [String, Number],
        required: true
    },
    subtitle: {
        type: String,
        default: ''
    },
    icon: {
        type: String,
        default: 'pi-chart-bar'
    },
    color: {
        type: String,
        default: 'blue',
        validator: (value) => ['blue', 'green', 'yellow', 'purple', 'red', 'orange', 'teal'].includes(value)
    },
    trend: {
        type: Object,
        default: null
        // { value: number, isPositive: boolean }
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const colorClasses = computed(() => {
    const colors = {
        blue: {
            bg: 'bg-blue-500',
            text: 'text-blue-600',
            lightBg: 'bg-blue-50',
            border: 'border-blue-200'
        },
        green: {
            bg: 'bg-green-500',
            text: 'text-green-600',
            lightBg: 'bg-green-50',
            border: 'border-green-200'
        },
        yellow: {
            bg: 'bg-yellow-500',
            text: 'text-yellow-600',
            lightBg: 'bg-yellow-50',
            border: 'border-yellow-200'
        },
        purple: {
            bg: 'bg-purple-500',
            text: 'text-purple-600',
            lightBg: 'bg-purple-50',
            border: 'border-purple-200'
        },
        red: {
            bg: 'bg-red-500',
            text: 'text-red-600',
            lightBg: 'bg-red-50',
            border: 'border-red-200'
        },
        orange: {
            bg: 'bg-orange-500',
            text: 'text-orange-600',
            lightBg: 'bg-orange-50',
            border: 'border-orange-200'
        },
        teal: {
            bg: 'bg-teal-500',
            text: 'text-teal-600',
            lightBg: 'bg-teal-50',
            border: 'border-teal-200'
        }
    };

    return colors[props.color] || colors.blue;
});
</script>

<template>
    <div class="kpi-card" :class="colorClasses.lightBg">
        <div class="kpi-content">
            <div class="kpi-header">
                <div class="kpi-icon-container" :class="colorClasses.bg">
                    <i :class="`pi ${icon} kpi-icon`"></i>
                </div>
                <div class="kpi-info">
                    <p class="kpi-title">{{ title }}</p>
                    <div v-if="loading" class="kpi-skeleton">
                        <Skeleton width="80px" height="2rem" />
                    </div>
                    <h3 v-else class="kpi-value" :class="colorClasses.text">{{ value }}</h3>
                    <p v-if="subtitle" class="kpi-subtitle">{{ subtitle }}</p>
                </div>
            </div>

            <!-- Tendencia opcional -->
            <div v-if="trend" class="kpi-trend">
                <i :class="['pi', trend.isPositive ? 'pi-arrow-up text-green-500' : 'pi-arrow-down text-red-500']"></i>
                <span :class="trend.isPositive ? 'text-green-600' : 'text-red-600'"> {{ Math.abs(trend.value) }}% </span>
                <span class="text-gray-500 text-xs ml-1">vs período anterior</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.kpi-card {
    border-radius: 10px;
    padding: 1rem;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    border: 1px solid;
    height: 100%;
}

.kpi-card:hover {
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
}

.kpi-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.kpi-header {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
}

.kpi-icon-container {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.kpi-icon {
    color: white;
    font-size: 1.25rem;
}

.kpi-info {
    flex: 1;
    min-width: 0;
}

.kpi-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    margin: 0 0 0.375rem 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.kpi-value {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    line-height: 1.1;
}

.kpi-subtitle {
    font-size: 0.6875rem;
    color: var(--text-color-secondary);
    margin: 0.375rem 0 0 0;
    line-height: 1.3;
}

.kpi-trend {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.kpi-skeleton {
    margin-top: 0.25rem;
}

/* Responsive */
@media (max-width: 768px) {
    .kpi-card {
        padding: 0.875rem;
    }

    .kpi-value {
        font-size: 1.25rem;
    }

    .kpi-icon-container {
        width: 36px;
        height: 36px;
    }

    .kpi-icon {
        font-size: 1.125rem;
    }

    .kpi-title {
        font-size: 0.6875rem;
    }

    .kpi-subtitle {
        font-size: 0.625rem;
    }
}
</style>
