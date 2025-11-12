import { computed, reactive, watch } from 'vue';
import cache from '@/utils/cache';

// Keys para el cache
const CACHE_KEY_DARK_MODE = 'layout_dark_mode';
const CACHE_KEY_MENU_DESKTOP_INACTIVE = 'layout_menu_desktop_inactive';

// Cargar configuración desde cache
const savedDarkMode = cache.getItem(CACHE_KEY_DARK_MODE) ?? false;
const savedMenuDesktopInactive = cache.getItem(CACHE_KEY_MENU_DESKTOP_INACTIVE) ?? false;

const layoutConfig = reactive({
    preset: 'Aura',
    primary: 'emerald',
    surface: null,
    darkTheme: savedDarkMode,
    menuMode: 'static'
});

const layoutState = reactive({
    staticMenuDesktopInactive: savedMenuDesktopInactive,
    overlayMenuActive: false,
    profileSidebarVisible: false,
    configSidebarVisible: false,
    staticMenuMobileActive: false,
    menuHoverActive: false,
    activeMenuItem: null
});

// Aplicar modo oscuro al iniciar si está guardado
if (savedDarkMode) {
    document.documentElement.classList.add('app-dark');
}

// Watchers para guardar en cache cuando cambien los valores
watch(
    () => layoutConfig.darkTheme,
    (newValue) => {
        cache.setItem(CACHE_KEY_DARK_MODE, newValue);
    }
);

watch(
    () => layoutState.staticMenuDesktopInactive,
    (newValue) => {
        cache.setItem(CACHE_KEY_MENU_DESKTOP_INACTIVE, newValue);
    }
);

export function useLayout() {
    const setActiveMenuItem = (item) => {
        layoutState.activeMenuItem = item.value || item;
    };

    const toggleDarkMode = () => {
        if (!document.startViewTransition) {
            executeDarkModeToggle();

            return;
        }

        document.startViewTransition(() => executeDarkModeToggle(event));
    };

    const executeDarkModeToggle = () => {
        layoutConfig.darkTheme = !layoutConfig.darkTheme;
        document.documentElement.classList.toggle('app-dark');
    };

    const toggleMenu = () => {
        if (layoutConfig.menuMode === 'overlay') {
            layoutState.overlayMenuActive = !layoutState.overlayMenuActive;
        }

        if (window.innerWidth > 991) {
            layoutState.staticMenuDesktopInactive = !layoutState.staticMenuDesktopInactive;
        } else {
            layoutState.staticMenuMobileActive = !layoutState.staticMenuMobileActive;
        }
    };

    const isSidebarActive = computed(() => layoutState.overlayMenuActive || layoutState.staticMenuMobileActive);

    const isDarkTheme = computed(() => layoutConfig.darkTheme);

    const getPrimary = computed(() => layoutConfig.primary);

    const getSurface = computed(() => layoutConfig.surface);

    return {
        layoutConfig,
        layoutState,
        toggleMenu,
        isSidebarActive,
        isDarkTheme,
        getPrimary,
        getSurface,
        setActiveMenuItem,
        toggleDarkMode
    };
}
