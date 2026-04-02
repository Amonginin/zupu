<template>
  <AppLayout>
    <div class="audits-page">
      <!-- 页面标题 -->
      <header class="audits-page__header">
        <h1 class="audits-page__title">审计日志</h1>
        <p class="audits-page__desc">追踪系统中的所有操作记录</p>
      </header>

      <ZCard>
        <!-- 筛选栏 -->
        <div class="filter-bar">
          <ZSelect
            v-model="filter.targetType"
            label="目标类型"
            :options="targetTypeOptions"
            placeholder="全部类型"
          />
          <ZSelect
            v-model="filter.limit"
            label="显示数量"
            :options="limitOptions"
          />
          <ZButton variant="primary" @click="loadLogs">刷新</ZButton>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <ZLoading text="加载中..." />
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-state">
          {{ error }}
        </div>

        <!-- 日志列表 -->
        <div v-else class="logs-timeline">
          <TransitionGroup name="list">
            <div
              v-for="log in logs"
              :key="log.id"
              class="log-item"
            >
              <div class="log-item__marker">
                <span class="log-item__dot" :class="getActionClass(log.action)"></span>
              </div>
              <div class="log-item__content">
                <div class="log-item__header">
                  <ZBadge :variant="getActionVariant(log.action)" size="sm">
                    {{ formatAction(log.action) }}
                  </ZBadge>
                  <ZBadge variant="default" size="sm">
                    {{ formatTargetType(log.targetType) }}
                  </ZBadge>
                  <span class="log-item__time">{{ formatTime(log.createdAt) }}</span>
                </div>
                <div class="log-item__meta">
                  <span class="log-item__user">
                    👤 {{ log.user?.username || '系统' }}
                  </span>
                  <span
                    v-if="log.metadataJson"
                    class="log-item__detail"
                    @click="showDetail(log)"
                  >
                    查看详情 →
                  </span>
                </div>
              </div>
            </div>
          </TransitionGroup>

          <!-- 空状态 -->
          <div v-if="logs.length === 0" class="empty-state">
            暂无日志记录
          </div>
        </div>
      </ZCard>

      <!-- 详情弹窗 -->
      <ZModal v-model="showModal" title="日志详情" size="md">
        <template v-if="detailLog">
          <div class="detail-grid">
            <div class="detail-item">
              <label>操作</label>
              <span>{{ formatAction(detailLog.action) }}</span>
            </div>
            <div class="detail-item">
              <label>目标类型</label>
              <span>{{ formatTargetType(detailLog.targetType) }}</span>
            </div>
            <div class="detail-item">
              <label>目标ID</label>
              <span class="detail-item__mono">{{ detailLog.targetId || '-' }}</span>
            </div>
            <div class="detail-item">
              <label>时间</label>
              <span>{{ formatTime(detailLog.createdAt) }}</span>
            </div>
            <div class="detail-item">
              <label>操作人</label>
              <span>{{ detailLog.user?.username || '系统' }}</span>
            </div>
          </div>
          <div v-if="detailLog.metadataJson" class="detail-metadata">
            <label>元数据</label>
            <pre>{{ formatMetadata(detailLog.metadataJson) }}</pre>
          </div>
        </template>
        <template #footer>
          <ZButton variant="secondary" @click="showModal = false">关闭</ZButton>
        </template>
      </ZModal>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { fetchAuditLogs } from '../services/api';
import { AppLayout } from '../components/layout';
import { ZCard, ZSelect, ZButton, ZBadge, ZModal, ZLoading } from '../components/ui';

interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadataJson?: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
  };
}

const logs = ref<AuditLog[]>([]);
const loading = ref(false);
const error = ref('');
const detailLog = ref<AuditLog | null>(null);
const showModal = ref(false);

const filter = reactive({
  targetType: '',
  limit: 100,
});

const targetTypeOptions = [
  { value: '', label: '全部类型' },
  { value: 'Member', label: '成员' },
  { value: 'Relationship', label: '关系' },
  { value: 'Export', label: '导出' },
  { value: 'OcrTask', label: 'OCR任务' },
];

const limitOptions = [
  { value: 50, label: '最近 50 条' },
  { value: 100, label: '最近 100 条' },
  { value: 200, label: '最近 200 条' },
];

async function loadLogs() {
  loading.value = true;
  error.value = '';
  try {
    logs.value = await fetchAuditLogs({
      targetType: filter.targetType || undefined,
      limit: filter.limit,
    });
  } catch (e: any) {
    error.value = e.response?.data?.message || '加载审计日志失败';
  } finally {
    loading.value = false;
  }
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatAction(action: string) {
  const map: Record<string, string> = {
    member_created: '创建成员',
    member_updated: '更新成员',
    member_deleted: '删除成员',
    member_created_from_ocr: 'OCR入库',
    relation_created: '创建关系',
    relation_deleted: '删除关系',
    export_created: '创建导出',
    export_completed: '导出完成',
    ocr_task_created: '创建OCR任务',
    ocr_task_reviewed: 'OCR校对完成',
  };
  return map[action] || action;
}

function getActionClass(action: string) {
  if (action.includes('created') || action.includes('completed')) return 'log-item__dot--success';
  if (action.includes('updated') || action.includes('reviewed')) return 'log-item__dot--warning';
  if (action.includes('deleted')) return 'log-item__dot--error';
  return '';
}

function getActionVariant(action: string): 'success' | 'warning' | 'error' | 'default' {
  if (action.includes('created') || action.includes('completed')) return 'success';
  if (action.includes('updated') || action.includes('reviewed')) return 'warning';
  if (action.includes('deleted')) return 'error';
  return 'default';
}

function formatTargetType(type: string) {
  const map: Record<string, string> = {
    Member: '成员',
    Relationship: '关系',
    Export: '导出',
    ExportTask: '导出任务',
    OcrTask: 'OCR任务',
  };
  return map[type] || type;
}

function formatMetadata(json: string) {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

function showDetail(log: AuditLog) {
  detailLog.value = log;
  showModal.value = true;
}

onMounted(loadLogs);
</script>

<style scoped>
.audits-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

/* 页面标题 */
.audits-page__header {
  text-align: center;
}

.audits-page__title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm);
}

.audits-page__desc {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin: 0;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
  margin-bottom: var(--spacing-xl);
  flex-wrap: wrap;
}

.filter-bar > * {
  flex: 1;
  min-width: 150px;
}

.filter-bar > button {
  flex: 0 0 auto;
}

/* 加载和错误状态 */
.loading-state {
  padding: var(--spacing-2xl);
  text-align: center;
}

.error-state {
  padding: var(--spacing-lg);
  color: var(--color-error);
  background: var(--color-error-light);
  border-radius: var(--radius-md);
  text-align: center;
}

/* 时间线日志 */
.logs-timeline {
  position: relative;
  padding-left: var(--spacing-xl);
}

.logs-timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-light);
}

.log-item {
  position: relative;
  display: flex;
  gap: var(--spacing-md);
  padding-bottom: var(--spacing-lg);
}

.log-item__marker {
  position: absolute;
  left: calc(-1 * var(--spacing-xl) + 4px);
  top: 4px;
}

.log-item__dot {
  display: block;
  width: 10px;
  height: 10px;
  background: var(--border-color);
  border-radius: 50%;
  border: 2px solid var(--bg-secondary);
}

.log-item__dot--success {
  background: var(--color-success);
}

.log-item__dot--warning {
  background: var(--color-warning);
}

.log-item__dot--error {
  background: var(--color-error);
}

.log-item__content {
  flex: 1;
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.log-item__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  flex-wrap: wrap;
}

.log-item__time {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-left: auto;
}

.log-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.log-item__user {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.log-item__detail {
  font-size: var(--text-sm);
  color: var(--color-primary);
  cursor: pointer;
}

.log-item__detail:hover {
  text-decoration: underline;
}

/* 空状态 */
.empty-state {
  padding: var(--spacing-2xl);
  text-align: center;
  color: var(--text-tertiary);
}

/* 详情弹窗 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.detail-item label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.detail-item span {
  font-weight: 500;
}

.detail-item__mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.detail-metadata {
  margin-top: var(--spacing-lg);
}

.detail-metadata label {
  display: block;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.detail-metadata pre {
  background: var(--bg-tertiary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  white-space: pre-wrap;
  overflow-x: auto;
  margin: 0;
}

/* 列表动画 */
.list-enter-active,
.list-leave-active {
  transition: all var(--transition-base);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 响应式 */
@media (max-width: 767px) {
  .filter-bar {
    flex-direction: column;
  }

  .filter-bar > * {
    width: 100%;
  }

  .log-item__time {
    width: 100%;
    margin-left: 0;
    margin-top: var(--spacing-xs);
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
