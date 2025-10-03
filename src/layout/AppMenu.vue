<script setup>
import { generateMenuStructure } from '@/config/permissions';
import { usePermissions } from '@/composables/usePermissions';
import { computed } from 'vue';

import AppMenuItem from './AppMenuItem.vue';

const { filterMenuItems } = usePermissions();

// Generar menú desde la configuración centralizada
const menuModel = generateMenuStructure();

// Menú filtrado basado en permisos del usuario
const filteredMenu = computed(() => {
    return filterMenuItems(menuModel);
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
