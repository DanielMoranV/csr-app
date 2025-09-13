<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import echo from '@/echo'; // Importamos nuestra instancia de Echo

const newHospitalization = ref(null);
const channelName = 'hospitalizations';

console.log('Componente WebSocketExample montado.');

onMounted(() => {
  console.log(`Conectando al canal: ${channelName}`)
  echo.channel(channelName)
    .listen('.hospitalization.created', (event) => {
      console.log('Evento recibido:', event);
      newHospitalization.value = event.hospitalization;
    });
});

onUnmounted(() => {
  console.log(`Saliendo del canal: ${channelName}`);
  echo.leave(channelName);
});
</script>

<template>
  <div class="card">
    <h5>Ejemplo de WebSocket con Reverb</h5>
    <p>Este componente está escuchando eventos en el canal <strong>{{ channelName }}</strong>.</p>
    <div v-if="newHospitalization" class="p-4 mt-4 bg-green-100 border-l-4 border-green-500 text-green-700">
      <p class="font-bold">¡Nueva hospitalización recibida!</p>
      <pre class="mt-2 text-sm">{{ newHospitalization }}</pre>
    </div>
    <div v-else class="p-4 mt-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
      <p>Esperando por el evento <code>.hospitalization.created</code>...</p>
    </div>
  </div>
</template>

<style scoped>
pre {
  background-color: #f0fdf4; /* Un fondo ligeramente diferente para el bloque de código */
  padding: 1rem;
  border-radius: 8px;
  white-space: pre-wrap; /* Para que el texto se ajuste */
  word-break: break-all;
}
</style>
