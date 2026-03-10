<script setup>
import { useStepTemplates } from '@/composables/useStepTemplates';
import { useUsers } from '@/composables/useUsers';
import { useAuthStore } from '@/store/authStore';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { computed, onMounted, ref, watch } from 'vue';

const props = defineProps({
    visible: { type: Boolean, required: true }
});
const emit = defineEmits(['update:visible']);

const authStore = useAuthStore();
const confirm = useConfirm();
const { templates, isLoading, isSaving, loadTemplates, createTemplate, updateTemplate, deleteTemplate } = useStepTemplates();
const { allUsers, initializePublicUsers, initializePositions, positionOptions: apiPositionOptions } = useUsers();

// ─── Panel: 'list' | 'form' ──────────────────────────────────────
const panel = ref('list');
const editingTemplate = ref(null); // null = creating

// ─── Form state ──────────────────────────────────────────────────
const form = ref({ nombre: '', descripcion: '', items: [] });
const formErrors = ref({});

const currentUserId = computed(() => authStore.getUser?.id);

const actionTypes = [
    { label: 'Firma', value: 'Firma' },
    { label: 'Edición', value: 'Edición' },
    { label: 'Visto Bueno', value: 'Visto Bueno' },
    { label: 'VB con Sustento', value: 'VB con Sustento' }
];

const positionOptions = computed(() => apiPositionOptions.value);

const userOptions = computed(() => allUsers.value.map((u) => ({ label: `${u.name} (${u.position || 'Sin cargo'})`, value: u.id })));

const isOwner = (template) => String(template.creador?.id) === String(currentUserId.value);

onMounted(async () => {
    await Promise.all([loadTemplates(), initializePublicUsers(), initializePositions()]);
});

watch(
    () => props.visible,
    (v) => {
        if (v) {
            panel.value = 'list';
            editingTemplate.value = null;
        }
    }
);

// ─── Navigation ──────────────────────────────────────────────────
const openCreate = () => {
    editingTemplate.value = null;
    form.value = { nombre: '', descripcion: '', items: [] };
    formErrors.value = {};
    addItem();
    panel.value = 'form';
};

const openEdit = (tpl) => {
    editingTemplate.value = tpl;
    form.value = {
        nombre: tpl.nombre,
        descripcion: tpl.descripcion ?? '',
        items: (tpl.items ?? []).map((it) => ({
            orden: it.orden,
            tipo_accion: it.tipo_accion,
            permitted_users: it.permitted_users ?? [],
            permitted_positions: it.permitted_positions ?? []
        }))
    };
    formErrors.value = {};
    panel.value = 'form';
};

const backToList = () => {
    panel.value = 'list';
    editingTemplate.value = null;
};

// ─── Items builder ────────────────────────────────────────────────
const addItem = () => {
    form.value.items.push({
        orden: form.value.items.length + 1,
        tipo_accion: null,
        permitted_users: [],
        permitted_positions: []
    });
};

const removeItem = (idx) => {
    form.value.items.splice(idx, 1);
    form.value.items.forEach((it, i) => (it.orden = i + 1));
};

// ─── Validation ───────────────────────────────────────────────────
const validate = () => {
    const errors = {};
    if (!form.value.nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
    if (form.value.items.length === 0) errors.items = 'Agrega al menos un paso.';
    const badItem = form.value.items.find((it) => !it.tipo_accion || (it.permitted_users.length === 0 && it.permitted_positions.length === 0));
    if (badItem) errors.items = 'Cada paso necesita tipo de acción y al menos un responsable.';
    formErrors.value = errors;
    return Object.keys(errors).length === 0;
};

// ─── Submit ───────────────────────────────────────────────────────
const submit = async () => {
    if (!validate()) return;
    const payload = {
        nombre: form.value.nombre.trim(),
        descripcion: form.value.descripcion.trim() || undefined,
        items: form.value.items
    };
    try {
        if (editingTemplate.value) {
            await updateTemplate(editingTemplate.value.id, payload);
        } else {
            await createTemplate(payload);
        }
        backToList();
    } catch {
        // Toast handled by composable
    }
};

// ─── Delete ───────────────────────────────────────────────────────
const confirmDelete = (tpl) => {
    confirm.require({
        message: `¿Eliminar la plantilla "${tpl.nombre}"? Los documentos ya creados con ella no se verán afectados.`,
        header: 'Confirmar eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            await deleteTemplate(tpl.id);
        }
    });
};

// ─── Utils ────────────────────────────────────────────────────────
const getActionIcon = (tipo) => {
    const map = { Firma: 'pi pi-pencil', Edición: 'pi pi-file-edit', 'Visto Bueno': 'pi pi-check-circle', 'VB con Sustento': 'pi pi-paperclip' };
    return map[tipo] ?? 'pi pi-cog';
};
const getActionColor = (tipo) => {
    const map = { Firma: '#3b82f6', Edición: '#f97316', 'Visto Bueno': '#22c55e', 'VB con Sustento': '#14b8a6' };
    return map[tipo] ?? '#94a3b8';
};
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="$emit('update:visible', $event)"
        modal
        :style="{ width: '860px' }"
        :breakpoints="{ '1024px': '94vw', '768px': '100vw' }"
        :header="panel === 'list' ? 'Plantillas de Flujo' : editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'"
        class="templates-dialog"
    >
        <!-- ══ LISTA ══════════════════════════════════════════════ -->
        <div v-if="panel === 'list'" class="list-panel">
            <div class="list-toolbar">
                <p class="list-hint">Las plantillas guardan flujos reutilizables de aprobación. Al crear un documento puedes seleccionar una plantilla para copiar sus pasos automáticamente.</p>
                <Button label="Nueva Plantilla" icon="pi pi-plus" @click="openCreate" class="btn-new-tpl" />
            </div>

            <!-- Loading -->
            <div v-if="isLoading" class="tpl-loading"><i class="pi pi-spin pi-spinner"></i> Cargando plantillas...</div>

            <!-- Empty -->
            <div v-else-if="templates.length === 0" class="tpl-empty">
                <i class="pi pi-bookmark tpl-empty-icon"></i>
                <p>Aún no tienes plantillas creadas.</p>
                <Button label="Crear primera plantilla" text @click="openCreate" />
            </div>

            <!-- Cards -->
            <div v-else class="tpl-grid">
                <div v-for="tpl in templates" :key="tpl.id" class="tpl-card">
                    <div class="tpl-card-header">
                        <div class="tpl-card-title-wrap">
                            <span class="tpl-card-name">{{ tpl.nombre }}</span>
                            <span v-if="tpl.descripcion" class="tpl-card-desc">{{ tpl.descripcion }}</span>
                        </div>
                        <div class="tpl-card-actions" v-if="isOwner(tpl)">
                            <button class="tpl-icon-btn tpl-icon-btn--edit" title="Editar plantilla" @click="openEdit(tpl)">
                                <i class="pi pi-pen-to-square"></i>
                            </button>
                            <button class="tpl-icon-btn tpl-icon-btn--delete" title="Eliminar plantilla" @click="confirmDelete(tpl)">
                                <i class="pi pi-trash"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Steps preview -->
                    <div class="tpl-steps">
                        <div v-for="(item, idx) in tpl.items ?? []" :key="item.id ?? idx" class="tpl-step">
                            <div class="tpl-step-connector" v-if="idx > 0"></div>
                            <div class="tpl-step-chip" :style="{ borderColor: getActionColor(item.tipo_accion) }">
                                <i :class="getActionIcon(item.tipo_accion)" :style="{ color: getActionColor(item.tipo_accion) }"></i>
                                <span>{{ item.tipo_accion }}</span>
                            </div>
                        </div>
                        <span v-if="!tpl.items?.length" class="tpl-no-steps">Sin pasos</span>
                    </div>

                    <div class="tpl-card-footer">
                        <i class="pi pi-user"></i>
                        <span>{{ tpl.creador?.name ?? 'Desconocido' }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- ══ FORMULARIO ════════════════════════════════════════ -->
        <div v-else class="form-panel">
            <!-- Nombre -->
            <div class="form-field">
                <label class="form-label">Nombre de la plantilla <span class="req">*</span></label>
                <InputText v-model="form.nombre" placeholder="Ej: Flujo contrato proveedor" class="w-full" :invalid="!!formErrors.nombre" />
                <small v-if="formErrors.nombre" class="form-error">{{ formErrors.nombre }}</small>
            </div>

            <!-- Descripción -->
            <div class="form-field">
                <label class="form-label">Descripción <span class="opt">(opcional)</span></label>
                <Textarea v-model="form.descripcion" placeholder="Descripción breve del flujo..." rows="2" class="w-full" autoResize />
            </div>

            <!-- Items -->
            <div class="form-field">
                <div class="items-header">
                    <label class="form-label">Pasos del flujo <span class="req">*</span></label>
                    <Button label="Añadir paso" icon="pi pi-plus" size="small" outlined @click="addItem" />
                </div>
                <small v-if="formErrors.items" class="form-error">{{ formErrors.items }}</small>

                <div v-if="form.items.length === 0" class="items-empty">
                    <i class="pi pi-share-alt"></i>
                    <span>Sin pasos — haz clic en "Añadir paso"</span>
                </div>

                <div v-else class="items-list">
                    <div v-for="(item, idx) in form.items" :key="idx" class="item-row">
                        <div class="item-order">{{ item.orden }}</div>
                        <div class="item-fields">
                            <!-- Tipo acción -->
                            <Dropdown v-model="item.tipo_accion" :options="actionTypes" optionLabel="label" optionValue="value" placeholder="Tipo de acción..." class="w-full">
                                <template #value="{ value }">
                                    <div v-if="value" class="flex align-items-center gap-2">
                                        <i :class="getActionIcon(value)" :style="{ color: getActionColor(value) }"></i>
                                        <span class="text-sm font-medium">{{ value }}</span>
                                    </div>
                                    <span v-else class="text-sm text-gray-400">Tipo de acción...</span>
                                </template>
                                <template #option="{ option }">
                                    <div class="flex align-items-center gap-2">
                                        <i :class="getActionIcon(option.value)" :style="{ color: getActionColor(option.value) }"></i>
                                        <span class="text-sm">{{ option.label }}</span>
                                    </div>
                                </template>
                            </Dropdown>

                            <!-- Responsables -->
                            <div class="responsibles-row">
                                <MultiSelect v-model="item.permitted_positions" :options="positionOptions" optionLabel="label" optionValue="value" placeholder="Por cargos..." display="chip" :filter="true" class="w-full" :maxSelectedLabels="2" />
                                <MultiSelect v-model="item.permitted_users" :options="userOptions" optionLabel="label" optionValue="value" placeholder="Por usuarios..." display="chip" :filter="true" class="w-full" :maxSelectedLabels="2" />
                            </div>
                        </div>
                        <button class="item-remove" title="Eliminar paso" @click="removeItem(idx)">
                            <i class="pi pi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ══ FOOTER ════════════════════════════════════════════ -->
        <template #footer>
            <div class="tpl-footer">
                <Button v-if="panel === 'list'" label="Cerrar" text severity="secondary" @click="$emit('update:visible', false)" />
                <template v-else>
                    <Button label="Volver" icon="pi pi-arrow-left" text severity="secondary" @click="backToList" :disabled="isSaving" />
                    <Button :label="editingTemplate ? 'Guardar cambios' : 'Crear plantilla'" :icon="editingTemplate ? 'pi pi-check' : 'pi pi-bookmark'" class="btn-submit-tpl" @click="submit" :loading="isSaving" />
                </template>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
/* ── List panel ──────────────────────────────────────────────────── */
.list-panel {
    min-height: 320px;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
.list-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}
.list-hint {
    font-size: 0.82rem;
    color: #64748b;
    max-width: 560px;
    margin: 0;
    line-height: 1.55;
}
.btn-new-tpl {
    white-space: nowrap;
    flex-shrink: 0;
    background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
    border: none !important;
    color: white !important;
    font-weight: 600;
}

/* Loading / Empty */
.tpl-loading,
.tpl-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 3rem 1rem;
    color: #94a3b8;
    font-size: 0.875rem;
}
.tpl-empty-icon {
    font-size: 2.5rem;
    color: #cbd5e1;
}

/* Grid */
.tpl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
}

/* Card */
.tpl-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1rem;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition:
        box-shadow 0.2s,
        border-color 0.2s;
}
.tpl-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
    border-color: #bfdbfe;
}
.tpl-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
}
.tpl-card-title-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
}
.tpl-card-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.3;
}
.tpl-card-desc {
    font-size: 0.75rem;
    color: #64748b;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.tpl-card-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
}
.tpl-icon-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    transition:
        background 0.15s,
        color 0.15s;
}
.tpl-icon-btn--edit {
    background: #eff6ff;
    color: #3b82f6;
}
.tpl-icon-btn--edit:hover {
    background: #dbeafe;
}
.tpl-icon-btn--delete {
    background: #fff1f2;
    color: #f43f5e;
}
.tpl-icon-btn--delete:hover {
    background: #ffe4e6;
}

/* Steps preview */
.tpl-steps {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
}
.tpl-step {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}
.tpl-step-connector {
    width: 14px;
    height: 2px;
    background: #e2e8f0;
    flex-shrink: 0;
}
.tpl-step-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.55rem;
    border: 1.5px solid;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    background: #f8fafc;
    white-space: nowrap;
}
.tpl-no-steps {
    font-size: 0.75rem;
    color: #94a3b8;
}
.tpl-card-footer {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    color: #94a3b8;
    border-top: 1px solid #f1f5f9;
    padding-top: 0.5rem;
}

/* ── Form panel ──────────────────────────────────────────────────── */
.form-panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.form-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #374151;
}
.req {
    color: #ef4444;
    margin-left: 2px;
}
.opt {
    font-weight: 400;
    color: #94a3b8;
    font-size: 0.78rem;
}
.form-error {
    color: #ef4444;
    font-size: 0.75rem;
}

/* Items */
.items-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.items-empty {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1.25rem;
    border: 2px dashed #e2e8f0;
    border-radius: 10px;
    color: #94a3b8;
    font-size: 0.82rem;
    justify-content: center;
}
.items-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 360px;
    overflow-y: auto;
    padding-right: 2px;
}
.item-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 0.75rem;
}
.item-order {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #3b82f6;
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 6px;
}
.item-fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
}
.responsibles-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
}
.item-remove {
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 6px;
    background: #fff1f2;
    color: #f43f5e;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    flex-shrink: 0;
    margin-top: 4px;
    transition: background 0.15s;
}
.item-remove:hover {
    background: #ffe4e6;
}

/* ── Footer ─────────────────────────────────────────────────────── */
.tpl-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
}
.btn-submit-tpl {
    background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
    border: none !important;
    color: white !important;
    font-weight: 600;
}

@media (max-width: 600px) {
    .responsibles-row {
        grid-template-columns: 1fr;
    }
    .tpl-grid {
        grid-template-columns: 1fr;
    }
}
</style>
