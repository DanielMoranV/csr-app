<script setup>
import { TreasuryService } from '@/service/TreasuryService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();

const counterparties = ref([]);
const loading = ref(true);
const counterpartyDialog = ref(false);
const deleteCounterpartyDialog = ref(false);
const counterparty = ref({});
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);

const types = ref([
    { label: 'Proveedor', value: 'Proveedor' },
    { label: 'Cliente', value: 'Cliente' },
    { label: 'Empleado', value: 'Empleado' },
    { label: 'Otro', value: 'Otro' }
]);

const loadCounterparties = async () => {
    loading.value = true;
    try {
        const response = await TreasuryService.getCounterparties();
        counterparties.value = response.data.data || response.data;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las contrapartes', life: 3000 });
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadCounterparties();
});

const openNew = () => {
    counterparty.value = {
        name: '',
        document_number: '',
        type: 'Proveedor'
    };
    submitted.value = false;
    counterpartyDialog.value = true;
};

const hideDialog = () => {
    counterpartyDialog.value = false;
    submitted.value = false;
};

const editCounterparty = (c) => {
    counterparty.value = { ...c };
    counterpartyDialog.value = true;
};

const saveCounterparty = async () => {
    submitted.value = true;

    if (counterparty.value.name.trim() && counterparty.value.document_number.trim() && counterparty.value.type) {
        try {
            if (counterparty.value.id) {
                await TreasuryService.updateCounterparty(counterparty.value.id, counterparty.value);
                toast.add({ severity: 'success', summary: 'Éxito', detail: 'Contraparte actualizada', life: 3000 });
            } else {
                await TreasuryService.createCounterparty(counterparty.value);
                toast.add({ severity: 'success', summary: 'Éxito', detail: 'Contraparte creada', life: 3000 });
            }
            hideDialog();
            loadCounterparties();
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la contraparte', life: 3000 });
        }
    }
};

const confirmDeleteCounterparty = (c) => {
    counterparty.value = c;
    deleteCounterpartyDialog.value = true;
};

const deleteCounterparty = async () => {
    try {
        await TreasuryService.deleteCounterparty(counterparty.value.id);
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Contraparte eliminada', life: 3000 });
        deleteCounterpartyDialog.value = false;
        loadCounterparties();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la contraparte', life: 3000 });
    }
};
</script>

<template>
    <div class="card">
        <h5>Contrapartes / Terceros</h5>
        <Toolbar class="mb-4">
            <template #start>
                <Button label="Nueva Contraparte" icon="pi pi-plus" class="p-button-success mr-2" @click="openNew" />
            </template>
            <template #end>
                <span class="p-input-icon-left">
                    <i class="pi pi-search" />
                    <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                </span>
            </template>
        </Toolbar>

        <DataTable :value="counterparties" :paginator="true" :rows="10" dataKey="id" :filters="filters" :loading="loading" showGridlines responsiveLayout="scroll" emptyMessage="No se encontraron contrapartes.">
            <Column field="name" header="Nombre / Razón Social" :sortable="true"></Column>
            <Column field="document_number" header="Nro Documento" :sortable="true"></Column>
            <Column field="type" header="Tipo" :sortable="true"></Column>

            <Column header="Acciones" :exportable="false" style="min-width: 8rem">
                <template #body="slotProps">
                    <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="editCounterparty(slotProps.data)" />
                    <Button icon="pi pi-trash" class="p-button-rounded p-button-danger" @click="confirmDeleteCounterparty(slotProps.data)" />
                </template>
            </Column>
        </DataTable>

        <Dialog v-model:visible="counterpartyDialog" :style="{ width: '450px' }" :header="counterparty.id ? 'Editar Contraparte' : 'Nueva Contraparte'" :modal="true" class="p-fluid">
            <div class="field">
                <label for="name">Nombre / Razón Social</label>
                <InputText id="name" v-model.trim="counterparty.name" required="true" autofocus :class="{ 'p-invalid': submitted && !counterparty.name }" />
                <small class="p-error" v-if="submitted && !counterparty.name">El nombre es requerido.</small>
            </div>

            <div class="field">
                <label for="document_number">Nro. Documento</label>
                <InputText id="document_number" v-model.trim="counterparty.document_number" required="true" :class="{ 'p-invalid': submitted && !counterparty.document_number }" />
                <small class="p-error" v-if="submitted && !counterparty.document_number">El documento es requerido.</small>
            </div>

            <div class="field">
                <label for="type">Tipo</label>
                <Dropdown id="type" v-model="counterparty.type" :options="types" optionLabel="label" optionValue="value" :class="{ 'p-invalid': submitted && !counterparty.type }" />
                <small class="p-error" v-if="submitted && !counterparty.type">El tipo es requerido.</small>
            </div>

            <template #footer>
                <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
                <Button label="Guardar" icon="pi pi-check" class="p-button-text" @click="saveCounterparty" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteCounterpartyDialog" :style="{ width: '450px' }" header="Confirmar" :modal="true">
            <div class="flex align-items-center justify-content-center">
                <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
                <span v-if="counterparty"
                    >¿Estás seguro que deseas eliminar <b>{{ counterparty.name }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" class="p-button-text" @click="deleteCounterpartyDialog = false" />
                <Button label="Sí" icon="pi pi-check" class="p-button-text" @click="deleteCounterparty" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped></style>
