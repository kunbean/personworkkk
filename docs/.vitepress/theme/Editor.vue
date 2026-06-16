<template>
  <div class="editor-root">
    <!-- ====== Token 引导页 ====== -->
    <div v-if="!token" class="token-page">
      <div class="token-card">
        <h2>连接 GitHub</h2>
        <p>发布文章需要授权访问仓库，只需生成一个 Token 即可。</p>
        <div class="steps">
          <div class="step">
            <span class="step-num">1</span>
            <div>
              <strong>打开 GitHub Token 创建页</strong>
              <p><a :href="tokenUrl" target="_blank">{{ tokenUrl }}</a></p>
            </div>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <div>
              <strong>直接拉到页面底部，点 Generate token</strong>
              <p>不用改任何选项</p>
            </div>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <div>
              <strong>复制 Token 粘贴到下面</strong>
            </div>
          </div>
        </div>
        <div class="token-input-row">
          <input v-model="tokenInput" type="password" placeholder="ghp_xxxxxxxxxxxx" @keyup.enter="saveToken" />
          <button @click="saveToken" :disabled="!tokenInput.trim()">进入编辑器</button>
        </div>
        <p class="footnote">Token 只保存在你的浏览器本地。</p>
      </div>
    </div>

    <!-- ====== 编辑器主界面 ====== -->
    <div v-else class="editor-main">
      <!-- 顶栏 -->
      <header class="topbar">
        <div class="topbar-left">
          <select v-model="selectedPost" @change="loadPost" class="post-select">
            <option value="__new__">+ 新建文章</option>
            <option v-for="p in posts" :key="p.name" :value="p.name">{{ p.name.replace('.md', '') }}</option>
          </select>
          <input v-if="selectedPost === '__new__'" v-model="newFileName" placeholder="文件名，如 2024-03-15-react-notes" class="filename-input" />
        </div>
        <div class="topbar-right">
          <button @click="publish" :disabled="publishing" class="publish-btn">{{ publishing ? '发布中...' : '发布' }}</button>
          <button @click="showSettings = !showSettings" class="icon-btn" title="Token 设置">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </button>
          <button v-if="selectedPost !== '__new__'" @click="deletePost" class="icon-btn danger" title="删除文章">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </header>

      <!-- Token 设置 -->
      <div v-if="showSettings" class="settings-panel">
        <input v-model="tokenInput" type="password" placeholder="新 Token" />
        <button @click="updateToken">更新</button>
        <button @click="showSettings = false" class="btn-cancel">取消</button>
      </div>

      <!-- 元信息 -->
      <div class="meta-bar">
        <input v-model="title" placeholder="文章标题" class="title-input" />
        <input v-model="date" type="date" class="date-input" />
        <input v-model="tags" placeholder="标签 (逗号分隔)" class="tags-input" />
      </div>

      <!-- ====== 格式工具栏 ====== -->
      <div class="toolbar">
        <div class="toolbar-group">
          <button @click="insertHeading(1)" title="一级标题">H1</button>
          <button @click="insertHeading(2)" title="二级标题">H2</button>
          <button @click="insertHeading(3)" title="三级标题">H3</button>
        </div>
        <span class="toolbar-divider"></span>
        <div class="toolbar-group">
          <button @click="wrapSelection('**', '**')" title="加粗 · Ctrl+B"><b>B</b></button>
          <button @click="wrapSelection('*', '*')" title="斜体 · Ctrl+I"><i>I</i></button>
          <button @click="wrapSelection('~~', '~~')" title="删除线"><s>S</s></button>
          <button @click="wrapSelection('`', '`')" title="行内代码">&lt;/&gt;</button>
        </div>
        <span class="toolbar-divider"></span>
        <div class="toolbar-group">
          <button @click="insertPrefix('- ')" title="无序列表">• 列表</button>
          <button @click="insertPrefix('1. ')" title="有序列表">1. 列表</button>
          <button @click="insertPrefix('> ')" title="引用">引用</button>
        </div>
        <span class="toolbar-divider"></span>
        <div class="toolbar-group">
          <button @click="insertLink" title="插入链接">链接</button>
          <button @click="insertImage" title="插入图片">图片</button>
          <button @click="insertBlock('```\n', '\n```')" title="代码块">代码块</button>
        </div>
        <span class="toolbar-divider"></span>
        <div class="toolbar-group">
          <button @click="insertTable" title="插入表格">表格</button>
          <button @click="insertLine('---')" title="分割线">分割线</button>
        </div>
      </div>

      <!-- 编辑 & 预览 -->
      <div class="split-pane">
        <div class="pane editor-pane">
          <div class="pane-label">编辑</div>
          <textarea
            v-model="content"
            ref="editorRef"
            placeholder="在这里写文章，或使用上方工具栏插入格式..."
            @scroll="syncScroll"
            @keydown="onKeydown"
          ></textarea>
        </div>
        <div class="pane preview-pane">
          <div class="pane-label">预览</div>
          <div class="preview-body" v-html="renderedContent" ref="previewRef"></div>
        </div>
      </div>

      <!-- 发布结果提示 (醒目) -->
      <div v-if="publishResult" :class="['publish-toast', publishResult.type]">
        <span class="toast-icon">{{ publishResult.type === 'success' ? '&#10003;' : publishResult.type === 'error' ? '&#10007;' : '' }}</span>
        <span>{{ publishResult.text }}</span>
        <button @click="publishResult = null" class="toast-close">&times;</button>
      </div>

      <!-- 状态条 -->
      <div class="statusbar">
        <span v-if="publishing" class="status info">提交中...</span>
        <span v-else class="status dim">点击工具栏按钮插入格式，选中文字后点按钮可包裹格式</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

const OWNER = 'kunbean'
const REPO = 'personworkkk'
const BASE = 'https://api.github.com'
const POSTS_DIR = 'docs/posts'
const tokenUrl = `https://github.com/settings/tokens/new?scopes=repo&description=BlogEditor`

const token = ref(localStorage.getItem('gh_blog_token') || '')
const tokenInput = ref('')
const showSettings = ref(false)
const posts = ref([])
const selectedPost = ref('__new__')
const newFileName = ref('')
const title = ref('')
const date = ref(new Date().toISOString().split('T')[0])
const tags = ref('')
const content = ref('')
const publishResult = ref(null)
const publishing = ref(false)
const editorRef = ref(null)
const previewRef = ref(null)

// ---- Helpers ----
function getTextarea() { return editorRef.value }
function getSelection() {
  const ta = getTextarea()
  return { start: ta.selectionStart, end: ta.selectionEnd, text: ta.value.substring(ta.selectionStart, ta.selectionEnd) }
}
function setSelection(start, end) {
  const ta = getTextarea()
  ta.focus()
  ta.setSelectionRange(start, end)
}
function replaceRange(start, end, text) {
  const ta = getTextarea()
  ta.value = ta.value.substring(0, start) + text + ta.value.substring(end)
}
function insertAtCursor(before, after = '', placeholder = '') {
  const { start, end, text } = getSelection()
  if (text) {
    replaceRange(start, end, before + text + after)
    setSelection(start + before.length, start + before.length + text.length)
  } else {
    replaceRange(start, end, before + placeholder + after)
    setSelection(start + before.length, start + before.length + placeholder.length)
  }
  content.value = getTextarea().value
}

// ---- Format actions ----
function insertHeading(level) {
  const prefix = '#'.repeat(level) + ' '
  const { start } = getSelection()
  const ta = getTextarea()
  // 找到当前行开头
  const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1
  const lineEnd = ta.value.indexOf('\n', start)
  const actualEnd = lineEnd === -1 ? ta.value.length : lineEnd
  const line = ta.value.substring(lineStart, actualEnd)
  // 去掉已有 heading 前缀
  const clean = line.replace(/^#{1,6}\s*/, '')
  replaceRange(lineStart, actualEnd, prefix + clean)
  setSelection(lineStart + prefix.length, lineStart + prefix.length + clean.length)
  content.value = ta.value
}

function wrapSelection(before, after) {
  insertAtCursor(before, after, '文字')
}

function insertPrefix(prefix) {
  const ta = getTextarea()
  const { start } = getSelection()
  const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1
  const line = ta.value.substring(lineStart, ta.value.indexOf('\n', start) === -1 ? ta.value.length : ta.value.indexOf('\n', start))
  if (line.startsWith(prefix)) {
    // 取消
    replaceRange(lineStart, lineStart + prefix.length, '')
  } else {
    replaceRange(lineStart, lineStart, prefix)
  }
  content.value = ta.value
  nextTick(() => { setSelection(start + prefix.length, start + prefix.length) })
}

function insertLink() {
  const { text } = getSelection()
  if (text) {
    insertAtCursor('[', '](url)', text)
  } else {
    insertAtCursor('[', '](url)', '链接文字')
  }
}

function insertImage() {
  const { text } = getSelection()
  insertAtCursor('![', '](url)', text || '图片描述')
}

function insertBlock(before, after) {
  const { start } = getSelection()
  const ta = getTextarea()
  // 确保在独立行插入
  const prefix = (start === 0 || ta.value[start - 1] === '\n') ? '' : '\n'
  const suffix = (start === ta.value.length || ta.value[start] === '\n') ? '' : '\n'
  insertAtCursor(prefix + before, after + suffix, '在此输入代码')
}

function insertTable() {
  const table = '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n'
  const { start } = getSelection()
  const ta = getTextarea()
  replaceRange(start, start, table)
  content.value = ta.value
  setSelection(start + 3, start + 6)
}

function insertLine(line) {
  const { start } = getSelection()
  const ta = getTextarea()
  const prefix = (start === 0 || ta.value[start - 1] === '\n') ? '' : '\n'
  replaceRange(start, start, prefix + line + '\n')
  content.value = ta.value
}

// Keyboard shortcuts
function onKeydown(e) {
  if (e.metaKey || e.ctrlKey) {
    if (e.key === 'b') { e.preventDefault(); wrapSelection('**', '**') }
    if (e.key === 'i') { e.preventDefault(); wrapSelection('*', '*') }
    if (e.key === 'k') { e.preventDefault(); insertLink() }
  }
}

// ---- Markdown render ----
const renderedContent = computed(() => {
  if (!content.value) return '<p class="placeholder">在左侧输入内容即可预览</p>'
  try { return marked.parse(content.value) }
  catch { return '<p class="error">渲染出错</p>' }
})

// ---- API ----
const HTTP_ERRORS = {
  401: 'Token 无效或已过期，请重新生成',
  403: '权限不足，请确认 Token 具有 repo 权限',
  404: '仓库或文件不存在，请检查仓库名称',
  409: '文件已被其他人修改，请刷新后重试',
  422: '请求数据格式错误',
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `token ${token.value}`, Accept: 'application/vnd.github.v3+json', ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = HTTP_ERRORS[res.status] || body.message || `HTTP ${res.status}`
    throw new Error(detail)
  }
  return res.json()
}

async function getSha(filePath) {
  const res = await fetch(`${BASE}/repos/${OWNER}/${REPO}/contents/${filePath}`, {
    headers: { Authorization: `token ${token.value}`, Accept: 'application/vnd.github.v3+json' },
  })
  if (res.status === 404) return null  // 文件不存在是正常情况
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(HTTP_ERRORS[res.status] || body.message || `HTTP ${res.status}`)
  }
  return (await res.json()).sha
}

// ---- Token ----
function saveToken() {
  if (!tokenInput.value.trim()) return
  token.value = tokenInput.value.trim()
  localStorage.setItem('gh_blog_token', token.value)
  tokenInput.value = ''
  loadPosts()
}
function updateToken() { saveToken(); showSettings.value = false }

// ---- 文章 ----
async function loadPosts() {
  try {
    const files = await api(`/repos/${OWNER}/${REPO}/contents/${POSTS_DIR}`)
    posts.value = files.filter(f => f.name.endsWith('.md') && f.name !== 'index.md').sort((a, b) => b.name.localeCompare(a.name))
  } catch { posts.value = [] }
}

async function loadPost() {
  if (selectedPost.value === '__new__') {
    title.value = ''; date.value = new Date().toISOString().split('T')[0]; tags.value = ''; content.value = ''; newFileName.value = ''
    return
  }
  try {
    const file = await api(`/repos/${OWNER}/${REPO}/contents/${POSTS_DIR}/${selectedPost.value}`)
    // 正确的 UTF-8 Base64 解码
    const bytes = Uint8Array.from(atob(file.content), c => c.charCodeAt(0))
    const raw = new TextDecoder().decode(bytes)
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (m) {
      content.value = m[2]; const fm = m[1]
      const t = fm.match(/title:\s*["']?(.+?)["']?\s*$/); if (t) title.value = t[1]
      const d = fm.match(/date:\s*["']?(.+?)["']?\s*$/); if (d) date.value = d[1]
      // 支持 tags: ["a", "b"] 和 tags: a, b 两种格式
      const gMatch = fm.match(/tags:\s*\[(.+?)\]\s*$/)
      if (gMatch) {
        tags.value = gMatch[1].split(',').map(t => t.trim().replace(/["']/g, '')).join(', ')
      } else {
        const g = fm.match(/tags:\s*(.+?)\s*$/); if (g) tags.value = g[1]
      }
    } else {
      content.value = raw
      const h = raw.match(/^#\s+(.+)$/m); if (h) title.value = h[1]
    }
  } catch (e) {
    title.value = ''; date.value = new Date().toISOString().split('T')[0]; tags.value = ''; content.value = ''
    alert('加载失败: ' + e.message)
  }
}

function buildMarkdown() {
  const tagList = tags.value.split(/[,，]/).map(t => t.trim()).filter(Boolean)
  const tagStr = tagList.map(t => `"${t}"`).join(', ')
  return ['---', `title: "${title.value || '无标题'}"`, `date: ${date.value}`, `tags: [${tagStr}]`, '---', '', content.value].join('\n')
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str)
  const bin = Array.from(bytes, (b) => String.fromCodePoint(b)).join('')
  return btoa(bin)
}

async function updatePostsIndex(newFileName) {
  try {
    const indexPath = `${POSTS_DIR}/index.md`
    const res = await fetch(`${BASE}/repos/${OWNER}/${REPO}/contents/${indexPath}`, {
      headers: { Authorization: `token ${token.value}`, Accept: 'application/vnd.github.v3+json' },
    })
    if (!res.ok) return
    const data = await res.json()
    const bytes = Uint8Array.from(atob(data.content), c => c.charCodeAt(0))
    const raw = new TextDecoder().decode(bytes)

    // 提取文件名（去掉 .md）作为显示名和链接
    const displayName = newFileName.replace(/\.md$/, '')
    const newLink = `- **[${displayName}](/posts/${encodeURIComponent(displayName)})**`

    // 在当前月份区块插入新链接，或新建月份区块
    const now = new Date()
    const yearMonth = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月`
    const monthHeader = `## ${yearMonth}`
    let updated

    if (raw.includes(monthHeader)) {
      // 在该月份区块末尾追加
      updated = raw.replace(monthHeader, `${monthHeader}\n${newLink}`)
    } else {
      // 新建月份区块（在第一个 ## 之前插入）
      const firstH2 = raw.indexOf('\n## ')
      if (firstH2 !== -1) {
        updated = raw.slice(0, firstH2) + `\n## ${yearMonth}\n\n${newLink}\n` + raw.slice(firstH2)
      } else {
        updated = raw + `\n## ${yearMonth}\n\n${newLink}\n`
      }
    }

    // 同时更新侧边栏配置
    await updateSidebarConfig(displayName, newFileName)

    await api(`/repos/${OWNER}/${REPO}/contents/${indexPath}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `更新文章列表: 添加 ${displayName}`,
        content: toBase64(updated),
        sha: data.sha,
      }),
    })
  } catch (e) {
    console.error('更新文章列表失败:', e)
  }
}

async function updateSidebarConfig(displayName, fileName) {
  try {
    const configPath = 'docs/.vitepress/config.mts'
    const res = await fetch(`${BASE}/repos/${OWNER}/${REPO}/contents/${configPath}`, {
      headers: { Authorization: `token ${token.value}`, Accept: 'application/vnd.github.v3+json' },
    })
    if (!res.ok) return
    const data = await res.json()
    const bytes = Uint8Array.from(atob(data.content), c => c.charCodeAt(0))
    const raw = new TextDecoder().decode(bytes)

    const linkLine = `{ text: '${displayName}', link: '/posts/${encodeURIComponent(fileName.replace(/\.md$/, ''))}' },`
    const marker = "// AUTO_POSTS_END"
    let updated

    if (raw.includes(marker)) {
      updated = raw.replace(marker, `${linkLine}\n            ${marker}`)
    } else {
      // 在 sidebar items 数组末尾插入 marker 和新链接
      const sidebarMatch = raw.match(/(\/posts\/.*?items:\s*\[)([\s\S]*?)(\])/)
      if (sidebarMatch) {
        // 在最后一个 item 之后插入
        updated = raw.replace(
          /({ text: 'JavaScript 闭包详解'.*?},)/,
          `$1\n            ${linkLine}\n            // AUTO_POSTS_END  // 新文章自动追加到此标记上方`
        )
      }
    }

    if (updated && updated !== raw) {
      await api(`/repos/${OWNER}/${REPO}/contents/${configPath}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `更新侧边栏: 添加 ${displayName}`,
          content: toBase64(updated),
          sha: data.sha,
        }),
      })
    }
  } catch (e) {
    console.error('更新侧边栏失败:', e)
  }
}

async function publish() {
  if (!title.value.trim()) { alert('请填写文章标题'); return }
  publishing.value = true; publishResult.value = null
  try {
    let name = selectedPost.value === '__new__'
      ? (newFileName.value.trim().replace(/\.md$/, '') || 'untitled') + '.md'
      : selectedPost.value
    const filePath = `${POSTS_DIR}/${name}`; const sha = await getSha(filePath)
    const markdown = buildMarkdown()
    await api(`/repos/${OWNER}/${REPO}/contents/${filePath}`, {
      method: 'PUT',
      body: JSON.stringify({ message: `Update: ${title.value}`, content: toBase64(markdown), ...(sha ? { sha } : {}) }),
    })
    publishResult.value = { type: 'success', text: `发布成功！「${name}」约 1 分钟后更新到网站。` }
    if (selectedPost.value === '__new__') {
      selectedPost.value = name
      // 更新文章列表页
      await updatePostsIndex(name)
      // 延迟一点等 GitHub API 刷新
      setTimeout(async () => { await loadPosts() }, 500)
    }
  } catch (e) {
    publishResult.value = { type: 'error', text: `发布失败：${e.message}` }
  } finally {
    publishing.value = false
  }
}

async function deletePost() {
  if (!confirm(`确认删除「${selectedPost.value}」？不可恢复。`)) return
  try {
    const path = `${POSTS_DIR}/${selectedPost.value}`; const sha = await getSha(path)
    if (!sha) { alert('无法获取文件信息，请检查 Token 是否有效'); return }
    await api(`/repos/${OWNER}/${REPO}/contents/${path}`, { method: 'DELETE', body: JSON.stringify({ message: `Delete: ${selectedPost.value}`, sha }) })
    publishResult.value = { type: 'success', text: `已删除「${selectedPost.value}」` }
    selectedPost.value = '__new__'; title.value = ''; date.value = new Date().toISOString().split('T')[0]; tags.value = ''; content.value = ''; await loadPosts()
  } catch (e) { alert('删除失败: ' + e.message) }
}

function syncScroll() {
  if (!editorRef.value || !previewRef.value) return
  const edRange = editorRef.value.scrollHeight - editorRef.value.clientHeight
  const pvRange = previewRef.value.scrollHeight - previewRef.value.clientHeight
  if (edRange <= 0 || pvRange <= 0) return
  const r = editorRef.value.scrollTop / edRange
  previewRef.value.scrollTop = r * pvRange
}

async function validateToken() {
  try {
    await api(`/repos/${OWNER}/${REPO}`)
    return true
  } catch (e) {
    // Token 失效，清除并返回设置页
    localStorage.removeItem('gh_blog_token')
    token.value = ''
    alert('Token 已失效，请重新设置')
    return false
  }
}

onMounted(async () => {
  if (token.value) {
    const valid = await validateToken()
    if (valid) await loadPosts()
  }
})
</script>

<style scoped>
.editor-root {
  --brand: #7c3aed; --brand-light: #a78bfa; --brand-bg: rgba(124, 58, 237, 0.04);
  --border: #e4e0ee; --surface: #ffffff; --text: #1e1b4b;
  --text-secondary: #4c4a6e; --text-muted: #8b88a0;
  --danger: #ef4444; --success: #10b981;
  --radius: 8px; --radius-lg: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--text);
}

/* Token 引导页 */
.token-page { display: flex; justify-content: center; padding: 60px 20px; }
.token-card {
  max-width: 520px; width: 100%; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 36px;
}
.token-card h2 { margin: 0 0 6px; font-size: 1.4rem; font-weight: 700; }
.token-card > p { color: var(--text-secondary); margin: 0 0 24px; font-size: 14px; }
.steps { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
.step { display: flex; gap: 12px; align-items: flex-start; }
.step-num {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.step strong { display: block; font-size: 13px; color: var(--text); }
.step p { margin: 2px 0 0; font-size: 12px; color: var(--text-secondary); }
.step a { color: var(--brand); font-size: 11px; word-break: break-all; }
.token-input-row { display: flex; gap: 8px; margin-bottom: 10px; }
.token-input-row input {
  flex: 1; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: var(--radius);
  font-size: 12px; font-family: ui-monospace, SFMono-Regular, monospace;
}
.token-input-row input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px rgba(124,58,237,0.08); }
.token-input-row button {
  padding: 10px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius);
  font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap;
}
.token-input-row button:hover:not(:disabled) { background: #6d28d9; }
.token-input-row button:disabled { opacity: 0.4; cursor: not-allowed; }
.footnote { font-size: 11px; color: var(--text-muted); margin: 0; }

/* 主界面 */
.editor-main { max-width: 1280px; margin: 0 auto; padding: 16px 0; }

/* 顶栏 */
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.topbar-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.post-select {
  padding: 7px 12px; border: 1.5px solid var(--border); border-radius: var(--radius);
  font-size: 13px; background: var(--surface); color: var(--text); min-width: 150px; cursor: pointer;
}
.post-select:focus { outline: none; border-color: var(--brand); }
.filename-input {
  padding: 7px 12px; border: 1.5px dashed var(--brand-light); border-radius: var(--radius);
  font-size: 12px; font-family: ui-monospace, SFMono-Regular, monospace; min-width: 220px; flex: 1;
}
.filename-input:focus { outline: none; border-style: solid; border-color: var(--brand); }
.topbar-right { display: flex; align-items: center; gap: 6px; }
.publish-btn {
  padding: 7px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius);
  font-weight: 600; font-size: 13px; cursor: pointer;
}
.publish-btn:hover:not(:disabled) { background: #6d28d9; }
.publish-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.icon-btn {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);
  color: var(--text-secondary); cursor: pointer;
}
.icon-btn:hover { border-color: var(--brand); color: var(--brand); }
.icon-btn.danger:hover { border-color: var(--danger); color: var(--danger); }

/* 设置面板 */
.settings-panel {
  display: flex; gap: 8px; padding: 10px 12px; background: #faf9fc;
  border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 10px;
}
.settings-panel input { flex: 1; padding: 6px 10px; border: 1.5px solid var(--border); border-radius: 6px; font-size: 12px; font-family: ui-monospace, SFMono-Regular, monospace; }
.settings-panel input:focus { outline: none; border-color: var(--brand); }
.settings-panel button { padding: 6px 12px; border-radius: 6px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: var(--brand); color: #fff; }
.settings-panel .btn-cancel { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }

/* 元信息 */
.meta-bar { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.title-input { flex: 2; min-width: 180px; padding: 8px 12px; border: 1.5px solid var(--border); border-radius: var(--radius); font-size: 14px; font-weight: 600; }
.title-input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px rgba(124,58,237,0.06); }
.date-input { padding: 8px 10px; border: 1.5px solid var(--border); border-radius: var(--radius); font-size: 12px; color: var(--text-secondary); }
.date-input:focus { outline: none; border-color: var(--brand); }
.tags-input { flex: 1; min-width: 120px; padding: 8px 10px; border: 1.5px solid var(--border); border-radius: var(--radius); font-size: 12px; }
.tags-input:focus { outline: none; border-color: var(--brand); }

/* ====== 工具栏 ====== */
.toolbar {
  display: flex; align-items: center; gap: 4px; padding: 6px 10px;
  background: #faf9fc; border: 1px solid var(--border); border-radius: var(--radius);
  margin-bottom: 8px; flex-wrap: wrap;
}
.toolbar-group { display: flex; align-items: center; gap: 2px; }
.toolbar button {
  height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 5px;
  background: transparent; color: var(--text-secondary); font-size: 12px; cursor: pointer;
  white-space: nowrap; transition: all 0.1s; display: inline-flex; align-items: center; gap: 2px;
}
.toolbar button:hover { background: #fff; border-color: var(--border); color: var(--text); }
.toolbar button:active { background: var(--brand-bg); border-color: var(--brand-light); }
.toolbar-divider { width: 1px; height: 20px; background: var(--border); margin: 0 4px; }

/* 编辑/预览 */
.split-pane {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1px;
  border: 1.5px solid var(--border); border-radius: var(--radius-lg); overflow: hidden;
  height: calc(100vh - 260px); min-height: 400px; background: var(--border);
}
.pane { display: flex; flex-direction: column; background: var(--surface); }
.pane-label {
  padding: 5px 14px; font-size: 11px; font-weight: 600; color: var(--text-muted);
  background: #faf9fc; border-bottom: 1px solid var(--border);
}
.editor-pane textarea {
  flex: 1; padding: 14px 18px; border: none; resize: none; outline: none;
  font-family: ui-monospace, 'Cascadia Code', 'Fira Code', SFMono-Regular, monospace;
  font-size: 13.5px; line-height: 1.75; color: var(--text); background: var(--surface);
}
.editor-pane textarea::placeholder { color: var(--text-muted); }
.preview-body { flex: 1; padding: 14px 22px; overflow-y: auto; line-height: 1.75; font-size: 14px; }

/* 预览内样式 */
.preview-body .placeholder { color: var(--text-muted); }
.preview-body .error { color: var(--danger); }
.preview-body :deep(h1) { font-size: 1.6rem; font-weight: 800; color: var(--text); margin-top: 0; }
.preview-body :deep(h2) { font-size: 1.25rem; font-weight: 700; color: var(--brand); border-bottom: 1px solid var(--border); padding-bottom: 4px; }
.preview-body :deep(h3) { font-size: 1.1rem; font-weight: 600; color: #8b5cf6; }
.preview-body :deep(code) { background: rgba(124,58,237,0.06); color: #7c3aed; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
.preview-body :deep(pre) { background: #1e1b2e; color: #e0dce8; padding: 16px 20px; border-radius: var(--radius); overflow-x: auto; }
.preview-body :deep(pre code) { background: none; color: inherit; padding: 0; }
.preview-body :deep(blockquote) { border-left: 3px solid #7c3aed; padding: 4px 16px; margin: 12px 0; color: var(--text-secondary); background: var(--brand-bg); border-radius: 0 4px 4px 0; }
.preview-body :deep(table) { width: 100%; border-collapse: collapse; font-size: 13px; }
.preview-body :deep(th) { background: #7c3aed; color: #fff; padding: 8px 12px; text-align: left; }
.preview-body :deep(td) { padding: 8px 12px; border: 1px solid var(--border); }
.preview-body :deep(a) { color: #7c3aed; }

/* 发布结果 Toast */
.publish-toast {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  border-radius: var(--radius); margin-bottom: 10px; font-size: 14px; font-weight: 600;
  animation: slideIn 0.3s ease;
}
.publish-toast.success {
  background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46;
}
.publish-toast.error {
  background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b;
}
.toast-icon { font-size: 16px; font-weight: 700; }
.toast-close {
  margin-left: auto; background: none; border: none; font-size: 20px;
  cursor: pointer; color: inherit; opacity: 0.6; padding: 0 4px; line-height: 1;
}
.toast-close:hover { opacity: 1; }
@keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

/* 状态栏 */
.statusbar { padding: 6px 0 0; font-size: 12px; }
.status.dim { color: var(--text-muted); }
.status.info { color: #6d28d9; }

@media (max-width: 768px) {
  .split-pane { grid-template-columns: 1fr; height: auto; }
  .editor-pane textarea, .preview-body { height: 350px; }
  .meta-bar { flex-direction: column; }
  .toolbar { gap: 1px; }
}
</style>
