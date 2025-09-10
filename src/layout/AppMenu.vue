<script setup>
import { usePermissions } from '@/composables/usePermissions';
import { computed, ref } from 'vue';

import AppMenuItem from './AppMenuItem.vue';

const { filterMenuItems } = usePermissions();

// Menú filtrado basado en permisos del usuario
const filteredMenu = computed(() => {
    return filterMenuItems(model.value);
});

const model = ref([
    {
        label: 'Principal',
        items: [
            {
                label: 'Dashboard',
                icon: 'pi pi-fw pi-home',
                to: '/dashboard',
                positions: ['*'] // Acceso para todas las posiciones
            }
        ]
    },
    {
        label: 'Mi Cuenta',
        items: [
            {
                label: 'Perfil',
                icon: 'pi pi-fw pi-user',
                to: '/profile',
                positions: ['*'] // Acceso público para todas las posiciones
            }
        ]
    },
    {
        label: 'Administración',
        items: [
            {
                label: 'Usuarios',
                icon: 'pi pi-fw pi-users',
                to: '/usuarios',
                positions: ['SISTEMAS', 'RRHH', 'ADMINISTRACION'] // Solo estas 3 posiciones
            }
        ]
    },

    {
        label: 'Hospitalización',
        items: [
            {
                label: 'Estado Actual',
                icon: 'pi pi-fw pi-th-large',
                to: '/hospitalizacion',
                positions: ['*']
            },
            {
                label: 'Atenciones',
                icon: 'pi pi-fw pi-clipboard',
                to: '/hospital-attentions',
                positions: ['*'] // Acceso para todas las posiciones
            },
            {
                label: 'Habitaciones',
                icon: 'pi pi-fw pi-building',
                to: '/habitaciones',
                positions: ['SISTEMAS', 'ADMINISTRACION', 'DIRECTOR MEDICO', 'HOSPITALIZACION', 'RRHH']
            }
        ]
    },
    {
        label: 'SISCLIN',
        items: [
            {
                label: 'Import. Hosp.',
                icon: 'pi pi-fw pi-database',
                to: '/sisclin/import',
                positions: ['SISTEMAS', 'ADMINISTRACION', 'DIRECTOR MEDICO', 'HOSPITALIZACION']
            }
        ]
    }
]);
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
