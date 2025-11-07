<script setup>
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import { computed, reactive, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    user: {
        type: Object,
        default: null
    },
    positionOptions: {
        type: Array,
        default: () => []
    },
    saving: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:visible', 'save-user', 'close']);

// Estado del diálogo
const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const isEditing = computed(() => !!props.user?.id);

const dialogTitle = computed(() => {
    return isEditing.value ? 'Editar Usuario' : 'Nuevo Usuario';
});

// Formulario reactivo
const userForm = reactive({
    name: '',
    dni: '',
    email: '',
    phone: '',
    position: '',
    nick: '',
    url_photo_profile: '',
    password: '',
    password_confirmation: '',
    is_active: true
});

// Estado de validación
const validationErrors = ref({});
const touchedFields = ref({});

// Watchers
watch(
    () => props.user,
    (newUser) => {
        if (newUser && props.visible) {
            loadUserData(newUser);
        } else if (!newUser && props.visible) {
            resetForm();
        }
    },
    { immediate: true, deep: true }
);

watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            if (props.user) {
                loadUserData(props.user);
            } else {
                resetForm();
            }
        } else {
            resetValidation();
        }
    }
);

// Métodos de carga y reset
const loadUserData = (user) => {
    Object.assign(userForm, {
        name: user.name || '',
        dni: user.dni || '',
        email: user.email || '',
        phone: user.phone || '',
        position: user.position || '',
        nick: user.nick || '',
        url_photo_profile: user.url_photo_profile || '',
        password: '',
        password_confirmation: '',
        is_active: user.is_active ?? true
    });
    resetValidation();
};

const resetForm = () => {
    Object.assign(userForm, {
        name: '',
        dni: '',
        email: '',
        phone: '',
        position: '',
        nick: '',
        url_photo_profile: '',
        password: '',
        password_confirmation: '',
        is_active: true
    });
    resetValidation();
};

const resetValidation = () => {
    validationErrors.value = {};
    touchedFields.value = {};
};

// Métodos de formateo
const formatDNI = (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 8);
    userForm.dni = value;
    validateField('dni');
};

const formatPhone = (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 9);
    userForm.phone = value;
    validateField('phone');
};

const formatNick = (event) => {
    const value = event.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    userForm.nick = value;
    validateField('nick');
};

// Validaciones
const validateField = (fieldName) => {
    touchedFields.value[fieldName] = true;

    switch (fieldName) {
        case 'name':
            if (!userForm.name.trim()) {
                validationErrors.value.name = 'El nombre es obligatorio';
            } else if (userForm.name.trim().length > 255) {
                validationErrors.value.name = 'El nombre no puede exceder 255 caracteres';
            } else {
                delete validationErrors.value.name;
            }
            break;

        case 'dni':
            if (isEditing.value) {
                delete validationErrors.value.dni;
                break;
            }
            if (!userForm.dni) {
                validationErrors.value.dni = 'El DNI es obligatorio';
            } else if (!/^\d{8}$/.test(userForm.dni)) {
                validationErrors.value.dni = 'El DNI debe tener exactamente 8 dígitos';
            } else {
                delete validationErrors.value.dni;
            }
            break;

        case 'email':
            if (!userForm.email) {
                validationErrors.value.email = 'El email es obligatorio';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) {
                validationErrors.value.email = 'El email debe tener un formato válido';
            } else {
                delete validationErrors.value.email;
            }
            break;

        case 'phone':
            if (!userForm.phone) {
                validationErrors.value.phone = 'El teléfono es obligatorio';
            } else if (!/^\d{9}$/.test(userForm.phone)) {
                validationErrors.value.phone = 'El teléfono debe tener exactamente 9 dígitos';
            } else {
                delete validationErrors.value.phone;
            }
            break;

        case 'position':
            if (!userForm.position) {
                validationErrors.value.position = 'La posición es obligatoria';
            } else {
                delete validationErrors.value.position;
            }
            break;

        case 'nick':
            if (!userForm.nick) {
                validationErrors.value.nick = 'El nick es obligatorio';
            } else if (userForm.nick.length < 3 || userForm.nick.length > 20) {
                validationErrors.value.nick = 'El nick debe tener entre 3 y 20 caracteres';
            } else if (!/^[a-zA-Z0-9_]+$/.test(userForm.nick)) {
                validationErrors.value.nick = 'El nick solo puede contener letras, números y guión bajo';
            } else {
                delete validationErrors.value.nick;
            }
            break;

        case 'password':
            if (!isEditing.value) {
                if (!userForm.password) {
                    validationErrors.value.password = 'La contraseña es obligatoria';
                } else if (userForm.password.length < 8) {
                    validationErrors.value.password = 'La contraseña debe tener al menos 8 caracteres';
                } else {
                    delete validationErrors.value.password;
                }

                // Re-validar confirmación si ya fue tocada
                if (touchedFields.value.password_confirmation) {
                    validateField('password_confirmation');
                }
            }
            break;

        case 'password_confirmation':
            if (!isEditing.value) {
                if (userForm.password !== userForm.password_confirmation) {
                    validationErrors.value.password_confirmation = 'Las contraseñas no coinciden';
                } else {
                    delete validationErrors.value.password_confirmation;
                }
            }
            break;
    }
};

const validateAllFields = () => {
    let fieldsToValidate = ['name', 'email', 'phone', 'position', 'nick'];

    if (!isEditing.value) {
        fieldsToValidate.push('dni', 'password', 'password_confirmation');
    }

    fieldsToValidate.forEach((field) => {
        validateField(field);
    });
    return Object.keys(validationErrors.value).length === 0;
};

const getFieldError = (fieldName) => {
    return touchedFields.value[fieldName] ? validationErrors.value[fieldName] : null;
};

// Computadas
const isFormValid = computed(() => {
    const hasErrors = Object.keys(validationErrors.value).length > 0;
    const hasRequiredFields = userForm.name && userForm.dni && userForm.email && userForm.phone && userForm.position && userForm.nick;

    if (!isEditing.value) {
        return hasRequiredFields && userForm.password && userForm.password_confirmation && !hasErrors;
    }

    return hasRequiredFields && !hasErrors;
});

// Métodos de acción
const saveUser = () => {
    if (!validateAllFields()) {
        return;
    }

    const userData = { ...userForm };

    // Limpiar datos según el contexto
    if (isEditing.value) {
        delete userData.password;
        delete userData.password_confirmation;
        delete userData.dni; // DNI no se puede editar
    }

    emit('save-user', userData);
};

const closeDialog = () => {
    emit('close');
};

const onDialogHide = () => {
    emit('close');
};

const onImagePreviewError = (event) => {
    event.target.style.display = 'none';
};
</script>

<template>
    <Dialog v-model:visible="dialogVisible" :header="dialogTitle" :modal="true" class="p-fluid user-dialog" :style="{ width: '500px', maxHeight: '85vh' }" :closable="!saving" :closeOnEscape="!saving" @hide="onDialogHide">
        <template #header>
            <div class="flex align-items-center gap-2">
                <i :class="isEditing ? 'pi pi-user-edit text-orange-600' : 'pi pi-user-plus text-green-600'" class="text-xl"></i>
                <span class="font-semibold">{{ dialogTitle }}</span>
            </div>
        </template>

        <form @submit.prevent="saveUser" class="mt-3">
            <!-- Fila 1: Información Personal -->
            <div class="formgrid grid compact-form mb-3">
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="name" class="compact-label"> Nombre Completo * </label>
                        <InputText id="name" v-model="userForm.name" :class="{ 'p-invalid': getFieldError('name') }" placeholder="Juan Carlos Pérez García" maxlength="255" @blur="validateField('name')" class="compact-input" fluid />
                        <small class="p-error" v-if="getFieldError('name')">{{ getFieldError('name') }}</small>
                    </div>
                </div>
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="dni" class="compact-label"> DNI * </label>
                        <InputText
                            id="dni"
                            v-model="userForm.dni"
                            :class="{ 'p-invalid': getFieldError('dni') }"
                            placeholder="12345678"
                            maxlength="8"
                            :readonly="isEditing"
                            @input="formatDNI"
                            @blur="validateField('dni')"
                            class="compact-input"
                            fluid
                        />
                        <small class="p-error" v-if="getFieldError('dni')">{{ getFieldError('dni') }}</small>
                        <small class="text-500" v-if="isEditing"> DNI no modificable </small>
                    </div>
                </div>
            </div>

            <!-- Fila 2: Contacto -->
            <div class="formgrid grid compact-form mb-3">
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="email" class="compact-label"> Email * </label>
                        <InputText id="email" v-model="userForm.email" :class="{ 'p-invalid': getFieldError('email') }" placeholder="usuario@clinica.com" type="email" @blur="validateField('email')" class="compact-input" fluid />
                        <small class="p-error" v-if="getFieldError('email')">{{ getFieldError('email') }}</small>
                    </div>
                </div>
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="phone" class="compact-label"> Teléfono * </label>
                        <InputText id="phone" v-model="userForm.phone" :class="{ 'p-invalid': getFieldError('phone') }" placeholder="987654321" maxlength="9" @input="formatPhone" @blur="validateField('phone')" class="compact-input" fluid />
                        <small class="p-error" v-if="getFieldError('phone')">{{ getFieldError('phone') }}</small>
                    </div>
                </div>
            </div>

            <!-- Fila 3: Información Laboral -->
            <div class="formgrid grid compact-form mb-3">
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="position" class="compact-label"> Rol * </label>
                        <Select
                            id="position"
                            v-model="userForm.position"
                            :options="positionOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Seleccionar"
                            :class="{ 'p-invalid': getFieldError('position') }"
                            @change="validateField('position')"
                            :filter="true"
                            filterPlaceholder="Buscar..."
                            class="compact-input-select"
                            fluid
                        />
                        <small class="p-error" v-if="getFieldError('position')">{{ getFieldError('position') }}</small>
                    </div>
                </div>
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="nick" class="compact-label"> Usuario * </label>
                        <InputText id="nick" v-model="userForm.nick" :class="{ 'p-invalid': getFieldError('nick') }" placeholder="usuario123" maxlength="20" @input="formatNick" @blur="validateField('nick')" class="compact-input" fluid />
                        <small class="p-error" v-if="getFieldError('nick')">{{ getFieldError('nick') }}</small>
                        <small class="text-500"> 3-20 caracteres (letras, números, _) </small>
                    </div>
                </div>
            </div>

            <!-- Fila 4: Contraseñas/Foto -->
            <div class="formgrid grid compact-form">
                <!-- Para nuevos usuarios: contraseñas -->
                <template v-if="!isEditing">
                    <div class="col-12 md:col-6">
                        <div class="field">
                            <label for="password" class="compact-label"> Contraseña * </label>
                            <Password
                                id="password"
                                v-model="userForm.password"
                                :class="{ 'p-invalid': getFieldError('password') }"
                                toggleMask
                                :feedback="false"
                                placeholder="Mínimo 8 caracteres"
                                @blur="validateField('password')"
                                class="compact-input-select"
                                fluid
                            />
                            <small class="p-error" v-if="getFieldError('password')">{{ getFieldError('password') }}</small>
                        </div>
                    </div>
                    <div class="col-12 md:col-6">
                        <div class="field">
                            <label for="password_confirmation" class="compact-label"> Confirmar Contraseña * </label>
                            <Password
                                id="password_confirmation"
                                v-model="userForm.password_confirmation"
                                :class="{ 'p-invalid': getFieldError('password_confirmation') }"
                                toggleMask
                                :feedback="false"
                                placeholder="Repetir contraseña"
                                @blur="validateField('password_confirmation')"
                                class="compact-input-select"
                                fluid
                            />
                            <small class="p-error" v-if="getFieldError('password_confirmation')">{{ getFieldError('password_confirmation') }}</small>
                        </div>
                    </div>
                </template>

                <!-- Para edición: foto -->
                <template v-else>
                    <div class="col-12 md:col-8">
                        <div class="field">
                            <label for="url_photo_profile" class="compact-label"> URL Foto (Opcional) </label>
                            <InputText id="url_photo_profile" v-model="userForm.url_photo_profile" placeholder="https://ejemplo.com/foto.jpg" @blur="validateField('url_photo_profile')" class="compact-input" fluid />
                            <small class="text-500"> Enlace público de imagen </small>
                        </div>
                    </div>
                    <div class="col-12 md:col-4">
                        <label class="compact-label">Preview</label>
                        <div class="photo-preview" :class="{ 'no-photo': !userForm.url_photo_profile }">
                            <img v-if="userForm.url_photo_profile" :src="userForm.url_photo_profile" alt="Preview" class="preview-img" @error="onImagePreviewError" />
                            <div v-else class="no-photo-placeholder">
                                <i class="pi pi-image"></i>
                                <span>Sin foto</span>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </form>

        <template #footer>
            <div class="flex justify-content-between align-items-center">
                <div class="text-500 text-sm">* Campos obligatorios</div>
                <div class="flex gap-2">
                    <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="closeDialog" :disabled="saving" />
                    <Button :label="isEditing ? 'Actualizar' : 'Crear Usuario'" :icon="isEditing ? 'pi pi-check' : 'pi pi-plus'" @click="saveUser" :loading="saving" :disabled="!isFormValid" />
                </div>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
/* Layout compacto principal */
.user-dialog {
    max-width: 92vw;
    max-height: 85vh;
    overflow: hidden;
}

:deep(.p-dialog-content) {
    padding: 0.75rem;
    max-height: calc(85vh - 120px);
    overflow-y: auto;
}

.compact-form {
    gap: 0.5rem;
}

/* Formulario compacto sin tarjetas */

/* Labels compactos */
.compact-label {
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 0.25rem;
    display: block;
    font-size: 0.85rem;
}

/* Campos de entrada compactos */
.compact-input,
:deep(.compact-input) {
    padding: 0.5rem 0.75rem !important;
    font-size: 0.9rem !important;

    transition: all 0.15s ease !important;
    height: 2.5rem !important;
}

.compact-input,
:deep(.compact-input-select) {
    font-size: 0.9rem !important;

    transition: all 0.15s ease !important;
    height: 2.5rem !important;
}

.compact-input:hover,
:deep(.compact-input:hover),
:deep(.compact-input:hover input) {
    border-color: var(--primary-300) !important;
}

.compact-input:focus,
:deep(.compact-input:focus),
:deep(.compact-input:focus input),
:deep(.compact-input.p-focus) {
    border-color: var(--primary-color) !important;
    box-shadow: 0 0 0 2px var(--primary-100) !important;
}

/* Campos de entrada específicos */
:deep(.p-inputtext.compact-input) {
    padding: 0.5rem 0.75rem;
    height: 2.5rem;
}

:deep(.p-dropdown.compact-input) {
    height: 2.5rem;
}

:deep(.p-dropdown.compact-input .p-dropdown-label) {
    padding: 0.5rem 0.75rem;
    line-height: 1.5;
}

:deep(.p-password.compact-input input) {
    padding: 0.5rem 0.75rem !important;
    height: 2.5rem !important;
}

/* Campos compactos */
.field {
    margin-bottom: 1rem;
}

.field:last-child {
    margin-bottom: 0;
}

/* Mensajes de error compactos */
.p-error {
    font-size: 0.75rem;
    font-weight: 500;
    margin-top: 0.25rem;
    color: var(--red-600);
}

/* Textos de ayuda compactos */
small.text-500 {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    margin-top: 0.15rem;
    display: block;
    line-height: 1.2;
}

/* Preview de foto compacto */
.photo-preview {
    margin-top: 0.5rem;
    text-align: center;
    min-height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.photo-preview.no-photo {
    border: 2px dashed var(--surface-300);
    border-radius: 8px;
    padding: 1rem;
}

.preview-img {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--surface-300);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.no-photo-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color-secondary);
    font-size: 0.8rem;
}

.no-photo-placeholder i {
    font-size: 1.5rem;
    opacity: 0.6;
}

/* Estados inválidos */
:deep(.p-invalid.compact-input),
:deep(.p-invalid.compact-input input) {
    border-color: var(--red-500) !important;
    background-color: var(--red-50) !important;
}

/* Header compacto */
:deep(.p-dialog-header) {
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, var(--primary-50) 0%, var(--surface-0) 100%);
    border-bottom: 1px solid var(--surface-200);
    border-radius: 8px 8px 0 0;
}

:deep(.p-dialog-header .p-dialog-title) {
    font-weight: 700;
    font-size: 1.1rem;
}

/* Footer compacto */
:deep(.p-dialog-footer) {
    padding: 0.75rem 1.25rem;
    background: var(--surface-50);
    border-top: 1px solid var(--surface-200);
    border-radius: 0 0 8px 8px;
}

:deep(.p-button) {
    border-radius: 6px;
    font-weight: 600;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    transition: all 0.15s ease;
}

:deep(.p-button:hover) {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Select panel compacto */
:deep(.p-dropdown-panel) {
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    border: 1px solid var(--surface-200);
}

:deep(.p-dropdown-item) {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
}

/* Responsive ultra compacto */
@media (max-width: 968px) {
    .user-dialog {
        max-width: 95vw;
    }

    .compact-form .col-12.md\\:col-6 {
        flex: 0 0 auto;
        width: 50%;
    }
}

@media (max-width: 768px) {
    .user-dialog {
        margin: 0.5rem;
        max-width: calc(100vw - 1rem);
        max-height: 90vh;
    }

    :deep(.p-dialog-content) {
        padding: 0.5rem;
        max-height: calc(90vh - 100px);
    }

    .compact-form .col-12.md\\:col-6 {
        width: 100%;
        margin-bottom: 0.5rem;
    }

    .field {
        margin-bottom: 0.6rem;
    }

    :deep(.p-dialog-header),
    :deep(.p-dialog-footer) {
        padding: 0.75rem 1rem;
    }
}

@media (max-width: 480px) {
    .user-dialog {
        margin: 0.25rem;
        max-width: calc(100vw - 0.5rem);
        max-height: 95vh;
    }

    :deep(.p-dialog-content) {
        max-height: calc(95vh - 80px);
    }

    .compact-label {
        font-size: 0.8rem;
        margin-bottom: 0.2rem;
    }

    .field {
        margin-bottom: 0.5rem;
    }

    :deep(.p-dialog-header),
    :deep(.p-dialog-footer) {
        padding: 0.5rem 0.75rem;
    }

    :deep(.p-button) {
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
    }

    .flex.gap-2 {
        gap: 0.5rem;
    }
}

/* Modo oscuro */
@media (prefers-color-scheme: dark) {
    :deep(.p-dialog-footer) {
        background: var(--surface-900);
    }

    :deep(.p-dialog-header) {
        background: linear-gradient(135deg, var(--surface-800) 0%, var(--surface-900) 100%);
    }
}

/* Scrollbar personalizada */
:deep(.p-dialog-content)::-webkit-scrollbar {
    width: 4px;
}

:deep(.p-dialog-content)::-webkit-scrollbar-track {
    background: var(--surface-100);
}

:deep(.p-dialog-content)::-webkit-scrollbar-thumb {
    background: var(--primary-300);
    border-radius: 2px;
}

:deep(.p-dialog-content)::-webkit-scrollbar-thumb:hover {
    background: var(--primary-400);
}
</style>
