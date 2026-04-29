<script setup>
import { useLayout } from '@/layout/composables/layout';
import { onBeforeMount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const { layoutState, setActiveMenuItem, toggleMenu } = useLayout();

const props = defineProps({
    item: {
        type: Object,
        default: () => ({})
    },
    index: {
        type: Number,
        default: 0
    },
    root: {
        type: Boolean,
        default: true
    },
    parentItemKey: {
        type: String,
        default: null
    }
});

const isActiveMenu = ref(false);
const itemKey = ref(null);

onBeforeMount(() => {
    itemKey.value = props.parentItemKey ? props.parentItemKey + '-' + props.index : String(props.index);

    const activeItem = layoutState.activeMenuItem;

    isActiveMenu.value = activeItem === itemKey.value || activeItem ? activeItem.startsWith(itemKey.value + '-') : false;
});

watch(
    () => layoutState.activeMenuItem,
    (newVal) => {
        isActiveMenu.value = newVal === itemKey.value || newVal.startsWith(itemKey.value + '-');
    }
);

function itemClick(event, item) {
    if (item.disabled) {
        event.preventDefault();
        return;
    }

    if ((item.to || item.url) && (layoutState.staticMenuMobileActive || layoutState.overlayMenuActive)) {
        toggleMenu();
    }

    if (item.command) {
        item.command({ originalEvent: event, item: item });
    }

    const foundItemKey = item.items ? (isActiveMenu.value ? props.parentItemKey : itemKey) : itemKey.value;

    setActiveMenuItem(foundItemKey);
}

function checkActiveRoute(item) {
    return route.path === item.to;
}
</script>

<template>
    <li :class="{ 'layout-root-menuitem': root, 'active-menuitem': isActiveMenu }">
        <div v-if="root && item.visible !== false" class="layout-menuitem-root-text">{{ item.label }}</div>
        <a v-if="(!item.to || item.items) && item.visible !== false" :href="item.url" @click="itemClick($event, item, index)" :class="item.class" :target="item.target" tabindex="0">
            <i :class="item.icon" class="layout-menuitem-icon"></i>
            <span class="layout-menuitem-text">{{ item.label }}</span>
            <i class="pi pi-fw pi-angle-down layout-submenu-toggler" v-if="item.items"></i>
            <span v-if="item.badge" class="layout-menuitem-badge" :class="item.badgeClass">{{ item.badge }}</span>
            <span v-if="item.badges?.length" class="menuitem-badges-group">
                <span v-for="(b, bi) in item.badges" :key="bi" class="menuitem-icon-badge" :data-severity="b.severity"> <i :class="b.icon"></i>{{ b.value }} </span>
            </span>
        </a>
        <router-link v-if="item.to && !item.items && item.visible !== false" @click="itemClick($event, item, index)" :class="[item.class, { 'active-route': checkActiveRoute(item) }]" tabindex="0" :to="item.to">
            <i :class="item.icon" class="layout-menuitem-icon"></i>
            <span class="layout-menuitem-text">{{ item.label }}</span>
            <i class="pi pi-fw pi-angle-down layout-submenu-toggler" v-if="item.items"></i>
            <span v-if="item.badge" class="layout-menuitem-badge" :class="item.badgeClass">{{ item.badge }}</span>
            <span v-if="item.badges?.length" class="menuitem-badges-group">
                <span v-for="(b, bi) in item.badges" :key="bi" class="menuitem-icon-badge" :data-severity="b.severity"> <i :class="b.icon"></i>{{ b.value }} </span>
            </span>
        </router-link>
        <Transition v-if="item.items && item.visible !== false" name="layout-submenu">
            <ul v-show="root ? true : isActiveMenu" class="layout-submenu">
                <app-menu-item v-for="(child, i) in item.items" :key="child" :index="i" :item="child" :parentItemKey="itemKey" :root="false"></app-menu-item>
            </ul>
        </Transition>
    </li>
</template>

<style lang="scss" scoped>
.layout-menuitem-badge {
    margin-left: auto;
    background: #ef4444;
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    border-radius: 20px;
    height: 1.25rem;
    min-width: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

/* Grupo de badges con icono (comentarios + pendientes) */
.menuitem-badges-group {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
}

.menuitem-icon-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.2rem 0.42rem;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;

    i {
        font-size: 0.62rem;
    }

    &[data-severity='info'] {
        background: #3b82f6;
        color: #fff;
    }
    &[data-severity='warn'] {
        background: #f59e0b;
        color: #fff;
    }
    &[data-severity='danger'] {
        background: #ef4444;
        color: #fff;
    }
    &[data-severity='success'] {
        background: #22c55e;
        color: #fff;
    }
}
</style>
