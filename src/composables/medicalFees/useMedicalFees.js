import ExcelParserService from '@/services/medicalFees/ExcelParserService';
import MedicalFeesService from '@/services/medicalFees/MedicalFeesService';
import ServiceClassifier from '@/services/medicalFees/ServiceClassifier';
import { computed, ref } from 'vue';
import * as XLSX from 'xlsx';

/**
 * Composable principal para gestión de honorarios médicos
 * Orquesta la lógica de importación, clasificación y exportación
 */
export function useMedicalFees() {
    const doctors = ref([]);
    const schedules = ref([]);
    const services = ref([]);
    const isLoading = ref(false);
    const error = ref(null);

    // Mapas para búsqueda rápida
    const doctorMap = computed(() =>
        MedicalFeesService.createDoctorCodeMap(doctors.value)
    );

    const scheduleMap = computed(() =>
        MedicalFeesService.createScheduleMap(schedules.value)
    );

    /**
     * Carga médicos y horarios del backend
     * @param {string} startDate - Fecha inicio
     * @param {string} endDate - Fecha fin
     */
    async function loadDoctorsAndSchedules(startDate, endDate) {
        isLoading.value = true;
        error.value = null;

        try {
            const [doctorsData, schedulesData] = await Promise.all([
                MedicalFeesService.getDoctors(),
                MedicalFeesService.getDoctorSchedules(startDate, endDate)
            ]);

            doctors.value = doctorsData;
            schedules.value = schedulesData;
        } catch (err) {
            error.value = `Error al cargar datos: ${err.message}`;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Importa servicios desde Excel
     * @param {File} file - Archivo Excel
     * @returns {Promise<Array>} Servicios procesados
     */
    async function importFromExcel(file) {
        isLoading.value = true;
        error.value = null;

        try {
            // 1. Parsear Excel
            const rawData = await ExcelParserService.parseFile(file);

            // 2. Validar estructura
            const validation = ExcelParserService.validateStructure(rawData);
            if (!validation.valid) {
                throw new Error(`Excel inválido: ${validation.errors.join(', ')}`);
            }

            // 3. Filtrar registros inválidos (comprobante vacío/------------- Y cia PARTICULAR)
            const validData = rawData.filter(row => !ExcelParserService.shouldExcludeRecord(row));
            
            const excludedCount = rawData.length - validData.length;
            if (excludedCount > 0) {
                console.log(`[useMedicalFees] ${excludedCount} registros excluidos (comprobante inválido + PARTICULAR)`);
            }

            // 4. Mapear a modelo
            const parsedServices = validData.map(row =>
                ExcelParserService.mapToServiceModel(row)
            );

            // 5. Enriquecer con datos de médico y horario
            const enrichedServices = parsedServices.map(service => {
                const doctor = doctorMap.value.get(service.doctorCode);
                const scheduleKey = `${service.doctorCode}_${service.date}`;
                const daySchedules = scheduleMap.value.get(scheduleKey) || [];

                return {
                    ...service,
                    doctor,
                    schedules: daySchedules,
                    isValid: !!doctor
                };
            });

            // 6. Clasificar servicios en PLANILLA o RETÉN
            const classifiedServices = enrichedServices.map(service => {
                if (!service.isValid) {
                    return {
                        ...service,
                        serviceType: 'RETÉN',
                        serviceTypeReason: 'Médico no encontrado',
                        matchedSchedule: null
                    };
                }

                const classification = ServiceClassifier.classifyService(
                    service,
                    service.schedules
                );

                return {
                    ...service,
                    serviceType: classification.type,
                    serviceTypeReason: classification.reason,
                    matchedSchedule: classification.schedule
                };
            });

            services.value = classifiedServices;
            return classifiedServices;

        } catch (err) {
            error.value = `Error al importar Excel: ${err.message}`;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Agrupa servicios por médico con totales
     */
    const servicesByDoctor = computed(() => {
        const grouped = new Map();

        services.value.forEach(service => {
            if (!service.doctor) return;

            const doctorCode = service.doctor.code;
            if (!grouped.has(doctorCode)) {
                grouped.set(doctorCode, {
                    doctor: service.doctor,
                    services: [],
                    totalGenerated: 0,
                    totalPlanilla: 0,
                    totalReten: 0,
                    serviceCount: 0,
                    planillaCount: 0,
                    retenCount: 0
                });
            }

            const group = grouped.get(doctorCode);
            group.services.push(service);
            group.totalGenerated += service.amount;
            group.serviceCount++;

            if (service.serviceType === 'PLANILLA') {
                group.totalPlanilla += service.amount;
                group.planillaCount++;
            } else {
                group.totalReten += service.amount;
                group.retenCount++;
            }
        });

        return Array.from(grouped.values());
    });

    /**
     * Servicios agrupados por tipo (PLANILLA/RETÉN)
     */
    const servicesByType = computed(() =>
        ServiceClassifier.groupByType(services.value)
    );

    /**
     * Totales generales
     */
    const totals = computed(() => ({
        totalGenerated: services.value.reduce((sum, s) => sum + s.amount, 0),
        totalPlanilla: servicesByType.value.planilla.reduce((sum, s) => sum + s.amount, 0),
        totalReten: servicesByType.value.reten.reduce((sum, s) => sum + s.amount, 0),
        serviceCount: services.value.length,
        planillaCount: servicesByType.value.planilla.length,
        retenCount: servicesByType.value.reten.length,
        doctorCount: servicesByDoctor.value.length
    }));

    /**
     * Formatea fecha de YYYY-MM-DD a DD/MM/YYYY para Excel
     * @param {string} dateString - Fecha en formato YYYY-MM-DD
     * @returns {string} Fecha en formato DD/MM/YYYY
     */
    function formatDateForExcel(dateString) {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    /**
     * Exporta servicios filtrados a Excel
     * @param {Array} filteredServices - Servicios a exportar
     * @param {string} filename - Nombre del archivo
     */
    function exportToExcel(filteredServices, filename = 'honorarios_medicos.xlsx') {
        if (!filteredServices || filteredServices.length === 0) {
            throw new Error('No hay servicios para exportar');
        }

        // Preparar datos para Excel - Incluir TODOS los campos del Excel original
        const excelData = filteredServices.map(service => {
            // Calcular comisión según reglas específicas
            const codSeg = service.rawData?.cod_seg?.toString().trim() || '';
            const importe = parseFloat(service.rawData?.importe) || 0;
            const isPlanilla = service.serviceType === 'PLANILLA';
            const isReten = service.serviceType === 'RETÉN';
            const cia = service.rawData?.cia?.toString().trim().toUpperCase() || '';
            
            let comision = '';
            
            // Regla 1: 50% si es PLANILLA Y cod_seg = 00.18.66
            if (isPlanilla && codSeg === '00.18.66') {
                comision = parseFloat((importe * 0.50).toFixed(2));
            }
            // Regla 2: 92.5% si es RETÉN Y cod_seg = 50.00.00 Y cia != PARTICULAR
            else if (isReten && codSeg === '50.00.00' && cia !== 'PARTICULAR') {
                comision = parseFloat((importe * 0.925).toFixed(2));
            }
            
            // Ajustar el detalle según si tiene comisión o no
            let detalle = service.serviceTypeReason || '';
            const segusIndicatesReten = service.rawData?.segus?.toUpperCase().includes('RETEN');
            const hasCommission = comision !== '' && comision > 0;
            
            // Solo agregar advertencia si es RETÉN, NO tiene comisión Y segus NO indica RETEN
            if (isReten && !hasCommission && !segusIndicatesReten && detalle.includes('⚠️ Revisar atención, codigo NO RETEN')) {
                // La advertencia ya está en el detalle, mantenerla
            } else if (isReten && !hasCommission && !segusIndicatesReten && !detalle.includes('⚠️ Revisar atención, codigo NO RETEN')) {
                // Agregar advertencia si no está
                detalle += ' ⚠️ Revisar atención, codigo NO RETEN';
            } else if (isReten && hasCommission && detalle.includes('⚠️ Revisar atención, codigo NO RETEN')) {
                // Remover advertencia si tiene comisión
                detalle = detalle.replace(' ⚠️ Revisar atención, codigo NO RETEN', '');
            }
            
            // Convertir fecha DD/MM/YYYY a objeto Date de Excel
            let excelDate = '';
            if (service.date) {
                const [year, month, day] = service.date.split('-');
                excelDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            
            return {
                // Campos procesados
                'Admisión': service.rawData?.admision || '',
                'Código Médico': service.doctorCode ? `'${service.doctorCode}` : '', // Forzar como texto con '
                'Fecha': excelDate, // Objeto Date para Excel
                'Hora': service.time || '',
                'Servicio': service.serviceName || '',
                'Paciente': service.patientName || '',
                'Segus': service.rawData?.segus || '',
                'Monto': importe,
                'Tipo': service.serviceType || '',
                'Detalle': detalle,
                'Comisión': comision,
                
                // Campos adicionales del Excel original (solo los necesarios)
                'CIA': service.rawData?.cia || '',
                'Comprobante': service.rawData?.comprobante || '',
                'Cod_Seg': service.rawData?.cod_seg || '',
                'Importe': importe,
                'Tipoate': service.rawData?.tipoate || '',
                'Area': service.rawData?.area || ''
            };
        });

        // Crear workbook
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Honorarios Médicos');

        // Aplicar formatos específicos a las columnas
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            // Columna B (Código Médico) - Forzar como texto
            const codigoMedicoCell = ws[`B${R + 1}`];
            if (codigoMedicoCell && codigoMedicoCell.v) {
                codigoMedicoCell.t = 's'; // Tipo string/texto
                codigoMedicoCell.v = String(codigoMedicoCell.v).replace(/^'/, ''); // Remover ' si existe
            }
            
            // Columna C (Fecha) - Formato de fecha DD/MM/YYYY
            const dateCell = ws[`C${R + 1}`];
            if (dateCell && dateCell.v instanceof Date) {
                dateCell.t = 'd'; // Tipo fecha
                dateCell.z = 'dd/mm/yyyy'; // Formato fecha
            }
            
            // Columna H (Monto) - Formato moneda S/
            const montoCell = ws[`H${R + 1}`];
            if (montoCell && !isNaN(montoCell.v)) {
                montoCell.t = 'n';
                montoCell.z = '"S/ "#,##0.00';
            }
            
            // Columna K (Comisión) - Formato moneda S/
            const comisionCell = ws[`K${R + 1}`];
            if (comisionCell && comisionCell.v !== '' && !isNaN(comisionCell.v)) {
                comisionCell.t = 'n';
                comisionCell.z = '"S/ "#,##0.00';
            }
            
            // Columna O (Importe) - Formato moneda S/
            const importeCell = ws[`O${R + 1}`];
            if (importeCell && !isNaN(importeCell.v)) {
                importeCell.t = 'n';
                importeCell.z = '"S/ "#,##0.00';
            }
        }

        // Generar archivo
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellDates: true });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    return {
        // State
        doctors,
        schedules,
        services,
        isLoading,
        error,

        // Computed
        servicesByDoctor,
        servicesByType,
        totals,

        // Methods
        loadDoctorsAndSchedules,
        importFromExcel,
        exportToExcel
    };
}
