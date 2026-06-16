# 主题定制

## 配色系统

网站使用 **CSS 变量** 驱动所有颜色，定义在 `docs/.vitepress/theme/custom.css` 中。

### 品牌色

```css
:root {
  --vp-c-brand-1: #7c3aed;      /* 主色 - 紫罗兰 */
  --vp-c-brand-2: #8b5cf6;      /* 辅色 */
  --vp-c-brand-3: #6d28d9;      /* 深色 */
  --vp-c-brand-soft: rgba(124, 58, 237, 0.10);  /* 浅色（背景用） */
}
```

### 自定义渐变

```css
--gradient-brand: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%);
--gradient-accent: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%);
```

`--gradient-brand` 用于导航标题、按钮、文章标题等。
`--gradient-accent` 用于首页 Hero 标题。

### 背景和文字

```css
--vp-c-bg: #faf9fc;           /* 页面背景 */
--vp-c-bg-alt: #f3f0f9;      /* 次级背景 */
--vp-c-bg-elv: #ffffff;       /* 卡片/弹出层背景 */
--vp-c-bg-soft: #f5f3fa;     /* 柔和背景 */

--vp-c-text-1: #1e1b4b;       /* 主文字 */
--vp-c-text-2: #4c4a6e;       /* 次级文字 */
--vp-c-text-3: #8b88a0;       /* 辅助文字 */
```

## 暗色模式

暗色模式通过 `.dark` 类覆盖变量：

```css
.dark {
  --vp-c-brand-1: #a78bfa;    /* 暗色下稍亮 */
  --vp-c-bg: #13111c;         /* 深色背景 */
  --vp-c-text-1: #e8e4f0;    /* 浅色文字 */
}
```

VitePress 自动根据系统偏好或用户手动切换，在 `<html>` 上添加 `.dark` 类。

## 快速换肤

### 方案 A：换一个色系

只需修改 `--vp-c-brand-1` 的值：

```css
/* 粉红 */
--vp-c-brand-1: #ec4899;
--vp-c-brand-2: #f472b6;
--vp-c-brand-3: #db2777;

/* 蓝色 */
--vp-c-brand-1: #3b82f6;
--vp-c-brand-2: #60a5fa;
--vp-c-brand-3: #2563eb;

/* 翡翠 */
--vp-c-brand-1: #10b981;
--vp-c-brand-2: #34d399;
--vp-c-brand-3: #059669;
```

同时更新 `--gradient-brand` 和 `--gradient-accent`。

### 方案 B：VitePress 预设主题

VitePress 内置了一些主题色方案。在 `config.mts` 中无需任何 CSS 即可更换：

```ts
// 只需改这一行
// 可选: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo'
```

详见 [VitePress 主题文档](https://vitepress.dev/reference/default-theme-config)。

## 组件级样式

各组件有自己独立的 scoped 样式：

| 组件 | 样式位置 | 说明 |
|------|----------|------|
| Editor.vue | `<style scoped>` 块 | 编辑器专属，变量在 `.editor-root` 下重定义 |
| ResumeUploader.vue | `<style scoped>` 块 | 简历上传专属 |
| 全局 | `custom.css` | 全局覆盖 VitePress 默认样式 |

## 如何添加新样式

1. **全局样式** → 写在 `custom.css` 中
2. **组件样式** → 写在对应 `.vue` 文件的 `<style scoped>` 中
3. **页面样式** → 在 `.md` 文件中使用 `<style>` 标签

## 首页布局

首页使用 VitePress 的 `home` 布局，配置在 `index.md` 的 frontmatter 中：

```yaml
---
layout: home
hero:
  name: "标题"
  text: "副标题"
  tagline: 一句话描述
  actions:
    - theme: brand
      text: 按钮文字
      link: /target/
features:
  - title: 特性标题
    details: 特性描述
---
```
