<script setup>
import { TreasuryService } from '@/service/TreasuryService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();

const banks = ref([]);
const loading = ref(true);
const bankDialog = ref(false);
const deleteBankDialog = ref(false);
const bank = ref({});
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);

const loadBanks = async () => {
    loading.value = true;
    try {
        const response = await TreasuryService.getBanks();
        banks.value = response.data.data;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los bancos', life: 3000 });
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadBanks();
});

const openNew = () => {
    bank.value = {
        name: '',
        swift_code: null,
        consultant_number: null,
        consultant_name: null,
        is_active: true
    };
    submitted.value = false;
    bankDialog.value = true;
};

const hideDialog = () => {
    bankDialog.value = false;
    submitted.value = false;
};

const saveBank = async () => {
    submitted.value = true;

    if (bank.value.name.trim()) {
        try {
            await TreasuryService.createBank(bank.value);
            toast.add({ severity: 'success', summary: 'Éxito', detail: 'Banco creado correctamente', life: 3000 });
            hideDialog();
            loadBanks();
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el banco', life: 3000 });
        }
    }
};

const confirmDeleteBank = (b) => {
    bank.value = b;
    deleteBankDialog.value = true;
};

const deleteBank = async () => {
    try {
        await TreasuryService.deleteBank(bank.value.id);
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Banco eliminado', life: 3000 });
        deleteBankDialog.value = false;
        loadBanks();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el banco', life: 3000 });
    }
};
</script>

<template>
    <div class="card">
        <h5>Administración de Bancos</h5>
        <Toolbar class="mb-4">
            <template #start>
                <Button label="Nuevo Banco" icon="pi pi-plus" class="p-button-success mr-2" @click="openNew" />
            </template>
            <template #end>
                <span class="p-input-icon-left">
                    <i class="pi pi-search" />
                    <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                </span>
            </template>
        </Toolbar>

        <DataTable :value="banks" :paginator="true" :rows="10" dataKey="id" :filters="filters" :loading="loading" showGridlines responsiveLayout="scroll" emptyMessage="No se encontraron bancos.">
            <Column field="name" header="Nombre" :sortable="true"></Column>
            <Column field="swift_code" header="SWIFT" :sortable="true"></Column>
            <Column field="consultant_name" header="Funcionario" :sortable="true"></Column>
            <Column field="is_active" header="Estado" :sortable="true">
                <template #body="slotProps">
                    <Tag :severity="slotProps.data.is_active ? 'success' : 'danger'" :value="slotProps.data.is_active ? 'Activo' : 'Inactivo'" />
                </template>
            </Column>

            <Column header="Acciones" :exportable="false" style="min-width: 8rem">
                <template #body="slotProps">
                    <Button icon="pi pi-trash" class="p-button-rounded p-button-danger" @click="confirmDeleteBank(slotProps.data)" />
                </template>
            </Column>
        </DataTable>

        <Dialog v-model:visible="bankDialog" :style="{ width: '450px' }" header="Detalles del Banco" :modal="true" class="p-fluid">
            <div class="field">
                <label for="name">Nombre</label>
                <InputText id="name" v-model.trim="bank.name" required="true" autofocus :class="{ 'p-invalid': submitted && !bank.name }" />
                <small class="p-error" v-if="submitted && !bank.name">El nombre es requerido.</small>
            </div>

            <div class="field">
                <label for="swift_code">Código SWIFT</label>
                <InputText id="swift_code" v-model="bank.swift_code" />
            </div>

            <div class="field">
                <label for="consultant_name">Nombre de Funcionario</label>
                <InputText id="consultant_name" v-model="bank.consultant_name" />
            </div>

            <div class="field">
                <label for="consultant_number">Teléfono de Funcionario</label>
                <InputText id="consultant_number" v-model="bank.consultant_number" />
            </div>

            <div class="field-checkbox">
                <Checkbox id="is_active" v-model="bank.is_active" :binary="true" />
                <label for="is_active">Activo</label>
            </div>

            <template #footer>
                <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
                <Button label="Guardar" icon="pi pi-check" class="p-button-text" @click="saveBank" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteBankDialog" :style="{ width: '450px' }" header="Confirmar" :modal="true">
            <div class="flex align-items-center justify-content-center">
                <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
                <span v-if="bank"
                    >¿Estás seguro que deseas eliminar <b>{{ bank.name }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" class="p-button-text" @click="deleteBankDialog = false" />
                <Button label="Sí" icon="pi pi-check" class="p-button-text" @click="deleteBank" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
/* Agrega estilos si es necesario */
</style>
