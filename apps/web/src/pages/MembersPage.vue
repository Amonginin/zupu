<template>
  <Card>
    <h2>成员管理</h2>

    <!-- 检索表单 -->
    <div class="search-form">
      <input v-model="search.name" placeholder="姓名" />
      <input v-model="search.generation" placeholder="世代" type="number" min="1" />
      <input v-model="search.alias" placeholder="别名" />
      <button @click="onSearch">搜索</button>
      <button @click="onClearSearch">清空</button>
    </div>

    <!-- 新增成员表单 -->
    <form class="form" @submit.prevent="onCreateMember">
      <input v-model="form.name" placeholder="成员姓名" required />
      <input v-model.number="form.generation" placeholder="世代（可选）" type="number" min="1" />
      <input v-model="form.alias" placeholder="别名（可选）" />
      <label>
        <input v-model="form.isLiving" type="checkbox" /> 在世
      </label>
      <button type="submit">新增成员</button>
    </form>

    <!-- 加载/错误状态 -->
    <div v-if="membersStore.loading" class="loading">加载中...</div>
    <div v-if="membersStore.error" class="error">{{ membersStore.error }}</div>

    <!-- 成员列表 -->
    <ul class="list">
      <li v-for="item in membersStore.members" :key="item.id">
        <div class="member-info" @click="viewDetail(item.id)">
          <strong>{{ item.name }}</strong>
          <span>世代: {{ item.generation ?? '-' }}</span>
          <span>别名: {{ item.alias ?? '-' }}</span>
          <span :class="item.isLiving ? 'living' : 'deceased'">
            {{ item.isLiving ? '在世' : '已故' }}
          </span>
        </div>
        <div class="actions">
          <button class="view-btn" @click="viewDetail(item.id)">详情</button>
          <button class="delete-btn" @click="onDelete(item.id)">删除</button>
        </div>
      </li>
      <li v-if="membersStore.members.length === 0 && !membersStore.loading" class="no-data">
        暂无成员数据
      </li>
    </ul>
  </Card>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import Card from '../components/Card.vue';
import { useMembersStore } from '../stores/members';

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
.search-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search-form input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.search-form button {
  padding: 0.5rem 1rem;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.search-form button:last-child {
  background: #888;
}

.member-info {
  flex: 1;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.member-info:hover {
  background: #f0f7ff;
}

.list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list li.no-data {
  justify-content: center;
  color: #999;
  font-style: italic;
}

.actions {
  display: flex;
  gap: 0.25rem;
}

.view-btn {
  padding: 0.25rem 0.5rem;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.delete-btn {
  padding: 0.25rem 0.5rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.living {
  color: #27ae60;
}

.deceased {
  color: #999;
}

.loading {
  text-align: center;
  padding: 1rem;
  color: #666;
}

.error {
  color: #e74c3c;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}
</style>
