import { format, getDay, getDaysInMonth, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function usePdfScheduleExport() {
    /**
     * Calculate statistics for a specific doctor
     */
    const calculateDoctorStats = (schedules, doctorId) => {
        const doctorSchedules = schedules.filter((s) => s.id_doctors === doctorId);

        let turnosReten = 0;
        let turnosPermanencia = 0;

        doctorSchedules.forEach((schedule) => {
            const isNightShift = schedule.medical_shift?.code === 'N' || schedule.medical_shift?.description?.toLowerCase().includes('noche');
            const isPayroll = schedule.is_payment_payroll;

            // Count turnos permanencia (payroll shifts)
            // Night shifts in permanencia also count as 2
            if (isPayroll) {
                if (isNightShift) {
                    turnosPermanencia += 2;
                } else {
                    turnosPermanencia += 1;
                }
            }

            // Count turnos retén (non-payroll shifts)
            // Night shifts count as 2
            if (!isPayroll) {
                if (isNightShift) {
                    turnosReten += 2;
                } else {
                    turnosReten += 1;
                }
            }
        });

        // Total is the sum of permanencia + reten (both with night shift multiplier)
        const totalTurnos = turnosPermanencia + turnosReten;

        return {
            totalTurnos,
            turnosPermanencia,
            turnosReten
        };
    };

    /**
     * Calculate free days (days without assigned doctors) by shift type
     */
    const calculateFreeDays = (schedules, month, year, medicalShifts) => {
        const daysInMonth = getDaysInMonth(new Date(year, month - 1));
        const freeDays = {
            M: 0, // Mañana
            T: 0, // Tarde
            N: 0 // Noche
        };

        // Get shift codes
        const shiftCodes = ['M', 'T', 'N'];

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            shiftCodes.forEach((shiftCode) => {
                // Find if there's a schedule for this date and shift
                const hasSchedule = schedules.some((schedule) => {
                    const scheduleShiftCode = schedule.medical_shift?.code;
                    return schedule.date === dateStr && scheduleShiftCode === shiftCode;
                });

                if (!hasSchedule) {
                    freeDays[shiftCode]++;
                }
            });
        }

        return freeDays;
    };

    /**
     * Get shift abbreviation from shift data
     */
    const getShiftAbbreviation = (shift) => {
        if (!shift) return 'P'; // Personalizado
        const code = shift.code;
        if (code === 'M' || code === 'T' || code === 'N') return code;

        const desc = shift.description?.toLowerCase() || '';
        if (desc.includes('mañana') || desc.includes('morning')) return 'M';
        if (desc.includes('tarde') || desc.includes('afternoon')) return 'T';
        if (desc.includes('noche') || desc.includes('night')) return 'N';
        return 'P';
    };

    /**
     * Generate PDF with schedule data
     */
    const generatePDF = (schedules, specialty, month, year, medicalShifts) => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

        // Set font
        doc.setFont('helvetica');

        // Title
        const specialtyName = specialty?.name || 'TODAS LAS ESPECIALIDADES';
        const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: es }).toUpperCase();

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`HORARIO DE ${specialtyName}`, 148, 15, { align: 'center' });

        doc.setFontSize(12);
        doc.text(monthName, 148, 22, { align: 'center' });

        // Calendar grid
        const daysInMonth = getDaysInMonth(new Date(year, month - 1));
        const firstDay = startOfMonth(new Date(year, month - 1));
        const startDayOfWeek = getDay(firstDay);

        // Calendar headers
        const dayHeaders = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

        let yPos = 30;
        const cellWidth = 40;
        const cellHeight = 25;
        const startX = 10;

        // Draw day headers
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        dayHeaders.forEach((day, index) => {
            const x = startX + index * cellWidth;
            doc.setFillColor(200, 200, 200);
            doc.rect(x, yPos, cellWidth, 8, 'F');
            doc.text(day, x + cellWidth / 2, yPos + 6, { align: 'center' });
        });

        yPos += 8;

        // Draw calendar days
        let currentDay = 1;
        const maxRows = 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        for (let row = 0; row < maxRows && currentDay <= daysInMonth; row++) {
            for (let col = 0; col < 7; col++) {
                const x = startX + col * cellWidth;
                const y = yPos + row * cellHeight;

                // Draw cell border
                doc.rect(x, y, cellWidth, cellHeight);

                // Skip cells before the first day of month
                if (row === 0 && col < startDayOfWeek) {
                    continue;
                }

                if (currentDay > daysInMonth) {
                    break;
                }

                // Draw day number
                doc.setFont('helvetica', 'bold');
                doc.text(String(currentDay), x + 2, y + 4);

                // Get schedules for this day
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
                const daySchedules = schedules.filter((s) => s.date === dateStr);

                // Group by shift type
                const shiftGroups = {
                    M: [],
                    T: [],
                    N: []
                };

                daySchedules.forEach((schedule) => {
                    const shiftCode = getShiftAbbreviation(schedule.medical_shift);
                    if (shiftGroups[shiftCode]) {
                        shiftGroups[shiftCode].push(schedule);
                    }
                });

                // Draw schedules
                doc.setFont('helvetica', 'normal');
                let textY = y + 8;
                const lineHeight = 3.5;

                ['M', 'T', 'N'].forEach((shiftCode) => {
                    if (shiftGroups[shiftCode].length > 0) {
                        shiftGroups[shiftCode].forEach((schedule) => {
                            if (textY < y + cellHeight - 2) {
                                const doctorName = schedule.doctor?.name || 'Sin nombre';
                                const isReten = schedule.is_payment_payroll === false;

                                // Truncate long names
                                const shortName = doctorName.length > 18 ? doctorName.substring(0, 15) + '...' : doctorName;

                                doc.setFontSize(7);
                                const textX = x + 2;
                                doc.text(`${shiftCode}: ${shortName}`, textX, textY);

                                // Draw retén indicator if applicable
                                if (isReten) {
                                    const textWidth = doc.getTextWidth(`${shiftCode}: ${shortName}`);
                                    const circleX = textX + textWidth + 2;
                                    const circleY = textY - 1.5;
                                    const circleRadius = 1.5;

                                    // Draw red circle
                                    doc.setFillColor(220, 38, 38); // #dc2626
                                    doc.circle(circleX, circleY, circleRadius, 'F');

                                    // Draw white "R"
                                    doc.setTextColor(255, 255, 255);
                                    doc.setFontSize(5);
                                    doc.setFont('helvetica', 'bold');
                                    doc.text('R', circleX - 0.7, circleY + 1);

                                    // Reset text color
                                    doc.setTextColor(0, 0, 0);
                                    doc.setFont('helvetica', 'normal');
                                    doc.setFontSize(7);
                                }

                                textY += lineHeight;
                            }
                        });
                    }
                });

                currentDay++;
            }
        }

        // Summary statistics table
        yPos = yPos + maxRows * cellHeight + 10;

        // Filter schedules to only include those in the selected month
        const filteredSchedules = schedules.filter((s) => {
            const [sYear, sMonth] = s.date.split('-').map(Number);
            return sYear === year && sMonth === month;
        });

        // Get unique doctors from the filtered list (only those with shifts in this month)
        const uniqueDoctors = [...new Set(filteredSchedules.map((s) => s.id_doctors))];
        const doctorStats = [];

        uniqueDoctors.forEach((doctorId) => {
            const doctor = schedules.find((s) => s.id_doctors === doctorId)?.doctor;
            if (doctor) {
                const stats = calculateDoctorStats(filteredSchedules, doctorId);
                doctorStats.push({
                    nombre: doctor.name,
                    ...stats
                });
            }
        });

        // Sort by name
        doctorStats.sort((a, b) => a.nombre.localeCompare(b.nombre));

        // Create summary table
        const tableData = doctorStats.map((stat) => [stat.nombre, stat.totalTurnos, stat.turnosPermanencia, stat.turnosReten]);

        autoTable(doc, {
            startY: yPos,
            head: [['MÉDICO', 'TOTAL', 'PERMANENCIA', 'RETÉN']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [100, 100, 100],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 8
            },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'center', cellWidth: 40 },
                3: { halign: 'center', cellWidth: 30 }
            }
        });

        // Free days summary
        const freeDays = calculateFreeDays(schedules, month, year, medicalShifts);
        const freeDaysY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('DÍAS LIBRES POR TURNO:', 10, freeDaysY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Mañana (M): ${freeDays.M} días`, 10, freeDaysY + 6);
        doc.text(`Tarde (T): ${freeDays.T} días`, 60, freeDaysY + 6);
        doc.text(`Noche (N): ${freeDays.N} días`, 110, freeDaysY + 6);

        // Save PDF
        const fileName = `horarios_${specialtyName.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);

        return fileName;
    };

    return {
        generatePDF,
        calculateDoctorStats,
        calculateFreeDays
    };
}
