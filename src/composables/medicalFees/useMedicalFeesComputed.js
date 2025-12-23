/**
 * Composable para propiedades computadas de Honorarios Médicos
 */

import { computed } from 'vue';

export function useMedicalFeesComputed(medicalFeesState, filtersState, specialties) {
    /**
     * Verifica si se puede importar (todos los datos necesarios están cargados)
     */
    const canImport = computed(() => {
        return !medicalFeesState.isLoading.value && medicalFeesState.doctors.value.length > 0;
    });

    /**
     * Opciones de especialidades para el dropdown
     */
    const specialtyOptions = computed(() => {
        return [{ label: 'Todas las especialidades', value: null }, ...specialties.value.map((s) => ({ label: s.name, value: s.id }))];
    });

    /**
     * Opciones de médicos filtradas por especialidad seleccionada
     */
    const doctorOptions = computed(() => {
        let filteredDoctors = medicalFeesState.doctors.value;

        // Filtrar médicos por especialidad seleccionada
        if (filtersState.selectedSpecialty.value) {
            filteredDoctors = medicalFeesState.doctors.value.filter((doctor) => {
                if (!doctor.specialties || !Array.isArray(doctor.specialties)) {
                    return false;
                }
                return doctor.specialties.some((specialty) => specialty.id === filtersState.selectedSpecialty.value);
            });
        }

        return [{ label: 'Todos los médicos', value: null }, ...filteredDoctors.map((d) => ({ label: d.name, value: d.code }))];
    });

    /**
     * Servicios filtrados según los filtros activos
     */
    const filteredServices = computed(() => {
        let filtered = medicalFeesState.services.value;

        // Filtrar por especialidad (indirectamente a través de los médicos)
        if (filtersState.selectedSpecialty.value) {
            const doctorCodesInSpecialty = medicalFeesState.doctors.value
                .filter((doctor) => {
                    if (!doctor.specialties || !Array.isArray(doctor.specialties)) {
                        return false;
                    }
                    return doctor.specialties.some((specialty) => specialty.id === filtersState.selectedSpecialty.value);
                })
                .map((doctor) => doctor.code);

            filtered = filtered.filter((s) => doctorCodesInSpecialty.includes(s.doctorCode));
        }

        // Filtrar por médico
        if (filtersState.selectedDoctor.value) {
            filtered = filtered.filter((s) => s.doctor?.code === filtersState.selectedDoctor.value);
        }

        // Filtrar por tipo
        if (filtersState.selectedType.value) {
            filtered = filtered.filter((s) => s.serviceType === filtersState.selectedType.value);
        }

        return filtered;
    });

    /**
     * Totales calculados basándose en servicios filtrados
     */
    const filteredTotals = computed(() => {
        const planillaServices = filteredServices.value.filter((s) => s.serviceType === 'PLANILLA');
        const retenServices = filteredServices.value.filter((s) => s.serviceType === 'RETEN' || s.serviceType === 'RETÉN');

        // Obtener médicos únicos de los servicios filtrados
        const uniqueDoctors = new Set(filteredServices.value.filter((s) => s.doctor).map((s) => s.doctor.code));

        return {
            totalGenerated: filteredServices.value.reduce((sum, s) => sum + s.amount, 0),
            totalPlanilla: planillaServices.reduce((sum, s) => sum + s.amount, 0),
            totalReten: retenServices.reduce((sum, s) => sum + s.amount, 0),
            serviceCount: filteredServices.value.length,
            planillaCount: planillaServices.length,
            retenCount: retenServices.length,
            doctorCount: uniqueDoctors.size
        };
    });

    /**
     * Resumen por médico basado en servicios filtrados
     */
    const doctorSummary = computed(() => {
        const summaryMap = new Map();

        filteredServices.value.forEach((service) => {
            const doctorCode = service.doctorCode || 'SIN_CODIGO';
            const doctorName = service.doctor?.name || 'Médico no identificado';

            if (!summaryMap.has(doctorCode)) {
                summaryMap.set(doctorCode, {
                    codigo: doctorCode,
                    nombre: doctorName,
                    cantidadPlanilla: 0,
                    montoPlanilla: 0,
                    cantidadReten: 0,
                    montoReten: 0,
                    totalComision: 0,
                    totalAtenciones: 0,
                    totalGenerado: 0
                });
            }

            const summary = summaryMap.get(doctorCode);
            const isPlanilla = service.serviceType === 'PLANILLA';
            const isReten = service.serviceType === 'RETEN' || service.serviceType === 'RETÉN';

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

        return Array.from(summaryMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    });

    /**
     * Objeto del médico seleccionado
     */
    const selectedDoctorObject = computed(() => {
        if (!filtersState.selectedDoctor.value) return null;
        return medicalFeesState.doctors.value.find((d) => d.code === filtersState.selectedDoctor.value || d.id === filtersState.selectedDoctor.value);
    });

    /**
     * Nombre del médico seleccionado para mostrar en dialogs
     */
    const selectedDoctorName = computed(() => {
        if (!filtersState.selectedDoctor.value) return 'Todos los médicos';
        const option = doctorOptions.value.find((d) => d.value === filtersState.selectedDoctor.value);
        return option?.label || 'Todos los médicos';
    });

    /**
     * Cantidad de servicios recalculables para el médico seleccionado
     */
    const recalculableServicesCount = computed(() => {
        if (!selectedDoctorObject.value) return 0;
        return medicalFeesState.services.value.filter((s) => s.doctor?.id === selectedDoctorObject.value.id && s.status !== 'aprobado' && s.status !== 'rechazado').length;
    });

    /**
     * Verifica si se puede recalcular comisiones
     */
    const canRecalculate = computed(() => {
        return selectedDoctorObject.value && recalculableServicesCount.value > 0;
    });

    return {
        canImport,
        specialtyOptions,
        doctorOptions,
        filteredServices,
        filteredTotals,
        doctorSummary,
        selectedDoctorObject,
        selectedDoctorName,
        recalculableServicesCount,
        canRecalculate
    };
}
