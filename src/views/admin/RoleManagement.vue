<script setup>
import PermissionTree from '@/components/rbac/PermissionTree.vue';
import { useRbac } from '@/composables/useRbac';
import { useUsersStore } from '@/store/usersStore';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import ConfirmDialog from 'primevue/confirmdialog';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { computed, onMounted, ref, watch } from 'vue';

const { roles, permissionsCatalog, currentRole, isLoading, isLoadingPermissions, isSaving, isDeleting, fetchRoles, fetchPermissions, fetchRole, createRole, updateRole, deleteRole, syncRolePermissions, fetchUserRoles, syncUserRoles } = useRbac();
const usersStore = useUsersStore();
const confirm = useConfirm();

const activeTab = ref('0');

// ── Catálogo (carga perezosa) ─────────────────────────────────────────────
const catalogLoaded = ref(false);
const ensureCatalog = async () => {
    if (catalogLoaded.value) return;
    await fetchPermissions();
    catalogLoaded.value = true;
};

onMounted(async () => {
    await fetchRoles();
});

// ════════════════════════════════════════════════════════════════════════
//  PESTAÑA 1 — ROLES
// ════════════════════════════════════════════════════════════════════════
const roleDialogVisible = ref(false);
const isEditingRole = ref(false);
const editingRoleId = ref(null);
const roleForm = ref({ name: '', description: '' });
const roleErrors = ref({});

const resetRoleForm = () => {
    roleForm.value = { name: '', description: '' };
    roleErrors.value = {};
};

const openNewRole = () => {
    isEditingRole.value = false;
    editingRoleId.value = null;
    resetRoleForm();
    roleDialogVisible.value = true;
};

const openEditRole = (role) => {
    isEditingRole.value = true;
    editingRoleId.value = role.id;
    roleForm.value = { name: role.name || '', description: role.description || '' };
    roleErrors.value = {};
    roleDialogVisible.value = true;
};

const validateRoleForm = () => {
    roleErrors.value = {};
    if (!roleForm.value.name.trim()) {
        roleErrors.value.name = 'El nombre es obligatorio';
    }
    return Object.keys(roleErrors.value).length === 0;
};

const handleSaveRole = async () => {
    if (!validateRoleForm()) return;
    const payload = {
        name: roleForm.value.name.trim(),
        description: roleForm.value.description.trim() || null
    };
    try {
        if (isEditingRole.value) {
            await updateRole(editingRoleId.value, payload);
        } else {
            await createRole(payload);
        }
        roleDialogVisible.value = false;
        resetRoleForm();
    } catch {
        // El error ya fue notificado por el composable
    }
};

const canDeleteRole = (role) => !role.is_system && (role.users_count ?? 0) === 0;

const deleteReason = (role) => {
    if (role.is_system) return 'Es un rol de sistema y no puede eliminarse';
    if ((role.users_count ?? 0) > 0) return 'Tiene usuarios asignados';
    return 'Eliminar rol';
};

const confirmDeleteRole = (role) => {
    if (!canDeleteRole(role)) return;
    confirm.require({
        message: `¿Está seguro que desea eliminar el rol "${role.name}"?`,
        header: 'Confirmar eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await deleteRole(role.id);
            } catch {
                // Manejado en el composable (incluye 409)
            }
        }
    });
};

// Ir a la pestaña de permisos para un rol concreto
const goToPermissions = async (role) => {
    selectedRoleId.value = role.id;
    activeTab.value = '1';
};

// ════════════════════════════════════════════════════════════════════════
//  PESTAÑA 2 — PERMISOS POR ROL
// ════════════════════════════════════════════════════════════════════════
const selectedRoleId = ref(null);
const selectedPermissionIds = ref([]);

const roleOptions = computed(() => roles.value.map((r) => ({ label: r.name, value: r.id, is_system: r.is_system })));

const selectedRoleObject = computed(() => roles.value.find((r) => r.id === selectedRoleId.value) || currentRole.value);

// Al entrar a la pestaña de permisos, asegurar el catálogo
watch(activeTab, async (tab) => {
    if (tab === '1') await ensureCatalog();
});

// Al elegir/cambiar de rol, cargar sus permisos actuales
watch(selectedRoleId, async (id) => {
    if (!id) {
        selectedPermissionIds.value = [];
        return;
    }
    await ensureCatalog();
    const role = await fetchRole(id);
    selectedPermissionIds.value = (role?.permissions || []).map((p) => p.id);
});

const handleSavePermissions = async () => {
    if (!selectedRoleId.value) return;
    try {
        await syncRolePermissions(selectedRoleId.value, selectedPermissionIds.value);
    } catch {
        // Manejado en el composable
    }
};

// ════════════════════════════════════════════════════════════════════════
//  PESTAÑA 3 — ASIGNAR ROLES A USUARIOS
// ════════════════════════════════════════════════════════════════════════
const usersLoaded = ref(false);
const selectedUserId = ref(null);
const selectedUserRoleIds = ref([]);
const loadingUserRoles = ref(false);

const userOptions = computed(() =>
    usersStore.allUsers.map((u) => ({
        label: u.position ? `${u.name} — ${u.position}` : u.name,
        value: u.id
    }))
);

const ensureUsers = async () => {
    if (usersLoaded.value) return;
    try {
        await usersStore.fetchUsers();
        usersLoaded.value = true;
    } catch {
        // Si falta el permiso users.view el listado quedará vacío
    }
};

watch(activeTab, async (tab) => {
    if (tab === '2') await ensureUsers();
});

watch(selectedUserId, async (userId) => {
    if (!userId) {
        selectedUserRoleIds.value = [];
        return;
    }
    loadingUserRoles.value = true;
    try {
        const userRoles = await fetchUserRoles(userId);
        selectedUserRoleIds.value = (userRoles || []).map((r) => r.id);
    } catch {
        selectedUserRoleIds.value = [];
    } finally {
        loadingUserRoles.value = false;
    }
});

const handleSaveUserRoles = async () => {
    if (!selectedUserId.value) return;
    try {
        const updated = await syncUserRoles(selectedUserId.value, selectedUserRoleIds.value);
        // Reflejar el resultado devuelto por el backend
        selectedUserRoleIds.value = (updated || []).map((r) => r.id);
    } catch {
        // Manejado en el composable
    }
};
</script>

<template>
    <div class="rbac-view">
        <div class="main-card">
            <!-- Encabezado -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-shield"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Roles y Permisos</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-lock mr-2"></i>
                        Administración de control de acceso (RBAC)
                    </p>
                </div>
            </div>

            <Tabs v-model:value="activeTab">
                <TabList>
                    <Tab value="0"><i class="pi pi-id-card mr-2"></i>Roles</Tab>
                    <Tab value="1"><i class="pi pi-key mr-2"></i>Permisos por rol</Tab>
                    <Tab value="2"><i class="pi pi-users mr-2"></i>Asignar roles a usuarios</Tab>
                </TabList>

                <TabPanels>
                    <!-- ───── PESTAÑA 1: ROLES ───── -->
                    <TabPanel value="0">
                        <div class="tab-toolbar">
                            <span class="tab-count">{{ roles.length }} {{ roles.length === 1 ? 'rol' : 'roles' }}</span>
                            <Button label="Nuevo rol" icon="pi pi-plus" @click="openNewRole" />
                        </div>

                        <DataTable :value="roles" :loading="isLoading" :rows="25" :paginator="roles.length > 25" :rowsPerPageOptions="[10, 25, 50]" responsiveLayout="scroll" emptyMessage="No se encontraron roles" stripedRows class="p-datatable-sm">
                            <Column field="name" header="Rol" :sortable="true" style="min-width: 220px">
                                <template #body="{ data }">
                                    <div class="flex items-center gap-2">
                                        <span class="font-semibold">{{ data.name }}</span>
                                        <Tag v-if="data.is_system" value="Sistema" severity="warn" v-tooltip.top="'Rol de sistema: no se puede eliminar'" />
                                    </div>
                                </template>
                            </Column>

                            <Column field="description" header="Descripción" style="min-width: 280px">
                                <template #body="{ data }">
                                    <span v-if="data.description" class="text-muted">{{ data.description }}</span>
                                    <span v-else class="text-muted italic">Sin descripción</span>
                                </template>
                            </Column>

                            <Column header="Permisos" style="min-width: 110px">
                                <template #body="{ data }">
                                    <Tag :value="data.permissions_count ?? 0" severity="info" />
                                </template>
                            </Column>

                            <Column header="Usuarios" style="min-width: 110px">
                                <template #body="{ data }">
                                    <Tag :value="data.users_count ?? 0" :severity="(data.users_count ?? 0) > 0 ? 'success' : 'secondary'" />
                                </template>
                            </Column>

                            <Column header="Acciones" style="min-width: 160px">
                                <template #body="{ data }">
                                    <div class="flex gap-1">
                                        <Button icon="pi pi-key" size="small" rounded severity="info" outlined v-tooltip.top="'Gestionar permisos'" @click="goToPermissions(data)" />
                                        <Button icon="pi pi-pencil" size="small" rounded severity="success" outlined v-tooltip.top="'Editar'" @click="openEditRole(data)" />
                                        <Button icon="pi pi-trash" size="small" rounded severity="danger" outlined :disabled="!canDeleteRole(data)" v-tooltip.top="deleteReason(data)" :loading="isDeleting" @click="confirmDeleteRole(data)" />
                                    </div>
                                </template>
                            </Column>
                        </DataTable>
                    </TabPanel>

                    <!-- ───── PESTAÑA 2: PERMISOS POR ROL ───── -->
                    <TabPanel value="1">
                        <div class="tab-toolbar">
                            <div class="flex items-center gap-3 flex-wrap">
                                <label class="font-semibold">Rol:</label>
                                <Select v-model="selectedRoleId" :options="roleOptions" optionLabel="label" optionValue="value" placeholder="Seleccione un rol" filter class="w-72" />
                                <Tag v-if="selectedRoleObject?.is_system" value="Sistema" severity="warn" v-tooltip.top="'Rol de sistema: editable pero no eliminable'" />
                            </div>
                            <Button label="Guardar permisos" icon="pi pi-save" :loading="isSaving" :disabled="!selectedRoleId" @click="handleSavePermissions" />
                        </div>

                        <Message v-if="!selectedRoleId" severity="info" :closable="false" class="mb-3"> Seleccione un rol para ver y editar sus permisos. </Message>

                        <div v-else>
                            <div v-if="isLoadingPermissions || isLoading" class="loading-state">
                                <i class="pi pi-spin pi-spinner"></i>
                                <span>Cargando permisos...</span>
                            </div>
                            <PermissionTree v-else v-model="selectedPermissionIds" :catalog="permissionsCatalog" />
                        </div>
                    </TabPanel>

                    <!-- ───── PESTAÑA 3: ASIGNAR ROLES A USUARIOS ───── -->
                    <TabPanel value="2">
                        <div class="tab-toolbar">
                            <div class="flex items-center gap-3 flex-wrap">
                                <label class="font-semibold">Usuario:</label>
                                <Select v-model="selectedUserId" :options="userOptions" optionLabel="label" optionValue="value" placeholder="Seleccione un usuario" filter :loading="usersStore.state.isLoading" class="w-80" />
                            </div>
                            <Button label="Guardar roles" icon="pi pi-save" :loading="isSaving" :disabled="!selectedUserId" @click="handleSaveUserRoles" />
                        </div>

                        <Message v-if="!selectedUserId" severity="info" :closable="false" class="mb-3"> Seleccione un usuario para asignar o quitar roles. </Message>

                        <div v-else>
                            <div v-if="loadingUserRoles" class="loading-state">
                                <i class="pi pi-spin pi-spinner"></i>
                                <span>Cargando roles del usuario...</span>
                            </div>
                            <div v-else class="roles-grid">
                                <div v-for="role in roles" :key="role.id" class="role-item">
                                    <Checkbox :inputId="`role-${role.id}`" v-model="selectedUserRoleIds" :value="role.id" />
                                    <label :for="`role-${role.id}`" class="role-label">
                                        <span class="role-name">
                                            {{ role.name }}
                                            <Tag v-if="role.is_system" value="Sistema" severity="warn" class="ml-1" />
                                        </span>
                                        <span v-if="role.description" class="role-description">{{ role.description }}</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </div>

        <!-- Diálogo crear/editar rol -->
        <Dialog v-model:visible="roleDialogVisible" :header="isEditingRole ? 'Editar rol' : 'Nuevo rol'" :modal="true" :closable="!isSaving" class="w-full md:w-[560px]">
            <div class="flex flex-col gap-5 py-3">
                <div class="field">
                    <label for="role-name" class="font-semibold mb-2 block">Nombre <span class="text-red-500">*</span></label>
                    <InputText id="role-name" v-model="roleForm.name" placeholder="Ej: Supervisor" class="w-full" :class="{ 'p-invalid': roleErrors.name }" :disabled="isSaving" @input="roleErrors.name = ''" />
                    <small v-if="roleErrors.name" class="p-error">{{ roleErrors.name }}</small>
                </div>
                <div class="field">
                    <label for="role-description" class="font-semibold mb-2 block">Descripción</label>
                    <Textarea id="role-description" v-model="roleForm.description" rows="3" placeholder="Descripción del rol (opcional)" class="w-full" :disabled="isSaving" />
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="Cancelar" severity="secondary" :disabled="isSaving" @click="roleDialogVisible = false" />
                    <Button :label="isEditingRole ? 'Actualizar' : 'Guardar'" :loading="isSaving" @click="handleSaveRole" />
                </div>
            </template>
        </Dialog>

        <ConfirmDialog />
    </div>
</template>

<style scoped>
.rbac-view {
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

.tab-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin: 1rem 0 1.25rem 0;
}

.tab-count {
    font-weight: 600;
    color: var(--text-color-secondary);
}

.loading-state {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
    color: var(--text-color-secondary);
}

.loading-state i {
    font-size: 1.5rem;
}

.field {
    display: flex;
    flex-direction: column;
}

.text-muted {
    color: var(--text-color-secondary);
}

.roles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
}

.role-item {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.875rem;
    border: 1px solid var(--surface-border);
    border-radius: 10px;
    background: var(--surface-ground);
}

.role-label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    cursor: pointer;
}

.role-name {
    font-weight: 600;
    color: var(--text-color);
    display: flex;
    align-items: center;
}

.role-description {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}

@media (max-width: 768px) {
    .rbac-view {
        padding: 0.5rem;
    }
    .main-card {
        padding: 1rem;
    }
    .header-title {
        font-size: 1.3rem;
    }
}
</style>
