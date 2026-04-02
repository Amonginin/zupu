<template>
  <div :class="['z-loading', `z-loading--${size}`]">
    <div class="z-loading__ink">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <p v-if="text" class="z-loading__text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

withDefaults(defineProps<Props>(), {
  size: 'md',
});
</script>

<style scoped>
.z-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
}

.z-loading__ink {
  display: flex;
  align-items: center;
  gap: 6px;
}

.z-loading__ink span {
  display: block;
  background: var(--color-primary);
  border-radius: 50%;
  animation: inkDrop 1.4s ease-in-out infinite;
}

.z-loading__ink span:nth-child(1) { animation-delay: -0.32s; }
.z-loading__ink span:nth-child(2) { animation-delay: -0.16s; }
.z-loading__ink span:nth-child(3) { animation-delay: 0s; }

/* 尺寸 */
.z-loading--sm .z-loading__ink span {
  width: 8px;
  height: 8px;
}

.z-loading--md .z-loading__ink span {
  width: 12px;
  height: 12px;
}

.z-loading--lg .z-loading__ink span {
  width: 16px;
  height: 16px;
}

.z-loading__text {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

/* 墨滴动画 */
@keyframes inkDrop {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 全屏加载覆盖层 */
.z-loading--fullscreen {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal);
}
</style>
