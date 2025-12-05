/**
 * Servicio para clasificar servicios médicos en PLANILLA o RETÉN
 * Responsabilidad: Lógica de clasificación basada en horarios
 */
class ServiceClassifier {
    /**
     * Clasifica un servicio como PLANILLA o RETÉN
     * @param {Object} service - Servicio con date y time
     * @param {Array} schedules - Horarios del médico ese día
     * @returns {Object} { type: 'PLANILLA'|'RETÉN', schedule, reason }
     */
    classifyService(service, schedules) {
        // Si no hay horarios registrados → RETÉN
        if (!schedules || schedules.length === 0) {
            return {
                type: 'RETÉN',
                schedule: null,
                reason: 'Sin horario registrado'
            };
        }

        const serviceTime = service.time;
        if (!serviceTime) {
            return {
                type: 'RETÉN',
                schedule: null,
                reason: 'Hora de atención no especificada'
            };
        }

        // Verificar si el segus indica RETÉN
        const segusIndicatesReten = service.rawData?.segus?.toUpperCase().includes('RETEN');

        // Buscar horario que contenga la hora de atención
        for (const schedule of schedules) {
            if (this.isTimeInRange(serviceTime, schedule.start_time, schedule.end_time)) {
                // Verificar si es horario de planilla
                if (schedule.is_payment_payroll) {
                    const startTime = this.formatTimeWithoutSeconds(schedule.start_time);
                    const endTime = this.formatTimeWithoutSeconds(schedule.end_time);
                    const baseReason = `Turno ${schedule.medical_shift?.code || 'N/A'} (${startTime}-${endTime})`;
                    
                    // VALIDACIÓN ESPECIAL: Si segus dice RETÉN pero el horario es PLANILLA
                    if (segusIndicatesReten) {
                        return {
                            type: 'PLANILLA',
                            schedule,
                            reason: `${baseReason} ⚠️ OBSERVACIÓN: Código SEGUS indica RETÉN pero se realizó en horario PLANILLA (posible error de asignación)`
                        };
                    }
                    
                    return {
                        type: 'PLANILLA',
                        schedule,
                        reason: baseReason
                    };
                } else {
                    const baseReason = `Turno ${schedule.medical_shift?.code || 'N/A'} - No planilla`;
                    
                    // VALIDACIÓN: Si es RETÉN pero segus NO indica RETÉN
                    if (!segusIndicatesReten) {
                        return {
                            type: 'RETÉN',
                            schedule,
                            reason: `${baseReason} ⚠️ Revisar atención, codigo NO RETEN`
                        };
                    }
                    
                    return {
                        type: 'RETÉN',
                        schedule,
                        reason: baseReason
                    };
                }
            }
        }

        // No coincide con ningún horario → RETÉN
        // Mensaje resumido: solo mostrar la hora del servicio
        let reason = `Fuera de horario (${serviceTime})`;
        
        // VALIDACIÓN: Si es RETÉN pero segus NO indica RETÉN
        if (!segusIndicatesReten) {
            reason += ' ⚠️ Revisar atención, codigo NO RETEN';
        }
        
        return {
            type: 'RETÉN',
            schedule: null,
            reason: reason
        };
    }

    /**
     * Verifica si una hora está dentro de un rango
     * @param {string} time - Hora a verificar (HH:MM:SS)
     * @param {string} startTime - Hora inicio (HH:MM:SS)
     * @param {string} endTime - Hora fin (HH:MM:SS)
     * @returns {boolean}
     */
    isTimeInRange(time, startTime, endTime) {
        const timeMinutes = this.timeToMinutes(time);
        const startMinutes = this.timeToMinutes(startTime);
        let endMinutes = this.timeToMinutes(endTime);

        // Manejar turnos que cruzan medianoche (ej: 20:00 - 08:00)
        if (endMinutes < startMinutes) {
            // Si la hora es después de medianoche
            if (timeMinutes < startMinutes) {
                return timeMinutes <= endMinutes;
            }
            // Si la hora es antes de medianoche
            return timeMinutes >= startMinutes;
        }

        // Rango normal
        return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    }

    /**
     * Convierte hora a minutos desde medianoche
     * @param {string} time - Hora en formato HH:MM:SS
     * @returns {number} Minutos desde medianoche
     */
    timeToMinutes(time) {
        if (!time) return 0;
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Formatea hora sin segundos (HH:MM)
     * @param {string} time - Hora en formato HH:MM:SS
     * @returns {string} Hora en formato HH:MM
     */
    formatTimeWithoutSeconds(time) {
        if (!time) return '';
        const parts = time.split(':');
        return `${parts[0]}:${parts[1]}`;
    }

    /**
     * Agrupa servicios por tipo (PLANILLA/RETÉN)
     * @param {Array} services - Servicios clasificados
     * @returns {Object} { planilla: [], reten: [] }
     */
    groupByType(services) {
        return {
            planilla: services.filter(s => s.serviceType === 'PLANILLA'),
            reten: services.filter(s => s.serviceType === 'RETÉN')
        };
    }
}

export default new ServiceClassifier();
