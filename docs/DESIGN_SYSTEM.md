# Design System - Sistema de Diseño CSR App

> Guía de estilos y componentes visuales para mantener consistencia en todo el proyecto

## 📋 Tabla de Contenidos

- [Paleta de Colores](#-paleta-de-colores)
- [Gradientes Estándar](#-gradientes-estándar)
- [Sombras y Elevaciones](#-sombras-y-elevaciones)
- [Animaciones](#-animaciones)
- [Componentes UI](#-componentes-ui)
- [Modo Oscuro](#-modo-oscuro)
- [Mejores Prácticas](#-mejores-prácticas)

---

## 🎨 Paleta de Colores

### Colores Primarios

```scss
// Indigo (Primario)
--indigo-500: #6366f1
--indigo-600: #4f46e5
--indigo-700: #4338ca
--indigo-800: #3730a3

// Purple (Acento)
--purple-500: #8b5cf6
--purple-600: #9333ea
--purple-700: #7c3aed

// Blue (Información)
--blue-500: #3b82f6
--blue-600: #2563eb
--blue-700: #1d4ed8
```

### Colores Secundarios

```scss
// Green (Éxito/Excel)
--green-500: #10b981
--green-600: #059669
--green-700: #047857

// Teal (Acento Verde)
--teal-500: #14b8a6
--teal-600: #0d9488

// Cyan
--cyan-500: #06b6d4
--cyan-700: #0891b2

// Red (Error/Peligro)
--red-500: #ef4444
--red-600: #dc2626
--red-700: #b91c1c

// Orange (Advertencia)
--orange-500: #f59e0b
--orange-600: #d97706

// Yellow (Advertencia Clara)
--yellow-500: #eab308
--yellow-600: #ca8a04
```

### Colores Neutros

```scss
// Gris (UI)
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-300: #d1d5db
--gray-400: #9ca3af
--gray-500: #6b7280
--gray-600: #4b5563
--gray-700: #374151
--gray-800: #1f2937
--gray-900: #111827
```

---

## 🌈 Gradientes Estándar

### 1. Gradiente Principal (Primary)

**Uso:** Headers principales, iconos destacados, elementos de navegación

```scss
// Modo Claro
background: linear-gradient(135deg, #6366f1 0%, #9333ea 50%, #4338ca 100%);

// Modo Oscuro
background: linear-gradient(135deg, #818cf8 0%, #a855f7 50%, #6366f1 100%);
```

**Ejemplo de Aplicación:**
```vue
<style scoped>
.header-icon-wrapper {
    background: linear-gradient(135deg, #6366f1 0%, #9333ea 50%, #4338ca 100%);
    box-shadow:
        0 8px 20px rgba(99, 102, 241, 0.3),
        0 4px 12px rgba(147, 51, 234, 0.4);
}

/* Dark mode */
:global(.dark) .header-icon-wrapper {
    background: linear-gradient(135deg, #818cf8 0%, #a855f7 50%, #6366f1 100%);
}
</style>
```

### 2. Gradiente Verde (Success/Excel)

**Uso:** Botones de exportación, estados de éxito, elementos relacionados con Excel

```scss
// Modo Claro
background: linear-gradient(135deg, #10b981 0%, #059669 100%);

// Modo Oscuro (más brillante)
background: linear-gradient(135deg, #34d399 0%, #10b981 100%);

// Con acento Teal
background: linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0891b2 100%);
```

### 3. Gradiente Azul (Información)

**Uso:** Banners informativos, tooltips, mensajes

```scss
// Modo Claro
background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
border: 2px solid rgba(96, 165, 250, 0.5);

// Modo Oscuro
background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
border: 2px solid rgba(147, 197, 253, 0.3);
```

### 4. Gradiente Rojo (Peligro)

**Uso:** Botones de eliminar, alertas, acciones destructivas

```scss
// Modo Claro - Base
background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
border: 2px solid #fca5a5;
color: #ef4444;

// Modo Claro - Hover
background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
border-color: #f87171;

// Modo Oscuro
background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
border: 2px solid #f87171;
color: #fca5a5;
```

### 5. Gradientes de Superficie

**Uso:** Cards, contenedores, secciones

```scss
// Card Principal
background: linear-gradient(145deg, var(--surface-50) 0%, var(--surface-0) 100%);

// Card Secundaria
background: linear-gradient(145deg, var(--surface-section) 0%, var(--surface-card) 100%);
```

---

## 🎭 Sombras y Elevaciones

### Niveles de Elevación

```scss
/* Nivel 1: Elementos sutiles */
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);

/* Nivel 2: Cards, botones */
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);

/* Nivel 3: Modales, dropdowns */
--shadow-lg: 0 8px 20px rgba(0, 0, 0, 0.12);

/* Nivel 4: Headers destacados */
--shadow-xl: 0 10px 40px rgba(0, 0, 0, 0.15);

/* Dark mode (más intenso) */
--shadow-md-dark: 0 4px 12px rgba(0, 0, 0, 0.3);
--shadow-lg-dark: 0 8px 20px rgba(0, 0, 0, 0.4);
```

### Sombras con Color

```scss
/* Primary shadow */
box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

/* Success shadow */
box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);

/* Info shadow */
box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);

/* Danger shadow */
box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);

/* Sombra multicapa */
box-shadow:
    0 4px 12px rgba(99, 102, 241, 0.3),
    0 2px 8px rgba(147, 51, 234, 0.2);
```

---

## ✨ Animaciones

### 1. Shimmer Effect

**Uso:** Iconos, badges, elementos destacados

```scss
@keyframes shimmer {
    0%, 100% {
        transform: translateX(-100%) rotate(45deg);
    }
    50% {
        transform: translateX(100%) rotate(45deg);
    }
}

/* Aplicación */
.element::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
        135deg,
        transparent 0%,
        rgba(255, 255, 255, 0.15) 50%,
        transparent 100%
    );
    animation: shimmer 3s ease-in-out infinite;
}
```

### 2. Pulse Effect

**Uso:** Notificaciones, elementos que requieren atención

```scss
@keyframes pulse {
    0%, 100% {
        transform: scale(1);
        box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
    }
    50% {
        transform: scale(1.05);
        box-shadow: 0 12px 28px rgba(99, 102, 241, 0.4);
    }
}

.element {
    animation: pulse 2s ease-in-out infinite;
}
```

### 3. Gradient Shift

**Uso:** Bordes animados, líneas decorativas

```scss
@keyframes gradientShift {
    0%, 100% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
}

.element {
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #4f46e5, #6366f1);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}
```

### 4. Fade In

**Uso:** Aparición de elementos

```scss
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.element {
    animation: fadeIn 0.4s ease-out;
}
```

### 5. Slide In

**Uso:** Banners, notificaciones

```scss
@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.element {
    animation: slideIn 0.4s ease-out;
}
```

---

## 🎯 Componentes UI

### 1. Icon Badge (Icono destacado)

```vue
<template>
    <div class="icon-badge">
        <i class="pi pi-check"></i>
    </div>
</template>

<style scoped>
.icon-badge {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0891b2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    position: relative;
    overflow: hidden;
    animation: iconPulse 2s ease-in-out infinite;
}

.icon-badge::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%);
    animation: shimmer 3s ease-in-out infinite;
}

.icon-badge i {
    font-size: 1.5rem;
    color: white;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

/* Dark mode */
:global(.dark) .icon-badge {
    background: linear-gradient(135deg, #34d399 0%, #2dd4bf 50%, #22d3ee 100%);
}
</style>
```

### 2. Botón Primario con Efecto

```vue
<template>
    <Button class="primary-button" label="Buscar" icon="pi pi-search" />
</template>

<style scoped>
.primary-button {
    background: linear-gradient(135deg, #6366f1 0%, #9333ea 100%) !important;
    border: none !important;
    padding: 0.625rem 1.5rem !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    box-shadow:
        0 3px 12px rgba(99, 102, 241, 0.3),
        0 2px 8px rgba(147, 51, 234, 0.3) !important;
    transition: all 0.3s ease !important;
    color: white !important;
    position: relative;
    overflow: hidden;
}

.primary-button::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
}

.primary-button:hover::before {
    transform: translateX(100%);
}

.primary-button:hover {
    transform: translateY(-2px) !important;
    box-shadow:
        0 5px 18px rgba(99, 102, 241, 0.4),
        0 3px 12px rgba(147, 51, 234, 0.4) !important;
}

:global(.dark) .primary-button {
    background: linear-gradient(135deg, #818cf8 0%, #a855f7 100%) !important;
}
</style>
```

### 3. Card con Borde Animado

```vue
<template>
    <div class="animated-card">
        <slot />
    </div>
</template>

<style scoped>
.animated-card {
    background: linear-gradient(145deg, var(--surface-section) 0%, var(--surface-card) 100%);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 4px 20px var(--card-shadow);
    border: 1px solid color-mix(in srgb, var(--primary-color) 10%, var(--surface-border));
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.animated-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #4f46e5, #6366f1);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

.animated-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 30px var(--card-shadow-hover);
}
</style>
```

### 4. Info Banner

```vue
<template>
    <div class="info-banner">
        <div class="info-icon-wrapper">
            <i class="pi pi-info-circle"></i>
        </div>
        <div class="info-content">
            <div class="info-title">Título</div>
            <div class="info-description">Descripción del mensaje</div>
        </div>
    </div>
</template>

<style scoped>
.info-banner {
    background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
    border-radius: 14px;
    padding: 1.25rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    border: 2px solid rgba(96, 165, 250, 0.5);
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
    position: relative;
    overflow: hidden;
    animation: slideIn 0.4s ease-out;
}

.info-banner::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #6366f1);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

.info-icon-wrapper {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.info-icon-wrapper i {
    color: white;
    font-size: 1.25rem;
}

.info-title {
    font-weight: 700;
    font-size: 0.875rem;
    color: #1d4ed8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.info-description {
    font-size: 0.875rem;
    color: #1e40af;
    margin-top: 0.25rem;
}

/* Dark mode */
:global(.dark) .info-banner {
    background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
    border: 2px solid rgba(147, 197, 253, 0.3);
}

:global(.dark) .info-icon-wrapper {
    background: linear-gradient(135deg, #60a5fa 0%, #a855f7 100%);
}

:global(.dark) .info-title {
    color: #93c5fd;
}

:global(.dark) .info-description {
    color: #bfdbfe;
}
</style>
```

### 5. Badge/Tag

```vue
<template>
    <span class="custom-badge">{{ label }}</span>
</template>

<style scoped>
.custom-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: linear-gradient(135deg, white 0%, #dbeafe 100%);
    padding: 0.438rem 0.875rem;
    border-radius: 8px;
    font-size: 0.813rem;
    font-weight: 600;
    color: #1d4ed8;
    border: 1px solid #93c5fd;
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
    transition: all 0.2s ease;
}

.custom-badge:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

/* Dark mode */
:global(.dark) .custom-badge {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
    color: #93c5fd;
    border: 1px solid #60a5fa;
}
</style>
```

---

## 🌙 Modo Oscuro

### Estrategia de Implementación

1. **Usar selectores globales para dark mode:**

```scss
/* Opción 1: Clase .dark en el body */
:global(.dark) .component {
    /* estilos dark mode */
}

/* Opción 2: Atributo data-theme */
:global([data-theme='dark']) .component {
    /* estilos dark mode */
}
```

2. **Variables CSS personalizadas:**

```scss
.component {
    --card-shadow: rgba(0, 0, 0, 0.08);
    --card-shadow-hover: rgba(0, 0, 0, 0.12);
}

:global(.dark) .component {
    --card-shadow: rgba(0, 0, 0, 0.3);
    --card-shadow-hover: rgba(0, 0, 0, 0.4);
}
```

### Ajustes de Color por Modo

| Elemento | Modo Claro | Modo Oscuro |
|----------|-----------|-------------|
| Gradiente Principal | `#6366f1 → #9333ea → #4338ca` | `#818cf8 → #a855f7 → #6366f1` |
| Gradiente Verde | `#10b981 → #059669` | `#34d399 → #10b981` |
| Backgrounds | Colores claros (50-100) | Colores oscuros (800-900) |
| Texto | Oscuro (#1e293b) | Claro (#f1f5f9) |
| Bordes | Sutiles (#e2e8f0) | Más visibles (#475569) |
| Sombras | Ligeras (0.08-0.15) | Intensas (0.3-0.4) |

### Ejemplo Completo con Dark Mode

```vue
<style scoped>
.component {
    /* Variables */
    --gradient-start: #f8f9fa;
    --gradient-end: #ffffff;
    --card-shadow: rgba(0, 0, 0, 0.08);

    /* Estilos base */
    background: linear-gradient(145deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
    box-shadow: 0 10px 40px var(--card-shadow);
    color: var(--text-color);
}

/* Dark mode overrides */
:global(.dark) .component,
:global([data-theme='dark']) .component {
    --gradient-start: #1e293b;
    --gradient-end: #0f172a;
    --card-shadow: rgba(0, 0, 0, 0.3);
}
</style>
```

---

## 💡 Mejores Prácticas

### 1. Consistencia de Colores

- ✅ **Usar colores del sistema:** Siempre referirse a la paleta establecida
- ✅ **Propósito claro:** Verde para éxito, Rojo para errores, Azul para información
- ❌ **Evitar:** Colores aleatorios o no documentados

### 2. Gradientes

```scss
/* ✅ CORRECTO: Gradiente con dirección y paradas claras */
background: linear-gradient(135deg, #6366f1 0%, #9333ea 100%);

/* ❌ INCORRECTO: Sin dirección o paradas */
background: linear-gradient(#6366f1, #9333ea);
```

### 3. Sombras

```scss
/* ✅ CORRECTO: Sombra multicapa con opacidad adecuada */
box-shadow:
    0 4px 12px rgba(99, 102, 241, 0.3),
    0 2px 8px rgba(147, 51, 234, 0.2);

/* ❌ INCORRECTO: Sombra muy oscura o sin opacidad */
box-shadow: 0 4px 12px #6366f1;
```

### 4. Animaciones

```scss
/* ✅ CORRECTO: Animación suave y performante */
.element {
    transition: all 0.3s ease;
    will-change: transform; /* Para animaciones frecuentes */
}

/* ❌ INCORRECTO: Animación muy larga o sin easing */
.element {
    transition: all 1s;
}
```

### 5. Accesibilidad

```scss
/* ✅ CORRECTO: Suficiente contraste */
.text {
    color: #1e293b; /* Sobre fondo claro */
    font-weight: 600; /* Para mejorar legibilidad */
}

/* ❌ INCORRECTO: Poco contraste */
.text {
    color: #cbd5e1; /* Sobre fondo blanco */
}
```

### 6. Responsive Design

```scss
/* ✅ CORRECTO: Mobile-first con breakpoints claros */
.component {
    padding: 1rem;
}

@media (min-width: 768px) {
    .component {
        padding: 1.5rem;
    }
}

@media (min-width: 1024px) {
    .component {
        padding: 2rem;
    }
}
```

### 7. Modo Oscuro

```scss
/* ✅ CORRECTO: Ajustes específicos para dark mode */
.component {
    background: #ffffff;
    color: #1e293b;
}

:global(.dark) .component {
    background: #1e293b;
    color: #f1f5f9;
}

/* ❌ INCORRECTO: Mismo estilo en ambos modos */
.component {
    background: white; /* No se adapta */
}
```

---

## 📦 Estructura de Archivos CSS

### Organización Recomendada

```
src/
├── assets/
│   └── styles/
│       ├── variables.css         # Variables globales
│       ├── animations.css        # Animaciones reutilizables
│       ├── components.css        # Componentes base
│       └── utilities.css         # Clases de utilidad
├── components/
│   └── MyComponent.vue
│       └── <style scoped>        # Estilos específicos del componente
```

### Variables Globales (variables.css)

```css
:root {
    /* Colors */
    --color-primary: #6366f1;
    --color-success: #10b981;
    --color-danger: #ef4444;
    --color-warning: #f59e0b;
    --color-info: #3b82f6;

    /* Shadows */
    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
    --shadow-lg: 0 8px 20px rgba(0, 0, 0, 0.12);

    /* Animations */
    --transition-fast: 0.2s ease;
    --transition-base: 0.3s ease;
    --transition-slow: 0.5s ease;
}

[data-theme='dark'] {
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 8px 20px rgba(0, 0, 0, 0.4);
}
```

---

## 🔧 Herramientas Útiles

### Generador de Gradientes

```javascript
// Función helper para generar gradientes consistentes
function createGradient(color1, color2, angle = 135) {
    return `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
}

// Uso
const primaryGradient = createGradient('#6366f1', '#9333ea');
```

### Generador de Sombras

```javascript
// Función helper para sombras con color
function coloredShadow(color, opacity = 0.3, blur = 12) {
    const rgba = hexToRgba(color, opacity);
    return `0 4px ${blur}px ${rgba}`;
}
```

---

## 📱 Ejemplos de Uso

### Página Completa

```vue
<template>
    <div class="page-container">
        <div class="header-section">
            <div class="header-icon-wrapper">
                <i class="pi pi-home"></i>
            </div>
            <div class="header-content">
                <h1 class="header-title">Dashboard</h1>
                <p class="header-subtitle">Vista general del sistema</p>
            </div>
        </div>

        <div class="filters-card">
            <!-- Filtros aquí -->
        </div>

        <div class="content-grid">
            <!-- Contenido aquí -->
        </div>
    </div>
</template>

<style scoped>
/* Aplicar estilos del design system */
@import '@/assets/styles/variables.css';
@import '@/assets/styles/animations.css';

.page-container {
    padding: 2rem;
    animation: fadeIn 0.4s ease-out;
}

/* Resto de estilos siguiendo el design system... */
</style>
```

---

## 🎓 Recursos Adicionales

- **PrimeVue Documentation:** https://primevue.org/
- **Color Palette Generator:** https://coolors.co/
- **Gradient Generator:** https://cssgradient.io/
- **Shadow Generator:** https://shadows.brumm.af/

---

## 📝 Changelog

### v1.0.0 (2024)
- ✨ Creación inicial del design system
- 🎨 Definición de paleta de colores
- 🌈 Implementación de gradientes estándar
- ✨ Animaciones base
- 🌙 Soporte para modo oscuro

---

## 🤝 Contribución

Para proponer cambios al design system:

1. Documenta el cambio propuesto
2. Proporciona ejemplos visuales
3. Considera el impacto en modo oscuro
4. Actualiza este documento

---

**Mantenido por:** Equipo de Desarrollo CSR App
**Última actualización:** 2024
