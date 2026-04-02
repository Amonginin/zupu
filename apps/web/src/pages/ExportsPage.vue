<template>
  <AppLayout>
    <div class="exports-page">
      <!-- 页面标题 -->
      <header class="exports-page__header">
        <h1 class="exports-page__title">PDF 导出</h1>
        <p class="exports-page__desc">将族谱数据导出为精美的PDF文档</p>
      </header>

      <ZCard decorated>
        <!-- 导出选项 -->
        <div class="export-section">
          <h3 class="section-title">📄 创建导出任务</h3>
          
          <div class="export-options">
            <div class="export-option export-option--selected">
              <span class="export-option__icon">📜</span>
              <span class="export-option__name">标准族谱</span>
              <span class="export-option__desc">包含所有成员及关系</span>
            </div>
          </div>

          <div class="export-actions">
            <ZButton variant="primary" size="lg" @click="onCreateExport">
              创建导出任务
            </ZButton>
            <ZButton
              variant="secondary"
              size="lg"
              :disabled="!exportTaskId"
              @click="onRefresh"
            >
              刷新导出状态
            </ZButton>
          </div>
        </div>

        <!-- 下载链接 -->
        <div v-if="downloadUrl" class="download-section">
          <div class="download-card">
            <span class="download-card__icon">✅</span>
            <div class="download-card__info">
              <h4 class="download-card__title">导出完成</h4>
              <p class="download-card__desc">您的族谱PDF已准备就绪</p>
            </div>
            <ZButton variant="accent" @click="openDownload">
              下载文件
            </ZButton>
          </div>
        </div>

        <!-- 结果展示 -->
        <div v-if="result" class="result-section">
          <h4 class="result-section__title">任务详情</h4>
          <pre class="result-section__content">{{ result }}</pre>
        </div>
      </ZCard>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createExportTask, fetchExportTask } from '../services/api';
import { AppLayout } from '../components/layout';
import { ZCard, ZButton } from '../components/ui';

const exportTaskId = ref('');
const downloadUrl = ref('');
const result = ref('');

async function onCreateExport() {
  const task = await createExportTask();
  exportTaskId.value = task.id;
  result.value = JSON.stringify(task, null, 2);
}

async function onRefresh() {
  const task = await fetchExportTask(exportTaskId.value);
  result.value = JSON.stringify(task, null, 2);
  downloadUrl.value = task.downloadUrl ?? '';
}

function openDownload() {
  if (downloadUrl.value) {
    window.open(downloadUrl.value, '_blank');
  }
}
</script>

<style scoped>
.exports-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

/* 页面标题 */
.exports-page__header {
  text-align: center;
}

.exports-page__title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm);
}

.exports-page__desc {
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

/* 导出选项 */
.export-section {
  margin-bottom: var(--spacing-xl);
}

.export-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.export-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl);
  background: var(--bg-tertiary);
  border: 2px solid var(--border-light);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}

.export-option:hover {
  border-color: var(--color-primary);
}

.export-option--selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.export-option__icon {
  font-size: 48px;
}

.export-option__name {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--text-primary);
}

.export-option__desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.export-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
}

/* 下载区域 */
.download-section {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border-light);
}

.download-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--color-success-light);
  border-radius: var(--radius-lg);
}

.download-card__icon {
  font-size: 40px;
}

.download-card__info {
  flex: 1;
}

.download-card__title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--color-success);
  margin: 0 0 var(--spacing-xs);
}

.download-card__desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

/* 结果区域 */
.result-section {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border-light);
}

.result-section__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md);
}

.result-section__content {
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
  .export-actions {
    flex-direction: column;
  }

  .download-card {
    flex-direction: column;
    text-align: center;
  }
}
</style>
