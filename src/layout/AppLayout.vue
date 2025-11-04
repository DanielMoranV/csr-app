<script setup>
import { useLayout } from '@/layout/composables/layout';
import { computed, onMounted, ref, watch } from 'vue';
import AppFooter from './AppFooter.vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';

// Imports for real-time functionality
import { useAuthStore } from '@/store/authStore';
import { useTicketsStore } from '@/store/ticketsStore';
import { slugify } from '@/utils/pusher-helpers';
import useEcho from '@/websocket/echo';

const { layoutConfig, layoutState, isSidebarActive } = useLayout();
const authStore = useAuthStore();
const ticketsStore = useTicketsStore();

const outsideClickListener = ref(null);

watch(isSidebarActive, (newVal) => {
    if (newVal) {
        bindOutsideClickListener();
    } else {
        unbindOutsideClickListener();
    }
});

const containerClass = computed(() => {
    return {
        'layout-overlay': layoutConfig.menuMode === 'overlay',
        'layout-static': layoutConfig.menuMode === 'static',
        'layout-static-inactive': layoutState.staticMenuDesktopInactive && layoutConfig.menuMode === 'static',
        'layout-overlay-active': layoutState.overlayMenuActive,
        'layout-mobile-active': layoutState.staticMenuMobileActive
    };
});

function bindOutsideClickListener() {
    if (!outsideClickListener.value) {
        outsideClickListener.value = (event) => {
            if (isOutsideClicked(event)) {
                layoutState.overlayMenuActive = false;
                layoutState.staticMenuMobileActive = false;
                layoutState.menuHoverActive = false;
            }
        };
        document.addEventListener('click', outsideClickListener.value);
    }
}

function unbindOutsideClickListener() {
    if (outsideClickListener.value) {
        document.removeEventListener('click', outsideClickListener);
        outsideClickListener.value = null;
    }
}

function isOutsideClicked(event) {
    const sidebarEl = document.querySelector('.layout-sidebar');
    const topbarEl = document.querySelector('.layout-menu-button');

    return !(sidebarEl.isSameNode(event.target) || sidebarEl.contains(event.target) || topbarEl.isSameNode(event.target) || topbarEl.contains(event.target));
}

// --- REAL-TIME WEBSOCKET LISTENERS ---
onMounted(() => {
    // Watch for login status changes to setup or teardown websocket listeners
    watch(
        () => authStore.isLoggedIn,
        (isLoggedIn, wasLoggedIn) => {
            if (isLoggedIn && authStore.authUser) {
                const userId = authStore.authUser.id;
                const userPosition = authStore.authUser.position?.name;

                // Disconnect from any existing channels to prevent duplicates on hot-reload
                useEcho.leave(`App.Models.User.${userId}`);
                if (userPosition) {
                    const positionSlug = slugify(userPosition);
                    useEcho.leave(`tickets.position.${positionSlug}`);
                }

                // Listen for events on the private user channel
                useEcho
                    .private(`App.Models.User.${userId}`)
                    .listen('.ticket.created', (e) => {
                        console.log('Event received: ticket.created for me', e.ticket);
                        ticketsStore.handleTicketCreated(e.ticket);
                    })
                    .listen('.ticket.updated', (e) => {
                        console.log('Event received: ticket.updated for me', e.ticket);
                        ticketsStore.handleTicketUpdated(e.ticket);
                    });

                // Listen for events on the position-based presence channel
                if (userPosition) {
                    const positionSlug = slugify(userPosition);
                    useEcho
                        .join(`tickets.position.${positionSlug}`)
                        .here((users) => {
                            console.log('Connected to position channel. Users here:', users);
                        })
                        .joining((user) => {
                            console.log(user.name, 'joined position channel.');
                        })
                        .leaving((user) => {
                            console.log(user.name, 'left position channel.');
                        })
                        .listen('.ticket.created', (e) => {
                            console.log('Event received: ticket.created for my position', e.ticket);
                            ticketsStore.handleTicketCreated(e.ticket);
                        })
                        .listen('.ticket.updated', (e) => {
                            console.log('Event received: ticket.updated for my position', e.ticket);
                            ticketsStore.handleTicketUpdated(e.ticket);
                        });
                }
            } else if (wasLoggedIn === true && isLoggedIn === false) {
                // Only disconnect if the state changed from logged in to logged out
                useEcho.disconnect();
            }
        },
        { immediate: true } // Run on component mount
    );
});
</script>

<template>
    <div class="layout-wrapper" :class="containerClass">
        <app-topbar></app-topbar>
        <app-sidebar></app-sidebar>
        <div class="layout-main-container">
            <div class="layout-main">
                <router-view></router-view>
            </div>
            <app-footer></app-footer>
        </div>
        <div class="layout-mask animate-fadein"></div>
    </div>
    <Toast />
</template>
