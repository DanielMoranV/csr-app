# Design System - Referencia Rápida

> Guía de consulta rápida para implementar estilos consistentes

## 🎨 Paleta de Colores

```scss
// Principales
Primary:  #6366f1  Purple:   #9333ea  Blue:     #3b82f6
Green:    #10b981  Teal:     #14b8a6  Cyan:     #0891b2
Red:      #ef4444  Orange:   #f59e0b  Yellow:   #eab308
```

## 🌈 Gradientes Rápidos

```scss
/* Primary */
linear-gradient(135deg, #6366f1 0%, #9333ea 100%)

/* Success/Excel */
linear-gradient(135deg, #10b981 0%, #059669 100%)

/* Info */
linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)

/* Danger */
linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)
```

## 🎭 Sombras

```scss
/* Suave */
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

/* Media */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

/* Fuerte */
box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);

/* Con color (Primary) */
box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

/* Con color (Success) */
box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
```

## ✨ Animaciones

```scss
/* Shimmer */
@keyframes shimmer {
    0%, 100% { transform: translateX(-100%) rotate(45deg); }
    50% { transform: translateX(100%) rotate(45deg); }
}

/* Pulse */
@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

/* Gradient Shift */
@keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

/* Fade In */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
```

## 🎯 Componentes Comunes

### Icon Badge

```vue
<div class="icon-badge">
    <i class="pi pi-check"></i>
</div>

<style>
.icon-badge {
    width: 48px; height: 48px; border-radius: 12px;
    background: linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0891b2 100%);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
</style>
```

### Button Primary

```vue
<style>
.btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #9333ea 100%) !important;
    box-shadow: 0 3px 12px rgba(99, 102, 241, 0.3) !important;
}
</style>
```

### Card Animada

```vue
<style>
.card {
    background: linear-gradient(145deg, var(--surface-section), var(--surface-card));
    border: 1px solid var(--surface-border);
    border-radius: 16px;
}

.card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #4f46e5, #6366f1);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}
</style>
```

## 🌙 Dark Mode

```scss
/* Template básico */
.component {
    background: #ffffff;
    color: #1e293b;
}

:global(.dark) .component {
    background: #1e293b;
    color: #f1f5f9;
}

/* Con variables */
.component {
    --bg-color: #ffffff;
}

:global(.dark) .component {
    --bg-color: #1e293b;
}
```

## 📐 Espaciado Estándar

```scss
--spacing-xs:  0.25rem;  // 4px
--spacing-sm:  0.5rem;   // 8px
--spacing-md:  1rem;     // 16px
--spacing-lg:  1.5rem;   // 24px
--spacing-xl:  2rem;     // 32px
--spacing-2xl: 3rem;     // 48px
```

## 🔤 Tipografía

```scss
/* Títulos */
.title-xl  { font-size: 2rem;    font-weight: 700; }
.title-lg  { font-size: 1.5rem;  font-weight: 700; }
.title-md  { font-size: 1.25rem; font-weight: 600; }

/* Texto */
.text-base { font-size: 1rem;    font-weight: 400; }
.text-sm   { font-size: 0.875rem; font-weight: 400; }
.text-xs   { font-size: 0.75rem;  font-weight: 400; }
```

## ⚡ Tips Rápidos

### Hover Suave
```scss
.element {
    transition: all 0.3s ease;
}
.element:hover {
    transform: translateY(-2px);
}
```

### Overlay Shimmer
```scss
.element::before {
    background: linear-gradient(135deg, transparent, rgba(255,255,255,0.2), transparent);
    animation: shimmer 3s infinite;
}
```

### Border Animado
```scss
.element::before {
    height: 2px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1);
    background-size: 200% 100%;
    animation: gradientShift 3s infinite;
}
```

---

Para más detalles, consulta: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
