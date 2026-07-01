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
    const latestReturn = ref(null);
    const isSpeaking = ref(false);

    let channel = null;
    let speechSynthesis = null;

    // Inicializar Web Speech API
    const initSpeechSynthesis = () => {
        if ('speechSynthesis' in window) {
            speechSynthesis = window.speechSynthesis;
            return true;
        } else {
            return false;
        }
    };

    /**
     * Reproducir alerta de voz con el mensaje de llamado a quirófano
     */
    const speakAlert = (patientName, bedNumber) => {
        if (!isAudioEnabled.value || !speechSynthesis) {
            return;
        }

        // Cancelar cualquier mensaje anterior
        speechSynthesis.cancel();

        const message = `Atención. Paciente ${patientName}, cama ${bedNumber}, pasar a quirófano. Repito. Paciente ${patientName}, cama ${bedNumber}, pasar a quirófano. Por favor trasladar al paciente.`;

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
        };

        utterance.onerror = (event) => {
            isSpeaking.value = false;
            // Error handled
        };

        // Reproducir el mensaje
        speechSynthesis.speak(utterance);
    };

    /**
     * Reproducir alerta de voz para retorno desde quirófano
     */
    const speakReturn = (patientName, bedNumber) => {
        if (!isAudioEnabled.value || !speechSynthesis) return;

        speechSynthesis.cancel();

        const message = `Atención. El paciente ${patientName} ha salido de quirófano. Por favor pasar a recoger al paciente y llevarlo a la cama ${bedNumber}. Repito. El paciente ${patientName} ha salido de quirófano.`;

        isSpeaking.value = true;

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = lang;
        utterance.volume = volume;
        utterance.rate = rate;
        utterance.pitch = pitch;

        if (voice) {
            const voices = speechSynthesis.getVoices();
            const selectedVoice = voices.find((v) => v.name === voice || v.lang === lang);
            if (selectedVoice) utterance.voice = selectedVoice;
        }

        utterance.onend = () => {
            isSpeaking.value = false;
        };
        utterance.onerror = () => {
            isSpeaking.value = false;
        };

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
     * Mostrar notificación del navegador para retorno desde quirófano
     */
    const showBrowserNotificationReturn = (data) => {
        if (!enableNotifications) return;

        const patientName = data.patient?.name || 'Paciente desconocido';
        const bedName = data.hospital_attention?.bed?.name || 'N/A';
        const roomName = data.hospital_attention?.bed?.room?.name || 'N/A';
        const admissionNumber = data.admission_number || 'N/A';

        if (Notification.permission === 'granted') {
            const notification = new Notification('✅ PACIENTE SALE DE QUIRÓFANO', {
                body: `${patientName}\nAdmisión: ${admissionNumber}\nPasar a recoger — ${roomName} ${bedName}`,
                icon: '/favicon.ico',
                tag: `surgery-return-${admissionNumber}`,
                requireInteraction: true,
                timestamp: Date.now()
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            setTimeout(() => notification.close(), 30000);
        } else if (Notification.permission === 'default') {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') showBrowserNotificationReturn(data);
            });
        }
    };

    /**
     * Manejar evento de llamado a quirófano
     */
    const handleSurgeryCall = (data) => {
        // Extraer información del paciente
        const patientName = data.patient?.name || 'Paciente desconocido';
        const bedName = data.hospital_attention?.bed?.name || 'N/A';
        const bedNumber = bedName.split(' ').pop() || bedName; // Extraer solo el número
        const roomName = data.hospital_attention?.bed?.room?.name || 'Habitación';
        const admissionNumber = data.admission_number;

        // Actualizar última llamada
        latestCall.value = {
            ...data,
            receivedAt: new Date().toISOString()
        };

        // Agregar al historial
        surgeryCalls.value.unshift({
            ...data,
            receivedAt: new Date().toISOString()
        });

        // Limitar historial a 50 elementos
        if (surgeryCalls.value.length > 50) {
            surgeryCalls.value = surgeryCalls.value.slice(0, 50);
        }

        // Reproducir alerta de voz
        speakAlert(patientName, bedNumber);

        // Mostrar notificación del navegador
        showBrowserNotification(data);
    };

    /**
     * Manejar evento de retorno desde quirófano
     */
    const handleSurgeryReturn = (data) => {
        const patientName = data.patient?.name || 'Paciente desconocido';
        const bedName = data.hospital_attention?.bed?.name || 'N/A';
        const bedNumber = bedName.split(' ').pop() || bedName;

        latestReturn.value = {
            ...data,
            receivedAt: new Date().toISOString()
        };

        surgeryCalls.value.unshift({
            ...data,
            direction: 'out',
            receivedAt: new Date().toISOString()
        });

        if (surgeryCalls.value.length > 50) {
            surgeryCalls.value = surgeryCalls.value.slice(0, 50);
        }

        speakReturn(patientName, bedNumber);
        showBrowserNotificationReturn(data);
    };

    /**
     * Iniciar escucha de eventos
     */
    const startListening = () => {
        if (isListening.value) {
            return;
        }

        // Inicializar síntesis de voz
        initSpeechSynthesis();

        try {
            // Suscribirse al canal surgery-calls
            channel = useEcho.channel('hospitalizations');

            channel.listen('.patient.called.qx', handleSurgeryCall);
            channel.listen('.patient.returned.qx', handleSurgeryReturn);

            isListening.value = true;
        } catch (error) {
            // Error handled
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
                channel.stopListening('.patient.returned.qx');
                useEcho.leave('hospitalizations');
                channel = null;
            }

            // Cancelar cualquier síntesis en progreso
            if (speechSynthesis) {
                speechSynthesis.cancel();
            }

            isListening.value = false;
            isSpeaking.value = false;
        } catch (error) {
            // Error handled
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

        return isAudioEnabled.value;
    };

    /**
     * Reproducir alerta de prueba
     */
    const testAlert = () => {
        speakAlert('Juan Pérez', '101');
    };

    /**
     * Limpiar historial
     */
    const clearHistory = () => {
        surgeryCalls.value = [];
        latestCall.value = null;
    };

    /**
     * Solicitar permisos de notificación
     */
    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            return 'denied';
        }

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission;
        }

        return Notification.permission;
    };

    // Auto-iniciar si está configurado
    if (autoStart) {
        startListening();
        requestNotificationPermission();
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
        latestReturn,

        // Métodos
        startListening,
        stopListening,
        toggleAudio,
        testAlert,
        clearHistory,
        requestNotificationPermission
    };
}
