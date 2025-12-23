/**
 * Composable para acciones y handlers de eventos de Honorarios Médicos
 */

import MedicalFeesService from '@/services/medicalFees/MedicalFeesService';
import { VALID_STATUSES } from '@/utils/medicalFees/constants';
import { formatExportFilename } from '@/utils/medicalFees/formatters';
import { useToast } from 'primevue/usetoast';

export function useMedicalFeesActions(medicalFeesState, filtersState, computedState) {
    const toast = useToast();

    /**
     * Inicializa el módulo cargando datos del mes seleccionado
     */
    async function initialize() {
        await loadDataForMonth();
    }

    /**
     * Carga datos del servidor para el rango de fechas actual
     */
    async function loadServerData() {
        const start = filtersState.selectedMonth.value.toISOString().split('T')[0];
        const endDate = new Date(filtersState.selectedMonth.value.getFullYear(), filtersState.selectedMonth.value.getMonth() + 1, 0);
        const end = endDate.toISOString().split('T')[0];

        // Preparar filtros
        const filters = {};
        if (filtersState.selectedSpecialty.value) {
            filters.medical_specialty_id = filtersState.selectedSpecialty.value;
        }

        // Buscar ID del médico seleccionado
        if (filtersState.selectedDoctor.value) {
            const doctorObj = medicalFeesState.doctors.value.find((d) => d.code === filtersState.selectedDoctor.value);
            if (doctorObj) {
                filters.doctor_id = doctorObj.id;
            }
        }

        await medicalFeesState.loadMedicalServices(start, end, filters);
    }

    /**
     * Carga datos para el mes seleccionado
     */
    async function loadDataForMonth() {
        const start = filtersState.selectedMonth.value.toISOString().split('T')[0];
        const endDate = new Date(filtersState.selectedMonth.value.getFullYear(), filtersState.selectedMonth.value.getMonth() + 1, 0);
        const end = endDate.toISOString().split('T')[0];

        try {
            // Cargar dependencias (médicos, horarios)
            await medicalFeesState.loadDoctorsAndSchedules(start, end);

            // Preparar filtros iniciales
            const filters = {};
            if (filtersState.selectedSpecialty.value) {
                filters.medical_specialty_id = filtersState.selectedSpecialty.value;
            }
            if (filtersState.selectedDoctor.value) {
                const doctorObj = medicalFeesState.doctors.value.find((d) => d.code === filtersState.selectedDoctor.value);
                if (doctorObj) {
                    filters.doctor_id = doctorObj.id;
                }
            }

            // Cargar servicios de la BD con filtros
            await medicalFeesState.loadMedicalServices(start, end, filters);

            toast.add({
                severity: 'success',
                summary: 'Datos cargados',
                detail: `${medicalFeesState.doctors.value.length} médicos y ${medicalFeesState.services.value.length} servicios cargados`,
                life: 3000
            });
        } catch (err) {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron cargar los datos del mes',
                life: 3000
            });
        }
    }

    /**
     * Maneja la búsqueda en el servidor
     */
    async function handleSearch() {
        try {
            await loadServerData();
            toast.add({
                severity: 'success',
                summary: 'Búsqueda completada',
                detail: `${medicalFeesState.services.value.length} servicios encontrados`,
                life: 3000
            });
        } catch (err) {
            console.error('handleSearch Error:', err);
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Falló la búsqueda en servidor: ' + (err.message || 'Error desconocido'),
                life: 3000
            });
        }
    }

    /**
     * Maneja el cambio de mes
     */
    async function onMonthChange() {
        await loadDataForMonth();
    }

    /**
     * Maneja la selección de archivo para importación
     */
    async function onFileSelect(event) {
        const file = event.files[0];
        if (!file) return;

        try {
            await medicalFeesState.importFromExcel(file);
            toast.add({
                severity: 'success',
                summary: 'Excel importado',
                detail: `${medicalFeesState.services.value.length} servicios procesados`,
                life: 3000
            });
        } catch (err) {
            toast.add({
                severity: 'error',
                summary: 'Error al importar',
                detail: medicalFeesState.error.value,
                life: 5000
            });
        }
    }

    /**
     * Maneja la exportación a Excel
     */
    function handleExport() {
        const filename = formatExportFilename('honorarios_medicos');
        medicalFeesState.exportToExcel(computedState.filteredServices.value, filename);
        toast.add({
            severity: 'success',
            summary: 'Exportado',
            detail: 'Archivo descargado exitosamente',
            life: 3000
        });
    }

    /**
     * Maneja la carga de archivo desde input file
     */
    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // 1. Importar y procesar Excel
            await medicalFeesState.importFromExcel(file);

            const importedCount = medicalFeesState.pendingImportServices.value.length;

            // 2. Guardar automáticamente en BD
            toast.add({
                severity: 'info',
                summary: 'Procesando',
                detail: `${importedCount} servicios procesados. Guardando en base de datos...`,
                life: 3000
            });

            const result = await medicalFeesState.saveToDatabase();

            if (result.success) {
                toast.add({
                    severity: 'success',
                    summary: 'Importación Exitosa',
                    detail: `${result.data?.imported_count || importedCount} servicios guardados en BD`,
                    life: 4000
                });

                // 3. Recargar datos del mes
                await onMonthChange();
            }

            // Limpiar el input
            event.target.value = '';
        } catch (err) {
            toast.add({
                severity: 'error',
                summary: 'Error al importar',
                detail: err.message || 'Error desconocido',
                life: 5000
            });
            event.target.value = '';
        }
    }

    /**
     * Maneja el guardado manual en base de datos
     */
    async function handleSaveToDatabase() {
        try {
            const result = await medicalFeesState.saveToDatabase();
            if (result.success) {
                toast.add({
                    severity: 'success',
                    summary: 'Guardado exitoso',
                    detail: result.message || `${result.data?.imported_count || medicalFeesState.pendingImportServices.value.length} registros guardados en BD`,
                    life: 3000
                });
                await onMonthChange();
            }
        } catch (err) {
            toast.add({
                severity: 'error',
                summary: 'Error al guardar',
                detail: err.message || 'Ocurrió un error inesperado',
                life: 5000
            });
        }
    }

    /**
     * Maneja la limpieza de datos
     */
    function handleClearData() {
        medicalFeesState.clearAllData();
        toast.add({
            severity: 'success',
            summary: 'Datos limpiados',
            detail: 'Todos los datos han sido eliminados',
            life: 3000
        });
    }

    /**
     * Maneja la edición de celda en la tabla
     */
    async function onCellEditComplete(event) {
        const { data, newValue, field } = event;
        const oldValue = data[field];

        // Si no hubo cambio, ignorar
        if (newValue === oldValue) return;

        // Validación básica
        if (field === 'amount' || field === 'comision') {
            if (isNaN(newValue) || newValue < 0) {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Valor inválido',
                    life: 3000
                });
                data[field] = oldValue;
                return;
            }
        }

        // Validación para status
        if (field === 'status') {
            if (!VALID_STATUSES.includes(newValue)) {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Estado inválido',
                    life: 3000
                });
                data[field] = oldValue;
                return;
            }
        }

        try {
            await medicalFeesState.updateService(data.id, field, newValue);

            // Mapeo de campos a etiquetas en español
            const fieldLabels = {
                amount: 'Monto',
                comision: 'Comisión',
                status: 'Estado',
                serviceType: 'Tipo'
            };

            const fieldLabel = fieldLabels[field] || field;

            toast.add({
                severity: 'success',
                summary: '✅ Actualizado',
                detail: `${fieldLabel} actualizado correctamente`,
                life: 3000
            });
        } catch (error) {
            // Revertir al valor anterior
            data[field] = oldValue;

            const errorMessage = error.response?.data?.message || error.message || 'No se pudo actualizar';
            toast.add({
                severity: 'error',
                summary: '❌ Error al actualizar',
                detail: errorMessage,
                life: 4000
            });
        }
    }

    /**
     * Abre el dialog de aprobación masiva
     */
    function openBulkApprovalDialog() {
        filtersState.showBulkApprovalDialog.value = true;
    }

    /**
     * Maneja la aprobación masiva de servicios
     */
    async function handleBulkApproval({ ids, status, observation }) {
        console.log('[handleBulkApproval] Iniciando con:', { ids, status, observation });

        try {
            const result = await medicalFeesState.bulkApproveServices(ids, status, observation);
            console.log('[handleBulkApproval] Resultado del API:', result);

            if (result && typeof result.updated_count !== 'undefined') {
                const updatedCount = result.updated_count || 0;
                const skippedCount = result.skipped_count || 0;

                // Mapeo de estados a etiquetas en español
                const statusLabels = {
                    pendiente: 'Pendiente',
                    revisado: 'Revisado',
                    aprobado: 'Aprobado',
                    rechazado: 'Rechazado'
                };

                const statusLabel = statusLabels[status] || status;

                // Construir mensaje detallado
                let message = `${updatedCount} atención${updatedCount !== 1 ? 'es' : ''} actualizada${updatedCount !== 1 ? 's' : ''} a estado: ${statusLabel}`;

                if (skippedCount > 0) {
                    message += `\n\n⚠️ ${skippedCount} atención${skippedCount !== 1 ? 'es' : ''} omitida${skippedCount !== 1 ? 's' : ''} por estar en estado final (aprobado/rechazado)`;
                }

                // Agregar información sobre observaciones si existen
                if (observation) {
                    message += `\n\n📝 Observación: "${observation}"`;
                }

                console.log('[handleBulkApproval] Mostrando toast con mensaje:', message);
                toast.add({
                    severity: 'success',
                    summary: '✅ Actualización Masiva Exitosa',
                    detail: message,
                    life: 6000
                });

                // Cerrar el diálogo después de mostrar el toast
                console.log('[handleBulkApproval] Cerrando diálogo');
                filtersState.showBulkApprovalDialog.value = false;

                // Recargar datos
                console.log('[handleBulkApproval] Recargando datos');
                await onMonthChange();
                console.log('[handleBulkApproval] Proceso completado exitosamente');
            } else {
                // Si no tiene updated_count, mostrar error
                console.error('[handleBulkApproval] Respuesta inesperada del API:', result);
                toast.add({
                    severity: 'error',
                    summary: '❌ Error en Actualización',
                    detail: 'La respuesta del servidor no tiene el formato esperado',
                    life: 5000
                });
                filtersState.showBulkApprovalDialog.value = false;
            }
        } catch (err) {
            console.error('[handleBulkApproval] Error capturado:', err);
            toast.add({
                severity: 'error',
                summary: '❌ Error en Actualización Masiva',
                detail: err.message || 'No se pudo realizar la aprobación masiva',
                life: 5000
            });

            // Cerrar el diálogo incluso si hay error
            filtersState.showBulkApprovalDialog.value = false;
        }
    }

    /**
     * Abre el dialog de recálculo de comisiones
     */
    function openRecalculateDialog() {
        if (!computedState.canRecalculate.value) {
            toast.add({
                severity: 'warn',
                summary: 'Selecciona un médico',
                detail: 'Debes seleccionar un médico para recalcular sus comisiones',
                life: 3000
            });
            return;
        }
        filtersState.showRecalculateDialog.value = true;
    }

    /**
     * Maneja el recálculo de comisiones
     */
    async function handleRecalculate(doctorId, resolve) {
        try {
            const results = await medicalFeesState.recalculateCommissionsForDoctor(doctorId);
            resolve(results);
        } catch (error) {
            console.error('Error en recálculo:', error);
            resolve({
                total: 0,
                updated: 0,
                skipped: 0,
                errors: [{ id: 0, admision: 'N/A', error: error.message }]
            });
        }
    }

    /**
     * Maneja la finalización del recálculo
     */
    function handleRecalculateComplete(results) {
        const doctorName = computedState.selectedDoctorObject.value?.name || 'el médico';

        // Construir mensaje detallado
        let message = `${results.updated} servicio${results.updated !== 1 ? 's' : ''} actualizado${results.updated !== 1 ? 's' : ''} para ${doctorName}`;

        if (results.skipped > 0) {
            message += `\n\n⚠️ ${results.skipped} servicio${results.skipped !== 1 ? 's' : ''} omitido${results.skipped !== 1 ? 's' : ''} (estado final o sin cambios)`;
        }

        if (results.errors && results.errors.length > 0) {
            message += `\n\n❌ ${results.errors.length} error${results.errors.length !== 1 ? 'es' : ''}`;
        }

        toast.add({
            severity: results.errors && results.errors.length > 0 ? 'warn' : 'success',
            summary: '🔄 Recálculo de Comisiones Completado',
            detail: message,
            life: 6000
        });

        // Recargar datos
        onMonthChange();
    }

    /**
     * Maneja la eliminación de un médico del período actual
     */
    function handleDeleteDoctor(doctorCode) {
        const deletedCount = medicalFeesState.deleteDoctorServices(doctorCode);

        toast.add({
            severity: 'success',
            summary: '🗑️ Médico Eliminado',
            detail: `${deletedCount} servicio${deletedCount !== 1 ? 's' : ''} eliminado${deletedCount !== 1 ? 's' : ''} del período actual`,
            life: 4000
        });
    }

    /**
     * Actualiza la comisión de un servicio individual
     */
    async function updateServiceCommission(serviceId, newCommission) {
        try {
            const response = await MedicalFeesService.bulkUpdateCommissions([
                {
                    id: serviceId,
                    commission_amount: newCommission
                }
            ]);

            console.log('🔍 Response from bulkUpdateCommissions:', response);

            // La respuesta tiene estructura: {total, updated, skipped, errors}
            if (response && response.updated !== undefined && response.updated > 0) {
                toast.add({
                    severity: 'success',
                    summary: '✓ Guardado Exitoso',
                    detail: `Comisión actualizada a S/ ${newCommission.toFixed(2)} en la base de datos`,
                    life: 3000
                });
            } else {
                console.warn('⚠️ Response did not match success criteria:', response);
                toast.add({
                    severity: 'warn',
                    summary: 'Advertencia',
                    detail: 'La comisión se actualizó localmente pero hubo un problema al guardar',
                    life: 4000
                });
            }
        } catch (error) {
            console.error('Error updating commission:', error);
            toast.add({
                severity: 'error',
                summary: '❌ Error al Guardar',
                detail: 'No se pudo guardar la comisión en la base de datos',
                life: 4000
            });
        }
    }

    /**
     * Aplica comisión a múltiples servicios
     */
    async function applyBulkCommission(serviceIds, percentage) {
        try {
            const updates = serviceIds
                .map((id) => {
                    const service = medicalFeesState.services.value.find((s) => s.id === id);
                    if (!service) return null;

                    return {
                        id,
                        commission_amount: (service.amount * percentage) / 100
                    };
                })
                .filter(Boolean);

            if (updates.length === 0) {
                toast.add({
                    severity: 'warn',
                    summary: 'Advertencia',
                    detail: 'No hay servicios válidos para actualizar',
                    life: 3000
                });
                return;
            }

            const response = await MedicalFeesService.bulkUpdateCommissions(updates);

            if (response && response.updated !== undefined && response.updated > 0) {
                toast.add({
                    severity: 'success',
                    summary: '✓ Guardado Exitoso',
                    detail: `${response.updated} servicio${response.updated !== 1 ? 's' : ''} actualizado${response.updated !== 1 ? 's' : ''} con ${percentage}% en la base de datos`,
                    life: 4000
                });
            } else {
                toast.add({
                    severity: 'warn',
                    summary: 'Advertencia',
                    detail: 'Las comisiones se actualizaron localmente pero hubo un problema al guardar',
                    life: 4000
                });
            }
        } catch (error) {
            console.error('Error updating bulk commissions:', error);
            toast.add({
                severity: 'error',
                summary: '❌ Error al Guardar',
                detail: 'No se pudieron guardar las comisiones en la base de datos',
                life: 4000
            });
        }
    }

    return {
        // Inicialización
        initialize,

        // Carga de datos
        loadServerData,
        loadDataForMonth,

        // Handlers de eventos
        handleSearch,
        onMonthChange,
        onFileSelect,
        handleExport,
        handleFileUpload,
        handleSaveToDatabase,
        handleClearData,
        onCellEditComplete,

        // Aprobación masiva
        openBulkApprovalDialog,
        handleBulkApproval,

        // Recálculo de comisiones
        openRecalculateDialog,
        handleRecalculate,
        handleRecalculateComplete,

        // Eliminación de médico
        handleDeleteDoctor,

        // Edición manual de comisiones
        updateServiceCommission,
        applyBulkCommission
    };
}
