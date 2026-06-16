<template>
  <div class="editor-app">
    <!-- Token 设置 -->
    <div v-if="!token" class="token-setup">
      <div class="setup-card">
        <h2>🔑 首次使用，请设置 GitHub Token</h2>
        <p>用于提交文章到 GitHub 仓库</p>
        <ol>
          <li>打开 <a href="https://github.com/settings/tokens/new?scopes=repo&description=BlogEditor" target="_blank">这个链接</a> 生成 Token</li>
          <li>Expiration 选 <b>No expiration</b></li>
          <li>点击底部 <b>Generate token</b></li>
          <li>复制生成的 token，粘贴到下面</li>
        </ol>
        <input
          v-model="tokenInput"
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          @keyup.enter="saveToken"
        />
        <button class="btn-gradient" @click="saveToken">💾 保存 Token</button>
        <p class="hint">Token 只保存在你的浏览器中，不会上传到任何服务器。</p>
      </div>
    </div>

    <!-- 编辑器主界面 -->
    <div v-else class="editor-main">
      <!-- 顶部栏 -->
      <div class="editor-header">
        <div class="header-left">
          <h1>✏️ 文章编辑器</h1>
        </div>
        <div class="header-right">
          <button class="btn-outline" @click="showTokenSettings = !showTokenSettings">
            ⚙️ Token
          </button>
        </div>
      </div>

      <!-- Token 更换面板 -->
      <div v-if="showTokenSettings" class="token-panel">
        <input v-model="tokenInput" type="password" placeholder="输入新 Token" />
        <button class="btn-gradient-sm" @click="updateToken">更新</button>
      </div>

      <!-- 文章选择 -->
      <div class="post-selector">
        <label>📂 选择文章：</label>
        <select v-model="selectedPost" @change="loadPost">
          <option value="__new__">+ 新建文章</option>
          <option v-for="post in posts" :key="post.name" :value="post.name">
            {{ post.name.replace('.md', '') }}
          </option>
        </select>
        <button v-if="selectedPost !== '__new__'" class="btn-danger-sm" @click="deletePost">
          🗑️ 删除
        </button>
      </div>

      <!-- 新建时填写文件名 -->
      <div v-if="selectedPost === '__new__'" class="new-post-form">
        <input
          v-model="newFileName"
          placeholder="文件名，如：2024-03-01-react-intro"
          class="file-input"
        />
        <span class="ext">.md</span>
      </div>

      <!-- 文章元信息 -->
      <div class="meta-editor">
        <input v-model="title" placeholder="文章标题" class="title-input" />
        <div class="meta-row">
          <input v-model="date" type="date" />
          <input v-model="tags" placeholder="标签，用逗号分隔如：React, 前端" />
        </div>
      </div>

      <!-- 编辑区 + 预览区 -->
      <div class="editor-preview">
        <div class="editor-pane">
          <div class="pane-header">📝 Markdown</div>
          <textarea
            v-model="content"
            placeholder="在这里写 Markdown..."
            @scroll="syncScroll"
            ref="editorRef"
          ></textarea>
        </div>
        <div class="preview-pane">
          <div class="pane-header">👀 预览</div>
          <div
            class="preview-content"
            v-html="renderedContent"
            ref="previewRef"
          ></div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="editor-footer">
        <div class="footer-left">
          <span v-if="saveStatus" :class="['status-badge', saveStatus.type]">
            {{ saveStatus.text }}
          </span>
        </div>
        <div class="footer-right">
          <button class="btn-gradient-lg" @click="publish" :disabled="publishing">
            {{ publishing ? '🚀 发布中...' : '🌸 发布上线' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { marked } from 'marked'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function (code, lang) {
    return `<pre><code class="language-${lang || ''}">${escapeHtml(code)}</code></pre>`
  },
})

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, (c) => map[c])
}

const REPO_OWNER = 'kunbean'
const REPO_NAME = 'personworkkk'
const POSTS_PATH = 'docs/posts'
const API_BASE = 'https://api.github.com'

// 状态
const token = ref(localStorage.getItem('gh_blog_token') || '')
const tokenInput = ref('')
const showTokenSettings = ref(false)
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

// 渲染 Markdown
const renderedContent = computed(() => {
  if (!content.value) return '<p style="color:#aaa;">预览区域，开始写点东西吧 ✨</p>'
  try {
    return marked.parse(content.value)
  } catch (e) {
    return `<p style="color:red;">渲染出错</p>`
  }
})

// API 请求
async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `token ${token.value}`,
      Accept: 'application/vnd.github.v3+json',
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

// 保存 Token
function saveToken() {
  if (!tokenInput.value.trim()) return
  token.value = tokenInput.value.trim()
  localStorage.setItem('gh_blog_token', token.value)
  tokenInput.value = ''
  loadPosts()
}

function updateToken() {
  saveToken()
  showTokenSettings.value = false
}

// 加载文章列表
async function loadPosts() {
  try {
    const files = await apiRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_PATH}`)
    posts.value = files
      .filter((f) => f.name.endsWith('.md') && f.name !== 'index.md')
      .sort((a, b) => b.name.localeCompare(a.name))
  } catch (e) {
    console.error('加载文章列表失败:', e)
    posts.value = []
  }
}

// 加载单篇文章
async function loadPost() {
  if (selectedPost.value === '__new__') {
    title.value = ''
    date.value = new Date().toISOString().split('T')[0]
    tags.value = ''
    content.value = ''
    newFileName.value = ''
    return
  }

  try {
    const file = await apiRequest(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_PATH}/${selectedPost.value}`
    )
    const raw = atob(file.content)
    content.value = raw

    // 尝试解析 YAML frontmatter
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (match) {
      const frontmatter = match[1]
      const body = match[2]
      const titleMatch = frontmatter.match(/title:\s*["']?(.+?)["']?\s*$/)
      const dateMatch = frontmatter.match(/date:\s*["']?(.+?)["']?\s*$/)
      const tagsMatch = frontmatter.match(/tags:\s*["']?(.+?)["']?\s*$/)

      if (titleMatch) title.value = titleMatch[1]
      if (dateMatch) date.value = dateMatch[1]
      if (tagsMatch) tags.value = tagsMatch[1]
      content.value = body
    } else {
      // 没有 frontmatter，尝试从第一行提取标题
      const titleMatch = raw.match(/^#\s+(.+)$/m)
      if (titleMatch) title.value = titleMatch[1]
    }
  } catch (e) {
    alert('加载文章失败: ' + e.message)
  }
}

// 获取文件 SHA（更新时需要）
async function getFileSha(filePath) {
  try {
    const file = await apiRequest(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`
    )
    return file.sha
  } catch {
    return null
  }
}

// 生成带 frontmatter 的 Markdown
function buildMarkdown() {
  const tagList = tags.value
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .join(', ')

  const frontmatter = [
    '---',
    `title: "${title.value || '无标题'}"`,
    `date: ${date.value}`,
    `tags: [${tagList}]`,
    '---',
    '',
  ].join('\n')

  return frontmatter + content.value
}

// 发布
async function publish() {
  if (!title.value.trim()) {
    alert('请填写文章标题')
    return
  }

  publishing.value = true
  saveStatus.value = { type: 'info', text: '⏳ 提交中...' }

  try {
    let fileName = selectedPost.value
    if (fileName === '__new__') {
      if (!newFileName.value.trim()) {
        alert('请输入文件名')
        publishing.value = false
        return
      }
      fileName = newFileName.value.trim().replace(/\.md$/, '') + '.md'
    }

    const filePath = `${POSTS_PATH}/${fileName}`
    const markdown = buildMarkdown()
    const sha = await getFileSha(filePath)

    const body = {
      message: `📝 更新文章: ${title.value}`,
      content: btoa(unescape(encodeURIComponent(markdown))),
      ...(sha ? { sha } : {}),
    }

    await apiRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })

    saveStatus.value = { type: 'success', text: '✅ 发布成功！1分钟后上线' }

    // 如果是新文章，刷新列表
    if (selectedPost.value === '__new__') {
      selectedPost.value = fileName
      await loadPosts()
    }
  } catch (e) {
    saveStatus.value = { type: 'error', text: '❌ 发布失败: ' + e.message }
  } finally {
    publishing.value = false
    setTimeout(() => (saveStatus.value = null), 5000)
  }
}

// 删除文章
async function deletePost() {
  if (selectedPost.value === '__new__') return
  if (!confirm(`确定删除「${selectedPost.value}」吗？此操作不可撤销。`)) return

  try {
    const filePath = `${POSTS_PATH}/${selectedPost.value}`
    const sha = await getFileSha(filePath)
    if (!sha) throw new Error('文件不存在')

    await apiRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`, {
      method: 'DELETE',
      body: JSON.stringify({
        message: `🗑️ 删除文章: ${selectedPost.value}`,
        sha,
      }),
    })

    saveStatus.value = { type: 'success', text: '✅ 已删除' }
    selectedPost.value = '__new__'
    title.value = ''
    content.value = ''
    await loadPosts()
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

// 滚动同步
function syncScroll() {
  if (!editorRef.value || !previewRef.value) return
  const editor = editorRef.value
  const preview = previewRef.value
  const ratio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight)
  preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight)
}

onMounted(() => {
  if (token.value) {
    loadPosts()
  }
})
</script>

<style scoped>
/* ===== 整体容器 ===== */
.editor-app {
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* ===== Token 设置页 ===== */
.token-setup {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}

.setup-card {
  background: var(--vp-c-bg-elv);
  border-radius: 24px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--vp-c-border);
  text-align: center;
}

.setup-card h2 {
  background: var(--pink-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.setup-card ol {
  text-align: left;
  margin: 16px 0;
  padding-left: 20px;
  line-height: 2;
}

.setup-card input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--vp-c-border);
  border-radius: 12px;
  font-size: 14px;
  font-family: monospace;
  margin: 12px 0;
  transition: border-color 0.3s;
}

.setup-card input:focus {
  outline: none;
  border-color: #ff85b3;
  box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
}

.hint {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-top: 8px;
}

/* ===== 编辑主界面 ===== */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.editor-header h1 {
  background: var(--pink-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 1.6rem;
  margin: 0;
}

/* Token 面板 */
.token-panel {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  margin-bottom: 16px;
}

.token-panel input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid var(--vp-c-border);
  border-radius: 8px;
  font-family: monospace;
  font-size: 13px;
}

/* 文章选择器 */
.post-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.post-selector label {
  font-weight: 600;
  white-space: nowrap;
}

.post-selector select {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid var(--vp-c-border);
  border-radius: 12px;
  background: var(--vp-c-bg-elv);
  font-size: 14px;
  cursor: pointer;
}

/* 新建文件名 */
.new-post-form {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 4px;
}

.file-input {
  flex: 1;
  padding: 10px 14px;
  border: 2px dashed #ff85b3;
  border-radius: 12px;
  font-size: 14px;
  font-family: monospace;
}

.file-input:focus {
  outline: none;
  border-style: solid;
  box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
}

.ext {
  color: var(--vp-c-text-3);
  font-weight: 600;
}

/* 元信息 */
.meta-editor {
  margin-bottom: 16px;
}

.title-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--vp-c-border);
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.title-input:focus {
  outline: none;
  border-color: #ff85b3;
  box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
}

.meta-row {
  display: flex;
  gap: 12px;
}

.meta-row input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid var(--vp-c-border);
  border-radius: 10px;
  font-size: 13px;
}

.meta-row input:focus {
  outline: none;
  border-color: #ff85b3;
}

/* 编辑器 + 预览 */
.editor-preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: 500px;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .editor-preview {
    grid-template-columns: 1fr;
    height: auto;
  }
  .editor-pane, .preview-pane {
    height: 400px;
  }
}

.editor-pane,
.preview-pane {
  display: flex;
  flex-direction: column;
  border: 2px solid var(--vp-c-border);
  border-radius: 16px;
  overflow: hidden;
  background: var(--vp-c-bg-elv);
}

.pane-header {
  padding: 8px 16px;
  font-weight: 700;
  font-size: 13px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-border);
}

.editor-pane textarea {
  flex: 1;
  padding: 16px;
  border: none;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  line-height: 1.7;
  resize: none;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
}

.editor-pane textarea:focus {
  outline: none;
}

.preview-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.preview-content :deep(h1) {
  background: var(--pink-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.preview-content :deep(h2) {
  color: #c084fc;
  border-bottom: 2px solid #f9c8d8;
  padding-bottom: 4px;
}

.preview-content :deep(code) {
  color: #ff6b9d;
  background: rgba(255, 107, 157, 0.08);
  border-radius: 4px;
  padding: 2px 6px;
}

.preview-content :deep(pre) {
  background: #2d1b2e;
  color: #f0d8e8;
  padding: 16px;
  border-radius: 12px;
  overflow-x: auto;
}

.preview-content :deep(blockquote) {
  border-left: 4px solid #ff85b3;
  background: rgba(255, 107, 157, 0.06);
  padding: 8px 16px;
  border-radius: 0 8px 8px 0;
}

.preview-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.preview-content :deep(th) {
  background: var(--pink-gradient);
  color: white;
  padding: 8px 12px;
}

.preview-content :deep(td) {
  padding: 8px 12px;
  border: 1px solid var(--vp-c-border);
}

/* 底部 */
.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.status-badge {
  padding: 6px 14px;
  border-radius: 50px;
  font-size: 13px;
  font-weight: 600;
}

.status-badge.info {
  background: rgba(192, 132, 252, 0.15);
  color: #7c3aed;
}

.status-badge.success {
  background: rgba(52, 211, 153, 0.15);
  color: #059669;
}

.status-badge.error {
  background: rgba(248, 113, 113, 0.15);
  color: #dc2626;
}

/* 按钮 */
.btn-gradient {
  background: var(--pink-gradient);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 12px 28px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 15px rgba(255, 107, 157, 0.25);
}

.btn-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 157, 0.35);
}

.btn-gradient:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-gradient-sm {
  background: var(--purple-gradient);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 6px 14px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-gradient-lg {
  background: var(--pink-gradient);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 14px 36px;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 20px rgba(255, 107, 157, 0.3);
}

.btn-gradient-lg:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 8px 30px rgba(255, 107, 157, 0.4);
}

.btn-gradient-lg:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-outline {
  background: transparent;
  border: 2px solid var(--vp-c-border);
  border-radius: 50px;
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: all 0.3s;
}

.btn-outline:hover {
  border-color: #ff85b3;
  color: #ff6b9d;
}

.btn-danger-sm {
  background: transparent;
  border: 2px solid #fecaca;
  border-radius: 10px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  color: #dc2626;
  white-space: nowrap;
  transition: all 0.3s;
}

.btn-danger-sm:hover {
  background: #fef2f2;
}
</style>
