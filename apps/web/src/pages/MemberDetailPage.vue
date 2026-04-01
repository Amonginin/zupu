<template>
  <Card>
    <div class="detail-header">
      <button class="back-btn" @click="goBack">← 返回列表</button>
      <h2>成员详情</h2>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else-if="member" class="detail-content">
      <!-- 基本信息 -->
      <div class="info-section">
        <h3>基本信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>姓名</label>
            <span>{{ member.name }}</span>
          </div>
          <div class="info-item">
            <label>世代</label>
            <span>{{ member.generation ?? '-' }}</span>
          </div>
          <div class="info-item">
            <label>别名</label>
            <span>{{ member.alias ?? '-' }}</span>
          </div>
          <div class="info-item">
            <label>性别</label>
            <span>{{ member.gender ?? '-' }}</span>
          </div>
          <div class="info-item">
            <label>状态</label>
            <span :class="member.isLiving ? 'living' : 'deceased'">
              {{ member.isLiving ? '在世' : '已故' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 关系信息 -->
      <div class="relations-section">
        <h3>家庭关系</h3>

        <div class="relation-group">
          <h4>父母</h4>
          <ul v-if="relations?.parents?.length">
            <li v-for="p in relations.parents" :key="p.id" @click="viewMember(p.id)">
              {{ p.name }} <span class="gen">({{ p.generation ?? '-' }}世)</span>
            </li>
          </ul>
          <p v-else class="no-data">暂无记录</p>
        </div>

        <div class="relation-group">
          <h4>配偶</h4>
          <ul v-if="relations?.spouses?.length">
            <li v-for="s in relations.spouses" :key="s.id" @click="viewMember(s.id)">
              {{ s.name }}
            </li>
          </ul>
          <p v-else class="no-data">暂无记录</p>
        </div>

        <div class="relation-group">
          <h4>子女</h4>
          <ul v-if="relations?.children?.length">
            <li v-for="c in relations.children" :key="c.id" @click="viewMember(c.id)">
              {{ c.name }} <span class="gen">({{ c.generation ?? '-' }}世)</span>
            </li>
          </ul>
          <p v-else class="no-data">暂无记录</p>
        </div>
      </div>

      <!-- 添加关系 -->
      <div class="add-relation-section">
        <h3>添加关系</h3>
        <div class="add-relation-form">
          <select v-model="newRelation.type">
            <option value="parent_of">父母 → 此人</option>
            <option value="spouse_of">配偶</option>
            <option value="child_of">子女</option>
          </select>
          <select v-model="newRelation.targetId">
            <option value="">选择成员</option>
            <option v-for="m in otherMembers" :key="m.id" :value="m.id">
              {{ m.name }} ({{ m.generation ?? '-' }}世)
            </option>
          </select>
          <button @click="addRelation" :disabled="!newRelation.targetId">添加</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMembersStore } from '../stores/members';
import { storeToRefs } from 'pinia';

const route = useRoute();
const router = useRouter();
const store = useMembersStore();

const { currentMember: member, currentRelations: relations, members, loading, error } = storeToRefs(store);

const newRelation = reactive({
  type: 'parent_of' as 'parent_of' | 'spouse_of' | 'child_of',
  targetId: '',
});

const otherMembers = computed(() => {
  const currentId = route.params.id as string;
  return members.value.filter((m) => m.id !== currentId);
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
      // 子女关系：当前成员是父母，目标是子女
      await store.createRelation(currentId, newRelation.targetId, 'parent_of');
    } else if (newRelation.type === 'parent_of') {
      // 父母关系：目标是父母，当前成员是子女
      await store.createRelation(newRelation.targetId, currentId, 'parent_of');
    } else {
      // 配偶关系
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
.detail-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.back-btn {
  padding: 0.5rem 1rem;
  background: #888;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.info-section, .relations-section, .add-relation-section {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
}

.info-section h3, .relations-section h3, .add-relation-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
  border-bottom: 1px solid #ddd;
  padding-bottom: 0.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-item label {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.info-item span {
  font-size: 1rem;
  color: #333;
}

.living {
  color: #27ae60;
}

.deceased {
  color: #999;
}

.relation-group {
  margin-bottom: 1rem;
}

.relation-group h4 {
  margin: 0 0 0.5rem;
  color: #555;
}

.relation-group ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.relation-group li {
  padding: 0.5rem;
  background: white;
  margin-bottom: 0.25rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.relation-group li:hover {
  background: #e8f4fc;
}

.gen {
  color: #888;
  font-size: 0.85rem;
}

.no-data {
  color: #999;
  font-style: italic;
  margin: 0;
}

.add-relation-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.add-relation-form select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 150px;
}

.add-relation-form button {
  padding: 0.5rem 1rem;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.add-relation-form button:disabled {
  background: #ccc;
  cursor: not-allowed;
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
</style>

<!-- Card import -->
<script setup lang="ts">
import Card from '../components/Card.vue';
</script>
