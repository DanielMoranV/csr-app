<script setup>
import Card from 'primevue/card';

const props = defineProps({
    totals: {
        type: Object,
        required: true,
        validator: (value) => {
            return 'totalGenerated' in value && 'totalPlanilla' in value && 'totalReten' in value && 'doctorCount' in value && 'serviceCount' in value && 'planillaCount' in value && 'retenCount' in value;
        }
    }
});
</script>

<template>
    <div class="summary-cards">
        <Card class="summary-card">
            <template #content>
                <div class="summary-content">
                    <i class="pi pi-dollar summary-icon"></i>
                    <div>
                        <div class="summary-label">Total Generado</div>
                        <div class="summary-value">S/ {{ totals.totalGenerated.toFixed(2) }}</div>
                    </div>
                </div>
            </template>
        </Card>

        <Card class="summary-card">
            <template #content>
                <div class="summary-content">
                    <i class="pi pi-check-circle summary-icon success"></i>
                    <div>
                        <div class="summary-label">Planilla</div>
                        <div class="summary-value">S/ {{ totals.totalPlanilla.toFixed(2) }}</div>
                        <div class="summary-count">{{ totals.planillaCount }} servicios</div>
                    </div>
                </div>
            </template>
        </Card>

        <Card class="summary-card">
            <template #content>
                <div class="summary-content">
                    <i class="pi pi-exclamation-triangle summary-icon warning"></i>
                    <div>
                        <div class="summary-label">Retén</div>
                        <div class="summary-value">S/ {{ totals.totalReten.toFixed(2) }}</div>
                        <div class="summary-count">{{ totals.retenCount }} servicios</div>
                    </div>
                </div>
            </template>
        </Card>

        <Card class="summary-card">
            <template #content>
                <div class="summary-content">
                    <i class="pi pi-users summary-icon"></i>
                    <div>
                        <div class="summary-label">Médicos</div>
                        <div class="summary-value">{{ totals.doctorCount }}</div>
                        <div class="summary-count">{{ totals.serviceCount }} servicios</div>
                    </div>
                </div>
            </template>
        </Card>
    </div>
</template>

<style scoped>
.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.summary-card {
    border-left: 4px solid #667eea;
    transition:
        transform 0.2s,
        box-shadow 0.2s;
}

.summary-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.summary-content {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.summary-icon {
    font-size: 2.5rem;
    color: #667eea;
}

.summary-icon.success {
    color: #48bb78;
}

.summary-icon.warning {
    color: #ed8936;
}

.summary-label {
    font-size: 0.875rem;
    color: #718096;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.summary-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #2d3748;
    margin-top: 0.25rem;
}

.summary-count {
    font-size: 0.75rem;
    color: #a0aec0;
    margin-top: 0.25rem;
}

@media (max-width: 768px) {
    .summary-cards {
        grid-template-columns: 1fr;
    }

    .summary-value {
        font-size: 1.5rem;
    }
}
</style>
