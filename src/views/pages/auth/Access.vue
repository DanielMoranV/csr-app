<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { useAuthStore } from '@/store/authStore';
import Button from 'primevue/button';
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const countdown = ref(4);
let intervalId = null;

onMounted(() => {
    intervalId = setInterval(() => {
        countdown.value--;
        if (countdown.value <= 0) {
            clearInterval(intervalId);
            if (authStore.isLoggedIn) {
                router.push('/profile');
            } else {
                router.push('/');
            }
        }
    }, 1000);
});

onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
});
</script>

<template>
    <FloatingConfigurator />
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
        <div class="flex flex-col items-center justify-center">
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, rgba(6, 182, 212, 0.4) 10%, rgba(6, 182, 212, 0) 30%)">
                <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20 flex flex-col items-center" style="border-radius: 53px">
                    <div class="gap-4 flex flex-col items-center">
                        <div class="flex justify-center items-center border-2 border-cyan-500 rounded-full" style="width: 3.2rem; height: 3.2rem">
                            <i class="text-cyan-500 pi pi-fw pi-lock !text-2xl"></i>
                        </div>
                        <h1 class="text-surface-900 dark:text-surface-0 font-bold text-4xl lg:text-5xl mb-2">Acceso Denegado</h1>
                        <span class="text-muted-color mb-8 text-center">No tienes los permisos necesarios para acceder a este recurso.<br>Por favor contacta al administrador.</span>
                        <img src="/demo/images/access/asset-access.svg" alt="Access denied" class="mb-8" width="80%" />
                        
                        <div class="flex flex-col items-center gap-2">
                            <div class="text-cyan-600 font-medium">
                                <i class="pi pi-spin pi-spinner mr-2"></i>
                                Redirigiendo en {{ countdown }} segundos...
                            </div>
                            <div class="col-span-12 mt-4 text-center">
                                <Button as="router-link" label="Ir al Inicio" to="/" severity="info" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
