<script setup>
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        default: 'Confirmar Acción'
    },
    message: {
        type: String,
        required: true
    },
    details: {
        type: String,
        default: null
    },
    actionType: {
        type: String,
        default: 'default', // delete, default
        validator: (value) => ['delete', 'default'].includes(value)
    },
    ticket: {
        // Changed from 'user' to 'ticket'
        type: Object,
        default: null
    },
    processing: {
        type: Boolean,
        default: false
    },
    processingMessage: {
        type: String,
        default: null
    },
    requireTextConfirmation: {
        type: Boolean,
        default: false
    },
    confirmationText: {
        type: String,
        default: 'CONFIRMAR'
    },
    showWarnings: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits(['update:visible', 'confirm', 'cancel']);

// Estado local
const textConfirmation = ref('');

// Computadas
const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const iconClass = computed(() => {
    const iconMap = {
        delete: 'pi pi-trash',
        default: 'pi pi-exclamation-triangle'
    };
    return iconMap[props.actionType] || iconMap.default;
});

const iconBackgroundClass = computed(() => {
    const bgMap = {
        delete: 'bg-red-500',
        default: 'bg-orange-500'
    };
    return bgMap[props.actionType] || bgMap.default;
});

const confirmLabel = computed(() => {
    const labelMap = {
        delete: 'Eliminar',
        default: 'Confirmar'
    };
    return labelMap[props.actionType] || labelMap.default;
});

const confirmIcon = computed(() => {
    const iconMap = {
        delete: 'pi pi-trash',
        default: 'pi pi-check'
    };
    return iconMap[props.actionType] || iconMap.default;
});

const buttonClass = computed(() => {
    const classMap = {
        delete: 'p-button-danger',
        default: ''
    };
    return classMap[props.actionType] || classMap.default;
});

const canConfirm = computed(() => {
    if (props.processing) return false;

    if (props.requireTextConfirmation) {
        return textConfirmation.value === props.confirmationText;
    }

    return true;
});

// Watchers
watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            textConfirmation.value = '';
        }
    }
);

// Métodos
const confirm = () => {
    if (canConfirm.value) {
        emit('confirm');
    }
};

const cancel = () => {
    emit('cancel');
};
</script>

<template>
    <Dialog v-model:visible="dialogVisible" :header="title" :modal="true" :closable="!processing" :closeOnEscape="!processing" :style="{ width: '450px' }" class="confirm-dialog">
        <template #header>
            <div class="flex align-items-center gap-2">
                <i :class="iconClass" class="text-xl"></i>
                <span class="font-semibold">{{ title }}</span>
            </div>
        </template>

        <div class="confirmation-content">
            <div class="flex align-items-start gap-3 mb-4">
                <div class="w-3rem h-3rem border-circle flex align-items-center justify-content-center flex-shrink-0" :class="iconBackgroundClass">
                    <i :class="iconClass" class="text-xl text-white"></i>
                </div>

                <div class="flex-1">
                    <div class="text-900 font-medium text-lg mb-2">
                        {{ message }}
                    </div>

                    <div v-if="details" class="text-600 line-height-3">
                        {{ details }}
                    </div>

                    <!-- Información adicional del ticket -->
                    <div v-if="ticket" class="surface-100 border-round p-3 mt-3">
                        <div class="flex align-items-center gap-3">
                            <div class="w-2rem h-2rem border-circle flex align-items-center justify-content-center text-white font-bold text-sm bg-primary-500">
                                <i class="pi pi-ticket"></i>
                            </div>
                            <div>
                                <div class="font-semibold text-900">{{ ticket.title }}</div>
                                <div class="text-600 text-sm">Estado: {{ ticket.status }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Advertencias especiales -->
                    <div v-if="showWarnings" class="mt-3">
                        <div v-if="actionType === 'delete'" class="surface-border border-1 border-round p-3">
                            <div class="flex align-items-center gap-2 text-orange-600 mb-2">
                                <i class="pi pi-exclamation-triangle"></i>
                                <span class="font-semibold text-sm">Advertencias importantes:</span>
                            </div>
                            <ul class="text-600 text-sm line-height-3 ml-3 mb-0">
                                <li>Esta acción no se puede deshacer</li>
                                <li>Se perderán todos los datos asociados al ticket (comentarios, historial de estado)</li>
                            </ul>
                        </div>
                    </div>

                    <!-- Campo de confirmación por texto -->
                    <div v-if="requireTextConfirmation" class="mt-3">
                        <label class="block font-medium text-900 mb-2"> Para confirmar, escriba "{{ confirmationText }}" en el campo de abajo: </label>
                        <InputText v-model="textConfirmation" placeholder="Escriba aquí para confirmar..." class="w-full" :class="{ 'p-invalid': textConfirmation && textConfirmation !== confirmationText }" />
                        <small v-if="textConfirmation && textConfirmation !== confirmationText" class="p-error"> El texto no coincide </small>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-content-between align-items-center">
                <div class="text-500 text-sm" v-if="processingMessage">
                    {{ processingMessage }}
                </div>
                <div class="flex gap-2 ml-auto">
                    <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="cancel" :disabled="processing" />
                    <Button :label="confirmLabel" :icon="processing ? 'pi pi-spin pi-spinner' : confirmIcon" :class="buttonClass" @click="confirm" :loading="processing" :disabled="!canConfirm" />
                </div>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.confirm-dialog {
    max-width: 90vw;
}

.confirmation-content {
    padding: 0.5rem 0;
}

.surface-100 {
    background: var(--surface-100);
}

.surface-border {
    border-color: var(--surface-border);
}

.border-round {
    border-radius: var(--border-radius);
}

.line-height-3 {
    line-height: 1.5;
}

/* Animaciones */
.confirmation-content {
    animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive */
@media (max-width: 768px) {
    .confirm-dialog {
        margin: 1rem;
        max-width: calc(100vw - 2rem);
    }

    .confirmation-content {
        font-size: 0.875rem;
    }
}
</style>
