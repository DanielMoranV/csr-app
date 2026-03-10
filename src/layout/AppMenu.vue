<script setup>
import { usePermissions } from '@/composables/usePermissions';
import { generateMenuStructure } from '@/config/permissions';
import { computed, onMounted } from 'vue';

import AppMenuItem from './AppMenuItem.vue';

import { useAuthStore } from '@/store/authStore.js';
import { useDocumentManagementStore } from '@/store/documentManagementStore.js';

const { filterMenuItems } = usePermissions();
const docStore = useDocumentManagementStore();
const authStore = useAuthStore();

// Generar menú desde la configuración centralizada
const menuModel = generateMenuStructure();

// Menú filtrado basado en permisos del usuario
const filteredMenu = computed(() => {
    const filtered = filterMenuItems(menuModel);

    // Inyectar badge de documentos pendientes
    const pendingCount = docStore.pendingMyTurnCount(authStore.getUser?.id);

    if (pendingCount > 0) {
        filtered.forEach((section) => {
            if (section.items) {
                const docItem = section.items.find((item) => item.to === '/documentos');
                if (docItem) {
                    docItem.badge = pendingCount;
                }
            }
        });
    }

    return filtered;
});

onMounted(() => {
    docStore.fetchPermittedDocuments();
});
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in filteredMenu" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
