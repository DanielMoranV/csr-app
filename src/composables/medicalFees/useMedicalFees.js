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
    const services = ref([]);
    const isLoading = ref(false);
    const error = ref(null);

    // Maps para búsqueda rápida
    const doctorMap = computed(() => {
        const map = new Map();
        doctors.value.forEach(doctor => {
            if (doctor.code) {
                map.set(doctor.code, doctor);
            }
        });
        return map;
    });

    const scheduleMap = computed(() => {
        const map = new Map();
        schedules.value.forEach(schedule => {
            const key = `${schedule.doctor?.code}_${schedule.date}`;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(schedule);
        });
        return map;
    });

    /**
     * Carga médicos, horarios y tarifarios desde el backend
     * @param {string} startDate - Fecha inicio YYYY-MM-DD
     * @param {string} endDate - Fecha fin YYYY-MM-DD
     */
    async function loadDoctorsAndSchedules(startDate, endDate) {
        isLoading.value = true;
        error.value = null;

        try {
            const [doctorsData, schedulesData] = await Promise.all([
                MedicalFeesService.getDoctors(),
                MedicalFeesService.getDoctorSchedules(startDate, endDate),
                doctorTariffsStore.fetchTariffs()
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

            // 3. Filtrar registros inválidos
            const validData = rawData.filter(row => !ExcelParserService.shouldExcludeRecord(row));
            
            const excludedCount = rawData.length - validData.length;
            if (excludedCount > 0) {
                console.log(`[useMedicalFees] ${excludedCount} registros excluidos`);
            }

            // 4. Filtrar por código médico >= 5000
            const filteredByDoctorCode = validData.filter(row => {
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
            const parsedServices = filteredByDoctorCode.map(row =>
                ExcelParserService.mapToServiceModel(row)
            );

            // 6. Enriquecer con datos de médico y horario
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

            // 7. Clasificar servicios en PLANILLA o RETÉN
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
     * Limpia todos los servicios
     */
    function clearAllData() {
        services.value = [];
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
     * Exporta servicios filtrados a Excel
     * @param {Array} filteredServices - Servicios a exportar
     * @param {string} filename - Nombre del archivo
     */
    function exportToExcel(filteredServices, filename = 'honorarios_medicos.xlsx') {
        if (!filteredServices || filteredServices.length === 0) {
            throw new Error('No hay servicios para exportar');
        }

        // Preparar datos para Excel
        const excelData = filteredServices.map(service => {
            const codSeg = service.rawData?.cod_seg?.toString().trim() || '';
            const importe = parseFloat(service.rawData?.importe) || 0;
            const isPlanilla = service.serviceType === 'PLANILLA';
            const isReten = service.serviceType === 'RETÉN';
            const cia = service.rawData?.cia?.toString().trim().toUpperCase() || '';
            const doctorCode = service.doctorCode;
            
            let comision = '';
            
            // Códigos de consulta que NO tienen comisión en PLANILLA
            const consultationCodes = ['00.19.25', '00.19.27'];
            const isConsultationCode = codSeg.startsWith('50.0') || consultationCodes.includes(codSeg);
            
            // Regla 1: Validar con tarifarios médicos si es PLANILLA
            // EXCLUYE códigos de consulta (50.0*, 00.19.25, 00.19.27)
            if (isPlanilla && !isConsultationCode) {
                // Debug: Log búsqueda de tarifario
                console.log('[Regla 1] Buscando tarifario para:', {
                    codSeg,
                    doctorCode,
                    serviceName: service.serviceName,
                    totalTariffs: doctorTariffsStore.allTariffs.length
                });
                
                // Buscar tarifario del médico que coincida con el código del servicio
                const tariff = doctorTariffsStore.allTariffs.find(t => 
                    t.tariff_code === codSeg && t.doctor_code === doctorCode
                );
                
                if (tariff) {
                    console.log('[Regla 1] Tarifario encontrado:', {
                        tariff_code: tariff.tariff_code,
                        doctor_code: tariff.doctor_code,
                        clinic_commission: tariff.clinic_commission,
                        doctor_commission: tariff.doctor_commission
                    });
                } else {
                    console.log('[Regla 1] NO se encontró tarifario para:', { codSeg, doctorCode });
                }
                
                // Verificar condiciones: clinic_commission > 0 Y doctor_commission = 0 o null
                if (tariff && 
                    parseFloat(tariff.clinic_commission) > 0 && 
                    (tariff.doctor_commission === null || parseFloat(tariff.doctor_commission) === 0)) {
                    // Aplicar comisión personalizada del médico
                    const commissionPercentage = service.doctor?.commission_percentage || 50.0;
                    const percentage = commissionPercentage / 100;
                    comision = parseFloat((importe * percentage).toFixed(2));
                    
                    console.log('[Regla 1] ✅ Comisión calculada:', {
                        commissionPercentage,
                        importe,
                        comision
                    });
                } else if (tariff) {
                    console.log('[Regla 1] ❌ Tarifario NO cumple condiciones:', {
                        clinic_commission: tariff.clinic_commission,
                        clinic_commission_parsed: parseFloat(tariff.clinic_commission),
                        clinic_commission_gt_0: parseFloat(tariff.clinic_commission) > 0,
                        doctor_commission: tariff.doctor_commission,
                        doctor_commission_parsed: parseFloat(tariff.doctor_commission),
                        doctor_commission_eq_0: parseFloat(tariff.doctor_commission) === 0
                    });
                }
            } else if (isPlanilla && isConsultationCode) {
                console.log('[Regla 1] ⚠️ Código de consulta excluido:', { codSeg });
            }
            // Regla 2: 92.5% fijo si es RETÉN Y cia != PARTICULAR
            else if (isReten && cia !== 'PARTICULAR') {
                comision = parseFloat((importe * 0.925).toFixed(2));
            }
            
            // Ajustar el detalle según si tiene comisión o no
            let detalle = service.serviceTypeReason || '';
            const segusIndicatesReten = service.rawData?.segus?.toUpperCase().includes('RETEN');
            const hasCommission = comision !== '' && comision > 0;
            
            if (isReten && !hasCommission && !segusIndicatesReten && !detalle.includes('⚠️ Revisar atención, codigo NO RETEN')) {
                detalle += ' ⚠️ Revisar atención, codigo NO RETEN';
            } else if (isReten && hasCommission && detalle.includes('⚠️ Revisar atención, codigo NO RETEN')) {
                detalle = detalle.replace(' ⚠️ Revisar atención, codigo NO RETEN', '');
            }
            
            // Convertir fecha a formato DD/MM/YYYY
            let excelDate = '';
            if (service.date) {
                const [year, month, day] = service.date.split('-');
                excelDate = `${day}/${month}/${year}`;
            }
            
            return {
                'Admisión': service.rawData?.admision || '',
                'Código Médico': service.doctorCode ? `'${service.doctorCode}` : '',
                'Fecha': excelDate,
                'Hora': service.time || '',
                'Servicio': service.serviceName || '',
                'Paciente': service.patientName || '',
                'Segus': service.rawData?.segus || '',
                'Monto': importe,
                'Tipo': service.serviceType || '',
                'Detalle': detalle,
                'Comisión': comision,
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

        // Aplicar formatos
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
        exportToExcel,
        clearAllData
    };
}
