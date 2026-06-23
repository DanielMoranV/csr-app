<script setup>
import Accordion from 'primevue/accordion';
import AccordionContent from 'primevue/accordioncontent';
import AccordionHeader from 'primevue/accordionheader';
import AccordionPanel from 'primevue/accordionpanel';
import Checkbox from 'primevue/checkbox';
import Tag from 'primevue/tag';
import { computed } from 'vue';

/**
 * Árbol de permisos agrupado por módulo (acordeón).
 * - v-model: number[] con los IDs de permisos seleccionados.
 * - Cada módulo tiene un checkbox "seleccionar todo" con estado indeterminado.
 * - Cada permiso muestra su nombre, descripción y slug.
 */
const props = defineProps({
    // Catálogo agrupado: { [module]: Permission[] }
    catalog: {
        type: Object,
        default: () => ({})
    },
    // IDs de permisos seleccionados
    modelValue: {
        type: Array,
        default: () => []
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:modelValue']);

// Etiquetas legibles para los módulos conocidos (fallback: el propio slug)
const MODULE_LABELS = {
    'access-control': 'Control de Acceso',
    users: 'Usuarios',
    treasury: 'Tesorería',
    sisclin: 'SISCLIN',
    hospitalization: 'Hospitalización',
    'daily-audits': 'Auditorías Diarias',
    'dashboard-audit': 'Dashboards / Auditoría'
};

const moduleLabel = (moduleKey) => MODULE_LABELS[moduleKey] || moduleKey;

const modules = computed(() => Object.keys(props.catalog || {}));

// Todos los paneles abiertos por defecto
const openPanels = computed(() => modules.value.map((_, i) => String(i)));

const selectedSet = computed(() => new Set(props.modelValue));

const isSelected = (id) => selectedSet.value.has(id);

const modulePermissionIds = (moduleKey) => (props.catalog[moduleKey] || []).map((p) => p.id);

const moduleState = (moduleKey) => {
    const ids = modulePermissionIds(moduleKey);
    const selectedCount = ids.filter((id) => selectedSet.value.has(id)).length;
    return {
        total: ids.length,
        selected: selectedCount,
        all: selectedCount > 0 && selectedCount === ids.length,
        indeterminate: selectedCount > 0 && selectedCount < ids.length
    };
};

const emitNext = (set) => emit('update:modelValue', Array.from(set));

const togglePermission = (id, value) => {
    if (props.disabled) return;
    const next = new Set(props.modelValue);
    if (value) next.add(id);
    else next.delete(id);
    emitNext(next);
};

const toggleModule = (moduleKey) => {
    if (props.disabled) return;
    const ids = modulePermissionIds(moduleKey);
    const { all } = moduleState(moduleKey);
    const next = new Set(props.modelValue);
    // Si están todos, deseleccionar; si no, seleccionar todos
    ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
    emitNext(next);
};
</script>

<template>
    <div class="permission-tree">
        <div v-if="modules.length === 0" class="empty-state">
            <i class="pi pi-inbox"></i>
            <span>No hay permisos disponibles en el catálogo.</span>
        </div>

        <Accordion v-else :value="openPanels" multiple>
            <AccordionPanel v-for="(moduleKey, index) in modules" :key="moduleKey" :value="String(index)">
                <AccordionHeader>
                    <div class="module-header" @click.stop>
                        <Checkbox :modelValue="moduleState(moduleKey).all" :indeterminate="moduleState(moduleKey).indeterminate" :binary="true" :disabled="disabled" @update:modelValue="toggleModule(moduleKey)" @click.stop />
                        <span class="module-title">{{ moduleLabel(moduleKey) }}</span>
                        <Tag :value="`${moduleState(moduleKey).selected}/${moduleState(moduleKey).total}`" :severity="moduleState(moduleKey).selected > 0 ? 'info' : 'secondary'" class="ml-2" />
                    </div>
                </AccordionHeader>
                <AccordionContent>
                    <div class="permission-grid">
                        <div v-for="perm in catalog[moduleKey]" :key="perm.id" class="permission-item">
                            <Checkbox :inputId="`perm-${perm.id}`" :modelValue="isSelected(perm.id)" :binary="true" :disabled="disabled" @update:modelValue="(val) => togglePermission(perm.id, val)" />
                            <label :for="`perm-${perm.id}`" class="permission-label">
                                <span class="permission-name">{{ perm.name }}</span>
                                <span v-if="perm.description" class="permission-description">{{ perm.description }}</span>
                                <code class="permission-slug">{{ perm.slug }}</code>
                            </label>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionPanel>
        </Accordion>
    </div>
</template>

<style scoped>
.permission-tree {
    width: 100%;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2.5rem 1rem;
    color: var(--text-color-secondary);
}

.empty-state i {
    font-size: 2rem;
}

.module-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
}

.module-title {
    font-weight: 600;
    color: var(--text-color);
}

.permission-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    padding: 0.5rem 0.25rem;
}

.permission-item {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.75rem;
    border: 1px solid var(--surface-border);
    border-radius: 10px;
    background: var(--surface-ground);
    transition: border-color 0.2s ease;
}

.permission-item:hover {
    border-color: var(--primary-color);
}

.permission-label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    cursor: pointer;
    line-height: 1.3;
}

.permission-name {
    font-weight: 600;
    color: var(--text-color);
    font-size: 0.9rem;
}

.permission-description {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}

.permission-slug {
    font-size: 0.72rem;
    color: var(--text-color-secondary);
    background: var(--surface-100);
    padding: 0.05rem 0.4rem;
    border-radius: 5px;
    width: fit-content;
}

:global(.dark) .permission-slug {
    background: var(--surface-700);
}
</style>
