<script setup>
import { useSignAndDownload } from '@/composables/useSignAndDownload.js';
import { useStamps } from '@/composables/useStamps.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { computed, nextTick, onUnmounted, ref } from 'vue';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

const toast = useToast();
const { signAndDownload, isSaving } = useSignAndDownload();
const { stamps: stampsList, isLoading: stampsLoading, loadStamps, getStampBlobUrl, revokeAllBlobUrls } = useStamps();

// ─── PDF state ────────────────────────────────────────────────────
const pdfCanvas = ref(null);
const canvasWrapper = ref(null);
const isRenderingPdf = ref(false);
let pdfDoc = null;
const totalPages = ref(0);
const currentPage = ref(1);
const pageWidthMm = ref(210);
const pageHeightMm = ref(297);

// ─── File state ───────────────────────────────────────────────────
const pdfFile = ref(null);
const pdfFileName = ref('');
const fileInput = ref(null);
const isDragOver = ref(false);

// ─── Panel mode: 'upload' | 'drawing' | 'placing' ─────────────────
const panelMode = ref('upload');

// ─── Signature state ──────────────────────────────────────────────
const signatureCanvas = ref(null);
const signatureDataUrl = ref(null);
const signatureZones = ref([]);
let isDrawing = false;
let canvasCtx = null;

// ─── Stamps state ─────────────────────────────────────────────────
const stampZones = ref(new Map());
const activeStampId = ref(null);
const stampBlobUrls = ref({});
const stampOnlyMode = ref(false);

// ─── Drag/Resize state ────────────────────────────────────────────
const dragState = ref(null);
let isDragOperation = false;
const overlayRef = ref(null);

// ─── Cleanup ──────────────────────────────────────────────────────
const destroyPdf = () => {
    if (pdfDoc) {
        pdfDoc.destroy();
        pdfDoc = null;
    }
    totalPages.value = 0;
    currentPage.value = 1;
};

onUnmounted(() => {
    destroyPdf();
    revokeAllBlobUrls();
    stampBlobUrls.value = {};
});

// ─── PDF loading ──────────────────────────────────────────────────
const loadPdf = async (file) => {
    isRenderingPdf.value = true;
    destroyPdf();
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = getDocument({
            data: arrayBuffer,
            cMapUrl: '/pdfjs/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: '/pdfjs/standard_fonts/',
            isEvalSupported: false
        });
        pdfDoc = await loadingTask.promise;
        totalPages.value = pdfDoc.numPages;
        currentPage.value = 1;
        await renderCurrentPage();
    } catch (e) {
        console.error('Error cargando PDF:', e);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo leer el archivo PDF', life: 4000 });
    } finally {
        isRenderingPdf.value = false;
    }
};

const renderCurrentPage = async () => {
    await nextTick();
    if (!pdfDoc || !pdfCanvas.value) return;
    isRenderingPdf.value = true;
    try {
        const page = await pdfDoc.getPage(currentPage.value);
        const viewport = page.getViewport({ scale: 1 });
        pageWidthMm.value = (viewport.width / 72) * 25.4;
        pageHeightMm.value = (viewport.height / 72) * 25.4;
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

// ─── File selection ───────────────────────────────────────────────
const validateAndSetFile = (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
        toast.add({ severity: 'warn', summary: 'Tipo inválido', detail: 'Solo se aceptan archivos PDF', life: 3500 });
        return;
    }
    if (file.size > 50 * 1024 * 1024) {
        toast.add({ severity: 'warn', summary: 'Archivo muy grande', detail: 'El PDF no puede superar los 50 MB', life: 3500 });
        return;
    }
    pdfFile.value = file;
    pdfFileName.value = file.name;
};

const handleFileInputChange = (e) => {
    validateAndSetFile(e.target.files?.[0]);
    if (fileInput.value) fileInput.value.value = '';
};

const handleDrop = (e) => {
    isDragOver.value = false;
    validateAndSetFile(e.dataTransfer.files?.[0]);
};

const clearFile = () => {
    pdfFile.value = null;
    pdfFileName.value = '';
};

const continueToDrawing = async () => {
    if (!pdfFile.value) return;
    panelMode.value = 'drawing';
    await nextTick();
    await loadPdf(pdfFile.value);
    initCanvas();
};

// ─── Zone helpers ─────────────────────────────────────────────────
const currentPageZones = computed(() => signatureZones.value.map((z, i) => ({ ...z, _idx: i })).filter((z) => z.page === currentPage.value));

const currentPageStampZones = computed(() => {
    const result = [];
    stampZones.value.forEach((zones, sello_id) => {
        zones.forEach((z, zoneIdx) => {
            if (z.page === currentPage.value) {
                result.push({ ...z, sello_id, _zoneIdx: zoneIdx, _blobUrl: stampBlobUrls.value[sello_id] ?? null });
            }
        });
    });
    return result;
});

const getZoneStyle = (z) => ({
    left: (z.x / pageWidthMm.value) * 100 + '%',
    top: (z.y / pageHeightMm.value) * 100 + '%',
    width: (z.w / pageWidthMm.value) * 100 + '%',
    height: (z.h / pageHeightMm.value) * 100 + '%'
});

const pxToMm = (px, overlayPx, pageMm) => (px / overlayPx) * pageMm;
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

// ─── Drag/Resize handlers ─────────────────────────────────────────
const startDragZone = (e, zoneType, idx, selloId = null) => {
    if (panelMode.value !== 'placing') return;
    e.stopPropagation();
    e.preventDefault();
    const rect = overlayRef.value.getBoundingClientRect();
    const zone = zoneType === 'firma' ? signatureZones.value[idx] : stampZones.value.get(selloId)?.[idx];
    if (!zone) return;
    dragState.value = { type: 'drag', zoneType, idx, selloId, startMouseX: e.clientX, startMouseY: e.clientY, startZone: { ...zone }, overlayRect: rect };
    isDragOperation = false;
};

const startResizeZone = (e, corner, zoneType, idx, selloId = null) => {
    if (panelMode.value !== 'placing') return;
    e.stopPropagation();
    e.preventDefault();
    const rect = overlayRef.value.getBoundingClientRect();
    const zone = zoneType === 'firma' ? signatureZones.value[idx] : stampZones.value.get(selloId)?.[idx];
    if (!zone) return;
    dragState.value = { type: 'resize', corner, zoneType, idx, selloId, startMouseX: e.clientX, startMouseY: e.clientY, startZone: { ...zone }, overlayRect: rect };
    isDragOperation = false;
};

const onOverlayMouseMove = (e) => {
    if (!dragState.value) return;
    isDragOperation = true;
    const ds = dragState.value;
    const dx = e.clientX - ds.startMouseX;
    const dy = e.clientY - ds.startMouseY;
    const dxMm = pxToMm(dx, ds.overlayRect.width, pageWidthMm.value);
    const dyMm = pxToMm(dy, ds.overlayRect.height, pageHeightMm.value);
    const sz = ds.startZone;
    let patch = {};
    if (ds.type === 'drag') {
        patch = {
            x: parseFloat(clamp(sz.x + dxMm, 0, pageWidthMm.value - sz.w).toFixed(1)),
            y: parseFloat(clamp(sz.y + dyMm, 0, pageHeightMm.value - sz.h).toFixed(1))
        };
    } else {
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
    if (ds.zoneType === 'firma') updateSignatureZone(ds.idx, patch);
    else updateStampZoneEntry(ds.selloId, ds.idx, patch);
};

const onOverlayMouseUp = () => {
    dragState.value = null;
    setTimeout(() => {
        isDragOperation = false;
    }, 0);
};

const handlePdfClick = (e) => {
    if (panelMode.value !== 'placing') return;
    if (isDragOperation) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    if (activeStampId.value !== null) {
        const zoneW = 40,
            zoneH = 40;
        const x = clamp(relX * pageWidthMm.value - zoneW / 2, 0, pageWidthMm.value - zoneW);
        const y = clamp(relY * pageHeightMm.value - zoneH / 2, 0, pageHeightMm.value - zoneH);
        const newMap = new Map(stampZones.value);
        newMap.set(activeStampId.value, [...(stampZones.value.get(activeStampId.value) ?? []), { page: currentPage.value, x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)), w: zoneW, h: zoneH }]);
        stampZones.value = newMap;
    } else if (!stampOnlyMode.value) {
        const zoneW = 60,
            zoneH = 20;
        const x = clamp(relX * pageWidthMm.value - zoneW / 2, 0, pageWidthMm.value - zoneW);
        const y = clamp(relY * pageHeightMm.value - zoneH / 2, 0, pageHeightMm.value - zoneH);
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

const placeStampBelowFirma = () => {
    if (activeStampId.value === null) return;
    const zoneW = 40,
        zoneH = 40;
    const firmaZonesOnPage = signatureZones.value.filter((z) => z.page === currentPage.value);
    let x, y;
    if (firmaZonesOnPage.length > 0) {
        const ref = firmaZonesOnPage[firmaZonesOnPage.length - 1];
        x = clamp(ref.x + (ref.w - zoneW) / 2, 0, pageWidthMm.value - zoneW);
        y = clamp(ref.y + ref.h + 3, 0, pageHeightMm.value - zoneH);
    } else {
        x = parseFloat(((pageWidthMm.value - zoneW) / 2).toFixed(1));
        y = parseFloat(((pageHeightMm.value - zoneH) / 2).toFixed(1));
    }
    const newMap = new Map(stampZones.value);
    newMap.set(activeStampId.value, [...(stampZones.value.get(activeStampId.value) ?? []), { page: currentPage.value, x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)), w: zoneW, h: zoneH }]);
    stampZones.value = newMap;
};

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
    if (canvasCtx && signatureCanvas.value) {
        canvasCtx.clearRect(0, 0, signatureCanvas.value.width, signatureCanvas.value.height);
    }
};
const isCanvasEmpty = () => {
    if (!signatureCanvas.value || !canvasCtx) return true;
    const data = canvasCtx.getImageData(0, 0, signatureCanvas.value.width, signatureCanvas.value.height).data;
    return !new Uint32Array(data.buffer).some((c) => c !== 0);
};

// ─── Stamps loading ───────────────────────────────────────────────
const loadStampsIfNeeded = async () => {
    if (stampsList.value.length === 0) await loadStamps();
    for (const stamp of stampsList.value) {
        if (!stampBlobUrls.value[stamp.id]) {
            const url = await getStampBlobUrl(stamp.id);
            if (url) stampBlobUrls.value = { ...stampBlobUrls.value, [stamp.id]: url };
        }
    }
};

// ─── Mode transitions ─────────────────────────────────────────────
const goToPlacingWithStampsOnly = async () => {
    stampOnlyMode.value = true;
    signatureDataUrl.value = null;
    signatureZones.value = [];
    panelMode.value = 'placing';
    await loadStampsIfNeeded();
};

const goToPlacingMode = async () => {
    if (!stampOnlyMode.value && isCanvasEmpty()) return;
    if (!stampOnlyMode.value) signatureDataUrl.value = signatureCanvas.value.toDataURL('image/png');
    panelMode.value = 'placing';
    await loadStampsIfNeeded();
};

const backToDrawing = () => {
    panelMode.value = 'drawing';
    signatureZones.value = [];
    stampZones.value = new Map();
    activeStampId.value = null;
    stampOnlyMode.value = false;
    nextTick().then(initCanvas);
};

// ─── Computed: can submit ─────────────────────────────────────────
const canSubmit = computed(() => {
    const hasSignature = signatureDataUrl.value && signatureZones.value.length > 0;
    let hasStamps = false;
    stampZones.value.forEach((zones) => {
        if (zones.length > 0) hasStamps = true;
    });
    return hasSignature || hasStamps;
});

const totalZoneCount = computed(() => {
    return signatureZones.value.length + [...stampZones.value.values()].reduce((s, z) => s + z.length, 0);
});

// ─── Submit and download ──────────────────────────────────────────
const submitAndDownload = async () => {
    if (!pdfFile.value || !canSubmit.value) return;

    const formData = new FormData();
    formData.append('file', pdfFile.value);

    const hasSignature = signatureDataUrl.value && signatureZones.value.length > 0;
    if (hasSignature) {
        formData.append('firma_base64', signatureDataUrl.value);
        signatureZones.value.forEach((z, i) => {
            formData.append(`posicion[${i}][page]`, z.page);
            formData.append(`posicion[${i}][x]`, z.x);
            formData.append(`posicion[${i}][y]`, z.y);
            formData.append(`posicion[${i}][w]`, z.w);
            formData.append(`posicion[${i}][h]`, z.h);
        });
    }

    let sellosIdx = 0;
    stampZones.value.forEach((zones, sello_id) => {
        if (zones.length > 0) {
            formData.append(`sellos[${sellosIdx}][sello_id]`, sello_id);
            zones.forEach((z, j) => {
                formData.append(`sellos[${sellosIdx}][posicion][${j}][page]`, z.page);
                formData.append(`sellos[${sellosIdx}][posicion][${j}][x]`, z.x);
                formData.append(`sellos[${sellosIdx}][posicion][${j}][y]`, z.y);
                formData.append(`sellos[${sellosIdx}][posicion][${j}][w]`, z.w);
                formData.append(`sellos[${sellosIdx}][posicion][${j}][h]`, z.h);
            });
            sellosIdx++;
        }
    });

    try {
        await signAndDownload(formData, pdfFileName.value);
        resetAll();
    } catch {
        // handled by composable
    }
};

const resetAll = () => {
    destroyPdf();
    revokeAllBlobUrls();
    pdfFile.value = null;
    pdfFileName.value = '';
    panelMode.value = 'upload';
    signatureZones.value = [];
    signatureDataUrl.value = null;
    stampZones.value = new Map();
    activeStampId.value = null;
    stampOnlyMode.value = false;
    stampBlobUrls.value = {};
};
</script>

<template>
    <div class="sad-view">
        <!-- Header -->
        <div class="sad-page-header">
            <div class="sad-page-icon">
                <i class="pi pi-download"></i>
            </div>
            <div>
                <h1 class="sad-page-title">Firmar y Descargar</h1>
                <p class="sad-page-sub">Sube un PDF, coloca tu firma y/o sellos, y descarga el resultado. No se guarda ningún dato.</p>
            </div>
            <div v-if="panelMode !== 'upload'" class="sad-mode-chip">
                <i class="pi pi-pencil mr-1"></i>
                <span v-if="panelMode === 'drawing'">Paso 1 / 2 — Dibujando firma</span>
                <span v-else>Paso 2 / 2 — Colocando firma y sellos</span>
            </div>
        </div>

        <!-- Layout de dos columnas -->
        <div class="sad-layout">
            <!-- ═══ PANEL IZQUIERDO: PDF ═══ -->
            <div class="sad-pdf-panel" :class="{ 'placing-active': panelMode === 'placing' }">
                <!-- Banner modo colocación -->
                <div v-if="panelMode === 'placing'" class="sad-placing-banner">
                    <i class="pi pi-map-marker mr-2"></i>
                    <span v-if="activeStampId !== null">
                        Clic en el PDF para colocar
                        <strong>{{ stampsList.find((s) => s.id === activeStampId)?.nombre ?? 'el sello' }}</strong>
                    </span>
                    <span v-else-if="!stampOnlyMode">Haz clic en el PDF para colocar tu firma</span>
                    <span v-else>Selecciona un sello y haz clic en el PDF</span>
                    <span class="sad-placing-hint"> · Arrastra para mover, esquinas para redimensionar</span>
                </div>

                <!-- Área de canvas -->
                <div class="sad-canvas-area">
                    <!-- Estado vacío (modo upload sin PDF) -->
                    <div v-if="panelMode === 'upload'" class="sad-pdf-empty">
                        <i class="pi pi-file-pdf sad-pdf-empty-icon"></i>
                        <p class="sad-pdf-empty-title">Vista previa del PDF</p>
                        <p class="sad-pdf-empty-sub">Sube un PDF en el panel derecho para previsualizarlo aquí.</p>
                    </div>

                    <template v-else>
                        <!-- Loading overlay -->
                        <div v-if="isRenderingPdf" class="sad-loading-overlay">
                            <div class="sad-loading-inner">
                                <div class="sad-loading-spinner"></div>
                                <span>Cargando PDF...</span>
                            </div>
                        </div>

                        <!-- Canvas con overlay de zonas -->
                        <div v-show="!isRenderingPdf" class="sad-canvas-wrapper" ref="canvasWrapper">
                            <canvas ref="pdfCanvas" class="sad-canvas-el"></canvas>

                            <div
                                ref="overlayRef"
                                class="sad-zones-overlay"
                                :class="{ 'zones-overlay--active': panelMode === 'placing', 'zones-overlay--dragging': !!dragState }"
                                @click="handlePdfClick"
                                @mousemove="onOverlayMouseMove"
                                @mouseup="onOverlayMouseUp"
                                @mouseleave="onOverlayMouseUp"
                            >
                                <!-- Zonas de firma -->
                                <div v-for="z in currentPageZones" :key="'sig-' + z._idx" class="zone-marker zone-marker--firma" :style="getZoneStyle(z)" @mousedown.stop="startDragZone($event, 'firma', z._idx)">
                                    <img v-if="signatureDataUrl" :src="signatureDataUrl" class="zone-sig-img" />
                                    <span class="zone-label">Firma</span>
                                    <span class="resize-handle rh-nw" @mousedown.stop="startResizeZone($event, 'nw', 'firma', z._idx)"></span>
                                    <span class="resize-handle rh-ne" @mousedown.stop="startResizeZone($event, 'ne', 'firma', z._idx)"></span>
                                    <span class="resize-handle rh-sw" @mousedown.stop="startResizeZone($event, 'sw', 'firma', z._idx)"></span>
                                    <span class="resize-handle rh-se" @mousedown.stop="startResizeZone($event, 'se', 'firma', z._idx)"></span>
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
                                    <span class="resize-handle rh-nw" @mousedown.stop="startResizeZone($event, 'nw', 'sello', sz._zoneIdx, sz.sello_id)"></span>
                                    <span class="resize-handle rh-ne" @mousedown.stop="startResizeZone($event, 'ne', 'sello', sz._zoneIdx, sz.sello_id)"></span>
                                    <span class="resize-handle rh-sw" @mousedown.stop="startResizeZone($event, 'sw', 'sello', sz._zoneIdx, sz.sello_id)"></span>
                                    <span class="resize-handle rh-se" @mousedown.stop="startResizeZone($event, 'se', 'sello', sz._zoneIdx, sz.sello_id)"></span>
                                    <button class="zone-delete-btn zone-delete-btn--sello" @mousedown.stop @click.stop="removeStampZone(sz.sello_id, sz._zoneIdx)" title="Eliminar zona">×</button>
                                </div>
                            </div>
                        </div>

                        <div v-if="!isRenderingPdf && !pdfDoc" class="sad-pdf-empty">
                            <i class="pi pi-exclamation-triangle sad-pdf-empty-icon" style="color: #f59e0b"></i>
                            <p class="sad-pdf-empty-title">No se pudo cargar el PDF</p>
                        </div>
                    </template>
                </div>

                <!-- Navegación de páginas -->
                <div v-if="totalPages > 0 && panelMode !== 'upload'" class="sad-nav-bar">
                    <Button icon="pi pi-chevron-left" text size="small" @click="goToPrevPage" :disabled="currentPage <= 1 || isRenderingPdf" />
                    <span class="sad-page-info"
                        >Página <strong>{{ currentPage }}</strong> de <strong>{{ totalPages }}</strong></span
                    >
                    <Button icon="pi pi-chevron-right" text size="small" @click="goToNextPage" :disabled="currentPage >= totalPages || isRenderingPdf" />
                    <span v-if="panelMode === 'placing' && totalZoneCount > 0" class="sad-zones-count"> <i class="pi pi-map-marker mr-1"></i>{{ totalZoneCount }} zona{{ totalZoneCount !== 1 ? 's' : '' }} </span>
                </div>
            </div>

            <!-- ═══ PANEL DERECHO: CONTROL ═══ -->
            <div class="sad-control-panel">
                <!-- ── MODO: UPLOAD ── -->
                <div v-if="panelMode === 'upload'" class="sad-panel-body">
                    <div class="sad-section-title">
                        <i class="pi pi-cloud-upload mr-2"></i>
                        Selecciona un PDF
                    </div>

                    <!-- Dropzone -->
                    <div
                        class="sad-dropzone"
                        :class="{ 'sad-dropzone--over': isDragOver, 'sad-dropzone--has-file': !!pdfFile }"
                        @dragover.prevent="isDragOver = true"
                        @dragleave="isDragOver = false"
                        @drop.prevent="handleDrop"
                        @click="!pdfFile && fileInput?.click()"
                    >
                        <input type="file" ref="fileInput" accept="application/pdf" style="display: none" @change="handleFileInputChange" />

                        <template v-if="!pdfFile">
                            <div class="sad-dropzone-icon">
                                <i class="pi pi-file-pdf"></i>
                            </div>
                            <p class="sad-dropzone-title">Arrastra tu PDF aquí</p>
                            <p class="sad-dropzone-sub">o <span class="sad-dropzone-link">haz clic para seleccionar</span></p>
                            <p class="sad-dropzone-hint">Solo PDF · Máximo 50 MB</p>
                        </template>

                        <template v-else>
                            <div class="sad-file-selected">
                                <div class="sad-file-icon">
                                    <i class="pi pi-file-pdf"></i>
                                </div>
                                <div class="sad-file-info">
                                    <span class="sad-file-name">{{ pdfFileName }}</span>
                                    <span class="sad-file-size">{{ (pdfFile.size / 1024 / 1024).toFixed(2) }} MB</span>
                                </div>
                                <button class="sad-file-remove" @click.stop="clearFile" title="Quitar">×</button>
                            </div>
                        </template>
                    </div>

                    <div class="sad-upload-footer">
                        <Button label="Continuar" icon="pi pi-arrow-right" iconPos="right" class="sad-btn-continue" :disabled="!pdfFile" :loading="isRenderingPdf" @click="continueToDrawing" />
                    </div>
                </div>

                <!-- ── MODO: DRAWING ── -->
                <div v-else-if="panelMode === 'drawing'" class="sad-panel-body">
                    <div class="signing-step-indicator">
                        <div class="signing-step-dot active">1</div>
                        <div class="signing-step-line"></div>
                        <div class="signing-step-dot">2</div>
                    </div>

                    <h3 class="sad-panel-heading">Dibuja tu firma</h3>
                    <p class="sad-panel-hint">Usa el mouse o el dedo sobre el área blanca. En el siguiente paso seleccionarás dónde colocarla en el documento.</p>

                    <div class="sad-sig-canvas-wrapper">
                        <canvas
                            ref="signatureCanvas"
                            class="sad-sig-canvas"
                            @mousedown="startDrawing"
                            @mousemove="draw"
                            @mouseup="stopDrawing"
                            @mouseleave="stopDrawing"
                            @touchstart.prevent="startDrawing"
                            @touchmove.prevent="draw"
                            @touchend="stopDrawing"
                        ></canvas>
                        <span class="sad-sig-label">Área de firma</span>
                    </div>

                    <div class="sad-drawing-actions">
                        <Button label="Limpiar" icon="pi pi-eraser" text severity="secondary" size="small" @click="clearSignature" />
                    </div>

                    <div class="sad-stamps-only-box">
                        <p class="sad-stamps-only-label">¿No necesitas firma dibujada?</p>
                        <Button label="Solo estampar sellos" icon="pi pi-stamp" severity="secondary" outlined size="small" @click="goToPlacingWithStampsOnly" />
                    </div>

                    <div class="sad-panel-footer">
                        <Button label="Cambiar PDF" icon="pi pi-arrow-left" text severity="secondary" @click="panelMode = 'upload'" />
                        <Button label="Siguiente →" class="sad-btn-next" @click="goToPlacingMode" />
                    </div>
                </div>

                <!-- ── MODO: PLACING ── -->
                <div v-else-if="panelMode === 'placing'" class="sad-panel-body">
                    <div class="signing-step-indicator">
                        <div :class="['signing-step-dot', stampOnlyMode ? 'active' : 'done']">1</div>
                        <div :class="['signing-step-line', stampOnlyMode ? '' : 'done']"></div>
                        <div class="signing-step-dot active">2</div>
                    </div>

                    <h3 class="sad-panel-heading">{{ stampOnlyMode ? 'Coloca tus sellos' : 'Coloca firma y sellos' }}</h3>
                    <p class="sad-panel-hint">Haz clic en el PDF para colocar la firma o sello activo. Arrastra para mover, esquinas para redimensionar.</p>

                    <!-- Preview firma -->
                    <div v-if="signatureDataUrl" class="sad-sig-preview">
                        <p class="sad-sig-preview-label">Tu firma</p>
                        <div class="sad-sig-preview-img-wrapper" :class="{ 'sad-sig-preview--active': activeStampId === null }" @click="activeStampId = null" title="Activar modo firma">
                            <img :src="signatureDataUrl" class="sad-sig-preview-img" alt="Firma" />
                            <span v-if="activeStampId === null" class="sad-active-badge">● Activo</span>
                        </div>
                    </div>

                    <!-- Panel de sellos -->
                    <div class="sad-stamps-panel">
                        <p class="sad-stamps-title">
                            <i class="pi pi-stamp mr-1"></i>
                            Mis sellos
                            <span v-if="stampsLoading" class="ml-2"><i class="pi pi-spin pi-spinner" style="font-size: 0.75rem"></i></span>
                        </p>
                        <div v-if="!stampsLoading && stampsList.length === 0" class="sad-stamps-empty">
                            <i class="pi pi-info-circle mr-1"></i>
                            No tienes sellos. Sube uno en tu perfil.
                        </div>
                        <div v-else class="sad-stamps-list">
                            <div
                                v-for="stamp in stampsList"
                                :key="stamp.id"
                                :class="['sad-stamp-thumb', activeStampId === stamp.id ? 'sad-stamp-thumb--active' : '']"
                                @click="activeStampId = activeStampId === stamp.id ? null : stamp.id"
                                :title="stamp.nombre ?? 'Sello'"
                            >
                                <div class="sad-stamp-img-wrapper">
                                    <img v-if="stampBlobUrls[stamp.id]" :src="stampBlobUrls[stamp.id]" class="sad-stamp-img" :alt="stamp.nombre ?? 'Sello'" />
                                    <i v-else class="pi pi-spin pi-spinner" style="color: #cbd5e1; font-size: 1rem"></i>
                                </div>
                                <span class="sad-stamp-name">{{ stamp.nombre ?? 'Sin nombre' }}</span>
                                <span v-if="activeStampId === stamp.id" class="sad-stamp-active-badge">● Activo</span>
                            </div>
                        </div>

                        <div v-if="activeStampId !== null" class="sad-stamp-quick">
                            <button class="sad-stamp-quick-btn" @click="placeStampBelowFirma">
                                <i class="pi pi-arrow-down mr-1"></i>
                                <span v-if="signatureZones.filter((z) => z.page === currentPage).length > 0">Colocar debajo de la firma</span>
                                <span v-else>Colocar en el centro</span>
                            </button>
                        </div>
                    </div>

                    <!-- Lista de zonas colocadas -->
                    <div class="sad-zones-section">
                        <p class="sad-zones-title">
                            Zonas colocadas
                            <span :class="['sad-zones-badge', canSubmit ? 'sad-zones-badge--active' : '']">{{ totalZoneCount }}</span>
                        </p>
                        <div v-if="!canSubmit" class="sad-zones-empty">
                            <i class="pi pi-map-marker mr-1"></i>
                            <span v-if="activeStampId !== null">Haz clic en el PDF para colocar el sello</span>
                            <span v-else-if="signatureDataUrl">Haz clic en el PDF para colocar la firma</span>
                            <span v-else>Selecciona un sello y haz clic en el PDF</span>
                        </div>
                        <div v-else class="sad-zones-list">
                            <div v-for="(z, i) in signatureZones" :key="'sig-' + i" class="sad-zone-item sad-zone-item--firma">
                                <i class="pi pi-pencil sad-zone-icon"></i>
                                <div class="sad-zone-info">
                                    <span class="sad-zone-page">Firma · Pág. {{ z.page }}</span>
                                    <span class="sad-zone-coords">x:{{ z.x }} · y:{{ z.y }} mm</span>
                                </div>
                                <button class="sad-zone-remove" @click="removeZone(i)">×</button>
                            </div>
                            <template v-for="[selloId, zones] in stampZones" :key="'s-' + selloId">
                                <div v-for="(z, zi) in zones" :key="'sz-' + zi" class="sad-zone-item sad-zone-item--sello">
                                    <i class="pi pi-stamp sad-zone-icon"></i>
                                    <div class="sad-zone-info">
                                        <span class="sad-zone-page">{{ stampsList.find((s) => s.id === selloId)?.nombre ?? 'Sello' }} · Pág. {{ z.page }}</span>
                                        <span class="sad-zone-coords">x:{{ z.x }} · y:{{ z.y }} mm</span>
                                    </div>
                                    <button class="sad-zone-remove" @click="removeStampZone(selloId, zi)">×</button>
                                </div>
                            </template>
                        </div>
                    </div>

                    <div class="sad-panel-footer">
                        <Button label="Atrás" icon="pi pi-arrow-left" text severity="secondary" @click="backToDrawing" />
                        <Button label="Firmar y Descargar" icon="pi pi-download" class="sad-btn-download" :loading="isSaving" :disabled="!canSubmit" @click="submitAndDownload" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ─── Vista base ──────────────────────────────────────────────────── */
.sad-view {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 80px);
    padding: 1.25rem 1.5rem 0;
    gap: 1rem;
    overflow: hidden;
}

/* ─── Header ─────────────────────────────────────────────────────── */
.sad-page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-shrink: 0;
    padding-bottom: 1rem;
    border-bottom: 1px solid #f1f5f9;
}
.sad-page-icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    background: linear-gradient(135deg, #dcfce7, #bbf7d0);
    border: 1px solid #86efac;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.sad-page-icon i {
    font-size: 1.3rem;
    color: #16a34a;
}
.sad-page-title {
    font-size: 1.35rem;
    font-weight: 800;
    color: #1e293b;
    margin: 0 0 0.15rem;
}
.sad-page-sub {
    font-size: 0.82rem;
    color: #64748b;
    margin: 0;
}
.sad-mode-chip {
    margin-left: auto;
    background: #0284c7;
    color: white;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.3rem 0.8rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    white-space: nowrap;
}

/* ─── Layout ─────────────────────────────────────────────────────── */
.sad-layout {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    border-radius: 14px;
    box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.08),
        0 4px 16px rgba(0, 0, 0, 0.04);
    border: 1px solid #e2e8f0;
    background: white;
}

/* ─── PDF Panel ──────────────────────────────────────────────────── */
.sad-pdf-panel {
    flex: 0 0 65%;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    background: #f1f5f9;
    border-right: 1px solid #e2e8f0;
    transition: background 0.2s;
}
.sad-pdf-panel.placing-active {
    background: #f0f9ff;
}
.sad-placing-banner {
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
.sad-placing-hint {
    font-weight: 400;
    opacity: 0.85;
}
.sad-canvas-area {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
}
.sad-pdf-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: #94a3b8;
    text-align: center;
    padding: 2rem;
}
.sad-pdf-empty-icon {
    font-size: 3.5rem;
    color: #cbd5e1;
}
.sad-pdf-empty-title {
    font-size: 1rem;
    font-weight: 600;
    color: #64748b;
    margin: 0;
}
.sad-pdf-empty-sub {
    font-size: 0.82rem;
    color: #94a3b8;
    margin: 0;
}
.sad-loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(241, 245, 249, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}
.sad-loading-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    color: #475569;
}
.sad-loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #e2e8f0;
    border-top-color: #0284c7;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.sad-canvas-wrapper {
    position: relative;
    display: inline-block;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.sad-canvas-el {
    display: block;
    max-width: 100%;
}
.sad-zones-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    cursor: default;
}
.sad-zones-overlay.zones-overlay--active {
    cursor: crosshair;
}
.sad-zones-overlay.zones-overlay--dragging {
    cursor: grabbing;
}

.sad-nav-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: white;
    border-top: 1px solid #e2e8f0;
    flex-shrink: 0;
}
.sad-page-info {
    font-size: 0.82rem;
    color: #475569;
    min-width: 130px;
    text-align: center;
}
.sad-zones-count {
    font-size: 0.75rem;
    color: #0284c7;
    font-weight: 600;
    background: #e0f2fe;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
}

/* ─── Zone markers ────────────────────────────────────────────────── */
.zone-marker {
    position: absolute;
    border: 2px dashed #0284c7;
    background: rgba(2, 132, 199, 0.08);
    border-radius: 4px;
    cursor: grab;
    overflow: visible;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
}
.zone-marker--sello {
    border-color: #7c3aed;
    background: rgba(124, 58, 237, 0.08);
}
.zone-marker:active {
    cursor: grabbing;
}
.zone-sig-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
}
.zone-label {
    font-size: 0.55rem;
    font-weight: 700;
    color: #0284c7;
    background: white;
    padding: 0 3px;
    border-radius: 3px;
    position: absolute;
    top: 1px;
    left: 3px;
    pointer-events: none;
    opacity: 0.85;
}
.zone-label--sello {
    color: #7c3aed;
}
.zone-stamp-icon {
    font-size: 1.25rem;
    color: #7c3aed;
    opacity: 0.4;
}
.zone-delete-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #ef4444;
    color: white;
    border: none;
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.15s;
}
.zone-marker:hover .zone-delete-btn {
    opacity: 1;
}
.zone-delete-btn--sello {
    background: #7c3aed;
}
.resize-handle {
    position: absolute;
    width: 10px;
    height: 10px;
    background: white;
    border: 2px solid #0284c7;
    border-radius: 2px;
    z-index: 5;
}
.zone-marker--sello .resize-handle {
    border-color: #7c3aed;
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

/* ─── Control Panel ──────────────────────────────────────────────── */
.sad-control-panel {
    flex: 0 0 35%;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    background: white;
}
.sad-panel-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem 1.25rem;
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}

/* ─── Upload ─────────────────────────────────────────────────────── */
.sad-section-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: #334155;
    display: flex;
    align-items: center;
}
.sad-dropzone {
    border: 2px dashed #cbd5e1;
    border-radius: 12px;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    cursor: pointer;
    transition:
        border-color 0.15s,
        background 0.15s;
    text-align: center;
    min-height: 180px;
}
.sad-dropzone:hover,
.sad-dropzone--over {
    border-color: #0284c7;
    background: #f0f9ff;
}
.sad-dropzone--has-file {
    cursor: default;
    border-color: #10b981;
    background: #f0fdf4;
    padding: 1rem 1.5rem;
    min-height: auto;
}
.sad-dropzone-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.25rem;
}
.sad-dropzone-icon i {
    font-size: 1.6rem;
    color: #0284c7;
}
.sad-dropzone-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #334155;
    margin: 0;
}
.sad-dropzone-sub {
    font-size: 0.82rem;
    color: #64748b;
    margin: 0;
}
.sad-dropzone-link {
    color: #0284c7;
    font-weight: 600;
}
.sad-dropzone-hint {
    font-size: 0.72rem;
    color: #94a3b8;
    margin: 0;
}

.sad-file-selected {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
}
.sad-file-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: #fee2e2;
    border: 1px solid #fca5a5;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.sad-file-icon i {
    font-size: 1.25rem;
    color: #dc2626;
}
.sad-file-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}
.sad-file-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.sad-file-size {
    font-size: 0.72rem;
    color: #64748b;
}
.sad-file-remove {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #fee2e2;
    border: none;
    color: #dc2626;
    font-size: 1.1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
}
.sad-file-remove:hover {
    background: #fca5a5;
}

.sad-upload-footer {
    display: flex;
    justify-content: flex-end;
}
.sad-btn-continue {
    background: #0284c7 !important;
    border-color: #0284c7 !important;
}

/* ─── Drawing ────────────────────────────────────────────────────── */
.signing-step-indicator {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}
.signing-step-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #e2e8f0;
    color: #94a3b8;
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.signing-step-dot.active {
    background: #0284c7;
    color: white;
}
.signing-step-dot.done {
    background: #10b981;
    color: white;
}
.signing-step-line {
    flex: 1;
    height: 2px;
    background: #e2e8f0;
    border-radius: 2px;
}
.signing-step-line.done {
    background: #10b981;
}

.sad-panel-heading {
    font-size: 1rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}
.sad-panel-hint {
    font-size: 0.8rem;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
}

.sad-sig-canvas-wrapper {
    position: relative;
    background: white;
    border: 2px dashed #cbd5e1;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
}
.sad-sig-canvas {
    display: block;
    width: 100%;
    height: 160px;
    cursor: crosshair;
    touch-action: none;
}
.sad-sig-label {
    position: absolute;
    bottom: 6px;
    right: 10px;
    font-size: 0.65rem;
    color: #cbd5e1;
    pointer-events: none;
    font-weight: 500;
}
.sad-drawing-actions {
    display: flex;
    gap: 0.5rem;
}
.sad-stamps-only-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.sad-stamps-only-label {
    font-size: 0.78rem;
    color: #64748b;
    margin: 0;
}
.sad-btn-next {
    background: #0284c7 !important;
    border-color: #0284c7 !important;
}

/* ─── Placing ────────────────────────────────────────────────────── */
.sad-sig-preview {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.75rem;
    flex-shrink: 0;
}
.sad-sig-preview-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 0 0.5rem;
}
.sad-sig-preview-img-wrapper {
    border: 2px solid #e2e8f0;
    border-radius: 6px;
    padding: 0.5rem;
    cursor: pointer;
    transition: border-color 0.15s;
    position: relative;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
}
.sad-sig-preview-img-wrapper:hover,
.sad-sig-preview--active {
    border-color: #0284c7;
    background: #eff6ff;
}
.sad-sig-preview-img {
    max-height: 60px;
    max-width: 100%;
    object-fit: contain;
}
.sad-active-badge {
    position: absolute;
    bottom: 4px;
    right: 6px;
    font-size: 0.6rem;
    color: #0284c7;
    font-weight: 700;
}

.sad-stamps-panel {
    flex-shrink: 0;
}
.sad-stamps-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 0 0.5rem;
    display: flex;
    align-items: center;
}
.sad-stamps-empty {
    font-size: 0.78rem;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0;
}
.sad-stamps-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}
.sad-stamp-thumb {
    width: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.4rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition:
        border-color 0.15s,
        background 0.15s;
    position: relative;
    background: white;
}
.sad-stamp-thumb:hover,
.sad-stamp-thumb--active {
    border-color: #7c3aed;
    background: #faf5ff;
}
.sad-stamp-img-wrapper {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.sad-stamp-img {
    max-width: 48px;
    max-height: 48px;
    object-fit: contain;
}
.sad-stamp-name {
    font-size: 0.6rem;
    color: #475569;
    text-align: center;
    word-break: break-word;
    line-height: 1.2;
    max-width: 100%;
}
.sad-stamp-active-badge {
    position: absolute;
    top: -6px;
    right: -4px;
    font-size: 0.55rem;
    color: #7c3aed;
    font-weight: 700;
    background: white;
    border-radius: 4px;
    padding: 0 2px;
}
.sad-stamp-quick {
    margin-top: 0.5rem;
}
.sad-stamp-quick-btn {
    font-size: 0.75rem;
    color: #7c3aed;
    background: #faf5ff;
    border: 1px solid #e9d5ff;
    border-radius: 6px;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: background 0.15s;
    width: 100%;
}
.sad-stamp-quick-btn:hover {
    background: #ede9fe;
}

.sad-zones-section {
    flex-shrink: 0;
}
.sad-zones-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 0 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.sad-zones-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 10px;
    background: #e2e8f0;
    color: #64748b;
    font-size: 0.72rem;
    font-weight: 700;
}
.sad-zones-badge--active {
    background: #0284c7;
    color: white;
}
.sad-zones-empty {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: #94a3b8;
    padding: 0.5rem 0;
}
.sad-zones-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    max-height: 140px;
    overflow-y: auto;
}
.sad-zone-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    font-size: 0.78rem;
}
.sad-zone-item--firma {
    border-color: #bae6fd;
    background: #f0f9ff;
}
.sad-zone-item--sello {
    border-color: #e9d5ff;
    background: #faf5ff;
}
.sad-zone-icon {
    font-size: 0.75rem;
    color: #0284c7;
    flex-shrink: 0;
}
.sad-zone-item--sello .sad-zone-icon {
    color: #7c3aed;
}
.sad-zone-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
}
.sad-zone-page {
    font-weight: 600;
    color: #334155;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.sad-zone-coords {
    color: #94a3b8;
    font-size: 0.7rem;
}
.sad-zone-remove {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0 2px;
    flex-shrink: 0;
    transition: color 0.15s;
}
.sad-zone-remove:hover {
    color: #ef4444;
}

.sad-btn-download {
    background: #16a34a !important;
    border-color: #16a34a !important;
}

/* ─── Footer del panel ───────────────────────────────────────────── */
.sad-panel-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #f1f5f9;
    margin-top: auto;
    flex-shrink: 0;
}
</style>
