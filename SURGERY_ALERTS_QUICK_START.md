# 🚨 Sistema de Alertas de Quirófano - Inicio Rápido

## ✅ Implementación Completada

El sistema de alertas de llamado a quirófano ha sido implementado exitosamente en la pantalla de hospitalización.

## 🎯 ¿Qué hace?

Cuando el backend emite un evento `patient.called.qx` en el canal `surgery-calls`, el sistema:

1. **🔊 Reproduce una alerta de voz** diciendo:
   > "Atención. Paciente [NOMBRE], cama [NÚMERO], [HABITACIÓN], pasar a quirófano. Repito. Paciente [NOMBRE], cama [NÚMERO], pasar a quirófano."

2. **📺 Muestra una alerta visual** prominente en pantalla con:
   - Nombre del paciente
   - Número de admisión
   - Habitación y cama
   - Hora de la alerta

3. **🔔 Envía una notificación del navegador** (si está permitido)

## 🚀 Cómo Usar

### En la Pantalla de Hospitalización

1. **Acceder a la vista**: Navega a `/hospitalization/display`

2. **El sistema está activo automáticamente** - No requiere configuración adicional

3. **Control de audio**:
   - Botón con icono de 🔊 en el header
   - Click para activar/desactivar audio
   - Verde = activo, Gris = desactivado
   - Cuando está hablando, el botón pulsa

4. **Cerrar alerta**: Click en la X de la alerta visual

## 🎤 Características de la Alerta de Voz

- **Idioma**: Español (es-ES)
- **Velocidad**: Normal (configurable)
- **Volumen**: Máximo (configurable)
- **Repetición**: El mensaje se menciona 2 veces
- **Tecnología**: Web Speech API (sin archivos de audio)

## 🔧 Configuración Backend

El backend debe emitir el evento con esta estructura:

```php
// En tu controlador o servicio de Laravel
broadcast(new PatientCalledToSurgery([
    'admission_number' => '12345',
    'patient' => [
        'id' => 10,
        'name' => 'María López García',
        'date_of_birth' => '1980-05-15',
        'sex' => 'F'
    ],
    'hospital_attention' => [
        'id' => 1,
        'number' => '12345',
        'bed' => [
            'id' => 5,
            'name' => 'Cama 101',
            'room' => [
                'id' => 2,
                'name' => 'Habitación 101',
                'floor' => 1
            ]
        ],
        'doctor' => 'Dr. Juan Pérez'
    ],
    'timestamp' => now()->toISOString()
]));
```

### Configuración del Evento en Laravel

```php
// app/Events/PatientCalledToSurgery.php
namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PatientCalledToSurgery implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    public function broadcastOn()
    {
        return [
            new Channel('surgery-calls'),
            new Channel('hospitalizations'),
            new Channel('hospital-dashboard')
        ];
    }

    public function broadcastAs()
    {
        return 'patient.called.qx';
    }

    public function broadcastWith()
    {
        return $this->data;
    }
}
```

## 🧪 Probar el Sistema

### Opción 1: Desde la consola del navegador

```javascript
// Simular un evento de prueba
window.Echo.channel('surgery-calls').trigger('.patient.called.qx', {
    admission_number: '12345',
    patient: { name: 'Juan Pérez Prueba' },
    hospital_attention: {
        bed: {
            name: 'Cama 101',
            room: { name: 'Habitación 1' }
        }
    },
    timestamp: new Date().toISOString()
});
```

### Opción 2: Usar la función de prueba integrada

```javascript
// En la consola del navegador, si tienes acceso al composable
testAlert(); // Reproduce una alerta de prueba
```

### Opción 3: Desde Laravel Tinker

```php
php artisan tinker

// Emitir evento de prueba
event(new \App\Events\PatientCalledToSurgery([
    'admission_number' => '12345',
    'patient' => ['name' => 'Paciente de Prueba'],
    'hospital_attention' => [
        'bed' => [
            'name' => 'Cama 101',
            'room' => ['name' => 'Habitación 1']
        ]
    ],
    'timestamp' => now()->toISOString()
]));
```

## 📋 Archivos Creados/Modificados

### ✅ Archivos Nuevos
1. `src/composables/useSurgeryCallAlerts.js` - Composable con toda la lógica
2. `docs/SURGERY_CALL_ALERTS.md` - Documentación completa
3. `SURGERY_ALERTS_QUICK_START.md` - Esta guía rápida

### ✅ Archivos Modificados
1. `src/views/hospitalization/HospitalizationDisplay.vue` - Integración completa con UI y estilos

## 🔍 Verificar que Funciona

1. **Pusher conectado**:
   ```javascript
   // En consola del navegador
   console.log(window.Echo.connector.pusher.connection.state);
   // Debe mostrar: "connected"
   ```

2. **Canal suscrito**:
   ```javascript
   console.log(Object.keys(window.Echo.connector.pusher.channels.channels));
   // Debe incluir: "surgery-calls"
   ```

3. **Permisos de notificación**:
   ```javascript
   console.log(Notification.permission);
   // Debe mostrar: "granted" o "default"
   ```

4. **Web Speech API disponible**:
   ```javascript
   console.log('speechSynthesis' in window);
   // Debe mostrar: true
   ```

## ⚙️ Personalización

Si necesitas ajustar el comportamiento, edita las opciones en `HospitalizationDisplay.vue`:

```javascript
const { ... } = useSurgeryCallAlerts({
    autoStart: true,              // false para iniciar manualmente
    enableNotifications: true,    // false para deshabilitar notificaciones
    volume: 1.0,                  // 0.0 - 1.0
    rate: 1.0,                    // 0.1 - 10 (velocidad)
    pitch: 1.0,                   // 0 - 2 (tono)
    lang: 'es-ES',                // Código de idioma
    repeatCount: 2                // Número de repeticiones
});
```

## 🐛 Solución de Problemas

### No se escucha el audio
- ✅ Verificar que el botón de audio esté en verde (activado)
- ✅ Verificar volumen del navegador/sistema
- ✅ Intentar hacer click en la página primero (algunos navegadores requieren interacción del usuario)

### No aparecen notificaciones
- ✅ Hacer click en "Permitir" cuando el navegador solicite permisos
- ✅ Verificar configuración de notificaciones del navegador
- ✅ Verificar que el sistema operativo no tenga bloqueadas las notificaciones

### No llegan eventos
- ✅ Verificar que Pusher esté conectado
- ✅ Revisar credenciales en `.env`
- ✅ Comprobar que el backend esté emitiendo correctamente
- ✅ Verificar logs del servidor Laravel

## 📱 Compatibilidad

- ✅ Chrome/Edge (Chromium) - Totalmente compatible
- ✅ Firefox - Compatible
- ✅ Safari - Compatible
- ✅ Opera - Compatible
- ⚠️ Internet Explorer - No soportado

## 📚 Documentación Completa

Para información detallada, consultar: `docs/SURGERY_CALL_ALERTS.md`

## 👨‍💻 Desarrollo

Los archivos principales son:
- **Composable**: `src/composables/useSurgeryCallAlerts.js`
- **Vista**: `src/views/hospitalization/HospitalizationDisplay.vue`
- **Configuración Pusher**: `src/websocket/echo.js`

---

**¡El sistema está listo para usar!** 🎉
