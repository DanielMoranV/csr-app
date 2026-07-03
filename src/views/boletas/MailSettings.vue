<script setup>
import { useBoletas } from '@/composables/useBoletas';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import ToggleSwitch from 'primevue/toggleswitch';
import { useConfirm } from 'primevue/useconfirm';
import { onMounted, ref } from 'vue';

const { mailSettings, isLoadingMailSettings, isSavingMailSettings, isTestingMail, fetchMailSettings, createMailSetting, updateMailSetting, deleteMailSetting, setDefaultMailSetting, testMailSetting } = useBoletas();

const confirm = useConfirm();

const encryptionOptions = [
    { label: 'TLS', value: 'tls' },
    { label: 'SSL', value: 'ssl' },
    { label: 'Ninguna', value: null }
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

onMounted(async () => {
    try {
        await fetchMailSettings();
    } catch {
        // notificado por el composable
    }
});

// ── Diálogo crear/editar ──────────────────────────────────────────────────────
const dialogVisible = ref(false);
const editingId = ref(null); // null = crear
const hasPassword = ref(false);
const errors = ref({});

const emptyForm = () => ({
    label: '',
    host: '',
    port: 587,
    encryption: 'tls',
    username: '',
    password: '',
    from_address: '',
    from_name: '',
    is_default: false,
    is_active: true
});

const form = ref(emptyForm());

const openCreate = () => {
    editingId.value = null;
    hasPassword.value = false;
    errors.value = {};
    form.value = emptyForm();
    dialogVisible.value = true;
};

const openEdit = (account) => {
    editingId.value = account.id;
    hasPassword.value = !!account.has_password;
    errors.value = {};
    form.value = {
        label: account.label || '',
        host: account.host || '',
        port: account.port ?? 587,
        encryption: account.encryption ?? null,
        username: account.username || '',
        password: '', // nunca se precarga; vacío = conservar la guardada
        from_address: account.from_address || '',
        from_name: account.from_name || '',
        is_default: !!account.is_default,
        is_active: account.is_active !== false
    };
    dialogVisible.value = true;
};

const validate = () => {
    errors.value = {};
    if (!form.value.label.trim()) errors.value.label = 'La etiqueta es obligatoria';
    if (!form.value.host.trim()) errors.value.host = 'El host es obligatorio';
    if (!form.value.port || Number(form.value.port) <= 0 || Number(form.value.port) > 65535) errors.value.port = 'Puerto no válido';
    if (!EMAIL_RE.test(form.value.from_address.trim())) errors.value.from_address = 'Correo remitente no válido';
    if (!form.value.from_name.trim()) errors.value.from_name = 'El nombre remitente es obligatorio';
    // La contraseña solo es obligatoria al crear.
    if (editingId.value == null && !form.value.password) errors.value.password = 'La contraseña es obligatoria';
    return Object.keys(errors.value).length === 0;
};

const handleSave = async () => {
    if (!validate()) return;
    const payload = {
        label: form.value.label.trim(),
        host: form.value.host.trim(),
        port: Number(form.value.port),
        encryption: form.value.encryption,
        username: form.value.username.trim(),
        from_address: form.value.from_address.trim(),
        from_name: form.value.from_name.trim(),
        is_default: form.value.is_default,
        is_active: form.value.is_active
    };
    // La contraseña solo se envía si se escribió una nueva; vacía => se conserva.
    if (form.value.password) payload.password = form.value.password;
    try {
        if (editingId.value == null) {
            await createMailSetting(payload);
        } else {
            await updateMailSetting(editingId.value, payload);
        }
        dialogVisible.value = false;
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

// ── Marcar predeterminada ─────────────────────────────────────────────────────
const handleSetDefault = async (account) => {
    try {
        await setDefaultMailSetting(account.id);
    } catch {
        // notificado por el composable
    }
};

// ── Eliminar ──────────────────────────────────────────────────────────────────
const handleDelete = (account) => {
    confirm.require({
        message: `¿Eliminar la cuenta "${account.label}"? Esta acción no se puede deshacer.`,
        header: 'Eliminar cuenta',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await deleteMailSetting(account.id);
            } catch {
                // 422 (predeterminada o en uso): el composable muestra el motivo.
            }
        }
    });
};

// ── Envío de prueba ───────────────────────────────────────────────────────────
const testDialogVisible = ref(false);
const testAccount = ref(null);
const testEmail = ref('');
const testError = ref('');

const openTest = (account) => {
    testAccount.value = account;
    testEmail.value = '';
    testError.value = '';
    testDialogVisible.value = true;
};

const handleTest = async () => {
    testError.value = '';
    if (!EMAIL_RE.test(testEmail.value.trim())) {
        testError.value = 'Ingresa un correo válido para la prueba';
        return;
    }
    try {
        await testMailSetting(testAccount.value.id, { to: testEmail.value.trim() });
        testDialogVisible.value = false;
    } catch {
        // el composable muestra el error SMTP concreto (422)
    }
};

const encryptionLabel = (value) => encryptionOptions.find((o) => o.value === value)?.label || 'Ninguna';
</script>

<template>
    <div class="boletas-view">
        <div class="main-card">
            <div class="header-section">
                <div class="header-icon-wrapper"><i class="pi pi-cog"></i></div>
                <div class="header-content">
                    <h1 class="header-title">Cuentas de correo emisor</h1>
                    <p class="header-subtitle"><i class="pi pi-info-circle mr-2"></i>Servidores SMTP y remitentes disponibles para el envío masivo. Cada campaña puede elegir con cuál se envía.</p>
                </div>
                <div class="header-actions">
                    <Button label="Nueva cuenta" icon="pi pi-plus" @click="openCreate" />
                </div>
            </div>

            <DataTable :value="mailSettings" :loading="isLoadingMailSettings" responsiveLayout="scroll" stripedRows class="p-datatable-sm" dataKey="id" emptyMessage="Aún no hay cuentas de correo. Crea la primera con «Nueva cuenta».">
                <Column header="Cuenta" style="min-width: 220px">
                    <template #body="{ data }">
                        <div class="account-cell">
                            <span class="account-label">{{ data.label }}</span>
                            <span class="account-from">{{ data.from_name }} &lt;{{ data.from_address }}&gt;</span>
                        </div>
                    </template>
                </Column>
                <Column header="Servidor" style="min-width: 200px">
                    <template #body="{ data }">
                        <span class="mono">{{ data.host }}:{{ data.port }}</span>
                        <span class="text-muted"> · {{ encryptionLabel(data.encryption) }}</span>
                    </template>
                </Column>
                <Column header="Estado" style="min-width: 160px">
                    <template #body="{ data }">
                        <Tag v-if="data.is_default" value="Predeterminada" severity="success" icon="pi pi-star-fill" class="mr-1" />
                        <Tag v-if="!data.is_active" value="Deshabilitada" severity="warn" icon="pi pi-ban" />
                    </template>
                </Column>
                <Column header="" style="min-width: 190px">
                    <template #body="{ data }">
                        <div class="row-actions">
                            <Button icon="pi pi-pencil" text rounded size="small" v-tooltip.top="'Editar'" @click="openEdit(data)" />
                            <Button
                                icon="pi pi-star"
                                text
                                rounded
                                size="small"
                                severity="secondary"
                                :disabled="data.is_default || !data.is_active"
                                :loading="isSavingMailSettings"
                                v-tooltip.top="data.is_default ? 'Ya es la predeterminada' : !data.is_active ? 'Habilítala para poder marcarla' : 'Marcar predeterminada'"
                                @click="handleSetDefault(data)"
                            />
                            <Button icon="pi pi-paper-plane" text rounded size="small" v-tooltip.top="'Enviar prueba'" @click="openTest(data)" />
                            <Button icon="pi pi-trash" text rounded size="small" severity="danger" v-tooltip.top="'Eliminar'" @click="handleDelete(data)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Diálogo crear/editar cuenta -->
        <Dialog v-model:visible="dialogVisible" :header="editingId == null ? 'Nueva cuenta de correo' : 'Editar cuenta de correo'" :modal="true" class="w-full md:w-[640px]" :style="{ maxWidth: '95vw' }">
            <div class="settings-grid">
                <div class="field field-full">
                    <label class="field-label">Etiqueta <span class="req">*</span></label>
                    <InputText v-model="form.label" class="w-full" :class="{ 'p-invalid': errors.label }" placeholder="Gerencia, RRHH, Administración…" @input="errors.label = ''" />
                    <small v-if="errors.label" class="p-error">{{ errors.label }}</small>
                </div>
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
                    <label class="field-label">Contraseña <span v-if="editingId == null" class="req">*</span></label>
                    <Password
                        v-model="form.password"
                        class="w-full"
                        inputClass="w-full"
                        :class="{ 'p-invalid': errors.password }"
                        :feedback="false"
                        toggleMask
                        :placeholder="hasPassword ? '•••• sin cambios' : 'Ingresa la contraseña'"
                        autocomplete="new-password"
                        @input="errors.password = ''"
                    />
                    <small v-if="errors.password" class="p-error">{{ errors.password }}</small>
                    <small v-else-if="editingId != null" class="text-muted">Déjala vacía para conservar la contraseña actual.</small>
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
                <div class="field toggle-field">
                    <ToggleSwitch v-model="form.is_default" inputId="is_default" />
                    <label for="is_default" class="toggle-label">Marcar como predeterminada</label>
                </div>
                <div class="field toggle-field">
                    <ToggleSwitch v-model="form.is_active" inputId="is_active" />
                    <label for="is_active" class="toggle-label">Habilitada</label>
                </div>
            </div>
            <template #footer>
                <Button label="Cancelar" icon="pi pi-times" text @click="dialogVisible = false" />
                <Button :label="editingId == null ? 'Crear cuenta' : 'Guardar cambios'" icon="pi pi-save" :loading="isSavingMailSettings" @click="handleSave" />
            </template>
        </Dialog>

        <!-- Diálogo de envío de prueba -->
        <Dialog v-model:visible="testDialogVisible" header="Enviar correo de prueba" :modal="true" class="w-full md:w-[480px]" :style="{ maxWidth: '95vw' }">
            <Message severity="info" :closable="false" class="mb-3">
                Se enviará usando la cuenta <strong>{{ testAccount?.label }}</strong> ({{ testAccount?.from_address }}).
            </Message>
            <div class="field">
                <label class="field-label">Correo destino <span class="req">*</span></label>
                <InputText v-model="testEmail" class="w-full" :class="{ 'p-invalid': testError }" placeholder="correo-destino@empresa.com" @input="testError = ''" @keyup.enter="handleTest" />
                <small v-if="testError" class="p-error">{{ testError }}</small>
            </div>
            <template #footer>
                <Button label="Cancelar" icon="pi pi-times" text @click="testDialogVisible = false" />
                <Button label="Enviar prueba" icon="pi pi-paper-plane" :loading="isTestingMail" @click="handleTest" />
            </template>
        </Dialog>
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
    min-width: 200px;
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
.header-actions {
    margin-left: auto;
}
.account-cell {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}
.account-label {
    font-weight: 700;
    color: var(--text-color);
}
.account-from {
    font-size: 0.85rem;
    color: var(--text-color-secondary);
}
.row-actions {
    display: flex;
    gap: 0.15rem;
    flex-wrap: nowrap;
}
.settings-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}
.field-full {
    grid-column: 1 / -1;
}
.field-label {
    font-weight: 600;
    color: var(--text-color);
}
.req {
    color: var(--red-500, #ef4444);
}
.toggle-field {
    flex-direction: row;
    align-items: center;
    gap: 0.6rem;
}
.toggle-label {
    font-weight: 600;
    color: var(--text-color);
}
.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
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
    .header-actions {
        margin-left: 0;
    }
}
</style>
