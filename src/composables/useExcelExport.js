import * as XLSX from 'xlsx';

export function useExcelExport() {
    /**
     * Exporta datos a un archivo Excel (.xlsx) con formato mejorado.
     *
     * @param {Array<Object>} data - El array de objetos a exportar.
     * @param {Array<{field: String, header: String, type?: String, width?: Number}>} columns - Definición de las columnas.
     * @param {String} fileName - Nombre del archivo (sin extensión).
     * @param {Object} options - Opciones adicionales de exportación.
     * @param {String} options.sheetName - Nombre de la hoja (por defecto: 'Datos').
     * @param {Boolean} options.autoFilter - Agregar filtros automáticos (por defecto: true).
     * @param {Boolean} options.freezeHeader - Congelar la fila de encabezado (por defecto: true).
     */
    const exportToExcel = (data, columns, fileName, options = {}) => {
        const { sheetName = 'Datos', autoFilter = true, freezeHeader = true } = options;

        if (!data || data.length === 0) {
            return;
        }

        // 1. Mapear los datos a un formato simple con solo los campos requeridos y con los headers correctos
        const mappedData = data.map((item) => {
            const row = {};
            columns.forEach((column) => {
                // Acceder a datos anidados (ej: 'patient.name')
                let value = column.field.split('.').reduce((o, i) => (o ? o[i] : undefined), item);

                // Manejar valores undefined o null
                if (value === undefined || value === null) {
                    value = '';
                }

                // Si la columna es de tipo 'date' y el valor es una cadena de texto válida, conviértela a un objeto Date.
                if (column.type === 'date' && value && typeof value === 'string') {
                    const date = new Date(value);
                    if (!isNaN(date)) {
                        value = date;
                    }
                }

                // Si la columna es de tipo 'boolean', convertir a Sí/No
                if (column.type === 'boolean') {
                    value = value ? 'Sí' : 'No';
                }

                row[column.header] = value;
            });
            return row;
        });

        // 2. Crear una hoja de cálculo a partir de los datos mapeados
        const worksheet = XLSX.utils.json_to_sheet(mappedData, { cellDates: true });

        // 3. Aplicar formatos según el tipo de columna
        const range = XLSX.utils.decode_range(worksheet['!ref']);

        // Aplicar estilos a los encabezados (fila 0)
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: 0 };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            const cell = worksheet[cell_ref];

            if (cell) {
                // Estilo para encabezados: negrita y centrado
                cell.s = {
                    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
                    fill: { fgColor: { rgb: '4472C4' } },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: {
                        top: { style: 'thin', color: { rgb: '000000' } },
                        bottom: { style: 'thin', color: { rgb: '000000' } },
                        left: { style: 'thin', color: { rgb: '000000' } },
                        right: { style: 'thin', color: { rgb: '000000' } }
                    }
                };
            }
        }

        // Aplicar formatos a las celdas de datos (filas 1 en adelante)
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                const cell = worksheet[cell_ref];
                const columnDef = columns[C];

                if (cell && columnDef) {
                    // Aplicar formato de fecha
                    if (columnDef.type === 'date' && cell.t === 'd') {
                        cell.z = 'dd/mm/yyyy hh:mm';
                    }
                    // Aplicar formato de número
                    else if (columnDef.type === 'number') {
                        cell.t = 'n';
                        cell.z = '#,##0';
                    }
                    // Aplicar formato de moneda
                    else if (columnDef.type === 'currency') {
                        cell.t = 'n';
                        cell.z = '$#,##0.00';
                    }
                }
            }
        }

        // 4. Configurar ancho de columnas (auto-ajuste)
        const columnWidths = columns.map((col) => {
            // Si se especifica un ancho, usarlo
            if (col.width) {
                return { wch: col.width };
            }

            // Calcular el ancho basado en el contenido
            const headerLength = col.header.length;
            const maxDataLength = data.reduce((max, item) => {
                let value = col.field.split('.').reduce((o, i) => (o ? o[i] : ''), item);
                if (value === undefined || value === null) value = '';
                const length = String(value).length;
                return Math.max(max, length);
            }, 0);

            // El ancho es el máximo entre el header y los datos, con un mínimo de 10 y máximo de 50
            return { wch: Math.min(Math.max(headerLength, maxDataLength, 10), 50) };
        });

        worksheet['!cols'] = columnWidths;

        // 5. Configurar filtros automáticos
        if (autoFilter) {
            worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
        }

        // 6. Congelar la fila de encabezado
        if (freezeHeader) {
            worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
        }

        // 7. Crear un nuevo libro de trabajo y añadir la hoja
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 8. Generar el archivo y descargarlo
        XLSX.writeFile(workbook, `${fileName}.xlsx`, { cellStyles: true });
    };

    return {
        exportToExcel
    };
}
