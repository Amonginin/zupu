<template>
  <AppLayout>
    <div class="family-page">
      <header class="family-page__header">
        <h1 class="family-page__title">族谱管理</h1>
        <p class="family-page__desc">创建族谱、管理成员权限与公开设置</p>
      </header>

      <!-- 创建族谱 -->
      <ZCard class="section-card">
        <h3 class="section-title">📋 创建新族谱</h3>
        <form class="create-form" @submit.prevent="onCreateFamily">
          <ZInput v-model="createForm.name" placeholder="族谱名称（如：张氏族谱）" required />
          <ZInput v-model="createForm.code" placeholder="族谱代码（英文，如：zhang-family）" required />
          <ZButton type="submit" variant="primary" :disabled="creating">
            {{ creating ? '创建中...' : '创建族谱' }}
          </ZButton>
        </form>
        <p v-if="createError" class="error-msg">{{ createError }}</p>
        <p v-if="createSuccess" class="success-msg">✅ 族谱创建成功！</p>
      </ZCard>

      <!-- 我的族谱列表 -->
      <ZCard class="section-card">
        <div class="section-header">
          <h3 class="section-title">📚 我的族谱</h3>
          <ZButton variant="ghost" size="sm" @click="loadFamilies">刷新</ZButton>
        </div>

        <div v-if="loadingFamilies" class="loading-state">
          <ZLoading text="加载中..." />
        </div>

        <div v-else-if="families.length === 0" class="empty-hint">
          暂无族谱，请先创建一个
        </div>

        <div v-else class="family-list">
          <div
            v-for="f in families"
            :key="f.id"
            class="family-item"
            :class="{ 'family-item--active': f.code === currentFamilyCode }"
          >
            <div class="family-item__info">
              <div class="family-item__name">{{ f.name }}</div>
              <div class="family-item__meta">
                <ZBadge variant="info" size="sm">{{ f.code }}</ZBadge>
                <ZBadge :variant="f.role === 'creator' ? 'accent' : f.role === 'admin' ? 'warning' : 'default'" size="sm">
                  {{ roleLabel(f.role) }}
                </ZBadge>
              </div>
            </div>

            <div class="family-item__actions">
              <ZButton
                v-if="f.code !== currentFamilyCode"
                variant="ghost"
                size="sm"
                @click="onSwitchFamily(f.code)"
              >
                切换
              </ZButton>
              <ZButton
                v-if="f.role === 'creator' || f.role === 'admin'"
                variant="ghost"
                size="sm"
                @click="onManageFamily(f)"
              >
                管理
              </ZButton>
            </div>
          </div>
        </div>
      </ZCard>

      <!-- 族谱权限管理（仅当选择了管理的族谱时显示） -->
      <ZCard v-if="managingFamily" class="section-card">
        <div class="section-header">
          <h3 class="section-title">⚙️ 管理「{{ managingFamily.name }}」</h3>
          <ZButton variant="ghost" size="sm" @click="managingFamily = null">关闭</ZButton>
        </div>

        <!-- 公开程度设置 -->
        <div class="setting-row">
          <label class="setting-label">公开程度</label>
          <ZSelect
            v-model="managingAccessLevel"
            :options="accessLevelOptions"
            @change="onUpdateAccessLevel"
          />
        </div>

        <!-- 成员角色列表 -->
        <h4 class="subsection-title">成员与角色</h4>

        <div v-if="loadingRoles" class="loading-state">
          <ZLoading text="加载角色..." />
        </div>

        <div v-else-if="familyRoles.length === 0" class="empty-hint">
          暂无成员
        </div>

        <div v-else class="roles-list">
          <div v-for="r in familyRoles" :key="r.id" class="role-item">
            <div class="role-item__user">
              <span class="role-item__avatar">{{ r.user?.username?.charAt(0) || '?' }}</span>
              <span class="role-item__name">{{ r.user?.username || '未知用户' }}</span>
            </div>
            <ZBadge :variant="roleBadgeVariant(r.role)" size="sm">
              {{ roleLabel(r.role) }}
            </ZBadge>
            <ZButton
              v-if="r.role !== 'creator'"
              variant="danger"
              size="sm"
              @click="onRemoveRole(r)"
            >
              移除
            </ZButton>
          </div>
        </div>
      </ZCard>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { AppLayout } from '../components/layout';
import { ZCard, ZInput, ZButton, ZBadge, ZLoading, ZSelect } from '../components/ui';
import {
  createFamily,
  fetchMyFamilies,
  updateFamilyAccessLevel,
  fetchFamilyRoles,
  removeFamilyRole,
} from '../services/api';

const authStore = useAuthStore();

// 创建表单
const createForm = ref({ name: '', code: '' });
const creating = ref(false);
const createError = ref('');
const createSuccess = ref(false);

// 族谱列表
const families = ref<any[]>([]);
const loadingFamilies = ref(false);

// 当前选中管理的族谱
const managingFamily = ref<any>(null);
const managingAccessLevel = ref('approval_required');
const familyRoles = ref<any[]>([]);
const loadingRoles = ref(false);

const currentFamilyCode = computed(() => authStore.currentFamilyId || '');

const accessLevelOptions = [
  { label: '需要审批', value: 'approval_required' },
  { label: '完全公开', value: 'public' },
];

// 角色中文标签
function roleLabel(role: string) {
  const map: Record<string, string> = {
    admin: '管理员',
    creator: '创建者',
    collaborator: '协作者',
    editor: '编辑者',
    viewer: '查看者',
  };
  return map[role] || role;
}

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';

function roleBadgeVariant(role: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    admin: 'warning',
    creator: 'accent',
    collaborator: 'info',
    editor: 'info',
    viewer: 'default',
  };
  return map[role] || 'default';
}

// 加载族谱列表
async function loadFamilies() {
  loadingFamilies.value = true;
  try {
    families.value = await fetchMyFamilies();
  } catch {
    // ignore
  } finally {
    loadingFamilies.value = false;
  }
}

// 创建族谱
async function onCreateFamily() {
  creating.value = true;
  createError.value = '';
  createSuccess.value = false;
  try {
    await createFamily(createForm.value.name, createForm.value.code);
    createSuccess.value = true;
    createForm.value = { name: '', code: '' };
    await loadFamilies();
    // 自动刷新用户信息
    await authStore.loadUserInfo();
  } catch (e: any) {
    createError.value = e.response?.data?.message || '创建失败';
  } finally {
    creating.value = false;
  }
}

// 切换族谱
function onSwitchFamily(code: string) {
  authStore.switchFamily(code);
  location.reload();
}

// 进入管理模式
async function onManageFamily(family: any) {
  managingFamily.value = family;
  managingAccessLevel.value = family.accessLevel || 'approval_required';
  loadingRoles.value = true;
  try {
    familyRoles.value = await fetchFamilyRoles(family.id);
  } catch {
    familyRoles.value = [];
  } finally {
    loadingRoles.value = false;
  }
}

// 更新公开程度
async function onUpdateAccessLevel() {
  if (!managingFamily.value) return;
  try {
    await updateFamilyAccessLevel(managingFamily.value.id, managingAccessLevel.value);
  } catch (e: any) {
    alert(e.response?.data?.message || '更新失败');
  }
}

// 移除角色
async function onRemoveRole(roleItem: any) {
  if (!managingFamily.value) return;
  if (!confirm(`确定移除用户「${roleItem.user?.username}」的权限吗？`)) return;
  try {
    await removeFamilyRole(managingFamily.value.id, roleItem.userId);
    familyRoles.value = familyRoles.value.filter((r) => r.id !== roleItem.id);
  } catch (e: any) {
    alert(e.response?.data?.message || '移除失败');
  }
}

onMounted(loadFamilies);
</script>

<style scoped>
.family-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.family-page__header {
  text-align: center;
  margin-bottom: var(--spacing-md);
}

.family-page__title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm);
}

.family-page__desc {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin: 0;
}

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

.subsection-title {
  font-size: var(--text-base);
  color: var(--text-primary);
  margin: var(--spacing-md) 0 var(--spacing-sm);
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid var(--border-light);
}

/* 创建表单 */
.create-form {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  align-items: flex-end;
}

.create-form > * {
  flex: 1;
  min-width: 160px;
}

.create-form > button {
  flex: 0 0 auto;
}

.error-msg {
  color: var(--color-error);
  font-size: var(--text-sm);
  margin: 0;
}

.success-msg {
  color: var(--color-success, #22c55e);
  font-size: var(--text-sm);
  margin: 0;
}

/* 族谱列表 */
.family-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.family-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  transition: border-color 0.2s;
}

.family-item--active {
  border-color: var(--color-primary);
  background: rgba(74, 144, 217, 0.04);
}

.family-item__info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.family-item__name {
  font-weight: 600;
  color: var(--text-primary);
}

.family-item__meta {
  display: flex;
  gap: var(--spacing-xs);
}

.family-item__actions {
  display: flex;
  gap: var(--spacing-xs);
}

/* 设置行 */
.setting-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.setting-label {
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
}

/* 角色列表 */
.roles-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.role-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.role-item__user {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

.role-item__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-full);
}

.role-item__name {
  font-weight: 500;
  color: var(--text-primary);
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

@media (max-width: 767px) {
  .create-form {
    flex-direction: column;
  }
  .setting-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
