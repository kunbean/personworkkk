# 在线编辑器

## 功能概述

`/editor` 页面提供一个完整的在线 Markdown 编辑器，无需安装任何工具，在浏览器中即可撰写和发布文章。

## 核心能力

| 功能 | 实现方式 |
|------|----------|
| Token 认证 | 引导用户生成 GitHub Personal Access Token (repo scope) |
| 文章管理 | 列出、加载、新建、删除文章 |
| 格式工具栏 | 一键插入 Markdown 语法，无需记忆 |
| 实时预览 | 左栏编辑，右栏渲染，滚动同步 |
| 快捷键 | Ctrl+B 加粗、Ctrl+I 斜体、Ctrl+K 链接 |
| 一键发布 | 构建 frontmatter + 内容 → GitHub API → 自动部署 |

## API 调用

编辑器通过 GitHub REST API v3 与仓库交互：

| 操作 | 方法 | 端点 | 说明 |
|------|------|------|------|
| 验证 Token | GET | `/repos/{owner}/{repo}` | 检查 Token 是否有效 |
| 列出文章 | GET | `/repos/{owner}/{repo}/contents/docs/posts` | 获取文章列表 |
| 读取文章 | GET | `/repos/{owner}/{repo}/contents/docs/posts/{file}` | 获取单篇文章内容（Base64） |
| 发布/更新 | PUT | `/repos/{owner}/{repo}/contents/docs/posts/{file}` | 创建或更新文件 |
| 删除 | DELETE | `/repos/{owner}/{repo}/contents/docs/posts/{file}` | 删除文件（需 SHA） |

## Token 机制

```
首次使用：
  引导页 → 点击链接生成 Token → 粘贴 → 存入 localStorage

后续使用：
  自动读取 localStorage → 验证有效性 → 通过则进入编辑器
  失败 → 清除失效 Token → 显示引导页
```

**安全说明**：
- Token 仅存储在浏览器 `localStorage` 中
- 仅用于访问 `kunbean/personworkkk` 仓库
- 建议使用 Classic Token（`ghp_` 开头），勾选 `repo` scope

## Base64 编码

GitHub Contents API 要求文件内容以 Base64 编码传输。编辑器使用标准 UTF-8 编码：

```js
// 编码（上传）
function toBase64(str) {
  const bytes = new TextEncoder().encode(str)  // UTF-8 字节
  const bin = Array.from(bytes, b => String.fromCodePoint(b)).join('')
  return btoa(bin)
}

// 解码（读取）
const bytes = Uint8Array.from(atob(content), c => c.charCodeAt(0))
const raw = new TextDecoder().decode(bytes)
```

这正确处理了中文等非 ASCII 字符。

## Frontmatter 格式

每篇文章文件结构：

```markdown
---
title: "文章标题"
date: 2024-03-15
tags: ["JavaScript", "前端", "VitePress"]
---

文章正文 Markdown...
```

- `title`：文章标题，用引号包裹防止特殊字符问题
- `date`：发布日期，ISO 格式
- `tags`：标签列表，用引号包裹每个标签

## 格式工具栏

工具栏位于编辑区上方，分组排列：

| 分组 | 按钮 | 插入语法 |
|------|------|----------|
| 标题 | H1 H2 H3 | `#` `##` `###` |
| 格式 | B *I* ~~S~~ `</>` | `** **` `* *` `~~ ~~` `` ` `` |
| 列表 | 列表 1.列表 引用 | `- ` `1. ` `> ` |
| 插入 | 链接 图片 代码块 | `[text](url)` `![alt](url)` ` ``` ``` ` |
| 其他 | 表格 分割线 | `| col | col |` `---` |

**使用方式**：
- **选中文字** + 点击按钮 → 包裹格式
- **直接点击** 按钮 → 插入模板，光标定位在占位文字
- **再次点击** → 取消格式（列表、引用）

## 错误处理

编辑器对常见 API 错误给出中文提示：

| HTTP 状态码 | 提示 |
|-------------|------|
| 401 | Token 无效或已过期，请重新生成 |
| 403 | 权限不足，请确认 Token 具有 repo 权限 |
| 404 | 仓库或文件不存在，请检查仓库名称 |
| 409 | 文件已被其他人修改，请刷新后重试 |
| 422 | 请求数据格式错误 |

## 如何修改编辑器

编辑器组件位于 `docs/.vitepress/theme/Editor.vue`。

### 调整仓库配置

如果更换了 GitHub 仓库，修改组件顶部的常量：

```js
const OWNER = 'kunbean'        // GitHub 用户名
const REPO = 'personworkkk'    // 仓库名
const POSTS_DIR = 'docs/posts' // 文章存储路径
```

### 添加新的工具栏按钮

1. 在 `<div class="toolbar">` 中添加按钮
2. 在 `<script setup>` 中实现插入函数
3. 参考 `insertHeading()` / `wrapSelection()` 的写法
