<template>
  <Transition name="slide">
    <div v-if="open" class="mobile-nav-overlay" @click="$emit('close')">
      <nav class="mobile-nav" @click.stop>
        <!-- 用户信息 -->
        <div class="mobile-nav__user">
          <div class="mobile-nav__avatar">
            {{ authStore.username?.charAt(0)?.toUpperCase() || '?' }}
          </div>
          <div class="mobile-nav__info">
            <span class="mobile-nav__username">{{ authStore.username }}</span>
            <ZBadge variant="primary" size="sm">
              {{ formatRole(authStore.role) }}
            </ZBadge>
          </div>
        </div>

        <!-- 主题切换 -->
        <div class="mobile-nav__themes">
          <button
            v-for="t in themes"
            :key="t.id"
            :class="['mobile-nav__theme', { 'mobile-nav__theme--active': theme === t.id }]"
            @click="setTheme(t.id)"
          >
            <span class="mobile-nav__theme-icon">{{ t.icon }}</span>
            <span class="mobile-nav__theme-name">{{ t.name }}</span>
          </button>
        </div>

        <!-- 导航链接 -->
        <div class="mobile-nav__links">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="mobile-nav__link"
            :class="{ 'mobile-nav__link--active': isActive(item.path) }"
            @click="$emit('close')"
          >
            <span class="mobile-nav__link-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>

        <!-- 退出按钮 -->
        <div class="mobile-nav__footer">
          <ZButton variant="secondary" block @click="onLogout">
            退出登录
          </ZButton>
        </div>
      </nav>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useTheme } from '../../composables/useTheme';
import { ZButton, ZBadge } from '../ui';

interface Props {
  open: boolean;
}

defineProps<Props>();

defineEmits<{
  close: [];
}>();

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { theme, themes, setTheme } = useTheme();

const navItems = [
  { path: '/members', label: '成员管理', icon: '👥' },
  { path: '/ocr', label: 'OCR导入', icon: '📷' },
  { path: '/exports', label: '导出', icon: '📄' },
  { path: '/audits', label: '审计日志', icon: '📋' },
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
.mobile-nav-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--z-modal);
}

.mobile-nav {
  position: absolute;
  top: 0;
  right: 0;
  width: min(300px, 80vw);
  height: 100%;
  background: var(--bg-secondary);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* 用户信息 */
.mobile-nav__user {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  background: var(--color-primary-light);
  border-bottom: 1px solid var(--border-light);
}

.mobile-nav__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-inverse);
  background: var(--color-primary);
  border-radius: var(--radius-full);
}

.mobile-nav__info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.mobile-nav__username {
  font-weight: 600;
  color: var(--text-primary);
}

/* 主题切换 */
.mobile-nav__themes {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.mobile-nav__theme {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mobile-nav__theme:hover {
  background: var(--border-light);
}

.mobile-nav__theme--active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.mobile-nav__theme-icon {
  font-size: var(--text-xl);
}

.mobile-nav__theme-name {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

/* 导航链接 */
.mobile-nav__links {
  flex: 1;
  padding: var(--spacing-md);
}

.mobile-nav__link {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  color: var(--text-primary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.mobile-nav__link:hover {
  background: var(--bg-tertiary);
}

.mobile-nav__link--active {
  color: var(--color-primary);
  background: var(--color-primary-light);
  font-weight: 500;
}

.mobile-nav__link-icon {
  font-size: var(--text-lg);
}

/* 底部 */
.mobile-nav__footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

/* 动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all var(--transition-base);
}

.slide-enter-active .mobile-nav,
.slide-leave-active .mobile-nav {
  transition: transform var(--transition-base);
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-from .mobile-nav,
.slide-leave-to .mobile-nav {
  transform: translateX(100%);
}
</style>
