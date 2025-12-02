import ExcelParserService from '@/services/medicalFees/ExcelParserService';
import MedicalFeesService from '@/services/medicalFees/MedicalFeesService';
import ServiceClassifier from '@/services/medicalFees/ServiceClassifier';
import { computed, ref } from 'vue';

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
     * Exporta servicios a Excel
     * @param {Object} filters - Filtros { doctorCode, serviceType }
     */
    async function exportToExcel(filters = {}) {
        const XLSX = await import('xlsx');

        // Filtrar servicios
        let filteredServices = services.value;

        if (filters.doctorCode) {
            filteredServices = filteredServices.filter(s =>
                s.doctor?.code === filters.doctorCode
            );
        }

        if (filters.serviceType) {
            filteredServices = filteredServices.filter(s =>
                s.serviceType === filters.serviceType
            );
        }

        // Preparar datos para Excel - Incluir TODOS los campos del Excel original
        const excelData = filteredServices.map(service => ({
            // Campos procesados
            'Admisión': service.rawData?.admision || '',
            'Código Médico': service.doctorCode || '',
            'Médico': service.doctor?.name || 'No encontrado',
            'Fecha': service.date || '',
            'Hora': service.time || '',
            'Servicio': service.serviceName || '',
            'Paciente': service.patientName || '',
            'Segus': service.rawData?.segus || '',
            'Monto': service.amount || 0,
            'Tipo': service.serviceType || '',
            'Detalle': service.serviceTypeReason || '',
            
            // Todos los campos adicionales del Excel original (rawData)
            'CIA': service.rawData?.cia || '',
            'Comprobante': service.rawData?.comprobante || '',
            'Cod_Seg': service.rawData?.cod_seg || '',
            'Descripcion': service.rawData?.descripcion || '',
            'Cod_Seri': service.rawData?.cod_seri || '',
            'Importe': service.rawData?.importe || 0,
            'Num_Aten': service.rawData?.num_aten || '',
            'Num_His': service.rawData?.num_his || '',
            'Tipo_Doc': service.rawData?.tipo_doc || '',
            'Num_Doc': service.rawData?.num_doc || '',
            'Edad': service.rawData?.edad || '',
            'Sexo': service.rawData?.sexo || '',
            'Procedencia': service.rawData?.procedencia || '',
            'Medico': service.rawData?.medico || '',
            'Especialidad_Excel': service.rawData?.especialidad || '',
            'Consultorio': service.rawData?.consultorio || '',
            'Turno': service.rawData?.turno || '',
            'Usuario': service.rawData?.usuario || '',
            'Fecha_Reg': service.rawData?.fecha_reg || '',
            'Hora_Reg': service.rawData?.hora_reg || ''
        }));

        // Crear workbook
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Servicios');

        // Descargar
        const fileName = `honorarios_${filters.doctorCode || 'todos'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
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
