import { hospitalAttentions as hospitalAttentionsApi } from '@/api/hospitalAttentions';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useHospitalAttentionsStore = defineStore('hospitalAttentions', () => {
    // State
    const attentions = ref([]);
    const stats = ref({});
    const isLoading = ref(false);
    const error = ref(null);

    // Getters
    const allAttentions = computed(() => attentions.value);
    const statistics = computed(() => stats.value);

    // Actions
    async function fetchAttentions() {
        isLoading.value = true;
        error.value = null;
        try {
            // El interceptor de axios devuelve directamente el cuerpo de la respuesta en caso de éxito.
            const response = await hospitalAttentionsApi.list(); // Cargar todo, sin paginar
            // Asumimos una estructura de respuesta { success: true, data: { data: [...] } }

            attentions.value = response.data?.data || [];
        } catch (err) {
            // El interceptor de axios rechaza la promesa con un objeto de error estandarizado.
            error.value = err;
            attentions.value = [];
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchStats() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await hospitalAttentionsApi.getStats();
            // Asumimos una estructura de respuesta { success: true, data: { ... } }
            stats.value = response.data || {};
        } catch (err) {
            error.value = err;
        } finally {
            isLoading.value = false;
        }
    }

    async function createAttention(attentionData) {
        try {
            await hospitalAttentionsApi.create(attentionData);
            await fetchAttentions(); // Refresh list after creating
        } catch (e) {
            throw e; // Re-throw to be handled in the component
        }
    }

    async function updateAttention(id, attentionData) {
        try {
            await hospitalAttentionsApi.update(id, attentionData);
            await fetchAttentions(); // Refresh list after updating
        } catch (e) {
            throw e;
        }
    }

    async function deleteAttention(id) {
        try {
            await hospitalAttentionsApi.delete(id);
            await fetchAttentions(); // Refresh list after deleting
        } catch (e) {
            throw e;
        }
    }

    async function createTask(taskData) {
        try {
            await hospitalAttentionsApi.createTask(taskData);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            throw e;
        }
    }

    async function updateTask(id, taskData) {
        try {
            await hospitalAttentionsApi.updateTask(id, taskData);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            throw e;
        }
    }

    async function deleteTask(id) {
        try {
            await hospitalAttentionsApi.deleteTask(id);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            throw e;
        }
    }

    async function createDetails(detailsData) {
        try {
            await hospitalAttentionsApi.createDetails(detailsData);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            throw e;
        }
    }

    async function updateDetails(id, detailsData) {
        try {
            await hospitalAttentionsApi.updateDetails(id, detailsData);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            throw e;
        }
    }

    async function deleteDetails(id) {
        try {
            await hospitalAttentionsApi.deleteDetails(id);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            throw e;
        }
    }

    async function approveAttention(id) {
        try {
            const response = await hospitalAttentionsApi.approve(id);
            await fetchAttentions(); // Refresh list
            return response;
        } catch (e) {
            throw e;
        }
    }

    // Audit methods
    async function createAudit(auditData) {
        try {
            await hospitalAttentionsApi.createAudit(auditData);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            throw e;
        }
    }

    async function updateAudit(id, auditData) {
        try {
            await hospitalAttentionsApi.updateAudit(id, auditData);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            throw e;
        }
    }

    async function deleteAudit(id) {
        try {
            await hospitalAttentionsApi.deleteAudit(id);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            throw e;
        }
    }

    async function markAuditAsAudited(id) {
        try {
            await hospitalAttentionsApi.markAuditAsAudited(id);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            throw e;
        }
    }

    // Real-time event handlers
    function handleHospitalizationCreated(eventData) {
        // Add new attention to the list
        const newAttention = eventData.data;
        if (newAttention && !attentions.value.find((att) => att.id === newAttention.id)) {
            attentions.value.unshift(newAttention);
        }
        // Refresh stats
        fetchStats();
    }

    function handleHospitalizationUpdated(eventData) {
        const updatedAttention = eventData.data;

        if (updatedAttention) {
            const index = attentions.value.findIndex((att) => att.id === updatedAttention.id);
            if (index !== -1) {
                // Update existing attention
                attentions.value[index] = updatedAttention;
            } else {
                // Add if not found (might be a new record)
                attentions.value.unshift(updatedAttention);
            }
        }
        // Refresh stats
        fetchStats();
    }

    function handleHospitalizationDeleted(eventData) {
        const deletedId = eventData.data?.id || eventData.id;

        if (deletedId) {
            const index = attentions.value.findIndex((att) => att.id === deletedId);
            if (index !== -1) {
                attentions.value.splice(index, 1);
            }
        }
        // Refresh stats
        fetchStats();
    }

    // Details event handlers
    function handleDetailsCreated(eventData) {
        const detail = eventData.detail || eventData.data;

        if (!detail || !detail.id_attentions) return;

        // Find the attention that owns this detail
        const attention = attentions.value.find((att) => att.id === detail.id_attentions);

        if (attention) {
            // Initialize details_attention array if it doesn't exist
            if (!attention.details_attention) {
                attention.details_attention = [];
            }

            // Add the new detail if it doesn't already exist
            const detailExists = attention.details_attention.some((d) => d.id === detail.id);
            if (!detailExists) {
                // Insert at the beginning (most recent first)
                attention.details_attention.unshift(detail);
            }
        }
    }

    function handleDetailsUpdated(eventData) {
        const detail = eventData.detail || eventData.data;

        if (!detail || !detail.id_attentions) return;

        // Find the attention that owns this detail
        const attention = attentions.value.find((att) => att.id === detail.id_attentions);

        if (attention && attention.details_attention) {
            // Find and update the detail
            const detailIndex = attention.details_attention.findIndex((d) => d.id === detail.id);
            if (detailIndex !== -1) {
                attention.details_attention[detailIndex] = detail;
            } else {
                // If detail not found, add it
                attention.details_attention.unshift(detail);
            }
        }
    }

    function handleDetailsDeleted(eventData) {
        const detailId = eventData.detail?.id || eventData.id;
        const attentionId = eventData.detail?.id_attentions || eventData.id_attentions;

        if (!detailId) return;

        // Find the attention that owns this detail
        const attention = attentions.value.find((att) => att.id === attentionId);

        if (attention && attention.details_attention) {
            // Remove the detail from the array
            const detailIndex = attention.details_attention.findIndex((d) => d.id === detailId);
            if (detailIndex !== -1) {
                attention.details_attention.splice(detailIndex, 1);
            }
        }
    }

    // Audit event handlers
    function handleAuditCreated(eventData) {
        const audit = eventData.audit || eventData.data;

        if (!audit || !audit.id_attentions) return;

        // Find the attention that owns this audit
        const attention = attentions.value.find((att) => att.id === audit.id_attentions);

        if (attention) {
            // Initialize daily_medical_audits array if it doesn't exist
            if (!attention.daily_medical_audits) {
                attention.daily_medical_audits = [];
            }

            // Add the new audit if it doesn't already exist
            const auditExists = attention.daily_medical_audits.some((a) => a.id === audit.id);
            if (!auditExists) {
                // Insert at the beginning (most recent first)
                attention.daily_medical_audits.unshift(audit);
            }
        }
    }

    function handleAuditUpdated(eventData) {
        const audit = eventData.audit || eventData.data;

        if (!audit || !audit.id_attentions) return;

        // Find the attention that owns this audit
        const attention = attentions.value.find((att) => att.id === audit.id_attentions);

        if (attention && attention.daily_medical_audits) {
            // Find and update the audit
            const auditIndex = attention.daily_medical_audits.findIndex((a) => a.id === audit.id);
            if (auditIndex !== -1) {
                attention.daily_medical_audits[auditIndex] = audit;
            } else {
                // If audit not found, add it
                attention.daily_medical_audits.unshift(audit);
            }
        }
    }

    function handleAuditDeleted(eventData) {
        const auditId = eventData.audit?.id || eventData.id;
        const attentionId = eventData.audit?.id_attentions || eventData.id_attentions;

        if (!auditId) return;

        // Find the attention that owns this audit
        const attention = attentions.value.find((att) => att.id === attentionId);

        if (attention && attention.daily_medical_audits) {
            // Remove the audit from the array
            const auditIndex = attention.daily_medical_audits.findIndex((a) => a.id === auditId);
            if (auditIndex !== -1) {
                attention.daily_medical_audits.splice(auditIndex, 1);
            }
        }
    }

    // Task event handlers
    function handleTaskCreated(eventData) {
        const task = eventData.task;

        if (!task || !task.id_attentions) return;

        // Find the attention that owns this task
        const attention = attentions.value.find((att) => att.id === task.id_attentions);

        if (attention) {
            // Initialize tasks array if it doesn't exist
            if (!attention.tasks) {
                attention.tasks = [];
            }

            // Add the new task if it doesn't already exist
            const taskExists = attention.tasks.some((t) => t.id === task.id);
            if (!taskExists) {
                attention.tasks.push(task);
            }
        }
    }

    function handleTaskUpdated(eventData) {
        const task = eventData.task;

        if (!task || !task.id_attentions) return;

        // Find the attention that owns this task
        const attention = attentions.value.find((att) => att.id === task.id_attentions);

        if (attention && attention.tasks) {
            // Find and update the task
            const taskIndex = attention.tasks.findIndex((t) => t.id === task.id);
            if (taskIndex !== -1) {
                attention.tasks[taskIndex] = task;
            } else {
                // If task not found, add it (could have been filtered out before)
                attention.tasks.push(task);
            }
        }
    }

    function handleTaskDeleted(eventData) {
        const taskId = eventData.task?.id || eventData.id;
        const attentionId = eventData.task?.id_attentions || eventData.id_attentions;

        if (!taskId) return;

        // Find the attention that owns this task
        const attention = attentions.value.find((att) => att.id === attentionId);

        if (attention && attention.tasks) {
            // Remove the task from the array
            const taskIndex = attention.tasks.findIndex((t) => t.id === taskId);
            if (taskIndex !== -1) {
                attention.tasks.splice(taskIndex, 1);
            }
        }
    }

    return {
        // State
        attentions,
        stats,
        isLoading,
        error,
        // Getters
        allAttentions,
        statistics,
        // Actions
        fetchAttentions,
        fetchStats,
        createAttention,
        updateAttention,
        deleteAttention,
        approveAttention,
        createTask,
        updateTask,
        deleteTask,
        createDetails,
        updateDetails,
        deleteDetails,
        createAudit,
        updateAudit,
        deleteAudit,
        markAuditAsAudited,
        // Real-time event handlers
        handleHospitalizationCreated,
        handleHospitalizationUpdated,
        handleHospitalizationDeleted,
        handleDetailsCreated,
        handleDetailsUpdated,
        handleDetailsDeleted,
        handleAuditCreated,
        handleAuditUpdated,
        handleAuditDeleted,
        handleTaskCreated,
        handleTaskUpdated,
        handleTaskDeleted
    };
});
