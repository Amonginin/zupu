<template>
  <div class="notification-bell" @click="togglePanel">
    <!-- 铃铛图标 -->
    <button class="bell-btn" :class="{ 'bell-btn--active': showPanel }">
      <svg class="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <!-- 未读红点 -->
      <span v-if="unreadCount > 0" class="bell-badge">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- 通知面板 -->
    <Transition name="panel">
      <div v-if="showPanel" class="notification-panel">
        <div class="panel-header">
          <h3 class="panel-title">通知</h3>
          <button v-if="unreadCount > 0" class="mark-all-btn" @click.stop="onMarkAllRead">
            全部已读
          </button>
        </div>

        <div v-if="loading" class="panel-loading">加载中...</div>

        <div v-else-if="notifications.length === 0" class="panel-empty">
          暂无通知
        </div>

        <div v-else class="panel-list">
          <div
            v-for="item in notifications"
            :key="item.id"
            class="notification-item"
            :class="{ 'notification-item--unread': !item.isRead }"
            @click.stop="onClickItem(item)"
          >
            <div class="notification-item__icon">
              {{ getTypeIcon(item.type) }}
            </div>
            <div class="notification-item__content">
              <div class="notification-item__title">{{ item.title }}</div>
              <div v-if="item.content" class="notification-item__text">{{ item.content }}</div>
              <div class="notification-item__time">{{ formatTime(item.createdAt) }}</div>
            </div>
            <div v-if="!item.isRead" class="notification-item__dot"></div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 点击其他区域关闭面板 -->
    <div v-if="showPanel" class="panel-overlay" @click="showPanel = false"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from '../services/api';

const showPanel = ref(false);
const unreadCount = ref(0);
const notifications = ref<Notification[]>([]);
const loading = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

// 切换面板显示
function togglePanel() {
  showPanel.value = !showPanel.value;
  if (showPanel.value) {
    loadNotifications();
  }
}

// 加载通知列表
async function loadNotifications() {
  loading.value = true;
  try {
    notifications.value = await fetchNotifications();
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

// 轮询未读数量
async function pollUnread() {
  try {
    const result = await fetchUnreadCount();
    unreadCount.value = result.count;
  } catch {
    // ignore
  }
}

// 点击通知项
async function onClickItem(item: Notification) {
  if (!item.isRead) {
    await markNotificationRead(item.id);
    item.isRead = true;
    unreadCount.value = Math.max(0, unreadCount.value - 1);
  }
}

// 全部标记已读
async function onMarkAllRead() {
  await markAllNotificationsRead();
  notifications.value.forEach((n) => (n.isRead = true));
  unreadCount.value = 0;
}

// 通知类型对应图标
function getTypeIcon(type: string) {
  const icons: Record<string, string> = {
    access_request: '📩',
    access_approved: '✅',
    access_rejected: '❌',
    edit_request: '📝',
    edit_approved: '✅',
    edit_rejected: '❌',
  };
  return icons[type] || '🔔';
}

// 格式化时间
function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
}

onMounted(() => {
  pollUnread();
  // 每10秒轮询一次未读数量
  pollTimer = setInterval(pollUnread, 10000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.notification-bell {
  position: relative;
}

.bell-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  color: var(--text-primary, #333);
  transition: all 0.2s;
}

.bell-btn:hover,
.bell-btn--active {
  background: var(--bg-secondary, #f5f5f5);
  border-color: var(--color-primary, #4a90d9);
}

.bell-icon {
  width: 20px;
  height: 20px;
}

.bell-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  color: #fff;
  background: #ef4444;
  border-radius: 9px;
  animation: badge-pulse 2s infinite;
}

@keyframes badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 通知面板 */
.notification-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-height: 480px;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 1000;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light, #e0e0e0);
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin: 0;
}

.mark-all-btn {
  font-size: 13px;
  color: var(--color-primary, #4a90d9);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
}

.mark-all-btn:hover {
  background: var(--bg-secondary, #f5f5f5);
}

.panel-loading,
.panel-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--text-secondary, #888);
  font-size: 14px;
}

.panel-list {
  max-height: 420px;
  overflow-y: auto;
}

/* 通知项 */
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.notification-item:hover {
  background: var(--bg-secondary, #f5f5f5);
}

.notification-item--unread {
  background: rgba(74, 144, 217, 0.04);
}

.notification-item__icon {
  flex-shrink: 0;
  font-size: 20px;
  line-height: 1;
  margin-top: 2px;
}

.notification-item__content {
  flex: 1;
  min-width: 0;
}

.notification-item__title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
  line-height: 1.4;
}

.notification-item__text {
  font-size: 13px;
  color: var(--text-secondary, #888);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-item__time {
  font-size: 12px;
  color: var(--text-tertiary, #aaa);
  margin-top: 4px;
}

.notification-item__dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  background: var(--color-primary, #4a90d9);
  border-radius: 50%;
  margin-top: 6px;
}

/* 遮罩层 */
.panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}

/* 动画 */
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
