<script setup>
import { useBoletas } from '@/composables/useBoletas';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Password from 'primevue/password';
import Select from 'primevue/select';
import { onMounted, ref } from 'vue';

const { isLoadingMailSettings, isSavingMailSettings, isTestingMail, fetchMailSettings, saveMailSettings, testMailSettings } = useBoletas();

const encryptionOptions = [
    { label: 'TLS', value: 'tls' },
    { label: 'SSL', value: 'ssl' },
    { label: 'Ninguna', value: null }
];

const form = ref({ host: '', port: 587, encryption: 'tls', username: '', password: '', from_address: '', from_name: '' });
const hasPassword = ref(false);
const errors = ref({});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

onMounted(async () => {
    try {
        const data = await fetchMailSettings();
        if (data) hydrate(data);
    } catch {
        // notificado por el composable
    }
});

const hydrate = (data) => {
    form.value = {
        host: data.host || '',
        port: data.port ?? 587,
        encryption: data.encryption ?? null,
        username: data.username || '',
        password: '', // nunca se precarga; vacío = conservar la guardada
        from_address: data.from_address || '',
        from_name: data.from_name || ''
    };
    hasPassword.value = !!data.has_password;
};

const validate = () => {
    errors.value = {};
    if (!form.value.host.trim()) errors.value.host = 'El host es obligatorio';
    if (!form.value.port || Number(form.value.port) <= 0) errors.value.port = 'Puerto no válido';
    if (!EMAIL_RE.test(form.value.from_address.trim())) errors.value.from_address = 'Correo remitente no válido';
    if (!form.value.from_name.trim()) errors.value.from_name = 'El nombre remitente es obligatorio';
    return Object.keys(errors.value).length === 0;
};

const handleSave = async () => {
    if (!validate()) return;
    const payload = {
        host: form.value.host.trim(),
        port: Number(form.value.port),
        encryption: form.value.encryption,
        username: form.value.username.trim(),
        from_address: form.value.from_address.trim(),
        from_name: form.value.from_name.trim()
    };
    // La contraseña solo se envía si se escribió una nueva; vacía => se conserva.
    if (form.value.password) payload.password = form.value.password;
    try {
        const updated = await saveMailSettings(payload);
        if (updated) hydrate(updated);
    } catch (error) {
        if (error?.status === 422 && error?.errors && typeof error.errors === 'object') {
            const mapped = {};
            Object.entries(error.errors).forEach(([field, msgs]) => {
                mapped[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
            });
            errors.value = { ...errors.value, ...mapped };
        }
    }
};

// ── Envío de prueba ──────────────────────────────────────────────────────────
const testEmail = ref('');
const testError = ref('');

const handleTest = async () => {
    testError.value = '';
    if (!EMAIL_RE.test(testEmail.value.trim())) {
        testError.value = 'Ingresa un correo válido para la prueba';
        return;
    }
    try {
        await testMailSettings({ to: testEmail.value.trim() });
    } catch {
        // el composable muestra el error SMTP concreto (422)
    }
};
</script>

<template>
    <div class="boletas-view">
        <div class="main-card">
            <div class="header-section">
                <div class="header-icon-wrapper"><i class="pi pi-cog"></i></div>
                <div class="header-content">
                    <h1 class="header-title">Configuración del correo emisor</h1>
                    <p class="header-subtitle"><i class="pi pi-info-circle mr-2"></i>Servidor SMTP y remitente usados para el envío masivo.</p>
                </div>
            </div>

            <div class="settings-grid">
                <div class="field">
                    <label class="field-label">Servidor SMTP (host) <span class="req">*</span></label>
                    <InputText v-model="form.host" class="w-full" :class="{ 'p-invalid': errors.host }" placeholder="smtp.empresa.com" @input="errors.host = ''" />
                    <small v-if="errors.host" class="p-error">{{ errors.host }}</small>
                </div>
                <div class="field">
                    <label class="field-label">Puerto <span class="req">*</span></label>
                    <InputText v-model="form.port" class="w-full" :class="{ 'p-invalid': errors.port }" inputmode="numeric" placeholder="587" @input="errors.port = ''" />
                    <small v-if="errors.port" class="p-error">{{ errors.port }}</small>
                </div>
                <div class="field">
                    <label class="field-label">Encriptación</label>
                    <Select v-model="form.encryption" :options="encryptionOptions" optionLabel="label" optionValue="value" class="w-full" placeholder="Seleccione" />
                </div>
                <div class="field">
                    <label class="field-label">Usuario</label>
                    <InputText v-model="form.username" class="w-full" placeholder="usuario@empresa.com" autocomplete="off" />
                </div>
                <div class="field">
                    <label class="field-label">Contraseña</label>
                    <Password v-model="form.password" class="w-full" inputClass="w-full" :feedback="false" toggleMask :placeholder="hasPassword ? '•••• sin cambios' : 'Ingresa la contraseña'" autocomplete="new-password" />
                    <small class="text-muted">Déjala vacía para conservar la contraseña actual.</small>
                </div>
                <div class="field">
                    <label class="field-label">Correo remitente <span class="req">*</span></label>
                    <InputText v-model="form.from_address" class="w-full" :class="{ 'p-invalid': errors.from_address }" placeholder="no-reply@empresa.com" @input="errors.from_address = ''" />
                    <small v-if="errors.from_address" class="p-error">{{ errors.from_address }}</small>
                </div>
                <div class="field">
                    <label class="field-label">Nombre remitente <span class="req">*</span></label>
                    <InputText v-model="form.from_name" class="w-full" :class="{ 'p-invalid': errors.from_name }" placeholder="Recursos Humanos" @input="errors.from_name = ''" />
                    <small v-if="errors.from_name" class="p-error">{{ errors.from_name }}</small>
                </div>
            </div>

            <div class="actions-row">
                <Button label="Guardar configuración" icon="pi pi-save" :loading="isSavingMailSettings" :disabled="isLoadingMailSettings" @click="handleSave" />
            </div>

            <!-- Envío de prueba -->
            <div class="test-block">
                <h3 class="block-title"><i class="pi pi-send mr-2"></i>Enviar correo de prueba</h3>
                <Message severity="info" :closable="false" class="mb-3">Usa la configuración <strong>guardada</strong>. Guarda primero si hiciste cambios.</Message>
                <div class="test-row">
                    <InputText v-model="testEmail" class="flex-1" :class="{ 'p-invalid': testError }" placeholder="correo-destino@empresa.com" @input="testError = ''" />
                    <Button label="Enviar prueba" icon="pi pi-paper-plane" :loading="isTestingMail" @click="handleTest" />
                </div>
                <small v-if="testError" class="p-error">{{ testError }}</small>
            </div>
        </div>
    </div>
</template>

<style scoped>
.boletas-view {
    padding: 1rem;
}
.main-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.header-section {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
}
.header-icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 60%, #000));
    box-shadow: 0 6px 16px color-mix(in srgb, var(--primary-color) 35%, transparent);
}
.header-icon-wrapper i {
    font-size: 1.75rem;
    color: #fff;
}
.header-content {
    flex: 1;
}
.header-title {
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0 0 0.25rem 0;
    color: var(--text-color);
}
.header-subtitle {
    color: var(--text-color-secondary);
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    margin: 0;
}
.settings-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
    margin-bottom: 1.5rem;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}
.field-label {
    font-weight: 600;
    color: var(--text-color);
}
.req {
    color: var(--red-500, #ef4444);
}
.actions-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1.5rem;
}
.test-block {
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 1.25rem;
    background: var(--surface-ground);
}
.block-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 0.75rem 0;
    color: var(--text-color);
}
.test-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
}
.text-muted {
    color: var(--text-color-secondary);
}
@media (max-width: 768px) {
    .settings-grid {
        grid-template-columns: 1fr;
    }
    .main-card {
        padding: 1rem;
    }
}
</style>
