<template>
  <section class="card">
    <h2>成员管理</h2>
    <form class="form" @submit.prevent="onCreateMember">
      <input v-model="form.name" placeholder="成员姓名" required />
      <input v-model.number="form.generation" placeholder="世代（可选）" type="number" min="1" />
      <input v-model="form.alias" placeholder="别名（可选）" />
      <label>
        <input v-model="form.isLiving" type="checkbox" /> 在世
      </label>
      <button type="submit">新增成员</button>
    </form>

    <ul class="list">
      <li v-for="item in members" :key="item.id">
        <strong>{{ item.name }}</strong>
        <span>世代: {{ item.generation ?? '-' }}</span>
        <span>别名: {{ item.alias ?? '-' }}</span>
        <span>{{ item.isLiving ? '在世' : '已故' }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { createMember, fetchMembers, type Member } from '../services/api';

const members = ref<Member[]>([]);
const form = reactive({
  name: '',
  generation: undefined as number | undefined,
  alias: '',
  isLiving: true,
});

async function loadMembers() {
  members.value = await fetchMembers();
}

async function onCreateMember() {
  await createMember({
    name: form.name,
    generation: form.generation,
    alias: form.alias || undefined,
    isLiving: form.isLiving,
  });
  form.name = '';
  form.generation = undefined;
  form.alias = '';
  await loadMembers();
}

onMounted(loadMembers);
</script>
