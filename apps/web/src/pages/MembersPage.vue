<template>
  <AppLayout>
    <div class="members-page">
      <!-- 页面标题 -->
      <header class="members-page__header">
        <h1 class="members-page__title">成员管理</h1>
        <p class="members-page__desc">管理族谱中的所有成员信息</p>
      </header>

      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-card__value">{{ membersStore.members.length }}</span>
          <span class="stat-card__label">总人数</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__value">{{ livingCount }}</span>
          <span class="stat-card__label">在世</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__value">{{ generationCount }}</span>
          <span class="stat-card__label">世代</span>
        </div>
      </div>

      <!-- 搜索和新增区域 -->
      <ZCard class="action-card">
        <!-- 搜索表单 -->
        <div class="search-section">
          <h3 class="section-title">🔍 搜索成员</h3>
          <div class="search-form">
            <ZInput v-model="search.name" placeholder="姓名" />
            <ZInput v-model="search.generation" placeholder="世代" type="number" />
            <ZInput v-model="search.alias" placeholder="别名" />
            <ZButton variant="primary" @click="onSearch">搜索</ZButton>
            <ZButton variant="ghost" @click="onClearSearch">清空</ZButton>
          </div>
        </div>

        <!-- 新增成员表单 -->
        <div class="add-section">
          <h3 class="section-title">➕ 新增成员</h3>
          <form class="add-form" @submit.prevent="onCreateMember">
            <ZInput v-model="form.name" placeholder="成员姓名" required />
            <ZInput v-model.number="form.generation" placeholder="世代" type="number" />
            <ZInput v-model="form.alias" placeholder="别名" />
            <label class="checkbox-label">
              <input v-model="form.isLiving" type="checkbox" />
              <span>在世</span>
            </label>
            <ZButton type="submit" variant="accent">新增</ZButton>
          </form>
        </div>
      </ZCard>

      <!-- 加载状态 -->
      <div v-if="membersStore.loading" class="loading-state">
        <ZLoading text="加载中..." />
      </div>

      <!-- 错误提示 -->
      <div v-if="membersStore.error" class="error-state">
        {{ membersStore.error }}
      </div>

      <!-- 成员列表 -->
      <div class="members-list">
        <TransitionGroup name="list">
          <ZCard
            v-for="item in membersStore.members"
            :key="item.id"
            class="member-card"
            hoverable
            @click="viewDetail(item.id)"
          >
            <div class="member-card__content">
              <!-- 头像 -->
              <div class="member-card__avatar">
                {{ item.name.charAt(0) }}
              </div>

              <!-- 信息 -->
              <div class="member-card__info">
                <h4 class="member-card__name">{{ item.name }}</h4>
                <div class="member-card__meta">
                  <ZBadge variant="info" size="sm">
                    {{ item.generation ?? '-' }}世
                  </ZBadge>
                  <span v-if="item.alias" class="member-card__alias">
                    {{ item.alias }}
                  </span>
                </div>
              </div>

              <!-- 状态 -->
              <ZBadge :variant="item.isLiving ? 'success' : 'default'" size="sm">
                {{ item.isLiving ? '在世' : '已故' }}
              </ZBadge>

              <!-- 操作 -->
              <div class="member-card__actions" @click.stop>
                <ZButton variant="ghost" size="sm" @click="viewDetail(item.id)">
                  详情
                </ZButton>
                <ZButton variant="danger" size="sm" @click="onDelete(item.id)">
                  删除
                </ZButton>
              </div>
            </div>
          </ZCard>
        </TransitionGroup>

        <!-- 空状态 -->
        <div
          v-if="membersStore.members.length === 0 && !membersStore.loading"
          class="empty-state"
        >
          <p>暂无成员数据</p>
          <p class="empty-state__hint">请使用上方表单添加第一位成员</p>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMembersStore } from '../stores/members';
import { AppLayout } from '../components/layout';
import { ZCard, ZInput, ZButton, ZBadge, ZLoading } from '../components/ui';

const router = useRouter();
const membersStore = useMembersStore();

const form = reactive({
  name: '',
  generation: undefined as number | undefined,
  alias: '',
  isLiving: true,
});

const search = reactive({
  name: '',
  generation: '',
  alias: '',
});

// 计算统计数据
const livingCount = computed(() => 
  membersStore.members.filter(m => m.isLiving).length
);

const generationCount = computed(() => {
  const gens = new Set(membersStore.members.map(m => m.generation).filter(Boolean));
  return gens.size;
});

async function onSearch() {
  if (!search.name && !search.generation && !search.alias) {
    await membersStore.loadMembers();
    return;
  }
  await membersStore.search({
    name: search.name || undefined,
    generation: search.generation || undefined,
    alias: search.alias || undefined,
  });
}

function onClearSearch() {
  search.name = '';
  search.generation = '';
  search.alias = '';
  membersStore.loadMembers();
}

async function onCreateMember() {
  try {
    await membersStore.addMember({
      name: form.name,
      generation: form.generation,
      alias: form.alias || undefined,
      isLiving: form.isLiving,
    });
    form.name = '';
    form.generation = undefined;
    form.alias = '';
  } catch {
    // error handled in store
  }
}

async function onDelete(id: string) {
  if (confirm('确定要删除此成员吗？')) {
    await membersStore.removeMember(id);
  }
}

function viewDetail(id: string) {
  router.push(`/members/${id}`);
}

onMounted(() => membersStore.loadMembers());
</script>

<style scoped>
.members-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

/* 页面标题 */
.members-page__header {
  text-align: center;
  margin-bottom: var(--spacing-md);
}

.members-page__title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm);
}

.members-page__desc {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin: 0;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  text-align: center;
}

.stat-card__value {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  color: var(--color-primary);
}

.stat-card__label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* 操作卡片 */
.action-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.section-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md);
}

/* 搜索表单 */
.search-form {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  align-items: flex-end;
}

.search-form > * {
  flex: 1;
  min-width: 120px;
}

.search-form > button {
  flex: 0 0 auto;
}

/* 新增表单 */
.add-form {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  align-items: flex-end;
}

.add-form > * {
  flex: 1;
  min-width: 120px;
}

.add-form > button {
  flex: 0 0 auto;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  flex: 0 0 auto;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}

/* 加载和错误状态 */
.loading-state {
  padding: var(--spacing-2xl);
  text-align: center;
}

.error-state {
  padding: var(--spacing-md);
  color: var(--color-error);
  background: var(--color-error-light);
  border-radius: var(--radius-md);
  text-align: center;
}

/* 成员列表 */
.members-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.member-card {
  cursor: pointer;
}

.member-card__content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.member-card__avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-full);
}

.member-card__info {
  flex: 1;
  min-width: 0;
}

.member-card__name {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs);
}

.member-card__meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.member-card__alias {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.member-card__actions {
  display: flex;
  gap: var(--spacing-xs);
}

/* 空状态 */
.empty-state {
  padding: var(--spacing-2xl);
  text-align: center;
  color: var(--text-secondary);
}

.empty-state__hint {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
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
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-sm);
  }

  .stat-card {
    padding: var(--spacing-md);
  }

  .stat-card__value {
    font-size: var(--text-2xl);
  }

  .search-form,
  .add-form {
    flex-direction: column;
  }

  .search-form > *,
  .add-form > * {
    width: 100%;
  }

  .member-card__content {
    flex-wrap: wrap;
  }

  .member-card__actions {
    width: 100%;
    margin-top: var(--spacing-sm);
    justify-content: flex-end;
  }
}
</style>
