import useEcho from '@/websocket/echo';
import { onUnmounted, ref } from 'vue';

/**
 * Composable para manejar alertas sonoras de llamados a quirófano
 * Escucha el evento 'patient.called.qx' en el canal 'surgery-calls'
 */
export function useSurgeryCallAlerts(options = {}) {
    const { autoStart = true, volume = 1.0, rate = 1.0, pitch = 1.0, lang = 'es-ES', voice = null, repeatCount = 2, enableNotifications = true } = options;

    const isListening = ref(false);
    const isAudioEnabled = ref(true);
    const surgeryCalls = ref([]);
    const latestCall = ref(null);
    const isSpeaking = ref(false);

    let channel = null;
    let speechSynthesis = null;

    // Inicializar Web Speech API
    const initSpeechSynthesis = () => {
        if ('speechSynthesis' in window) {
            speechSynthesis = window.speechSynthesis;
            return true;
        } else {
            console.warn('[SurgeryCallAlerts] Web Speech API no está disponible en este navegador');
            return false;
        }
    };

    /**
     * Reproducir alerta de voz con el mensaje de llamado a quirófano
     */
    const speakAlert = (patientName, bedNumber, roomName) => {
        if (!isAudioEnabled.value || !speechSynthesis) {
            return;
        }

        // Cancelar cualquier mensaje anterior
        speechSynthesis.cancel();

        const message = `Atención. Paciente ${patientName}, cama ${bedNumber}, ${roomName}, pasar a quirófano. Repito. Paciente ${patientName}, cama ${bedNumber}, pasar a quirófano.`;

        isSpeaking.value = true;

        // Crear utterance
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = lang;
        utterance.volume = volume;
        utterance.rate = rate;
        utterance.pitch = pitch;

        // Seleccionar voz si se especificó
        if (voice) {
            const voices = speechSynthesis.getVoices();
            const selectedVoice = voices.find((v) => v.name === voice || v.lang === lang);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        // Eventos del utterance
        utterance.onend = () => {
            isSpeaking.value = false;
            console.log('[SurgeryCallAlerts] 🔊 Alerta de voz completada');
        };

        utterance.onerror = (event) => {
            isSpeaking.value = false;
            console.error('[SurgeryCallAlerts] Error en síntesis de voz:', event);
        };

        // Reproducir el mensaje
        console.log('[SurgeryCallAlerts] 🔊 Reproduciendo alerta de voz:', message);
        speechSynthesis.speak(utterance);
    };

    /**
     * Mostrar notificación del navegador
     */
    const showBrowserNotification = (data) => {
        if (!enableNotifications) return;

        const patientName = data.patient?.name || 'Paciente desconocido';
        const bedName = data.hospital_attention?.bed?.name || 'N/A';
        const roomName = data.hospital_attention?.bed?.room?.name || 'N/A';
        const admissionNumber = data.admission_number || 'N/A';

        if (Notification.permission === 'granted') {
            const notification = new Notification('🚨 LLAMADO A QUIRÓFANO', {
                body: `${patientName}\nAdmisión: ${admissionNumber}\n${roomName} - ${bedName}`,
                icon: '/favicon.ico',
                tag: `surgery-call-${admissionNumber}`,
                requireInteraction: true,
                vibrate: [200, 100, 200, 100, 200],
                timestamp: Date.now()
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Auto-cerrar después de 30 segundos
            setTimeout(() => {
                notification.close();
            }, 30000);
        } else if (Notification.permission === 'default') {
            // Solicitar permisos
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    showBrowserNotification(data);
                }
            });
        }
    };

    /**
     * Manejar evento de llamado a quirófano
     */
    const handleSurgeryCall = (data) => {
        console.log('═══════════════════════════════════════════════════');
        console.log('[SurgeryCallAlerts] 🚨 EVENTO RECIBIDO: patient.called.qx');
        console.log('[SurgeryCallAlerts] 🔍 Timestamp:', new Date().toISOString());
        console.log('[SurgeryCallAlerts] 🔍 Data completa recibida:', JSON.stringify(data, null, 2));
        console.log('[SurgeryCallAlerts] 🔍 isAudioEnabled:', isAudioEnabled.value);
        console.log('[SurgeryCallAlerts] 🔍 isListening:', isListening.value);
        console.log('═══════════════════════════════════════════════════');

        // Extraer información del paciente
        const patientName = data.patient?.name || 'Paciente desconocido';
        const bedName = data.hospital_attention?.bed?.name || 'N/A';
        const bedNumber = bedName.split(' ').pop() || bedName; // Extraer solo el número
        const roomName = data.hospital_attention?.bed?.room?.name || 'Habitación';
        const admissionNumber = data.admission_number;

        console.log('[SurgeryCallAlerts] 🔍 Información extraída:', {
            patientName,
            bedName,
            bedNumber,
            roomName,
            admissionNumber
        });

        // Actualizar última llamada
        latestCall.value = {
            ...data,
            receivedAt: new Date().toISOString()
        };
        console.log('[SurgeryCallAlerts] 🔍 latestCall actualizado:', latestCall.value);

        // Agregar al historial
        surgeryCalls.value.unshift({
            ...data,
            receivedAt: new Date().toISOString()
        });
        console.log('[SurgeryCallAlerts] 🔍 Historial de llamadas:', surgeryCalls.value.length, 'elementos');

        // Limitar historial a 50 elementos
        if (surgeryCalls.value.length > 50) {
            surgeryCalls.value = surgeryCalls.value.slice(0, 50);
        }

        // Reproducir alerta de voz
        console.log('[SurgeryCallAlerts] 🔊 Intentando reproducir alerta de voz...');
        speakAlert(patientName, bedNumber, roomName);

        // Mostrar notificación del navegador
        console.log('[SurgeryCallAlerts] 🔔 Intentando mostrar notificación...');
        showBrowserNotification(data);

        console.log('[SurgeryCallAlerts] ✅ Alerta procesada para:', {
            patientName,
            admissionNumber,
            bedName,
            roomName
        });
    };

    /**
     * Iniciar escucha de eventos
     */
    const startListening = () => {
        console.log('[SurgeryCallAlerts] 🔍 startListening() llamado');
        console.log('[SurgeryCallAlerts] 🔍 isListening actual:', isListening.value);

        if (isListening.value) {
            console.warn('[SurgeryCallAlerts] Ya está escuchando eventos');
            return;
        }

        // Inicializar síntesis de voz
        if (!initSpeechSynthesis()) {
            console.error('[SurgeryCallAlerts] No se pudo inicializar síntesis de voz');
        }

        try {
            console.log('[SurgeryCallAlerts] 🔍 useEcho disponible:', !!useEcho);

            // Suscribirse al canal surgery-calls
            channel = useEcho.channel('hospitalizations');

            console.log('[SurgeryCallAlerts] 📡 Suscrito al canal: surgery-calls');
            console.log('[SurgeryCallAlerts] 🔍 Canal creado:', channel);

            // Escuchar evento patient.called.qx
            channel.listen('.patient.called.qx', handleSurgeryCall);

            isListening.value = true;

            console.log('[SurgeryCallAlerts] ✅ Iniciado - Escuchando eventos de llamados a quirófano');
            console.log('[SurgeryCallAlerts] 🔍 isListening después de iniciar:', isListening.value);
        } catch (error) {
            console.error('[SurgeryCallAlerts] ❌ Error al iniciar:', error);
            console.error('[SurgeryCallAlerts] ❌ Stack:', error.stack);
        }
    };

    /**
     * Detener escucha de eventos
     */
    const stopListening = () => {
        if (!isListening.value) {
            return;
        }

        try {
            if (channel) {
                channel.stopListening('.patient.called.qx');
                useEcho.leave('surgery-calls');
                channel = null;
            }

            // Cancelar cualquier síntesis en progreso
            if (speechSynthesis) {
                speechSynthesis.cancel();
            }

            isListening.value = false;
            isSpeaking.value = false;

            console.log('[SurgeryCallAlerts] ⏹️ Detenido - Eventos de quirófano desconectados');
        } catch (error) {
            console.error('[SurgeryCallAlerts] Error al detener:', error);
        }
    };

    /**
     * Alternar activación de audio
     */
    const toggleAudio = () => {
        isAudioEnabled.value = !isAudioEnabled.value;

        if (!isAudioEnabled.value && speechSynthesis) {
            // Detener cualquier reproducción en curso
            speechSynthesis.cancel();
            isSpeaking.value = false;
        }

        console.log('[SurgeryCallAlerts] 🔊 Audio', isAudioEnabled.value ? 'activado' : 'desactivado');

        return isAudioEnabled.value;
    };

    /**
     * Reproducir alerta de prueba
     */
    const testAlert = () => {
        speakAlert('Juan Pérez', '101', 'Habitación 1');
    };

    /**
     * Limpiar historial
     */
    const clearHistory = () => {
        surgeryCalls.value = [];
        latestCall.value = null;
        console.log('[SurgeryCallAlerts] 🗑️ Historial limpiado');
    };

    /**
     * Solicitar permisos de notificación
     */
    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            console.warn('[SurgeryCallAlerts] Las notificaciones no están soportadas');
            return 'denied';
        }

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            console.log('[SurgeryCallAlerts] 🔔 Permiso de notificaciones:', permission);
            return permission;
        }

        return Notification.permission;
    };

    // Auto-iniciar si está configurado
    if (autoStart) {
        console.log('[SurgeryCallAlerts] 🔍 autoStart está activado, iniciando...');
        startListening();
        requestNotificationPermission();
    } else {
        console.log('[SurgeryCallAlerts] 🔍 autoStart está desactivado');
    }

    // Cleanup automático
    onUnmounted(() => {
        stopListening();
    });

    return {
        // Estado
        isListening,
        isAudioEnabled,
        isSpeaking,
        surgeryCalls,
        latestCall,

        // Métodos
        startListening,
        stopListening,
        toggleAudio,
        testAlert,
        clearHistory,
        requestNotificationPermission
    };
}
