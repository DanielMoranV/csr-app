<template>
    <div class="card">
        <h2>Mi Perfil</h2>
        <p class="text-color-secondary mb-4">Información personal y configuración de cuenta</p>

        <div class="grid">
            <!-- Información Personal -->
            <div class="col-12 md:col-8">
                <div class="card">
                    <h5>Información Personal</h5>
                    
                    <div class="formgrid grid">
                        <div class="field col-12 md:col-6">
                            <label for="name" class="font-semibold">Nombre Completo</label>
                            <InputText 
                                id="name" 
                                v-model="userProfile.name" 
                                :readonly="!editMode"
                                class="w-full" 
                            />
                        </div>
                        
                        <div class="field col-12 md:col-6">
                            <label for="dni" class="font-semibold">DNI</label>
                            <InputText 
                                id="dni" 
                                v-model="userProfile.dni" 
                                :readonly="true"
                                class="w-full" 
                            />
                        </div>
                        
                        <div class="field col-12 md:col-6">
                            <label for="email" class="font-semibold">Email</label>
                            <InputText 
                                id="email" 
                                v-model="userProfile.email" 
                                :readonly="!editMode"
                                class="w-full" 
                            />
                        </div>
                        
                        <div class="field col-12 md:col-6">
                            <label for="phone" class="font-semibold">Teléfono</label>
                            <InputText 
                                id="phone" 
                                v-model="userProfile.phone" 
                                :readonly="!editMode"
                                class="w-full" 
                            />
                        </div>
                        
                        <div class="field col-12 md:col-6">
                            <label for="position" class="font-semibold">Posición</label>
                            <InputText 
                                id="position" 
                                v-model="userProfile.position" 
                                :readonly="true"
                                class="w-full" 
                            />
                        </div>
                        
                        <div class="field col-12 md:col-6">
                            <label for="nick" class="font-semibold">Nick</label>
                            <InputText 
                                id="nick" 
                                v-model="userProfile.nick" 
                                :readonly="!editMode"
                                class="w-full" 
                            />
                        </div>
                    </div>

                    <div class="flex gap-3 mt-4">
                        <Button 
                            v-if="!editMode"
                            label="Editar Perfil" 
                            icon="pi pi-pencil" 
                            @click="enableEdit"
                            class="p-button-outlined"
                        />
                        <template v-else>
                            <Button 
                                label="Guardar" 
                                icon="pi pi-check" 
                                @click="saveProfile"
                                :loading="saving"
                            />
                            <Button 
                                label="Cancelar" 
                                icon="pi pi-times" 
                                @click="cancelEdit"
                                class="p-button-secondary"
                            />
                        </template>
                    </div>
                </div>
            </div>

            <!-- Panel de Información -->
            <div class="col-12 md:col-4">
                <div class="card">
                    <h5>Información del Sistema</h5>
                    
                    <div class="flex align-items-center gap-3 mb-3">
                        <div class="w-3rem h-3rem border-circle bg-primary flex align-items-center justify-content-center">
                            <i class="pi pi-user text-white text-xl"></i>
                        </div>
                        <div>
                            <div class="font-semibold text-lg">{{ user?.name || 'Usuario' }}</div>
                            <div class="text-color-secondary">{{ user?.position || 'Sin posición' }}</div>
                        </div>
                    </div>

                    <div class="border-top-1 surface-border pt-3">
                        <div class="text-color-secondary text-sm mb-2">Estado de la cuenta</div>
                        <Tag value="Activo" severity="success" class="mb-3"></Tag>
                        
                        <div class="text-color-secondary text-sm mb-2">Último acceso</div>
                        <div class="text-sm">{{ formatDate(new Date()) }}</div>
                    </div>
                </div>

                <!-- Cambiar Contraseña -->
                <div class="card mt-3">
                    <h5>Cambiar Contraseña</h5>
                    
                    <div class="field">
                        <label for="currentPassword" class="font-semibold">Contraseña Actual</label>
                        <Password 
                            id="currentPassword" 
                            v-model="passwordData.current" 
                            :feedback="false"
                            toggleMask
                            class="w-full"
                        />
                    </div>
                    
                    <div class="field">
                        <label for="newPassword" class="font-semibold">Nueva Contraseña</label>
                        <Password 
                            id="newPassword" 
                            v-model="passwordData.new" 
                            :feedback="true"
                            toggleMask
                            class="w-full"
                        />
                    </div>
                    
                    <div class="field">
                        <label for="confirmPassword" class="font-semibold">Confirmar Nueva Contraseña</label>
                        <Password 
                            id="confirmPassword" 
                            v-model="passwordData.confirm" 
                            :feedback="false"
                            toggleMask
                            class="w-full"
                        />
                    </div>

                    <Button 
                        label="Cambiar Contraseña" 
                        icon="pi pi-lock" 
                        @click="changePassword"
                        :loading="changingPassword"
                        class="w-full p-button-outlined"
                        :disabled="!isPasswordFormValid"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useToast } from 'primevue/usetoast';

import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Password from 'primevue/password';
import Tag from 'primevue/tag';

const { user } = useAuth();
const toast = useToast();

// Estado del formulario
const editMode = ref(false);
const saving = ref(false);
const changingPassword = ref(false);

// Datos del perfil
const userProfile = ref({
    name: '',
    dni: '',
    email: '',
    phone: '',
    position: '',
    nick: ''
});

// Datos originales para cancelar edición
const originalProfile = ref({});

// Datos para cambio de contraseña
const passwordData = ref({
    current: '',
    new: '',
    confirm: ''
});

// Computadas
const isPasswordFormValid = computed(() => {
    return passwordData.value.current && 
           passwordData.value.new && 
           passwordData.value.confirm &&
           passwordData.value.new === passwordData.value.confirm &&
           passwordData.value.new.length >= 8;
});

// Métodos
const loadUserProfile = () => {
    if (user.value) {
        userProfile.value = {
            name: user.value.name || '',
            dni: user.value.dni || '',
            email: user.value.email || '',
            phone: user.value.phone || '',
            position: user.value.position || '',
            nick: user.value.nick || ''
        };
        originalProfile.value = { ...userProfile.value };
    }
};

const enableEdit = () => {
    editMode.value = true;
};

const cancelEdit = () => {
    userProfile.value = { ...originalProfile.value };
    editMode.value = false;
};

const saveProfile = async () => {
    saving.value = true;
    
    try {
        // Simular llamada API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast.add({
            severity: 'success',
            summary: 'Perfil Actualizado',
            detail: 'La información del perfil se ha guardado correctamente',
            life: 3000
        });
        
        originalProfile.value = { ...userProfile.value };
        editMode.value = false;
        
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el perfil',
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};

const changePassword = async () => {
    if (!isPasswordFormValid.value) return;
    
    changingPassword.value = true;
    
    try {
        // Simular llamada API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast.add({
            severity: 'success',
            summary: 'Contraseña Cambiada',
            detail: 'La contraseña se ha actualizado correctamente',
            life: 3000
        });
        
        // Limpiar formulario
        passwordData.value = {
            current: '',
            new: '',
            confirm: ''
        };
        
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cambiar la contraseña',
            life: 3000
        });
    } finally {
        changingPassword.value = false;
    }
};

const formatDate = (date) => {
    return new Intl.DateTimeFormat('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

// Lifecycle
onMounted(() => {
    loadUserProfile();
});
</script>