<script setup>
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
// import { useTokenRefresh } from '@/composables/useTokenRefresh'; // DESHABILITADO - tokens ya no expiran

// Activar auto-refresh preventivo del token
// useTokenRefresh(); // DESHABILITADO - tokens ya no expiran automaticamente
</script>

<template>
    <Toast />
    <ConfirmDialog />
    <router-view />
</template>

<style scoped></style>
