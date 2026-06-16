<template>
  <div class="resume-root">
    <div v-if="!token" class="no-token">
      <p>需要先设置 GitHub Token 才能上传简历。</p>
      <p>请前往 <a href="/editor">写文章</a> 页面完成 Token 设置后再回来。</p>
    </div>

    <div v-else class="resume-main">
      <h2>简历管理</h2>

      <!-- 当前简历状态 -->
      <div class="current-status">
        <span v-if="currentFile" class="status-ok">
          当前简历：<code>{{ currentFile.name }}</code>
          （{{ formatSize(currentFile.size) }}）
        </span>
        <span v-else class="status-none">尚未上传简历</span>
      </div>

      <!-- 上传区域 -->
      <div
        class="drop-zone"
        :class="{ dragging }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="handleDrop"
        @click="$refs.fileInput.click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          @change="handleFileSelect"
          style="display:none"
        />
        <div class="drop-content">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p>点击选择文件 或 拖拽文件到此处</p>
          <p class="drop-hint">支持 PDF、PNG、JPG，最大 5MB</p>
        </div>
      </div>

      <!-- 上传进度 -->
      <div v-if="uploading" class="upload-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        <span>{{ uploadingText }}</span>
      </div>

      <!-- 上传结果 -->
      <div v-if="result" :class="['result-toast', result.type]">
        {{ result.text }}
        <button @click="result = null">&times;</button>
      </div>

      <!-- 预览 -->
      <div v-if="currentFile" class="preview-section">
        <h3>预览</h3>
        <div class="preview-box" v-if="currentFileExt === '.pdf'">
          <iframe :src="currentFile.url" width="100%" height="600" frameborder="0"></iframe>
        </div>
        <div class="preview-box" v-else>
          <img :src="currentFile.url" alt="简历预览" style="max-width:100%;" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const OWNER = 'kunbean'
const REPO = 'personworkkk'
const RESUME_DIR = 'docs/public/resume'
const BASE = 'https://api.github.com'
const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main`

const token = ref(localStorage.getItem('gh_blog_token') || '')
const currentFile = ref(null)
const dragging = ref(false)
const uploading = ref(false)
const uploadingText = ref('')
const progress = ref(0)
const result = ref(null)
const fileInput = ref(null)

const currentFileExt = computed(() => {
  if (!currentFile.value) return ''
  return '.' + currentFile.value.name.split('.').pop().toLowerCase()
})

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `token ${token.value}`, Accept: 'application/vnd.github.v3+json', ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `HTTP ${res.status}`)
  }
  return res.json()
}

async function checkExisting() {
  try {
    const files = await api(`/repos/${OWNER}/${REPO}/contents/${RESUME_DIR}`)
    if (Array.isArray(files) && files.length > 0) {
      const file = files[0]
      currentFile.value = {
        name: file.name,
        size: file.size,
        url: `${RAW_BASE}/${RESUME_DIR}/${file.name}`,
      }
    }
  } catch {
    currentFile.value = null
  }
}

async function uploadFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    result.value = { type: 'error', text: '文件大小不能超过 5MB' }
    return
  }

  uploading.value = true
  uploadingText.value = '上传中...'
  progress.value = 30
  result.value = null

  try {
    const reader = new FileReader()
    const base64Content = await new Promise((resolve, reject) => {
      reader.onload = () => {
        // reader.result is like "data:application/pdf;base64,XXXX..."
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    progress.value = 60
    uploadingText.value = '提交到 GitHub...'

    // 检查同名文件是否存在
    let sha = null
    try {
      const existing = await api(`/repos/${OWNER}/${REPO}/contents/${RESUME_DIR}/${file.name}`)
      sha = existing.sha
    } catch {}

    await api(`/repos/${OWNER}/${REPO}/contents/${RESUME_DIR}/${file.name}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Update resume: ${file.name}`,
        content: base64Content,
        ...(sha ? { sha } : {}),
      }),
    })

    progress.value = 100
    result.value = { type: 'success', text: `简历「${file.name}」已上传，约 1 分钟后生效` }
    await checkExisting()
  } catch (e) {
    result.value = { type: 'error', text: `上传失败：${e.message}` }
  } finally {
    uploading.value = false
    progress.value = 0
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0]
  if (file) uploadFile(file)
}

function handleDrop(e) {
  dragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) uploadFile(file)
}

onMounted(() => {
  if (token.value) checkExisting()
})
</script>

<style scoped>
.resume-root {
  max-width: 800px; margin: 0 auto; padding: 20px 0;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.resume-root h2 { font-size: 1.3rem; font-weight: 700; margin: 0 0 16px; }
.resume-root h3 { font-size: 1rem; font-weight: 600; margin: 20px 0 10px; }

.no-token { text-align: center; padding: 40px; color: #666; }
.no-token a { color: #7c3aed; }

.current-status { margin-bottom: 16px; font-size: 14px; }
.status-ok { color: #10b981; }
.status-none { color: #8b88a0; }
.status-ok code { background: #f0fdf4; padding: 2px 6px; border-radius: 4px; }

.drop-zone {
  border: 2px dashed #d4d0e8; border-radius: 12px; padding: 40px;
  text-align: center; cursor: pointer; transition: all 0.2s; background: #faf9fc;
}
.drop-zone:hover, .drop-zone.dragging {
  border-color: #7c3aed; background: rgba(124,58,237,0.04);
}
.drop-content { color: #666; }
.drop-content svg { margin-bottom: 8px; color: #a78bfa; }
.drop-content p { margin: 4px 0; font-size: 14px; }
.drop-hint { font-size: 12px !important; color: #999; }

.upload-bar {
  margin-top: 12px; height: 6px; background: #e4e0ee; border-radius: 3px;
  position: relative; overflow: hidden;
}
.progress-fill {
  height: 100%; background: #7c3aed; border-radius: 3px; transition: width 0.3s;
}
.upload-bar span {
  display: block; font-size: 12px; color: #666; margin-top: 4px;
}

.result-toast {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border-radius: 8px; margin-top: 12px; font-size: 13px; font-weight: 600;
}
.result-toast.success { background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46; }
.result-toast.error { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; }
.result-toast button { margin-left: auto; background: none; border: none; font-size: 18px; cursor: pointer; color: inherit; opacity: 0.6; }

.preview-box {
  border: 1px solid #e4e0ee; border-radius: 8px; overflow: hidden;
  background: #fff;
}
</style>
