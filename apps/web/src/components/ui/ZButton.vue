<template>
  <button
    :class="[
      'z-btn',
      `z-btn--${variant}`,
      `z-btn--${size}`,
      {
        'z-btn--block': block,
        'z-btn--loading': loading,
        'z-btn--icon-only': iconOnly,
      },
    ]"
    :disabled="disabled || loading"
    :type="type"
    @click="handleClick"
  >
    <span v-if="loading" class="z-btn__spinner"></span>
    <span class="z-btn__content" :class="{ 'z-btn__content--hidden': loading }">
      <slot />
    </span>
    <span class="z-btn__ripple" ref="rippleRef"></span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  iconOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
  block: false,
  iconOnly: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const rippleRef = ref<HTMLElement | null>(null);

function handleClick(event: MouseEvent) {
  if (props.disabled || props.loading) return;

  // 墨迹涟漪效果
  if (rippleRef.value) {
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    rippleRef.value.style.left = `${x}px`;
    rippleRef.value.style.top = `${y}px`;
    rippleRef.value.classList.remove('z-btn__ripple--active');
    void rippleRef.value.offsetWidth; // 触发重绘
    rippleRef.value.classList.add('z-btn__ripple--active');
  }

  emit('click', event);
}
</script>

<style scoped>
.z-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  font-family: var(--font-body);
  font-weight: 500;
  border: none;
  cursor: pointer;
  overflow: hidden;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

/* 尺寸 */
.z-btn--sm {
  height: 32px;
  padding: 0 var(--spacing-md);
  font-size: var(--text-sm);
  border-radius: var(--radius-sm);
}

.z-btn--md {
  height: 40px;
  padding: 0 var(--spacing-lg);
  font-size: var(--text-base);
  border-radius: var(--radius-md);
}

.z-btn--lg {
  height: 48px;
  padding: 0 var(--spacing-xl);
  font-size: var(--text-lg);
  border-radius: var(--radius-md);
}

/* 主要按钮 */
.z-btn--primary {
  background: var(--color-primary);
  color: var(--text-inverse);
  box-shadow: var(--shadow-sm);
}

.z-btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.z-btn--primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

/* 次要按钮 */
.z-btn--secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.z-btn--secondary:hover:not(:disabled) {
  background: var(--color-primary-light);
}

/* 幽灵按钮 */
.z-btn--ghost {
  background: transparent;
  color: var(--text-primary);
}

.z-btn--ghost:hover:not(:disabled) {
  background: var(--bg-tertiary);
}

/* 强调按钮 */
.z-btn--accent {
  background: var(--color-accent);
  color: var(--text-inverse);
  box-shadow: var(--shadow-sm);
}

.z-btn--accent:hover:not(:disabled) {
  background: var(--color-accent-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

/* 危险按钮 */
.z-btn--danger {
  background: var(--color-error);
  color: var(--text-inverse);
}

.z-btn--danger:hover:not(:disabled) {
  background: #B71C1C;
  box-shadow: var(--shadow-md);
}

/* 禁用状态 */
.z-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 块级按钮 */
.z-btn--block {
  width: 100%;
}

/* 仅图标 */
.z-btn--icon-only.z-btn--sm {
  width: 32px;
  padding: 0;
}

.z-btn--icon-only.z-btn--md {
  width: 40px;
  padding: 0;
}

.z-btn--icon-only.z-btn--lg {
  width: 48px;
  padding: 0;
}

/* 加载状态 */
.z-btn--loading {
  pointer-events: none;
}

.z-btn__content--hidden {
  visibility: hidden;
}

.z-btn__spinner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 墨迹涟漪效果 */
.z-btn__ripple {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0);
  pointer-events: none;
}

.z-btn__ripple--active {
  animation: inkSpread 0.6s ease-out;
}

@keyframes inkSpread {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0.3;
  }
  100% {
    transform: translate(-50%, -50%) scale(4);
    opacity: 0;
  }
}
</style>
