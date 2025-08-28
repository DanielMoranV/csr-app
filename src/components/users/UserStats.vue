<template>
    <div class="stats-compact">
        <!-- Estadísticas principales -->
        <div class="stats-row">
            <div class="stat-item stat-item--primary">
                <div class="stat-item__icon">
                    <i class="pi pi-users"></i>
                </div>
                <div class="stat-item__content">
                    <div class="stat-item__value">{{ stats?.total_users || 0 }}</div>
                    <div class="stat-item__label">Total</div>
                </div>
            </div>
            
            <div class="stat-item stat-item--success">
                <div class="stat-item__icon">
                    <i class="pi pi-check-circle"></i>
                </div>
                <div class="stat-item__content">
                    <div class="stat-item__value">{{ stats?.active_users || 0 }}</div>
                    <div class="stat-item__label">Activos ({{ activePercentage }}%)</div>
                </div>
                <div class="stat-item__bar">
                    <div class="stat-item__fill stat-item__fill--success" :style="{ width: activePercentage + '%' }"></div>
                </div>
            </div>
            
            <div class="stat-item stat-item--warning">
                <div class="stat-item__icon">
                    <i class="pi pi-ban"></i>
                </div>
                <div class="stat-item__content">
                    <div class="stat-item__value">{{ stats?.inactive_users || 0 }}</div>
                    <div class="stat-item__label">Inactivos ({{ inactivePercentage }}%)</div>
                </div>
                <div class="stat-item__bar">
                    <div class="stat-item__fill stat-item__fill--warning" :style="{ width: inactivePercentage + '%' }"></div>
                </div>
            </div>
            
            <div class="stat-item stat-item--info">
                <div class="stat-item__icon">
                    <i class="pi pi-user-plus"></i>
                </div>
                <div class="stat-item__content">
                    <div class="stat-item__value">{{ stats?.registrations_today || 0 }}</div>
                    <div class="stat-item__label">Nuevos hoy</div>
                </div>
                <div class="stat-item__extra">Semana: {{ stats?.recent_registrations || 0 }}</div>
            </div>
        </div>

    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    stats: {
        type: Object,
        default: null
    },
    loading: {
        type: Boolean,
        default: false
    }
});


// Computadas para porcentajes
const activePercentage = computed(() => {
    if (!props.stats?.total_users || props.stats.total_users === 0) return 0;
    return Math.round((props.stats.active_users / props.stats.total_users) * 100);
});

const inactivePercentage = computed(() => {
    if (!props.stats?.total_users || props.stats.total_users === 0) return 0;
    return Math.round((props.stats.inactive_users / props.stats.total_users) * 100);
});

// Posiciones ordenadas por cantidad
const sortedPositions = computed(() => {
    if (!props.stats?.users_by_position) return [];
    
    return Object.entries(props.stats.users_by_position)
        .sort(([,a], [,b]) => b - a);
});

// Métodos
const formatPositionLabel = (position) => {
    const labels = {
        'ADMINISTRACION': 'Administración',
        'ADMISION': 'Admisión',
        'ARCHIVO HISTORIAS': 'Archivo Historias',
        'CONSULTORIOS': 'Consultorios',
        'CONTABILIDAD': 'Contabilidad',
        'DIRECTOR MEDICO': 'Director Médico',
        'EMERGENCIA': 'Emergencia',
        'FACTURACION': 'Facturación',
        'FARMACIA': 'Farmacia',
        'HOSPITALIZACION': 'Hospitalización',
        'LABORATORIO': 'Laboratorio',
        'LOGISTICA': 'Logística',
        'MEDICOS': 'Médicos',
        'QUIROFANO': 'Quirófano',
        'RAYOS X': 'Rayos X',
        'RRHH': 'RRHH',
        'SISTEMAS': 'Sistemas'
    };
    return labels[position] || position;
};

const getPositionColorClass = (position) => {
    const colorMap = {
        'SISTEMAS': 'text-blue-600',
        'DIRECTOR MEDICO': 'text-green-600',
        'ADMINISTRACION': 'text-orange-600',
        'RRHH': 'text-purple-600',
        'MEDICOS': 'text-teal-600',
        'EMERGENCIA': 'text-red-600',
        'FARMACIA': 'text-cyan-600',
        'LABORATORIO': 'text-indigo-600',
        'RAYOS X': 'text-pink-600',
        'ADMISION': 'text-indigo-500',
        'ARCHIVO HISTORIAS': 'text-amber-600',
        'CONSULTORIOS': 'text-emerald-600',
        'CONTABILIDAD': 'text-slate-600',
        'FACTURACION': 'text-violet-600',
        'HOSPITALIZACION': 'text-rose-600',
        'LOGISTICA': 'text-stone-600',
        'QUIROFANO': 'text-lime-600'
    };
    return colorMap[position] || 'text-gray-600';
};

const getPositionIcon = (position) => {
    const iconMap = {
        'SISTEMAS': 'pi pi-cog',
        'DIRECTOR MEDICO': 'pi pi-user-plus',
        'ADMINISTRACION': 'pi pi-briefcase',
        'RRHH': 'pi pi-users',
        'MEDICOS': 'pi pi-heart',
        'EMERGENCIA': 'pi pi-exclamation-triangle',
        'FARMACIA': 'pi pi-plus-circle',
        'LABORATORIO': 'pi pi-search',
        'RAYOS X': 'pi pi-camera',
        'ADMISION': 'pi pi-sign-in',
        'CONTABILIDAD': 'pi pi-calculator',
        'ARCHIVO HISTORIAS': 'pi pi-folder',
        'CONSULTORIOS': 'pi pi-home',
        'FACTURACION': 'pi pi-dollar',
        'HOSPITALIZACION': 'pi pi-building',
        'LOGISTICA': 'pi pi-truck',
        'QUIROFANO': 'pi pi-shield'
    };
    return iconMap[position] || 'pi pi-user';
};

</script>

<style scoped>
.stats-compact {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Stats Row */
.stats-row {
    display: flex;
    align-items: stretch;
    min-height: 80px;
}

.stat-item {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 1rem;
    position: relative;
    border-right: 1px solid var(--surface-border);
    transition: all 0.2s ease;
    min-width: 0; /* Para permitir flex-shrink */
}

.stat-item:last-child {
    border-right: none;
}

.stat-item:hover {
    background: var(--surface-50);
}

.stat-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    transition: height 0.2s ease;
}

.stat-item--primary::before { background: var(--primary-500); }
.stat-item--success::before { background: var(--green-500); }
.stat-item--warning::before { background: var(--orange-500); }
.stat-item--info::before { background: var(--purple-500); }

.stat-item:hover::before {
    height: 4px;
}

.stat-item__icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    color: var(--text-color);
    margin-right: 0.75rem;
    flex-shrink: 0;
    background: var(--surface-100);
    border: 1px solid var(--surface-200);
}

.stat-item__content {
    flex: 1;
    min-width: 0;
}

.stat-item__value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-color);
    line-height: 1;
    margin-bottom: 0.25rem;
}

.stat-item__label {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.stat-item__extra {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    margin-top: 0.25rem;
}

.stat-item__bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--surface-200);
}

.stat-item__fill {
    height: 100%;
    transition: width 0.6s ease;
}

.stat-item__fill--success { background: var(--green-500); }
.stat-item__fill--warning { background: var(--orange-500); }


/* Responsive Design */
@media (max-width: 1024px) {
    .stat-item__value {
        font-size: 1.5rem;
    }
    
    .stat-item__icon {
        width: 36px;
        height: 36px;
        font-size: 1.1rem;
    }
}

@media (max-width: 768px) {
    .stats-row {
        flex-wrap: wrap;
        min-height: auto;
    }
    
    .stat-item {
        flex: 1 1 calc(50% - 0.5px);
        border-right: none;
        border-bottom: 1px solid var(--surface-border);
        min-width: calc(50% - 0.5px);
    }
    
    .stat-item:nth-child(2n) {
        border-right: 1px solid var(--surface-border);
    }
    
    .stat-item:nth-last-child(-n+2) {
        border-bottom: none;
    }
    
}

@media (max-width: 576px) {
    .stats-row {
        flex-direction: column;
    }
    
    .stat-item {
        flex: none;
        border-right: none;
        border-bottom: 1px solid var(--surface-border);
    }
    
    .stat-item:last-child {
        border-bottom: none;
    }
    
    .stat-item__value {
        font-size: 1.25rem;
    }
    
    .stat-item__icon {
        width: 32px;
        height: 32px;
        font-size: 1rem;
        margin-right: 0.5rem;
    }
    
}</style>