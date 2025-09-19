import api from './axios.js';

const BASE_URL = '/tickets';

export const TicketAttachmentService = {
    /**
     * Upload a new attachment for a ticket.
     * @param {number} ticketId - The ID of the ticket.
     * @param {FormData} formData - FormData containing the file.
     * @returns {Promise<object>} The API response.
     */
    uploadAttachment: (ticketId, formData) => {
        return api.post(`${BASE_URL}/${ticketId}/attachments`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    /**
     * Get all attachments for a specific ticket.
     * @param {number} ticketId - The ID of the ticket.
     * @returns {Promise<object>} The API response.
     */
    getAttachments: (ticketId) => {
        return api.get(`${BASE_URL}/${ticketId}/attachments`);
    },

    /**
     * Download a specific attachment.
     * @param {number} ticketId - The ID of the ticket.
     * @param {number} attachmentId - The ID of the attachment.
     * @returns {Promise<object>} The API response (blob).
     */
    downloadAttachment: (ticketId, attachmentId) => {
        return api.get(`${BASE_URL}/${ticketId}/attachments/${attachmentId}`, {
            responseType: 'blob' // Important for file downloads
        });
    },

    /**
     * Delete a specific attachment.
     * @param {number} ticketId - The ID of the ticket.
     * @param {number} attachmentId - The ID of the attachment.
     * @returns {Promise<object>} The API response.
     */
    deleteAttachment: (ticketId, attachmentId) => {
        return api.delete(`${BASE_URL}/${ticketId}/attachments/${attachmentId}`);
    }
};
