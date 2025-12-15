<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useDoctorsStore } from '@/store/doctorsStore';
import { useUsersStore } from '@/store/usersStore';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import Message from 'primevue/message';
import Tag from 'primevue/tag';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    doctor: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['update:visible', 'linked', 'unlinked']);

const toast = useToast();
const doctorsStore = useDoctorsStore();
const usersStore = useUsersStore();

const selectedUserId = ref(null);
const isLinking = ref(false);
const isUnlinking = ref(false);
const linkedUserInfo = ref(null);

// Computed
const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const hasLinkedUser = computed(() => {
    return props.doctor?.user_id != null;
});

// Filtrar usuarios por posiciones médicas que no estén ya vinculados
const availableUsers = computed(() => {
    const medicalPositions = ['MEDICOS', 'EMERGENCIA', 'DIRECTOR MEDICO', 'AUDITOR MEDICO'];
    
    return usersStore.allUsers.filter(user => {
        // Solo usuarios con posiciones médicas
        if (!medicalPositions.includes(user.position)) return false;
        
        // Si el usuario ya está vinculado a este médico, incluirlo
        if (props.doctor?.user_id === user.id) return true;
        
        // Excluir usuarios que ya están vinculados a otros médicos
        const isLinkedToOtherDoctor = doctorsStore.allDoctors.some(
            doc => doc.user_id === user.id && doc.id !== props.doctor?.id
        );
        
        return !isLinkedToOtherDoctor;
    }).map(user => ({
        label: `${user.name} (${user.dni}) - ${user.position}`,
        value: user.id,
        user: user
    }));
});

// Methods
async function loadLinkedUser() {
    if (!props.doctor?.id || !hasLinkedUser.value) {
        linkedUserInfo.value = null;
        return;
    }

    try {
        const response = await doctorsStore.getLinkedUser(props.doctor.id);
        // El endpoint retorna success: false si no hay usuario vinculado
        if (response && response.success && response.data) {
            linkedUserInfo.value = response.data;
        } else {
            linkedUserInfo.value = null;
        }
    } catch (error) {
        // Si hay error en la petición, limpiar linkedUserInfo
        linkedUserInfo.value = null;
    }
}

async function handleLink() {
    if (!selectedUserId.value) {
        toast.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'Debe seleccionar un usuario',
            life: 3000
        });
        return;
    }

    isLinking.value = true;

    try {
        const response = await doctorsStore.linkUser(props.doctor.id, selectedUserId.value);
        
        if (response.success) {
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Usuario vinculado exitosamente',
                life: 3000
            });
            
            emit('linked', response.data);
            await loadLinkedUser();
            selectedUserId.value = null;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo vincular el usuario',
            life: 3000
        });
    } finally {
        isLinking.value = false;
    }
}

async function handleUnlink() {
    isUnlinking.value = true;

    try {
        const response = await doctorsStore.unlinkUser(props.doctor.id);
        
        if (response.success) {
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Usuario desvinculado exitosamente',
                life: 3000
            });
            
            emit('unlinked', response.data);
            linkedUserInfo.value = null;
            selectedUserId.value = null;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo desvincular el usuario',
            life: 3000
        });
    } finally {
        isUnlinking.value = false;
    }
}

function handleClose() {
    selectedUserId.value = null;
    dialogVisible.value = false;
}

// Watchers
watch(() => props.visible, async (newVal) => {
    if (newVal && props.doctor) {
        await loadLinkedUser();
        await usersStore.fetchUsers();
    }
});

onMounted(async () => {
    if (props.visible && props.doctor) {
        await loadLinkedUser();
        await usersStore.fetchUsers();
    }
});
</script>

<template>
    <Dialog
        v-model:visible="dialogVisible"
        :header="`Vincular Usuario - ${doctor?.name || ''}`"
        :modal="true"
        :closable="true"
        :style="{ width: '600px' }"
        @hide="handleClose"
    >
        <div class="link-user-dialog">
            <!-- Usuario actualmente vinculado -->
            <div v-if="hasLinkedUser && linkedUserInfo" class="linked-user-section mb-4">
                <Message severity="info" :closable="false">
                    <div class="flex align-items-center justify-content-between">
                        <div>
                            <strong>Usuario vinculado:</strong><br>
                            <span class="mt-1">{{ linkedUserInfo.name }}</span><br>
                            <small class="text-muted">DNI: {{ linkedUserInfo.dni }} | Email: {{ linkedUserInfo.email }}</small>
                        </div>
                        <Button
                            label="Desvincular"
                            icon="pi pi-times"
                            severity="danger"
                            size="small"
                            :loading="isUnlinking"
                            @click="handleUnlink"
                        />
                    </div>
                </Message>
            </div>

            <!-- Formulario de vinculación -->
            <div v-if="!hasLinkedUser" class="link-form">
                <div class="field">
                    <label for="user-select" class="font-semibold">Seleccionar Usuario</label>
                    <Dropdown
                        id="user-select"
                        v-model="selectedUserId"
                        :options="availableUsers"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Seleccione un usuario médico"
                        class="w-full"
                        :filter="true"
                        filterPlaceholder="Buscar usuario..."
                        :disabled="isLinking"
                    >
                        <template #option="slotProps">
                            <div class="flex align-items-center gap-2">
                                <i class="pi pi-user"></i>
                                <div>
                                    <div class="font-semibold">{{ slotProps.option.user.name }}</div>
                                    <small class="text-muted">
                                        {{ slotProps.option.user.dni }} - {{ slotProps.option.user.position }}
                                    </small>
                                </div>
                            </div>
                        </template>
                    </Dropdown>
                    <small class="text-muted mt-2 block">
                        Solo se muestran usuarios con posiciones médicas que no estén vinculados a otros médicos.
                    </small>
                </div>

                <Message v-if="availableUsers.length === 0" severity="warn" :closable="false" class="mt-3">
                    No hay usuarios médicos disponibles para vincular.
                </Message>
            </div>

            <!-- Información adicional -->
            <div class="info-section mt-4">
                <Message severity="info" :closable="false">
                    <strong>Información:</strong>
                    <ul class="mt-2 mb-0 pl-4">
                        <li>Un usuario solo puede estar vinculado a un médico a la vez</li>
                        <li>Solo usuarios con posiciones médicas pueden ser vinculados</li>
                        <li>El usuario podrá acceder a "Mis Honorarios" una vez vinculado</li>
                    </ul>
                </Message>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-content-end gap-2">
                <Button
                    label="Cancelar"
                    icon="pi pi-times"
                    severity="secondary"
                    @click="handleClose"
                    :disabled="isLinking || isUnlinking"
                />
                <Button
                    v-if="!hasLinkedUser"
                    label="Vincular"
                    icon="pi pi-link"
                    severity="success"
                    @click="handleLink"
                    :loading="isLinking"
                    :disabled="!selectedUserId"
                />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.link-user-dialog {
    padding: 0.5rem 0;
}

.linked-user-section {
    animation: fadeIn 0.3s ease-out;
}

.link-form {
    animation: fadeIn 0.3s ease-out;
}

.field {
    margin-bottom: 1rem;
}

.field label {
    display: block;
    margin-bottom: 0.5rem;
}

.info-section ul {
    font-size: 0.875rem;
    line-height: 1.6;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
