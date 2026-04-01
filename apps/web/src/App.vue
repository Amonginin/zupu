<template>
  <main class="page">
    <div class="shell">
      <NavBar />
      <RouterView />
    </div>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import NavBar from './components/NavBar.vue';

const router = useRouter();
const authStore = useAuthStore();

function formatRole(role: string) {
  const map: Record<string, string> = {
    admin: '管理员',
    editor: '编辑',
    viewer: '访客',
  };
  return map[role] || role;
}

function onLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.username {
  font-weight: 500;
}

.role {
  font-size: 0.8rem;
  padding: 0.15rem 0.4rem;
  background: #e8f4fc;
  color: #4a90d9;
  border-radius: 4px;
}
</style>
