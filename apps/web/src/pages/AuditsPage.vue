<template>
  <Card>
    <h2>审计日志</h2>

    <!-- 筛选 -->
    <div class="filter-bar">
      <select v-model="filter.targetType">
        <option value="">全部类型</option>
        <option value="Member">成员</option>
        <option value="Relationship">关系</option>
        <option value="Export">导出</option>
        <option value="OcrTask">OCR任务</option>
      </select>
      <select v-model="filter.limit">
        <option :value="50">最近 50 条</option>
        <option :value="100">最近 100 条</option>
        <option :value="200">最近 200 条</option>
      </select>
      <button @click="loadLogs">刷新</button>
    </div>

    <!-- 日志列表 -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <table v-else class="logs-table">
      <thead>
        <tr>
          <th>时间</th>
          <th>操作</th>
          <th>目标类型</th>
          <th>操作人</th>
          <th>详情</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in logs" :key="log.id">
          <td class="time">{{ formatTime(log.createdAt) }}</td>
          <td>
            <span :class="['action-tag', getActionClass(log.action)]">
              {{ formatAction(log.action) }}
            </span>
          </td>
          <td>{{ formatTargetType(log.targetType) }}</td>
          <td>{{ log.user?.username || '系统' }}</td>
          <td class="metadata">
            <span v-if="log.metadataJson" @click="showDetail(log)" class="detail-link">
              查看详情
            </span>
            <span v-else>-</span>
          </td>
        </tr>
        <tr v-if="logs.length === 0">
          <td colspan="5" class="no-data">暂无日志记录</td>
        </tr>
      </tbody>
    </table>

    <!-- 详情弹窗 -->
    <div v-if="detailLog" class="modal-overlay" @click="detailLog = null">
      <div class="modal" @click.stop>
        <h3>日志详情</h3>
        <div class="modal-content">
          <p><strong>操作：</strong>{{ formatAction(detailLog.action) }}</p>
          <p><strong>目标：</strong>{{ formatTargetType(detailLog.targetType) }} ({{ detailLog.targetId || '-' }})</p>
          <p><strong>时间：</strong>{{ formatTime(detailLog.createdAt) }}</p>
          <p><strong>操作人：</strong>{{ detailLog.user?.username || '系统' }}</p>
          <div v-if="detailLog.metadataJson">
            <strong>元数据：</strong>
            <pre>{{ formatMetadata(detailLog.metadataJson) }}</pre>
          </div>
        </div>
        <button @click="detailLog = null">关闭</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { fetchAuditLogs } from '../services/api';

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

const filter = reactive({
  targetType: '',
  limit: 100,
});

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
  if (action.includes('created') || action.includes('completed')) return 'action-create';
  if (action.includes('updated') || action.includes('reviewed')) return 'action-update';
  if (action.includes('deleted')) return 'action-delete';
  return '';
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
}

onMounted(loadLogs);
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-bar select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.filter-bar button {
  padding: 0.5rem 1rem;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.logs-table th,
.logs-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.logs-table th {
  background: #f5f5f5;
  font-weight: 600;
  color: #555;
}

.logs-table tbody tr:hover {
  background: #fafafa;
}

.time {
  color: #666;
  font-size: 0.85rem;
  white-space: nowrap;
}

.action-tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.action-create {
  background: #e8f5e9;
  color: #2e7d32;
}

.action-update {
  background: #fff3e0;
  color: #ef6c00;
}

.action-delete {
  background: #ffebee;
  color: #c62828;
}

.metadata {
  color: #666;
}

.detail-link {
  color: #4a90d9;
  cursor: pointer;
  text-decoration: underline;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 2rem !important;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: #e74c3c;
  padding: 1rem;
  background: #fdf0f0;
  border-radius: 4px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal h3 {
  margin-top: 0;
}

.modal-content {
  margin-bottom: 1rem;
}

.modal-content p {
  margin: 0.5rem 0;
}

.modal pre {
  background: #f5f5f5;
  padding: 0.75rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.8rem;
}

.modal button {
  padding: 0.5rem 1rem;
  background: #888;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>

<script setup lang="ts">
import Card from '../components/Card.vue';
</script>
