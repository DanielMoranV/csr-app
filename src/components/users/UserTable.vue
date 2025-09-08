<script setup>
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import SplitButton from 'primevue/splitbutton';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const props = defineProps({
    users: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    emptyMessage: {
        type: String,
        default: 'No se encontraron usuarios con los filtros aplicados'
    },
    rowsPerPage: {
        type: Number,
        default: 25
    }
});

const emit = defineEmits(['view-user', 'edit-user', 'create-user', 'delete-user', 'toggle-status', 'reset-password', 'refresh', 'row-select', 'row-unselect']);

const toast = useToast();

// Campos para filtro global
const globalFilterFields = ['name', 'dni', 'email', 'nick', 'position', 'phone'];

// Métodos de utilidad
const getInitials = (name) => {
    return name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
};

const getAvatarColor = (name) => {
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#EC4899', '#14B8A6', '#F87171'];

    const hash = name.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hash) % colors.length];
};

const formatPositionLabel = (position) => {
    const labels = {
        ADMINISTRACION: 'Administración',
        ADMISION: 'Admisión',
        'ARCHIVO HISTORIAS': 'Archivo Historias',
        CONSULTORIOS: 'Consultorios',
        CONTABILIDAD: 'Contabilidad',
        'DIRECTOR MEDICO': 'Director Médico',
        EMERGENCIA: 'Emergencia',
        FACTURACION: 'Facturación',
        FARMACIA: 'Farmacia',
        HOSPITALIZACION: 'Hospitalización',
        LABORATORIO: 'Laboratorio',
        LOGISTICA: 'Logística',
        MEDICOS: 'Médicos',
        QUIROFANO: 'Quirófano',
        'RAYOS X': 'Rayos X',
        RRHH: 'RRHH',
        SISTEMAS: 'Sistemas'
    };
    return labels[position] || position;
};

const getPositionSeverity = (position) => {
    const severityMap = {
        SISTEMAS: 'info',
        'DIRECTOR MEDICO': 'success',
        ADMINISTRACION: 'warning',
        RRHH: 'warning',
        MEDICOS: 'success',
        EMERGENCIA: 'danger',
        FARMACIA: 'info',
        LABORATORIO: 'success',
        'RAYOS X': 'info'
    };
    return severityMap[position] || 'secondary';
};

const getPositionIcon = (position) => {
    const iconMap = {
        SISTEMAS: 'pi pi-cog',
        'DIRECTOR MEDICO': 'pi pi-user-md',
        ADMINISTRACION: 'pi pi-briefcase',
        RRHH: 'pi pi-users',
        MEDICOS: 'pi pi-heartbeat',
        EMERGENCIA: 'pi pi-exclamation-triangle',
        FARMACIA: 'pi pi-medkit',
        LABORATORIO: 'pi pi-flask',
        'RAYOS X': 'pi pi-camera',
        ADMISION: 'pi pi-sign-in',
        CONTABILIDAD: 'pi pi-calculator',
        CONSULTORIOS: 'pi pi-home',
        HOSPITALIZACION: 'pi pi-building',
        QUIROFANO: 'pi pi-cog',
        'ARCHIVO HISTORIAS': 'pi pi-folder'
    };
    return iconMap[position] || 'pi pi-user';
};

const formatPhone = (phone) => {
    // Formatear teléfono peruano: 987654321 -> 987 654 321
    return phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
    if (days < 365) return `Hace ${Math.floor(days / 30)} meses`;
    return `Hace ${Math.floor(days / 365)} años`;
};

const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        toast.add({
            severity: 'success',
            summary: '✅ Copiado exitosamente',
            detail: `${text} copiado al portapapeles`,
            life: 2500
        });

        // Feedback visual adicional
        const button = event?.target?.closest('button');
        if (button) {
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 150);
        }
    } catch (error) {
        // Fallback para navegadores que no soportan clipboard API
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            toast.add({
                severity: 'success',
                summary: '✅ Copiado exitosamente',
                detail: `${text} copiado al portapapeles`,
                life: 2500
            });
        } catch (fallbackError) {
            toast.add({
                severity: 'error',
                summary: '❌ Error al copiar',
                detail: 'No se pudo copiar al portapapeles. Intente seleccionar y copiar manualmente.',
                life: 4000
            });
        }
    }
};

const callUser = (phone) => {
    // Verificar si el dispositivo soporta llamadas
    if (navigator.userAgent.includes('Mobile') || navigator.userAgent.includes('Tablet')) {
        window.open(`tel:+51${phone}`, '_self');

        toast.add({
            severity: 'info',
            summary: '📞 Iniciando llamada',
            detail: `Llamando a +51 ${formatPhone(phone)}`,
            life: 3000
        });
    } else {
        // En desktop, mostrar información de contacto
        toast.add({
            severity: 'info',
            summary: '📋 Número de contacto',
            detail: `Contacte al: +51 ${formatPhone(phone)}`,
            life: 4000
        });

        // Copiar número al portapapeles automáticamente
        copyToClipboard(`+51${phone}`);
    }
};

const onImageError = (event) => {
    event.target.style.display = 'none';
    event.target.nextElementSibling.style.display = 'flex';
};

// Estados reactivos para mejorar UX
const selectedUser = ref(null);
const isActionsVisible = ref({});

// Gestión de selección con feedback mejorado
const onRowSelect = (event) => {
    selectedUser.value = event.data;
    emit('row-select', event.data);

    // Feedback visual sutil
    toast.add({
        severity: 'info',
        summary: '👤 Personal seleccionado',
        detail: `${event.data.name} - ${formatPositionLabel(event.data.position)}`,
        life: 2000
    });
};

const onRowUnselect = (event) => {
    selectedUser.value = null;
    emit('row-unselect', event.data);
};

// Funciones de acción mejoradas con accesibilidad
const handleViewUser = (userData) => {
    emit('view-user', userData);

    // Anuncio para lectores de pantalla
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Abriendo perfil médico de ${userData.name}, ${formatPositionLabel(userData.position)}`;
    document.body.appendChild(announcement);

    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);

    toast.add({
        severity: 'info',
        summary: '👁️ Visualizando perfil',
        detail: `Abriendo perfil de ${userData.name}`,
        life: 2000
    });
};

const handleEditUser = (userData) => {
    emit('edit-user', userData);
    toast.add({
        severity: 'info',
        summary: '✏️ Editando información',
        detail: `Editando datos de ${userData.name}`,
        life: 2000
    });
};

const handleResetPassword = (userData) => {
    emit('reset-password', userData);
};

const handleToggleStatus = (userData) => {
    emit('toggle-status', userData);
};

const handleDeleteUser = (userData) => {
    emit('delete-user', userData);
};

// Generar items del menú de acciones
const getActionItems = (userData) => {
    return [
        {
            label: 'Editar información',
            icon: 'pi pi-pencil',
            command: () => handleEditUser(userData)
        },
        {
            label: 'Resetear contraseña',
            icon: 'pi pi-key',
            command: () => handleResetPassword(userData)
        },
        {
            separator: true
        },
        {
            label: userData.is_active ? 'Desactivar personal' : 'Activar personal',
            icon: userData.is_active ? 'pi pi-user-minus' : 'pi pi-user-plus',
            command: () => handleToggleStatus(userData),
            class: userData.is_active ? 'text-warning-600' : 'text-success-600'
        },
        {
            separator: true
        },
        {
            label: 'Eliminar registro',
            icon: 'pi pi-trash',
            command: () => handleDeleteUser(userData),
            class: 'text-danger-600'
        }
    ];
};

// Efectos de inicialización
onMounted(() => {
    // Inicializar estados de visibilidad
    if (props.users.length > 0) {
        props.users.forEach((user) => {
            isActionsVisible.value[user.id] = false;
        });
    }
});
</script>

<template>
    <div class="medical-table-container px-4">
        <!-- Header de la tabla con diseño médico -->
        <div class="medical-table-header">
            <div class="header-left">
                <div class="title-section">
                    <i class="pi pi-users medical-icon"></i>
                    <div class="title-content">
                        <h4 class="main-title">Personal Clínico</h4>
                        <span class="subtitle">Gestión del personal sanitario</span>
                    </div>
                </div>
                <Badge :value="users.length" severity="info" class="user-count-badge" />
            </div>
            <div class="header-actions">
                <Button icon="pi pi-refresh" @click="$emit('refresh')" v-tooltip.top="'Actualizar lista'" :loading="loading" severity="secondary" size="small" outlined />
                <Button label="Nuevo Personal" icon="pi pi-plus" @click="$emit('create-user')" severity="success" />
            </div>
        </div>

        <!-- DataTable con diseño médico -->
        <DataTable
            :value="users"
            :loading="loading"
            responsiveLayout="scroll"
            :resizableColumns="true"
            columnResizeMode="expand"
            :reorderableColumns="true"
            :globalFilterFields="globalFilterFields"
            :sortMode="'multiple'"
            :removableSort="true"
            selectionMode="single"
            @rowSelect="onRowSelect"
            @rowUnselect="onRowUnselect"
            class="medical-datatable"
            :pt="{
                header: { class: 'medical-table-head' },
                bodyrow: { class: 'medical-table-row' }
            }"
            :paginator="true"
            :rows="rowsPerPage"
            :rowsPerPageOptions="[10, 25, 50, 100]"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            currentPageReportTemplate="{first} - {last} de {totalRecords} miembros del personal"
            :alwaysShowPaginator="false"
            stripedRows
            scrollable
            scrollHeight="500px"
        >
            <!-- Empty state con diseño médico -->
            <template #empty>
                <div class="medical-empty-state">
                    <div class="empty-icon-container">
                        <i class="pi pi-user-plus empty-icon"></i>
                    </div>
                    <div class="empty-title">No hay personal registrado</div>
                    <div class="empty-subtitle">
                        {{ emptyMessage || 'Comience agregando miembros del personal clínico' }}
                    </div>
                    <Button label="Agregar Personal" icon="pi pi-plus" class="empty-action-button" @click="$emit('create-user')" severity="success" />
                </div>
            </template>

            <!-- Loading template médico -->
            <template #loading>
                <div class="medical-loading-state">
                    <div class="loading-spinner">
                        <i class="pi pi-spin pi-spinner"></i>
                    </div>
                    <div class="loading-text">Cargando personal médico...</div>
                </div>
            </template>

            <!-- Personal médico con avatar -->
            <Column field="name" header="Personal Médico" :sortable="true" style="min-width: 260px">
                <template #body="{ data }">
                    <div class="medical-user-cell">
                        <!-- Avatar médico -->
                        <div class="medical-avatar-container">
                            <img v-if="data.url_photo_profile" :src="data.url_photo_profile" :alt="data.name" class="medical-avatar" @error="onImageError" />
                            <div v-else class="medical-avatar-fallback" :style="{ backgroundColor: getAvatarColor(data.name) }">
                                {{ getInitials(data.name) }}
                            </div>
                            <!-- Indicador de estado médico -->
                            <div
                                class="medical-status-indicator"
                                :class="{
                                    'status-active': data.is_active,
                                    'status-inactive': !data.is_active
                                }"
                                v-tooltip.top="data.is_active ? 'Personal activo' : 'Personal inactivo'"
                                :aria-label="data.is_active ? 'Personal activo en servicio' : 'Personal inactivo temporalmente'"
                                role="img"
                            >
                                <i :class="data.is_active ? 'pi pi-check' : 'pi pi-times'" :aria-hidden="true"></i>
                                <span class="sr-only">{{ data.is_active ? 'Activo' : 'Inactivo' }}</span>
                            </div>
                        </div>

                        <div class="medical-user-info">
                            <div class="user-name">{{ data.name }}</div>
                            <div class="user-nick">
                                <i class="pi pi-id-card nick-icon"></i>
                                <span>{{ data.nick }}</span>
                            </div>
                        </div>
                    </div>
                </template>
            </Column>

            <!-- DNI con diseño médico -->
            <Column field="dni" header="DNI" :sortable="true" style="min-width: 110px">
                <template #body="{ data }">
                    <div class="medical-dni">
                        <i class="pi pi-id-card dni-icon"></i>
                        <span class="dni-number">{{ data.dni }}</span>
                    </div>
                </template>
            </Column>

            <!-- Email con diseño médico -->
            <Column field="email" header="Correo Electrónico" :sortable="true" style="min-width: 220px">
                <template #body="{ data }">
                    <div class="medical-email-cell">
                        <div class="email-content">
                            <i class="pi pi-envelope email-icon"></i>
                            <a :href="`mailto:${data.email}`" class="email-link">
                                {{ data.email }}
                            </a>
                        </div>
                        <Button
                            icon="pi pi-copy"
                            class="medical-action-btn copy-btn"
                            @click="
                                (event) => {
                                    event.preventDefault();
                                    copyToClipboard(data.email);
                                }
                            "
                            v-tooltip.top="'Copiar email'"
                            size="small"
                            text
                            rounded
                        />
                    </div>
                </template>
            </Column>

            <!-- Especialidad médica -->
            <Column field="position" header="Especialidad" :sortable="true" style="min-width: 180px">
                <template #body="{ data }">
                    <Tag :value="formatPositionLabel(data.position)" :severity="getPositionSeverity(data.position)" :icon="getPositionIcon(data.position)" class="medical-specialty-tag" rounded />
                </template>
            </Column>

            <!-- Contacto telefónico -->
            <Column field="phone" header="Contacto" style="min-width: 150px">
                <template #body="{ data }">
                    <div v-if="data.phone" class="medical-phone-cell">
                        <div class="phone-content">
                            <i class="pi pi-phone phone-icon"></i>
                            <a :href="`tel:+51${data.phone}`" class="phone-link"> +51 {{ formatPhone(data.phone) }} </a>
                        </div>
                        <Button icon="pi pi-phone" class="medical-action-btn call-btn" @click="callUser(data.phone)" v-tooltip.top="'Llamar'" size="small" severity="success" text rounded />
                    </div>
                    <div v-else class="no-phone">
                        <i class="pi pi-phone-slash"></i>
                        <span>Sin contacto</span>
                    </div>
                </template>
            </Column>

            <!-- Estado laboral -->
            <Column field="is_active" header="Estado" :sortable="true" style="min-width: 110px">
                <template #body="{ data }">
                    <Tag :value="data.is_active ? 'Activo' : 'Inactivo'" :severity="data.is_active ? 'success' : 'danger'" :icon="data.is_active ? 'pi pi-check-circle' : 'pi pi-times-circle'" class="medical-status-tag" rounded />
                </template>
            </Column>

            <!-- Fecha de ingreso -->
            <Column field="created_at" header="Ingreso" :sortable="true" style="min-width: 130px">
                <template #body="{ data }">
                    <div class="medical-date-cell">
                        <div class="date-main">
                            <i class="pi pi-calendar date-icon"></i>
                            <span>{{ formatDate(data.created_at) }}</span>
                        </div>
                        <div class="date-relative">{{ getTimeAgo(data.created_at) }}</div>
                    </div>
                </template>
            </Column>

            <!-- Acciones médicas optimizadas -->
            <Column header="Acciones" :exportable="false" style="min-width: 120px">
                <template #body="{ data }">
                    <div class="medical-actions-compact" role="group" :aria-label="`Acciones para ${data.name}`">
                        <!-- Menú principal de acciones -->
                        <SplitButton :label="''" icon="pi pi-ellipsis-v" @click="handleViewUser(data)" :model="getActionItems(data)" class="medical-split-button" size="small" severity="secondary" v-tooltip.top="'Ver perfil'" />

                        <!-- Toggle de estado rápido -->
                        <Button
                            :icon="data.is_active ? 'pi pi-pause' : 'pi pi-play'"
                            @click="handleToggleStatus(data)"
                            :class="['medical-toggle-btn', data.is_active ? 'active-toggle' : 'inactive-toggle']"
                            :severity="data.is_active ? 'success' : 'secondary'"
                            size="small"
                            text
                            rounded
                            v-tooltip.top="data.is_active ? 'Pausar usuario' : 'Activar usuario'"
                        />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<style scoped>
/* Contenedor principal con tema médico */
.medical-table-container {
    background: var(--surface-card);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: all 0.3s ease;
}

/* Header médico */
.medical-table-header {
    background: linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%);
    border-bottom: 2px solid var(--primary-200);
    padding: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    min-width: 0;
}

.title-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.medical-icon {
    font-size: 2rem;
    color: var(--primary-600);
    background: var(--surface-card);
    padding: 0.75rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.title-content .main-title {
    margin: 0;
    color: var(--primary-700);
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
}

.title-content .subtitle {
    color: var(--primary-600);
    font-size: 0.9rem;
    font-weight: 500;
    opacity: 0.9;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.action-button {
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.2s ease;
}

.refresh-button {
    border: 2px solid var(--primary-300);
    color: var(--primary-600);
}

.refresh-button:hover {
    background: var(--primary-50);
    border-color: var(--primary-400);
}

.primary-button {
    background: linear-gradient(135deg, var(--green-500), var(--green-600));
    border: none;
    color: white;
    padding: 0.75rem 1.25rem;
    font-weight: 600;
}

.primary-button:hover {
    background: linear-gradient(135deg, var(--green-600), var(--green-700));
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

/* DataTable médico */
.medical-datatable {
    border: none;
    background: transparent;
}

:deep(.medical-datatable .p-datatable-header) {
    background: var(--surface-ground);
    border-bottom: 1px solid var(--surface-border);
    padding: 0;
}

:deep(.medical-datatable .p-datatable-thead > tr > th) {
    background: var(--surface-100);
    color: var(--text-color);
    font-weight: 700;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 1.25rem 1rem;
    border-bottom: 2px solid var(--primary-200);
    position: relative;
}

:deep(.medical-datatable .p-datatable-thead > tr > th:first-child) {
    border-left: none;
}

:deep(.medical-datatable .p-datatable-tbody > tr > td) {
    padding: 1rem;
    border-bottom: 1px solid var(--surface-border);
    vertical-align: middle;
    transition: background-color 0.2s ease;
}

:deep(.medical-datatable .p-datatable-tbody > tr) {
    transition: all 0.2s ease;
}

:deep(.medical-datatable .p-datatable-tbody > tr:hover) {
    background: var(--primary-50) !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

:deep(.medical-datatable .p-datatable-striped .p-datatable-tbody > tr:nth-child(odd)) {
    background: var(--surface-50);
}

/* Celdas específicas */
.medical-user-cell {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.medical-avatar-container {
    position: relative;
    flex-shrink: 0;
}

.medical-avatar {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid var(--surface-border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;
}

.medical-avatar:hover {
    transform: scale(1.05);
}

.medical-avatar-fallback {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 1.1rem;
    border: 3px solid var(--surface-border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.medical-status-indicator {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    border: 2px solid var(--surface-card);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
}

.medical-status-indicator.status-active {
    background: var(--green-500);
    color: white;
}

.medical-status-indicator.status-inactive {
    background: var(--red-500);
    color: white;
}

.medical-user-info {
    flex: 1;
    min-width: 0;
}

.user-name {
    font-weight: 700;
    color: var(--text-color);
    font-size: 1rem;
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-nick {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color-secondary);
    font-size: 0.875rem;
    font-weight: 500;
}

.nick-icon {
    font-size: 0.75rem;
    opacity: 0.7;
}

/* DNI médico */
.medical-dni {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'JetBrains Mono', 'Monaco', monospace;
    font-weight: 600;
    color: var(--text-color);
    background: var(--surface-100);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: 1px solid var(--surface-border);
}

.dni-icon {
    color: var(--primary-600);
    font-size: 0.875rem;
}

.dni-number {
    font-size: 0.9rem;
    letter-spacing: 0.5px;
}

/* Email médico */
.medical-email-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.email-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
}

.email-icon {
    color: var(--primary-600);
    font-size: 0.875rem;
    flex-shrink: 0;
}

.email-link {
    color: var(--primary-600);
    text-decoration: none;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.2s ease;
}

.email-link:hover {
    color: var(--primary-700);
    text-decoration: underline;
}

/* Teléfono médico */
.medical-phone-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.phone-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.phone-icon {
    color: var(--green-600);
    font-size: 0.875rem;
}

.phone-link {
    color: var(--text-color);
    text-decoration: none;
    font-weight: 500;
    font-family: 'JetBrains Mono', 'Monaco', monospace;
    transition: color 0.2s ease;
}

.phone-link:hover {
    color: var(--green-600);
}

.no-phone {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color-secondary);
    font-style: italic;
    opacity: 0.7;
}

/* Fecha médica */
.medical-date-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.date-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--text-color);
    font-size: 0.9rem;
}

.date-icon {
    color: var(--primary-600);
    font-size: 0.8rem;
}

.date-relative {
    color: var(--text-color-secondary);
    font-size: 0.8rem;
    font-weight: 500;
    opacity: 0.8;
}

/* Tags médicos */
.medical-specialty-tag {
    font-weight: 600;
    font-size: 0.85rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    background: linear-gradient(135deg, var(--primary-100), var(--primary-200));
    border: 1px solid var(--primary-300);
    color: var(--primary-700);
}

.medical-status-tag {
    font-weight: 600;
    font-size: 0.85rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
}

/* Acciones médicas compactas */
.medical-actions-compact {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-start;
    min-width: 120px;
    flex-wrap: nowrap;
}

.medical-split-button {
    flex: 1;
}

.medical-split-button :deep(.p-splitbutton-defaultbutton) {
    border-radius: 8px 0 0 8px;
    padding: 0.5rem 0.75rem;
    min-width: 2.5rem;
}

.medical-split-button :deep(.p-splitbutton-menubutton) {
    border-radius: 0 8px 8px 0;
    padding: 0.5rem;
    min-width: 2rem;
}

.medical-toggle-btn {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.medical-toggle-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.medical-toggle-btn.active-toggle {
    background: rgba(34, 197, 94, 0.1);
    color: var(--green-600);
    border-color: var(--green-300);
}

.medical-toggle-btn.inactive-toggle {
    background: rgba(107, 114, 128, 0.1);
    color: var(--gray-600);
    border-color: var(--gray-300);
}

.copy-btn:hover,
.call-btn:hover {
    background: var(--surface-100);
}

/* Estilos para el menú de acciones */
.medical-split-button :deep(.p-menu) {
    min-width: 200px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--surface-border);
}

.medical-split-button :deep(.p-menu .p-menuitem-link) {
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin: 0.125rem;
    transition: all 0.2s ease;
}

.medical-split-button :deep(.p-menu .p-menuitem-link:hover) {
    background: var(--primary-50);
    color: var(--primary-600);
}

.medical-split-button :deep(.p-menu .p-menuitem-icon) {
    margin-right: 0.75rem;
    font-size: 0.875rem;
}

.medical-split-button :deep(.p-menu .p-menuitem-text) {
    font-weight: 500;
    font-size: 0.875rem;
}

.medical-split-button :deep(.p-menu .p-menuitem-separator) {
    margin: 0.25rem 0;
    border-color: var(--surface-border);
}

/* Estados vacíos y carga */
.medical-empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
}

.empty-icon-container {
    margin-bottom: 2rem;
}

.empty-icon {
    font-size: 4rem;
    color: var(--primary-400);
    opacity: 0.6;
}

.empty-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 0.75rem;
}

.empty-subtitle {
    color: var(--text-color-secondary);
    font-size: 1rem;
    margin-bottom: 2rem;
    line-height: 1.5;
}

.empty-action-button {
    padding: 0.875rem 2rem;
    border-radius: 25px;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
}

.empty-action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
}

.medical-loading-state {
    text-align: center;
    padding: 3rem 2rem;
}

.loading-spinner {
    margin-bottom: 1rem;
}

.loading-spinner i {
    font-size: 2.5rem;
    color: var(--primary-500);
}

.loading-text {
    color: var(--primary-600);
    font-weight: 600;
    font-size: 1.1rem;
}

/* Paginación médica */
:deep(.p-paginator) {
    background: var(--surface-100);
    border-top: 2px solid var(--primary-200);
    border-radius: 0 0 12px 12px;
    padding: 1.25rem;
}

:deep(.p-paginator .p-paginator-pages .p-paginator-page) {
    border-radius: 8px;
    min-width: 2.75rem;
    height: 2.75rem;
    margin: 0 0.125rem;
    font-weight: 600;
    transition: all 0.2s ease;
}

:deep(.p-paginator .p-paginator-pages .p-paginator-page:hover) {
    background: var(--primary-100);
    color: var(--primary-700);
    transform: translateY(-1px);
}

:deep(.p-paginator .p-paginator-pages .p-paginator-page.p-highlight) {
    background: var(--primary-500);
    border-color: var(--primary-500);
    color: white;
}

:deep(.p-paginator .p-paginator-current) {
    background: transparent;
    color: var(--text-color);
    font-weight: 700;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    background: var(--primary-50);
    border: 1px solid var(--primary-200);
}

/* Modo oscuro completo con clase CSS */
.app-dark .medical-table-container,
:root[data-theme='dark'] .medical-table-container {
    background: var(--surface-card);
    border-color: var(--surface-700);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.app-dark .medical-table-header,
:root[data-theme='dark'] .medical-table-header {
    background: linear-gradient(135deg, var(--surface-700) 0%, var(--surface-600) 100%);
    border-bottom-color: var(--surface-500);
}

.app-dark .medical-icon,
:root[data-theme='dark'] .medical-icon {
    background: var(--surface-card);
    color: var(--primary-400);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.app-dark .title-content .main-title,
:root[data-theme='dark'] .title-content .main-title {
    color: var(--surface-0);
}

.app-dark .title-content .subtitle,
:root[data-theme='dark'] .title-content .subtitle {
    color: var(--surface-200);
}

.app-dark .user-count-badge,
:root[data-theme='dark'] .user-count-badge {
    background: var(--primary-600);
    color: var(--surface-0);
}

.app-dark .refresh-button,
:root[data-theme='dark'] .refresh-button {
    border-color: var(--surface-500);
    color: var(--surface-100);
}

.app-dark .refresh-button:hover,
:root[data-theme='dark'] .refresh-button:hover {
    background: var(--surface-600);
    border-color: var(--surface-400);
}

.app-dark .medical-dni,
:root[data-theme='dark'] .medical-dni {
    background: var(--surface-700);
    border-color: var(--surface-600);
    color: var(--surface-100);
}

.app-dark .medical-specialty-tag,
:root[data-theme='dark'] .medical-specialty-tag {
    background: linear-gradient(135deg, var(--surface-600), var(--surface-500));
    border-color: var(--surface-400);
    color: var(--surface-0);
}

.app-dark .medical-status-tag,
:root[data-theme='dark'] .medical-status-tag {
    filter: brightness(0.9) saturate(1.2);
}

.app-dark .user-name,
:root[data-theme='dark'] .user-name {
    color: var(--surface-0);
}

.app-dark .user-nick,
:root[data-theme='dark'] .user-nick {
    color: var(--surface-300);
}

.app-dark .email-link,
:root[data-theme='dark'] .email-link {
    color: var(--primary-400);
}

.app-dark .email-link:hover,
:root[data-theme='dark'] .email-link:hover {
    color: var(--primary-300);
}

.app-dark .phone-link,
:root[data-theme='dark'] .phone-link {
    color: var(--surface-100);
}

.app-dark .phone-link:hover,
:root[data-theme='dark'] .phone-link:hover {
    color: var(--green-400);
}

.app-dark .date-main,
:root[data-theme='dark'] .date-main {
    color: var(--surface-100);
}

.app-dark .date-relative,
:root[data-theme='dark'] .date-relative {
    color: var(--surface-400);
}

.app-dark .no-phone,
:root[data-theme='dark'] .no-phone {
    color: var(--surface-500);
}

/* Estilos específicos para DataTable en modo oscuro */
.app-dark .medical-datatable :deep(.p-datatable-thead > tr > th),
:root[data-theme='dark'] .medical-datatable :deep(.p-datatable-thead > tr > th) {
    background: var(--surface-700) !important;
    border-bottom-color: var(--surface-500) !important;
    color: var(--surface-100) !important;
}

.app-dark .medical-datatable :deep(.p-datatable-tbody > tr > td),
:root[data-theme='dark'] .medical-datatable :deep(.p-datatable-tbody > tr > td) {
    border-bottom-color: var(--surface-600) !important;
    color: var(--surface-100);
}

.app-dark .medical-datatable :deep(.p-datatable-tbody > tr:hover),
:root[data-theme='dark'] .medical-datatable :deep(.p-datatable-tbody > tr:hover) {
    background: var(--surface-600) !important;
}

.app-dark .medical-datatable :deep(.p-datatable-striped .p-datatable-tbody > tr:nth-child(odd)),
:root[data-theme='dark'] .medical-datatable :deep(.p-datatable-striped .p-datatable-tbody > tr:nth-child(odd)) {
    background: var(--surface-750) !important;
}

/* Paginación en modo oscuro */
.app-dark .medical-datatable :deep(.p-paginator),
:root[data-theme='dark'] .medical-datatable :deep(.p-paginator) {
    background: var(--surface-700) !important;
    border-top-color: var(--surface-500) !important;
    color: var(--surface-100);
}

.app-dark .medical-datatable :deep(.p-paginator .p-paginator-pages .p-paginator-page),
:root[data-theme='dark'] .medical-datatable :deep(.p-paginator .p-paginator-pages .p-paginator-page) {
    color: var(--surface-200);
    border-color: var(--surface-600);
}

.app-dark .medical-datatable :deep(.p-paginator .p-paginator-pages .p-paginator-page:hover),
:root[data-theme='dark'] .medical-datatable :deep(.p-paginator .p-paginator-pages .p-paginator-page:hover) {
    background: var(--surface-600) !important;
    color: var(--surface-0) !important;
}

.app-dark .medical-datatable :deep(.p-paginator .p-paginator-pages .p-paginator-page.p-highlight),
:root[data-theme='dark'] .medical-datatable :deep(.p-paginator .p-paginator-pages .p-paginator-page.p-highlight) {
    background: var(--primary-600) !important;
    border-color: var(--primary-600) !important;
    color: white !important;
}

.app-dark .medical-datatable :deep(.p-paginator .p-paginator-current),
:root[data-theme='dark'] .medical-datatable :deep(.p-paginator .p-paginator-current) {
    background: var(--surface-600) !important;
    border-color: var(--surface-500) !important;
    color: var(--surface-0) !important;
}

/* Estados vacíos en modo oscuro */
.app-dark .medical-empty-state,
:root[data-theme='dark'] .medical-empty-state {
    background: linear-gradient(135deg, var(--surface-700) 0%, var(--surface-600) 100%);
}

.app-dark .empty-icon,
:root[data-theme='dark'] .empty-icon {
    color: var(--primary-500);
}

.app-dark .empty-title,
:root[data-theme='dark'] .empty-title {
    color: var(--surface-0);
}

.app-dark .empty-subtitle,
:root[data-theme='dark'] .empty-subtitle {
    color: var(--surface-300);
}

/* Carga en modo oscuro */
.app-dark .medical-loading-state,
:root[data-theme='dark'] .medical-loading-state {
    background: var(--surface-700);
}

.app-dark .loading-spinner i,
:root[data-theme='dark'] .loading-spinner i {
    color: var(--primary-400);
}

.app-dark .loading-text,
:root[data-theme='dark'] .loading-text {
    color: var(--primary-400);
}

/* Botones de acción en modo oscuro */
.app-dark .medical-toggle-btn,
:root[data-theme='dark'] .medical-toggle-btn {
    color: var(--surface-200);
}

.app-dark .medical-toggle-btn:hover,
:root[data-theme='dark'] .medical-toggle-btn:hover {
    background: var(--surface-600) !important;
    color: var(--surface-0) !important;
}

.app-dark .medical-split-button :deep(.p-menu),
:root[data-theme='dark'] .medical-split-button :deep(.p-menu) {
    background: var(--surface-700);
    border-color: var(--surface-600);
}

.app-dark .medical-split-button :deep(.p-menu .p-menuitem-link),
:root[data-theme='dark'] .medical-split-button :deep(.p-menu .p-menuitem-link) {
    color: var(--surface-100);
}

.app-dark .medical-split-button :deep(.p-menu .p-menuitem-link:hover),
:root[data-theme='dark'] .medical-split-button :deep(.p-menu .p-menuitem-link:hover) {
    background: var(--surface-600);
    color: var(--surface-0);
}

/* Estilos de ConfirmPopup en modo oscuro */
.app-dark :deep(.p-confirmpopup),
:root[data-theme='dark'] :deep(.p-confirmpopup) {
    background: var(--surface-card);
    border-color: var(--surface-700);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.app-dark :deep(.p-confirmpopup .p-confirmpopup-message),
:root[data-theme='dark'] :deep(.p-confirmpopup .p-confirmpopup-message) {
    color: var(--surface-0);
}

.app-dark :deep(.p-confirmpopup .p-confirmpopup-footer .p-button.p-button-secondary),
:root[data-theme='dark'] :deep(.p-confirmpopup .p-confirmpopup-footer .p-button.p-button-secondary) {
    background: var(--surface-700);
    color: var(--surface-100);
    border-color: var(--surface-600);
}

.app-dark :deep(.p-confirmpopup .p-confirmpopup-footer .p-button.p-button-secondary:hover),
:root[data-theme='dark'] :deep(.p-confirmpopup .p-confirmpopup-footer .p-button.p-button-secondary:hover) {
    background: var(--surface-600);
    border-color: var(--surface-500);
}

/* ConfirmPopup en detección automática de modo oscuro */
@media (prefers-color-scheme: dark) {
    :deep(.p-confirmpopup) {
        background: var(--surface-card);
        border-color: var(--surface-700);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    :deep(.p-confirmpopup .p-confirmpopup-message) {
        color: var(--surface-0);
    }

    :deep(.p-confirmpopup .p-confirmpopup-footer .p-button.p-button-secondary) {
        background: var(--surface-700);
        color: var(--surface-100);
        border-color: var(--surface-600);
    }
}

/* Detección automática de modo oscuro del sistema */
@media (prefers-color-scheme: dark) {
    .medical-table-container {
        background: var(--surface-card);
        border-color: var(--surface-700);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    .medical-table-header {
        background: linear-gradient(135deg, var(--surface-700) 0%, var(--surface-600) 100%);
        border-bottom-color: var(--surface-500);
    }

    .medical-icon {
        background: var(--surface-card);
        color: var(--primary-400);
    }

    .title-content .main-title {
        color: var(--surface-0);
    }

    .title-content .subtitle {
        color: var(--surface-200);
    }

    .medical-dni {
        background: var(--surface-700);
        border-color: var(--surface-600);
        color: var(--surface-100);
    }

    .medical-specialty-tag {
        background: linear-gradient(135deg, var(--surface-600), var(--surface-500));
        border-color: var(--surface-400);
        color: var(--surface-0);
    }

    .medical-datatable :deep(.p-datatable-thead > tr > th) {
        background: var(--surface-700) !important;
        border-bottom-color: var(--surface-500) !important;
        color: var(--surface-100) !important;
    }

    .medical-datatable :deep(.p-datatable-tbody > tr:hover) {
        background: var(--surface-600) !important;
    }

    .medical-datatable :deep(.p-paginator) {
        background: var(--surface-700) !important;
        border-top-color: var(--surface-500) !important;
    }
}

/* Responsive para dispositivos móviles */
@media (max-width: 768px) {
    .medical-table-header {
        padding: 1rem;
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }

    .header-left {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.75rem;
    }

    .title-section {
        flex-direction: column;
        gap: 0.5rem;
    }

    .medical-icon {
        font-size: 1.5rem;
        padding: 0.5rem;
    }

    .title-content .main-title {
        font-size: 1.25rem;
    }

    .header-actions {
        justify-content: center;
    }

    :deep(.medical-datatable .p-datatable-thead > tr > th),
    :deep(.medical-datatable .p-datatable-tbody > tr > td) {
        padding: 0.75rem 0.5rem;
        font-size: 0.875rem;
    }

    .medical-user-cell {
        gap: 0.75rem;
    }

    .medical-avatar,
    .medical-avatar-fallback {
        width: 2.5rem;
        height: 2.5rem;
    }

    .medical-actions-compact {
        gap: 0.25rem;
    }

    .medical-toggle-btn {
        width: 2rem;
        height: 2rem;
        font-size: 0.875rem;
    }

    .medical-split-button :deep(.p-splitbutton-defaultbutton) {
        padding: 0.4rem 0.6rem;
        min-width: 2rem;
    }

    .medical-split-button :deep(.p-splitbutton-menubutton) {
        padding: 0.4rem;
        min-width: 1.75rem;
    }

    :deep(.p-paginator) {
        padding: 1rem;
        flex-wrap: wrap;
        gap: 0.5rem;
        justify-content: center;
    }

    :deep(.p-paginator .p-paginator-current) {
        order: -1;
        width: 100%;
        text-align: center;
        margin: 0 0 0.5rem 0;
    }
}

@media (max-width: 480px) {
    .medical-table-header {
        padding: 0.75rem;
    }

    .title-content .main-title {
        font-size: 1.1rem;
    }

    .title-content .subtitle {
        font-size: 0.8rem;
    }

    .empty-title {
        font-size: 1.1rem;
    }

    .empty-subtitle {
        font-size: 0.9rem;
    }

    .medical-actions-compact {
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
    }

    .medical-split-button {
        width: 100%;
        order: 1;
    }

    .medical-split-button :deep(.p-splitbutton) {
        width: 100%;
    }

    .medical-split-button :deep(.p-splitbutton-defaultbutton) {
        flex: 1;
        justify-content: center;
        min-width: auto;
        padding: 0.625rem 1rem;
    }

    .medical-split-button :deep(.p-splitbutton-menubutton) {
        min-width: auto;
        padding: 0.625rem;
    }

    .medical-toggle-btn {
        width: 100%;
        height: 2.5rem;
        border-radius: 8px;
        justify-content: center;
        font-size: 1.1rem;
        order: 2;
        display: flex;
        align-items: center;
    }
}

/* Animaciones y transiciones */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.medical-table-container {
    animation: fadeInUp 0.4s ease-out;
}

:deep(.medical-datatable .p-datatable-tbody > tr) {
    animation: fadeInUp 0.3s ease-out;
}

/* Mejoras de accesibilidad completas */
.medical-action-btn:focus {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}

.email-link:focus,
.phone-link:focus {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
    border-radius: 4px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}

/* Botones principales con mejor contraste */
.primary-button:focus {
    outline: 2px solid var(--green-300);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.3);
}

.refresh-button:focus {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}

.medical-status-indicator::after {
    content: attr(aria-label);
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
}

/* Navegación por teclado mejorada */
.medical-datatable :deep(.p-datatable-tbody > tr):focus-within {
    background: var(--primary-50) !important;
    outline: 2px solid var(--primary-500);
    outline-offset: -2px;
}

/* Modo alto contraste */
@media (prefers-contrast: high) {
    .medical-table-container {
        border: 2px solid var(--text-color);
    }

    .medical-table-header {
        background: var(--text-color);
        color: var(--surface-card);
    }

    .medical-action-btn {
        border: 1px solid var(--text-color);
    }

    .medical-specialty-tag,
    .medical-status-tag {
        border: 2px solid var(--text-color);
        background: var(--surface-card);
        color: var(--text-color);
    }
}

/* Reducción de movimiento para usuarios sensibles */
@media (prefers-reduced-motion: reduce) {
    .medical-table-container,
    .medical-datatable :deep(.p-datatable-tbody > tr),
    .medical-toggle-btn {
        animation: none;
        transition: none;
    }

    .medical-toggle-btn:hover {
        transform: none;
    }

    .medical-avatar:hover {
        transform: none;
    }

    .primary-button:hover {
        transform: none;
    }
}

.medical-datatable :deep(.p-datatable-tbody > tr[tabindex='0']) {
    cursor: pointer;
}

.medical-datatable :deep(.p-datatable-tbody > tr[tabindex='0']:focus) {
    background: var(--primary-100) !important;
    outline: 2px solid var(--primary-500);
    outline-offset: -2px;
}

/* Textos alternativos y etiquetas ARIA mejoradas */
.medical-avatar-container {
    position: relative;
}

.medical-avatar-container::after {
    content: 'Foto de perfil de ' attr(data-name);
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
}

/* Mensajes de estado para lectores de pantalla */
.sr-only {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(1px, 1px, 1px, 1px);
    white-space: nowrap;
}

/* Mejoras para usuarios de lectores de pantalla */
.medical-actions-compact::before {
    content: 'Menú de acciones para usuario';
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
}

/* Mejoras adicionales para el split button */
.medical-split-button :deep(.p-splitbutton-defaultbutton):focus {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}

.medical-split-button :deep(.p-splitbutton-menubutton):focus {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}

/* Variables CSS personalizadas para el tema médico */
:root {
    --medical-primary: #0ea5e9;
    --medical-success: #10b981;
    --medical-warning: #f59e0b;
    --medical-danger: #ef4444;
}
</style>
