import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import { TicketAttachmentService } from '@/api/ticketAttachments';
import { apiUtils } from '@/api/axios';

export const useTicketAttachmentsStore = defineStore('ticketAttachments', () => {
    // State
    const state = reactive({
        attachments: [],
        isLoading: false,
        isUploading: false,
        isDeleting: false,
        error: null,
        currentTicketId: null
    });

    // Getters
    const allAttachments = computed(() => state.attachments);

    // Actions
    const fetchAttachments = async (ticketId) => {
        state.isLoading = true;
        state.error = null;
        state.currentTicketId = ticketId;
        try {
            const response = await TicketAttachmentService.getAttachments(ticketId);
            if (apiUtils.isSuccess(response)) {
                state.attachments = apiUtils.getData(response) || [];
                return response;
            }
            throw response;
        } catch (error) {
            state.error = error;
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const uploadAttachment = async (ticketId, file) => {
        state.isUploading = true;
        state.error = null;
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await TicketAttachmentService.uploadAttachment(ticketId, formData);
            if (apiUtils.isSuccess(response)) {
                const newAttachment = apiUtils.getData(response);
                state.attachments.push(newAttachment); // Add new attachment to the list
                return response;
            }
            throw response;
        } catch (error) {
            state.error = error;
            throw error;
        } finally {
            state.isUploading = false;
        }
    };

    const downloadAttachment = async (ticketId, attachmentId, filename) => {
        state.isLoading = true; // Use general loading for download
        state.error = null;
        try {
            const response = await TicketAttachmentService.downloadAttachment(ticketId, attachmentId);
            // The API returns a blob directly, so no apiUtils.getData needed
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || `attachment_${attachmentId}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            return response;
        } catch (error) {
            state.error = error;
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const deleteAttachment = async (ticketId, attachmentId) => {
        state.isDeleting = true;
        state.error = null;
        try {
            const response = await TicketAttachmentService.deleteAttachment(ticketId, attachmentId);
            if (apiUtils.isSuccess(response)) {
                state.attachments = state.attachments.filter((att) => att.id !== attachmentId);
                return response;
            }
            throw response;
        } catch (error) {
            state.error = error;
            throw error;
        } finally {
            state.isDeleting = false;
        }
    };

    // Real-time event handlers
    const handleAttachmentCreated = (attachment, ticketId) => {
        // Only add attachment if we're currently viewing this ticket
        if (state.currentTicketId === ticketId) {
            const exists = state.attachments.some((a) => a.id === attachment.id);
            if (!exists) {
                state.attachments.push(attachment);
            }
        }
    };

    const handleAttachmentDeleted = (attachmentId, ticketId) => {
        // Only remove attachment if we're currently viewing this ticket
        if (state.currentTicketId === ticketId) {
            const index = state.attachments.findIndex((a) => a.id === attachmentId);
            if (index !== -1) {
                state.attachments.splice(index, 1);
            }
        }
    };

    return {
        // State
        state,
        // Getters
        allAttachments,
        // Actions
        fetchAttachments,
        uploadAttachment,
        downloadAttachment,
        deleteAttachment,
        // Real-time handlers
        handleAttachmentCreated,
        handleAttachmentDeleted
    };
});
