<script setup>
import { useRecurrenceRulesStore } from '@/store/recurrenceRulesStore';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import { onMounted, ref } from 'vue';

// Import child components (assuming they will be created)
import ConfirmDeleteDialog from '@/components/rooms/ConfirmDeleteDialog.vue'; // Re-using existing component
import RecurrenceRuleDialog from '@/components/tickets/RecurrenceRuleDialog.vue';
import RecurrenceRulesTable from '@/components/tickets/RecurrenceRulesTable.vue';

const store = useRecurrenceRulesStore();

const dialogVisible = ref(false);
const deleteDialogVisible = ref(false);
const currentRule = ref({});

onMounted(() => {
    store.fetchRules();
});

const openNew = () => {
    currentRule.value = {}; // Reset for a new rule
    dialogVisible.value = true;
};

const editRule = (rule) => {
    currentRule.value = { ...rule };
    dialogVisible.value = true;
};

const saveRule = async (ruleData) => {
    if (ruleData.id) {
        // Update existing rule
        await store.updateRule(ruleData.id, ruleData);
    } else {
        // Create new rule
        await store.createRule(ruleData);
    }
    dialogVisible.value = false;
};

const confirmDeleteRule = (rule) => {
    currentRule.value = rule;
    deleteDialogVisible.value = true;
};

const deleteRule = async () => {
    if (currentRule.value.id) {
        await store.deleteRule(currentRule.value.id);
    }
    deleteDialogVisible.value = false;
};
</script>

<template>
    <div class="grid">
        <div class="col-12">
            <div class="card">
                <h5>Reglas de Recurrencia de Tickets</h5>
                <p>Aquí puedes gestionar las reglas para la creación automática de tickets recurrentes.</p>

                <!-- Toolbar -->
                <Toolbar class="mb-4">
                    <template v-slot:start>
                        <div class="my-2">
                            <Button label="Nueva Regla" icon="pi pi-plus" class="p-button-success mr-2" @click="openNew" />
                        </div>
                    </template>
                </Toolbar>

                <!-- Table Component -->
                <RecurrenceRulesTable :rules="store.rules" :loading="store.isLoading" @edit-rule="editRule" @delete-rule="confirmDeleteRule" />
            </div>
        </div>
    </div>

    <!-- Dialog Component -->
    <RecurrenceRuleDialog v-model:visible="dialogVisible" :rule="currentRule" @save-rule="saveRule" />

    <!-- Delete Confirmation Dialog -->
    <ConfirmDeleteDialog v-model:visible="deleteDialogVisible" :item-name="currentRule?.title" @confirm="deleteRule" />
</template>
