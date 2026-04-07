# 玻璃拟态移动端 UI 设计风格指南

## 📋 概述

本设计采用现代玻璃拟态（Glassmorphism）设计语言，以深色主题为基础，通过半透明效果、背景模糊、柔和渐变和精心设计的阴影系统，创造出具有层次感和未来感的移动端界面。

**核心设计理念：**
- 玻璃质感的半透明组件
- 深色背景配合渐变光晕
- 精细的层次感与空间关系
- 流畅的微交互动画

---

## 🎨 配色方案

### 主要颜色

| 用途 | 颜色名称 | HEX 值 | RGB 值 | 使用场景 |
|------|---------|--------|--------|---------|
| 主背景 | 深空灰 | `#1c1e26` | rgb(28, 30, 38) | 容器背景、主色调 |
| 强调色 | 钴蓝 | `#3b82f6` | rgb(59, 130, 246) | 按钮激活态、选中状态、交互元素 |
| 渐变蓝 | 渐变蓝 | `#2563eb` → `#1d4ed8` | - | 图标激活态、渐变背景 |

### 文本颜色

| 类型 | 透明度 | 用途 |
|------|--------|------|
| 主文本 | `100%` | 标题、重要信息 |
| 次要文本 | `80%` | 正文、常规内容 |
| 辅助文本 | `50%` | 说明文字、次要信息 |
| 禁用文本 | `40%` | 标签、提示文字 |
| 占位符文本 | `30%` | 搜索框占位符 |

### 功能色

| 功能 | 颜色 | 使用场景 |
|------|------|---------|
| 成功/激活 | 蓝色 `blue-600` | 激活按钮、选中项 |
| 警告 | 黄色 `yellow-400` | 星标评分 |
| 错误/喜欢 | 粉色 `pink-500` | 收藏按钮 |
| 中性 | 白色（不同透明度） | 边框、背景、图标 |

### 渐变背景

**背景光晕效果：**
```css
/* 蓝色光晕 */
background: rgba(59, 130, 246, 0.2)
blur: 120px

/* 紫色光晕 */
background: rgba(147, 51, 234, 0.2)
blur: 120px

/* 粉色光晕 */
background: rgba(236, 72, 153, 0.1)
blur: 100px
```

---

## 🔤 字体排版

### 字体家族

**主字体：** Inter
- **备用字体：** 系统无衬线字体（system-ui, sans-serif）
- **字体来源：** Google Fonts
- **字重范围：** 300-600

### 字体大小系统

| 用途 | 大小 | Tailwind 类 | 行高 |
|------|------|------------|------|
| 超小标签 | 10px | `text-[10px]` | 默认 |
| 小号文本 | 12px | `text-xs` | 默认 |
| 正文 | 16px | `text-base` | 默认 |
| 副标题 | 18px | `text-lg` | 默认 |
| 标题 | 20px | `text-xl` | 默认 |
| 大标题 | 24px | `text-2xl` | 默认 |

### 字重规范

| 字重值 | 名称 | 使用场景 |
|--------|------|---------|
| 300 | Light | 装饰性文字 |
| 400 | Normal | 正文内容 |
| 500 | Medium | 强调文本、标签 |
| 600 | Semi-Bold | 标题、按钮 |

### 字体特性

- **字间距（tracking）：**
  - 标题：`tracking-tight` (-0.025em)
  - 标签：`tracking-wide` (0.025em) 或 `tracking-wider` (0.05em)
  - 大写标签：`uppercase`

---

## 📏 间距系统

### 基础间距单位

采用 **4px** 为基础间距单位，遵循 4 点网格系统。

### 常用间距值

| 名称 | 像素值 | Tailwind 类 | 使用场景 |
|------|--------|------------|---------|
| 超小 | 4px | `p-1`, `gap-1` | 图标间距、紧凑元素 |
| 小 | 8px | `p-2`, `gap-2` | 图标与文本间距 |
| 中小 | 12px | `p-3`, `gap-3` | 列表项内边距 |
| 中 | 16px | `p-4`, `gap-4` | 卡片内边距、元素间距 |
| 中大 | 20px | `p-5` | 区域内边距 |
| 大 | 24px | `p-6` | 容器内边距 |
| 超大 | 32px | `p-8` | 页面边缘间距 |

### 组件间距

- **卡片之间：** `gap-6` (24px)
- **列表项之间：** `space-y-1` (4px)
- **图标与文本：** `gap-3` (12px) 或 `gap-4` (16px)
- **按钮内边距：** `px-4 py-3` (16px 12px)

---

## 🧩 组件样式

### 1. 容器（手机外壳）

```css
/* 主容器 */
background: rgba(28, 30, 38, 0.6) /* #1c1e26/60 */
border: 1px solid rgba(255, 255, 255, 0.1)
border-radius: 3rem (48px)
backdrop-filter: blur(24px) /* backdrop-blur-2xl */
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)
```

### 2. 按钮

**主要按钮（激活态）：**
```css
background: linear-gradient(to right, rgba(59, 130, 246, 0.8), rgba(59, 130, 246, 0.8))
color: white
border-radius: 1rem (16px)
padding: 12px 32px
font-weight: 500
font-size: 16px
box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2)
```

**次要按钮：**
```css
background: rgba(255, 255, 255, 0.05)
border: 1px solid rgba(255, 255, 255, 0.05)
border-radius: 9999px (full)
color: rgba(255, 255, 255, 0.7)
hover:background: rgba(255, 255, 255, 0.1)
```

**图标按钮：**
```css
width: 48px (w-12)
height: 48px (h-12)
background: rgba(255, 255, 255, 0.05)
border-radius: 50%
display: flex
align-items: center
justify-content: center
```

### 3. 输入框

**搜索框：**
```css
height: 40px (h-10)
background: rgba(255, 255, 255, 0.05)
border: 1px solid rgba(255, 255, 255, 0.05)
border-radius: 9999px (full)
padding: 0 16px (px-4)
color: rgba(255, 255, 255, 0.5)
```

### 4. 卡片

**内容卡片：**
```css
aspect-ratio: 4/5
border-radius: 2rem (32px)
overflow: hidden
background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.2), transparent)
```

**日历卡片：**
```css
background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent)
border: 1px solid rgba(255, 255, 255, 0.05)
border-radius: 2rem (32px)
padding: 16px (p-4)
```

### 5. 列表项

```css
padding: 12px (p-3)
border-radius: 16px (rounded-2xl)
hover:background: rgba(255, 255, 255, 0.05)
active:background: rgba(255, 255, 255, 0.1)
active:scale: 0.98
transition: all
```

### 6. 徽章（Badge）

```css
background: rgba(0, 0, 0, 0.4)
backdrop-filter: blur(12px) (backdrop-blur-md)
padding: 6px 12px (px-3 py-1.5)
border-radius: 9999px (full)
border: 1px solid rgba(255, 255, 255, 0.1)
font-size: 12px
font-weight: 500
```

**通知徽章：**
```css
background: #2563eb (blue-600)
color: white
font-size: 10px
padding: 2px 8px (px-2 py-0.5)
border-radius: 9999px (full)
box-shadow: 0 10px 15px -3px rgba(30, 64, 175, 0.4)
```

---

## 🧩 扩展组件

### 7. 状态栏

```css
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 8px 24px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  font-weight: 500;
  z-index: 20;
  user-select: none;
}
```

**HTML 结构：**
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

### 8. 分类选择器

```css
.category-container {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 4px 20px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.5;
  cursor: pointer;
  transition: opacity 300ms;
}

.category-item.active {
  opacity: 1;
}

.category-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
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
  font-size: 10px;
  font-weight: 500;
  color: white;
}

.category-dot {
  width: 4px;
  height: 4px;
  background: #60a5fa;
  border-radius: 50%;
  position: absolute;
  bottom: -8px;
}
```

**JavaScript 交互：**
```javascript
function handleCategoryClick(element) {
  const container = element.parentElement;
  Array.from(container.children).forEach(child => {
    const icon = child.firstElementChild;
    const dot = child.querySelector('.category-dot');

    if (child === element) {
      // 激活状态
      child.style.opacity = '1';
      icon.className = 'w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/25 transform scale-105';

      if (!dot) {
        const newDot = document.createElement('div');
        newDot.className = 'category-dot';
        child.appendChild(newDot);
      }
    } else {
      // 非激活状态
      child.style.opacity = '0.5';
      icon.className = 'w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white text-xl';
      if (dot) dot.remove();
    }
  });
}
```

### 9. 日历组件

```css
.calendar-card {
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 32px;
  padding: 16px;
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

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 24px 0;
  text-align: center;
}

.calendar-day {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  position: relative;
}

/* 选中范围样式 */
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

### 10. 轮播指示器

```css
.carousel-indicators {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 6px;
}

.carousel-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.carousel-dot.active {
  background: white;
}

.carousel-dot.inactive {
  background: rgba(255, 255, 255, 0.3);
}
```

### 11. 渐变边框头像

```css
.avatar-container {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f472b6, #9333ea);
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

**HTML 结构：**
```html
<div class="avatar-container">
  <img src="avatar.jpg" alt="Profile" class="avatar-image">
</div>
```

### 12. 图标系统（Solar + Iconify）

**图标库：** Solar 图标集（通过 Iconify）

**CDN 引入：**
```html
<script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
```

**使用方式：**
```html
<!-- Iconify 组件方式 -->
<iconify-icon icon="solar:heart-linear" class="text-xl"></iconify-icon>

<!-- 内联 SVG（RN 推荐方式） -->
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
  <path fill="currentColor" d="..."/>
</svg>
```

**常用图标：**
| 图标名称 | 用途 |
|---------|------|
| `solar:heart-linear` | 收藏（线框） |
| `solar:heart-bold` | 收藏（填充） |
| `solar:map-point-linear` | 位置 |
| `solar:magnifer-linear` | 搜索 |
| `solar:bell-linear` | 通知 |
| `solar:user-linear` | 个人中心 |
| `solar:settings-linear` | 设置 |
| `solar:calendar-linear` | 日期 |
| `solar:star-bold` | 评分 |

### 13. 隐藏滚动条

```css
/* Chrome, Safari, Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* IE, Edge, Firefox */
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

**Tailwind 用法：**
```html
<div class="overflow-x-auto no-scrollbar">
  <!-- 内容 -->
</div>
```

### 14. Home Indicator（底部横条）

```css
.home-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 128px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 9999px;
  pointer-events: none;
  z-index: 40;
}
```

---

## 🌓 阴影系统

### 阴影层级

| 类型 | CSS | 使用场景 |
|------|-----|---------|
| 容器阴影 | `shadow-2xl` | 手机容器、浮动导航 |
| 按钮阴影 | `shadow-lg shadow-blue-600/30` | 激活按钮、主操作按钮 |
| 内阴影 | `shadow-inner` | 激活态图标背景 |
| 发光效果 | `shadow-blue-500/25` | 激活态图标 |
| 柔和阴影 | `shadow-blue-900/20` | 卡片轻微浮起效果 |

### 阴影参数详解

```css
/* 超大阴影 - 主容器 */
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)

/* 大阴影 - 按钮 */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05)

/* 蓝色发光阴影 */
box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3)

/* 内阴影 */
box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)
```

---

## ✨ 动画与过渡

### 过渡时长

| 类型 | 时长 | Tailwind 类 | 使用场景 |
|------|------|------------|---------|
| 快速 | 150ms | `duration-150` | 颜色变化 |
| 标准 | 200ms | `duration-200` | 缩放、按钮点击 |
| 中等 | 300ms | `duration-300` | 背景色、边框 |
| 慢速 | 500ms | `duration-500` | 复杂过渡 |
| 超慢 | 700ms | `duration-700` | 图片缩放、旋转 |

### 过渡效果

**缓动函数：**
- 默认：`transition-default` (cubic-bezier(0.4, 0, 0.2, 1))
- 弹性：`transition-all` (所有属性)

### 常用动画

**1. 缩放动画：**
```css
/* 点击缩放 */
active:scale-[0.98]  /* 按钮点击 */
active:scale-90      /* 图标按钮点击 */
active:scale-95      /* 头像点击 */

/* 悬停放大 */
hover:scale-105      /* 卡片图片 */
hover:scale-110      /* 图标悬停 */
```

**2. 平移动画：**
```css
/* 箭头右移 */
hover:translate-x-0.5

/* 居中定位 */
-translate-x-1/2
-translate-y-1/2
```

**3. 旋转动画：**
```css
/* 旋转180度 */
hover:rotate-180
duration-700
```

**4. 透明度变化：**
```css
/* 悬停显示 */
opacity-50
hover:opacity-100
transition-opacity
duration-300
```

**5. 图片缩放：**
```css
/* 卡片图片悬停缩放 */
group-hover:scale-105
transition-transform
duration-700
```

### 交互反馈

- **悬停：** 背景变亮、缩放、箭头移动
- **激活：** 缩小至 98%、背景进一步变亮
- **聚焦：** `focus-visible:ring-2` 蓝色光环

---

## ⭕ 圆角系统（G2 椭圆圆角）

### 概述

本设计系统采用 **G2 椭圆圆角**（Elliptical Corners），提供比普通圆角更平滑的曲率过渡。

**G2 圆角公式：** `border-radius: 水平 / 垂直`

### G2 圆角等级

| 类型 | 水平 | 垂直 | CSS | Tailwind 类名 | 使用场景 |
|------|------|------|-----|--------------|---------|
| 超小 | 4px | 5px | `4px / 5px` | `rounded-[4px/5px]` | 小元素 |
| 小 | 8px | 10px | `8px / 10px` | `rounded-[8px/10px]` | 中等元素 |
| 中 | 12px | 14px | `12px / 14px` | `rounded-[12px/14px]` | 卡片、按钮 |
| 大 | 16px | 20px | `16px / 20px` | `rounded-[16px/20px]` | 列表项、图标 |
| 超大 | 24px | 28px | `24px / 28px` | `rounded-[24px/28px]` | 大卡片 |
| 2XL | 32px | 40px | `32px / 40px` | `rounded-[32px/40px]` | 内容卡片 |
| 3XL | 40px | 48px | `40px / 48px` | `rounded-[40px/48px]` | 大面板 |
| 手机外壳 | 48px | 56px | `48px / 56px` | `rounded-[48px/56px]` | 手机容器 |
| 圆形 | 9999px | 9999px | `9999px` | `rounded-full` | 圆形元素 |

### G2 CSS 类名

```css
/* G2 椭圆圆角系统 */
.g2-xs   { border-radius: 4px / 5px; }
.g2-sm   { border-radius: 8px / 10px; }
.g2-md   { border-radius: 12px / 14px; }
.g2-lg   { border-radius: 16px / 20px; }
.g2-xl   { border-radius: 24px / 28px; }
.g2-2xl  { border-radius: 32px / 40px; }
.g2-3xl  { border-radius: 40px / 48px; }
.g2-phone { border-radius: 48px / 56px; }
```

### Tailwind 配置扩展

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

### NativeWind 配置（React Native）

```typescript
// 注意：React Native 不支持椭圆圆角
// 使用较大的圆角值模拟类似效果

// tailwind.config.js (NativeWind)
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

// React Native 使用
<View className="rounded-g2-2xl bg-white/10 p-4">
  {/* 内容 */}
</View>
```

### 部分圆角

```css
/* 仅顶部圆角 */
border-radius: 32px 32px 0 0 / 40px 40px 0 0;

/* 左侧胶囊形 */
border-radius: 9999px 0 0 9999px;

/* 右侧胶囊形 */
border-radius: 0 9999px 9999px 0;
```

### 圆角使用原则

- **小型交互元素：** 使用 `rounded-full`（圆形按钮、图标）
- **中型组件：** 使用 `.g2-lg` 到 `.g2-xl`（卡片、列表项）
- **大型容器：** 使用 `.g2-2xl` 到 `.g2-phone`（手机外壳、面板）
- **胶囊和徽章：** 始终使用 `rounded-full`

### G2 vs 普通圆角对比

| 特性 | 普通圆角 (G1) | G2 椭圆圆角 |
|------|--------------|-------------|
| 曲率 | 恒定半径 | 变化半径 |
| 过渡 | 可见转角点 | 平滑过渡 |
| 视觉感受 | 几何感 | 有机、柔和 |
| iOS 相似度 | 60% | 75% |
| 浏览器支持 | 100% | 100% |

---

## 🔲 边框样式

### 边框宽度

- **默认：** 1px
- **头像边框：** 2px

### 边框颜色

| 类型 | 颜色 | 透明度 | 使用场景 |
|------|------|--------|---------|
| 主边框 | 白色 | 10% | 容器外边框 |
| 次边框 | 白色 | 5% | 输入框、图标容器 |
| 强调边框 | 蓝色 | 30% | 聚焦状态 |
| 头像边框 | 深空灰 | 100% | 头像内圈 |

### 边框示例

```css
/* 容器边框 */
border: 1px solid rgba(255, 255, 255, 0.1)

/* 输入框边框 */
border: 1px solid rgba(255, 255, 255, 0.05)

/* 分割线 */
height: 1px
background: rgba(255, 255, 255, 0.05)
```

---

## 🌟 特殊效果

### 1. 背景模糊

```css
/* 超强模糊 */
backdrop-filter: blur(24px)  /* backdrop-blur-2xl */

/* 中等模糊 */
backdrop-filter: blur(12px)  /* backdrop-blur-md */

/* 超强模糊 */
backdrop-filter: blur(16px)  /* backdrop-blur-xl */
```

### 2. 元素模糊

```css
/* 背景光晕模糊 */
filter: blur(100px)   /* blur-[100px] */
filter: blur(120px)   /* blur-[120px] */
filter: blur(50px)    /* blur-[50px] */
```

### 3. 渐变效果

**线性渐变：**
```css
/* 垂直渐变 - 从透明到黑 */
background: linear-gradient(to top,
  rgba(0, 0, 0, 0.9) 0%,
  rgba(0, 0, 0, 0.2) 50%,
  transparent 100%)

/* 水平渐变 - 蓝色按钮 */
background: linear-gradient(to right,
  rgba(59, 130, 246, 0.8),
  rgba(59, 130, 246, 0.8))

/* 垂直渐变 - 卡片背景 */
background: linear-gradient(to bottom,
  rgba(255, 255, 255, 0.05),
  transparent)
```

**渐变边框：**
```css
/* 头像渐变边框 */
background: linear-gradient(to bottom right, #f472b6, #9333ea)
padding: 1px
```

### 4. 透明度层级

- **背景：** 60% (0.6) - 主容器
- **背景：** 5%-10% - 交互元素背景
- **背景：** 20% - 悬停/激活状态
- **背景：** 40% - 徽章、覆盖层

---

## 💻 JavaScript 交互示例

### 1. 分类选择器点击切换

```javascript
function handleCategoryClick(element) {
  const container = element.parentElement;

  Array.from(container.children).forEach(child => {
    const icon = child.firstElementChild;
    const dot = child.querySelector('.category-dot');

    if (child === element) {
      // 激活状态
      child.style.opacity = '1';
      icon.className = 'w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/25 transform scale-105';

      if (!dot) {
        const newDot = document.createElement('div');
        newDot.className = 'category-dot w-1 h-1 bg-blue-400 rounded-full absolute -bottom-2';
        child.appendChild(newDot);
      }
    } else {
      // 非激活状态
      child.style.opacity = '0.5';
      icon.className = 'w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white text-xl';
      if (dot) dot.remove();
    }
  });
}
```

**HTML 使用：**
```html
<div class="flex gap-4">
  <div onclick="handleCategoryClick(this)" class="flex flex-col items-center gap-1 cursor-pointer">
    <div class="w-12 h-12 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/25">
      <!-- 图标 -->
    </div>
    <span class="text-[10px] text-white font-medium">分类名</span>
  </div>
</div>
```

### 2. 底部导航点击切换

```javascript
function handleNavClick(event) {
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

### 3. Toggle 开关切换

```javascript
function handleToggleClick(button) {
  const dot = button.querySelector('.toggle-dot');
  const track = button.querySelector('.toggle-track');

  // 切换状态
  dot.classList.toggle('translate-x-full');
  dot.classList.toggle('bg-white');
  dot.classList.toggle('bg-blue-500');
  track.classList.toggle('bg-white/10');
  track.classList.toggle('bg-blue-500/20');
}
```

**HTML 使用：**
```html
<button onclick="handleToggleClick(this)">
  <div class="toggle-track w-12 h-7 bg-white/10 rounded-full relative">
    <div class="toggle-dot absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full shadow-lg transition-all duration-300"></div>
  </div>
</button>
```

---

## 📱 React Native 适配指南

### 图标系统

```typescript
// 使用 react-native-svg
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

### 隐藏滚动条

```typescript
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  showsVerticalScrollIndicator={false}
>
  {/* 内容 */}
</ScrollView>
```

### 毛玻璃效果

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
      {/* 内容 */}
    </View>
  );
}
```

### Toggle 开关

```typescript
import { useState } from 'react';
import { Pressable, Animated } from 'react-native';

function ToggleSwitch() {
  const [isOn, setIsOn] = useState(false);
  const translateX = useRef(new Animated.Value(isOn ? 20 : 0)).current;

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
    justifyContent: 'center',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
  },
});
```

### 半透明背景色

```typescript
// Tailwind CSS 风格的颜色值
const colors = {
  // 背景
  bgPrimary: 'rgba(28, 30, 38, 0.6)',   // #1c1e26/60
  bgSecondary: 'rgba(255, 255, 255, 0.05)',
  bgHover: 'rgba(255, 255, 255, 0.1)',
  bgActive: 'rgba(255, 255, 255, 0.2)',

  // 边框
  borderPrimary: 'rgba(255, 255, 255, 0.1)',
  borderSecondary: 'rgba(255, 255, 255, 0.05)',

  // 文字
  textPrimary: 'rgba(255, 255, 255, 1)',
  textSecondary: 'rgba(255, 255, 255, 0.8)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textDisabled: 'rgba(255, 255, 255, 0.4)',
};
```

---

## 📱 响应式设计

### 断点系统

| 断点名称 | 最小宽度 | Tailwind 前缀 |
|---------|---------|--------------|
| 手机 | 0px | (默认) |
| 平板 | 640px | `sm:` |
| 笔记本 | 1024px | `lg:` |
| 桌面 | 1280px | `xl:` |

### 布局方式

**网格布局：**
```css
display: grid
grid-template-columns: repeat(1, 1fr)  /* 手机 */
lg:grid-template-columns: repeat(3, 1fr)  /* 桌面 */
gap: 48px (gap-12)
```

**Flexbox 布局：**
```css
display: flex
flex-direction: column
justify-content: between
align-items: center
```

---

## 🎯 可访问性

### 焦点状态

```css
/* 可见焦点环 */
focus:outline-none
focus-visible:ring-2
focus-visible:ring-blue-500/50
```

### 语义化标签

- 使用 `button` 而非 `div` 作为交互元素
- 添加 `aria-label` 到图标按钮
- 使用语义化 HTML 结构

### 交互反馈

- 所有交互元素都有 `hover` 状态
- 点击时有 `active` 状态（缩放效果）
- 可聚焦元素有明显的焦点指示器

---

## 📝 最佳实践

### 1. 层次感构建

- 使用 `z-index` 管理层级（10, 20, 30, 40）
- 背景元素使用 `pointer-events-none`
- 模糊背景创建景深效果

### 2. 性能优化

- 使用 `transform` 而非 `top/left` 做动画
- 限制模糊效果的使用范围
- 使用 `will-change` 优化动画性能

### 3. 视觉一致性

- 保持相同的圆角比例
- 统一的阴影系统
- 一致的间距节奏

### 4. 交互设计

- 提供清晰的视觉反馈
- 使用合适的动画时长
- 遵循用户预期的行为模式

---

## 🛠️ Tailwind CSS 配置参考

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'dark': '#1c1e26',
        'blue-primary': '#3b82f6',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backdropBlur: {
        '2xl': '24px',
      },
    },
  },
}
```

---

## 📚 资源与工具

- **字体：** [Google Fonts - Inter](https://fonts.google.com/specimen/Inter)
- **图标：** Iconify (Solar 图标集)
- **CSS 框架：** Tailwind CSS v3.x
- **设计参考：** Glassmorphism 设计趋势

---

*本风格指南基于实际代码分析生成，旨在保持设计一致性和开发效率。*
