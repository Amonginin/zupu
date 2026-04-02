<template>
  <Teleport to="body">
    <Transition name="z-modal">
      <div v-if="modelValue" class="z-modal-overlay" @click="handleOverlayClick">
        <div
          :class="['z-modal', `z-modal--${size}`]"
          role="dialog"
          aria-modal="true"
          @click.stop
        >
          <!-- 装饰卷轴样式 -->
          <div class="z-modal__scroll-top"></div>
          
          <!-- 头部 -->
          <div v-if="$slots.header || title" class="z-modal__header">
            <slot name="header">
              <h3 class="z-modal__title">{{ title }}</h3>
            </slot>
            <button
              v-if="closable"
              class="z-modal__close"
              type="button"
              @click="handleClose"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          
          <!-- 内容 -->
          <div class="z-modal__body">
            <slot />
          </div>
          
          <!-- 底部 -->
          <div v-if="$slots.footer" class="z-modal__footer">
            <slot name="footer" />
          </div>
          
          <!-- 装饰卷轴样式 -->
          <div class="z-modal__scroll-bottom"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue';

interface Props {
  modelValue: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  closable?: boolean;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
  closeOnOverlay: true,
  closeOnEscape: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
}>();

function handleClose() {
  emit('update:modelValue', false);
  emit('close');
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    handleClose();
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.closeOnEscape && props.modelValue) {
    handleClose();
  }
}

// 锁定body滚动
watch(() => props.modelValue, (open) => {
  if (open) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.z-modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal);
}

.z-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 2 * var(--spacing-lg));
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

/* 尺寸 */
.z-modal--sm { width: min(400px, 100%); }
.z-modal--md { width: min(560px, 100%); }
.z-modal--lg { width: min(800px, 100%); }
.z-modal--full { width: calc(100vw - 2 * var(--spacing-lg)); height: calc(100vh - 2 * var(--spacing-lg)); }

/* 卷轴装饰 */
.z-modal__scroll-top,
.z-modal__scroll-bottom {
  height: 8px;
  background: linear-gradient(
    to right,
    var(--border-dark) 0%,
    var(--border-color) 10%,
    var(--border-light) 50%,
    var(--border-color) 90%,
    var(--border-dark) 100%
  );
}

/* 头部 */
.z-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--border-light);
}

.z-modal__title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
}

.z-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.z-modal__close:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

/* 内容 */
.z-modal__body {
  flex: 1;
  padding: var(--spacing-xl);
  overflow-y: auto;
}

/* 底部 */
.z-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-xl);
  border-top: 1px solid var(--border-light);
  background: var(--bg-tertiary);
}

/* 动画 */
.z-modal-enter-active,
.z-modal-leave-active {
  transition: all var(--transition-base);
}

.z-modal-enter-active .z-modal,
.z-modal-leave-active .z-modal {
  transition: all var(--transition-base);
}

.z-modal-enter-from,
.z-modal-leave-to {
  opacity: 0;
}

.z-modal-enter-from .z-modal,
.z-modal-leave-to .z-modal {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

/* 响应式 */
@media (max-width: 767px) {
  .z-modal-overlay {
    padding: var(--spacing-md);
    align-items: flex-end;
  }

  .z-modal {
    width: 100% !important;
    max-height: 85vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .z-modal__header {
    padding: var(--spacing-md) var(--spacing-lg);
  }

  .z-modal__body {
    padding: var(--spacing-lg);
  }

  .z-modal__footer {
    padding: var(--spacing-md) var(--spacing-lg);
  }
}
</style>
