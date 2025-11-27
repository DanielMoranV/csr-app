<script setup>
import Toast from 'primevue/toast';
import { useTokenRefresh } from '@/composables/useTokenRefresh';

// Activar auto-refresh preventivo del token
useTokenRefresh();
</script>

<template>
    <Toast />
    <router-view />
</template>

<style scoped></style>
