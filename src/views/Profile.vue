<script setup>
import { profile } from '@/api';
import { useAuth } from '@/composables/useAuth';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';

const { user } = useAuth();
const toast = useToast();

const editMode = ref(false);
const saving = ref(false);
const changingPassword = ref(false);

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
const showAvatarDialog = ref(false);
const avatarFile = ref(null);

const isPasswordFormValid = computed(() => {
    return passwordData.value.current && passwordData.value.new && passwordData.value.confirm && passwordData.value.new === passwordData.value.confirm && passwordData.value.new.length >= 8;
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

// Validación en tiempo real
watch(
    () => userProfile.value.name,
    (newVal) => {
        if (editMode.value && newVal) {
            if (!newVal.trim()) profileErrors.value.name = 'El nombre es obligatorio';
            else delete profileErrors.value.name;
        }
    }
);

watch(
    () => userProfile.value.email,
    (newVal) => {
        if (editMode.value && newVal) {
            if (!newVal.trim()) profileErrors.value.email = 'El email es obligatorio';
            else if (!validateEmail(newVal)) profileErrors.value.email = 'El formato del email no es válido';
            else delete profileErrors.value.email;
        }
    }
);

watch(
    () => userProfile.value.phone,
    (newVal) => {
        if (editMode.value && newVal) {
            if (newVal && !validatePhone(newVal)) profileErrors.value.phone = 'El teléfono debe tener 9 dígitos';
            else delete profileErrors.value.phone;
        }
    }
);

watch(
    () => userProfile.value.nick,
    (newVal) => {
        if (editMode.value && newVal) {
            if (!newVal.trim()) profileErrors.value.nick = 'El nick es obligatorio';
            else delete profileErrors.value.nick;
        }
    }
);

const validatePasswordForm = () => {
    const errors = {};
    if (!passwordData.value.current) errors.current = 'La contraseña actual es obligatoria';
    if (!passwordData.value.new) errors.new = 'La nueva contraseña es obligatoria';
    else if (passwordData.value.new.length < 8) errors.new = 'La contraseña debe tener al menos 8 caracteres';
    if (passwordData.value.new !== passwordData.value.confirm) errors.confirm = 'Las contraseñas no coinciden';
    passwordErrors.value = errors;
    return Object.keys(errors).length === 0;
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
    passwordErrors.value = {};
    try {
        await profile.changePassword({
            current_password: passwordData.value.current,
            password: passwordData.value.new,
            password_confirmation: passwordData.value.confirm
        });
        showToast('success', 'Contraseña actualizada exitosamente');
        passwordData.value = { current: '', new: '', confirm: '' };
        passwordErrors.value = {};
    } catch (error) {
        if (error.response && error.response.status === 422 && error.response.data.errors) {
            const backendErrors = error.response.data.errors;
            const newPasswordErrors = {};
            if (backendErrors.current_password) {
                newPasswordErrors.current = backendErrors.current_password[0];
            }
            if (backendErrors.password) {
                const passwordErrorText = backendErrors.password[0];
                if (passwordErrorText.toLowerCase().includes('coinciden')) {
                    newPasswordErrors.confirm = passwordErrorText;
                } else {
                    newPasswordErrors.new = passwordErrorText;
                }
            }
            passwordErrors.value = newPasswordErrors;
        }
        showToast('error', error.response?.data?.message || 'No se pudo cambiar la contraseña');
    } finally {
        changingPassword.value = false;
    }
};

const showToast = (severity, summary, detail = '', life = 3000) => {
    toast.add({ severity, summary, detail, life });
};

const formatDate = (date) => new Intl.DateTimeFormat('es-PE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));

const onAvatarSelect = (event) => {
    const file = event.files[0];
    if (file) {
        avatarFile.value = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            userProfile.value.avatar = e.target.result;
        };
        reader.readAsDataURL(file);
        showAvatarDialog.value = false;
    }
};

const removeAvatar = () => {
    userProfile.value.avatar = '';
    avatarFile.value = null;
    showAvatarDialog.value = false;
};

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
                    <Button icon="pi pi-camera" rounded severity="secondary" class="avatar-edit-btn" @click="showAvatarDialog = true" />
                </div>
                <div class="user-info">
                    <h2 class="user-name">{{ userProfile.name || 'Nombre de Usuario' }}</h2>
                    <p class="user-position">{{ userProfile.position || 'Sin cargo asignado' }}</p>
                    <div class="user-meta">
                        <span v-if="userProfile.nick"><i class="pi pi-at"></i> {{ userProfile.nick }}</span>
                        <span v-if="userProfile.email"><i class="pi pi-envelope"></i> {{ userProfile.email }}</span>
                    </div>
                </div>
            </div>
            <div class="header-status">
                <Tag value="Cuenta Activa" severity="success" icon="pi pi-check-circle" />
            </div>
        </div>

        <!-- Avatar Dialog -->
        <Dialog v-model:visible="showAvatarDialog" header="Cambiar Foto de Perfil" :modal="true" :style="{ width: '450px' }">
            <div class="avatar-dialog-content">
                <div class="current-avatar">
                    <Avatar v-if="userProfile.avatar" :image="userProfile.avatar" shape="circle" size="xlarge" />
                    <Avatar v-else :label="userInitials" shape="circle" size="xlarge" />
                </div>
                <FileUpload mode="basic" accept="image/*" :maxFileSize="2000000" @select="onAvatarSelect" chooseLabel="Seleccionar Imagen" class="w-full mt-3" />
                <Button label="Eliminar Foto" icon="pi pi-trash" severity="danger" text class="w-full mt-2" @click="removeAvatar" :disabled="!userProfile.avatar" />
            </div>
        </Dialog>

        <!-- TabView for Profile Details -->
        <Tabs class="profile-tabview" value="1">
            <TabList>
                <Tab key="info" value="1">
                    <i class="pi pi-info-circle mr-2" />
                    <span>Información General</span>
                </Tab>
                <Tab key="edit" value="2">
                    <i class="pi pi-user-edit mr-2" />
                    <span>Editar Perfil</span>
                </Tab>
                <Tab key="password" value="3">
                    <i class="pi pi-lock mr-2" />
                    <span>Cambiar Contraseña</span>
                </Tab>
            </TabList>
            <TabPanels>
                <!-- Tab 1: Información General (Read-only) -->
                <TabPanel key="info" value="1">
                    <Card class="form-card">
                        <template #title>
                            <div class="flex align-items-center">
                                <i class="pi pi-info-circle mr-2 text-xl text-primary"></i>
                                <span>Detalles de la Cuenta</span>
                            </div>
                        </template>
                        <template #content>
                            <ul class="info-list">
                                <li>
                                    <i class="pi pi-user"></i>
                                    <strong>Nombre completo:</strong>
                                    <span>{{ userProfile.name || 'No asignado' }}</span>
                                </li>
                                <li>
                                    <i class="pi pi-id-card"></i>
                                    <strong>DNI:</strong>
                                    <span>{{ userProfile.dni || 'No disponible' }}</span>
                                </li>
                                <li>
                                    <i class="pi pi-at"></i>
                                    <strong>Usuario del sistema:</strong>
                                    <span>{{ userProfile.nick || 'No asignado' }}</span>
                                </li>
                                <li>
                                    <i class="pi pi-envelope"></i>
                                    <strong>Correo electrónico:</strong>
                                    <span>{{ userProfile.email || 'No disponible' }}</span>
                                </li>
                                <li>
                                    <i class="pi pi-phone"></i>
                                    <strong>Teléfono:</strong>
                                    <span>{{ userProfile.phone || 'No registrado' }}</span>
                                </li>
                                <li>
                                    <i class="pi pi-briefcase"></i>
                                    <strong>Cargo / Especialidad:</strong>
                                    <span>{{ userProfile.position || 'No asignado' }}</span>
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
                            </ul>
                        </template>
                    </Card>
                </TabPanel>

                <!-- Tab 2: Editar Perfil -->
                <TabPanel key="edit" value="2">
                    <Card class="form-card">
                        <template #title>
                            <div class="card-title-container">
                                <div class="flex align-items-center">
                                    <i class="pi pi-user-edit mr-2 text-xl text-primary"></i>
                                    <span>Editar Datos Personales</span>
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
                                        <label>Nombre completo <span class="required">*</span></label>
                                        <IconField iconPosition="left">
                                            <InputIcon class="pi pi-user" />
                                            <InputText v-model="userProfile.name" :readonly="!editMode" :class="{ 'p-invalid': profileErrors.name }" class="w-full" placeholder="Ingrese su nombre completo" />
                                        </IconField>
                                        <small v-if="profileErrors.name" class="p-error">{{ profileErrors.name }}</small>
                                    </div>
                                    <div class="field col-12 md:col-6">
                                        <label>Documento (DNI)</label>
                                        <IconField iconPosition="left">
                                            <InputIcon class="pi pi-id-card" />
                                            <InputText v-model="userProfile.dni" readonly class="w-full" />
                                        </IconField>
                                        <small class="p-hint">Este campo no es editable</small>
                                    </div>
                                    <div class="field col-12 md:col-6">
                                        <label>Correo Electrónico <span class="required">*</span></label>
                                        <IconField iconPosition="left">
                                            <InputIcon class="pi pi-envelope" />
                                            <InputText v-model="userProfile.email" :readonly="!editMode" :class="{ 'p-invalid': profileErrors.email }" class="w-full" placeholder="ejemplo@correo.com" />
                                        </IconField>
                                        <small v-if="profileErrors.email" class="p-error">{{ profileErrors.email }}</small>
                                    </div>
                                    <div class="field col-12 md:col-6">
                                        <label>Teléfono</label>
                                        <IconField iconPosition="left">
                                            <InputIcon class="pi pi-phone" />
                                            <InputText v-model="userProfile.phone" :readonly="!editMode" :class="{ 'p-invalid': profileErrors.phone }" class="w-full" placeholder="999999999" maxlength="9" />
                                        </IconField>
                                        <small v-if="profileErrors.phone" class="p-error">{{ profileErrors.phone }}</small>
                                        <small v-else class="p-hint">Formato: 9 dígitos</small>
                                    </div>
                                    <div class="field col-12 md:col-6">
                                        <label>Cargo / Especialidad</label>
                                        <IconField iconPosition="left">
                                            <InputIcon class="pi pi-briefcase" />
                                            <InputText v-model="userProfile.position" readonly class="w-full" />
                                        </IconField>
                                        <small class="p-hint">Este campo no es editable</small>
                                    </div>
                                    <div class="field col-12 md:col-6">
                                        <label>Nombre de usuario <span class="required">*</span></label>
                                        <IconField iconPosition="left">
                                            <InputIcon class="pi pi-at" />
                                            <InputText v-model="userProfile.nick" :readonly="!editMode" :class="{ 'p-invalid': profileErrors.nick }" class="w-full" placeholder="nombre_usuario" />
                                        </IconField>
                                        <small v-if="profileErrors.nick" class="p-error">{{ profileErrors.nick }}</small>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Card>
                </TabPanel>

                <!-- Tab 3: Cambiar Contraseña -->
                <TabPanel key="password" value="3">
                    <Card class="form-card">
                        <template #title>
                            <div class="flex align-items-center">
                                <i class="pi pi-key mr-2 text-xl text-primary"></i>
                                <span>Cambiar Contraseña</span>
                            </div>
                        </template>
                        <template #content>
                            <div class="form-panel security-panel">
                                <Message severity="info" :closable="false" class="mb-4">
                                    <span class="text-sm">Por seguridad, necesitarás tu contraseña actual para establecer una nueva.</span>
                                </Message>
                                <div class="field">
                                    <label>Contraseña actual <span class="required">*</span></label>
                                    <Password v-model="passwordData.current" :feedback="false" toggleMask :class="{ 'p-invalid': passwordErrors.current }" placeholder="&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;" fluid />
                                    <small v-if="passwordErrors.current" class="p-error">{{ passwordErrors.current }}</small>
                                </div>
                                <div class="field">
                                    <label>Nueva contraseña <span class="required">*</span></label>
                                    <Password v-model="passwordData.new" :feedback="true" toggleMask :class="{ 'p-invalid': passwordErrors.new }" placeholder="Mínimo 8 caracteres" fluid />
                                    <small v-if="passwordErrors.new" class="p-error">{{ passwordErrors.new }}</small>
                                    <small v-else class="p-hint">Debe contener al menos 8 caracteres</small>
                                </div>
                                <div class="field">
                                    <label>Confirmar contraseña <span class="required">*</span></label>
                                    <Password v-model="passwordData.confirm" :feedback="false" toggleMask :class="{ 'p-invalid': passwordErrors.confirm }" placeholder="Repita la nueva contraseña" fluid />
                                    <small v-if="passwordErrors.confirm" class="p-error">{{ passwordErrors.confirm }}</small>
                                </div>
                                <Button label="Actualizar Contraseña" icon="pi pi-key" class="w-full mt-3" :loading="changingPassword" :disabled="!isPasswordFormValid" @click="changePassword" fluid />
                            </div>
                        </template>
                    </Card>
                </TabPanel>
            </TabPanels>
        </Tabs>
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
    padding: 1.5rem;
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

.avatar-container {
    position: relative;
}

.avatar-container .user-avatar {
    width: 90px;
    height: 90px;
    font-size: 2.5rem;
    border: 3px solid var(--primary-500);
}

.avatar-edit-btn {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 35px;
    height: 35px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.avatar-dialog-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
}

.current-avatar {
    margin-bottom: 1rem;
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

:deep(.p-tabs-nav) {
    background: transparent;
    border: none;
    margin-bottom: 0.5rem;
}

:deep(.p-tab-header a) {
    background: var(--surface-card) !important;
    border: 1px solid var(--surface-border) !important;
    border-radius: 8px 8px 0 0 !important;
    margin-right: 0.5rem;
    transition: all 0.2s ease !important;
}

:deep(.p-tab-header:not(.p-highlight) a:hover) {
    background: var(--surface-100) !important;
}

:deep(.p-tabs-nav .p-highlight a) {
    background: var(--primary-500) !important;
    color: var(--primary-color-text) !important;
    border-color: var(--primary-500) !important;
}

:deep(.p-tabs-panels) {
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

.form-panel label .required {
    color: var(--red-500);
    margin-left: 0.25rem;
}

.form-panel .p-inputtext,
.form-panel .p-password {
    width: 100%;
}

.form-panel small.p-error {
    color: var(--red-500);
    font-size: 0.875rem;
    margin-top: 0.25rem;
}

.form-panel small.p-hint {
    color: var(--text-color-secondary);
    font-size: 0.875rem;
    margin-top: 0.25rem;
}

.security-panel {
    max-width: 500px;
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
        padding: 1rem;
    }

    .header-main-content {
        flex-direction: column;
        align-items: center;
        text-align: center;
        width: 100%;
    }

    .user-info .user-name {
        font-size: 1.5rem;
    }

    .user-info .user-position {
        font-size: 1rem;
    }

    .user-meta {
        flex-direction: column;
        gap: 0.5rem !important;
        align-items: center;
    }

    .card-title-container {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }

    .card-actions {
        width: 100%;
        display: flex;
        justify-content: flex-start;
    }

    .security-panel {
        max-width: 100%;
    }

    .info-list li {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .info-list span {
        margin-left: 0;
    }

    :deep(.p-tab-header a) {
        font-size: 0.875rem;
        padding: 0.5rem 0.75rem !important;
    }
}

@media (max-width: 480px) {
    .avatar-container .user-avatar {
        width: 70px;
        height: 70px;
        font-size: 2rem;
    }

    .avatar-edit-btn {
        width: 30px;
        height: 30px;
    }

    .user-info .user-name {
        font-size: 1.25rem;
    }

    .form-panel .field {
        margin-bottom: 1rem;
    }
}
</style>
