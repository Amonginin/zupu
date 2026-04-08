<template>
  <AppLayout>
    <div class="requests-page">
      <header class="requests-page__header">
        <h1 class="requests-page__title">申请与审批</h1>
        <p class="requests-page__desc">管理族谱的协作申请和修改请求</p>
      </header>

      <!-- 标签切换 -->
      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <!-- 协作申请（管理端） -->
      <template v-if="activeTab === 'accessRequests'">
        <ZCard class="section-card">
          <div class="section-header">
            <h3 class="section-title">📩 待审批的协作申请</h3>
            <ZButton variant="ghost" size="sm" @click="loadAccessRequests">刷新</ZButton>
          </div>

          <div v-if="loadingAccess" class="loading-state">
            <ZLoading text="加载中..." />
          </div>

          <div v-else-if="accessRequests.length === 0" class="empty-hint">
            暂无待审批申请
          </div>

          <div v-else class="request-list">
            <div v-for="req in accessRequests" :key="req.id" class="request-card">
              <div class="request-card__header">
                <ZBadge :variant="statusVariant(req.status)" size="sm">
                  {{ statusLabel(req.status) }}
                </ZBadge>
                <span class="request-card__time">{{ formatTime(req.createdAt) }}</span>
              </div>
              <div class="request-card__body">
                <div class="request-card__type">
                  申请成为：<strong>{{ req.type === 'collaborator' ? '协作者' : '查看者' }}</strong>
                </div>
                <div v-if="req.reason" class="request-card__reason">
                  理由：{{ req.reason }}
                </div>
              </div>
              <div v-if="req.status === 'pending'" class="request-card__actions">
                <ZButton variant="primary" size="sm" @click="onApproveAccess(req.id)">
                  通过
                </ZButton>
                <ZButton variant="danger" size="sm" @click="onRejectAccess(req.id)">
                  拒绝
                </ZButton>
              </div>
              <div v-if="req.reviewNote" class="request-card__note">
                审批备注：{{ req.reviewNote }}
              </div>
            </div>
          </div>
        </ZCard>
      </template>

      <!-- 修改请求（管理端） -->
      <template v-if="activeTab === 'editRequests'">
        <ZCard class="section-card">
          <div class="section-header">
            <h3 class="section-title">📝 待审批的修改请求</h3>
            <ZButton variant="ghost" size="sm" @click="loadEditRequests">刷新</ZButton>
          </div>

          <div v-if="loadingEdit" class="loading-state">
            <ZLoading text="加载中..." />
          </div>

          <div v-else-if="editRequests.length === 0" class="empty-hint">
            暂无待审批修改请求
          </div>

          <div v-else class="request-list">
            <div v-for="req in editRequests" :key="req.id" class="request-card">
              <div class="request-card__header">
                <ZBadge :variant="statusVariant(req.status)" size="sm">
                  {{ statusLabel(req.status) }}
                </ZBadge>
                <ZBadge variant="info" size="sm">{{ editTypeLabel(req.editType) }}</ZBadge>
                <span class="request-card__time">{{ formatTime(req.createdAt) }}</span>
              </div>
              <div class="request-card__body">
                <div v-if="req.reason" class="request-card__reason">
                  理由：{{ req.reason }}
                </div>
                <details class="request-card__payload">
                  <summary>查看修改内容</summary>
                  <pre>{{ formatPayload(req.editPayload) }}</pre>
                </details>
              </div>
              <div v-if="req.status === 'pending'" class="request-card__actions">
                <ZButton variant="primary" size="sm" @click="onApproveEdit(req.id)">
                  通过并执行
                </ZButton>
                <ZButton variant="danger" size="sm" @click="onRejectEdit(req.id)">
                  拒绝
                </ZButton>
              </div>
            </div>
          </div>
        </ZCard>
      </template>

      <!-- 我的申请 -->
      <template v-if="activeTab === 'myRequests'">
        <ZCard class="section-card">
          <div class="section-header">
            <h3 class="section-title">📋 我的申请记录</h3>
            <ZButton variant="ghost" size="sm" @click="loadMyRequests">刷新</ZButton>
          </div>

          <div v-if="loadingMy" class="loading-state">
            <ZLoading text="加载中..." />
          </div>

          <div v-else-if="myRequests.length === 0" class="empty-hint">
            暂无申请记录
          </div>

          <div v-else class="request-list">
            <div v-for="req in myRequests" :key="req.id" class="request-card">
              <div class="request-card__header">
                <ZBadge :variant="statusVariant(req.status)" size="sm">
                  {{ statusLabel(req.status) }}
                </ZBadge>
                <span class="request-card__time">{{ formatTime(req.createdAt) }}</span>
              </div>
              <div class="request-card__body">
                <div class="request-card__type">
                  申请类型：<strong>{{ req.type === 'collaborator' ? '协作者' : '查看者' }}</strong>
                </div>
                <div v-if="req.reason" class="request-card__reason">
                  理由：{{ req.reason }}
                </div>
                <div v-if="req.reviewNote" class="request-card__note">
                  审批备注：{{ req.reviewNote }}
                </div>
              </div>
            </div>
          </div>
        </ZCard>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { AppLayout } from '../components/layout';
import { ZCard, ZButton, ZBadge, ZLoading } from '../components/ui';
import {
  fetchAccessRequests,
  fetchEditRequests,
  fetchMyAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  approveEditRequest,
  rejectEditRequest,
  type AccessRequest,
  type EditRequest,
} from '../services/api';

const activeTab = ref('accessRequests');

// 数据
const accessRequests = ref<AccessRequest[]>([]);
const editRequests = ref<EditRequest[]>([]);
const myRequests = ref<AccessRequest[]>([]);
const loadingAccess = ref(false);
const loadingEdit = ref(false);
const loadingMy = ref(false);

// 标签页
const tabs = computed(() => [
  {
    key: 'accessRequests',
    label: '协作申请',
    count: accessRequests.value.filter((r) => r.status === 'pending').length,
  },
  {
    key: 'editRequests',
    label: '修改请求',
    count: editRequests.value.filter((r) => r.status === 'pending').length,
  },
  {
    key: 'myRequests',
    label: '我的申请',
    count: 0,
  },
]);

// 加载协作申请
async function loadAccessRequests() {
  loadingAccess.value = true;
  try {
    accessRequests.value = await fetchAccessRequests();
  } catch {
    accessRequests.value = [];
  } finally {
    loadingAccess.value = false;
  }
}

// 加载修改请求
async function loadEditRequests() {
  loadingEdit.value = true;
  try {
    editRequests.value = await fetchEditRequests();
  } catch {
    editRequests.value = [];
  } finally {
    loadingEdit.value = false;
  }
}

// 加载我的申请
async function loadMyRequests() {
  loadingMy.value = true;
  try {
    myRequests.value = await fetchMyAccessRequests();
  } catch {
    myRequests.value = [];
  } finally {
    loadingMy.value = false;
  }
}

// 审批操作
async function onApproveAccess(id: string) {
  try {
    await approveAccessRequest(id);
    await loadAccessRequests();
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败');
  }
}

async function onRejectAccess(id: string) {
  const note = prompt('请输入拒绝原因：');
  if (note === null) return;
  try {
    await rejectAccessRequest(id, note);
    await loadAccessRequests();
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败');
  }
}

async function onApproveEdit(id: string) {
  if (!confirm('通过后将自动执行修改，确认？')) return;
  try {
    await approveEditRequest(id);
    await loadEditRequests();
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败');
  }
}

async function onRejectEdit(id: string) {
  const note = prompt('请输入拒绝原因：');
  if (note === null) return;
  try {
    await rejectEditRequest(id, note);
    await loadEditRequests();
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败');
  }
}

// 工具函数
function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已拒绝',
    revision_needed: '需修改',
  };
  return map[status] || status;
}

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';

function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    revision_needed: 'info',
  };
  return map[status] || 'default';
}

function editTypeLabel(type: string) {
  const map: Record<string, string> = {
    member_create: '新增成员',
    member_update: '修改成员',
    member_delete: '删除成员',
    relation_create: '新增关系',
    relation_delete: '删除关系',
  };
  return map[type] || type;
}

function formatPayload(payloadStr: string) {
  try {
    return JSON.stringify(JSON.parse(payloadStr), null, 2);
  } catch {
    return payloadStr;
  }
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

onMounted(() => {
  loadAccessRequests();
  loadEditRequests();
  loadMyRequests();
});
</script>

<style scoped>
.requests-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.requests-page__header {
  text-align: center;
  margin-bottom: var(--spacing-md);
}

.requests-page__title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm);
}

.requests-page__desc {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin: 0;
}

/* 标签栏 */
.tab-bar {
  display: flex;
  gap: var(--spacing-xs);
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn--active {
  color: var(--text-primary);
  background: var(--bg-primary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: #ef4444;
  border-radius: 10px;
}

/* 卡片 */
.section-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin: 0;
}

/* 请求列表 */
.request-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.request-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}

.request-card__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.request-card__time {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.request-card__type {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.request-card__reason {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.request-card__note {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  padding-top: var(--spacing-xs);
  border-top: 1px solid var(--border-light);
}

.request-card__actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.request-card__payload {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.request-card__payload pre {
  margin: var(--spacing-xs) 0 0;
  padding: var(--spacing-sm);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  overflow-x: auto;
}

.loading-state {
  padding: var(--spacing-xl);
  text-align: center;
}

.empty-hint {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--text-sm);
}
</style>
