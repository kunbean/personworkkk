# 部署流程

## 自动部署

本项目的部署是全自动的。每次代码推送到 `main` 分支，GitHub Actions 自动执行：

```
push to main
    │
    ▼
Checkout 代码
    │
    ▼
Setup Node.js 20
    │
    ▼
npm install
    │
    ▼
npm run docs:build  (VitePress 构建)
    │
    ▼
peaceiris/actions-gh-pages 推送到 gh-pages 分支
    │
    ▼
GitHub Pages 自动更新 ← 1-2 分钟生效
```

## 部署配置文件

`.github/workflows/deploy.yml`：

```yaml
name: Deploy VitePress site to Pages

on:
  push:
    branches: [main]       # 监听 main 分支推送
  workflow_dispatch:        # 允许手动触发

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write       # 必须有写入权限
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run docs:build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: docs/.vitepress/dist  # VitePress 构建输出目录
```

## GitHub Pages 设置

在仓库 Settings → Pages 中：

| 字段 | 值 |
|------|-----|
| Source | Deploy from a branch |
| Branch | `gh-pages` / `/ (root)` |

## 网站地址

`https://<用户名>.github.io/<仓库名>/`

当前：`https://kunbean.github.io/personworkkk/`

**注意**：VitePress 的 `base` 配置必须与仓库名一致。

`docs/.vitepress/config.mts`：
```ts
export default defineConfig({
  base: '/personworkkk/',  // ← 必须等于仓库名 + /
})
```

## 常见问题

### 网站 404

1. **检查 Pages 设置**：Settings → Pages → Source 是否选对了分支
2. **检查仓库可见性**：免费账户 GitHub Pages 需要 Public 仓库
3. **检查 base 配置**：`config.mts` 中的 `base` 是否与仓库名匹配
4. **检查 gh-pages 分支**：该分支是否被自动创建并包含构建产物

### 部署失败

1. 去 Actions 页面查看失败日志
2. 常见原因：
   - `package.json` 中的依赖版本不兼容
   - `npm install` 失败（node_modules 损坏）
   - `contents: write` 权限未设置

### 如何手动触发部署

1. 打开仓库 Actions 页面
2. 点击左侧 "Deploy VitePress site to Pages"
3. 点击右侧 "Run workflow" → "Run workflow"

## 自定义域名

如果需要绑定自己的域名：

1. **DNS 配置**：添加 CNAME 记录指向 `<用户名>.github.io`
2. **GitHub 设置**：Settings → Pages → Custom domain → 填入域名
3. **静态文件**：在 `docs/public/` 下放置 `CNAME` 文件（内容为域名）

## 本地预览构建产物

```bash
# 构建
npm run docs:build

# 预览构建结果
npm run docs:preview
```

这会启动一个本地服务器，展示与线上完全一致的页面。
