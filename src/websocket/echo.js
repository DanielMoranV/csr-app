import { useAuthStore } from '@/store/authStore';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const api_url = import.meta.env.VITE_API_URL;

window.Pusher = Pusher;
Pusher.logToConsole = true;

const broadcaster = import.meta.env.VITE_BROADCAST_DRIVER;

let echoConfig;

const getAuthHeaders = () => {
    try {
        const authStore = useAuthStore();
        const token = authStore.getToken;
        
        if (!token) {
            console.warn('[Echo] No token available for authentication');
            return {};
        }
        
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        return headers;
    } catch (error) {
        console.error('[Echo] Error getting auth headers:', error);
        return {};
    }
};

if (broadcaster === 'reverb') {
    echoConfig = {
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        cluster: import.meta.env.VITE_REVERB_CLUSTER || 'mt1',
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: import.meta.env.VITE_REVERB_PORT,
        wssPort: import.meta.env.VITE_REVERB_PORT,
        forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
        disableStats: true,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: `${api_url}/broadcasting/auth`,
        auth: {
            headers: getAuthHeaders
        }
    };
} else if (broadcaster === 'pusher') {
    echoConfig = {
        broadcaster: 'pusher',
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
        authEndpoint: `${api_url}/broadcasting/auth`,
        forceTLS: true,
        authorizer: (channel, options) => {
            return {
                authorize: (socketId, callback) => {
                    const headers = getAuthHeaders();
                    
                    // Use fetch instead of XMLHttpRequest for better control
                    fetch(`${api_url}/broadcasting/auth`, {
                        method: 'POST',
                        headers: {
                            ...headers,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: `socket_id=${socketId}&channel_name=${channel.name}`
                    })
                    .then(response => {
                        if (response.ok) {
                            return response.json();
                        }
                        throw new Error(`HTTP ${response.status}`);
                    })
                    .then(data => {
                        callback(null, data);
                    })
                    .catch(error => {
                        console.error('[Echo] Authorization failed:', error);
                        callback(error, null);
                    });
                }
            };
        }
    };
}

const useEcho = new Echo(echoConfig);

// useEcho.connector.pusher.connection.bind('connected', () => {
//     const socketId = useEcho.connector.pusher.connection.socket_id;
//     setSocketId(socketId);
// });

export default useEcho;
