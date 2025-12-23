import html2canvas from 'html2canvas';
import { ref } from 'vue';

/**
 * Composable para captura profesional de screenshots
 * @returns {Object} Funciones y estado para captura de pantalla
 */
export function useScreenshot() {
    const isCapturing = ref(false);
    const error = ref(null);

    /**
     * Captura un elemento DOM como imagen y la descarga
     * @param {HTMLElement} element - Elemento a capturar
     * @param {string} filename - Nombre del archivo (sin extensión)
     * @param {Object} options - Opciones de configuración
     */
    const captureElement = async (element, filename = 'screenshot', options = {}) => {
        if (!element) {
            error.value = 'Elemento no encontrado';
            return null;
        }

        isCapturing.value = true;
        error.value = null;

        try {
            // Configuración por defecto para alta calidad
            const defaultOptions = {
                scale: 2, // Resolución 2x para mejor calidad
                useCORS: true, // Permitir imágenes de otros dominios
                allowTaint: true, // Permitir contenido de otros dominios
                backgroundColor: '#ffffff', // Fondo blanco
                logging: false, // Desactivar logs en consola
                imageTimeout: 0, // Sin timeout para imágenes
                // Ignorar elementos que puedan causar problemas
                ignoreElements: (element) => {
                    // Ignorar elementos con estilos problemáticos
                    const tagName = element.tagName?.toLowerCase();
                    // Puedes agregar más elementos a ignorar si es necesario
                    return tagName === 'script' || tagName === 'style';
                },
                // Manejar errores de CSS silenciosamente
                onclone: (clonedDoc) => {
                    // Limpiar estilos problemáticos del documento clonado
                    const allElements = clonedDoc.querySelectorAll('*');
                    allElements.forEach((el) => {
                        try {
                            const computedStyle = window.getComputedStyle(el);
                            // Verificar si hay problemas con color-mix u otras funciones modernas
                            const bgColor = computedStyle.backgroundColor;
                            const color = computedStyle.color;
                            const borderColor = computedStyle.borderColor;

                            // Si detectamos funciones CSS modernas, extraer valores RGB si es posible
                            if (bgColor?.includes('color-mix') || bgColor?.includes('oklch')) {
                                const rgb = bgColor.match(/rgba?\([\d\s,]+\)/);
                                el.style.backgroundColor = rgb ? rgb[0] : '#ffffff';
                            }
                            if (color?.includes('color-mix') || color?.includes('oklch')) {
                                const rgb = color.match(/rgba?\([\d\s,]+\)/);
                                el.style.color = rgb ? rgb[0] : '#000000';
                            }
                            if (borderColor?.includes('color-mix') || borderColor?.includes('oklch')) {
                                const rgb = borderColor.match(/rgba?\([\d\s,]+\)/);
                                el.style.borderColor = rgb ? rgb[0] : '#dee2e6';
                            }

                            // Preservar estilos de encabezados de tabla
                            if (el.tagName === 'TH') {
                                el.style.fontWeight = computedStyle.fontWeight;
                                el.style.fontSize = computedStyle.fontSize;
                                el.style.padding = computedStyle.padding;
                            }

                            // Preservar estilos de celdas
                            if (el.tagName === 'TD') {
                                el.style.padding = computedStyle.padding;
                                el.style.fontSize = computedStyle.fontSize;
                            }

                            // Preservar estilos de tags de PrimeVue
                            if (el.classList.contains('p-tag')) {
                                el.style.padding = computedStyle.padding;
                                el.style.borderRadius = computedStyle.borderRadius;
                                el.style.fontSize = computedStyle.fontSize;
                                el.style.fontWeight = computedStyle.fontWeight;
                                el.style.display = computedStyle.display;
                            }
                        } catch (e) {
                            // Ignorar errores de elementos individuales
                        }
                    });
                },
                ...options
            };

            // Capturar el elemento
            const canvas = await html2canvas(element, defaultOptions);

            // Convertir a blob
            return new Promise((resolve, reject) => {
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Error al crear imagen'));
                        }
                    },
                    'image/png',
                    1.0 // Calidad máxima
                );
            });
        } catch (err) {
            error.value = err.message;
            console.error('Error al capturar screenshot:', err);
            return null;
        } finally {
            isCapturing.value = false;
        }
    };

    /**
     * Captura y descarga automáticamente
     * @param {HTMLElement} element - Elemento a capturar
     * @param {string} filename - Nombre del archivo
     * @param {Object} options - Opciones adicionales
     */
    const captureAndDownload = async (element, filename = 'screenshot', options = {}) => {
        const blob = await captureElement(element, filename, options);

        if (blob) {
            // Crear URL temporal
            const url = URL.createObjectURL(blob);

            // Crear link de descarga
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.png`;
            document.body.appendChild(link);
            link.click();

            // Limpiar
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        }

        return false;
    };

    /**
     * Genera un nombre de archivo con timestamp
     * @param {string} prefix - Prefijo del nombre
     * @returns {string} Nombre de archivo con fecha y hora
     */
    const generateFilename = (prefix = 'captura') => {
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
        return `${prefix}_${date}_${time}`;
    };

    return {
        isCapturing,
        error,
        captureElement,
        captureAndDownload,
        generateFilename
    };
}
