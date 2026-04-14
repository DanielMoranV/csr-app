<script setup>
import { usePermissions } from '@/composables/usePermissions';
import { generateMenuStructure } from '@/config/permissions';
import { computed, onMounted } from 'vue';

import AppMenuItem from './AppMenuItem.vue';

import { useAuthStore } from '@/store/authStore.js';
import { useDocumentManagementStore } from '@/store/documentManagementStore.js';
import { useNotificationsStore } from '@/store/notificationsStore.js';
import { useTicketsStore } from '@/store/ticketsStore.js';

const { filterMenuItems } = usePermissions();
const docStore = useDocumentManagementStore();
const ticketsStore = useTicketsStore();
const notificationsStore = useNotificationsStore();
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
                if (docItem) docItem.badge = pendingCount;
            }
        });
    }

    // Inyectar badges de tickets: comentarios sin leer + tickets asignados pendientes
    const ticketUnread  = ticketsStore.globalUnreadCount;
    const ticketPending = ticketsStore.mySummary?.by_status?.pendiente ?? 0;

    if (ticketUnread > 0 || ticketPending > 0) {
        filtered.forEach((section) => {
            if (section.items) {
                const ticketItem = section.items.find((item) => item.to === '/tickets');
                if (!ticketItem) return;

                const badges = [];
                if (ticketUnread > 0) {
                    badges.push({ icon: 'pi pi-comments', value: ticketUnread > 99 ? '99+' : ticketUnread, severity: 'info' });
                }
                if (ticketPending > 0) {
                    badges.push({ icon: 'pi pi-clock', value: ticketPending > 99 ? '99+' : ticketPending, severity: 'warn' });
                }
                ticketItem.badges = badges;
            }
        });
    }

    // Inyectar badge de notificaciones de tareas no leídas
    const taskUnread = notificationsStore.state.unreadByModule?.['tasks'] || 0;
    if (taskUnread > 0) {
        filtered.forEach((section) => {
            if (section.items) {
                const taskItem = section.items.find((item) => item.to === '/hospital-tasks');
                if (taskItem) taskItem.badge = taskUnread > 99 ? '99+' : taskUnread;
            }
        });
    }

    return filtered;
});

onMounted(() => {
    docStore.fetchPermittedDocuments();
    ticketsStore.fetchGlobalUnreadCount();
    ticketsStore.fetchMySummary();
    // Sincronizar el badge de tareas desde el conteo global de notificaciones
    notificationsStore.fetchUnreadCount();
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
