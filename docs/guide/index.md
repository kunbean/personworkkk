# 项目概述

## 这是什么

一个基于 **VitePress + GitHub Pages** 的个人技术博客。特点是：

- **在线编辑**：浏览器直接写 Markdown，一键发布
- **自动部署**：GitHub Actions 自动构建，推送即上线
- **可定制主题**：CSS 变量驱动，改配色只需修改变量
- **零成本托管**：GitHub Pages 免费，无需服务器

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 框架 | [VitePress](https://vitepress.dev/) | 静态站点生成，Markdown → HTML |
| 构建 | [Vite](https://vitejs.dev/) | 极速开发服务器 & 打包 |
| 托管 | [GitHub Pages](https://pages.github.com/) | 免费静态网站托管 |
| CI/CD | [GitHub Actions](https://github.com/features/actions) | 推送自动构建部署 |
| 编辑器 | 自研 Vue 组件 | 在线 Markdown 编辑 + GitHub API |
| Markdown | [marked](https://marked.js.org/) | 客户端 Markdown 渲染 |
| API | [GitHub Contents API](https://docs.github.com/en/rest/repos/contents) | 读写仓库文件 |

## 快速开始

```bash
# 1. 克隆项目
git clone git@github.com:kunbean/personworkkk.git
cd personworkkk

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run docs:dev

# 4. 浏览器打开
open http://localhost:5173
```

## 目录结构

```
personworkkk/
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions 自动部署
├── docs/
│   ├── .vitepress/
│   │   ├── config.mts          # ⭐ 站点配置文件（导航、侧边栏、主题）
│   │   ├── theme/
│   │   │   ├── index.ts        # 主题入口
│   │   │   ├── custom.css      # ⭐ 全局样式（配色、排版）
│   │   │   ├── Editor.vue      # ⭐ 在线编辑器组件
│   │   │   └── ResumeUploader.vue  # 简历上传组件
│   │   └── dist/               # 构建输出（自动生成，勿手动修改）
│   ├── public/
│   │   ├── logo.svg            # 站点 Logo
│   │   └── resume/             # 简历文件存储目录
│   ├── guide/                  # 📖 技术文档（你正在看的）
│   ├── posts/                  # 📝 博客文章
│   ├── index.md                # 首页
│   ├── editor.md               # 编辑器页面
│   ├── resume.md               # 简历页面
│   └── about.md                # 关于页
├── package.json
└── .gitignore
```

## 三个核心页面

| 页面 | 地址 | 功能 |
|------|------|------|
| 首页 | `/` | 博客入口，展示特性 |
| 编辑器 | `/editor` | 在线写文章，提交到 GitHub |
| 简历 | `/resume` | 上传和展示个人简历 |

## 怎么工作

```
┌──────────┐    git push     ┌──────────┐   build & deploy   ┌─────────────┐
│  本地编辑  │ ──────────────> │  GitHub   │ ────────────────> │ GitHub Pages │
│  (任意)   │                 │  (main)   │                   │  (网站上线)  │
└──────────┘                 └──────────┘                   └─────────────┘
                                    ▲
                                    │ GitHub API (PUT)
                                    │
                              ┌─────┴──────┐
                              │  在线编辑器  │
                              │  /editor   │
                              └────────────┘
```

两条路径都能发布文章：
1. **本地写** → git push → 自动部署
2. **在线写** → 编辑器调用 GitHub API 提交 → 自动部署
