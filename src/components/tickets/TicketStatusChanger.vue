<script setup>
import { useTicketsStore } from '@/store/ticketsStore';
import { useConfirm } from 'primevue/useconfirm';
import Dropdown from 'primevue/dropdown';
import { computed, ref } from 'vue';

const props = defineProps({
    ticket: {
        type: Object,
        required: true
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['status-changed']);

const ticketsStore = useTicketsStore();
const confirm = useConfirm();

// Estado local para el dropdown
const selectedStatus = ref(props.ticket.status);

// Opciones de estado disponibles
const statusOptions = computed(() => ticketsStore.statusOptions);

// Verificar si el ticket está finalizado (no se puede cambiar)
const isFinalized = computed(() => {
    return props.ticket.status === 'concluido' || props.ticket.status === 'rechazado';
});

// Verificar si el dropdown debe estar deshabilitado
const isDisabled = computed(() => {
    return props.disabled || isFinalized.value;
});

// Obtener el severity del estado para el estilo
const getStatusSeverity = (status) => {
    switch (status) {
        case 'pendiente':
            return 'warning';
        case 'en proceso':
            return 'info';
        case 'concluido':
            return 'success';
        case 'rechazado':
            return 'danger';
        case 'anulado':
            return 'secondary';
        default:
            return 'info';
    }
};

// Obtener icono del estado
const getStatusIcon = (status) => {
    switch (status) {
        case 'pendiente':
            return 'pi pi-clock';
        case 'en proceso':
            return 'pi pi-spin pi-spinner';
        case 'concluido':
            return 'pi pi-check-circle';
        case 'rechazado':
            return 'pi pi-times-circle';
        case 'anulado':
            return 'pi pi-ban';
        default:
            return 'pi pi-question-circle';
    }
};

// Obtener etiqueta del estado
const getStatusLabel = (status) => {
    const option = statusOptions.value.find(opt => opt.value === status);
    return option ? option.label : status;
};

// Manejar cambio de estado con confirmación
const handleStatusChange = (event) => {
    const newStatus = event.value;
    
    // Si no cambió realmente, no hacer nada
    if (newStatus === props.ticket.status) {
        return;
    }

    confirm.require({
        message: `¿Estás seguro de cambiar el estado de "${props.ticket.status}" a "${newStatus}"?`,
        header: 'Confirmar Cambio de Estado',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancelar',
        acceptLabel: 'Confirmar',
        rejectClass: 'p-button-secondary p-button-outlined',
        acceptClass: 'p-button-primary',
        accept: async () => {
            try {
                await ticketsStore.updateTicketStatus(props.ticket.id, newStatus);
                selectedStatus.value = newStatus;
                emit('status-changed', { ticketId: props.ticket.id, newStatus });
            } catch (error) {
                // Revertir al estado anterior si falla
                selectedStatus.value = props.ticket.status;
            }
        },
        reject: () => {
            // Revertir al estado anterior si cancela
            selectedStatus.value = props.ticket.status;
        }
    });
};
</script>

<template>
    <div class="ticket-status-changer">
        <Dropdown
            v-model="selectedStatus"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            :disabled="isDisabled"
            @change="handleStatusChange"
            class="status-dropdown"
            :class="`status-${selectedStatus}`"
            :pt="{
                root: { class: 'status-dropdown-root' },
                input: { class: 'status-dropdown-input' }
            }"
        >
            <template #value="slotProps">
                <div class="status-value" v-if="slotProps.value">
                    <i :class="getStatusIcon(slotProps.value)" class="status-icon"></i>
                    <span class="status-label">{{ getStatusLabel(slotProps.value) }}</span>
                </div>
            </template>
            <template #option="slotProps">
                <div class="status-option">
                    <i :class="getStatusIcon(slotProps.option.value)" class="status-icon"></i>
                    <span>{{ slotProps.option.label }}</span>
                </div>
            </template>
        </Dropdown>
        <small v-if="isFinalized" class="finalized-message">
            <i class="pi pi-lock"></i> Estado finalizado
        </small>
    </div>
</template>

<style scoped>
.ticket-status-changer {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.status-dropdown {
    min-width: 150px;
}

.status-dropdown:not(.p-disabled) {
    cursor: pointer;
}

.status-dropdown.p-disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.status-value,
.status-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.status-icon {
    font-size: 0.9rem;
}

/* Colores según el estado */
.status-dropdown.status-pendiente :deep(.p-dropdown-trigger),
.status-dropdown.status-pendiente :deep(.p-dropdown-label) {
    color: var(--yellow-600);
}

.status-dropdown.status-en.proceso :deep(.p-dropdown-trigger),
.status-dropdown.status-en.proceso :deep(.p-dropdown-label) {
    color: var(--blue-600);
}

.status-dropdown.status-concluido :deep(.p-dropdown-trigger),
.status-dropdown.status-concluido :deep(.p-dropdown-label) {
    color: var(--green-600);
}

.status-dropdown.status-rechazado :deep(.p-dropdown-trigger),
.status-dropdown.status-rechazado :deep(.p-dropdown-label) {
    color: var(--red-600);
}

.status-dropdown.status-anulado :deep(.p-dropdown-trigger),
.status-dropdown.status-anulado :deep(.p-dropdown-label) {
    color: var(--gray-600);
}

.finalized-message {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--text-color-secondary);
    font-size: 0.75rem;
    font-style: italic;
}

.finalized-message i {
    font-size: 0.7rem;
}

/* Estilos del dropdown */
:deep(.status-dropdown-root) {
    border-radius: 8px;
    transition: all 0.2s ease;
}

:deep(.status-dropdown-root:not(.p-disabled):hover) {
    border-color: var(--primary-500);
    box-shadow: 0 0 0 0.2rem var(--primary-50);
}

:deep(.p-dropdown-panel) {
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

:deep(.p-dropdown-items .p-dropdown-item) {
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin: 0.125rem;
    transition: all 0.2s ease;
}

:deep(.p-dropdown-items .p-dropdown-item:hover) {
    background: var(--primary-50);
    color: var(--primary-600);
}

:deep(.p-dropdown-items .p-dropdown-item.p-highlight) {
    background: var(--primary-100);
    color: var(--primary-700);
}
</style>
