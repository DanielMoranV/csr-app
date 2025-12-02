<script setup>
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import { useTokenRefresh } from '@/composables/useTokenRefresh';

// Activar auto-refresh preventivo del token
useTokenRefresh();
</script>

<template>
    <Toast />
    <ConfirmDialog />
    <router-view />
</template>

<style scoped></style>
