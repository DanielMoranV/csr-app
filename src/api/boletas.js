import axios from './axios';

/**
 * API service del módulo de Envío Masivo de Documentos ("Boletas").
 *
 * Cubre plantillas de correo, archivos PDF, destinatarios/padrón, catálogo de
 * tipos de documento y campañas de envío. El header `Authorization: Bearer`
 * lo agrega el interceptor de axios.
 *
 * Permisos del backend:
 *  - `boletas.view`   → lectura (consultar/descargar)
 *  - `boletas.manage` → escritura (crear/editar/eliminar, subir, lanzar, reintentar)
 *
 * Las descargas (constancia PDF, errores XLSX) usan `responseType: 'blob'`; en
 * esos casos el interceptor devuelve la respuesta completa de axios (no el
 * wrapper `{ success, data }`), por lo que se accede a `response.data` (Blob) y
 * `response.headers`.
 */
export const boletas = {
    // ── Plantillas ─────────────────────────────────────────────────────────

    /** Listar plantillas. @returns {Promise} data: Template[] */
    getTemplates: () => axios.get('/boletas/templates'),

    /** Obtener una plantilla. @returns {Promise} data: Template */
    getTemplate: (id) => axios.get(`/boletas/templates/${id}`),

    /**
     * Vista previa de una plantilla con variables reemplazadas.
     * @param {number} id - ID de la plantilla
     * @param {{ subject?: string, body?: string, mes?: string }} payload
     * @returns {Promise} data: { subject, body, html, variables }
     */
    previewTemplate: (id, payload = {}) => axios.post(`/boletas/templates/${id}/preview`, payload),

    /**
     * Crear plantilla.
     * @param {{ name, document_type?, subject, body, is_default? }} data
     */
    createTemplate: (data) => axios.post('/boletas/templates', data),

    /** Actualizar plantilla. */
    updateTemplate: (id, data) => axios.put(`/boletas/templates/${id}`, data),

    /** Eliminar plantilla. */
    deleteTemplate: (id) => axios.delete(`/boletas/templates/${id}`),

    // ── Archivos PDF ─────────────────────────────────────────────────────────

    /**
     * Listar PDFs disponibles de un periodo/tipo.
     * @param {{ period: string, document_type?: string }} params
     * @returns {Promise} data: { period, document_type, count, files: [{dni, size}] }
     */
    getFiles: (params) => axios.get('/boletas/files', { params }),

    /**
     * Subir ZIP de PDFs (multipart). El FormData debe incluir `period`,
     * opcional `document_type` y `file` (ZIP).
     * @returns {Promise} data: { period, document_type, stored, invalid[], total_available }
     */
    uploadFiles: (formData) =>
        axios.post('/boletas/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    /** Eliminar un PDF de un periodo/tipo por DNI. */
    deleteFile: (period, dni, documentType) =>
        axios.delete(`/boletas/files/${encodeURIComponent(period)}/${encodeURIComponent(dni)}`, {
            params: { document_type: documentType }
        }),

    // ── Destinatarios / Padrón ───────────────────────────────────────────────

    /**
     * Padrón de empleados (fuente de destinatarios).
     * @param {{ q?: string, active?: number|string }} params
     * @returns {Promise} data: [{ id, dni, nombre, email, area, is_active }]
     */
    getEmployees: (params = {}) => axios.get('/boletas/employees', { params }),

    /**
     * Validar Excel/CSV de destinatarios sin persistir (multipart). El FormData
     * debe incluir `file` y, opcionalmente, `period` y `document_type` (para
     * cruzar contra PDFs disponibles).
     * @returns {Promise} data: { valid[], invalid[], summary }
     */
    validateRecipients: (formData) =>
        axios.post('/boletas/recipients/validate', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    // ── Catálogo ─────────────────────────────────────────────────────────────

    /** Tipos de documento para poblar selects. @returns {Promise} data: [{ slug, label }] */
    getDocumentTypes: () => axios.get('/boletas/document-types'),

    // ── Campañas ─────────────────────────────────────────────────────────────

    /** Historial paginado de campañas. @param {{ per_page?, page? }} params */
    getCampaigns: (params = {}) => axios.get('/boletas/campaigns', { params }),

    /** Detalle de una campaña con agregados. */
    getCampaign: (id) => axios.get(`/boletas/campaigns/${id}`),

    /**
     * Progreso de una campaña (para polling).
     * @returns {Promise} data: { status, total, sent, failed, pending, percent }
     */
    getCampaignProgress: (id) => axios.get(`/boletas/campaigns/${id}/progress`),

    /**
     * Destinatarios de una campaña (paginado).
     * @param {{ status?, per_page?, page? }} params
     */
    getCampaignRecipients: (id, params = {}) => axios.get(`/boletas/campaigns/${id}/recipients`, { params }),

    /** Descargar reporte de errores (XLSX). @returns {Promise} respuesta axios (blob) */
    downloadErrors: (id) =>
        axios.get(`/boletas/campaigns/${id}/errors.xlsx`, {
            responseType: 'blob'
        }),

    /** Descargar constancia de un destinatario (PDF). @returns {Promise} respuesta axios (blob) */
    downloadConstancia: (id, recipientId) =>
        axios.get(`/boletas/campaigns/${id}/recipients/${recipientId}/constancia`, {
            responseType: 'blob'
        }),

    /**
     * Crear campaña (queda en `draft`).
     * @param {{ name, period, document_type?, email_template_id, recipients[] }} data
     */
    createCampaign: (data) => axios.post('/boletas/campaigns', data),

    /** Lanzar campaña: congela plantilla y encola envíos. */
    launchCampaign: (id) => axios.post(`/boletas/campaigns/${id}/launch`),

    /** Reintentar destinatarios fallidos. */
    retryFailed: (id) => axios.post(`/boletas/campaigns/${id}/retry-failed`)
};
