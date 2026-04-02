<template>
  <header class="app-header">
    <div class="app-header__container">
      <!-- Logo区域 -->
      <RouterLink to="/members" class="app-header__brand">
        <span class="app-header__logo">族</span>
        <span class="app-header__title">族谱系统</span>
      </RouterLink>

      <!-- 桌面端导航 -->
      <nav class="app-header__nav hide-mobile">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="app-header__link"
          :class="{ 'app-header__link--active': isActive(item.path) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <!-- 右侧操作区 -->
      <div class="app-header__actions">
        <!-- 主题切换 -->
        <button class="app-header__theme-btn" @click="toggleTheme" :title="`当前: ${currentThemeInfo.name}`">
          {{ currentThemeInfo.icon }}
        </button>

        <!-- 用户信息 -->
        <div class="app-header__user hide-mobile">
          <span class="app-header__username">{{ authStore.username }}</span>
          <ZBadge variant="primary" size="sm">
            {{ formatRole(authStore.role) }}
          </ZBadge>
        </div>

        <!-- 退出按钮 -->
        <ZButton variant="ghost" size="sm" class="hide-mobile" @click="onLogout">
          退出
        </ZButton>

        <!-- 移动端菜单按钮 -->
        <button class="app-header__menu-btn hide-desktop" @click="$emit('toggle-menu')">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useTheme } from '../../composables/useTheme';
import { ZButton, ZBadge } from '../ui';

defineEmits<{
  'toggle-menu': [];
}>();

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { toggleTheme, currentThemeInfo } = useTheme();

const navItems = [
  { path: '/members', label: '成员' },
  { path: '/ocr', label: 'OCR导入' },
  { path: '/exports', label: '导出' },
  { path: '/audits', label: '审计日志' },
];

function isActive(path: string) {
  return route.path.startsWith(path);
}

function formatRole(role?: string) {
  const map: Record<string, string> = {
    admin: '管理员',
    editor: '编辑',
    viewer: '访客',
  };
  return role ? map[role] || role : '';
}

function onLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: var(--z-dropdown);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-light);
  backdrop-filter: blur(10px);
}

.app-header__container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: var(--max-width);
  height: var(--header-height);
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

/* Logo区域 */
.app-header__brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  text-decoration: none;
}

.app-header__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-sm);
  /* 印章效果 */
  box-shadow: 
    inset 0 0 0 2px var(--color-accent-hover),
    inset 2px 2px 4px rgba(0,0,0,0.2);
}

.app-header__title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-primary);
}

/* 导航链接 */
.app-header__nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.app-header__link {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-base);
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.app-header__link:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.app-header__link--active {
  color: var(--color-primary);
  background: var(--color-primary-light);
  font-weight: 500;
}

/* 右侧操作区 */
.app-header__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

/* 主题切换按钮 */
.app-header__theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: var(--text-lg);
  background: var(--bg-tertiary);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.app-header__theme-btn:hover {
  background: var(--border-color);
  transform: rotate(15deg);
}

/* 用户信息 */
.app-header__user {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.app-header__username {
  font-weight: 500;
  color: var(--text-primary);
}

/* 移动端菜单按钮 */
.app-header__menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--text-primary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.app-header__menu-btn:hover {
  background: var(--bg-tertiary);
}

/* 响应式 */
@media (max-width: 767px) {
  .app-header__container {
    padding: 0 var(--spacing-md);
  }

  .app-header__title {
    font-size: var(--text-lg);
  }
}
</style>
