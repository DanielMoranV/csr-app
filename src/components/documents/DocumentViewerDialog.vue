<script setup>
import apiClient from '@/api/axios.js';
import { useDocumentManagement } from '@/composables/useDocumentManagement';
import { useStamps } from '@/composables/useStamps';
import { useAuthStore } from '@/store/authStore';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';

// PDF.js worker (Vite ESM)
GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

const props = defineProps({
    visible: { type: Boolean, required: true },
    documentId: { type: [String, Number], default: null }
});
const emit = defineEmits(['update:visible', 'document-action']);

const { fetchDocumentDetails, currentDocument, isLoading, rejectDocumentStep, signDocumentStep, addDocumentComment, getSeverity } = useDocumentManagement();
const authStore = useAuthStore();

const { stamps: stampsList, isLoading: stampsLoading, loadStamps, getStampBlobUrl, revokeAllBlobUrls } = useStamps();

// ─── PDF state ───────────────────────────────────────────────────
const pdfCanvas = ref(null);
const canvasWrapper = ref(null);
const isRenderingPdf = ref(false);
let pdfDoc = null;
let currentBlobUrl = null;
const totalPages = ref(0);
const currentPage = ref(1);
const pageWidthMm = ref(210);
const pageHeightMm = ref(297);
/** ID de la versión actualmente visible en el visor */
const currentVersionId = ref(null);
const isDownloading = ref(false);

// ─── Panel mode: 'view' | 'drawing' | 'placing' ──────────────────
const rightPanelMode = ref('view');

// ─── Signature state ──────────────────────────────────────────────
const signatureCanvas = ref(null);
const signatureDataUrl = ref(null);
const signatureZones = ref([]);
let isDrawing = false;
let canvasCtx = null;

// ─── Stamps state ──────────────────────────────────────────────────
/** Map<sello_id, posicion[]> — zonas colocadas por sello */
const stampZones = ref(new Map());
/** ID del sello actualmente seleccionado para colocar */
const activeStampId = ref(null);
/** Blob URLs ya cargadas: Map<sello_id, url> */
const stampBlobUrls = ref({});
/** Si el modo placing se inició sin firma (solo sellos) */
const stampOnlyMode = ref(false);

// ─── Edición state ────────────────────────────────────────────────
const showEdicionDialog = ref(false);
const edicionFile = ref(null);
const edicionFileInput = ref(null);
const isSubmitting = ref(false);

// ─── Reject state ─────────────────────────────────────────────────
const showRejectDialog = ref(false);
const rejectComment = ref('');

// ─── Comments state ───────────────────────────────────────────────
const newComment = ref('');
const isAddingComment = ref(false);

// ─── Cleanup ──────────────────────────────────────────────────────
const revokeBlobUrl = () => {
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
    }
};

const revokeStampBlobUrls = () => {
    revokeAllBlobUrls();
    stampBlobUrls.value = {};
};

const destroyPdf = () => {
    if (pdfDoc) {
        pdfDoc.destroy();
        pdfDoc = null;
    }
    revokeBlobUrl();
    totalPages.value = 0;
    currentPage.value = 1;
};

onUnmounted(() => {
    destroyPdf();
    revokeStampBlobUrls();
});

// ─── Watch visibility ────────────────────────────────────────────
watch(
    () => props.visible,
    async (newVal) => {
        if (newVal && props.documentId) {
            rightPanelMode.value = 'view';
            signatureZones.value = [];
            signatureDataUrl.value = null;
            stampZones.value = new Map();
            activeStampId.value = null;
            stampOnlyMode.value = false;
            await loadDocument();
        } else {
            destroyPdf();
            revokeStampBlobUrls();
            rightPanelMode.value = 'view';
            stampZones.value = new Map();
            activeStampId.value = null;
            stampOnlyMode.value = false;
        }
    }
);

// ─── Load document ────────────────────────────────────────────────
const loadDocument = async () => {
    isRenderingPdf.value = true;
    try {
        await fetchDocumentDetails(props.documentId);
        if (currentDocument.value?.versions?.length) {
            const latest = currentDocument.value.versions[currentDocument.value.versions.length - 1];
            await loadPdfFromVersionId(latest.id);
        }
    } catch (e) {
        console.error('Error cargando documento:', e);
    } finally {
        isRenderingPdf.value = false;
    }
};

// ─── PDF.js loading ───────────────────────────────────────────────
const loadPdfFromVersionId = async (versionId) => {
    isRenderingPdf.value = true;
    destroyPdf();
    try {
        const response = await apiClient.get(`/documents/versions/${versionId}/stream`, { responseType: 'blob' });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        currentBlobUrl = URL.createObjectURL(blob);
        currentVersionId.value = versionId; // trackear la versión activa

        const loadingTask = getDocument(currentBlobUrl);
        pdfDoc = await loadingTask.promise;
        totalPages.value = pdfDoc.numPages;
        currentPage.value = 1;
        await renderCurrentPage();
    } catch (e) {
        console.error('Error cargando PDF:', e);
    } finally {
        isRenderingPdf.value = false;
    }
};

/**
 * Descarga la versión del PDF actualmente visible.
 * GET /api/documents/versions/{id}/download →  Content-Disposition: attachment
 */
const downloadCurrentPdf = async () => {
    if (!currentVersionId.value || isDownloading.value) return;
    isDownloading.value = true;
    try {
        const response = await apiClient.get(`/documents/versions/${currentVersionId.value}/download`, {
            responseType: 'blob'
        });
        const url = URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = ''; // el servidor define el nombre via Content-Disposition
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Error descargando PDF:', e);
    } finally {
        isDownloading.value = false;
    }
};

const renderCurrentPage = async () => {
    await nextTick();
    if (!pdfDoc || !pdfCanvas.value) return;
    isRenderingPdf.value = true;
    try {
        const page = await pdfDoc.getPage(currentPage.value);
        const viewport = page.getViewport({ scale: 1 });

        // Store page dimensions in mm for coordinate conversion
        pageWidthMm.value = (viewport.width / 72) * 25.4;
        pageHeightMm.value = (viewport.height / 72) * 25.4;

        // Scale to fill container width
        const containerWidth = canvasWrapper.value?.clientWidth || 700;
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = pdfCanvas.value;
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
    } finally {
        isRenderingPdf.value = false;
    }
};

const goToPrevPage = async () => {
    if (currentPage.value > 1) {
        currentPage.value--;
        await renderCurrentPage();
    }
};
const goToNextPage = async () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++;
        await renderCurrentPage();
    }
};

// ─── Drag / Resize state ───────────────────────────────────────────────
/**
 * dragState: información del arrastre o redimensionado en curso.
 * type: 'drag' | 'resize'
 * zoneType: 'firma' | 'sello'
 * idx: índice global en signatureZones o índice local en stampZones.get(selloId)
 * selloId: solo para zonas de sello
 * startX/Y: posición inicial del ratón (px relativo al overlay)
 * startZone: snapshot de la zona al inicio del drag
 * overlayRect: BoundingClientRect del overlay al inicio
 * corner: para resize, cuál esquina ('se'|'sw'|'ne'|'nw')
 */
const dragState = ref(null); // reactivo para el binding de CSS del overlay
let isDragOperation = false; // no reactivo (solo guarda para bloquear el click)

const overlayRef = ref(null);

// ─── Zone computed ─────────────────────────────────────────────────────────
const currentPageZones = computed(() => signatureZones.value.map((z, i) => ({ ...z, _idx: i, _type: 'firma' })).filter((z) => z.page === currentPage.value));

const currentPageStampZones = computed(() => {
    const result = [];
    stampZones.value.forEach((zones, sello_id) => {
        zones.forEach((z, zoneIdx) => {
            if (z.page === currentPage.value) {
                result.push({ ...z, sello_id, _zoneIdx: zoneIdx, _type: 'sello', _blobUrl: stampBlobUrls.value[sello_id] ?? null });
            }
        });
    });
    return result;
});

// Zones positioned as percentages of page dimensions (responsive to canvas size)
const getZoneStyle = (z) => ({
    left: (z.x / pageWidthMm.value) * 100 + '%',
    top: (z.y / pageHeightMm.value) * 100 + '%',
    width: (z.w / pageWidthMm.value) * 100 + '%',
    height: (z.h / pageHeightMm.value) * 100 + '%'
});

const pxToMm = (px, overlayPx, pageMm) => (px / overlayPx) * pageMm;

/** Clamp un valor entre min y max */
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

const updateSignatureZone = (idx, patch) => {
    const zones = [...signatureZones.value];
    zones[idx] = { ...zones[idx], ...patch };
    signatureZones.value = zones;
};

const updateStampZoneEntry = (selloId, zoneIdx, patch) => {
    const zones = stampZones.value.get(selloId);
    if (!zones) return;
    const newZones = [...zones];
    newZones[zoneIdx] = { ...newZones[zoneIdx], ...patch };
    const newMap = new Map(stampZones.value);
    newMap.set(selloId, newZones);
    stampZones.value = newMap;
};

/** Inicia arrastre de una zona completa (mover) */
const startDragZone = (e, zoneType, idx, selloId = null) => {
    if (rightPanelMode.value !== 'placing') return;
    e.stopPropagation();
    e.preventDefault();
    const rect = overlayRef.value.getBoundingClientRect();
    const zone = zoneType === 'firma' ? signatureZones.value[idx] : stampZones.value.get(selloId)?.[idx];
    if (!zone) return;
    dragState.value = {
        type: 'drag',
        zoneType,
        idx,
        selloId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startZone: { ...zone },
        overlayRect: rect
    };
    isDragOperation = false;
};

/** Inicia redimensionado desde una esquina */
const startResizeZone = (e, corner, zoneType, idx, selloId = null) => {
    if (rightPanelMode.value !== 'placing') return;
    e.stopPropagation();
    e.preventDefault();
    const rect = overlayRef.value.getBoundingClientRect();
    const zone = zoneType === 'firma' ? signatureZones.value[idx] : stampZones.value.get(selloId)?.[idx];
    if (!zone) return;
    dragState.value = {
        type: 'resize',
        corner,
        zoneType,
        idx,
        selloId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startZone: { ...zone },
        overlayRect: rect
    };
    isDragOperation = false;
};

/** Mouse move en el overlay: actualiza zona si hay drag activo */
const onOverlayMouseMove = (e) => {
    if (!dragState.value) return;
    isDragOperation = true;

    const ds = dragState.value;
    const dx = e.clientX - ds.startMouseX;
    const dy = e.clientY - ds.startMouseY;
    const overlayW = ds.overlayRect.width;
    const overlayH = ds.overlayRect.height;
    const dxMm = pxToMm(dx, overlayW, pageWidthMm.value);
    const dyMm = pxToMm(dy, overlayH, pageHeightMm.value);
    const sz = ds.startZone;

    let patch = {};
    if (ds.type === 'drag') {
        const newX = clamp(sz.x + dxMm, 0, pageWidthMm.value - sz.w);
        const newY = clamp(sz.y + dyMm, 0, pageHeightMm.value - sz.h);
        patch = { x: parseFloat(newX.toFixed(1)), y: parseFloat(newY.toFixed(1)) };
    } else {
        // resize
        const MIN_SIZE = 10;
        let { x, y, w, h } = sz;
        if (ds.corner === 'se') {
            w = clamp(sz.w + dxMm, MIN_SIZE, pageWidthMm.value - sz.x);
            h = clamp(sz.h + dyMm, MIN_SIZE, pageHeightMm.value - sz.y);
        } else if (ds.corner === 'sw') {
            const newX = clamp(sz.x + dxMm, 0, sz.x + sz.w - MIN_SIZE);
            w = sz.x + sz.w - newX;
            h = clamp(sz.h + dyMm, MIN_SIZE, pageHeightMm.value - sz.y);
            x = newX;
        } else if (ds.corner === 'ne') {
            w = clamp(sz.w + dxMm, MIN_SIZE, pageWidthMm.value - sz.x);
            const newY = clamp(sz.y + dyMm, 0, sz.y + sz.h - MIN_SIZE);
            h = sz.y + sz.h - newY;
            y = newY;
        } else {
            // nw
            const newX = clamp(sz.x + dxMm, 0, sz.x + sz.w - MIN_SIZE);
            const newY = clamp(sz.y + dyMm, 0, sz.y + sz.h - MIN_SIZE);
            w = sz.x + sz.w - newX;
            h = sz.y + sz.h - newY;
            x = newX;
            y = newY;
        }
        patch = {
            x: parseFloat(x.toFixed(1)),
            y: parseFloat(y.toFixed(1)),
            w: parseFloat(w.toFixed(1)),
            h: parseFloat(h.toFixed(1))
        };
    }

    if (ds.zoneType === 'firma') {
        updateSignatureZone(ds.idx, patch);
    } else {
        updateStampZoneEntry(ds.selloId, ds.idx, patch);
    }
};

/** Mouse up: termina drag/resize */
const onOverlayMouseUp = () => {
    dragState.value = null;
    setTimeout(() => {
        isDragOperation = false;
    }, 0);
};

/** Click en el overlay para COLOCAR una zona nueva */
const handlePdfClick = (e) => {
    if (rightPanelMode.value !== 'placing') return;
    if (isDragOperation) return; // fue parte de un drag, ignorar
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    if (activeStampId.value !== null) {
        const zoneW = 40;
        const zoneH = 40;
        let x = relX * pageWidthMm.value - zoneW / 2;
        let y = relY * pageHeightMm.value - zoneH / 2;
        x = clamp(x, 0, pageWidthMm.value - zoneW);
        y = clamp(y, 0, pageHeightMm.value - zoneH);
        const newZone = { page: currentPage.value, x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)), w: zoneW, h: zoneH };
        const existingZones = stampZones.value.get(activeStampId.value) ?? [];
        const newMap = new Map(stampZones.value);
        newMap.set(activeStampId.value, [...existingZones, newZone]);
        stampZones.value = newMap;
    } else if (!stampOnlyMode.value) {
        const zoneW = 60;
        const zoneH = 20;
        let x = relX * pageWidthMm.value - zoneW / 2;
        let y = relY * pageHeightMm.value - zoneH / 2;
        x = clamp(x, 0, pageWidthMm.value - zoneW);
        y = clamp(y, 0, pageHeightMm.value - zoneH);
        signatureZones.value.push({ page: currentPage.value, x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)), w: zoneW, h: zoneH });
    }
};

const removeZone = (globalIdx) => {
    signatureZones.value.splice(globalIdx, 1);
};

const removeStampZone = (sello_id, zoneIdx) => {
    const zones = stampZones.value.get(sello_id);
    if (!zones) return;
    const newZones = zones.filter((_, i) => i !== zoneIdx);
    const newMap = new Map(stampZones.value);
    if (newZones.length === 0) newMap.delete(sello_id);
    else newMap.set(sello_id, newZones);
    stampZones.value = newMap;
};

/**
 * Coloca el sello activo justo debajo de la última zona de firma en la página actual.
 * Si no hay firma en esta página, usa el centro del PDF.
 */
const placeStampBelowFirma = () => {
    if (activeStampId.value === null) return;
    const PAGE_GAP_MM = 3; // separación entre firma y sello
    const zoneW = 40;
    const zoneH = 40;

    // Buscar la última zona de firma en la página actual
    const firmaZonesOnPage = signatureZones.value.filter((z) => z.page === currentPage.value);
    let x, y;
    if (firmaZonesOnPage.length > 0) {
        const firmaRef = firmaZonesOnPage[firmaZonesOnPage.length - 1];
        // Centrar horizontalmente con la firma, y colocar debajo
        x = clamp(firmaRef.x + (firmaRef.w - zoneW) / 2, 0, pageWidthMm.value - zoneW);
        y = clamp(firmaRef.y + firmaRef.h + PAGE_GAP_MM, 0, pageHeightMm.value - zoneH);
    } else {
        x = parseFloat(((pageWidthMm.value - zoneW) / 2).toFixed(1));
        y = parseFloat(((pageHeightMm.value - zoneH) / 2).toFixed(1));
    }

    const newZone = { page: currentPage.value, x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)), w: zoneW, h: zoneH };
    const existingZones = stampZones.value.get(activeStampId.value) ?? [];
    const newMap = new Map(stampZones.value);
    newMap.set(activeStampId.value, [...existingZones, newZone]);
    stampZones.value = newMap;
};

// ─── Auth + active step ───────────────────────────────────────────
const currentUser = computed(() => authStore.state.user);

const activeStep = computed(() => {
    if (!currentDocument.value?.steps) return null;
    return [...currentDocument.value.steps].sort((a, b) => a.orden - b.orden).find((s) => s.estado_paso === 'Pendiente' || s.estado_paso === 'Notificado');
});

const canActOnCurrentStep = computed(() => {
    if (!activeStep.value || !currentUser.value) return false;
    const isUser = activeStep.value.permitted_users?.some((u) => String(u) === String(currentUser.value.id) || (u?.id && String(u.id) === String(currentUser.value.id)));
    const isPosition = activeStep.value.permitted_positions?.includes(currentUser.value.position);
    return isUser || isPosition;
});

const sortedSteps = computed(() => {
    if (!currentDocument.value?.steps) return [];
    return [...currentDocument.value.steps].sort((a, b) => a.orden - b.orden);
});

// ─── Signature canvas ─────────────────────────────────────────────
const initCanvas = () => {
    const canvas = signatureCanvas.value;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    canvasCtx = canvas.getContext('2d');
    canvasCtx.strokeStyle = '#1e3a5f';
    canvasCtx.lineWidth = 2.5;
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';
};

const getEventPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
};

const startDrawing = (e) => {
    isDrawing = true;
    const pos = getEventPos(e, signatureCanvas.value);
    canvasCtx.beginPath();
    canvasCtx.moveTo(pos.x, pos.y);
    e.preventDefault();
};
const draw = (e) => {
    if (!isDrawing) return;
    const pos = getEventPos(e, signatureCanvas.value);
    canvasCtx.lineTo(pos.x, pos.y);
    canvasCtx.stroke();
    e.preventDefault();
};
const stopDrawing = () => {
    isDrawing = false;
};

const clearSignature = () => {
    if (!canvasCtx || !signatureCanvas.value) return;
    canvasCtx.clearRect(0, 0, signatureCanvas.value.width, signatureCanvas.value.height);
};

const isCanvasEmpty = () => {
    if (!signatureCanvas.value || !canvasCtx) return true;
    const data = canvasCtx.getImageData(0, 0, signatureCanvas.value.width, signatureCanvas.value.height).data;
    return !new Uint32Array(data.buffer).some((c) => c !== 0);
};

// ─── Approve flow ──────────────────────────────────────────────────
const handleApprove = async () => {
    if (!activeStep.value) return;
    if (activeStep.value.tipo_accion === 'Firma') {
        signatureZones.value = [];
        signatureDataUrl.value = null;
        rightPanelMode.value = 'drawing';
        await nextTick();
        initCanvas();
    } else if (activeStep.value.tipo_accion === 'Edición') {
        edicionFile.value = null;
        showEdicionDialog.value = true;
    } else {
        // Visto Bueno
        await submitApproveWithPayload({});
    }
};

/** Saltar dibujo y entrar directamente al modo colocar (solo sellos) */
const goToPlacingWithStampsOnly = async () => {
    stampOnlyMode.value = true;
    signatureDataUrl.value = null;
    signatureZones.value = [];
    rightPanelMode.value = 'placing';
    await loadStampsIfNeeded();
};

const loadStampsIfNeeded = async () => {
    if (stampsList.value.length === 0) {
        await loadStamps();
    }
    // Precargar Blob URLs de los sellos disponibles
    for (const stamp of stampsList.value) {
        if (!stampBlobUrls.value[stamp.id]) {
            const url = await getStampBlobUrl(stamp.id);
            if (url) stampBlobUrls.value = { ...stampBlobUrls.value, [stamp.id]: url };
        }
    }
};

const goToPlacingMode = async () => {
    if (!stampOnlyMode.value && isCanvasEmpty()) return;
    if (!stampOnlyMode.value) {
        signatureDataUrl.value = signatureCanvas.value.toDataURL('image/png');
    }
    rightPanelMode.value = 'placing';
    await loadStampsIfNeeded();
};

const cancelSigning = () => {
    rightPanelMode.value = 'view';
    signatureZones.value = [];
    signatureDataUrl.value = null;
    stampZones.value = new Map();
    activeStampId.value = null;
    stampOnlyMode.value = false;
    clearSignature();
};

/** Computa el payload correcto según lo que el usuario haya seleccionado */
const buildSignPayload = () => {
    const payload = {};
    const hasSignature = signatureDataUrl.value && signatureZones.value.length > 0;
    const stampEntries = [];
    stampZones.value.forEach((zones, sello_id) => {
        if (zones.length > 0) {
            stampEntries.push({ sello_id, posicion: zones });
        }
    });
    const hasStamps = stampEntries.length > 0;

    if (hasSignature) {
        payload.firma_base64 = signatureDataUrl.value;
        payload.posicion = signatureZones.value;
    }
    if (hasStamps) {
        payload.sellos = stampEntries;
    }
    return { payload, hasSignature, hasStamps };
};

const canSubmitFinal = computed(() => {
    const hasSignature = signatureDataUrl.value && signatureZones.value.length > 0;
    let hasStamps = false;
    stampZones.value.forEach((zones) => {
        if (zones.length > 0) hasStamps = true;
    });
    return hasSignature || hasStamps;
});

const submitFinalPayload = async () => {
    const { payload, hasSignature, hasStamps } = buildSignPayload();
    if (!hasSignature && !hasStamps) return;
    await submitApproveWithPayload(payload);
    clearSignature();
};

const submitApproveWithPayload = async (payload) => {
    isSubmitting.value = true;
    try {
        const response = await signDocumentStep(activeStep.value.id, payload);
        const versionId = response?.data?.step?.version_generada_id ?? null;
        await fetchDocumentDetails(props.documentId);
        if (versionId) {
            await loadPdfFromVersionId(versionId);
        } else {
            if (currentDocument.value?.versions?.length) {
                const latest = currentDocument.value.versions[currentDocument.value.versions.length - 1];
                await loadPdfFromVersionId(latest.id);
            }
        }
        rightPanelMode.value = 'view';
        signatureZones.value = [];
        signatureDataUrl.value = null;
        stampZones.value = new Map();
        activeStampId.value = null;
        stampOnlyMode.value = false;
        emit('document-action');
    } catch {
        // Toast handled by composable
    } finally {
        isSubmitting.value = false;
        showEdicionDialog.value = false;
    }
};

// ─── Edición ──────────────────────────────────────────────────────
const handleEdicionFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024) return;
    edicionFile.value = file;
};

const submitEdicion = async () => {
    if (!edicionFile.value) return;
    const fd = new FormData();
    fd.append('file', edicionFile.value);
    await submitApproveWithPayload(fd);
    edicionFile.value = null;
};

// ─── Reject ───────────────────────────────────────────────────────
const submitReject = async () => {
    if (!activeStep.value || !rejectComment.value.trim()) return;
    try {
        await rejectDocumentStep(activeStep.value.id, rejectComment.value);
        showRejectDialog.value = false;
        await loadDocument();
        emit('document-action');
    } catch (e) {
        console.error(e);
    }
};

// ─── Comments ─────────────────────────────────────────────────────
const submitComment = async () => {
    if (!newComment.value.trim()) return;
    isAddingComment.value = true;
    try {
        await addDocumentComment(props.documentId, { comentario: newComment.value });
        newComment.value = '';
        await fetchDocumentDetails(props.documentId);
    } finally {
        isAddingComment.value = false;
    }
};

// ─── Utils ────────────────────────────────────────────────────────
const formatDate = (v) => {
    if (!v) return '';
    return new Date(v).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getStepDotClass = (estado) => {
    const map = { Completado: 'dot-done', Pendiente: 'dot-pending', Notificado: 'dot-notified', Rechazado: 'dot-rejected' };
    return map[estado] || 'dot-default';
};
const getStepIcon = (estado) => {
    const map = { Completado: 'pi pi-check', Pendiente: 'pi pi-clock', Notificado: 'pi pi-bell', Rechazado: 'pi pi-times' };
    return map[estado] || 'pi pi-circle';
};
const getStepBadgeClass = (estado) => {
    const map = { Completado: 'badge-done', Pendiente: 'badge-pending', Notificado: 'badge-notified', Rechazado: 'badge-rejected' };
    return map[estado] || 'badge-default';
};
const getDocStatusClass = (estado) => {
    const map = { Pendiente: 'doc-status-pending', 'En revisión': 'doc-status-review', Finalizado: 'doc-status-done', 'En corrección': 'doc-status-correction' };
    return map[estado] || 'doc-status-pending';
};
const getActionTypeLabel = (tipo) => {
    const map = { Firma: 'Firmar documento', Edición: 'Subir versión editada', 'Visto Bueno': 'Dar visto bueno' };
    return map[tipo] || tipo;
};
const getActionTypeIcon = (tipo) => {
    const map = { Firma: 'pi pi-pencil', Edición: 'pi pi-upload', 'Visto Bueno': 'pi pi-check-circle' };
    return map[tipo] || 'pi pi-check';
};
const getSeverityClass = (status) => getSeverity(status);

// Usa permitted_users_info (objetos con nombre) si está disponible, sino muestra cantidad
const formatPermittedUsers = (step) => {
    const info = step.permitted_users_info;
    if (info?.length) return info.map((u) => u.name).join(', ');
    const count = step.permitted_users?.length;
    if (!count) return '';
    return count === 1 ? '1 usuario asignado' : `${count} usuarios asignados`;
};
</script>

<template>
    <!-- ═══════════════════ DIÁLOGO PRINCIPAL ═══════════════════ -->
    <Dialog
        :visible="visible"
        @update:visible="$emit('update:visible', $event)"
        modal
        maximizable
        :style="{ width: '93vw', maxWidth: '1400px', height: '92vh' }"
        :breakpoints="{ '1200px': '96vw', '768px': '100vw' }"
        class="doc-viewer-dialog"
        :pt="{ header: { style: 'padding: 1rem 1.5rem; flex-shrink: 0;' } }"
    >
        <!-- Header compacto clínico -->
        <template #header>
            <div v-if="currentDocument" class="doc-viewer-header">
                <div class="dh-left">
                    <div class="dh-icon">
                        <i class="pi pi-file-pdf"></i>
                    </div>
                    <div class="dh-info">
                        <span class="dh-title">{{ currentDocument.titulo }}</span>
                        <div class="dh-meta">
                            <span :class="['doc-status-badge', getDocStatusClass(currentDocument.estado_actual)]">
                                {{ currentDocument.estado_actual }}
                            </span>
                            <span class="dh-creator">
                                <i class="pi pi-user dh-creator-icon"></i>
                                {{ currentDocument.creador?.name ?? 'Desconocido' }}
                                &nbsp;·&nbsp;
                                {{ formatDate(currentDocument.created_at) }}
                            </span>
                        </div>
                    </div>
                </div>
                <!-- Indicador de modo firma -->
                <div v-if="rightPanelMode !== 'view'" class="dh-mode-indicator">
                    <div class="mode-step-badge">
                        <i class="pi pi-pencil mr-1" style="font-size: 0.7rem"></i>
                        {{ rightPanelMode === 'drawing' ? 'Paso 1 / 2 — Dibujando firma' : 'Paso 2 / 2 — Colocando firma' }}
                    </div>
                </div>

                <!-- Botón de descarga PDF (siempre visible cuando hay documento cargado) -->
                <Button
                    v-if="currentVersionId"
                    icon="pi pi-download"
                    :loading="isDownloading"
                    :label="isDownloading ? 'Descargando...' : 'Descargar PDF'"
                    size="small"
                    severity="secondary"
                    outlined
                    class="dh-download-btn"
                    @click="downloadCurrentPdf"
                    title="Descargar versión actual del PDF"
                />
            </div>
            <div v-else class="dh-loading">
                <i class="pi pi-spin pi-spinner text-sky-500 mr-2"></i>
                Cargando documento...
            </div>
        </template>

        <!-- Layout principal -->
        <div v-if="currentDocument" class="doc-viewer-layout">
            <!-- ══════ PANEL IZQUIERDO: PDF ══════ -->
            <div class="pdf-panel" :class="{ 'placing-active': rightPanelMode === 'placing' }">
                <!-- Banner modo colocación -->
                <div v-if="rightPanelMode === 'placing'" class="placing-banner">
                    <i class="pi pi-map-marker mr-2"></i>
                    <span v-if="activeStampId !== null">
                        Clic en el documento para colocar el sello
                        <strong>{{ stampsList.find((s) => s.id === activeStampId)?.nombre ?? 'Sello' }}</strong>
                    </span>
                    <span v-else-if="!stampOnlyMode">Haz clic en el documento para colocar tu firma</span>
                    <span v-else>Selecciona un sello del panel derecho y haz clic en el PDF para colocarlo</span>
                    <span class="placing-hint">· Clic sobre una zona existente para eliminarla</span>
                </div>

                <!-- Área de canvas -->
                <div class="pdf-canvas-area">
                    <!-- Loading overlay -->
                    <div v-if="isRenderingPdf || isLoading" class="pdf-loading-overlay">
                        <div class="pdf-loading-inner">
                            <div class="pdf-loading-spinner"></div>
                            <span>Cargando documento...</span>
                        </div>
                    </div>

                    <!-- Canvas wrapper con overlay interactivo -->
                    <div v-show="!isRenderingPdf" class="canvas-wrapper" ref="canvasWrapper">
                        <canvas ref="pdfCanvas" class="pdf-canvas-el"></canvas>

                        <!-- Overlay de zonas — siempre presente, interactivo solo en 'placing' -->
                        <div
                            ref="overlayRef"
                            class="zones-overlay"
                            :class="{ 'zones-overlay--active': rightPanelMode === 'placing', 'zones-overlay--dragging': !!dragState }"
                            @click="handlePdfClick"
                            @mousemove="onOverlayMouseMove"
                            @mouseup="onOverlayMouseUp"
                            @mouseleave="onOverlayMouseUp"
                        >
                            <!-- Zonas de firma -->
                            <div v-for="z in currentPageZones" :key="'sig-' + z._idx" class="zone-marker zone-marker--firma" :style="getZoneStyle(z)" @mousedown.stop="startDragZone($event, 'firma', z._idx)">
                                <img v-if="signatureDataUrl" :src="signatureDataUrl" class="zone-sig-img" />
                                <span class="zone-label">Firma</span>
                                <!-- Resize handles (4 esquinas) -->
                                <span class="resize-handle rh-nw" @mousedown.stop="startResizeZone($event, 'nw', 'firma', z._idx)"></span>
                                <span class="resize-handle rh-ne" @mousedown.stop="startResizeZone($event, 'ne', 'firma', z._idx)"></span>
                                <span class="resize-handle rh-sw" @mousedown.stop="startResizeZone($event, 'sw', 'firma', z._idx)"></span>
                                <span class="resize-handle rh-se" @mousedown.stop="startResizeZone($event, 'se', 'firma', z._idx)"></span>
                                <!-- Único botón para eliminar -->
                                <button class="zone-delete-btn" @mousedown.stop @click.stop="removeZone(z._idx)" title="Eliminar zona">×</button>
                            </div>

                            <!-- Zonas de sellos -->
                            <div
                                v-for="sz in currentPageStampZones"
                                :key="'stamp-' + sz.sello_id + '-' + sz._zoneIdx"
                                class="zone-marker zone-marker--sello"
                                :style="getZoneStyle(sz)"
                                @mousedown.stop="startDragZone($event, 'sello', sz._zoneIdx, sz.sello_id)"
                            >
                                <img v-if="sz._blobUrl" :src="sz._blobUrl" class="zone-sig-img" />
                                <i v-else class="pi pi-stamp zone-stamp-icon"></i>
                                <span class="zone-label zone-label--sello">Sello</span>
                                <!-- Resize handles -->
                                <span class="resize-handle rh-nw" @mousedown.stop="startResizeZone($event, 'nw', 'sello', sz._zoneIdx, sz.sello_id)"></span>
                                <span class="resize-handle rh-ne" @mousedown.stop="startResizeZone($event, 'ne', 'sello', sz._zoneIdx, sz.sello_id)"></span>
                                <span class="resize-handle rh-sw" @mousedown.stop="startResizeZone($event, 'sw', 'sello', sz._zoneIdx, sz.sello_id)"></span>
                                <span class="resize-handle rh-se" @mousedown.stop="startResizeZone($event, 'se', 'sello', sz._zoneIdx, sz.sello_id)"></span>
                                <!-- botón eliminar -->
                                <button class="zone-delete-btn zone-delete-btn--sello" @mousedown.stop @click.stop="removeStampZone(sz.sello_id, sz._zoneIdx)" title="Eliminar zona">×</button>
                            </div>
                        </div>
                    </div>

                    <!-- Sin PDF -->
                    <div v-if="!isRenderingPdf && !isLoading && !pdfDoc" class="pdf-empty">
                        <i class="pi pi-file-pdf pdf-empty-icon"></i>
                        <p class="pdf-empty-title">Vista previa no disponible</p>
                        <p class="pdf-empty-sub">No se pudo cargar el documento.</p>
                    </div>
                </div>

                <!-- Barra de navegación de páginas -->
                <div v-if="totalPages > 0" class="pdf-nav-bar">
                    <Button icon="pi pi-chevron-left" text size="small" @click="goToPrevPage" :disabled="currentPage <= 1 || isRenderingPdf" class="nav-btn" />
                    <span class="nav-page-info">
                        Página <strong>{{ currentPage }}</strong> de <strong>{{ totalPages }}</strong>
                    </span>
                    <Button icon="pi pi-chevron-right" text size="small" @click="goToNextPage" :disabled="currentPage >= totalPages || isRenderingPdf" class="nav-btn" />
                    <div v-if="rightPanelMode === 'placing' && signatureZones.length > 0" class="nav-zones-count"><i class="pi pi-map-marker mr-1"></i>{{ signatureZones.length }} zona{{ signatureZones.length !== 1 ? 's' : '' }}</div>
                </div>
            </div>

            <!-- ══════ PANEL DERECHO: CONTEXTO ══════ -->
            <div class="context-panel">
                <!-- ── MODO: VIEW ── -->
                <div v-if="rightPanelMode === 'view'" class="panel-view">
                    <!-- Acción requerida -->
                    <div v-if="canActOnCurrentStep && activeStep" class="action-card">
                        <div class="action-card-header">
                            <div class="action-card-badge">
                                <i class="pi pi-bolt"></i>
                            </div>
                            <div>
                                <p class="action-card-title">Acción requerida</p>
                                <p class="action-card-type">{{ activeStep.tipo_accion }}</p>
                            </div>
                        </div>
                        <p class="action-card-desc">{{ getActionTypeLabel(activeStep.tipo_accion) }}</p>
                        <div class="action-card-btns">
                            <Button :label="getActionTypeLabel(activeStep.tipo_accion)" :icon="getActionTypeIcon(activeStep.tipo_accion)" class="btn-action-primary" @click="handleApprove" :loading="isSubmitting" />
                            <Button
                                label="Rechazar"
                                icon="pi pi-times"
                                class="btn-action-reject"
                                outlined
                                @click="
                                    showRejectDialog = true;
                                    rejectComment = '';
                                "
                                :disabled="isSubmitting"
                            />
                        </div>
                    </div>

                    <!-- Descripción -->
                    <div v-if="currentDocument.descripcion" class="panel-section">
                        <p class="section-label">Descripción</p>
                        <p class="section-text">{{ currentDocument.descripcion }}</p>
                    </div>

                    <!-- Flujo de aprobación -->
                    <div class="panel-section panel-section--grow">
                        <p class="section-label">Flujo de aprobación</p>
                        <div class="approval-timeline">
                            <div v-for="(step, i) in sortedSteps" :key="step.id" class="timeline-item">
                                <div class="timeline-indicator">
                                    <div :class="['timeline-dot', getStepDotClass(step.estado_paso)]">
                                        <i :class="getStepIcon(step.estado_paso)"></i>
                                    </div>
                                    <div v-if="i < sortedSteps.length - 1" class="timeline-connector"></div>
                                </div>
                                <div class="timeline-content">
                                    <div class="timeline-row">
                                        <span class="timeline-title">Paso {{ step.orden }}: {{ step.tipo_accion }}</span>
                                        <span :class="['step-badge', getStepBadgeClass(step.estado_paso)]">{{ step.estado_paso }}</span>
                                    </div>
                                    <p v-if="step.user_signed" class="timeline-meta"><i class="pi pi-user"></i> {{ step.user_signed.name }}</p>
                                    <template v-else>
                                        <p v-if="step.permitted_positions?.length" class="timeline-meta">
                                            <i class="pi pi-id-card"></i>
                                            {{ step.permitted_positions.join(', ') }}
                                        </p>
                                        <p v-if="step.permitted_users?.length" class="timeline-meta">
                                            <i class="pi pi-user"></i>
                                            {{ formatPermittedUsers(step) }}
                                        </p>
                                        <p v-if="!step.permitted_positions?.length && !step.permitted_users?.length" class="timeline-meta"><i class="pi pi-minus"></i> Sin asignar</p>
                                    </template>
                                    <p v-if="step.fecha_accion" class="timeline-date"><i class="pi pi-calendar"></i> {{ formatDate(step.fecha_accion) }}</p>
                                    <p v-if="step.comentario" class="timeline-rejection"><i class="pi pi-exclamation-triangle"></i> {{ step.comentario }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Comentarios -->
                    <div class="panel-section">
                        <p class="section-label">
                            Comentarios
                            <span v-if="currentDocument.comments?.length" class="comments-count">{{ currentDocument.comments.length }}</span>
                        </p>
                        <div v-if="currentDocument.comments?.length" class="comments-list">
                            <div v-for="c in currentDocument.comments" :key="c.id" class="comment-item">
                                <div class="comment-avatar">{{ (c.usuario?.name ?? 'U').charAt(0).toUpperCase() }}</div>
                                <div class="comment-body">
                                    <div class="comment-header">
                                        <span class="comment-author">{{ c.usuario?.name ?? 'Usuario' }}</span>
                                        <span class="comment-date">{{ formatDate(c.created_at) }}</span>
                                    </div>
                                    <p class="comment-text">{{ c.comentario }}</p>
                                </div>
                            </div>
                        </div>
                        <p v-else class="comments-empty">Sin comentarios aún.</p>
                        <div class="comment-input-row">
                            <Textarea v-model="newComment" rows="2" placeholder="Escribe un comentario..." class="comment-textarea" style="resize: none" />
                            <Button icon="pi pi-send" class="btn-comment-send" :loading="isAddingComment" :disabled="!newComment.trim()" @click="submitComment" v-tooltip.left="'Enviar'" />
                        </div>
                    </div>
                </div>

                <!-- ── MODO: DRAWING (Paso 1) ── -->
                <div v-else-if="rightPanelMode === 'drawing'" class="panel-signing">
                    <div class="signing-header">
                        <div class="signing-step-indicator">
                            <div class="signing-step-dot active">1</div>
                            <div class="signing-step-line"></div>
                            <div class="signing-step-dot">2</div>
                        </div>
                        <h3 class="signing-title">Dibuja tu firma</h3>
                        <p class="signing-hint">Usa el mouse o el dedo sobre el área blanca. En el siguiente paso seleccionarás dónde colocarla en el documento.</p>
                    </div>

                    <div class="sig-canvas-wrapper">
                        <canvas
                            ref="signatureCanvas"
                            class="sig-canvas"
                            @mousedown="startDrawing"
                            @mousemove="draw"
                            @mouseup="stopDrawing"
                            @mouseleave="stopDrawing"
                            @touchstart.prevent="startDrawing"
                            @touchmove.prevent="draw"
                            @touchend="stopDrawing"
                        ></canvas>
                        <span class="sig-canvas-label">Área de firma</span>
                    </div>

                    <div class="signing-actions">
                        <Button label="Limpiar" icon="pi pi-eraser" text severity="secondary" size="small" @click="clearSignature" />
                    </div>

                    <!-- Botón 'Solo sellos' para saltar el dibujo -->
                    <div class="stamps-only-shortcut">
                        <p class="stamps-only-label">¿No necesitas firma dibujada?</p>
                        <Button label="Solo estampar sellos" icon="pi pi-stamp" severity="secondary" outlined size="small" class="btn-stamps-only" @click="goToPlacingWithStampsOnly" />
                    </div>

                    <div class="signing-footer">
                        <Button label="Cancelar" icon="pi pi-times" text severity="secondary" @click="cancelSigning" />
                        <Button label="Siguiente: Colocar en PDF" icon="pi pi-arrow-right" iconPos="right" class="btn-next" @click="goToPlacingMode" />
                    </div>
                </div>

                <!-- ── MODO: PLACING (Paso 2) ── -->
                <div v-else-if="rightPanelMode === 'placing'" class="panel-signing">
                    <div class="signing-header">
                        <div class="signing-step-indicator">
                            <div :class="['signing-step-dot', stampOnlyMode ? 'active' : 'done']">1</div>
                            <div :class="['signing-step-line', stampOnlyMode ? '' : 'done']"></div>
                            <div class="signing-step-dot active">2</div>
                        </div>
                        <h3 class="signing-title">{{ stampOnlyMode ? 'Coloca tus sellos' : 'Coloca firma y sellos' }}</h3>
                        <p class="signing-hint">Haz clic en el PDF para colocar la firma o sello seleccionado. Navega entre páginas con las flechas de abajo.</p>
                    </div>

                    <!-- Preview de la firma (solo si no es solo-sellos) -->
                    <div v-if="signatureDataUrl" class="sig-preview-box">
                        <p class="sig-preview-label">Tu firma</p>
                        <div class="sig-preview-img-wrapper" :class="{ 'sig-preview--active': activeStampId === null }" @click="activeStampId = null" title="Clic para activar modo firma">
                            <img :src="signatureDataUrl" class="sig-preview-img" alt="Firma" />
                            <span v-if="activeStampId === null" class="sig-preview-active-badge">● Activo</span>
                        </div>
                    </div>

                    <!-- Panel de sellos disponibles -->
                    <div class="stamps-panel">
                        <p class="stamps-panel-title">
                            <i class="pi pi-stamp mr-1"></i>
                            Mis sellos
                            <span v-if="stampsLoading" class="ml-2"><i class="pi pi-spin pi-spinner" style="font-size: 0.75rem"></i></span>
                        </p>
                        <div v-if="!stampsLoading && stampsList.length === 0" class="stamps-panel-empty">
                            <i class="pi pi-info-circle mr-1"></i>
                            No tienes sellos. Sube uno en tu perfil.
                        </div>
                        <div v-else class="stamps-panel-list">
                            <div
                                v-for="stamp in stampsList"
                                :key="stamp.id"
                                :class="['stamp-thumb', activeStampId === stamp.id ? 'stamp-thumb--active' : '']"
                                @click="activeStampId = activeStampId === stamp.id ? null : stamp.id"
                                :title="stamp.nombre ?? 'Sello'"
                            >
                                <div class="stamp-thumb-img-wrapper">
                                    <img v-if="stampBlobUrls[stamp.id]" :src="stampBlobUrls[stamp.id]" class="stamp-thumb-img" :alt="stamp.nombre ?? 'Sello'" />
                                    <i v-else class="pi pi-spin pi-spinner stamp-thumb-spinner"></i>
                                </div>
                                <span class="stamp-thumb-name">{{ stamp.nombre ?? 'Sin nombre' }}</span>
                                <span v-if="activeStampId === stamp.id" class="stamp-thumb-badge">● Activo</span>
                            </div>
                        </div>

                        <!-- Acciones rápidas de sello (solo si hay sello activo) -->
                        <div v-if="activeStampId !== null" class="stamp-quick-actions">
                            <button class="stamp-quick-btn" @click="placeStampBelowFirma" title="Coloca el sello centrado justo debajo de la última zona de firma en esta página">
                                <i class="pi pi-arrow-down mr-1"></i>
                                <span v-if="signatureZones.filter((z) => z.page === currentPage).length > 0">Colocar debajo de la firma</span>
                                <span v-else>Colocar en el centro</span>
                            </button>
                        </div>
                    </div>

                    <!-- Lista unificada de zonas colocadas -->
                    <div class="zones-section">
                        <p class="zones-section-title">
                            Zonas colocadas
                            <span :class="['zones-badge', canSubmitFinal ? 'zones-badge--active' : '']">{{ signatureZones.length + [...stampZones.values()].reduce((s, z) => s + z.length, 0) }}</span>
                        </p>
                        <div v-if="!canSubmitFinal" class="zones-empty-hint">
                            <i class="pi pi-map-marker"></i>
                            <span v-if="activeStampId !== null">Haz clic en el PDF para colocar el sello seleccionado</span>
                            <span v-else-if="signatureDataUrl">Selecciona la firma o un sello, luego haz clic en el PDF</span>
                            <span v-else>Selecciona un sello del panel y haz clic en el PDF</span>
                        </div>
                        <div v-else class="zones-list-items">
                            <!-- Zonas de firma -->
                            <div v-for="(z, i) in signatureZones" :key="'sig-z-' + i" class="zone-list-item zone-list-item--firma">
                                <i class="pi pi-pencil zone-list-icon"></i>
                                <div class="zone-list-info">
                                    <span class="zone-list-page">Firma · Pág. {{ z.page }}</span>
                                    <span class="zone-list-coords">x:{{ z.x }} · y:{{ z.y }} mm</span>
                                </div>
                                <button class="zone-list-remove" @click="removeZone(i)" title="Eliminar">×</button>
                            </div>
                            <!-- Zonas de sellos -->
                            <template v-for="[selloId, zones] in stampZones" :key="'s-' + selloId">
                                <div v-for="(z, zi) in zones" :key="'sz-' + zi" class="zone-list-item zone-list-item--sello">
                                    <i class="pi pi-stamp zone-list-icon"></i>
                                    <div class="zone-list-info">
                                        <span class="zone-list-page">{{ stampsList.find((s) => s.id === selloId)?.nombre ?? 'Sello' }} · Pág. {{ z.page }}</span>
                                        <span class="zone-list-coords">x:{{ z.x }} · y:{{ z.y }} mm</span>
                                    </div>
                                    <button class="zone-list-remove" @click="removeStampZone(selloId, zi)" title="Eliminar">×</button>
                                </div>
                            </template>
                        </div>
                    </div>

                    <div class="signing-footer">
                        <Button label="Atrás" icon="pi pi-arrow-left" text severity="secondary" @click="stampOnlyMode ? cancelSigning() : (rightPanelMode = 'drawing')" />
                        <Button label="Confirmar" icon="pi pi-check" class="btn-confirm" :loading="isSubmitting" :disabled="!canSubmitFinal" @click="submitFinalPayload" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading inicial -->
        <div v-else class="doc-initial-loading">
            <div class="pdf-loading-spinner large"></div>
            <p>Cargando documento...</p>
        </div>
    </Dialog>

    <!-- ═══════════════════ DIÁLOGO EDICIÓN ═══════════════════ -->
    <Dialog v-model:visible="showEdicionDialog" header="Subir versión editada" :style="{ width: '440px' }" modal class="edicion-dialog">
        <div class="edicion-body">
            <p class="edicion-hint">Sube el PDF con tus correcciones. Reemplazará la versión actual en el flujo de aprobación.</p>
            <input type="file" ref="edicionFileInput" accept="application/pdf" style="display: none" @change="handleEdicionFileSelect" />
            <div class="edicion-dropzone" @click="edicionFileInput?.click()">
                <div v-if="!edicionFile" class="edicion-empty">
                    <div class="edicion-upload-icon">
                        <i class="pi pi-cloud-upload"></i>
                    </div>
                    <p class="edicion-upload-title">Haz clic para seleccionar el PDF editado</p>
                    <p class="edicion-upload-sub">Solo archivos PDF · Máximo 10 MB</p>
                </div>
                <div v-else class="edicion-file-selected">
                    <div class="edicion-file-icon">
                        <i class="pi pi-file-pdf"></i>
                    </div>
                    <div class="edicion-file-info">
                        <span class="edicion-file-name">{{ edicionFile.name }}</span>
                        <span class="edicion-file-size">{{ (edicionFile.size / 1024 / 1024).toFixed(2) }} MB</span>
                    </div>
                    <button class="edicion-file-remove" @click.stop="edicionFile = null" title="Remover">×</button>
                </div>
            </div>
        </div>
        <template #footer>
            <div class="dialog-footer">
                <Button label="Cancelar" text severity="secondary" @click="showEdicionDialog = false" />
                <Button label="Subir y completar paso" icon="pi pi-upload" class="btn-edicion-confirm" @click="submitEdicion" :loading="isSubmitting" :disabled="!edicionFile" />
            </div>
        </template>
    </Dialog>

    <!-- ═══════════════════ DIÁLOGO RECHAZO ═══════════════════ -->
    <Dialog v-model:visible="showRejectDialog" header="Rechazar documento" :style="{ width: '420px' }" modal class="reject-dialog">
        <div class="reject-body">
            <div class="reject-warning-icon">
                <i class="pi pi-exclamation-triangle"></i>
            </div>
            <p class="reject-hint">El documento será marcado como <strong>En corrección</strong> y el creador deberá revisarlo y reenviarlo.</p>
            <div class="reject-field">
                <label class="reject-label">Motivo del rechazo <span class="required">*</span></label>
                <Textarea v-model="rejectComment" rows="4" placeholder="Describe el motivo específico del rechazo..." class="reject-textarea" autofocus />
            </div>
        </div>
        <template #footer>
            <div class="dialog-footer">
                <Button label="Cancelar" text severity="secondary" @click="showRejectDialog = false" />
                <Button label="Confirmar rechazo" icon="pi pi-times-circle" class="btn-reject-confirm" @click="submitReject" :disabled="!rejectComment.trim()" />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
/* ═══════════════════ DIALOG WRAPPER ═══════════════════ */
.doc-viewer-dialog :deep(.p-dialog-content) {
    padding: 0 !important;
    overflow: hidden !important;
    flex: 1 !important;
    min-height: 0 !important;
    display: flex !important;
    flex-direction: column !important;
}

/* ═══════════════════ HEADER ═══════════════════ */
.doc-viewer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
}

.dh-left {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    min-width: 0;
}

.dh-icon {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.dh-icon i {
    font-size: 1.1rem;
    color: #0284c7;
}

.dh-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
}

.dh-title {
    font-size: 1rem;
    font-weight: 700;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 400px;
}

.dh-meta {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
}

.doc-status-badge {
    display: inline-flex;
    align-items: center;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    text-transform: uppercase;
}
.doc-status-pending {
    background: #fef9c3;
    color: #854d0e;
}
.doc-status-review {
    background: #e0f2fe;
    color: #0369a1;
}
.doc-status-done {
    background: #dcfce7;
    color: #166534;
}
.doc-status-correction {
    background: #fee2e2;
    color: #991b1b;
}

.dh-creator {
    font-size: 0.75rem;
    color: #64748b;
}
.dh-creator-icon {
    font-size: 0.7rem;
    margin-right: 0.2rem;
}

.mode-step-badge {
    background: #0284c7;
    color: white;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    white-space: nowrap;
}

.dh-loading {
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    color: #64748b;
}

/* ═══════════════════ LAYOUT ═══════════════════ */
.doc-viewer-layout {
    display: flex;
    flex: 1;
    min-height: 0; /* permite que los hijos flex se compriman y activen scroll */
    overflow: hidden;
}

/* ═══════════════════ PDF PANEL ═══════════════════ */
.pdf-panel {
    flex: 0 0 65%;
    display: flex;
    flex-direction: column;
    min-height: 0; /* crítico: permite que el panel se comprima */
    overflow: hidden;
    background: #f1f5f9;
    border-right: 1px solid #e2e8f0;
    position: relative;
    transition: background 0.2s;
}

.pdf-panel.placing-active {
    background: #f0f9ff;
}

.placing-banner {
    background: #0284c7;
    color: white;
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
}
.placing-hint {
    font-weight: 400;
    opacity: 0.85;
}

.pdf-canvas-area {
    flex: 1;
    min-height: 0; /* crítico: activa overflow-y en contenedor flex */
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.pdf-loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(241, 245, 249, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.pdf-loading-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    color: #64748b;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.pdf-loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #e2e8f0;
    border-top-color: #0284c7;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.pdf-loading-spinner.large {
    width: 48px;
    height: 48px;
}

.canvas-wrapper {
    position: relative;
    display: block;
    width: 100%;
    max-width: 860px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
    border-radius: 4px;
    overflow: hidden;
}

.pdf-canvas-el {
    display: block;
    width: 100%;
    height: auto;
}

.zones-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.zones-overlay--active {
    pointer-events: all;
    cursor: crosshair;
}

.zone-marker {
    position: absolute;
    border: 2px solid #0284c7;
    background: rgba(2, 132, 199, 0.14);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    transition:
        border-color 0.15s,
        background 0.15s;
}

.zone-marker:hover {
    border-color: #dc2626;
    background: rgba(220, 38, 38, 0.14);
}

.zone-sig-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 2px;
    pointer-events: none;
}

.zone-remove-btn {
    position: absolute;
    top: -9px;
    right: -9px;
    width: 18px;
    height: 18px;
    background: #dc2626;
    color: white;
    border-radius: 50%;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    line-height: 1;
}

.pdf-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 0.5rem;
    color: #94a3b8;
    text-align: center;
    padding: 3rem;
}
.pdf-empty-icon {
    font-size: 3.5rem;
    margin-bottom: 0.5rem;
}
.pdf-empty-title {
    font-size: 1rem;
    font-weight: 600;
    color: #64748b;
}
.pdf-empty-sub {
    font-size: 0.8rem;
}

/* ─── Nav bar ─── */
.pdf-nav-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    background: white;
    border-top: 1px solid #e2e8f0;
    flex-shrink: 0;
}

.nav-btn :deep(.p-button) {
    color: #475569;
}
.nav-page-info {
    font-size: 0.8rem;
    color: #475569;
    min-width: 100px;
    text-align: center;
}
.nav-zones-count {
    margin-left: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #0284c7;
    background: #e0f2fe;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
}

/* ═══════════════════ CONTEXT PANEL ═══════════════════ */
.context-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; /* crítico */
    background: #ffffff;
    overflow: hidden;
}

.panel-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    gap: 0;
}

/* ─── Action card ─── */
.action-card {
    padding: 1rem 1.25rem;
    background: #f0f9ff;
    border-bottom: 1px solid #bae6fd;
    border-left: 4px solid #0284c7;
    flex-shrink: 0;
}

.action-card-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin-bottom: 0.5rem;
}

.action-card-badge {
    width: 32px;
    height: 32px;
    background: #0284c7;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.action-card-badge i {
    color: white;
    font-size: 0.875rem;
}

.action-card-title {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #0369a1;
    margin: 0;
}
.action-card-type {
    font-size: 0.85rem;
    font-weight: 600;
    color: #0c4a6e;
    margin: 0;
}
.action-card-desc {
    font-size: 0.8rem;
    color: #0369a1;
    margin: 0 0 0.875rem 0;
}

.action-card-btns {
    display: flex;
    gap: 0.5rem;
}

.btn-action-primary {
    flex: 1;
    background: #0284c7 !important;
    border-color: #0284c7 !important;
    color: white !important;
    font-weight: 600;
    font-size: 0.8rem;
}
.btn-action-primary:hover {
    background: #0369a1 !important;
}

.btn-action-reject {
    font-size: 0.8rem;
    color: #dc2626 !important;
    border-color: #dc2626 !important;
}

/* ─── Panel sections ─── */
.panel-section {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #f1f5f9;
}
.panel-section--grow {
    flex: 1;
}

.section-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #94a3b8;
    margin: 0 0 0.625rem 0;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.section-text {
    font-size: 0.82rem;
    color: #475569;
    line-height: 1.6;
    margin: 0;
}

/* ─── Custom timeline ─── */
.approval-timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.timeline-item {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
}

.timeline-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 28px;
}

.timeline-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    flex-shrink: 0;
}
.dot-done {
    background: #dcfce7;
    color: #15803d;
    border: 2px solid #86efac;
}
.dot-pending {
    background: #fef9c3;
    color: #92400e;
    border: 2px solid #fde68a;
}
.dot-notified {
    background: #e0f2fe;
    color: #0369a1;
    border: 2px solid #7dd3fc;
}
.dot-rejected {
    background: #fee2e2;
    color: #991b1b;
    border: 2px solid #fca5a5;
}
.dot-default {
    background: #f1f5f9;
    color: #94a3b8;
    border: 2px solid #e2e8f0;
}

.timeline-connector {
    width: 2px;
    flex: 1;
    min-height: 12px;
    background: #e2e8f0;
    margin: 3px 0;
}

.timeline-content {
    flex: 1;
    padding-bottom: 1rem;
    min-width: 0;
}

.timeline-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
}
.timeline-title {
    font-size: 0.8rem;
    font-weight: 700;
    color: #1e293b;
}
.step-badge {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    white-space: nowrap;
    flex-shrink: 0;
}
.badge-done {
    background: #dcfce7;
    color: #166534;
}
.badge-pending {
    background: #fef9c3;
    color: #854d0e;
}
.badge-notified {
    background: #e0f2fe;
    color: #0369a1;
}
.badge-rejected {
    background: #fee2e2;
    color: #991b1b;
}
.badge-default {
    background: #f1f5f9;
    color: #64748b;
}

.timeline-meta {
    font-size: 0.75rem;
    color: #64748b;
    margin: 0 0 0.15rem 0;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.timeline-meta i {
    font-size: 0.65rem;
    flex-shrink: 0;
}

.timeline-date {
    font-size: 0.7rem;
    color: #94a3b8;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.3rem;
}
.timeline-date i {
    font-size: 0.65rem;
}

.timeline-rejection {
    font-size: 0.72rem;
    color: #dc2626;
    margin: 0.3rem 0 0 0;
    background: #fef2f2;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    display: flex;
    gap: 0.3rem;
    align-items: flex-start;
}
.timeline-rejection i {
    font-size: 0.65rem;
    margin-top: 0.1rem;
    flex-shrink: 0;
}

/* ─── Comments ─── */
.comments-count {
    background: #e2e8f0;
    color: #475569;
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    font-weight: 700;
}

.comments-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-bottom: 0.75rem;
    max-height: 180px;
    overflow-y: auto;
}

.comment-item {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
}

.comment-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #e0f2fe;
    color: #0369a1;
    font-size: 0.7rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.comment-body {
    flex: 1;
    min-width: 0;
}
.comment-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.15rem;
}
.comment-author {
    font-size: 0.75rem;
    font-weight: 700;
    color: #1e293b;
}
.comment-date {
    font-size: 0.65rem;
    color: #94a3b8;
}
.comment-text {
    font-size: 0.78rem;
    color: #475569;
    line-height: 1.5;
    margin: 0;
    word-break: break-word;
}

.comments-empty {
    font-size: 0.78rem;
    color: #94a3b8;
    margin: 0 0 0.75rem 0;
}

.comment-input-row {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
}
.comment-textarea {
    flex: 1;
    font-size: 0.8rem;
    border-radius: 8px;
}
.btn-comment-send {
    background: #0284c7 !important;
    border-color: #0284c7 !important;
    color: white !important;
    width: 36px;
    height: 36px;
    padding: 0 !important;
    flex-shrink: 0;
    border-radius: 8px !important;
}

/* ═══════════════════ SIGNING PANEL (shared drawing + placing) ═══════════════════ */
.panel-signing {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1.25rem;
    gap: 1rem;
    overflow-y: auto;
}

.signing-header {
    flex-shrink: 0;
}

/* Step indicator */
.signing-step-indicator {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 0.875rem;
}
.signing-step-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 700;
    background: #f1f5f9;
    color: #94a3b8;
    border: 2px solid #e2e8f0;
    flex-shrink: 0;
}
.signing-step-dot.active {
    background: #0284c7;
    color: white;
    border-color: #0284c7;
}
.signing-step-dot.done {
    background: #dcfce7;
    color: #15803d;
    border-color: #86efac;
}
.signing-step-line {
    flex: 1;
    height: 2px;
    background: #e2e8f0;
    max-width: 48px;
}
.signing-step-line.done {
    background: #86efac;
}

.signing-title {
    font-size: 1rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.375rem 0;
}
.signing-hint {
    font-size: 0.8rem;
    color: #64748b;
    line-height: 1.5;
    margin: 0;
}

/* Signature canvas */
.sig-canvas-wrapper {
    position: relative;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    background: #fff;
    flex: 1;
    min-height: 160px;
    max-height: 220px;
}
.sig-canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: crosshair;
}
.sig-canvas-label {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.65rem;
    color: #cbd5e1;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    pointer-events: none;
    user-select: none;
}

.signing-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: -0.5rem;
}

.signing-footer {
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 0.5rem;
    border-top: 1px solid #f1f5f9;
    flex-shrink: 0;
}

.btn-next {
    background: #0284c7 !important;
    border-color: #0284c7 !important;
    color: white !important;
    font-weight: 600;
}
.btn-confirm {
    background: #059669 !important;
    border-color: #059669 !important;
    color: white !important;
    font-weight: 600;
}

/* Signature preview (placing mode) */
.sig-preview-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.75rem;
    flex-shrink: 0;
}
.sig-preview-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #94a3b8;
    margin: 0 0 0.5rem 0;
}
.sig-preview-img-wrapper {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60px;
}
.sig-preview-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

/* Zones list (placing mode) */
.zones-section {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}
.zones-section-title {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #94a3b8;
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.zones-badge {
    background: #e2e8f0;
    color: #64748b;
    font-size: 0.65rem;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
}
.zones-badge--active {
    background: #dcfce7;
    color: #15803d;
}
.zones-empty-hint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #94a3b8;
    font-size: 0.8rem;
    padding: 0.875rem;
    background: #f8fafc;
    border: 1px dashed #e2e8f0;
    border-radius: 8px;
}
.zones-list-items {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}
.zone-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.625rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
}
.zone-list-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}
.zone-list-page {
    font-size: 0.78rem;
    font-weight: 700;
    color: #1e293b;
}
.zone-list-coords {
    font-size: 0.68rem;
    color: #94a3b8;
    font-family: monospace;
}
.zone-list-remove {
    width: 22px;
    height: 22px;
    border: none;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 50%;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 0;
    transition: background 0.15s;
}
.zone-list-remove:hover {
    background: #fca5a5;
}

/* Initial loading state */
.doc-initial-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
    color: #64748b;
    font-size: 0.875rem;
}

/* ═══════════════════ EDICIÓN DIALOG ═══════════════════ */
.edicion-body {
    padding: 0.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.edicion-hint {
    font-size: 0.82rem;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
}
.edicion-dropzone {
    border: 2px dashed #cbd5e1;
    border-radius: 10px;
    background: #f8fafc;
    cursor: pointer;
    transition:
        border-color 0.2s,
        background 0.2s;
    min-height: 110px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.edicion-dropzone:hover {
    border-color: #0284c7;
    background: #f0f9ff;
}
.edicion-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    padding: 1.5rem;
    text-align: center;
}
.edicion-upload-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #e0f2fe;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.25rem;
}
.edicion-upload-icon i {
    font-size: 1.25rem;
    color: #0284c7;
}
.edicion-upload-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: #334155;
    margin: 0;
}
.edicion-upload-sub {
    font-size: 0.72rem;
    color: #94a3b8;
    margin: 0;
}
.edicion-file-selected {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    width: 100%;
}
.edicion-file-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: #fee2e2;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.edicion-file-icon i {
    font-size: 1.25rem;
    color: #dc2626;
}
.edicion-file-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
    min-width: 0;
}
.edicion-file-name {
    font-size: 0.82rem;
    font-weight: 600;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.edicion-file-size {
    font-size: 0.72rem;
    color: #94a3b8;
}
.edicion-file-remove {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    border-radius: 4px;
    flex-shrink: 0;
}
.edicion-file-remove:hover {
    color: #dc2626;
}

.btn-edicion-confirm {
    background: #059669 !important;
    border-color: #059669 !important;
    color: white !important;
    font-weight: 600;
}

/* ═══════════════════ REJECT DIALOG ═══════════════════ */
.reject-body {
    padding: 0.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.reject-warning-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #fef2f2;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
}
.reject-warning-icon i {
    font-size: 1.375rem;
    color: #dc2626;
}
.reject-hint {
    font-size: 0.82rem;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
    text-align: center;
}
.reject-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}
.reject-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: #374151;
}
.required {
    color: #dc2626;
}
.reject-textarea {
    font-size: 0.82rem;
    border-radius: 8px;
    width: 100%;
}
.btn-reject-confirm {
    background: #dc2626 !important;
    border-color: #dc2626 !important;
    color: white !important;
    font-weight: 600;
}

/* Shared dialog footer */
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    width: 100%;
}

/* ═══════════════════ STAMP ZONES IN PDF OVERLAY ═══════════════════ */
.zone-marker--firma {
    border: 2px solid #3b82f6 !important;
    background: rgba(59, 130, 246, 0.08) !important;
    z-index: 3; /* Siempre por encima del sello */
}
.zone-marker--sello {
    border: 2px solid #f59e0b !important;
    background: rgba(245, 158, 11, 0.08) !important;
    z-index: 2;
}
.zone-stamp-icon {
    font-size: 1.3rem;
    color: #d97706;
    margin: auto;
}

/* ═══════════════════ SIGNATURE PREVIEW ACTIVE STATE ═══════════════════ */
.sig-preview-img-wrapper {
    cursor: pointer;
    position: relative;
    border: 2px solid transparent;
    border-radius: 8px;
    transition: border-color 0.2s;
}
.sig-preview--active {
    border-color: #3b82f6 !important;
}
.sig-preview-active-badge {
    position: absolute;
    top: 4px;
    right: 6px;
    font-size: 0.65rem;
    font-weight: 700;
    color: #3b82f6;
    background: rgba(219, 234, 254, 0.95);
    border-radius: 999px;
    padding: 0.1rem 0.4rem;
}

/* ═══════════════════ STAMPS PANEL (placing mode) ═══════════════════ */
.stamps-panel {
    border-top: 1px solid #e2e8f0;
    padding-top: 0.75rem;
    margin-top: 0.5rem;
}
.stamps-panel-title {
    font-size: 0.78rem;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
}
.stamps-panel-empty {
    font-size: 0.78rem;
    color: #94a3b8;
    padding: 0.4rem 0;
}
.stamps-panel-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}
.stamp-thumb {
    position: relative;
    width: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    cursor: pointer;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.35rem 0.25rem 0.3rem;
    background: #f8fafc;
    transition:
        border-color 0.2s,
        background 0.2s,
        box-shadow 0.2s;
    user-select: none;
}
.stamp-thumb:hover {
    border-color: #f59e0b;
    background: #fffbeb;
}
.stamp-thumb--active {
    border-color: #f59e0b !important;
    background: #fffbeb !important;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
}
.stamp-thumb-img-wrapper {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
}
.stamp-thumb-img {
    max-width: 44px;
    max-height: 44px;
    object-fit: contain;
}
.stamp-thumb-spinner {
    color: #94a3b8;
    font-size: 1rem;
}
.stamp-thumb-name {
    font-size: 0.6rem;
    font-weight: 600;
    color: #475569;
    text-align: center;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
}
.stamp-thumb-badge {
    font-size: 0.55rem;
    font-weight: 700;
    color: #d97706;
    background: #fef3c7;
    border-radius: 999px;
    padding: 0.05rem 0.3rem;
}

/* ═══════════════════ ZONE LIST ITEMS (firma vs sello) ═══════════════════ */
.zone-list-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.zone-list-icon {
    font-size: 0.7rem;
    flex-shrink: 0;
}
.zone-list-item--firma .zone-list-icon {
    color: #3b82f6;
}
.zone-list-item--sello .zone-list-icon {
    color: #f59e0b;
}

/* ═══════════════════ STAMPS-ONLY SHORTCUT ═══════════════════ */
.stamps-only-shortcut {
    border-top: 1px dashed #e2e8f0;
    padding-top: 0.75rem;
    margin-top: 0.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    align-items: flex-start;
}
.stamps-only-label {
    font-size: 0.72rem;
    color: #94a3b8;
    margin: 0;
}
.btn-stamps-only {
    font-size: 0.78rem !important;
}

/* ═══════════════════ ZONE DRAG / RESIZE ═══════════════════ */

/* El zone-marker es arrastrable por su cuerpo */
.zone-marker {
    cursor: move;
    user-select: none;
}

/* Cuando hay drag activo en el overlay, forzar cursor */
.zones-overlay--dragging,
.zones-overlay--dragging * {
    cursor: grabbing !important;
}

/* Etiqueta pequeña de tipo dentro del zone-marker */
.zone-label {
    position: absolute;
    bottom: 2px;
    left: 4px;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #1e40af;
    background: rgba(219, 234, 254, 0.85);
    border-radius: 3px;
    padding: 0 3px;
    pointer-events: none;
    line-height: 1.4;
}
.zone-label--sello {
    color: #92400e;
    background: rgba(254, 243, 199, 0.9);
}

/* Botón × de eliminado — siempre visible, esquina superior derecha */
.zone-delete-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid #fff;
    background: #ef4444;
    color: #fff;
    font-size: 0.75rem;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition:
        background 0.15s,
        transform 0.1s;
}
.zone-delete-btn:hover {
    background: #dc2626;
    transform: scale(1.15);
}
.zone-delete-btn--sello {
    background: #f59e0b;
}
.zone-delete-btn--sello:hover {
    background: #d97706;
}

/* Handles de resize en las 4 esquinas */
.resize-handle {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    border: 1.5px solid #fff;
    background: #3b82f6;
    z-index: 8;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
.zone-marker--sello .resize-handle {
    background: #f59e0b;
}
.rh-nw {
    top: -5px;
    left: -5px;
    cursor: nw-resize;
}
.rh-ne {
    top: -5px;
    right: -5px;
    cursor: ne-resize;
}
.rh-sw {
    bottom: -5px;
    left: -5px;
    cursor: sw-resize;
}
.rh-se {
    bottom: -5px;
    right: -5px;
    cursor: se-resize;
}

/* ═══════════════════ STAMP QUICK ACTIONS ═══════════════════ */
.stamp-quick-actions {
    margin-top: 0.5rem;
    padding-top: 0.4rem;
    border-top: 1px dashed #e2e8f0;
}
.stamp-quick-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: #d97706;
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: 6px;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    transition:
        background 0.15s,
        border-color 0.15s;
    width: 100%;
    justify-content: center;
}
.stamp-quick-btn:hover {
    background: #fef3c7;
    border-color: #f59e0b;
}
</style>
