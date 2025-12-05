import * as XLSX from 'xlsx';

/**
 * Servicio para parsear archivos Excel de servicios médicos
 * Responsabilidad: Lectura, validación y transformación de datos Excel
 */
class ExcelParserService {
    /**
     * Lee archivo Excel y retorna datos como array de objetos
     * @param {File} file - Archivo Excel
     * @returns {Promise<Array>} Datos del Excel
     */
    async parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error(`Error al parsear Excel: ${error.message}`));
                }
            };

            reader.onerror = () => reject(new Error('Error al leer archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Valida estructura del Excel
     * @param {Array} data - Datos del Excel
     * @returns {Object} { valid: boolean, errors: Array }
     */
    validateStructure(data) {
        const errors = [];
        const requiredColumns = ['cod_seri', 'fecha', 'hora', 'importe'];

        if (!data || data.length === 0) {
            errors.push('El archivo está vacío');
            return { valid: false, errors };
        }

        const firstRow = data[0];
        requiredColumns.forEach(col => {
            if (!(col in firstRow)) {
                errors.push(`Falta columna requerida: ${col}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Mapea fila de Excel a modelo de servicio
     * @param {Object} row - Fila del Excel
     * @returns {Object} Servicio estructurado
     */
    mapToServiceModel(row) {
        return {
            doctorCode: row.cod_seri?.toString().trim(),
            date: this.parseExcelDate(row.fecha),
            time: this.parseExcelTime(row.hora),
            serviceName: row.servicio || row.descripcion || 'Servicio médico',
            amount: parseFloat(row.importe) || 0,
            patientName: row.paciente || '',
            specialty: row.segus || '',  // Campo de especialidad
            rawData: row
        };
    }

    /**
     * Valida si un registro debe ser excluido
     * @param {Object} row - Fila del Excel
     * @returns {boolean} true si debe ser excluido, false si es válido
     */
    shouldExcludeRecord(row) {
        const comprobante = row.comprobante?.toString().trim() || '';
        const cia = row.cia?.toString().trim().toUpperCase() || '';
        const codSeg = row.cod_seg?.toString().trim() || '';
        const importe = parseFloat(row.importe) || 0;
        
        // Regla 1: Excluir si comprobante es "-------------" o vacío Y cia es "PARTICULAR"
        const isInvalidComprobante = comprobante === '' || comprobante === '-------------';
        const isParticular = cia === 'PARTICULAR';
        const rule1 = isInvalidComprobante && isParticular;
        
        // Regla 2: Excluir si cod_seg es "00.19.27" Y monto es 0.04 o 0.05
        const isSpecificCodSeg = codSeg === '00.19.27';
        const isSpecificAmount = importe === 0.04 || importe === 0.05;
        const rule2 = isSpecificCodSeg && isSpecificAmount;
        
        return rule1 || rule2;
    }

    /**
     * Parsea fecha de Excel a formato YYYY-MM-DD
     * @param {any} excelDate - Fecha del Excel
     * @returns {string} Fecha formateada
     */
    parseExcelDate(excelDate) {
        if (!excelDate) return null;
        
        // Si ya es string, verificar formato
        if (typeof excelDate === 'string') {
            // Si está en formato DD/MM/YYYY, convertir a YYYY-MM-DD
            if (excelDate.includes('/')) {
                const parts = excelDate.split('/');
                if (parts.length === 3) {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2];
                    return `${year}-${month}-${day}`;
                }
            }
            return excelDate;
        }
        
        // Si es número serial de Excel
        if (typeof excelDate === 'number') {
            // Excel almacena fechas como días desde 1900-01-01
            // Convertir a fecha JavaScript sin problemas de zona horaria
            const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
            const date = new Date(excelEpoch.getTime() + excelDate * 86400000); // 86400000 ms = 1 día
            
            // Usar UTC para evitar problemas de zona horaria
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        }
        
        return null;
    }

    /**
     * Parsea hora de Excel a formato HH:MM:SS
     * @param {any} excelTime - Hora del Excel
     * @returns {string} Hora formateada
     */
    parseExcelTime(excelTime) {
        if (!excelTime) return null;

        // Si ya es string en formato correcto
        if (typeof excelTime === 'string') {
            return excelTime;
        }

        // Si es número decimal (fracción del día)
        if (typeof excelTime === 'number') {
            const totalSeconds = Math.round(excelTime * 24 * 60 * 60);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        return null;
    }

    /**
     * Agrupa servicios por código de médico
     * @param {Array} services - Lista de servicios
     * @returns {Map} Mapa código -> servicios[]
     */
    groupByDoctor(services) {
        const grouped = new Map();
        services.forEach(service => {
            if (!service.doctorCode) return;
            if (!grouped.has(service.doctorCode)) {
                grouped.set(service.doctorCode, []);
            }
            grouped.get(service.doctorCode).push(service);
        });
        return grouped;
    }
}

export default new ExcelParserService();
