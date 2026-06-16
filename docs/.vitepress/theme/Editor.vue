<template>
  <div class="editor-root">
    <!-- ====== Token 引导页 ====== -->
    <div v-if="!token" class="token-page">
      <div class="token-card">
        <h2>连接 GitHub</h2>
        <p>发布文章需要你授权访问仓库，只需生成一个 Token 即可。</p>

        <div class="steps">
          <div class="step">
            <span class="step-num">1</span>
            <div>
              <strong>打开 GitHub Token 创建页</strong>
              <p>
                <a :href="tokenUrl" target="_blank" class="link-btn">{{ tokenUrl }}</a>
              </p>
            </div>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <div>
              <strong>直接拉到页面底部</strong>
              <p>不用改任何选项，直接点击绿色的 <b>Generate token</b> 按钮</p>
            </div>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <div>
              <strong>复制生成的 Token</strong>
              <p>格式类似 <code>ghp_xxxxxxxxxxxx</code>，粘贴到下方输入框</p>
            </div>
          </div>
        </div>

        <div class="token-input-row">
          <input
            v-model="tokenInput"
            type="password"
            placeholder="粘贴 Token 到这里：ghp_xxxxxxxxxxxx"
            @keyup.enter="saveToken"
          />
          <button @click="saveToken" :disabled="!tokenInput.trim()">
            确认并进入编辑器
          </button>
        </div>

        <p class="footnote">Token 仅保存在你的浏览器本地，不会上传到任何服务器。</p>
      </div>
    </div>

    <!-- ====== 编辑器主界面 ====== -->
    <div v-else class="editor-main">
      <!-- 顶栏 -->
      <header class="topbar">
        <div class="topbar-left">
          <select v-model="selectedPost" @change="loadPost" class="post-select">
            <option value="__new__">+ 新建文章</option>
            <option v-for="p in posts" :key="p.name" :value="p.name">
              {{ p.name.replace('.md', '') }}
            </option>
          </select>
          <input
            v-if="selectedPost === '__new__'"
            v-model="newFileName"
            placeholder="文件名，如 2024-03-15-react-notes"
            class="filename-input"
          />
        </div>
        <div class="topbar-right">
          <button @click="publish" :disabled="publishing" class="publish-btn">
            {{ publishing ? '发布中...' : '发布' }}
          </button>
          <button @click="showSettings = !showSettings" class="gear-btn" title="Token 设置">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </button>
          <button v-if="selectedPost !== '__new__'" @click="deletePost" class="delete-btn" title="删除此文章">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </header>

      <!-- Token 设置面板 -->
      <div v-if="showSettings" class="settings-panel">
        <input v-model="tokenInput" type="password" placeholder="新 Token" />
        <button @click="updateToken">更新</button>
        <button @click="showSettings = false" class="cancel">取消</button>
      </div>

      <!-- 元信息 -->
      <div class="meta-bar">
        <input v-model="title" placeholder="文章标题" class="title-input" />
        <input v-model="date" type="date" class="date-input" title="发布日期" />
        <input v-model="tags" placeholder="标签 (逗号分隔)" class="tags-input" />
      </div>

      <!-- 编辑 & 预览 -->
      <div class="split-pane">
        <div class="pane editor-pane">
          <div class="pane-label">Markdown</div>
          <textarea
            v-model="content"
            placeholder="开始写 Markdown..."
            @scroll="syncScroll"
            ref="editorRef"
          ></textarea>
        </div>
        <div class="pane preview-pane">
          <div class="pane-label">预览</div>
          <div class="preview-body" v-html="renderedContent" ref="previewRef"></div>
        </div>
      </div>

      <!-- 状态条 -->
      <div class="statusbar">
        <span v-if="saveStatus" :class="['status', saveStatus.type]">{{ saveStatus.text }}</span>
        <span v-else class="status dim">就绪</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, (c) => map[c])
}

const OWNER = 'kunbean'
const REPO = 'personworkkk'
const BASE = 'https://api.github.com'
const POSTS_DIR = 'docs/posts'

const tokenUrl = ref(`https://github.com/settings/tokens/new?scopes=repo&description=BlogEditor`)

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
const saveStatus = ref(null)
const publishing = ref(false)
const editorRef = ref(null)
const previewRef = ref(null)

const renderedContent = computed(() => {
  if (!content.value) return '<p class="placeholder">输入 Markdown 即可预览</p>'
  try { return marked.parse(content.value) }
  catch { return '<p class="error">渲染出错</p>' }
})

// ---- API ----
async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `token ${token.value}`, Accept: 'application/vnd.github.v3+json', ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.message || `HTTP ${res.status}`)
  }
  return res.json()
}

async function getSha(filePath) {
  try { return (await api(`/repos/${OWNER}/${REPO}/contents/${filePath}`)).sha }
  catch { return null }
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

// ---- 文章操作 ----
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
    const raw = atob(file.content)
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (m) {
      const fm = m[1]; content.value = m[2]
      const t = fm.match(/title:\s*["']?(.+?)["']?\s*$/)
      const d = fm.match(/date:\s*["']?(.+?)["']?\s*$/)
      const g = fm.match(/tags:\s*\[?(.+?)\]?\s*$/)
      if (t) title.value = t[1]
      if (d) date.value = d[1]
      if (g) tags.value = g[1]
    } else {
      content.value = raw
      const h = raw.match(/^#\s+(.+)$/m)
      if (h) title.value = h[1]
    }
  } catch (e) { alert('加载失败: ' + e.message) }
}

function buildMarkdown() {
  const tagStr = tags.value.split(/[,，]/).map(t => t.trim()).filter(Boolean).join(', ')
  const fm = ['---', `title: "${title.value || '无标题'}"`, `date: ${date.value}`, `tags: [${tagStr}]`, '---', ''].join('\n')
  return fm + content.value
}

async function publish() {
  if (!title.value.trim()) { alert('请填写文章标题'); return }
  publishing.value = true
  saveStatus.value = { type: 'info', text: '提交中...' }
  try {
    let name = selectedPost.value === '__new__'
      ? (newFileName.value.trim().replace(/\.md$/, '') || 'untitled') + '.md'
      : selectedPost.value
    const path = `${POSTS_DIR}/${name}`
    const body = { message: `Update: ${title.value}`, content: btoa(unescape(encodeURIComponent(buildMarkdown()))), ...(await getSha(path) ? { sha: await getSha(path) } : {}) }
    await api(`/repos/${OWNER}/${REPO}/contents/${path}`, { method: 'PUT', body: JSON.stringify(body) })
    saveStatus.value = { type: 'success', text: '已发布，约 1 分钟后上线' }
    if (selectedPost.value === '__new__') { selectedPost.value = name; await loadPosts() }
  } catch (e) {
    saveStatus.value = { type: 'error', text: '发布失败: ' + e.message }
  } finally {
    publishing.value = false
    setTimeout(() => saveStatus.value = null, 4000)
  }
}

async function deletePost() {
  if (!confirm(`确认删除「${selectedPost.value}」？不可恢复。`)) return
  try {
    const path = `${POSTS_DIR}/${selectedPost.value}`
    const sha = await getSha(path)
    await api(`/repos/${OWNER}/${REPO}/contents/${path}`, { method: 'DELETE', body: JSON.stringify({ message: `Delete: ${selectedPost.value}`, sha }) })
    saveStatus.value = { type: 'success', text: '已删除' }
    selectedPost.value = '__new__'; title.value = ''; content.value = ''; await loadPosts()
  } catch (e) { alert('删除失败: ' + e.message) }
}

function syncScroll() {
  if (!editorRef.value || !previewRef.value) return
  const r = editorRef.value.scrollTop / (editorRef.value.scrollHeight - editorRef.value.clientHeight)
  previewRef.value.scrollTop = r * (previewRef.value.scrollHeight - previewRef.value.clientHeight)
}

onMounted(() => { if (token.value) loadPosts() })
</script>

<style scoped>
/* ===== 变量 ===== */
.editor-root {
  --brand: #7c3aed;
  --brand-light: #a78bfa;
  --brand-bg: rgba(124, 58, 237, 0.04);
  --border: #e4e0ee;
  --surface: #ffffff;
  --text: #1e1b4b;
  --text-secondary: #4c4a6e;
  --text-muted: #8b88a0;
  --danger: #ef4444;
  --success: #10b981;
  --radius: 8px;
  --radius-lg: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--text);
}

/* ===== Token 引导页 ===== */
.token-page {
  display: flex; justify-content: center; padding: 60px 20px;
}
.token-card {
  max-width: 560px; width: 100%; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);
}
.token-card h2 { margin: 0 0 8px; font-size: 1.5rem; font-weight: 700; color: var(--text); }
.token-card > p { color: var(--text-secondary); margin: 0 0 28px; line-height: 1.6; }

.steps { display: flex; flex-direction: column; gap: 20px; margin-bottom: 28px; }
.step { display: flex; gap: 14px; align-items: flex-start; }
.step-num {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%;
  background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; margin-top: 1px;
}
.step strong { display: block; margin-bottom: 4px; font-size: 14px; color: var(--text); }
.step p { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }

.link-btn {
  color: var(--brand); font-size: 12px; word-break: break-all;
  text-decoration: underline; text-underline-offset: 2px;
}
.link-btn:hover { color: #6d28d9; }

.token-input-row { display: flex; gap: 10px; margin-bottom: 12px; }
.token-input-row input {
  flex: 1; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: var(--radius);
  font-size: 13px; font-family: ui-monospace, SFMono-Regular, monospace;
}
.token-input-row input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px rgba(124,58,237,0.08); }
.token-input-row button {
  padding: 10px 22px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius);
  font-weight: 600; font-size: 14px; cursor: pointer; white-space: nowrap; transition: background 0.2s;
}
.token-input-row button:hover:not(:disabled) { background: #6d28d9; }
.token-input-row button:disabled { opacity: 0.4; cursor: not-allowed; }

.footnote { font-size: 12px; color: var(--text-muted); margin: 0; }

/* ===== 编辑器主界面 ===== */
.editor-main { max-width: 1280px; margin: 0 auto; padding: 16px 0; }

/* 顶栏 */
.topbar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-bottom: 12px; flex-wrap: wrap;
}
.topbar-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.post-select {
  padding: 7px 12px; border: 1.5px solid var(--border); border-radius: var(--radius);
  font-size: 13px; background: var(--surface); color: var(--text); min-width: 160px; cursor: pointer;
}
.post-select:focus { outline: none; border-color: var(--brand); }
.filename-input {
  padding: 7px 12px; border: 1.5px dashed var(--brand-light); border-radius: var(--radius);
  font-size: 13px; font-family: ui-monospace, SFMono-Regular, monospace; min-width: 240px; flex: 1;
}
.filename-input:focus { outline: none; border-style: solid; border-color: var(--brand); }

.topbar-right { display: flex; align-items: center; gap: 6px; }
.publish-btn {
  padding: 7px 22px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius);
  font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s;
}
.publish-btn:hover:not(:disabled) { background: #6d28d9; }
.publish-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.gear-btn, .delete-btn {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);
  color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
}
.gear-btn:hover { border-color: var(--brand); color: var(--brand); }
.delete-btn:hover { border-color: var(--danger); color: var(--danger); }

/* 设置面板 */
.settings-panel {
  display: flex; gap: 8px; padding: 12px; background: #faf9fc; border: 1px solid var(--border);
  border-radius: var(--radius); margin-bottom: 12px;
}
.settings-panel input {
  flex: 1; padding: 7px 12px; border: 1.5px solid var(--border); border-radius: 6px; font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, monospace;
}
.settings-panel button { padding: 7px 14px; border-radius: 6px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; }
.settings-panel button:first-of-type { background: var(--brand); color: #fff; }
.settings-panel .cancel { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }

/* 元信息栏 */
.meta-bar {
  display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;
}
.title-input {
  flex: 2; min-width: 200px; padding: 9px 14px; border: 1.5px solid var(--border); border-radius: var(--radius);
  font-size: 15px; font-weight: 600;
}
.title-input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px rgba(124,58,237,0.06); }
.date-input {
  padding: 9px 12px; border: 1.5px solid var(--border); border-radius: var(--radius); font-size: 13px; color: var(--text-secondary);
}
.date-input:focus { outline: none; border-color: var(--brand); }
.tags-input {
  flex: 1; min-width: 140px; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: var(--radius); font-size: 13px;
}
.tags-input:focus { outline: none; border-color: var(--brand); }

/* 编辑/预览双栏 */
.split-pane {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1px;
  border: 1.5px solid var(--border); border-radius: var(--radius-lg); overflow: hidden;
  height: calc(100vh - 280px); min-height: 420px;
  background: var(--border);
}
.pane { display: flex; flex-direction: column; background: var(--surface); }
.pane-label {
  padding: 6px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--text-muted); background: #faf9fc;
  border-bottom: 1px solid var(--border); user-select: none;
}
.editor-pane textarea {
  flex: 1; padding: 16px 20px; border: none; resize: none;
  font-family: ui-monospace, 'Cascadia Code', 'Fira Code', SFMono-Regular, monospace;
  font-size: 13.5px; line-height: 1.75; color: var(--text); background: var(--surface);
}
.editor-pane textarea:focus { outline: none; }
.editor-pane textarea::placeholder { color: var(--text-muted); }

.preview-body {
  flex: 1; padding: 16px 24px; overflow-y: auto; line-height: 1.75; font-size: 14px;
}
.preview-body .placeholder { color: var(--text-muted); font-style: italic; }
.preview-body .error { color: var(--danger); }

/* 预览内 Markdown 样式 */
.preview-body :deep(h1) { font-size: 1.6rem; font-weight: 800; color: var(--text); margin-top: 0; }
.preview-body :deep(h2) { font-size: 1.25rem; font-weight: 700; color: var(--brand); border-bottom: 1px solid var(--border); padding-bottom: 4px; }
.preview-body :deep(h3) { font-size: 1.1rem; font-weight: 600; color: #8b5cf6; }
.preview-body :deep(p) { margin: 10px 0; }
.preview-body :deep(code) { background: rgba(124,58,237,0.06); color: #7c3aed; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
.preview-body :deep(pre) { background: #1e1b2e; color: #e0dce8; padding: 16px 20px; border-radius: var(--radius); overflow-x: auto; }
.preview-body :deep(pre code) { background: none; color: inherit; padding: 0; }
.preview-body :deep(blockquote) { border-left: 3px solid #7c3aed; padding: 4px 16px; margin: 12px 0; color: var(--text-secondary); background: var(--brand-bg); border-radius: 0 4px 4px 0; }
.preview-body :deep(table) { width: 100%; border-collapse: collapse; font-size: 13px; }
.preview-body :deep(th) { background: #7c3aed; color: #fff; padding: 8px 12px; text-align: left; font-weight: 600; }
.preview-body :deep(td) { padding: 8px 12px; border: 1px solid var(--border); }
.preview-body :deep(a) { color: #7c3aed; }

/* 状态栏 */
.statusbar { padding: 8px 0; font-size: 12px; }
.status.dim { color: var(--text-muted); }
.status.info { color: #6d28d9; }
.status.success { color: var(--success); font-weight: 600; }
.status.error { color: var(--danger); font-weight: 600; }

/* 响应式 */
@media (max-width: 768px) {
  .split-pane { grid-template-columns: 1fr; height: auto; }
  .editor-pane textarea { height: 350px; }
  .preview-body { height: 350px; }
  .meta-bar { flex-direction: column; }
}
</style>
