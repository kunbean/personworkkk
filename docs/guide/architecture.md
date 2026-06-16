# 架构说明

## 系统全景

```
┌──────────────────────────────────────────────────────────────────┐
│                         用户浏览器                                │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │  VitePress   │  │  Editor.vue  │  │  ResumeUploader.vue    │  │
│  │  静态页面     │  │  在线编辑器   │  │  简历上传               │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬─────────────┘  │
│         │                  │                      │                │
└─────────┼──────────────────┼──────────────────────┼────────────────┘
          │                  │                      │
          │  Vite 构建        │  GitHub Contents API  │  GitHub API
          ▼                  ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                         GitHub                                    │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  gh-pages    │  │  main 分支        │  │  GitHub Actions    │  │
│  │  静态网站     │  │  源代码 + 文章    │  │  自动构建部署       │  │
│  └──────────────┘  └──────────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## 数据流

### 文章发布流程

```
用户输入 Markdown
      │
      ▼
Editor.vue 构建 YAML Frontmatter
      │
      ▼
toBase64() UTF-8 编码
      │
      ▼
GitHub Contents API (PUT /repos/{owner}/{repo}/contents/{path})
      │
      ▼
提交到 main 分支 docs/posts/ 目录
      │
      ▼
GitHub Actions 触发 deploy.yml
      │
      ▼
VitePress build → docs/.vitepress/dist
      │
      ▼
peaceiris/actions-gh-pages 推送到 gh-pages 分支
      │
      ▼
GitHub Pages 提供服务 ← https://kunbean.github.io/personworkkk/
```

### Token 认证流程

```
用户打开 /editor
      │
      ▼
检查 localStorage('gh_blog_token')
      │
  ┌───┴───┐
  │ 存在？ │
  └───┬───┘
      │
  ┌──是──────────────────┐    否──┐
  ▼                      ▼        ▼
validateToken()       显示 Token   用户粘贴
调用 GET /repos        设置引导页   Token
      │                            │
  ┌有效？──┐                        │
  ▼       ▼                        │
是：      否：                       │
loadPosts()  清除 Token             │
显示编辑器    退回引导页              │
  │         │                      │
  └─────────┴──────────────────────┘
                  │
                  ▼
          saveToken() 存入 localStorage
          loadPosts() 获取文章列表
```

## 组件关系

```
docs/editor.md
    └── <Editor />  ← Editor.vue
           ├── Token 引导页 (v-if="!token")
           ├── 文章选择器 (select)
           ├── 元信息表单 (title, date, tags)
           ├── 格式工具栏 (H1/B/I/链接/表格...)
           ├── 分屏编辑区 (textarea + marked 预览)
           └── 发布/删除按钮 → GitHub API

docs/resume.md
    └── <ResumeUploader />  ← ResumeUploader.vue
           ├── 文件拖拽区
           ├── 上传进度条
           ├── 当前简历预览
           └── GitHub API 上传
```

## 关键设计决策

| 决策 | 原因 |
|------|------|
| VitePress 而非 WordPress | 零服务器成本，Markdown 友好，构建极快 |
| GitHub API 直接提交而非 CMS 后端 | 无需额外后端服务，利用 GitHub 作为数据层 |
| Token 存 localStorage 而非后端 | 纯静态站点，无后端，简化架构 |
| 双栏编辑而非 WYSIWYG | Markdown 是通用格式，便于版本控制和迁移 |
| CSS 变量驱动主题 | 一处修改全局生效，暗色模式只需覆盖变量 |
| 工具条插入 Markdown 语法 | 降低学习成本，同时保留格式的可迁移性 |

## 扩展点

如果需要扩展功能，以下是推荐的切入点：

- **添加评论**：集成 [Giscus](https://giscus.app/)（基于 GitHub Discussions）
- **图片上传**：在编辑器中增加图片选择 + GitHub API 上传
- **文章分类**：在 frontmatter 中加 `category` 字段，前端按分类过滤
- **全文搜索**：VitePress 已内置本地搜索，无需额外配置
- **自定义域名**：在 GitHub Pages 设置中配置 + 添加 CNAME 记录
