<template>
  <AppLayout>
    <div class="detail-page">
      <!-- 返回按钮 -->
      <ZButton variant="ghost" class="back-btn" @click="goBack">
        ← 返回列表
      </ZButton>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <ZLoading text="加载中..." />
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        {{ error }}
      </div>

      <template v-else-if="member">
        <!-- 成员信息卡片 -->
        <ZCard class="member-header-card" decorated>
          <div class="member-header">
            <div class="member-header__avatar">
              {{ member.name.charAt(0) }}
            </div>
            <div class="member-header__info">
              <h1 class="member-header__name">{{ member.name }}</h1>
              <div class="member-header__meta">
                <ZBadge variant="info">第 {{ member.generation ?? '-' }} 世</ZBadge>
                <ZBadge :variant="member.isLiving ? 'success' : 'default'">
                  {{ member.isLiving ? '在世' : '已故' }}
                </ZBadge>
                <span v-if="member.alias" class="member-header__alias">
                  别名: {{ member.alias }}
                </span>
                <span v-if="member.gender" class="member-header__gender">
                  {{ member.gender }}
                </span>
              </div>
            </div>
          </div>
        </ZCard>

        <!-- 家庭关系 -->
        <ZCard title="家庭关系" class="relations-card">
          <div class="relations-grid">
            <!-- 父母 -->
            <div class="relation-group">
              <h4 class="relation-group__title">👨‍👩‍👧 父母</h4>
              <ul v-if="relations?.parents?.length" class="relation-list">
                <li
                  v-for="p in relations.parents"
                  :key="p.id"
                  class="relation-item"
                  @click="viewMember(p.id)"
                >
                  <span class="relation-item__avatar">{{ p.name.charAt(0) }}</span>
                  <span class="relation-item__name">{{ p.name }}</span>
                  <ZBadge variant="info" size="sm">{{ p.generation ?? '-' }}世</ZBadge>
                </li>
              </ul>
              <p v-else class="relation-empty">暂无记录</p>
            </div>

            <!-- 配偶 -->
            <div class="relation-group">
              <h4 class="relation-group__title">💑 配偶</h4>
              <ul v-if="relations?.spouses?.length" class="relation-list">
                <li
                  v-for="s in relations.spouses"
                  :key="s.id"
                  class="relation-item"
                  @click="viewMember(s.id)"
                >
                  <span class="relation-item__avatar">{{ s.name.charAt(0) }}</span>
                  <span class="relation-item__name">{{ s.name }}</span>
                </li>
              </ul>
              <p v-else class="relation-empty">暂无记录</p>
            </div>

            <!-- 子女 -->
            <div class="relation-group">
              <h4 class="relation-group__title">👶 子女</h4>
              <ul v-if="relations?.children?.length" class="relation-list">
                <li
                  v-for="c in relations.children"
                  :key="c.id"
                  class="relation-item"
                  @click="viewMember(c.id)"
                >
                  <span class="relation-item__avatar">{{ c.name.charAt(0) }}</span>
                  <span class="relation-item__name">{{ c.name }}</span>
                  <ZBadge variant="info" size="sm">{{ c.generation ?? '-' }}世</ZBadge>
                </li>
              </ul>
              <p v-else class="relation-empty">暂无记录</p>
            </div>
          </div>
        </ZCard>

        <!-- 添加关系 -->
        <ZCard title="添加关系" class="add-relation-card">
          <div class="add-relation-form">
            <ZSelect
              v-model="newRelation.type"
              label="关系类型"
              :options="relationTypes"
            />
            <ZSelect
              v-model="newRelation.targetId"
              label="选择成员"
              placeholder="请选择成员"
              :options="otherMembersOptions"
            />
            <ZButton
              variant="primary"
              :disabled="!newRelation.targetId"
              @click="addRelation"
            >
              添加关系
            </ZButton>
          </div>
        </ZCard>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMembersStore } from '../stores/members';
import { storeToRefs } from 'pinia';
import { AppLayout } from '../components/layout';
import { ZCard, ZButton, ZBadge, ZSelect, ZLoading } from '../components/ui';

const route = useRoute();
const router = useRouter();
const store = useMembersStore();

const { currentMember: member, currentRelations: relations, members, loading, error } = storeToRefs(store);

const newRelation = reactive({
  type: 'parent_of' as 'parent_of' | 'spouse_of' | 'child_of',
  targetId: '',
});

const relationTypes = [
  { value: 'parent_of', label: '父母 → 此人' },
  { value: 'spouse_of', label: '配偶' },
  { value: 'child_of', label: '子女' },
];

const otherMembersOptions = computed(() => {
  const currentId = route.params.id as string;
  return members.value
    .filter((m) => m.id !== currentId)
    .map((m) => ({
      value: m.id,
      label: `${m.name} (${m.generation ?? '-'}世)`,
    }));
});

async function loadData() {
  const id = route.params.id as string;
  await Promise.all([
    store.loadMemberDetail(id),
    store.loadMemberRelations(id),
    store.loadMembers(),
  ]);
}

function goBack() {
  router.push('/members');
}

function viewMember(id: string) {
  router.push(`/members/${id}`);
}

async function addRelation() {
  if (!newRelation.targetId) return;

  const currentId = route.params.id as string;

  try {
    if (newRelation.type === 'child_of') {
      await store.createRelation(currentId, newRelation.targetId, 'parent_of');
    } else if (newRelation.type === 'parent_of') {
      await store.createRelation(newRelation.targetId, currentId, 'parent_of');
    } else {
      await store.createRelation(currentId, newRelation.targetId, 'spouse_of');
    }
    newRelation.targetId = '';
  } catch {
    // error handled in store
  }
}

watch(() => route.params.id, () => {
  if (route.params.id) {
    loadData();
  }
});

onMounted(loadData);
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.back-btn {
  align-self: flex-start;
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
}

/* 成员头部卡片 */
.member-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
}

.member-header__avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  color: var(--text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
}

.member-header__info {
  flex: 1;
}

.member-header__name {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm);
}

.member-header__meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.member-header__alias,
.member-header__gender {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* 关系网格 */
.relations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-xl);
}

.relation-group {
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.relation-group__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md);
}

.relation-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.relation-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.relation-item:hover {
  background: var(--color-primary-light);
}

.relation-item__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--text-inverse);
  background: var(--color-secondary);
  border-radius: var(--radius-full);
}

.relation-item__name {
  flex: 1;
  font-weight: 500;
}

.relation-empty {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-style: italic;
  margin: 0;
}

/* 添加关系表单 */
.add-relation-form {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
  flex-wrap: wrap;
}

.add-relation-form > * {
  flex: 1;
  min-width: 150px;
}

.add-relation-form > button {
  flex: 0 0 auto;
}

/* 响应式 */
@media (max-width: 767px) {
  .member-header {
    flex-direction: column;
    text-align: center;
  }

  .member-header__meta {
    justify-content: center;
  }

  .member-header__name {
    font-size: var(--text-3xl);
  }

  .add-relation-form {
    flex-direction: column;
  }

  .add-relation-form > * {
    width: 100%;
  }
}
</style>
