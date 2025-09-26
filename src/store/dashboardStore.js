import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { hospitalAttentions } from '@/api/hospitalAttentions';
import { users } from '@/api/users';
import { patients } from '@/api/patients';
import { tasks } from '@/api/tasks';
import { TicketService } from '@/api/tickets';
import { hospitalization } from '@/api/hospitalization';

export const useDashboardStore = defineStore('dashboard', () => {
    // State
    const hospitalStats = ref({});
    const userStats = ref({});
    const patientStats = ref({});
    const taskStats = ref({});
    const detailsStats = ref({});
    const recentTickets = ref([]);
    const hospitalizationStatus = ref({});
    const isLoading = ref(false);
    const error = ref(null);

    // Getters
    const allStats = computed(() => ({
        hospital: hospitalStats.value,
        users: userStats.value,
        patients: patientStats.value,
        tasks: taskStats.value,
        details: detailsStats.value
    }));

    const hospitalData = computed(() => hospitalStats.value);
    const userData = computed(() => userStats.value);
    const patientData = computed(() => patientStats.value);
    const taskData = computed(() => taskStats.value);
    const detailsData = computed(() => detailsStats.value);
    const ticketsData = computed(() => recentTickets.value);
    const hospitalizationData = computed(() => hospitalizationStatus.value);

    // Actions
    async function fetchAllStats() {
        isLoading.value = true;
        error.value = null;
        
        try {
            const [
                hospitalResponse,
                userResponse,
                patientResponse,
                taskResponse,
                detailsResponse,
                ticketsResponse,
                hospitalizationResponse
            ] = await Promise.all([
                hospitalAttentions.getStats(),
                users.getStats(),
                patients.getStats(),
                hospitalAttentions.getTaskStats(),
                hospitalAttentions.getDetailsStats(),
                TicketService.getTickets({ per_page: 5, status: 'ABIERTO' }),
                hospitalization.getStatus()
            ]);

            hospitalStats.value = hospitalResponse.data || {};
            userStats.value = userResponse.data || {};
            patientStats.value = patientResponse.data || {};
            taskStats.value = taskResponse.data || {};
            detailsStats.value = detailsResponse.data || {};
            recentTickets.value = ticketsResponse.data?.data || [];
            hospitalizationStatus.value = hospitalizationResponse.data || {};
        } catch (err) {
            error.value = err;
            console.error('Error fetching dashboard stats:', err.message || err);
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchHospitalStats() {
        try {
            const response = await hospitalAttentions.getStats();
            hospitalStats.value = response.data || {};
        } catch (err) {
            console.error('Error fetching hospital stats:', err);
        }
    }

    async function fetchUserStats() {
        try {
            const response = await users.getStats();
            userStats.value = response.data || {};
        } catch (err) {
            console.error('Error fetching user stats:', err);
        }
    }

    async function fetchPatientStats() {
        try {
            const response = await patients.getStats();
            patientStats.value = response.data || {};
        } catch (err) {
            console.error('Error fetching patient stats:', err);
        }
    }

    async function fetchTaskStats() {
        try {
            const response = await hospitalAttentions.getTaskStats();
            taskStats.value = response.data || {};
        } catch (err) {
            console.error('Error fetching task stats:', err);
        }
    }

    async function fetchRecentTickets() {
        try {
            const response = await TicketService.getTickets({ per_page: 5, status: 'ABIERTO' });
            recentTickets.value = response.data?.data || [];
        } catch (err) {
            console.error('Error fetching recent tickets:', err);
        }
    }

    async function fetchHospitalizationStatus() {
        try {
            const response = await hospitalization.getStatus();
            hospitalizationStatus.value = response.data || {};
        } catch (err) {
            console.error('Error fetching hospitalization status:', err);
        }
    }

    // Real-time event handlers for dashboard updates
    function handleDashboardHospitalizationEvent(eventData) {
        console.log('Dashboard: Handling hospitalization event:', eventData);
        
        // Update relevant statistics based on the event
        switch (eventData.action) {
            case 'created':
            case 'updated':
            case 'deleted':
                // Refresh hospital stats when hospitalization changes
                fetchHospitalStats();
                fetchHospitalizationStatus();
                break;
        }
    }

    function handleDashboardTaskEvent(eventData) {
        console.log('Dashboard: Handling task event:', eventData);
        
        // Refresh task statistics
        fetchTaskStats();
    }

    function handleDashboardPatientEvent(eventData) {
        console.log('Dashboard: Handling patient event:', eventData);
        
        // Refresh patient statistics
        fetchPatientStats();
    }

    return {
        // State
        hospitalStats,
        userStats,
        patientStats,
        taskStats,
        detailsStats,
        recentTickets,
        hospitalizationStatus,
        isLoading,
        error,
        
        // Getters
        allStats,
        hospitalData,
        userData,
        patientData,
        taskData,
        detailsData,
        ticketsData,
        hospitalizationData,
        
        // Actions
        fetchAllStats,
        fetchHospitalStats,
        fetchUserStats,
        fetchPatientStats,
        fetchTaskStats,
        fetchRecentTickets,
        fetchHospitalizationStatus,
        
        // Real-time event handlers
        handleDashboardHospitalizationEvent,
        handleDashboardTaskEvent,
        handleDashboardPatientEvent
    };
});