import ExcelParserService from '@/services/medicalFees/ExcelParserService';
import MedicalFeesService from '@/services/medicalFees/MedicalFeesService';
import ServiceClassifier from '@/services/medicalFees/ServiceClassifier';
import { useDoctorTariffsStore } from '@/store/doctorTariffsStore';
import { computed, ref } from 'vue';
import * as XLSX from 'xlsx';

export function useMedicalFees() {
    // Stores
    const doctorTariffsStore = useDoctorTariffsStore();

    // State
    const doctors = ref([]);
    const schedules = ref([]);
    const services = ref([]); // Datos mostrados en el DataTable (desde BD)
    const pendingImportServices = ref([]); // Datos importados del Excel pendientes de guardar
    const isLoading = ref(false);
    const error = ref(null);
    const isExcelData = ref(false);

    // Maps para búsqueda rápida
    const doctorMap = computed(() => {
        const map = new Map();
        doctors.value.forEach((doctor) => {
            if (doctor.code) {
                map.set(doctor.code, doctor);
            }
        });
        return map;
    });

    const scheduleMap = computed(() => {
        const map = new Map();
        schedules.value.forEach((schedule) => {
            const key = `${schedule.doctor?.code}_${schedule.date}`;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(schedule);
        });
        return map;
    });

    /**
     * Calcula la comisión de un servicio según reglas de negocio
     * @param {Object} params - Parámetros para el cálculo
     * @returns {number} Monto de comisión calculado
     */
    function calculateCommissionRule({ type, amount, cia, doctorCode, segusCode, doctor, admision }) {
        let comision = 0;
        const importe = parseFloat(amount) || 0;
        const isPlanilla = type === 'PLANILLA';
        const isReten = type === 'RETEN' || type === 'RETÉN';
        const company = cia?.toString().trim().toUpperCase() || '';

        // Códigos de consulta que NO tienen comisión en PLANILLA
        const consultationCodes = ['00.19.25', '00.19.27'];

        // Excepción: 50.03.00 (CONSULTA EN PACIENTE HOSPITALIZADO) SÍ tiene comisión
        const isConsultationCode = (segusCode?.startsWith('50.0') && segusCode !== '50.03.00') || consultationCodes.includes(segusCode);

        // Regla 1: Validar con tarifarios médicos si es PLANILLA
        if (isPlanilla && !isConsultationCode) {
            // Buscar tarifario del médico que coincida con el código del servicio
            const tariff = doctorTariffsStore.allTariffs.find((t) => t.tariff_code === segusCode && t.doctor_code === doctorCode);

            // Determinar si se aplica comisión según la compañía
            let shouldApplyCommission = false;

            if (company === 'PARTICULAR') {
                // Para PARTICULAR: validar clinic_commission > 0 Y doctor_commission = 0/null
                shouldApplyCommission = tariff && parseFloat(tariff.clinic_commission) > 0 && (tariff.doctor_commission === null || parseFloat(tariff.doctor_commission) === 0);
            } else {
                // Para otras compañías: solo validar que sea PLANILLA y no código de consulta
                shouldApplyCommission = true;
            }

            // Aplicar comisión si cumple las condiciones
            if (shouldApplyCommission) {
                // Verificar que el médico tenga porcentaje de comisión > 0
                const commissionPercentage = doctor?.commission_percentage;

                if (commissionPercentage && parseFloat(commissionPercentage) > 0) {
                    // Aplicar comisión personalizada del médico
                    const percentage = parseFloat(commissionPercentage) / 100;
                    comision = parseFloat((importe * percentage).toFixed(2));
                }
            }
        }
        // Regla 2: Porcentaje variable para RETÉN con seguros/EPS
        // Excluir específicamente los códigos de consulta 50.00.00 y 50.00.01 (igual que en PLANILLA)
        // CORRECCIÓN: Esta exclusión NO aplica para seguros (todo entra a clínica y se paga después)
        const isExcludedRetenCode = ['50.00.00', '50.00.01'].includes(segusCode);

        // Para seguros SÍ calculamos comisión normalmente
        if (isReten && company !== 'PARTICULAR') {
            // Usar insurance_commission_percentage si está configurado, sino usar 92.5% por defecto
            const insurancePercentage = doctor?.insurance_commission_percentage;

            if (insurancePercentage && parseFloat(insurancePercentage) > 0) {
                // Aplicar porcentaje personalizado para seguros
                const percentage = parseFloat(insurancePercentage) / 100;
                comision = parseFloat((importe * percentage).toFixed(2));
            } else {
                // Fallback: 92.5% fijo (compatibilidad con médicos sin configuración)
                comision = parseFloat((importe * 0.925).toFixed(2));
            }
        }
        // Regla 3: RETÉN + PARTICULAR con tarifario que indica todo para clínica
        // Aquí SÍ aplicamos la exclusión de códigos de consulta
        else if (isReten && !isExcludedRetenCode && company === 'PARTICULAR') {
            // Buscar tarifario del médico para validar distribución de ingresos
            const tariff = doctorTariffsStore.allTariffs.find((t) => t.tariff_code === segusCode && t.doctor_code === doctorCode);

            // Si existe tarifario y muestra que todo ingresa para clínica (doctor_commission = 0/null)
            // entonces el médico SÍ debe recibir comisión por trabajar en RETÉN
            if (tariff && parseFloat(tariff.clinic_commission) > 0 && (tariff.doctor_commission === null || parseFloat(tariff.doctor_commission) === 0)) {
                const commissionPercentage = doctor?.commission_percentage;

                if (commissionPercentage && parseFloat(commissionPercentage) > 0) {
                    // Aplicar comisión según porcentaje del médico
                    const percentage = parseFloat(commissionPercentage) / 100;
                    comision = parseFloat((importe * percentage).toFixed(2));
                }
            }
            // Si el médico tiene doctor_commission > 0, no recibe comisión adicional
            // (ya está cobrando su tarifa personalizada)
        }

        return comision;
    }

    /**
     * Carga médicos, horarios y tarifarios desde el backend
     * @param {string} startDate - Fecha inicio YYYY-MM-DD
     * @param {string} endDate - Fecha fin YYYY-MM-DD
     */
    async function loadDoctorsAndSchedules(startDate, endDate) {
        isLoading.value = true;
        error.value = null;

        try {
            const [doctorsData, schedulesData] = await Promise.all([MedicalFeesService.getDoctors(), MedicalFeesService.getDoctorSchedules(startDate, endDate), doctorTariffsStore.fetchTariffs()]);

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

            // 3. Filtrar registros inválidos
            const validData = rawData.filter((row) => !ExcelParserService.shouldExcludeRecord(row));

            const excludedCount = rawData.length - validData.length;
            if (excludedCount > 0) {
                console.log(`[useMedicalFees] ${excludedCount} registros excluidos`);
            }

            // 4. Filtrar por código médico >= 5000
            const filteredByDoctorCode = validData.filter((row) => {
                const doctorCode = row.cod_seri?.toString().trim();
                if (!doctorCode) return false;

                const codeNumber = parseInt(doctorCode, 10);
                return !isNaN(codeNumber) && codeNumber >= 5000;
            });

            const doctorCodeExcluded = validData.length - filteredByDoctorCode.length;
            if (doctorCodeExcluded > 0) {
                console.log(`[useMedicalFees] ${doctorCodeExcluded} servicios excluidos por código médico < 5000`);
            }

            // 5. Mapear a modelo
            const parsedServices = filteredByDoctorCode.map((row) => ExcelParserService.mapToServiceModel(row));

            // 6. Enriquecer con datos de médico y horario
            const enrichedServices = parsedServices.map((service) => {
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

            // 7. Clasificar servicios en PLANILLA o RETÉN y Calcular Comisiones
            const classifiedServices = enrichedServices.map((service) => {
                if (!service.isValid) {
                    return {
                        ...service,
                        serviceType: 'RETEN',
                        serviceTypeReason: 'Médico no encontrado',
                        matchedSchedule: null,
                        comision: 0,
                        cia: service.rawData?.cia?.toString().trim().toUpperCase() || '',
                        tipoate: service.rawData?.tipoate || ''
                    };
                }

                const classification = ServiceClassifier.classifyService(service, service.schedules);

                // --- Lógica de Cálculo de Comisión (Movida desde exportToExcel) ---
                // --- Lógica de Cálculo de Comisión (Refactorizada) ---
                const codSeg = service.rawData?.cod_seg?.toString().trim() || '';
                const importe = parseFloat(service.rawData?.importe) || 0;
                const cia = service.rawData?.cia?.toString().trim().toUpperCase() || '';
                const doctorCode = service.doctorCode;
                const isReten = classification.type === 'RETEN' || classification.type === 'RETÉN';

                // Normalizar classification.type si viene con tilde
                let finalType = classification.type;
                if (finalType === 'RETÉN') finalType = 'RETEN';

                const comision = calculateCommissionRule({
                    type: finalType,
                    amount: importe,
                    cia: cia,
                    doctorCode: doctorCode,
                    segusCode: codSeg,
                    doctor: service.doctor,
                    admision: service.rawData?.admision
                });

                // Ajustar el detalle según si tiene comisión o no
                let detalle = classification.reason || '';
                const segusIndicatesReten = service.rawData?.segus?.toUpperCase().includes('RETEN');
                const hasCommission = comision > 0;
                const isParticular = cia === 'PARTICULAR';

                // Validación 1: RETÉN sin comisión y código NO indica RETÉN
                if (isReten && !hasCommission && !segusIndicatesReten && !detalle.includes('⚠️ Revisar atención, codigo NO RETEN')) {
                    detalle += ' ⚠️ Revisar atención, codigo NO RETEN';
                } else if (isReten && hasCommission && detalle.includes('⚠️ Revisar atención, codigo NO RETEN')) {
                    detalle = detalle.replace(' ⚠️ Revisar atención, codigo NO RETEN', '');
                }

                // Validación 2: PARTICULAR sin tarifario configurado (requiere revisión manual)
                if (isParticular && !hasCommission) {
                    // Buscar si existe tarifario para este servicio
                    const tariff = doctorTariffsStore.allTariffs.find((t) => t.tariff_code === codSeg && t.doctor_code === doctorCode);

                    // Si NO existe tarifario, agregar alerta de revisión manual
                    if (!tariff && !detalle.includes('⚠️ SIN TARIFARIO PARTICULAR')) {
                        detalle += ' ⚠️ SIN TARIFARIO PARTICULAR - Revisar si ingreso fue para clínica o médico cobró con tarifa general';
                    }
                }

                return {
                    ...service,
                    serviceType: finalType,
                    serviceTypeReason: detalle,
                    matchedSchedule: classification.schedule,
                    comision: comision,
                    cia: cia,
                    tipoate: service.rawData?.tipoate || ''
                };
            });

            // Guardar en pendingImportServices (NO en services para que no se muestren en el DataTable)
            pendingImportServices.value = classifiedServices;
            isExcelData.value = true;
            console.log('[useMedicalFees] isExcelData set to TRUE (Excel imported)', classifiedServices.length, 'services pending');
            return classifiedServices;
        } catch (err) {
            error.value = `Error al importar Excel: ${err.message}`;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Limpia todos los servicios
     */
    function clearAllData() {
        services.value = [];
        pendingImportServices.value = [];
        isExcelData.value = false;
    }

    /**
     * Agrupa servicios por médico con totales
     */
    const servicesByDoctor = computed(() => {
        const grouped = new Map();

        services.value.forEach((service) => {
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
    const servicesByType = computed(() => ServiceClassifier.groupByType(services.value));

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
     * Exporta servicios filtrados a Excel
     * @param {Array} filteredServices - Servicios a exportar
     * @param {string} filename - Nombre del archivo
     */
    function exportToExcel(filteredServices, filename = 'honorarios_medicos.xlsx') {
        // Validación robusta
        if (!filteredServices || !Array.isArray(filteredServices) || filteredServices.length === 0) {
            throw new Error('No hay servicios para exportar');
        }

        // Preparar datos para Excel - Hoja 1: Detalle
        const excelData = filteredServices.map((service) => {
            // Convertir fecha a formato DD/MM/YYYY
            let excelDate = '';
            if (service.date) {
                const [year, month, day] = service.date.split('-');
                excelDate = `${day}/${month}/${year}`;
            }

            return {
                Admisión: service.rawData?.admision || '',
                'Código Médico': service.doctorCode ? `'${service.doctorCode}` : '',
                Fecha: excelDate,
                Hora: service.time || '',
                Médico: service.doctor?.name || service.serviceName || '',
                Paciente: service.patientName || '',
                Servicio: service.generalTariff?.name || 'N/A',
                'Código Servicio': service.rawData?.segus || '',
                Monto: service.amount,
                Tipo: service.serviceType || '',
                Detalle: service.serviceTypeReason,
                Comisión: service.comision,
                CIA: service.cia,
                Comprobante: service.rawData?.comprobante || '',
                'Tipo Atención': service.tipoate || '',
                Area: service.rawData?.area || ''
            };
        });

        // Crear workbook
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Honorarios Médicos');

        // Aplicar formatos a Hoja 1
        const range = XLSX.utils.decode_range(ws['!ref']);

        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            // Código Médico como texto
            const codigoMedicoCell = ws[`B${R + 1}`];
            if (codigoMedicoCell && codigoMedicoCell.v) {
                codigoMedicoCell.t = 's';
                codigoMedicoCell.v = String(codigoMedicoCell.v).replace(/^'/, '');
            }

            // Fecha como texto
            const dateCell = ws[`C${R + 1}`];
            if (dateCell && dateCell.v) {
                dateCell.t = 's';
            }

            // Monto con formato S/
            const montoCell = ws[`H${R + 1}`];
            if (montoCell && !isNaN(montoCell.v)) {
                montoCell.t = 'n';
                montoCell.z = '"S/ "#,##0.00';
            }

            // Comisión con formato S/
            const comisionCell = ws[`K${R + 1}`];
            if (comisionCell && comisionCell.v !== '' && !isNaN(comisionCell.v)) {
                comisionCell.t = 'n';
                comisionCell.z = '"S/ "#,##0.00';
            }

            // Importe con formato S/
            const importeCell = ws[`O${R + 1}`];
            if (importeCell && !isNaN(importeCell.v)) {
                importeCell.t = 'n';
                importeCell.z = '"S/ "#,##0.00';
            }
        }

        // ============================================================================
        // HOJA 2: Resumen por Médico
        // ============================================================================

        // Agrupar servicios por médico
        const doctorSummaryMap = new Map();

        filteredServices.forEach((service) => {
            const doctorCode = service.doctorCode || 'SIN_CODIGO';
            const doctorName = service.doctor?.name || 'Médico no identificado';

            if (!doctorSummaryMap.has(doctorCode)) {
                doctorSummaryMap.set(doctorCode, {
                    codigo: doctorCode,
                    nombre: doctorName,
                    // Planilla
                    cantidadPlanilla: 0,
                    montoPlanilla: 0,
                    // Retén
                    cantidadReten: 0,
                    montoReten: 0,
                    // Comisión
                    totalComision: 0,
                    // Totales
                    totalAtenciones: 0,
                    totalGenerado: 0
                });
            }

            const summary = doctorSummaryMap.get(doctorCode);
            const isPlanilla = service.serviceType === 'PLANILLA';
            const isReten = service.serviceType === 'RETEN' || service.serviceType === 'RETÉN';

            // Acumular totales
            summary.totalAtenciones++;
            summary.totalGenerado += service.amount;
            summary.totalComision += service.comision || 0;

            if (isPlanilla) {
                summary.cantidadPlanilla++;
                summary.montoPlanilla += service.amount;
            } else if (isReten) {
                summary.cantidadReten++;
                summary.montoReten += service.amount;
            }
        });

        // Convertir Map a array y ordenar por nombre de médico
        const summaryData = Array.from(doctorSummaryMap.values())
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map((summary) => ({
                'Código Médico': summary.codigo === 'SIN_CODIGO' ? '' : `'${summary.codigo}`,
                Médico: summary.nombre,
                'Cant. Planilla': summary.cantidadPlanilla,
                'Monto Planilla': summary.montoPlanilla,
                'Cant. Retén': summary.cantidadReten,
                'Monto Retén': summary.montoReten,
                'Total Comisión': summary.totalComision,
                'Total Atenciones': summary.totalAtenciones,
                'Total Generado': summary.totalGenerado
            }));

        // Crear hoja de resumen
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen por Médico');

        // Aplicar formatos a Hoja 2
        const summaryRange = XLSX.utils.decode_range(wsSummary['!ref']);

        for (let R = summaryRange.s.r + 1; R <= summaryRange.e.r; ++R) {
            // Código Médico como texto (columna A)
            const codigoCell = wsSummary[`A${R + 1}`];
            if (codigoCell && codigoCell.v) {
                codigoCell.t = 's';
                codigoCell.v = String(codigoCell.v).replace(/^'/, '');
            }

            // Cant. Planilla (columna C) - número entero
            const cantPlanillaCell = wsSummary[`C${R + 1}`];
            if (cantPlanillaCell && !isNaN(cantPlanillaCell.v)) {
                cantPlanillaCell.t = 'n';
                cantPlanillaCell.z = '#,##0';
            }

            // Monto Planilla (columna D) - moneda
            const montoPlanillaCell = wsSummary[`D${R + 1}`];
            if (montoPlanillaCell && !isNaN(montoPlanillaCell.v)) {
                montoPlanillaCell.t = 'n';
                montoPlanillaCell.z = '"S/ "#,##0.00';
            }

            // Cant. Retén (columna E) - número entero
            const cantRetenCell = wsSummary[`E${R + 1}`];
            if (cantRetenCell && !isNaN(cantRetenCell.v)) {
                cantRetenCell.t = 'n';
                cantRetenCell.z = '#,##0';
            }

            // Monto Retén (columna F) - moneda
            const montoRetenCell = wsSummary[`F${R + 1}`];
            if (montoRetenCell && !isNaN(montoRetenCell.v)) {
                montoRetenCell.t = 'n';
                montoRetenCell.z = '"S/ "#,##0.00';
            }

            // Total Comisión (columna G) - moneda
            const totalComisionCell = wsSummary[`G${R + 1}`];
            if (totalComisionCell && !isNaN(totalComisionCell.v)) {
                totalComisionCell.t = 'n';
                totalComisionCell.z = '"S/ "#,##0.00';
            }

            // Total Atenciones (columna H) - número entero
            const totalAtencionesCell = wsSummary[`H${R + 1}`];
            if (totalAtencionesCell && !isNaN(totalAtencionesCell.v)) {
                totalAtencionesCell.t = 'n';
                totalAtencionesCell.z = '#,##0';
            }

            // Total Generado (columna I) - moneda
            const totalGeneradoCell = wsSummary[`I${R + 1}`];
            if (totalGeneradoCell && !isNaN(totalGeneradoCell.v)) {
                totalGeneradoCell.t = 'n';
                totalGeneradoCell.z = '"S/ "#,##0.00';
            }
        }

        // Ajustar ancho de columnas en hoja de resumen
        wsSummary['!cols'] = [
            { wch: 15 }, // Código Médico
            { wch: 30 }, // Médico
            { wch: 15 }, // Cant. Planilla
            { wch: 18 }, // Monto Planilla
            { wch: 15 }, // Cant. Retén
            { wch: 18 }, // Monto Retén
            { wch: 18 }, // Total Comisión
            { wch: 18 }, // Total Atenciones
            { wch: 18 } // Total Generado
        ];

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

    /**
     * Guarda los servicios actuales en la base de datos
     * @returns {Promise<Object>} Resultado de la operación
     */
    async function saveToDatabase() {
        if (pendingImportServices.value.length === 0) {
            throw new Error('No hay servicios importados para guardar');
        }

        isLoading.value = true;

        try {
            // Mapear al payload esperado por el backend usando pendingImportServices
            const servicesPayload = pendingImportServices.value.map((s) => ({
                doctor_code: s.doctorCode,
                service_datetime: `${s.date} ${s.time}`, // Formato YYYY-MM-DD HH:MM:SS
                patient_name: s.patientName,
                admission_number: s.rawData?.admision,
                segus_code: s.rawData?.cod_seg || s.rawData?.segus, // Usar cod_seg preferentemente, fallback a segus
                service_name: s.serviceName,
                amount: parseFloat(s.amount),
                insurance_company: s.cia,
                receipt_number: s.rawData?.comprobante,
                attention_type: s.tipoate,
                area: s.rawData?.area,
                service_type: s.serviceType === 'RETÉN' ? 'RETEN' : s.serviceType, // Normalizar para backend
                observation: s.serviceTypeReason,
                commission_amount: parseFloat(s.comision)
            }));

            console.log('Payload saving to DB:', servicesPayload);

            const result = await MedicalFeesService.saveMedicalServices(servicesPayload);

            // Limpiar datos importados y deshabilitar el flag después de guardar exitosamente
            pendingImportServices.value = [];
            isExcelData.value = false;
            console.log('[useMedicalFees] isExcelData set to FALSE (Saved to DB)');

            return result;
        } catch (err) {
            error.value = `Error al guardar en BD: ${err.message}`;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function loadMedicalServices(startDate, endDate, filters = {}) {
        isLoading.value = true;
        isExcelData.value = false;
        console.log('[useMedicalFees] isExcelData set to FALSE (Loading from DB)');
        try {
            const response = await MedicalFeesService.getMedicalServices(startDate, endDate, filters);

            console.log('loadMedicalServices response:', response);

            if (Array.isArray(response)) {
                console.log('Data found in response (Array), mapping...');
                // Mapear respuesta de BD a estructura de UI existente
                services.value = response.map((apiService) => {
                    let date = '',
                        time = '';
                    if (apiService.service_datetime) {
                        // Manejar formato "YYYY-MM-DD HH:MM:SS" o ISO "YYYY-MM-DDTHH:MM:SS.000Z"
                        const parts = apiService.service_datetime.replace('T', ' ').replace('Z', '').split(' ');
                        date = parts[0];
                        time = parts[1] ? parts[1].split('.')[0] : ''; // Quitar milisegundos si existen
                    }

                    let doctor = apiService.doctor;
                    // Enriquecer con datos del store local para tener commission_percentage actualizado
                    if (doctor && doctor.code) {
                        const localDoctor = doctorMap.value.get(doctor.code);
                        if (localDoctor) {
                            doctor = { ...doctor, ...localDoctor };
                        }
                    }

                    return {
                        id: apiService.id,
                        doctorCode: apiService.doctor_code,
                        date: date,
                        time: time,
                        serviceName: apiService.service_name,
                        amount: parseFloat(apiService.amount),
                        patientName: apiService.patient_name,
                        doctor: doctor,
                        cia: apiService.insurance_company,
                        tipoate: apiService.attention_type,
                        serviceType: apiService.service_type,
                        serviceTypeReason: apiService.observation,
                        comision: parseFloat(apiService.commission_amount || 0),
                        status: apiService.status || 'pendiente', // Estado del servicio
                        generalTariff: apiService.general_tariff
                            ? {
                                  name: apiService.general_tariff.name,
                                  code: apiService.segus_code
                              }
                            : null,

                        // Estructura Legacy para compatibilidad con filtros y computed existentes
                        rawData: {
                            admision: apiService.admission_number,
                            segus: apiService.segus_code,
                            comprobante: apiService.receipt_number,
                            area: apiService.area,
                            cod_seg: apiService.insurance_code || apiService.segus_code
                        }
                    };
                });

                // Filtrar por estado si se especificó en los filtros (el backend no aplica este filtro)
                if (filters.status) {
                    services.value = services.value.filter((s) => s.status === filters.status);
                    console.log(`Filtered by status '${filters.status}': ${services.value.length} services`);
                }

                console.log('Mapped services:', services.value.length, services.value[0]);
            } else {
                console.warn('No data found or structure mismatch:', response);
            }
        } catch (err) {
            console.error(err);
            error.value = 'Error al cargar servicios de base de datos';
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Actualiza un servicio médico individual
     * @param {number} serviceId - ID del servicio
     * @param {string} field - Campo a actualizar
     * @param {any} newValue - Nuevo valor
     */
    async function updateService(serviceId, field, newValue) {
        try {
            const service = services.value.find((s) => s.id === serviceId);
            if (!service) {
                throw new Error('Servicio no encontrado');
            }

            // Preparar payload base
            const payload = {};

            // Si se modifica el tipo o el monto, recalcular comisión
            if (field === 'serviceType' || field === 'amount') {
                const type = field === 'serviceType' ? newValue : service.serviceType;
                const amount = field === 'amount' ? newValue : service.amount;

                // Recalcular comisión usando la misma lógica que en importFromExcel
                const newCommission = calculateCommissionRule({
                    type: type,
                    amount: amount,
                    cia: service.cia,
                    doctorCode: service.doctorCode,
                    segusCode: service.rawData?.segus,
                    doctor: service.doctor,
                    admision: service.rawData?.admision
                });

                payload.service_type = type === 'RETÉN' ? 'RETEN' : type;
                payload.amount = amount;
                payload.commission_amount = newCommission;

                // Actualizar en el estado local
                service.serviceType = type;
                service.amount = amount;
                service.comision = newCommission;
            } else if (field === 'comision') {
                // Actualización manual de comisión
                payload.commission_amount = newValue;
                service.comision = newValue;
            } else if (field === 'status') {
                // Actualización de estado
                payload.status = newValue;
                service.status = newValue;
            } else {
                // Otros campos
                payload[field] = newValue;
                service[field] = newValue;
            }

            // Llamar al backend
            await MedicalFeesService.updateMedicalService(serviceId, payload);
        } catch (err) {
            console.error('Error updating service:', err);
            throw err;
        }
    }

    /**
     * Aprobación masiva de servicios médicos
     * @param {Array} ids - Array de IDs de servicios
     * @param {string} status - Nuevo estado
     * @param {string} observation - Observación opcional
     * @returns {Promise<Object>} Resultado de la aprobación masiva
     */
    async function bulkApproveServices(ids, status, observation = null) {
        try {
            const result = await MedicalFeesService.bulkApprove(ids, status, observation);
            return result;
        } catch (err) {
            console.error('Error bulk approving services:', err);
            throw err;
        }
    }

    /**
     * Recalcular comisiones para servicios de un médico específico
     * Calcula comisiones en el frontend y las actualiza masivamente en el backend
     * @param {number} doctorId - ID del médico
     * @returns {Promise<Object>} Resultados del recálculo
     */
    async function recalculateCommissionsForDoctor(doctorId) {
        isLoading.value = true;
        error.value = null;

        try {
            // 1. Filtrar servicios del médico que NO estén aprobados/rechazados
            const servicesToRecalculate = services.value.filter((service) => service.doctor?.id === doctorId && service.status !== 'aprobado' && service.status !== 'rechazado');

            if (servicesToRecalculate.length === 0) {
                throw new Error('No hay servicios para recalcular');
            }

            console.log(`[useMedicalFees] Recalculando ${servicesToRecalculate.length} servicios para médico ID ${doctorId}`);

            // 2. Calcular comisiones en el FRONTEND (lógica existente)
            const updates = servicesToRecalculate.map((service) => {
                const newCommission = calculateCommissionRule({
                    type: service.serviceType,
                    amount: service.amount,
                    cia: service.cia,
                    doctorCode: service.doctorCode,
                    segusCode: service.rawData?.cod_seg || service.rawData?.segus,
                    doctor: service.doctor,
                    admision: service.rawData?.admision
                });

                return {
                    id: service.id,
                    commission_amount: newCommission
                };
            });

            console.log(`[useMedicalFees] Enviando ${updates.length} actualizaciones al backend...`);

            // 3. Enviar TODAS las actualizaciones en una sola llamada al backend
            const result = await MedicalFeesService.bulkUpdateCommissions(updates);

            console.log('[useMedicalFees] Resultado del backend:', result);

            // 4. Actualizar servicios localmente con las nuevas comisiones
            updates.forEach((update) => {
                const service = services.value.find((s) => s.id === update.id);
                if (service) {
                    service.comision = update.commission_amount;
                }
            });

            // 5. Contar servicios omitidos (aprobados/rechazados)
            const skipped = services.value.filter((s) => s.doctor?.id === doctorId && (s.status === 'aprobado' || s.status === 'rechazado')).length;

            return {
                total: servicesToRecalculate.length,
                updated: result.updated,
                skipped: skipped + result.skipped,
                errors: result.errors || []
            };
        } catch (err) {
            error.value = err.message || 'Error al recalcular comisiones';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Elimina todos los servicios de un médico del período actual (solo local)
     * @param {string} doctorCode - Código del médico
     * @returns {number} Cantidad de servicios eliminados
     */
    function deleteDoctorServices(doctorCode) {
        const initialCount = services.value.length;
        services.value = services.value.filter((service) => service.doctorCode !== doctorCode);
        const deletedCount = initialCount - services.value.length;

        console.log(`[useMedicalFees] Deleted ${deletedCount} services for doctor ${doctorCode}`);
        return deletedCount;
    }

    return {
        // State
        doctors,
        schedules,
        services,
        pendingImportServices,
        isLoading,
        error,
        isExcelData,

        // Computed
        servicesByDoctor,
        servicesByType,
        totals,

        // Methods
        loadDoctorsAndSchedules,
        loadMedicalServices,
        importFromExcel,
        exportToExcel,
        clearAllData,
        saveToDatabase,
        updateService,
        bulkApproveServices,
        recalculateCommissionsForDoctor,
        deleteDoctorServices
    };
}
