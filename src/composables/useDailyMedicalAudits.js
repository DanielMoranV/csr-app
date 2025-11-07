import { hospitalAttentions as hospitalAttentionsApi } from '@/api/hospitalAttentions';
import { computed, ref } from 'vue';

export function useDailyMedicalAudits() {
    const audits = ref([]);
    const auditStats = ref({});
    const isLoading = ref(false);
    const error = ref(null);

    // Getters
    const allAudits = computed(() => audits.value);
    const statistics = computed(() => auditStats.value);
    const pendingAudits = computed(() => audits.value.filter((audit) => !audit.is_audited));
    const auditedCount = computed(() => audits.value.filter((audit) => audit.is_audited).length);
    const pendingCount = computed(() => pendingAudits.value.length);
    const requiresAttentionCount = computed(() => audits.value.filter((audit) => audit.requires_attention).length);

    // Actions
    async function fetchAudits(params = {}) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await hospitalAttentionsApi.listAudits(params);
            audits.value = response.data?.data || response.data || [];
            return response;
        } catch (err) {
            error.value = err;
            audits.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchAuditStats() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await hospitalAttentionsApi.getAuditStats();
            auditStats.value = response.data || {};
            return response;
        } catch (err) {
            error.value = err;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function getAuditById(id) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await hospitalAttentionsApi.getAuditById(id);
            return response.data;
        } catch (err) {
            error.value = err;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function getAttentionAudits(attentionId, params = {}) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await hospitalAttentionsApi.getAttentionAudits(attentionId, params);
            return response.data?.data || response.data || [];
        } catch (err) {
            error.value = err;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function getAttentionAuditByDate(attentionId, date) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await hospitalAttentionsApi.getAttentionAuditByDate(attentionId, date);
            return response.data;
        } catch (err) {
            error.value = err;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function createAudit(auditData) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await hospitalAttentionsApi.createAudit(auditData);
            // Add to local array if not already present
            const newAudit = response.data?.data || response.data;
            if (newAudit && !audits.value.find((a) => a.id === newAudit.id)) {
                audits.value.unshift(newAudit);
            }
            return response;
        } catch (err) {
            error.value = err;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function updateAudit(id, auditData) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await hospitalAttentionsApi.updateAudit(id, auditData);
            // Update in local array
            const updatedAudit = response.data?.data || response.data;
            if (updatedAudit) {
                const index = audits.value.findIndex((a) => a.id === id);
                if (index !== -1) {
                    audits.value[index] = updatedAudit;
                }
            }
            return response;
        } catch (err) {
            error.value = err;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function deleteAudit(id) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await hospitalAttentionsApi.deleteAudit(id);
            // Remove from local array
            const index = audits.value.findIndex((a) => a.id === id);
            if (index !== -1) {
                audits.value.splice(index, 1);
            }
            return response;
        } catch (err) {
            error.value = err;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function markAsAudited(id) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await hospitalAttentionsApi.markAuditAsAudited(id);
            // Update in local array
            const updatedAudit = response.data?.data || response.data;
            if (updatedAudit) {
                const index = audits.value.findIndex((a) => a.id === id);
                if (index !== -1) {
                    audits.value[index] = updatedAudit;
                }
            }
            return response;
        } catch (err) {
            error.value = err;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // Helpers
    function getAuditSeverity(audit) {
        if (!audit) return 'secondary';
        if (audit.requires_attention) return 'danger';
        if (audit.is_audited) return 'success';
        return 'warning';
    }

    function getComplianceScoreSeverity(score) {
        if (!score) return 'secondary';
        if (score >= 90) return 'success';
        if (score >= 70) return 'info';
        if (score >= 50) return 'warning';
        return 'danger';
    }

    function formatAuditDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            // Para fechas en formato YYYY-MM-DD, parsear como fecha local
            let date;
            if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = dateString.split('-').map(Number);
                date = new Date(year, month - 1, day);
            } else {
                date = new Date(dateString);
            }

            if (isNaN(date)) return dateString;
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    function formatAuditDateTime(dateString) {
        if (!dateString) return 'N/A';
        try {
            // Para fechas con hora, usar Date normal
            const date = new Date(dateString);
            if (isNaN(date)) return dateString;
            return date.toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    function getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return {
        // State
        audits,
        auditStats,
        isLoading,
        error,
        // Getters
        allAudits,
        statistics,
        pendingAudits,
        auditedCount,
        pendingCount,
        requiresAttentionCount,
        // Actions
        fetchAudits,
        fetchAuditStats,
        getAuditById,
        getAttentionAudits,
        getAttentionAuditByDate,
        createAudit,
        updateAudit,
        deleteAudit,
        markAsAudited,
        // Helpers
        getAuditSeverity,
        getComplianceScoreSeverity,
        formatAuditDate,
        formatAuditDateTime,
        getTodayDate
    };
}
