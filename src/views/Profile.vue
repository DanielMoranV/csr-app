<script setup>
import { profile } from '@/api';
import { useAuth } from '@/composables/useAuth';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

// PrimeVue Components
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Card from 'primevue/card';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import TabPanel from 'primevue/tabpanel';
import TabView from 'primevue/tabview';
import Tag from 'primevue/tag';

const { user } = useAuth();
const toast = useToast();

const editMode = ref(false);
const saving = ref(false);
const changingPassword = ref(false);
const showAvatarUpload = ref(false);

const userProfile = ref({
    name: '',
    dni: '',
    email: '',
    phone: '',
    position: '',
    nick: '',
    avatar: ''
});

const originalProfile = ref({});

const passwordData = ref({
    current: '',
    new: '',
    confirm: ''
});

const profileErrors = ref({});
const passwordErrors = ref({});

const isPasswordFormValid = computed(() => {
    return passwordData.value.current && passwordData.value.new && passwordData.value.confirm && passwordData.value.new === passwordData.value.confirm && passwordData.value.new.length >= 8;
});

const isProfileFormValid = computed(() => {
    return userProfile.value.name?.trim() && userProfile.value.email?.trim() && validateEmail(userProfile.value.email);
});

const userInitials = computed(() => {
    if (userProfile.value.name) {
        return userProfile.value.name
            .split(' ')
            .map((name) => name.charAt(0))
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }
    return 'U';
});

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone) => !phone || /^[0-9]{9}$/.test(phone);

const validateProfile = () => {
    const errors = {};
    if (!userProfile.value.name?.trim()) errors.name = 'El nombre es obligatorio';
    if (!userProfile.value.email?.trim()) errors.email = 'El email es obligatorio';
    else if (!validateEmail(userProfile.value.email)) errors.email = 'El formato del email no es válido';
    if (userProfile.value.phone && !validatePhone(userProfile.value.phone)) errors.phone = 'El teléfono debe tener 9 dígitos';
    if (!userProfile.value.nick?.trim()) errors.nick = 'El nick es obligatorio';
    profileErrors.value = errors;
    return Object.keys(errors).length === 0;
};

const validatePasswordForm = () => {
    const errors = {};
    if (!passwordData.value.current) errors.current = 'La contraseña actual es obligatoria';
    if (!passwordData.value.new) errors.new = 'La nueva contraseña es obligatoria';
    else if (passwordData.value.new.length < 8) errors.new = 'La contraseña debe tener al menos 8 caracteres';
    if (passwordData.value.new !== passwordData.value.confirm) errors.confirm = 'Las contraseñas no coinciden';
    passwordErrors.value = errors;
    return Object.keys(errors).length === 0;
};

const onAvatarUpload = async (event) => {
    const file = event.files[0];
    if (!file) return;
    try {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await profile.uploadAvatar(formData);
        userProfile.value.avatar = response.data.avatar_url;
        showToast('success', 'Avatar Actualizado');
    } catch (error) {
        showToast('error', 'Error al subir el avatar');
    } finally {
        showAvatarUpload.value = false;
    }
};

const removeAvatar = async () => {
    try {
        await profile.deleteAvatar();
        userProfile.value.avatar = '';
        showToast('success', 'Avatar Eliminado');
    } catch (error) {
        showToast('error', 'Error al eliminar el avatar');
    }
};

const loadUserProfile = () => {
    if (!user.value) return;
    userProfile.value = { ...userProfile.value, ...user.value };
    originalProfile.value = { ...userProfile.value };
};

const enableEdit = () => {
    editMode.value = true;
    profileErrors.value = {};
};

const cancelEdit = () => {
    userProfile.value = { ...originalProfile.value };
    editMode.value = false;
    profileErrors.value = {};
};

const saveProfile = async () => {
    if (!validateProfile()) return;
    saving.value = true;
    try {
        await profile.update(userProfile.value);
        showToast('success', 'Perfil Actualizado');
        originalProfile.value = { ...userProfile.value };
        editMode.value = false;
    } catch (error) {
        showToast('error', error.response?.data?.message || 'No se pudo actualizar el perfil');
    } finally {
        saving.value = false;
    }
};

const changePassword = async () => {
    if (!validatePasswordForm()) return;
    changingPassword.value = true;
    try {
        await profile.changePassword({
            current_password: passwordData.value.current,
            new_password: passwordData.value.new,
            new_password_confirmation: passwordData.value.confirm
        });
        showToast('success', 'Contraseña Cambiada');
        passwordData.value = { current: '', new: '', confirm: '' };
        passwordErrors.value = {};
    } catch (error) {
        showToast('error', error.response?.data?.message || 'No se pudo cambiar la contraseña');
    } finally {
        changingPassword.value = false;
    }
};

const showToast = (severity, summary, detail = '', life = 3000) => {
    toast.add({ severity, summary, detail, life });
};

const formatDate = (date) => new Intl.DateTimeFormat('es-PE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));

onMounted(loadUserProfile);
</script>

<template>
    <div class="user-profile-page">
        <!-- Profile Header Card -->
        <div class="profile-header-card">
            <div class="header-main-content">
                <div class="avatar-container">
                    <Avatar v-if="userProfile.avatar" :image="userProfile.avatar" shape="circle" class="user-avatar" />
                    <Avatar v-else :label="userInitials" shape="circle" class="user-avatar" />
                </div>
                <div class="user-info">
                    <h2 class="user-name">{{ userProfile.name || 'Nombre de Usuario' }}</h2>
                    <p class="user-position">{{ userProfile.position || 'Sin cargo asignado' }}</p>
                    <!-- <div class="user-meta">
                        <span v-if="userProfile.nick"><i class="pi pi-at"></i> {{ userProfile.nick }}</span>
                        <span v-if="userProfile.email"><i class="pi pi-envelope"></i> {{ userProfile.email }}</span>
                    </div> -->
                </div>
            </div>
            <div class="header-status">
                <Tag value="Cuenta Activa" severity="success" icon="pi pi-check-circle" />
            </div>
        </div>

        <!-- TabView for Profile Details -->
        <TabView class="profile-tabview">
            <TabPanel>
                <template #header>
                    <i class="pi pi-user mr-2" />
                    <span>Información General</span>
                </template>
                <Card class="form-card">
                    <template #title>
                        <div class="card-title-container">
                            <div class="flex align-items-center">
                                <i class="pi pi-user-edit mr-2 text-xl text-primary"></i>
                                <span>Datos Personales y de Contacto</span>
                            </div>
                            <div class="card-actions">
                                <Button v-if="!editMode" label="Editar" icon="pi pi-pencil" @click="enableEdit" text />
                                <template v-else>
                                    <Button label="Cancelar" icon="pi pi-times" @click="cancelEdit" text severity="secondary" class="mr-2" />
                                    <Button label="Guardar" icon="pi pi-check" @click="saveProfile" :loading="saving" />
                                </template>
                            </div>
                        </div>
                    </template>
                    <template #content>
                        <div class="form-panel">
                            <div class="formgrid grid">
                                <div class="field col-12 md:col-6">
                                    <label>Nombre completo</label>
                                    <IconField iconPosition="left">
                                        <InputIcon class="pi pi-user" />
                                        <InputText v-model="userProfile.name" :readonly="!editMode" :class="{ 'p-invalid': profileErrors.name }" class="w-full" />
                                    </IconField>
                                </div>
                                <div class="field col-12 md:col-6">
                                    <label>Documento (DNI)</label>
                                    <IconField iconPosition="left">
                                        <InputIcon class="pi pi-id-card" />
                                        <InputText v-model="userProfile.dni" readonly class="w-full" />
                                    </IconField>
                                </div>
                                <div class="field col-12 md:col-6">
                                    <label>Correo Electrónico</label>
                                    <IconField iconPosition="left">
                                        <InputIcon class="pi pi-envelope" />
                                        <InputText v-model="userProfile.email" :readonly="!editMode" :class="{ 'p-invalid': profileErrors.email }" class="w-full" />
                                    </IconField>
                                </div>
                                <div class="field col-12 md:col-6">
                                    <label>Teléfono</label>
                                    <IconField iconPosition="left">
                                        <InputIcon class="pi pi-phone" />
                                        <InputText v-model="userProfile.phone" :readonly="!editMode" :class="{ 'p-invalid': profileErrors.phone }" class="w-full" />
                                    </IconField>
                                </div>
                                <div class="field col-12 md:col-6">
                                    <label>Cargo / Especialidad</label>
                                    <IconField iconPosition="left">
                                        <InputIcon class="pi pi-briefcase" />
                                        <InputText v-model="userProfile.position" readonly class="w-full" />
                                    </IconField>
                                </div>
                                <div class="field col-12 md:col-6">
                                    <label>Nombre de usuario</label>
                                    <IconField iconPosition="left">
                                        <InputIcon class="pi pi-at" />
                                        <InputText v-model="userProfile.nick" :readonly="!editMode" :class="{ 'p-invalid': profileErrors.nick }" class="w-full" />
                                    </IconField>
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>
            </TabPanel>

            <TabPanel>
                <template #header>
                    <i class="pi pi-shield mr-2" />
                    <span>Seguridad</span>
                </template>
                <Card class="form-card">
                    <template #title>
                        <div class="flex align-items-center">
                            <i class="pi pi-key mr-2 text-xl text-primary"></i>
                            <span>Cambiar Contraseña</span>
                        </div>
                    </template>
                    <template #content>
                        <div class="form-panel security-panel">
                            <div class="field">
                                <label>Contraseña actual</label>
                                <Password v-model="passwordData.current" :feedback="false" toggleMask :class="{ 'p-invalid': passwordErrors.current }" placeholder="&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;" fluid />
                            </div>
                            <div class="field">
                                <label>Nueva contraseña</label>
                                <Password v-model="passwordData.new" :feedback="false" toggleMask :class="{ 'p-invalid': passwordErrors.new }" placeholder="Mínimo 8 caracteres" fluid />
                            </div>
                            <div class="field">
                                <label>Confirmar contraseña</label>
                                <Password v-model="passwordData.confirm" :feedback="false" toggleMask :class="{ 'p-invalid': passwordErrors.confirm }" placeholder="Repita la nueva contraseña" fluid />
                            </div>
                            <Button label="Actualizar Contraseña" icon="pi pi-key" class="w-full mt-3" :loading="changingPassword" :disabled="!isPasswordFormValid" @click="changePassword" fluid />
                        </div>
                    </template>
                </Card>
            </TabPanel>

            <TabPanel>
                <template #header>
                    <i class="pi pi-info-circle mr-2" />
                    <span>Información de Sistema</span>
                </template>
                <Card class="form-card">
                    <template #title>
                        <div class="flex align-items-center">
                            <i class="pi pi-cog mr-2 text-xl text-primary"></i>
                            <span>Detalles de la Cuenta</span>
                        </div>
                    </template>
                    <template #content>
                        <ul class="info-list">
                            <li>
                                <i class="pi pi-user"></i>
                                <strong>Usuario del sistema:</strong>
                                <span>{{ userProfile.nick || 'No asignado' }}</span>
                            </li>
                            <li>
                                <i class="pi pi-clock"></i>
                                <strong>Último acceso:</strong>
                                <span>{{ formatDate(new Date()) }}</span>
                            </li>
                            <li>
                                <i class="pi pi-shield-check"></i>
                                <strong>Estado de la cuenta:</strong>
                                <Tag value="Activa" severity="success" />
                            </li>
                            <li>
                                <i class="pi pi-briefcase"></i>
                                <strong>Rol / Cargo:</strong>
                                <span>{{ userProfile.position || 'No asignado' }}</span>
                            </li>
                            <li>
                                <i class="pi pi-envelope"></i>
                                <strong>Email de recuperación:</strong>
                                <span>{{ userProfile.email || 'No disponible' }}</span>
                            </li>
                        </ul>
                    </template>
                </Card>
            </TabPanel>
        </TabView>
    </div>
</template>

<style scoped>
.user-profile-page {
    background: var(--surface-ground);
}

/* Header Card */
.profile-header-card {
    background: var(--surface-card);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1.5rem;
}

.header-main-content {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.avatar-container .user-avatar {
    width: 80px;
    height: 80px;
    font-size: 2.5rem;
    border: 3px solid var(--primary-500);
}

.user-info .user-name {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-color);
}

.user-info .user-position {
    margin: 0.25rem 0 0.5rem;
    font-size: 1.1rem;
    color: var(--text-color-secondary);
    font-weight: 500;
}

.user-info .user-meta {
    display: flex;
    gap: 1.5rem;
    color: var(--text-color-secondary);
    font-size: 0.9rem;
}

.user-meta span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* TabView */
.profile-tabview {
    border: none;
}

:deep(.p-tabview-nav) {
    background: transparent;
    border: none;
    margin-bottom: 0.5rem;
}

:deep(.p-tabview-nav-link) {
    background: var(--surface-card) !important;
    border: 1px solid var(--surface-border) !important;
    border-radius: 8px 8px 0 0 !important;
    margin-right: 0.5rem;
    transition: all 0.2s ease !important;
}

:deep(.p-tabview-nav-link:not(.p-highlight):hover) {
    background: var(--surface-100) !important;
}

:deep(.p-tabview-nav .p-highlight .p-tabview-nav-link) {
    background: var(--primary-500) !important;
    color: var(--primary-color-text) !important;
    border-color: var(--primary-500) !important;
}

:deep(.p-tabview-panels) {
    padding: 0;
}

.form-card {
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.card-title-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.form-panel .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
}

.form-panel label {
    font-weight: 600;
    color: var(--text-color-secondary);
    font-size: 0.9rem;
}

.form-panel .p-inputtext,
.form-panel .p-password {
    width: 100%;
}

.security-panel {
    max-width: 450px;
    margin: 0 auto;
}

.info-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.info-list li {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px solid var(--surface-100);
}

.info-list i {
    color: var(--primary-500);
    font-size: 1.2rem;
}

.info-list strong {
    font-weight: 600;
    color: var(--text-color-secondary);
}

.info-list span {
    margin-left: auto;
    font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
    .user-profile-page {
        padding: 1rem;
    }
    .profile-header-card {
        flex-direction: column;
        align-items: flex-start;
    }
    .user-info .user-name {
        font-size: 1.75rem;
    }
    .card-title-container {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }
}
</style>
