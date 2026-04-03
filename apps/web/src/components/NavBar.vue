<template>
  <header class="top-nav">
    <div class="brand">族谱系统</div>
    <nav class="links">
      <RouterLink to="/families">族谱</RouterLink>
      <RouterLink to="/members">成员</RouterLink>
      <RouterLink to="/ocr">OCR</RouterLink>
      <RouterLink to="/exports">导出</RouterLink>
      <RouterLink to="/audits">审计</RouterLink>
      <RouterLink to="/requests">审批</RouterLink>
    </nav>
    <div class="actions">
      <NotificationBell />
      <span class="username">{{ authStore.username }}</span>
      <button class="logout" @click="onLogout">退出</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import NotificationBell from './NotificationBell.vue';

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
.links {
  display: flex;
  gap: 0.5rem;
}
.links a {
  padding: 0.3rem 0.6rem;
  color: #1f4d7a;
  text-decoration: none;
  border-radius: 6px;
  font-size: 14px;
  transition: background 0.15s;
}
.links a:hover {
  background: rgba(31, 77, 122, 0.08);
}
.links a.router-link-active {
  background: rgba(31, 77, 122, 0.12);
  font-weight: 600;
}
.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.username { font-weight: 500; color: #23527c }
.logout { background: #f44336; color: #fff; border: none; padding: 0.35rem 0.6rem; border-radius: 4px; cursor: pointer }
.logout:hover { background: #d32f2f }
</style>