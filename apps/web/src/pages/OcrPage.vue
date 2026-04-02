<template>
  <AppLayout>
    <div class="ocr-page">
      <!-- 页面标题 -->
      <header class="ocr-page__header">
        <h1 class="ocr-page__title">OCR 导入</h1>
        <p class="ocr-page__desc">上传族谱图片，自动识别并提取成员信息</p>
      </header>

      <ZCard decorated>
        <!-- 上传区域 -->
        <div class="upload-section">
          <h3 class="section-title">📷 第一步：上传原始图片</h3>
          
          <div
            class="upload-area"
            :class="{ 'upload-area--dragover': isDragover }"
            @dragover.prevent="isDragover = true"
            @dragleave="isDragover = false"
            @drop.prevent="onDrop"
          >
            <div class="upload-area__content">
              <span class="upload-area__icon">📜</span>
              <p class="upload-area__text">
                将文件拖拽到此处，或
                <label class="upload-area__browse">
                  点击选择文件
                  <input type="file" accept="image/*" @change="onSelectFile" hidden />
                </label>
              </p>
              <p class="upload-area__hint">支持 JPG、PNG 等图片格式</p>
            </div>
          </div>

          <div v-if="selectedFile" class="selected-file">
            <ZBadge variant="info">已选择: {{ selectedFile.name }}</ZBadge>
            <ZButton variant="primary" @click="onUpload" :loading="uploading">
              {{ uploading ? '上传中...' : '上传图片' }}
            </ZButton>
          </div>

          <div v-if="sourceDocumentId" class="upload-success">
            <ZBadge variant="success">✓ 上传成功</ZBadge>
            <span class="upload-success__id">文档ID: {{ sourceDocumentId }}</span>
          </div>
        </div>

        <!-- OCR任务 -->
        <div class="ocr-section">
          <h3 class="section-title">🔍 第二步：执行OCR识别</h3>
          
          <div class="ocr-actions">
            <ZButton
              variant="accent"
              :disabled="!sourceDocumentId"
              @click="onCreateOcrTask"
            >
              创建 OCR 任务
            </ZButton>
            <ZButton
              variant="secondary"
              :disabled="!ocrTaskId"
              @click="onRefresh"
            >
              刷新任务状态
            </ZButton>
          </div>

          <!-- 结果展示 -->
          <div v-if="taskResult" class="ocr-result">
            <h4 class="ocr-result__title">识别结果</h4>
            <pre class="ocr-result__content">{{ taskResult }}</pre>
          </div>
        </div>
      </ZCard>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createOcrTask, fetchOcrTask, uploadSourceFile } from '../services/api';
import { AppLayout } from '../components/layout';
import { ZCard, ZButton, ZBadge } from '../components/ui';

const selectedFile = ref<File | null>(null);
const sourceDocumentId = ref('');
const ocrTaskId = ref('');
const taskResult = ref('');
const isDragover = ref(false);
const uploading = ref(false);

function onSelectFile(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFile.value = input.files?.[0] ?? null;
}

function onDrop(event: DragEvent) {
  isDragover.value = false;
  const file = event.dataTransfer?.files[0];
  if (file && file.type.startsWith('image/')) {
    selectedFile.value = file;
  }
}

async function onUpload() {
  if (!selectedFile.value) return;
  uploading.value = true;
  try {
    const source = await uploadSourceFile(selectedFile.value);
    sourceDocumentId.value = source.id;
  } finally {
    uploading.value = false;
  }
}

async function onCreateOcrTask() {
  const task = await createOcrTask(sourceDocumentId.value);
  ocrTaskId.value = task.id;
  taskResult.value = JSON.stringify(task, null, 2);
}

async function onRefresh() {
  const task = await fetchOcrTask(ocrTaskId.value);
  taskResult.value = JSON.stringify(task, null, 2);
}
</script>

<style scoped>
.ocr-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

/* 页面标题 */
.ocr-page__header {
  text-align: center;
}

.ocr-page__title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm);
}

.ocr-page__desc {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin: 0;
}

.section-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-lg);
}

/* 上传区域 */
.upload-section {
  margin-bottom: var(--spacing-2xl);
}

.upload-area {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--spacing-2xl);
  text-align: center;
  transition: all var(--transition-fast);
  cursor: pointer;
}

.upload-area:hover,
.upload-area--dragover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.upload-area__icon {
  font-size: 48px;
  display: block;
  margin-bottom: var(--spacing-md);
}

.upload-area__text {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-sm);
}

.upload-area__browse {
  color: var(--color-primary);
  font-weight: 500;
  cursor: pointer;
}

.upload-area__browse:hover {
  text-decoration: underline;
}

.upload-area__hint {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin: 0;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.upload-success {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-success-light);
  border-radius: var(--radius-md);
}

.upload-success__id {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

/* OCR区域 */
.ocr-section {
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border-light);
}

.ocr-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.ocr-result {
  margin-top: var(--spacing-lg);
}

.ocr-result__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md);
}

.ocr-result__content {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-primary);
  white-space: pre-wrap;
  overflow-x: auto;
  margin: 0;
}

/* 响应式 */
@media (max-width: 767px) {
  .ocr-actions {
    flex-direction: column;
  }
}
</style>
