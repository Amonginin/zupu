<template>
  <header class="top-nav">
    <div class="brand">族谱系统</div>
    <nav class="links">
      <RouterLink to="/members">成员</RouterLink>
      <RouterLink to="/ocr">OCR</RouterLink>
      <RouterLink to="/exports">导出</RouterLink>
      <RouterLink to="/audits">审计</RouterLink>
    </nav>
    <div class="actions">
      <span class="username">{{ authStore.username }}</span>
      <button class="logout" @click="onLogout">退出</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

function onLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(90deg,#f8fbff,#eef7ff);
  border-bottom: 1px solid #e6eefb;
}
.brand {
  font-weight: 700;
  color: #1f4d7a;
}
.links a {
  margin-right: 0.75rem;
  color: #1f4d7a;
  text-decoration: none;
}
.actions {
  display:flex;align-items:center;gap:0.5rem;
}
.username { font-weight:500; color:#23527c }
.logout { background:#f44336; color:#fff; border:none; padding:0.35rem 0.6rem; border-radius:4px }
</style>