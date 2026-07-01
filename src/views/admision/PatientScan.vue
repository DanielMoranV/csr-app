<script setup>
import { useAdmision } from '@/composables/useAdmision';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { computed, nextTick, ref } from 'vue';

const { scanResult, isScanning, notFound, lastQuery, error, syncPatient, clearScan, pagoStatusInfo, financiamientoInfo, turnoStatusInfo, tipoAtencionInfo } = useAdmision();

// ── Búsqueda ───────────────────────────────────────────────────────────────
const documento = ref('');
const searchInput = ref(null);
// Marca si ya se hizo al menos una búsqueda (para distinguir el estado inicial).
const hasSearched = ref(false);

// Tipo de documento. "auto" ⇒ no se envía `tipo` y el backend lo detecta por
// longitud (8→DNI, 9→Historia, 10→Nº admisión).
const tipo = ref('auto');
const tipoOptions = [
    { label: 'Auto', value: 'auto' },
    { label: 'DNI', value: 'dni' },
    { label: 'Historia', value: 'historia' },
    { label: 'Nº admisión', value: 'num_admision' }
];

const handleSearch = async () => {
    const value = documento.value.trim();
    if (!value || isScanning.value) return;
    hasSearched.value = true;
    await syncPatient(value, tipo.value === 'auto' ? undefined : tipo.value);
};

const handleClear = () => {
    documento.value = '';
    hasSearched.value = false;
    clearScan();
    nextTick(() => searchInput.value?.$el?.focus());
};

// ── Estado de error/vacío (mensaje en línea según el caso) ────────────────────
// notFound (404) y los distintos fallos de sincronización se resuelven a un
// único bloque de estado con copia clara para la admisionista.
const errorInfo = computed(() => {
    if (notFound.value) {
        return {
            icon: 'pi pi-user-minus',
            cls: 'warn',
            title: 'Paciente no encontrado',
            subtitle: `No se encontró un paciente con el documento «${lastQuery.value}» en Sisclin. Verifica el número e inténtalo nuevamente.`,
            retry: false
        };
    }
    const e = error.value;
    if (!e) return null;
    const byStatus = {
        409: { icon: 'pi pi-sync', cls: 'warn', title: 'Sincronizando, espera un momento…', subtitle: 'Ya hay una sincronización en curso para este documento. Vuelve a intentar en unos segundos.', retry: true },
        422: { icon: 'pi pi-exclamation-circle', cls: 'warn', title: 'Documento no válido', subtitle: e.message || 'Revisa el documento ingresado (entre 3 y 50 caracteres).', retry: false },
        503: { icon: 'pi pi-server', cls: 'danger', title: 'Servicio de sincronización no disponible', subtitle: 'Sisclin no responde en este momento. Intenta más tarde.', retry: true },
        504: { icon: 'pi pi-clock', cls: 'danger', title: 'La sincronización tardó demasiado', subtitle: 'Sisclin no respondió a tiempo. Vuelve a intentarlo.', retry: true }
    };
    return byStatus[e.status] || { icon: 'pi pi-exclamation-triangle', cls: 'danger', title: 'Ocurrió un problema al consultar el paciente', subtitle: e.message || '', retry: true };
});

// ── Desglose de pendientes en el historial (expandible por fila) ──────────────
const expandedPagos = ref(new Set());
const togglePendientes = (atencionId) => {
    const next = new Set(expandedPagos.value);
    next.has(atencionId) ? next.delete(atencionId) : next.add(atencionId);
    expandedPagos.value = next;
};
const isPagoExpanded = (atencionId) => expandedPagos.value.has(atencionId);

// ── Datos derivados del paciente ─────────────────────────────────────────────
const paciente = computed(() => scanResult.value?.paciente || null);
const financiamientoDefault = computed(() => scanResult.value?.financiamiento_default || null);
const citasHoy = computed(() => scanResult.value?.citas_hoy || []);
const ultimasCitas = computed(() => scanResult.value?.ultimas_citas || []);

const nombreCompleto = computed(() => {
    const p = paciente.value;
    if (!p) return '';
    return [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ').trim();
});

const SEXO_LABEL = { M: 'Masculino', F: 'Femenino' };
const sexoLabel = (sexo) => SEXO_LABEL[sexo] || sexo || '—';

// ── Formateo ─────────────────────────────────────────────────────────────────
const moneyFmt = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const formatMoney = (n) => (n === null || n === undefined || n === '' ? '—' : moneyFmt.format(Number(n)));

const dateFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' });

const parseDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
};
const formatDate = (iso) => {
    const d = parseDate(iso);
    return d ? dateFmt.format(d) : '—';
};
const formatTime = (iso) => {
    const d = parseDate(iso);
    return d ? timeFmt.format(d) : '';
};

// `nombre_servicio` trae el nombre limpio del médico (APELLIDOS NOMBRES) o, en
// servicios sin médico (Rayos X, farmacia…), el nombre del servicio. El campo
// `nombre_medico` viene con muletillas/consultorio, no se usa.
const medicoOServicio = (cita) => cita?.servicio?.nombre_servicio || cita?.servicio?.nombre_medico || 'Servicio no especificado';

// Procedimientos realizados (nombres del tarifario), unidos en una línea.
// Vacío si la atención aún no tiene detalles de servicio.
const procedimientosTexto = (cita) => (Array.isArray(cita?.procedimientos) ? cita.procedimientos.join(', ') : '');

// Monto que falta cobrar en ventanilla (0 si no aplica o no viene informado).
const montoPendiente = (pago) => Number(pago?.monto_pendiente) || 0;
</script>

<template>
    <div class="scan-view">
        <div class="main-card">
            <!-- Cabecera -->
            <div class="header-section">
                <div class="header-icon-wrapper"><i class="pi pi-id-card"></i></div>
                <div class="header-content">
                    <h1 class="header-title">Buscar Paciente</h1>
                    <p class="header-subtitle"><i class="pi pi-info-circle mr-2"></i>Busca por DNI, código de paciente o número de historia para ver su cita de hoy y su estado de pago.</p>
                </div>
            </div>

            <!-- Barra de búsqueda -->
            <div class="search-bar">
                <Select v-model="tipo" :options="tipoOptions" optionLabel="label" optionValue="value" class="tipo-select" :disabled="isScanning" v-tooltip.top="'Tipo de documento (Auto lo detecta por longitud)'" />
                <IconField class="search-field">
                    <InputIcon class="pi pi-search" />
                    <InputText ref="searchInput" v-model="documento" placeholder="Escanea o escribe el documento y presiona Enter…" class="search-input" autofocus :disabled="isScanning" @keyup.enter="handleSearch" />
                </IconField>
                <Button label="Buscar" icon="pi pi-search" :loading="isScanning" @click="handleSearch" />
                <Button v-if="hasSearched" label="Limpiar" icon="pi pi-times" severity="secondary" outlined :disabled="isScanning" @click="handleClear" />
            </div>

            <!-- Estado: cargando (migración desde Sisclin, ~5 s) -->
            <div v-if="isScanning" class="state-block">
                <ProgressSpinner style="width: 48px; height: 48px" strokeWidth="4" />
                <p class="state-text">Sincronizando con Sisclin…</p>
                <p class="state-subtext">Esto puede tardar unos 5 segundos.</p>
            </div>

            <!-- Estado: inicial (aún no se busca) -->
            <div v-else-if="!hasSearched" class="state-block muted">
                <i class="pi pi-search state-icon"></i>
                <p class="state-text">Escanea el documento del paciente para comenzar.</p>
            </div>

            <!-- Estado: error / no encontrado (mensaje según el caso) -->
            <div v-else-if="errorInfo" class="state-block">
                <i :class="[errorInfo.icon, 'state-icon', errorInfo.cls]"></i>
                <p class="state-text">{{ errorInfo.title }}</p>
                <p v-if="errorInfo.subtitle" class="state-subtext">{{ errorInfo.subtitle }}</p>
                <Button v-if="errorInfo.retry" label="Reintentar" icon="pi pi-refresh" @click="handleSearch" />
            </div>

            <!-- Resultado -->
            <div v-else-if="paciente" class="result">
                <!-- Ficha del paciente -->
                <section class="patient-card">
                    <div class="patient-avatar"><i class="pi pi-user"></i></div>
                    <div class="patient-main">
                        <h2 class="patient-name">{{ nombreCompleto }}</h2>
                        <div class="patient-meta">
                            <span
                                ><i class="pi pi-hashtag"></i> Historia: <strong class="mono">{{ paciente.numero_historia || '—' }}</strong></span
                            >
                            <span
                                ><i class="pi pi-id-card"></i> DNI: <strong class="mono">{{ paciente.dni || '—' }}</strong></span
                            >
                            <span v-if="paciente.codigo_paciente"
                                ><i class="pi pi-tag"></i> Cód: <strong class="mono">{{ paciente.codigo_paciente }}</strong></span
                            >
                            <span><i class="pi pi-calendar"></i> {{ paciente.edad ?? '—' }} años</span>
                            <span><i class="pi pi-venus-mars"></i> {{ sexoLabel(paciente.sexo) }}</span>
                            <span v-if="paciente.telefono"><i class="pi pi-phone"></i> {{ paciente.telefono }}</span>
                        </div>
                    </div>
                    <div v-if="financiamientoDefault" class="patient-fin">
                        <span class="fin-label">Financiamiento</span>
                        <Tag :severity="financiamientoInfo(financiamientoDefault.tipo).severity" class="fin-badge">
                            <i :class="financiamientoInfo(financiamientoDefault.tipo).icon" class="mr-2"></i>
                            {{ financiamientoInfo(financiamientoDefault.tipo).label }}
                        </Tag>
                        <span v-if="financiamientoDefault.aseguradora" class="fin-aseguradora">{{ financiamientoDefault.aseguradora.nombre }}</span>
                    </div>
                </section>

                <!-- Citas de hoy -->
                <section class="section">
                    <h3 class="section-title"><i class="pi pi-calendar-plus"></i> Cita(s) de hoy</h3>

                    <div v-if="citasHoy.length === 0" class="empty-today">
                        <i class="pi pi-calendar-times"></i>
                        <span>Sin citas registradas hoy.</span>
                    </div>

                    <div v-else class="today-grid">
                        <article v-for="cita in citasHoy" :key="cita.atencion_id" class="today-card" :class="`pago-${cita.pago?.estado || 'SIN_SERVICIOS'}`">
                            <div v-if="cita.numero_admision" class="today-admision">
                                <i class="pi pi-hashtag"></i> Admisión <span class="mono">{{ cita.numero_admision }}</span>
                            </div>
                            <div class="today-card-head">
                                <div class="today-service">
                                    <span class="today-medico">{{ medicoOServicio(cita) }}</span>
                                    <span v-if="cita.servicio?.especialidad" class="today-especialidad">{{ cita.servicio.especialidad }}</span>
                                    <span v-if="procedimientosTexto(cita)" class="today-proc"><i class="pi pi-file-o"></i> {{ procedimientosTexto(cita) }}</span>
                                </div>
                                <Tag :severity="tipoAtencionInfo(cita.tipo_atencion).severity" class="tipo-tag">
                                    <i :class="tipoAtencionInfo(cita.tipo_atencion).icon" class="mr-1"></i>
                                    {{ tipoAtencionInfo(cita.tipo_atencion).label }}
                                </Tag>
                            </div>

                            <div class="today-details">
                                <span v-if="cita.servicio?.numero_consultorio"><i class="pi pi-map-marker"></i> Consultorio {{ cita.servicio.numero_consultorio }}</span>
                                <span><i class="pi pi-clock"></i> {{ formatTime(cita.fecha_hora) }}</span>
                                <span>
                                    <i :class="financiamientoInfo(cita.financiamiento?.tipo).icon"></i>
                                    {{ financiamientoInfo(cita.financiamiento?.tipo).label }}<template v-if="cita.financiamiento?.aseguradora"> · {{ cita.financiamiento.aseguradora.nombre }}</template>
                                </span>
                            </div>

                            <div class="today-card-foot">
                                <div class="turno-box">
                                    <template v-if="cita.turno">
                                        <span class="turno-num">Turno {{ cita.turno.numero_turno }}</span>
                                        <Tag :value="turnoStatusInfo(cita.turno.estado_turno).label" :severity="turnoStatusInfo(cita.turno.estado_turno).severity" />
                                    </template>
                                    <span v-else class="turno-none">Sin turno asignado</span>
                                </div>

                                <div class="pago-box">
                                    <Tag :severity="pagoStatusInfo(cita.pago?.estado).severity" class="pago-badge">
                                        <i :class="pagoStatusInfo(cita.pago?.estado).icon" class="mr-2"></i>
                                        {{ pagoStatusInfo(cita.pago?.estado).label }}
                                    </Tag>
                                    <div class="pago-amounts">
                                        <span
                                            >Total: <strong>{{ formatMoney(cita.pago?.total) }}</strong></span
                                        >
                                        <span v-if="cita.pago?.servicios_evaluables">{{ cita.pago.servicios_pagados ?? 0 }}/{{ cita.pago.servicios_evaluables }} servicios pagados</span>
                                        <span v-if="montoPendiente(cita.pago) > 0" class="falta"
                                            >Falta pagar: <strong>{{ formatMoney(cita.pago.monto_pendiente) }}</strong></span
                                        >
                                        <span v-if="cita.financiamiento?.tipo === 'SEGURO'" class="copago"
                                            >Copago: <strong>{{ formatMoney(cita.pago?.total_copago) }}</strong></span
                                        >
                                    </div>
                                </div>
                            </div>

                            <!-- Detalle de servicios pendientes de cobro en ventanilla -->
                            <div v-if="cita.pago?.pendientes?.length" class="pendientes">
                                <span class="pendientes-title"><i class="pi pi-list"></i> Pendiente en ventanilla</span>
                                <ul class="pendientes-list">
                                    <li v-for="(serv, idx) in cita.pago.pendientes" :key="serv.codigo_servicio || idx">
                                        <span class="mono pendiente-cod">{{ serv.codigo_servicio || '—' }}</span>
                                        <span class="pendiente-rubro">{{ serv.rubro || 'Servicio' }}</span>
                                        <span class="pendiente-total">{{ formatMoney(serv.total) }}</span>
                                    </li>
                                </ul>
                            </div>
                        </article>
                    </div>
                </section>

                <!-- Historial de citas -->
                <section class="section">
                    <h3 class="section-title"><i class="pi pi-history"></i> Últimas citas</h3>

                    <DataTable :value="ultimasCitas" responsiveLayout="scroll" stripedRows class="p-datatable-sm" emptyMessage="Sin citas anteriores registradas.">
                        <Column header="N.º Admisión" style="min-width: 140px">
                            <template #body="{ data }">
                                <span v-if="data.numero_admision" class="mono font-semibold">{{ data.numero_admision }}</span>
                                <span v-else class="text-muted">—</span>
                            </template>
                        </Column>
                        <Column header="Fecha" style="min-width: 130px">
                            <template #body="{ data }">
                                <div class="cell-date">
                                    <span class="font-semibold">{{ formatDate(data.fecha_hora) }}</span>
                                    <span class="cell-time">{{ formatTime(data.fecha_hora) }}</span>
                                </div>
                            </template>
                        </Column>
                        <Column header="Servicio / Médico" style="min-width: 220px">
                            <template #body="{ data }">
                                <div class="cell-service">
                                    <span class="font-semibold">{{ medicoOServicio(data) }}</span>
                                    <span v-if="data.servicio?.especialidad" class="cell-sub">{{ data.servicio.especialidad }}</span>
                                    <span v-if="procedimientosTexto(data)" class="cell-proc"><i class="pi pi-file-o"></i> {{ procedimientosTexto(data) }}</span>
                                </div>
                            </template>
                        </Column>
                        <Column header="Tipo" style="min-width: 120px">
                            <template #body="{ data }">
                                <Tag :severity="tipoAtencionInfo(data.tipo_atencion).severity">
                                    <i :class="tipoAtencionInfo(data.tipo_atencion).icon" class="mr-1"></i>
                                    {{ tipoAtencionInfo(data.tipo_atencion).label }}
                                </Tag>
                            </template>
                        </Column>
                        <Column header="Financiamiento" style="min-width: 150px">
                            <template #body="{ data }">
                                <Tag :severity="financiamientoInfo(data.financiamiento?.tipo).severity" :value="financiamientoInfo(data.financiamiento?.tipo).label" />
                                <div v-if="data.financiamiento?.aseguradora" class="cell-sub">{{ data.financiamiento.aseguradora.nombre }}</div>
                            </template>
                        </Column>
                        <Column header="Turno" style="min-width: 130px">
                            <template #body="{ data }">
                                <template v-if="data.turno">
                                    <span class="mono">N.º {{ data.turno.numero_turno }}</span>
                                    <Tag class="ml-2" :value="turnoStatusInfo(data.turno.estado_turno).label" :severity="turnoStatusInfo(data.turno.estado_turno).severity" />
                                </template>
                                <span v-else class="text-muted">—</span>
                            </template>
                        </Column>
                        <Column header="Pago" style="min-width: 170px">
                            <template #body="{ data }">
                                <Tag :severity="pagoStatusInfo(data.pago?.estado).severity" class="mb-1">
                                    <i :class="pagoStatusInfo(data.pago?.estado).icon" class="mr-1"></i>
                                    {{ pagoStatusInfo(data.pago?.estado).label }}
                                </Tag>
                                <div class="cell-sub">
                                    {{ formatMoney(data.pago?.total) }}<template v-if="data.financiamiento?.tipo === 'SEGURO'"> · Copago {{ formatMoney(data.pago?.total_copago) }}</template>
                                </div>
                                <!-- Desglose expandible cuando hay servicios pendientes -->
                                <button v-if="data.pago?.pendientes?.length" type="button" class="pendientes-toggle falta" @click="togglePendientes(data.atencion_id)">
                                    Falta {{ formatMoney(data.pago.monto_pendiente) }}
                                    <i :class="isPagoExpanded(data.atencion_id) ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
                                </button>
                                <div v-else-if="montoPendiente(data.pago) > 0" class="cell-sub falta">Falta {{ formatMoney(data.pago.monto_pendiente) }}</div>
                                <ul v-if="isPagoExpanded(data.atencion_id) && data.pago?.pendientes?.length" class="cell-pendientes">
                                    <li v-for="(serv, idx) in data.pago.pendientes" :key="serv.codigo_servicio || idx">
                                        <span class="mono pendiente-cod">{{ serv.codigo_servicio || '—' }}</span>
                                        <span class="pendiente-rubro">{{ serv.rubro || 'Servicio' }}</span>
                                        <span class="pendiente-total">{{ formatMoney(serv.total) }}</span>
                                    </li>
                                </ul>
                            </template>
                        </Column>
                    </DataTable>
                </section>
            </div>
        </div>
    </div>
</template>

<style scoped>
.scan-view {
    padding: 1rem;
}
.main-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Cabecera */
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

/* Barra de búsqueda */
.search-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
}
.tipo-select {
    min-width: 130px;
}
.search-field {
    flex: 1;
    min-width: 260px;
}
.search-input {
    width: 100%;
    font-size: 1.1rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
}

/* Bloques de estado (loading / vacío / error) */
.state-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 3.5rem 1rem;
    text-align: center;
}
.state-block.muted {
    color: var(--text-color-secondary);
}
.state-icon {
    font-size: 3rem;
    color: var(--text-color-secondary);
}
.state-icon.warn {
    color: var(--yellow-500, #eab308);
}
.state-icon.danger {
    color: var(--red-500, #ef4444);
}
.state-text {
    font-size: 1.1rem;
    color: var(--text-color);
    margin: 0;
}
.state-subtext {
    color: var(--text-color-secondary);
    margin: 0;
}

/* Ficha del paciente */
.result {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}
.patient-card {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1.5rem;
    border-radius: 14px;
    background: color-mix(in srgb, var(--primary-color) 6%, var(--surface-card));
    border: 1px solid color-mix(in srgb, var(--primary-color) 20%, var(--surface-border));
    flex-wrap: wrap;
}
.patient-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-card);
    border: 2px solid color-mix(in srgb, var(--primary-color) 40%, transparent);
    flex-shrink: 0;
}
.patient-avatar i {
    font-size: 1.75rem;
    color: var(--primary-color);
}
.patient-main {
    flex: 1;
    min-width: 220px;
}
.patient-name {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    color: var(--text-color);
    text-transform: uppercase;
    letter-spacing: 0.3px;
}
.patient-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 1.25rem;
    color: var(--text-color-secondary);
    font-size: 0.95rem;
}
.patient-meta i {
    margin-right: 0.35rem;
    opacity: 0.75;
}
.patient-fin {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.35rem;
    text-align: right;
}
.fin-label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-color-secondary);
}
.fin-badge {
    font-size: 1.05rem;
    padding: 0.5rem 0.9rem;
}
.fin-aseguradora {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-color);
}

/* Secciones */
.section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-color);
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--surface-border);
}
.section-title i {
    color: var(--primary-color);
}

.empty-today {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 1.25rem;
    border-radius: 10px;
    background: var(--surface-ground);
    color: var(--text-color-secondary);
    font-size: 1rem;
}

/* Tarjetas de citas de hoy */
.today-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
}
.today-admision {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-color-secondary);
    margin-bottom: 0.25rem;
}
.today-admision i {
    opacity: 0.75;
    margin-right: 0.15rem;
}
.today-admision .mono {
    color: var(--text-color);
    letter-spacing: 0;
}
.today-card {
    border: 1px solid var(--surface-border);
    border-left: 5px solid var(--surface-border);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    background: var(--surface-card);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}
.today-card.pago-PAGADO {
    border-left-color: var(--green-500, #22c55e);
}
.today-card.pago-PARCIAL {
    border-left-color: var(--yellow-500, #eab308);
}
.today-card.pago-PENDIENTE {
    border-left-color: var(--red-500, #ef4444);
}
.today-card.pago-CUBIERTO_SEGURO {
    border-left-color: var(--blue-500, #3b82f6);
}
.today-card.pago-TRASLADADO {
    border-left-color: var(--surface-400, #9ca3af);
}
.today-card.pago-SIN_SERVICIOS {
    border-left-color: var(--surface-400, #9ca3af);
}
.today-card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
}
.today-service {
    display: flex;
    flex-direction: column;
}
.today-medico {
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--text-color);
}
.today-especialidad {
    font-size: 0.85rem;
    color: var(--text-color-secondary);
}
.today-proc {
    font-size: 0.85rem;
    color: var(--text-color-secondary);
    margin-top: 0.1rem;
}
.today-proc i {
    margin-right: 0.25rem;
    opacity: 0.75;
}
.tipo-tag {
    flex-shrink: 0;
}
.today-details {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    font-size: 0.9rem;
    color: var(--text-color-secondary);
}
.today-details i {
    margin-right: 0.3rem;
    opacity: 0.75;
}
.today-card-foot {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--surface-border);
}
.turno-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.turno-num {
    font-weight: 600;
    color: var(--text-color);
}
.turno-none {
    font-size: 0.85rem;
    color: var(--text-color-secondary);
    font-style: italic;
}
.pago-box {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.35rem;
}
.pago-badge {
    font-size: 0.95rem;
    padding: 0.4rem 0.75rem;
}
.pago-amounts {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 0.85rem;
    color: var(--text-color-secondary);
}
.copago {
    color: var(--text-color);
    font-weight: 600;
}
.falta {
    color: var(--red-500, #ef4444);
    font-weight: 600;
}

/* Detalle de servicios pendientes en ventanilla */
.pendientes {
    border-top: 1px dashed var(--surface-border);
    padding-top: 0.6rem;
}
.pendientes-title {
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-color-secondary);
    margin-bottom: 0.4rem;
}
.pendientes-title i {
    margin-right: 0.3rem;
    opacity: 0.75;
}
.pendientes-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}
.pendientes-list li {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: 0.85rem;
}
.pendiente-cod {
    color: var(--text-color-secondary);
    flex-shrink: 0;
}
.pendiente-rubro {
    flex: 1;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.pendiente-total {
    font-weight: 600;
    color: var(--text-color);
    flex-shrink: 0;
}

/* Desglose expandible de pendientes en la tabla de historial */
.pendientes-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: none;
    border: none;
    padding: 0;
    margin-top: 0.15rem;
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
}
.pendientes-toggle i {
    font-size: 0.7rem;
}
.cell-pendientes {
    list-style: none;
    margin: 0.35rem 0 0;
    padding: 0.4rem 0.5rem;
    border-radius: 8px;
    background: var(--surface-ground);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}
.cell-pendientes li {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: 0.8rem;
}
.cell-pendientes .pendiente-rubro {
    flex: 1;
    color: var(--text-color);
}

/* Celdas de tabla */
.cell-date,
.cell-service {
    display: flex;
    flex-direction: column;
}
.cell-time {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}
.cell-sub {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    margin-top: 0.15rem;
}
.cell-proc {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    margin-top: 0.15rem;
}
.cell-proc i {
    margin-right: 0.25rem;
    opacity: 0.75;
}
.text-muted {
    color: var(--text-color-secondary);
}
.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

@media (max-width: 768px) {
    .main-card {
        padding: 1rem;
    }
    .patient-fin {
        align-items: flex-start;
        text-align: left;
    }
}
</style>
