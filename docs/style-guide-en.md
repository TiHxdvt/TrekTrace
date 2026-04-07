# Glassmorphism Mobile UI Design System

## Overview

This design system implements a modern Glassmorphism design language with a dark theme foundation. It creates depth and futuristic aesthetics through semi-transparent effects, backdrop blur, soft gradients, and a carefully crafted shadow system.

**Core Design Principles:**
- Glass-like semi-transparent components
- Dark background with ambient gradient glows
- Refined depth and spatial relationships
- Smooth micro-interactions and animations

---

## Color System

### Primary Colors

| Usage | Color Name | HEX | RGB | Application |
|-------|-----------|-----|-----|-------------|
| Background | Dark Space | `#1c1e26` | rgb(28, 30, 38) | Container backgrounds, primary surface |
| Accent | Cobalt Blue | `#3b82f6` | rgb(59, 130, 246) | Active buttons, selected states, interactive elements |
| Gradient Blue | Blue Gradient | `#2563eb` → `#1d4ed8` | - | Active icons, gradient backgrounds |

### Text Colors

All text uses white with varying opacity levels:

| Type | Opacity | Tailwind Class | Usage |
|------|---------|----------------|-------|
| Primary | `100%` | `text-white` | Headings, important information |
| Secondary | `80%` | `text-white/80` | Body text, regular content |
| Tertiary | `50%` | `text-white/50` | Descriptions, secondary information |
| Disabled | `40%` | `text-white/40` | Labels, hints, section headers |
| Placeholder | `30%` | `text-white/30` | Input placeholders, disabled text |

### Functional Colors

| Function | Color | Usage |
|----------|-------|-------|
| Success/Active | Blue 600 | Active buttons, selected items, primary actions |
| Warning/Rating | Yellow 400 | Star ratings, highlights |
| Error/Favorite | Pink 500 | Heart icons, error states |
| Neutral | White (various opacity) | Borders, backgrounds, icons |

### Gradient Backgrounds

**Ambient Glow Effects:**
```css
/* Blue Glow */
background: rgba(59, 130, 246, 0.2)
blur: 120px
size: 500px × 500px

/* Purple Glow */
background: rgba(147, 51, 234, 0.2)
blur: 120px
size: 600px × 600px

/* Pink Glow */
background: rgba(236, 72, 153, 0.1)
blur: 100px
size: 400px × 400px
```

**Gradient Overlays:**
```css
/* Image Overlay - Bottom to Top */
background: linear-gradient(to top,
  rgba(0, 0, 0, 0.9) 0%,
  rgba(0, 0, 0, 0.2) 50%,
  transparent 100%)

/* Card Background - Top to Bottom */
background: linear-gradient(to bottom,
  rgba(255, 255, 255, 0.05) 0%,
  transparent 100%)

/* Button Gradient */
background: linear-gradient(to right,
  rgba(59, 130, 246, 0.8) 0%,
  rgba(59, 130, 246, 0.8) 100%)
```

---

## Typography

### Font Family

**Primary Font:** Inter
- **Fallback:** System sans-serif (system-ui, sans-serif)
- **Source:** Google Fonts
- **Weight Range:** 300-600

**Font Weights:**
```css
font-light: 300      /* Decorative text */
font-normal: 400     /* Body content */
font-medium: 500     /* Emphasized text, labels */
font-semibold: 600   /* Headings, buttons */
```

### Type Scale

| Usage | Size | Tailwind Class | Line Height | Letter Spacing |
|-------|------|----------------|-------------|----------------|
| Micro | 10px | `text-[10px]` | Default | `tracking-wide` or `tracking-wider` |
| Extra Small | 12px | `text-xs` | Default | Default |
| Base | 16px | `text-base` | Default | Default |
| Large | 18px | `text-lg` | Default | Default |
| Extra Large | 20px | `text-xl` | Default | `tracking-tight` |
| 2XL | 24px | `text-2xl` | Default | `tracking-tight` |

### Typography Guidelines

**Letter Spacing:**
- Headings: `tracking-tight` (-0.025em) for tighter character spacing
- Labels: `tracking-wide` (0.025em) for better readability
- Uppercase labels: `tracking-wider` (0.05em) + `uppercase`

**Text Transform:**
- Section headers: `uppercase` + `tracking-wider`
- Regular text: normal case

---

## Spacing System

### Base Unit

Uses **4px** as the base spacing unit, following an 8-point grid system.

### Spacing Scale

| Name | Pixels | Tailwind Class | Usage |
|------|--------|----------------|-------|
| Micro | 2px | `gap-0.5`, `p-0.5` | Tight spacing, indicators |
| Extra Small | 4px | `gap-1`, `p-1` | Icon spacing, compact elements |
| Small | 8px | `gap-2`, `p-2` | Icon-text spacing |
| Medium-Small | 12px | `gap-3`, `p-3` | List item padding |
| Medium | 16px | `gap-4`, `p-4` | Card padding, element spacing |
| Medium-Large | 20px | `gap-5`, `p-5` | Section padding |
| Large | 24px | `gap-6`, `p-6` | Container padding |
| Extra Large | 32px | `gap-8`, `p-8` | Page edge spacing |
| 2XL | 48px | `gap-12` | Grid gaps, major sections |

### Component Spacing Guidelines

- **Between cards:** `gap-6` (24px) or `gap-12` (48px)
- **Between list items:** `space-y-1` (4px)
- **Icon to text:** `gap-3` (12px) or `gap-4` (16px)
- **Button padding:**
  - Small: `px-3 py-1.5` (12px 6px)
  - Medium: `px-4 py-3` (16px 12px)
  - Large: `px-8 py-3` (32px 12px)
- **Section dividers:** `my-4` (16px vertical margin)

---

## Component Styles

### 1. Container (Phone Frame)

```css
.container-phone {
  background: rgba(28, 30, 38, 0.6); /* bg-[#1c1e26]/60 */
  border: 1px solid rgba(255, 255, 255, 0.1); /* border-white/10 */
  border-radius: 48px; /* rounded-[3rem] */
  backdrop-filter: blur(24px); /* backdrop-blur-2xl */
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); /* shadow-2xl */
  overflow: hidden;
  max-width: 360px;
  height: 780px;
}
```

### 2. Buttons

**Primary Button (Active State):**
```css
.btn-primary {
  background: linear-gradient(to right,
    rgba(59, 130, 246, 0.8),
    rgba(59, 130, 246, 0.8)); /* bg-gradient-to-r from-blue-600/80 to-blue-500/80 */
  color: white;
  border-radius: 16px; /* rounded-2xl */
  padding: 12px 32px; /* py-3 px-8 */
  font-weight: 500; /* font-medium */
  font-size: 16px; /* text-base */
  box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3); /* shadow-lg shadow-blue-600/30 */
  transition: all;
}
```

**Secondary Button:**
```css
.btn-secondary {
  background: rgba(255, 255, 255, 0.05); /* bg-white/5 */
  border: 1px solid rgba(255, 255, 255, 0.05); /* border-white/5 */
  border-radius: 9999px; /* rounded-full */
  color: rgba(255, 255, 255, 0.7); /* text-white/70 */
  padding: 12px 16px; /* p-3 */
  transition: all;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1); /* hover:bg-white/10 */
}

.btn-secondary:active {
  background: rgba(255, 255, 255, 0.2); /* active:bg-white/20 */
  transform: scale(0.98); /* active:scale-[0.98] */
}
```

**Icon Button (Circular):**
```css
.btn-icon {
  width: 40px; /* w-10 */
  height: 40px; /* h-10 */
  background: rgba(255, 255, 255, 0.05); /* bg-white/5 */
  border: 1px solid rgba(255, 255, 255, 0.05); /* border-white/5 */
  border-radius: 9999px; /* rounded-full */
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1); /* hover:bg-white/10 */
}

/* Large icon button */
.btn-icon-lg {
  width: 48px;  /* w-12 */
  height: 48px; /* h-12 */
}

/* Small icon button */
.btn-icon-sm {
  width: 32px;  /* w-8 */
  height: 32px; /* h-8 */
}
```

### 3. Input Fields

**Search Input:**
```css
.input-search {
  height: 40px; /* h-10 */
  background: rgba(255, 255, 255, 0.05); /* bg-white/5 */
  border: 1px solid rgba(255, 255, 255, 0.05); /* border-white/5 */
  border-radius: 9999px; /* rounded-full */
  padding: 0 16px; /* px-4 */
  color: rgba(255, 255, 255, 0.5); /* text-white/50 */
  display: flex;
  align-items: center;
  gap: 12px; /* gap-3 */
}

.input-search::placeholder {
  color: rgba(255, 255, 255, 0.5); /* text-white/50 */
}
```

### 4. Cards

**Content Card (Image Card):**
```css
.card-content {
  position: relative;
  width: 100%;
  aspect-ratio: 4/5;
  border-radius: 32px; /* rounded-[2rem] */
  overflow: hidden;
}

.card-content img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 700ms; /* group-hover:scale-105 duration-700 */
}

.card-content:hover img {
  transform: scale(1.05);
}

.card-content::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top,
    rgba(0, 0, 0, 0.9) 0%,
    rgba(0, 0, 0, 0.2) 50%,
    transparent 100%);
}
```

**Calendar Card:**
```css
.card-calendar {
  background: linear-gradient(to bottom,
    rgba(255, 255, 255, 0.05),
    transparent); /* bg-gradient-to-b from-white/5 to-transparent */
  border: 1px solid rgba(255, 255, 255, 0.05); /* border-white/5 */
  border-radius: 32px; /* rounded-[2rem] */
  padding: 16px; /* p-4 */
  position: relative;
  overflow: hidden;
}

.card-calendar::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 128px;
  height: 128px;
  background: rgba(59, 130, 246, 0.2); /* bg-blue-500/20 */
  filter: blur(50px); /* blur-[50px] */
  z-index: -10;
}
```

**Card Content Panel:**
```css
.card-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.1); /* bg-white/10 */
  backdrop-filter: blur(24px); /* backdrop-blur-xl */
  border-top: 1px solid rgba(255, 255, 255, 0.1); /* border-t border-white/10 */
  border-radius: 32px 32px 0 0; /* rounded-t-[2rem] */
  padding: 20px; /* p-5 */
}
```

### 5. List Items

```css
.list-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px; /* p-3 */
  border-radius: 16px; /* rounded-2xl */
  background: transparent;
  transition: all;
  cursor: pointer;
}

.list-item:hover {
  background: rgba(255, 255, 255, 0.05); /* hover:bg-white/5 */
}

.list-item:active {
  background: rgba(255, 255, 255, 0.1); /* active:bg-white/10 */
  transform: scale(0.98); /* active:scale-[0.98] */
}

.list-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3); /* focus-visible:ring-2 ring-blue-500/30 */
}
```

### 6. Badges

**Status Badge:**
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px; /* gap-1 */
  background: rgba(0, 0, 0, 0.4); /* bg-black/40 */
  backdrop-filter: blur(12px); /* backdrop-blur-md */
  padding: 6px 12px; /* px-3 py-1.5 */
  border-radius: 9999px; /* rounded-full */
  border: 1px solid rgba(255, 255, 255, 0.1); /* border-white/10 */
  font-size: 12px; /* text-xs */
  font-weight: 500; /* font-medium */
  color: white;
}
```

**Notification Badge:**
```css
.badge-notification {
  background: #2563eb; /* bg-blue-600 */
  color: white;
  font-size: 10px; /* text-[10px] */
  font-weight: 500; /* font-medium */
  padding: 2px 8px; /* px-2 py-0.5 */
  border-radius: 9999px; /* rounded-full */
  box-shadow: 0 10px 15px -3px rgba(30, 64, 175, 0.4); /* shadow-lg shadow-blue-900/40 */
}
```

### 7. Toggle Switch

```css
.toggle-track {
  width: 48px; /* w-12 */
  height: 28px; /* h-7 */
  background: rgba(255, 255, 255, 0.1); /* bg-white/10 */
  border-radius: 9999px; /* rounded-full */
  position: relative;
  cursor: pointer;
  transition: background-color 300ms; /* transition-colors duration-300 */
}

.toggle-dot {
  position: absolute;
  top: 4px; /* top-1 */
  right: 4px; /* right-1 */
  width: 20px; /* w-5 */
  height: 20px; /* h-5 */
  background: #3b82f6; /* bg-blue-500 */
  border-radius: 9999px; /* rounded-full */
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); /* shadow-lg */
  transition: all 300ms; /* transition-all duration-300 */
}

/* Active state */
.toggle-track.active {
  background: rgba(59, 130, 246, 0.2); /* bg-blue-500/20 */
}

.toggle-dot.active {
  transform: translateX(0);
  background: white;
}
```

### 8. Icon Container

```css
.icon-container {
  width: 36px; /* w-9 */
  height: 36px; /* h-9 */
  background: rgba(255, 255, 255, 0.05); /* bg-white/5 */
  border-radius: 9999px; /* rounded-full */
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7); /* text-white/70 */
  transition: all;
}

.icon-container:hover {
  background: rgba(255, 255, 255, 0.1); /* hover:bg-white/10 */
  color: white; /* hover:text-white */
}

.icon-container:active {
  transform: scale(0.9); /* active:scale-90 */
}

/* Active state */
.icon-container.active {
  background: rgba(255, 255, 255, 0.2); /* bg-white/20 */
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05); /* shadow-inner */
}

/* Large variant */
.icon-container-lg {
  width: 48px; /* w-12 */
  height: 48px; /* h-12 */
  border-radius: 16px; /* rounded-2xl */
}
```

### 9. Bottom Navigation

```css
.nav-bottom {
  position: absolute;
  bottom: 32px; /* bottom-8 */
  left: 50%;
  transform: translateX(-50%); /* -translate-x-1/2 */
  width: 85%; /* w-[85%] */
  height: 64px; /* h-16 */
  background: rgba(24, 26, 34, 0.8); /* bg-[#181a22]/80 */
  border: 1px solid rgba(255, 255, 255, 0.1); /* border-white/10 */
  border-radius: 9999px; /* rounded-full */
  backdrop-filter: blur(24px); /* backdrop-blur-xl */
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); /* shadow-2xl */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px; /* px-2 */
  z-index: 30;
}
```

### 10. Status Bar

```css
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 8px 24px; /* px-6 pt-5 pb-2 */
  color: rgba(255, 255, 255, 0.8); /* text-white/80 */
  font-size: 12px; /* text-xs */
  font-weight: 500; /* font-medium */
  z-index: 20;
  user-select: none; /* select-none */
}
```

### 11. Home Indicator

```css
.home-indicator {
  position: absolute;
  bottom: 8px; /* bottom-2 */
  left: 50%;
  transform: translateX(-50%); /* -translate-x-1/2 */
  width: 128px; /* w-32 */
  height: 4px; /* h-1 */
  background: rgba(255, 255, 255, 0.2); /* bg-white/20 */
  border-radius: 9999px; /* rounded-full */
  pointer-events: none; /* pointer-events-none */
}
```

---

## Additional Components

### 12. Status Bar

```css
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 8px 24px; /* px-6 pt-5 pb-2 */
  color: rgba(255, 255, 255, 0.8); /* text-white/80 */
  font-size: 12px; /* text-xs */
  font-weight: 500; /* font-medium */
  z-index: 20;
  user-select: none; /* select-none */
}
```

**HTML Structure:**
```html
<div class="flex justify-between items-center px-6 pt-5 pb-2 text-white/80 text-xs font-medium z-20 select-none">
  <span>9:41</span>
  <div class="flex items-center gap-1.5">
    <iconify-icon icon="solar:signal-linear" class="text-sm"></iconify-icon>
    <iconify-icon icon="solar:wifi-linear" class="text-sm"></iconify-icon>
    <iconify-icon icon="solar:battery-charge-linear" class="text-lg"></iconify-icon>
  </div>
</div>
```

### 13. Category Selector

```css
.category-container {
  display: flex;
  gap: 16px; /* gap-4 */
  overflow-x: auto;
  padding: 4px 20px; /* pt-1 px-5 */
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px; /* gap-1 */
  opacity: 0.5;
  cursor: pointer;
  transition: opacity 300ms;
}

.category-item.active {
  opacity: 1;
}

.category-icon {
  width: 48px; /* w-12 */
  height: 48px; /* h-12 */
  border-radius: 16px; /* rounded-2xl */
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-icon.inactive {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.category-icon.active {
  background: linear-gradient(to bottom, #3b82f6, #1d4ed8);
  box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.25);
  transform: scale(1.05);
}

.category-label {
  font-size: 10px; /* text-[10px] */
  font-weight: 500;
  color: white;
}

.category-dot {
  width: 4px;
  height: 4px;
  background: #60a5fa; /* blue-400 */
  border-radius: 50%;
  position: absolute;
  bottom: -8px;
}
```

**JavaScript Interaction:**
```javascript
function handleCategoryClick(element) {
  const container = element.parentElement;
  Array.from(container.children).forEach(child => {
    const icon = child.firstElementChild;
    const dot = child.querySelector('.category-dot');

    if (child === element) {
      // Active state
      child.style.opacity = '1';
      icon.className = 'w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/25 transform scale-105';

      if (!dot) {
        const newDot = document.createElement('div');
        newDot.className = 'category-dot';
        child.appendChild(newDot);
      }
    } else {
      // Inactive state
      child.style.opacity = '0.5';
      icon.className = 'w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white text-xl';
      if (dot) dot.remove();
    }
  });
}
```

### 14. Calendar Component

```css
.calendar-card {
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 32px; /* rounded-[2rem] */
  padding: 16px; /* p-4 */
  position: relative;
  overflow: hidden;
}

.calendar-glow {
  position: absolute;
  top: 0;
  right: 0;
  width: 128px;
  height: 128px;
  background: rgba(59, 130, 246, 0.2);
  filter: blur(50px);
  z-index: -10;
}

.calendar-header {
  text-align: center;
  margin-bottom: 24px;
}

.calendar-title {
  color: white;
  font-size: 16px; /* text-base */
  font-weight: 500;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 24px 0; /* gap-y-6 */
  text-align: center;
}

.calendar-day-header {
  font-size: 10px; /* text-[10px] */
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
  text-transform: uppercase;
}

.calendar-day {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  position: relative;
  z-index: 10;
}

.calendar-day.disabled {
  color: rgba(255, 255, 255, 0.2);
}

.calendar-day.selected {
  position: relative;
}

.calendar-day.selected-start::before {
  content: '';
  position: absolute;
  inset-y: 0;
  left: 0;
  right: -50%;
  background: #2563eb;
  border-radius: 9999px 0 0 9999px;
  z-index: -10;
}

.calendar-day.selected-middle::before {
  content: '';
  position: absolute;
  inset-y: 0;
  left: -50%;
  right: -50%;
  background: #2563eb;
  z-index: -10;
}

.calendar-day.selected-end::before {
  content: '';
  position: absolute;
  inset-y: 0;
  left: -50%;
  right: 0;
  background: #2563eb;
  border-radius: 0 9999px 9999px 0;
  box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.5);
  z-index: -10;
}
```

### 15. Carousel Indicators

```css
.carousel-indicators {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 6px; /* gap-1.5 */
}

.carousel-dot {
  width: 6px; /* w-1.5 */
  height: 6px; /* h-1.5 */
  border-radius: 50%;
}

.carousel-dot.active {
  background: white;
}

.carousel-dot.inactive {
  background: rgba(255, 255, 255, 0.3);
}
```

### 16. Avatar with Gradient Border

```css
.avatar-container {
  width: 48px; /* w-12 */
  height: 48px; /* h-12 */
  border-radius: 50%;
  background: linear-gradient(135deg, #f472b6, #9333ea); /* from-pink-400 to-purple-600 */
  padding: 1px;
  transition: transform 200ms;
}

.avatar-container:active {
  transform: scale(0.95);
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #1c1e26;
}
```

**HTML Structure:**
```html
<div class="avatar-container">
  <img src="avatar.jpg" alt="Profile" class="avatar-image">
</div>
```

### 17. Icon System (Solar + Iconify)

**Icons:** Solar icon set via Iconify

**CDN:**
```html
<script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
```

**Usage:**
```html
<!-- Iconify component -->
<iconify-icon icon="solar:heart-linear" class="text-xl"></iconify-icon>

<!-- Inline SVG (recommended for RN) -->
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
  <path fill="currentColor" d="..."/>
</svg>
```

**Common Icons:**
| Icon Name | Usage |
|-----------|-------|
| `solar:heart-linear` | Favorite |
| `solar:heart-bold` | Favorite (filled) |
| `solar:map-point-linear` | Location |
| `solar:magnifer-linear` | Search |
| `solar:bell-linear` | Notifications |
| `solar:user-linear` | Profile |
| `solar:settings-linear` | Settings |
| `solar:calendar-linear` | Date |
| `solar:star-bold` | Rating |

### 18. Hide Scrollbar

```css
/* Hide for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
```

**Tailwind:**
```html
<div class="overflow-x-auto no-scrollbar">
  <!-- content -->
</div>
```

---

## Shadow System

### Shadow Levels

| Type | Tailwind Class | CSS Value | Usage |
|------|----------------|-----------|-------|
| Extra Large | `shadow-2xl` | `0 25px 50px -12px rgba(0, 0, 0, 0.25)` | Phone containers, floating navigation |
| Large | `shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)` | Buttons, cards |
| Medium | `shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)` | Raised elements |
| Inner | `shadow-inner` | `inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)` | Active icon backgrounds |

### Colored Shadows

| Color | Tailwind Class | Usage |
|-------|----------------|-------|
| Blue | `shadow-blue-600/30` | Primary buttons, active states |
| Blue Light | `shadow-blue-500/25` | Active icon glows |
| Blue Dark | `shadow-blue-900/20` | Subtle card elevation |
| Blue Medium | `shadow-blue-900/40` | Badge shadows |
| Blue Glow | `shadow-blue-500/50` | Calendar selection glow |

### Shadow Usage Guidelines

```css
/* Container shadow */
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* Button with colored shadow */
box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);

/* Subtle card shadow */
box-shadow: 0 10px 15px -3px rgba(30, 64, 175, 0.2);

/* Toggle dot shadow */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

/* Calendar selection glow */
box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.5);
```

---

## Animations & Transitions

### Transition Durations

| Type | Duration | Tailwind Class | Usage |
|------|----------|----------------|-------|
| Fast | 150ms | `duration-150` | Color changes |
| Standard | 200ms | `duration-200` | Scale, button clicks |
| Medium | 300ms | `duration-300` | Background color, borders, most transitions |
| Slow | 500ms | `duration-500` | Complex transitions |
| Extra Slow | 700ms | `duration-700` | Image scaling, rotations |

### Transition Properties

```css
/* All properties */
transition: all 300ms;

/* Transform only */
transition: transform 300ms;

/* Opacity only */
transition: opacity 300ms;

/* Colors only */
transition: color 200ms, background-color 200ms, border-color 200ms;
```

### Common Animations

**1. Scale Animations:**
```css
/* Button press - slight reduction */
.active-scale:active {
  transform: scale(0.98); /* active:scale-[0.98] */
}

/* Icon button press - more pronounced */
.active-scale-sm:active {
  transform: scale(0.9); /* active:scale-90 */
}

/* Avatar press */
.active-scale-md:active {
  transform: scale(0.95); /* active:scale-95 */
}

/* Card image hover - growth */
.hover-scale:hover {
  transform: scale(1.05); /* hover:scale-105 */
}

/* Icon hover - subtle growth */
.hover-scale-lg:hover {
  transform: scale(1.1); /* hover:scale-110 */
}
```

**2. Translation Animations:**
```css
/* Arrow right movement on hover */
.arrow-hover:hover {
  transform: translateX(2px); /* hover:translate-x-0.5 */
}

/* Center positioning */
.center-x {
  transform: translateX(-50%); /* -translate-x-1/2 */
}

.center-y {
  transform: translateY(-50%); /* -translate-y-1/2 */
}

.center-both {
  transform: translate(-50%, -50%);
}
```

**3. Rotation Animations:**
```css
/* Rotate 180° on hover */
.rotate-hover:hover {
  transform: rotate(180deg); /* hover:rotate-180 */
  transition: transform 700ms; /* duration-700 */
}
```

**4. Opacity Transitions:**
```css
/* Fade in on hover */
.fade-hover {
  opacity: 0.5; /* opacity-50 */
  transition: opacity 300ms;
}

.fade-hover:hover {
  opacity: 1; /* hover:opacity-100 */
}
```

**5. Image Scale on Card Hover:**
```css
.card-image {
  transition: transform 700ms;
}

.card:hover .card-image {
  transform: scale(1.05); /* group-hover:scale-105 */
}
```

### Interaction Feedback

| State | Effect | Duration |
|-------|--------|----------|
| Hover | Background lightens, scale increases, arrow moves | 200-300ms |
| Active | Scale decreases to 98%, background further lightens | 150-200ms |
| Focus | Blue ring appears (2px) | 200ms |
| Disabled | Opacity reduces to 50% | - |

### Focus States

```css
.focus-visible-ring:focus-visible {
  outline: none; /* focus:outline-none */
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5); /* focus-visible:ring-2 ring-blue-500/50 */
}

.focus-visible-ring-light:focus-visible {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2); /* focus-visible:ring-2 ring-white/20 */
}
```

---

## Border Radius System (G2 Elliptical Corners)

### Overview

This design system uses **G2 Elliptical Corners** (椭圆圆角) for smoother curvature transitions. G2 corners provide better visual continuity than standard rounded corners.

**G2 Corner Formula:** `border-radius: horizontal / vertical`

### G2 Radius Scale

| Type | Horizontal | Vertical | CSS | Tailwind Class | Usage |
|------|------------|----------|-----|----------------|-------|
| Extra Small | 4px | 5px | `4px / 5px` | `rounded-[4px/5px]` | Small elements |
| Small | 8px | 10px | `8px / 10px` | `rounded-[8px/10px]` | Medium elements |
| Medium | 12px | 14px | `12px / 14px` | `rounded-[12px/14px]` | Cards, buttons |
| Large | 16px | 20px | `16px / 20px` | `rounded-[16px/20px]` | List items, icons |
| Extra Large | 24px | 28px | `24px / 28px` | `rounded-[24px/28px]` | Large cards |
| 2XL | 32px | 40px | `32px / 40px` | `rounded-[32px/40px]` | Content cards |
| 3XL | 40px | 48px | `40px / 48px` | `rounded-[40px/48px]` | Large panels |
| Phone Frame | 48px | 56px | `48px / 56px` | `rounded-[48px/56px]` | Phone containers |
| Full | 9999px | 9999px | `9999px` | `rounded-full` | Circular elements |

### G2 CSS Classes

```css
/* G2 Elliptical Corner System */
.g2-xs   { border-radius: 4px / 5px; }
.g2-sm   { border-radius: 8px / 10px; }
.g2-md   { border-radius: 12px / 14px; }
.g2-lg   { border-radius: 16px / 20px; }
.g2-xl   { border-radius: 24px / 28px; }
.g2-2xl  { border-radius: 32px / 40px; }
.g2-3xl  { border-radius: 40px / 48px; }
.g2-phone { border-radius: 48px / 56px; }
```

### Tailwind Config Extension

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      borderRadius: {
        'g2-xs': '4px / 5px',
        'g2-sm': '8px / 10px',
        'g2-md': '12px / 14px',
        'g2-lg': '16px / 20px',
        'g2-xl': '24px / 28px',
        'g2-2xl': '32px / 40px',
        'g2-3xl': '40px / 48px',
        'g2-phone': '48px / 56px',
      },
    },
  },
}
```

### Usage with NativeWind (React Native)

```typescript
// In global.css or tailwind.config.js
module.exports = {
  theme: {
    extend: {
      borderRadius: {
        'g2-xs': 4,
        'g2-sm': 8,
        'g2-md': 12,
        'g2-lg': 16,
        'g2-xl': 24,
        'g2-2xl': 32,
        'g2-3xl': 40,
        'g2-phone': 48,
      },
    },
  },
}

// React Native usage (Note: RN doesn't support elliptical corners natively,
// use larger radius for similar effect)
<View className="rounded-g2-2xl bg-white/10 p-4">
  {/* Content */}
</View>
```

### Partial Border Radius

```css
/* Top corners only */
border-radius: 32px 32px 0 0 / 40px 40px 0 0;

/* Left side pill shape */
border-radius: 9999px 0 0 9999px;

/* Right side pill shape */
border-radius: 0 9999px 9999px 0;
```

### Usage Guidelines

- **Small interactive elements:** Use `rounded-full` (circular buttons, icons)
- **Medium components:** Use `.g2-lg` to `.g2-xl` (cards, list items)
- **Large containers:** Use `.g2-2xl` to `.g2-phone` (phone frames, panels)
- **Pills and badges:** Always use `rounded-full`

### G2 vs Standard Corners Comparison

| Feature | Standard (G1) | G2 Elliptical |
|---------|---------------|---------------|
| Curvature | Constant radius | Variable radius |
| Transition | Visible corner point | Smooth transition |
| Visual feel | Geometric | Organic, softer |
| iOS similarity | 60% | 75% |
| Browser support | 100% | 100% |

---

## Border Styles

### Border Width

- **Default:** 1px
- **Avatar border:** 2px

### Border Colors

| Type | Color | Opacity | Tailwind Class | Usage |
|------|-------|---------|----------------|-------|
| Primary | White | 10% | `border-white/10` | Container outer borders |
| Secondary | White | 5% | `border-white/5` | Input fields, icon containers |
| Accent | Blue | 30% | `border-blue-500/30` or `ring-blue-500/30` | Focus states |
| Avatar | Dark Space | 100% | `border-[#1c1e26]` | Avatar inner border |

### Border Examples

```css
/* Container border */
border: 1px solid rgba(255, 255, 255, 0.1);

/* Input border */
border: 1px solid rgba(255, 255, 255, 0.05);

/* Divider line */
height: 1px;
background: rgba(255, 255, 255, 0.05);
margin: 0 24px; /* mx-6 */

/* Avatar gradient border */
background: linear-gradient(135deg, #f472b6, #9333ea); /* from-pink-400 to-purple-600 */
padding: 1px;
border-radius: 9999px;
```

---

## Special Effects

### 1. Backdrop Blur

```css
/* Extra strong blur - main containers */
backdrop-filter: blur(24px); /* backdrop-blur-2xl */

/* Medium blur - badges, overlays */
backdrop-filter: blur(12px); /* backdrop-blur-md */

/* Strong blur - panels, navigation */
backdrop-filter: blur(16px); /* backdrop-blur-xl */
```

### 2. Element Blur (Filter Blur)

```css
/* Background glow effects */
filter: blur(100px); /* blur-[100px] */  /* Medium glow */
filter: blur(120px); /* blur-[120px] */  /* Large glow */
filter: blur(50px);  /* blur-[50px] */   /* Small glow */
```

### 3. Gradient Effects

**Linear Gradients:**
```css
/* Vertical - Black overlay on images */
background: linear-gradient(to top,
  rgba(0, 0, 0, 0.9) 0%,
  rgba(0, 0, 0, 0.2) 50%,
  transparent 100%);

/* Horizontal - Button gradient */
background: linear-gradient(to right,
  rgba(59, 130, 246, 0.8) 0%,
  rgba(59, 130, 246, 0.8) 100%);

/* Vertical - Card background gradient */
background: linear-gradient(to bottom,
  rgba(255, 255, 255, 0.05) 0%,
  transparent 100%);

/* Radial - Avatar border gradient */
background: linear-gradient(135deg, #f472b6, #9333ea);
```

**Gradient Overlays:**
```css
/* Color overlay with blend mode */
background: linear-gradient(to right,
  rgba(168, 85, 247, 0.2),
  rgba(236, 72, 153, 0.2));
mix-blend-mode: overlay;
```

### 4. Opacity Layers

| Element | Opacity | Usage |
|---------|---------|-------|
| Main container background | 60% (0.6) | Phone frames, main containers |
| Interactive element background | 5% (0.05) | Buttons, inputs, icon containers |
| Hover state background | 10% (0.1) | Hover feedback |
| Active state background | 20% (0.2) | Active feedback, badges |
| Overlay backgrounds | 40% (0.4) | Badges, overlays |

---

## JavaScript Interaction Examples

### 1. Category Selector Click Handler

```javascript
window.handleCategoryClick = function(el) {
  const container = el.parentElement;
  Array.from(container.children).forEach(child => {
    const icon = child.firstElementChild;
    const dot = child.lastElementChild.classList.contains('dot-indicator') ? child.lastElementChild : null;

    if (child === el) {
      // Active State
      child.className = "flex flex-col items-center gap-1 relative cursor-pointer transition-all duration-300 opacity-100";
      icon.className = "w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/25 transition-all duration-300 transform scale-105";

      if (!dot) {
        const newDot = document.createElement('div');
        newDot.className = "dot-indicator w-1 h-1 bg-blue-400 rounded-full absolute -bottom-2 transition-all duration-300 animate-in fade-in zoom-in";
        child.appendChild(newDot);
      }
    } else {
      // Inactive State
      child.className = "flex flex-col gap-1 hover:opacity-100 transition opacity-50 gap-x-1 gap-y-1 items-center cursor-pointer duration-300";
      icon.className = "flex text-xl text-white bg-white/5 w-12 h-12 border-white/5 border rounded-2xl items-center justify-center transition-all duration-300";

      if (dot) dot.remove();
    }
  });
}
```

### 2. Bottom Navigation Click Handler

```javascript
window.handleNavClick = function(event) {
  const nav = event.currentTarget;
  const target = event.target.closest('button');

  if (target) {
    nav.querySelectorAll('button').forEach(btn => {
      btn.className = 'w-12 h-12 rounded-full flex items-center justify-center text-white/50 hover:text-white transition';
    });

    target.className = 'w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30';
  }
}
```

### 3. Toggle Switch Handler

```javascript
window.handleToggleClick = function(button) {
  const dot = button.querySelector('.toggle-dot');
  const track = button.querySelector('.toggle-track');

  dot.classList.toggle('translate-x-full');
  dot.classList.toggle('bg-white');
  dot.classList.toggle('bg-blue-500');
  track.classList.toggle('bg-white/10');
  track.classList.toggle('bg-blue-500/20');
}
```

**Usage:**
```html
<button onclick="window.handleToggleClick(this)">
  <div class="toggle-track w-12 h-7 bg-white/10 rounded-full relative">
    <div class="toggle-dot absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full shadow-lg transition-all duration-300"></div>
  </div>
</button>
```

---

## React Native Adaptation

### Icon System in React Native

```typescript
// Using react-native-svg
import Svg, { Path } from 'react-native-svg';

function HeartIcon({ size = 20, color = 'white' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 9.137C2 14 6.02 16.591 8.962 18.911C10 19.729 11 20.5 12 20.5s2-.77 3.038-1.59C17.981 16.592 22 14 22 9.138S16.5.825 12 5.501C7.5.825 2 4.274 2 9.137"
        fill={color}
      />
    </Svg>
  );
}
```

### Hide Scrollbar in React Native

```typescript
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  showsVerticalScrollIndicator={false}
>
  {/* content */}
</ScrollView>
```

### Backdrop Blur in React Native

```typescript
import { BlurView } from '@react-native-community/blur';

function GlassCard() {
  return (
    <View style={styles.card}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="dark"
        blurAmount={24}
      />
      {/* content */}
    </View>
  );
}
```

### Toggle Switch in React Native

```typescript
import { useState } from 'react';
import { Pressable, Animated } from 'react-native';

function ToggleSwitch() {
  const [isOn, setIsOn] = useState(false);
  const translateX = new Animated.Value(isOn ? 0 : 20);

  const handlePress = () => {
    setIsOn(!isOn);
    Animated.spring(translateX, {
      toValue: isOn ? 0 : 20,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable onPress={handlePress} style={styles.track}>
      <Animated.View style={[styles.dot, { transform: [{ translateX }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 4,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
  },
});
```

---

## Layout Patterns

### Z-Index Scale

| Level | Value | Usage |
|-------|-------|-------|
| Base | 0 | Default elements |
| Elevated | 10 | Scrollable content areas |
| Content | 20 | Main interactive content |
| Navigation | 30 | Bottom navigation, fixed elements |
| Top | 40 | Home indicator, overlay elements |

### Flexbox Patterns

**Horizontal Space Between:**
```css
display: flex;
justify-content: space-between;
align-items: center;
```

**Vertical Stack:**
```css
display: flex;
flex-direction: column;
gap: 4px; /* space-y-1 */
```

**Centered Content:**
```css
display: flex;
align-items: center;
justify-content: center;
```

### Grid Patterns

**Responsive 3-Column Grid:**
```css
display: grid;
grid-template-columns: 1fr;
gap: 48px;

@media (min-width: 1024px) {
  grid-template-columns: repeat(3, 1fr);
}
```

**7-Column Grid (Calendar):**
```css
display: grid;
grid-template-columns: repeat(7, 1fr);
gap: 0 0; /* gap-y-6 */
text-align: center;
```

---

## Responsive Design

### Breakpoints

| Breakpoint | Min Width | Tailwind Prefix | Target Devices |
|-----------|-----------|-----------------|----------------|
| Mobile | 0px | (default) | All mobile devices |
| Tablet | 640px | `sm:` | Large phones, tablets |
| Laptop | 1024px | `lg:` | Laptops, desktops |
| Desktop | 1280px | `xl:` | Large desktops |

### Responsive Patterns

**Hide scrollbar on mobile:**
```css
/* Hide for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
```

**Responsive grid:**
```html
<div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
  <!-- Changes from 1 column to 3 columns at lg breakpoint -->
</div>
```

---

## Accessibility

### Focus Management

```css
/* Visible focus ring for keyboard navigation */
.focusable:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
```

### ARIA Labels

```html
<!-- Icon buttons must have aria-labels -->
<button aria-label="Close menu">
  <icon><!-- SVG icon --></icon>
</button>

<button aria-label="Like this listing">
  <icon><!-- Heart icon --></icon>
</button>
```

### Interaction States

All interactive elements must have:
- ✅ Hover state (visual feedback)
- ✅ Active state (click feedback)
- ✅ Focus state (keyboard navigation)
- ✅ Clear visual differentiation

### Color Contrast

- Primary text on dark background: 100% opacity (WCAG AAA)
- Secondary text: Minimum 50% opacity
- Interactive elements: Clear visual indicators beyond color

---

## Best Practices

### 1. Depth & Hierarchy

- Use `z-index` to manage stacking order (10, 20, 30, 40)
- Background elements should have `pointer-events: none`
- Create depth with backdrop blur and shadows
- Use gradients to enhance perceived depth

### 2. Performance

- Use `transform` for animations instead of `top/left`
- Limit backdrop blur usage to improve performance
- Add `will-change` sparingly for animation optimization
- Use `contain` for complex components

### 3. Visual Consistency

- Maintain consistent border radius proportions
- Follow the unified shadow system
- Keep consistent spacing rhythm (4px base unit)
- Use semantic naming for color variables

### 4. Interaction Design

- Provide immediate visual feedback (max 150ms)
- Use appropriate animation durations (200-300ms standard)
- Follow user-expected behavior patterns
- Make interactive areas at least 44×44px

### 5. Code Organization

- Group related styles logically
- Use Tailwind utility classes consistently
- Create reusable component classes for patterns
- Document custom values and overrides

---

## Tailwind CSS Configuration Reference

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'dark': '#1c1e26',
        'dark-light': '#181a22',
        'blue-primary': '#3b82f6',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      backdropBlur: {
        '2xl': '24px',
      },
      blur: {
        '100': '100px',
        '120': '120px',
      },
      spacing: {
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-in-out',
        'zoom-in': 'zoomIn 300ms ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        zoomIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
```

---

## Design Tokens Summary

```css
:root {
  /* Colors */
  --color-dark: #1c1e26;
  --color-dark-light: #181a22;
  --color-blue-primary: #3b82f6;
  --color-blue-600: #2563eb;
  --color-blue-700: #1d4ed8;

  /* Opacity Levels */
  --opacity-primary: 1;
  --opacity-secondary: 0.8;
  --opacity-tertiary: 0.5;
  --opacity-disabled: 0.4;
  --opacity-placeholder: 0.3;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --radius-2xl: 48px;
  --radius-full: 9999px;

  /* Blur */
  --blur-sm: 50px;
  --blur-md: 100px;
  --blur-lg: 120px;
  --blur-backdrop: 24px;

  /* Transitions */
  --transition-fast: 150ms;
  --transition-base: 200ms;
  --transition-slow: 300ms;
  --transition-slower: 700ms;
}
```

---

## Resources

- **Font:** [Google Fonts - Inter](https://fonts.google.com/specimen/Inter)
- **Icons:** Iconify with Solar icon set
- **CSS Framework:** Tailwind CSS v3.x
- **Design Inspiration:** Glassmorphism, iOS design patterns

---

*This design system is generated from actual code analysis to ensure design consistency and development efficiency. All values are extracted from the implemented components.*
