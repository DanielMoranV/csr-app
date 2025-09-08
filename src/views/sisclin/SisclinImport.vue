<script setup>
import { useSisclinStore } from '@/store/sisclinStore';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';

import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import FileUpload from 'primevue/fileupload';
import Message from 'primevue/message';
import ProgressBar from 'primevue/progressbar';

import * as XLSX from 'xlsx';

const sisclinStore = useSisclinStore();
const toast = useToast();
const BATCH_SIZE = 300;

// Estado del componente
const selectedFile = ref(null);
const processedData = ref([]);
const fileUpload = ref(null);
const isBatchProcessing = ref(false);
const batchResults = ref([]);
const batchProgress = ref({
    currentBatch: 0,
    totalBatches: 0,
    totalProcessed: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    currentBatchStatus: ''
});

// Campos según la especificación de la API
const requiredFields = ['num_doc', 'fec_doc', 'hi_doc', 'ta_doc', 'ota_doc', 'ph_doc', 'cam_doc', 'fing_doc', 'hip_doc', 'nom_pac', 'cod_pac', 'tdi_pac', 'sex_pac', 'dni_pac', 'cod_ser', 'nom_ser', 'id_cia', 'nom_cia'];

// Campos opcionales según la API
const optionalFields = ['fsal_doc', 'hs_doc', 'tipegr', 'cod_dx', 'cod1_dx', 'cod2_dx', 'cod3_dx', 'obs_doc', 'fnac_pac'];

const allFields = [...requiredFields, ...optionalFields];

// Computadas
const isLoading = computed(() => sisclinStore.isLoading);
const hasImportResult = computed(() => sisclinStore.hasImportResult);
const hasBatchResults = computed(() => batchResults.value.length > 0);
const importResult = computed(() => sisclinStore.state.bulkImportResult);
const importHistory = computed(() => sisclinStore.state.importHistory);

const finalStats = computed(() => {
    if (hasBatchResults.value) {
        return {
            total: batchProgress.value.totalProcessed,
            successful: batchProgress.value.totalSuccessful,
            failed: batchProgress.value.totalFailed
        };
    } else if (importResult.value?.summary) {
        return importResult.value.summary;
    }
    return { total: 0, successful: 0, failed: 0 };
});

const finalSuccessRate = computed(() => {
    const stats = finalStats.value;
    return stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0;
});

// Mapeo de columnas de Excel
const excelColumnMapping = {
    num_doc: ['num_doc', 'numero_documento', 'documento'],
    fec_doc: ['fec_doc', 'fecha_documento', 'fecha'],
    hi_doc: ['hi_doc', 'hora_ingreso', 'hora'],
    ta_doc: ['ta_doc', 'tipo_atencion'],
    ota_doc: ['ota_doc', 'origen_tipo_atencion'],
    ph_doc: ['ph_doc', 'procedimiento_hospitalario'],
    cam_doc: ['cam_doc', 'cama'],
    fing_doc: ['fing_doc', 'fecha_ingreso'],
    hip_doc: ['hip_doc', 'hora_ingreso_pac'],
    fsal_doc: ['fsal_doc', 'fecha_salida'],
    hs_doc: ['hs_doc', 'hora_salida'],
    tipegr: ['tipegr', 'tipegr_doc', 'tipo_egreso'],
    cod_dx: ['cod_dx', 'codigo_diagnostico'],
    cod1_dx: ['cod1_dx', 'codigo_diagnostico_1'],
    cod2_dx: ['cod2_dx', 'codigo_diagnostico_2'],
    cod3_dx: ['cod3_dx', 'codigo_diagnostico_3'],
    obs_doc: ['obs_doc', 'observaciones'],
    nom_pac: ['nom_pac', 'nombre_paciente', 'paciente'],
    cod_pac: ['cod_pac', 'cod_paciente', 'codigo_paciente'],
    tdi_pac: ['tdi_pac', 'tdi_doc', 'tipo_documento_identidad'],
    sex_pac: ['sex_pac', 'sexo_paciente', 'sexo'],
    dni_pac: ['dni_pac', 'dni_paciente', 'dni'],
    fnac_pac: ['fnac_pac', 'fecha_nacimiento_paciente', 'fecha_nacimiento'],
    cod_ser: ['cod_ser', 'codigo_medico'],
    nom_ser: ['nom_ser', 'nombre_medico', 'medico'],
    id_cia: ['id_cia', 'id_aseguradora', 'aseguradora_id'],
    nom_cia: ['nom_cia', 'nombre_aseguradora', 'aseguradora']
};

// Event handlers
const onFileSelect = async (event) => {
    selectedFile.value = event.files[0];
    processedData.value = [];
    sisclinStore.clearImportResult();

    if (!selectedFile.value) return;

    try {
        // Automatically process the file to show the preview
        await processExcelFile();
    } catch (error) {
        console.error('Error procesando archivo:', error);
        toast.add({
            severity: 'error',
            summary: 'Error de Procesamiento',
            detail: error.message || 'No se pudo leer el archivo.',
            life: 5000
        });
        // Clear the selection if processing fails
        selectedFile.value = null;
    }
};

const onFileClear = () => {
    selectedFile.value = null;
    processedData.value = [];
    sisclinStore.clearImportResult();
};

// Utilities
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const mapExcelColumn = (columnName) => {
    if (!columnName) return '';
    const lowerColumnName = columnName.toLowerCase().trim();

    for (const [targetField, possibleNames] of Object.entries(excelColumnMapping)) {
        if (possibleNames.some((name) => lowerColumnName === name.toLowerCase())) {
            return targetField;
        }
    }

    return lowerColumnName;
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-PE');
};

const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-PE');
};

const downloadTemplate = () => {
    const headers = [allFields];
    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
    XLSX.writeFile(workbook, 'plantilla_hospitalizaciones.xlsx');
};

// Función principal: Procesar e Importar
const processAndImport = async () => {
    // The file is already processed and data is in `processedData`
    const hospitalizations = processedData.value;

    if (!hospitalizations || hospitalizations.length === 0) {
        toast.add({
            severity: 'error',
            summary: 'Sin Datos',
            detail: 'No hay datos procesados para importar.',
            life: 3000
        });
        return;
    }

    try {
        // Decidir si usar lotes o importación simple
        if (hospitalizations.length <= BATCH_SIZE) {
            await importData(hospitalizations);
        } else {
            await importBatchData(hospitalizations);
        }
    } catch (error) {
        console.error('Error en importación:', error);
        toast.add({
            severity: 'error',
            summary: 'Error de Importación',
            detail: error.message || 'Ocurrió un error inesperado.',
            life: 5000
        });
    }
};

// Procesamiento de Excel (ahora devuelve Promise)
const processExcelFile = () => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) {
                    reject(new Error('El archivo Excel debe contener al menos una fila de encabezados y una fila de datos.'));
                    return;
                }

                const headers = jsonData[0].map((header) => mapExcelColumn(header));
                const rows = jsonData.slice(1);

                const hospitalizations = rows
                    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ''))
                    .map((row, rowIndex) => {
                        const obj = {};

                        // Inicializar todos los campos requeridos
                        requiredFields.forEach((field) => {
                            obj[field] = '';
                        });

                        headers.forEach((header, index) => {
                            if (header && allFields.includes(header) && row[index] !== undefined && row[index] !== null && row[index] !== '') {
                                let value = row[index];

                                // Formateo de fechas - API expects dd-mm-yyyy format
                                if (header.includes('fec_') || header.includes('fnac_') || header === 'fing_doc' || header === 'fsal_doc') {
                                    console.log(`🗓️ Procesando fecha ${header}:`, { originalValue: value, type: typeof value });
                                    // Convertir a Date object primero
                                    let dateObj = null;
                                    
                                    if (typeof value === 'number') {
                                        // Excel serial date
                                        try {
                                            const parsedDate = XLSX.SSF.parse_date_code(value);
                                            if (parsedDate && parsedDate.y && parsedDate.m && parsedDate.d) {
                                                dateObj = new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d);
                                            }
                                        } catch (error) {
                                            console.warn('Error parsing Excel date:', error);
                                        }
                                    } else if (value instanceof Date) {
                                        dateObj = value;
                                    } else if (typeof value === 'string') {
                                        // Intentar parsear diferentes formatos
                                        const trimmed = value.trim();
                                        
                                        if (trimmed.includes('/')) {
                                            // dd/mm/yyyy or mm/dd/yyyy or yyyy/mm/dd
                                            const parts = trimmed.split('/');
                                            if (parts.length === 3) {
                                                let day, month, year;
                                                if (parts[2].length === 4) {
                                                    // dd/mm/yyyy or mm/dd/yyyy
                                                    day = parseInt(parts[0]);
                                                    month = parseInt(parts[1]);
                                                    year = parseInt(parts[2]);
                                                } else if (parts[0].length === 4) {
                                                    // yyyy/mm/dd
                                                    year = parseInt(parts[0]);
                                                    month = parseInt(parts[1]);
                                                    day = parseInt(parts[2]);
                                                }
                                                if (day && month && year) {
                                                    dateObj = new Date(year, month - 1, day);
                                                }
                                            }
                                        } else if (trimmed.includes('-')) {
                                            // dd-mm-yyyy or yyyy-mm-dd
                                            const parts = trimmed.split('-');
                                            if (parts.length === 3) {
                                                let day, month, year;
                                                if (parts[0].length === 4) {
                                                    // yyyy-mm-dd
                                                    year = parseInt(parts[0]);
                                                    month = parseInt(parts[1]);
                                                    day = parseInt(parts[2]);
                                                } else {
                                                    // dd-mm-yyyy
                                                    day = parseInt(parts[0]);
                                                    month = parseInt(parts[1]);
                                                    year = parseInt(parts[2]);
                                                }
                                                if (day && month && year) {
                                                    dateObj = new Date(year, month - 1, day);
                                                }
                                            }
                                        } else {
                                            // Intentar parsear directamente
                                            try {
                                                dateObj = new Date(trimmed);
                                            } catch (error) {
                                                console.warn('Error parsing date string:', error);
                                            }
                                        }
                                    }
                                    
                                    // Si no se pudo parsear, usar fecha actual
                                    if (!dateObj || isNaN(dateObj.getTime())) {
                                        console.warn(`⚠️ Fecha inválida para ${header}, usando fecha actual`);
                                        const today = new Date();
                                        value = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                                    } else {
                                        // Formatear como dd-mm-yyyy
                                        value = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;
                                    }
                                    
                                    // Validar formato final (dd-mm-yyyy)
                                    if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) {
                                        console.warn(`⚠️ Formato de fecha incorrecto para ${header}: ${value}, usando fecha actual`);
                                        const today = new Date();
                                        value = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                                    }
                                    console.log(`✅ Fecha ${header} procesada:`, { finalValue: value });
                                }

                                // Formateo de horas - API expects HH:MM format
                                if (header.includes('hi_') || header.includes('hs_') || header === 'hip_doc') {
                                    console.log(`🕐 Procesando hora ${header}:`, { originalValue: value, type: typeof value });
                                    if (typeof value === 'number' && value < 1) {
                                        const totalMinutes = Math.round(value * 24 * 60);
                                        const hours = Math.floor(totalMinutes / 60);
                                        const minutes = totalMinutes % 60;
                                        value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                                    } else if (typeof value === 'string') {
                                        if (value.includes(':')) {
                                            const timeParts = value.split(':');
                                            if (timeParts.length >= 2) {
                                                const hours = timeParts[0].padStart(2, '0');
                                                const minutes = timeParts[1].padStart(2, '0');
                                                value = `${hours}:${minutes}`;
                                            } else {
                                                const now = new Date();
                                                value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                            }
                                        } else {
                                            const now = new Date();
                                            value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                        }
                                    } else {
                                        const now = new Date();
                                        value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                    }
                                    
                                    // Validar formato final de hora
                                    if (!/^\d{2}:\d{2}$/.test(value)) {
                                        console.warn(`⚠️ Formato de hora incorrecto para ${header}: ${value}, usando hora actual`);
                                        const now = new Date();
                                        value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                    }
                                    console.log(`✅ Hora ${header} procesada:`, { finalValue: value });
                                }

                                obj[header] = String(value).trim();
                            }
                        });

                        // Valores por defecto para campos requeridos faltantes
                        const today = new Date();
                        const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
                        const nowTimeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

                        if (!obj.num_doc) obj.num_doc = `DOC${String(rowIndex + 1).padStart(6, '0')}`;
                        if (!obj.fec_doc) obj.fec_doc = todayStr;
                        if (!obj.hi_doc) obj.hi_doc = nowTimeStr;
                        if (!obj.ta_doc) obj.ta_doc = 'GENERAL';
                        if (!obj.ota_doc) obj.ota_doc = 'CONSULTA';
                        if (!obj.ph_doc) obj.ph_doc = 'PROCEDIMIENTO';
                        if (!obj.cam_doc) obj.cam_doc = `C${rowIndex + 1}`;
                        if (!obj.fing_doc) obj.fing_doc = todayStr;
                        if (!obj.hip_doc) obj.hip_doc = nowTimeStr;
                        if (!obj.nom_pac) obj.nom_pac = `PACIENTE ${rowIndex + 1}`;
                        if (!obj.cod_pac) obj.cod_pac = `PAC${String(rowIndex + 1).padStart(6, '0')}`;
                        if (!obj.tdi_pac) obj.tdi_pac = 'DNI';
                        if (!obj.sex_pac) obj.sex_pac = 'M';
                        if (!obj.dni_pac) obj.dni_pac = `${String(12345678 + rowIndex).padStart(8, '0')}`;
                        if (!obj.cod_ser) obj.cod_ser = '5000';
                        if (!obj.nom_ser) obj.nom_ser = 'MEDICO GENERAL';
                        if (!obj.id_cia) obj.id_cia = '90';
                        if (!obj.nom_cia) obj.nom_cia = 'PARTICULAR';

                        // Campos opcionales - solo incluir si tienen valor
                        // No agregar valores por defecto para campos opcionales

                        return obj;
                    });

                processedData.value = hospitalizations;

                const message =
                    hospitalizations.length > BATCH_SIZE ? `${hospitalizations.length} registros procesados. Se importarán en ${Math.ceil(hospitalizations.length / BATCH_SIZE)} lotes.` : `${hospitalizations.length} registros procesados correctamente.`;

                toast.add({
                    severity: 'success',
                    summary: 'Excel Procesado',
                    detail: message,
                    life: 3000
                });

                resolve(hospitalizations);
            } catch (error) {
                console.error('Error procesando Excel:', error);
                reject(new Error('No se pudo procesar el archivo Excel. Verifica el formato.'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Error al leer el archivo Excel.'));
        };

        reader.readAsBinaryString(selectedFile.value);
    });
};

// Importación simple
const importData = async (hospitalizations) => {
    try {
        const cleanData = {
            hospitalizations: hospitalizations.map((item) => {
                const cleanItem = {};

                // Incluir campos requeridos
                requiredFields.forEach((field) => {
                    cleanItem[field] = item[field] || '';
                });

                // Incluir campos opcionales solo si tienen valor
                optionalFields.forEach((field) => {
                    if (item[field] && item[field].trim()) {
                        cleanItem[field] = item[field].trim();
                    }
                });

                return cleanItem;
            })
        };

        // Validación final de fechas antes de envío
        const firstRecord = cleanData.hospitalizations[0];
        console.log('📤 Datos enviados al backend (primer registro):', JSON.stringify(firstRecord, null, 2));
        console.log('📅 Campos de fecha en el primer registro:', {
            fec_doc: firstRecord.fec_doc,
            fing_doc: firstRecord.fing_doc,
            fsal_doc: firstRecord.fsal_doc,
            fnac_pac: firstRecord.fnac_pac
        });
        
        // Validar que todas las fechas tengan el formato correcto dd-mm-yyyy
        const dateFields = ['fec_doc', 'fing_doc'];
        const optionalDateFields = ['fsal_doc', 'fnac_pac'];
        
        dateFields.forEach(field => {
            if (firstRecord[field] && !/^\d{2}-\d{2}-\d{4}$/.test(firstRecord[field])) {
                console.error(`❌ Formato de fecha incorrecto en ${field}: ${firstRecord[field]}`);
            }
        });
        
        optionalDateFields.forEach(field => {
            if (firstRecord[field] && firstRecord[field].trim() && !/^\d{2}-\d{2}-\d{4}$/.test(firstRecord[field])) {
                console.error(`❌ Formato de fecha opcional incorrecto en ${field}: ${firstRecord[field]}`);
            }
        });
        const response = await sisclinStore.bulkImportHospitalizations(cleanData);

        if (response.success) {
            const { successful, failed, summary } = importResult.value || { successful: [], failed: [], summary: {} };

            if (failed.length === 0) {
                toast.add({
                    severity: 'success',
                    summary: 'Importación Completada',
                    detail: `${summary.successful} registros importados exitosamente.`,
                    life: 5000
                });
            } else {
                toast.add({
                    severity: 'warn',
                    summary: 'Importación Completada con Errores',
                    detail: `${summary.successful} exitosos, ${summary.failed} fallidos.`,
                    life: 5000
                });
            }
        }
    } catch (error) {
        const errorMessage = error.message || 'Error desconocido durante la importación';

        toast.add({
            severity: 'error',
            summary: 'Error de Importación',
            detail: errorMessage,
            life: 5000
        });

        console.error('Error en importación:', error);
    }
};

// Importación por lotes
const createBatches = (data, batchSize = BATCH_SIZE) => {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
    }
    return batches;
};

const importBatchData = async (hospitalizations) => {
    try {
        isBatchProcessing.value = true;
        batchResults.value = [];

        const batches = createBatches(hospitalizations);
        batchProgress.value = {
            currentBatch: 0,
            totalBatches: batches.length,
            totalProcessed: 0,
            totalSuccessful: 0,
            totalFailed: 0,
            currentBatchStatus: 'Iniciando procesamiento por lotes...'
        };

        toast.add({
            severity: 'info',
            summary: 'Procesamiento por Lotes',
            detail: `Iniciando importación de ${hospitalizations.length} registros en ${batches.length} lotes.`,
            life: 5000
        });

        for (let i = 0; i < batches.length; i++) {
            batchProgress.value.currentBatch = i + 1;
            batchProgress.value.currentBatchStatus = `Procesando lote ${i + 1} de ${batches.length} (${batches[i].length} registros)...`;

            try {
                // Limpiar datos - campos requeridos y opcionales con valor
                const cleanBatch = batches[i].map((item) => {
                    const cleanItem = {};

                    // Incluir campos requeridos
                    requiredFields.forEach((field) => {
                        cleanItem[field] = item[field] || '';
                    });

                    // Incluir campos opcionales solo si tienen valor
                    optionalFields.forEach((field) => {
                        if (item[field] && item[field].trim()) {
                            cleanItem[field] = item[field].trim();
                        }
                    });

                    return cleanItem;
                });

                const batchData = { hospitalizations: cleanBatch };
                
                // Log para debug del primer registro del lote
                if (i === 0 && cleanBatch.length > 0) {
                    console.log(`📤 Lote ${i + 1} - Primer registro enviado al backend:`, JSON.stringify(cleanBatch[0], null, 2));
                    console.log('📅 Campos de fecha en el primer registro del lote:', {
                        fec_doc: cleanBatch[0].fec_doc,
                        fing_doc: cleanBatch[0].fing_doc,
                        fsal_doc: cleanBatch[0].fsal_doc,
                        fnac_pac: cleanBatch[0].fnac_pac
                    });
                }
                
                const response = await sisclinStore.bulkImportHospitalizations(batchData);

                if (response.success) {
                    const result = sisclinStore.state.bulkImportResult;
                    batchResults.value.push({
                        batchNumber: i + 1,
                        result: result,
                        success: true
                    });

                    batchProgress.value.totalProcessed += result.summary.total;
                    batchProgress.value.totalSuccessful += result.summary.successful;
                    batchProgress.value.totalFailed += result.summary.failed;
                } else {
                    throw new Error('Error en el lote');
                }

                sisclinStore.clearImportResult();

                if (i < batches.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`Error en lote ${i + 1}:`, error);

                batchResults.value.push({
                    batchNumber: i + 1,
                    error: error.message || 'Error desconocido',
                    success: false
                });

                toast.add({
                    severity: 'error',
                    summary: `Error en Lote ${i + 1}`,
                    detail: error.message || 'Error procesando el lote',
                    life: 5000
                });
            }
        }

        batchProgress.value.currentBatchStatus = 'Procesamiento completado';

        const successfulBatches = batchResults.value.filter((b) => b.success).length;
        const failedBatches = batchResults.value.filter((b) => !b.success).length;

        if (failedBatches === 0) {
            toast.add({
                severity: 'success',
                summary: 'Importación Completada',
                detail: `Todos los ${successfulBatches} lotes procesados exitosamente. ${batchProgress.value.totalSuccessful} registros importados.`,
                life: 8000
            });
        } else {
            toast.add({
                severity: 'warn',
                summary: 'Importación Completada con Errores',
                detail: `${successfulBatches} lotes exitosos, ${failedBatches} lotes con errores. Total: ${batchProgress.value.totalSuccessful} exitosos.`,
                life: 8000
            });
        }
    } catch (error) {
        console.error('Error en importación por lotes:', error);
        toast.add({
            severity: 'error',
            summary: 'Error en Procesamiento por Lotes',
            detail: error.message || 'Error desconocido',
            life: 5000
        });
    } finally {
        isBatchProcessing.value = false;
    }
};

const clearData = () => {
    selectedFile.value = null;
    processedData.value = [];
    batchResults.value = [];
    isBatchProcessing.value = false;
    batchProgress.value = {
        currentBatch: 0,
        totalBatches: 0,
        totalProcessed: 0,
        totalSuccessful: 0,
        totalFailed: 0,
        currentBatchStatus: ''
    };
    sisclinStore.clearImportResult();

    if (fileUpload.value) {
        fileUpload.value.clear();
    }

    toast.add({
        severity: 'info',
        summary: 'Datos Limpiados',
        detail: 'Formulario reiniciado.',
        life: 2000
    });
};

const startNewImport = () => {
    selectedFile.value = null;
    processedData.value = [];
    batchResults.value = [];
    isBatchProcessing.value = false;
    batchProgress.value = {
        currentBatch: 0,
        totalBatches: 0,
        totalProcessed: 0,
        totalSuccessful: 0,
        totalFailed: 0,
        currentBatchStatus: ''
    };
    sisclinStore.clearImportResult();

    if (fileUpload.value) {
        fileUpload.value.clear();
    }
};
</script>

<template>
    <div class="bg-gray-50 p-4 md:p-8">
        <div class="max-w-7xl mx-auto">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Columna de Instrucciones -->
                <div class="lg:col-span-1">
                    <div class="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <div class="flex items-center mb-4">
                            <i class="pi pi-info-circle text-blue-500 text-2xl mr-3"></i>
                            <h2 class="text-xl font-bold text-gray-800">Instrucciones</h2>
                        </div>
                        <ol class="list-decimal list-inside space-y-3 text-gray-600">
                            <li>
                                <strong>Descargue la Plantilla:</strong>
                                <span class="block text-sm">Asegúrese de usar el formato correcto.</span>
                                <Button label="Descargar Plantilla (.xlsx)" icon="pi pi-download" @click="downloadTemplate" class="p-button-text p-button-sm mt-1" />
                            </li>
                            <li>
                                <strong>Prepare su Archivo:</strong>
                                <span class="block text-sm">Llene la plantilla con los datos de hospitalización. La primera fila debe contener los encabezados.</span>
                            </li>
                            <li>
                                <strong>Cargue el Archivo:</strong>
                                <span class="block text-sm">Arrastre y suelte o seleccione su archivo Excel (.xlsx, .xls).</span>
                            </li>
                            <li>
                                <strong>Revise y Confirme:</strong>
                                <span class="block text-sm">Verifique la vista previa de los datos y presione "Importar" para iniciar el proceso.</span>
                            </li>
                        </ol>
                    </div>
                </div>

                <!-- Columna Principal de Importación -->
                <div class="lg:col-span-2">
                    <div class="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <!-- PASO 1: Carga de Archivo -->
                        <div v-if="!processedData.length && !hasImportResult && !hasBatchResults">
                            <h2 class="text-xl font-bold text-gray-800 mb-1">Importación Masiva de Hospitalizaciones</h2>
                            <p class="text-gray-500 mb-6">Comience cargando su archivo de datos.</p>

                            <FileUpload
                                ref="fileUpload"
                                name="excelFile"
                                @select="onFileSelect"
                                :multiple="false"
                                accept=".xlsx,.xls"
                                :maxFileSize="10000000"
                                :showUploadButton="false"
                                :showCancelButton="false"
                                :customUpload="true"
                                class="w-full"
                            >
                                <template #empty>
                                    <div class="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors">
                                        <i class="pi pi-cloud-upload text-4xl text-gray-400 mb-3"></i>
                                        <p class="text-lg text-gray-600">Arrastre y suelte el archivo aquí</p>
                                        <p class="text-sm text-gray-500">o</p>
                                        <Button label="Seleccionar Archivo" icon="pi pi-plus" class="p-button-sm" />
                                        <p class="text-xs text-gray-400 mt-4">Formatos soportados: .xlsx, .xls (Max 10MB)</p>
                                    </div>
                                </template>
                            </FileUpload>

                            <div v-if="selectedFile" class="mt-4 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <i class="pi pi-file-excel text-2xl"></i>
                                    <div>
                                        <div class="font-bold">{{ selectedFile.name }}</div>
                                        <div class="text-sm">{{ formatFileSize(selectedFile.size) }}</div>
                                    </div>
                                </div>
                                <Button icon="pi pi-times" class="p-button-rounded p-button-text p-button-plain" @click="onFileClear" />
                            </div>
                        </div>

                        <!-- PASO 2: Vista Previa y Confirmación -->
                        <div v-if="processedData.length > 0 && !hasImportResult && !hasBatchResults">
                            <h2 class="text-xl font-bold text-gray-800 mb-1">Revisar y Confirmar</h2>
                            <p class="text-gray-500 mb-4">Se han procesado {{ processedData.length }} registros desde su archivo.</p>
                            
                            <div class="border rounded-lg overflow-hidden">
                                <DataTable :value="processedData.slice(0, 5)" responsiveLayout="scroll" class="p-datatable-sm">
                                    <Column field="num_doc" header="Nro. Doc"></Column>
                                    <Column field="nom_pac" header="Paciente"></Column>
                                    <Column field="fec_doc" header="Fecha Doc"></Column>
                                    <Column field="cod_dx" header="Diagnóstico"></Column>
                                </DataTable>
                            </div>
                            <p class="text-sm text-gray-500 mt-2">Mostrando los primeros 5 de {{ processedData.length }} registros.</p>

                            <Message v-if="processedData.length > BATCH_SIZE" severity="warn" class="mt-4">
                                Su archivo excede los {{ BATCH_SIZE }} registros y será procesado en {{ Math.ceil(processedData.length / BATCH_SIZE) }} lotes.
                            </Message>

                            <div class="mt-6 flex items-center justify-end gap-3">
                                <Button label="Cancelar" icon="pi pi-times" @click="clearData" class="p-button-text" />
                                <Button label="Iniciar Importación" icon="pi pi-upload" @click="processAndImport" :loading="isLoading || isBatchProcessing" />
                            </div>
                        </div>

                        <!-- PASO 3: Resultados -->
                        <div v-if="hasImportResult || hasBatchResults || isBatchProcessing">
                            <h2 class="text-xl font-bold text-gray-800 mb-1">Resultados de la Importación</h2>
                            <p class="text-gray-500 mb-6">El proceso ha finalizado. Aquí está el resumen.</p>

                            <!-- Progreso de Lotes -->
                            <div v-if="isBatchProcessing" class="mb-6">
                                <div class="flex justify-between items-center mb-1">
                                    <span class="text-gray-600 font-semibold">{{ batchProgress.currentBatchStatus }}</span>
                                    <span class="text-gray-500">Lote {{ batchProgress.currentBatch }} de {{ batchProgress.totalBatches }}</span>
                                </div>
                                <ProgressBar :value="(batchProgress.currentBatch / batchProgress.totalBatches) * 100" />
                            </div>

                            <!-- Estadísticas Finales -->
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
                                <div class="bg-gray-100 p-4 rounded-lg">
                                    <div class="text-2xl font-bold text-gray-800">{{ finalStats.total }}</div>
                                    <div class="text-sm text-gray-600">Total</div>
                                </div>
                                <div class="bg-green-100 p-4 rounded-lg">
                                    <div class="text-2xl font-bold text-green-800">{{ finalStats.successful }}</div>
                                    <div class="text-sm text-green-600">Exitosos</div>
                                </div>
                                <div class="bg-red-100 p-4 rounded-lg">
                                    <div class="text-2xl font-bold text-red-800">{{ finalStats.failed }}</div>
                                    <div class="text-sm text-red-600">Fallidos</div>
                                </div>
                                <div class="bg-blue-100 p-4 rounded-lg">
                                    <div class="text-2xl font-bold text-blue-800">{{ finalSuccessRate }}%</div>
                                    <div class="text-sm text-blue-600">Tasa de Éxito</div>
                                </div>
                            </div>

                            <!-- Detalles de Errores -->
                            <div v-if="importResult?.failed?.length > 0" class="mb-6">
                                <h3 class="font-semibold text-lg text-gray-800 mb-2">Detalle de Registros Fallidos</h3>
                                <div class="max-h-60 overflow-y-auto space-y-2 pr-2">
                                    <div v-for="item in importResult.failed" :key="item.index" class="bg-red-50 p-3 rounded-lg border border-red-200">
                                        <p class="font-semibold text-red-800">Paciente: {{ item.patient || 'No especificado' }} (Doc: {{ item.number || 'N/A' }})</p>
                                        <p class="text-sm text-red-700">Error: {{ item.error }}</p>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-8 flex justify-center">
                                <Button label="Realizar Nueva Importación" icon="pi pi-plus" @click="startNewImport" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Historial de Importaciones -->
            <div v-if="importHistory.length > 0" class="mt-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Historial de Sesión</h3>
                <DataTable :value="importHistory" class="p-datatable-sm" responsiveLayout="scroll">
                    <Column field="timestamp" header="Fecha/Hora">
                        <template #body="{ data }">{{ formatDateTime(data.timestamp) }}</template>
                    </Column>
                    <Column field="summary.total" header="Total"></Column>
                    <Column field="summary.successful" header="Exitosos">
                        <template #body="{ data }"><span class="text-green-600 font-semibold">{{ data.summary.successful }}</span></template>
                    </Column>
                    <Column field="summary.failed" header="Fallidos">
                        <template #body="{ data }"><span class="text-red-600 font-semibold">{{ data.summary.failed }}</span></template>
                    </Column>
                    <Column header="Tasa Éxito">
                        <template #body="{ data }">
                            <div class="flex items-center gap-2">
                                <ProgressBar :value="Math.round((data.summary.successful / data.summary.total) * 100)" style="height: 8px" />
                                <span>{{ Math.round((data.summary.successful / data.summary.total) * 100) }}%</span>
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>
    </div>
</template>

<style>
/* Ocultar la UI por defecto de PrimeVue FileUpload cuando se usa el slot personalizado */
.p-fileupload-basic {
    display: none;
}
.p-fileupload-content {
    padding: 0;
    border: none;
}
</style>
