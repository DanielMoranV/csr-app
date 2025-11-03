import * as XLSX from 'xlsx';

export function useExcelExport() {
    /**
     * Exporta datos a un archivo Excel (.xlsx).
     *
     * @param {Array<Object>} data - El array de objetos a exportar.
     * @param {Array<{field: String, header: String, type?: String}>} columns - Definición de las columnas.
     * @param {String} fileName - Nombre del archivo (sin extensión).
     */
    const exportToExcel = (data, columns, fileName) => {
        // 1. Mapear los datos a un formato simple con solo los campos requeridos y con los headers correctos
        const mappedData = data.map((item) => {
            const row = {};
            columns.forEach((column) => {
                // Acceder a datos anidados (ej: 'patient.name')
                let value = column.field.split('.').reduce((o, i) => (o ? o[i] : undefined), item);

                // Si la columna es de tipo 'date' y el valor es una cadena de texto válida, conviértela a un objeto Date.
                if (column.type === 'date' && value && typeof value === 'string') {
                    const date = new Date(value);
                    if (!isNaN(date)) {
                        value = date;
                    }
                }

                row[column.header] = value;
            });
            return row;
        });

        // 2. Crear una hoja de cálculo a partir de los datos mapeados
        const worksheet = XLSX.utils.json_to_sheet(mappedData, { cellDates: true });

        // 3. (Opcional) Aplicar estilos o formatos básicos según el tipo de columna
        // Esta parte puede ser extendida para manejar más tipos y estilos
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            // Iniciar en 1 para saltar la cabecera
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                const cell = worksheet[cell_ref];
                const columnDef = columns[C];

                if (cell && cell.v !== undefined && columnDef) {
                    if (columnDef.type === 'date' && cell.t === 'd') {
                        cell.z = 'dd/mm/yyyy hh:mm'; // Formato de fecha y hora
                    } else if (columnDef.type === 'boolean') {
                        cell.t = 'b'; // 'b' for boolean type
                    }
                    // Se pueden añadir más tipos como 'currency', etc.
                }
            }
        }

        // 4. Crear un nuevo libro de trabajo y añadir la hoja
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

        // 5. Generar el archivo y descargarlo
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    };

    return {
        exportToExcel
    };
}
