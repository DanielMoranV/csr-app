# Sistema de Alertas de Llamado a Quirófano

## Descripción General

El sistema de alertas de llamado a quirófano permite a la pantalla de hospitalización recibir notificaciones en tiempo real cuando un paciente es llamado a quirófano. El sistema utiliza:

- **Pusher/Laravel Echo** para eventos en tiempo real
- **Web Speech API** para síntesis de voz (texto a voz)
- **Notification API** para notificaciones del navegador
- **Animaciones CSS** para alertas visuales impactantes

## Características

### ✨ Funcionalidades Principales

1. **Alertas Sonoras**: Mensaje de voz automático que anuncia:
   - Nombre del paciente
   - Número de cama
   - Nombre de habitación
   - Instrucción de pasar a quirófano

2. **Alertas Visuales**: Banner prominente con:
   - Animaciones de entrada/salida
   - Efectos de pulsación y brillo
   - Información completa del paciente
   - Botón para cerrar manualmente

3. **Notificaciones del Navegador**:
   - Notificaciones nativas del sistema operativo
   - Persistentes y con vibración
   - Click para enfocar la ventana

4. **Controles de Audio**:
   - Botón para activar/desactivar alertas sonoras
   - Indicador visual cuando está hablando
   - Estado persistente durante la sesión

## Arquitectura

### Componentes

```
src/
├── composables/
│   └── useSurgeryCallAlerts.js      # Composable principal
└── views/
    └── hospitalization/
        └── HospitalizationDisplay.vue  # Integración en vista
```

### Flujo de Datos

```
Backend (Pusher)
    ↓
Canal: 'surgery-calls'
    ↓
Evento: 'patient.called.qx'
    ↓
useSurgeryCallAlerts (composable)
    ↓
├─→ Web Speech API (síntesis de voz)
├─→ Notification API (notificaciones)
└─→ Vue Reactive State (UI)
    ↓
HospitalizationDisplay (vista)
```

## Uso del Composable

### Importación y Configuración Básica

```javascript
import { useSurgeryCallAlerts } from '@/composables/useSurgeryCallAlerts';

const {
    isListening,
    isAudioEnabled,
    isSpeaking,
    latestCall,
    surgeryCalls,
    toggleAudio,
    testAlert,
    clearHistory,
    requestNotificationPermission
} = useSurgeryCallAlerts({
    autoStart: true,          // Iniciar automáticamente
    enableNotifications: true, // Habilitar notificaciones del navegador
    volume: 1.0,              // Volumen (0.0 - 1.0)
    rate: 1.0,                // Velocidad de voz (0.1 - 10)
    pitch: 1.0,               // Tono de voz (0 - 2)
    lang: 'es-ES',            // Idioma de la voz
    repeatCount: 2            // Número de repeticiones del mensaje
});
```

### Propiedades Reactivas

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isListening` | `Ref<boolean>` | Indica si está escuchando eventos de Pusher |
| `isAudioEnabled` | `Ref<boolean>` | Indica si las alertas de audio están habilitadas |
| `isSpeaking` | `Ref<boolean>` | Indica si actualmente está reproduciendo un mensaje |
| `latestCall` | `Ref<Object>` | Último llamado recibido |
| `surgeryCalls` | `Ref<Array>` | Historial de todos los llamados |

### Métodos

| Método | Descripción |
|--------|-------------|
| `startListening()` | Inicia la escucha de eventos de Pusher |
| `stopListening()` | Detiene la escucha de eventos |
| `toggleAudio()` | Activa/desactiva las alertas de audio |
| `testAlert()` | Reproduce una alerta de prueba |
| `clearHistory()` | Limpia el historial de llamados |
| `requestNotificationPermission()` | Solicita permisos de notificación |

## Estructura del Evento

### Evento Pusher: `patient.called.qx`

```json
{
  "admission_number": "12345",
  "hospital_attention": {
    "id": 1,
    "number": "12345",
    "id_beds": 5,
    "doctor": "Dr. Juan Pérez",
    "bed": {
      "id": 5,
      "name": "Cama 101",
      "room": {
        "id": 2,
        "name": "Habitación 101",
        "floor": 1
      }
    }
  },
  "patient": {
    "id": 10,
    "name": "María López García",
    "date_of_birth": "1980-05-15",
    "sex": "F"
  },
  "timestamp": "2025-11-06T14:30:00.000Z"
}
```

## Integración en Componentes

### Ejemplo Completo

```vue
<script setup>
import { useSurgeryCallAlerts } from '@/composables/useSurgeryCallAlerts';

// Inicializar el composable
const {
    isAudioEnabled,
    isSpeaking,
    latestCall,
    surgeryCalls,
    toggleAudio,
    testAlert
} = useSurgeryCallAlerts({
    autoStart: true,
    enableNotifications: true
});

// Formatear hora
const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};
</script>

<template>
    <!-- Botón de control de audio -->
    <Button
        :icon="isAudioEnabled ? 'pi pi-volume-up' : 'pi pi-volume-off'"
        @click="toggleAudio"
        :severity="isAudioEnabled ? 'success' : 'secondary'"
        :class="{ 'audio-speaking': isSpeaking }"
    />

    <!-- Alerta visual -->
    <transition name="surgery-alert">
        <div v-if="latestCall" class="surgery-call-alert">
            <div class="alert-content">
                <div class="alert-icon">
                    <i class="pi pi-exclamation-triangle"></i>
                </div>
                <div class="alert-info">
                    <h2 class="alert-title">🚨 LLAMADO A QUIRÓFANO</h2>
                    <p class="patient-name">{{ latestCall.patient?.name }}</p>
                    <div class="alert-meta">
                        <span>Admisión: {{ latestCall.admission_number }}</span>
                        <span>{{ latestCall.hospital_attention?.bed?.name }}</span>
                        <span>{{ formatTime(latestCall.receivedAt) }}</span>
                    </div>
                </div>
                <Button icon="pi pi-times" @click="latestCall = null" />
            </div>
        </div>
    </transition>

    <!-- Historial de llamados -->
    <div v-if="surgeryCalls.length > 0">
        <h3>Historial de Llamados</h3>
        <ul>
            <li v-for="call in surgeryCalls" :key="call.admission_number">
                {{ call.patient?.name }} - {{ formatTime(call.receivedAt) }}
            </li>
        </ul>
    </div>
</template>
```

## Configuración de Permisos

### Notificaciones del Navegador

El sistema solicita automáticamente permisos de notificación al iniciar. También puedes solicitarlos manualmente:

```javascript
const permission = await requestNotificationPermission();

if (permission === 'granted') {
    console.log('Permisos de notificación concedidos');
} else {
    console.log('Permisos de notificación denegados');
}
```

### Web Speech API

La síntesis de voz funciona automáticamente en navegadores compatibles. Navegadores soportados:

- ✅ Chrome/Edge (Chromium)
- ✅ Safari
- ✅ Firefox
- ✅ Opera

## Personalización

### Voces Disponibles

Para obtener las voces disponibles en el navegador:

```javascript
const voices = window.speechSynthesis.getVoices();
console.log('Voces disponibles:', voices);

// Filtrar voces en español
const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
```

### Configurar Voz Específica

```javascript
const { startListening } = useSurgeryCallAlerts({
    voice: 'Microsoft Helena - Spanish (Spain)', // Nombre exacto de la voz
    lang: 'es-ES',
    rate: 0.9,  // Más lento
    pitch: 1.1  // Tono más alto
});
```

### Personalizar Mensaje de Voz

Para modificar el mensaje de voz, edita la función `speakAlert` en `useSurgeryCallAlerts.js`:

```javascript
const speakAlert = (patientName, bedNumber, roomName) => {
    const message = `
        Atención.
        Paciente ${patientName},
        cama ${bedNumber},
        ${roomName},
        pasar a quirófano inmediatamente.
    `;

    // ... resto del código
};
```

## Estilos CSS

Los estilos de las alertas están en `HospitalizationDisplay.vue`. Clases principales:

- `.surgery-call-alert` - Contenedor principal
- `.alert-content` - Contenido de la alerta
- `.alert-icon` - Icono animado
- `.alert-title` - Título de la alerta
- `.patient-name` - Nombre del paciente
- `.alert-meta` - Metadatos (admisión, cama, hora)

### Animaciones Incluidas

- `surgery-alert-enter` - Entrada con bounce
- `surgery-alert-leave` - Salida con fade
- `surgery-alert-shake` - Efecto de sacudida
- `surgery-alert-glow` - Efecto de brillo pulsante
- `alert-icon-pulse` - Pulsación del icono
- `audio-pulse` - Pulsación del botón de audio

## Testing

### Probar Alerta Manualmente

```javascript
testAlert(); // Reproduce alerta de prueba
```

### Simular Evento desde Consola

```javascript
// En la consola del navegador
window.Echo.channel('surgery-calls').trigger('.patient.called.qx', {
    admission_number: '12345',
    patient: { name: 'Juan Pérez' },
    hospital_attention: {
        bed: {
            name: 'Cama 101',
            room: { name: 'Habitación 1' }
        }
    },
    timestamp: new Date().toISOString()
});
```

## Troubleshooting

### Problema: No se reproduce el audio

**Soluciones:**
1. Verificar que `isAudioEnabled` esté en `true`
2. Comprobar que el navegador soporte Web Speech API
3. Verificar que no esté silenciado el navegador/sistema
4. Algunos navegadores requieren interacción del usuario primero

### Problema: No aparecen las notificaciones

**Soluciones:**
1. Verificar permisos en configuración del navegador
2. Llamar a `requestNotificationPermission()` manualmente
3. Comprobar que no estén bloqueadas en el sistema operativo

### Problema: No se reciben eventos de Pusher

**Soluciones:**
1. Verificar conexión a Pusher: `useEcho.connector.pusher.connection.state`
2. Comprobar credenciales en `.env`
3. Revisar logs del backend
4. Verificar que el canal `surgery-calls` esté configurado

### Verificar Estado de Conexión

```javascript
// Verificar estado de Pusher
const connectionState = useEcho.connector.pusher.connection.state;
console.log('Estado de conexión:', connectionState); // 'connected', 'connecting', 'disconnected'

// Verificar canales suscritos
const channels = useEcho.connector.pusher.channels.all();
console.log('Canales suscritos:', channels);
```

## Mejoras Futuras

- [ ] Agregar opción de archivo de audio personalizado
- [ ] Configurar volumen dinámico según nivel de urgencia
- [ ] Historial persistente en localStorage
- [ ] Filtros por tipo de cirugía
- [ ] Dashboard de estadísticas de llamados
- [ ] Integración con sistema de paging/beepers
- [ ] Modo silencioso con solo notificaciones visuales
- [ ] Reconocimiento de voz para confirmar recepción

## Referencias

- [Web Speech API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Notification API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Laravel Echo Documentation](https://laravel.com/docs/broadcasting#client-side-installation)
- [Pusher Channels Documentation](https://pusher.com/docs/channels)

## Soporte

Para reportar problemas o sugerencias, contactar al equipo de desarrollo.
