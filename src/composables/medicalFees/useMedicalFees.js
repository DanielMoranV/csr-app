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
    const isExcelData = ref(false);

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
     * Calcula la comisión de un servicio según reglas de negocio
     * @param {Object} params - Parámetros para el cálculo
     * @returns {number} Monto de comisión calculado
     */
    function calculateCommissionRule({ type, amount, cia, doctorCode, segusCode, doctor }) {
        let comision = 0;
        const importe = parseFloat(amount) || 0;
        const isPlanilla = type === 'PLANILLA';
        const isReten = type === 'RETEN' || type === 'RETÉN';
        const company = cia?.toString().trim().toUpperCase() || '';
        
        // Códigos de consulta que NO tienen comisión en PLANILLA
        const consultationCodes = ['00.19.25', '00.19.27'];
        const isConsultationCode = segusCode?.startsWith('50.0') || consultationCodes.includes(segusCode);

        // Regla 1: Validar con tarifarios médicos si es PLANILLA
        if (isPlanilla && !isConsultationCode) {
            // Buscar tarifario del médico que coincida con el código del servicio
            const tariff = doctorTariffsStore.allTariffs.find(t => 
                t.tariff_code === segusCode && t.doctor_code === doctorCode
            );
            
            // Determinar si se aplica comisión según la compañía
            let shouldApplyCommission = false;
            
            if (company === 'PARTICULAR') {
                // Para PARTICULAR: validar clinic_commission > 0 Y doctor_commission = 0/null
                shouldApplyCommission = tariff && 
                    parseFloat(tariff.clinic_commission) > 0 && 
                    (tariff.doctor_commission === null || parseFloat(tariff.doctor_commission) === 0);
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
        // Regla 2: 92.5% fijo si es RETÉN Y cia != PARTICULAR
        else if (isReten && company !== 'PARTICULAR') {
            comision = parseFloat((importe * 0.925).toFixed(2));
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

            // 7. Clasificar servicios en PLANILLA o RETÉN y Calcular Comisiones
            const classifiedServices = enrichedServices.map(service => {
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

                const classification = ServiceClassifier.classifyService(
                    service,
                    service.schedules
                );
                
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
                    doctor: service.doctor
                });

                // Ajustar el detalle según si tiene comisión o no
                let detalle = classification.reason || '';
                const segusIndicatesReten = service.rawData?.segus?.toUpperCase().includes('RETEN');
                const hasCommission = comision > 0;
                
                if (isReten && !hasCommission && !segusIndicatesReten && !detalle.includes('⚠️ Revisar atención, codigo NO RETEN')) {
                    detalle += ' ⚠️ Revisar atención, codigo NO RETEN';
                } else if (isReten && hasCommission && detalle.includes('⚠️ Revisar atención, codigo NO RETEN')) {
                    detalle = detalle.replace(' ⚠️ Revisar atención, codigo NO RETEN', '');
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

            services.value = classifiedServices;
            isExcelData.value = true;
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
                'Monto': service.amount,
                'Tipo': service.serviceType || '',
                'Detalle': service.serviceTypeReason,
                'Comisión': service.comision,
                'CIA': service.cia,
                'Comprobante': service.rawData?.comprobante || '',
                'Cod_Seg': service.rawData?.cod_seg || '',
                'Importe': service.amount,
                'Tipoate': service.tipoate,
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

    /**
     * Guarda los servicios actuales en la base de datos
     * @returns {Promise<Object>} Resultado de la operación
     */
    async function saveToDatabase() {
        if (services.value.length === 0) {
            throw new Error('No hay servicios para guardar');
        }

        isLoading.value = true;
        
        try {
            // Mapear al payload esperado por el backend
            const servicesPayload = services.value.map(s => ({
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
        try {
            const response = await MedicalFeesService.getMedicalServices(startDate, endDate, filters);
            
            console.log('loadMedicalServices response:', response);

            if (Array.isArray(response)) {
                console.log('Data found in response (Array), mapping...');
                // Mapear respuesta de BD a estructura de UI existente
                services.value = response.map(apiService => {
                    let date = '', time = '';
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

    return {
        // State
        doctors,
        schedules,
        services,
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
        saveToDatabase
    };
}
