<template>
  <span :class="['z-badge', `z-badge--${variant}`, `z-badge--${size}`]">
    <slot />
  </span>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
});
</script>

<style scoped>
.z-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-body);
  font-weight: 500;
  white-space: nowrap;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

/* 尺寸 */
.z-badge--sm {
  height: 20px;
  padding: 0 var(--spacing-sm);
  font-size: var(--text-xs);
}

.z-badge--md {
  height: 24px;
  padding: 0 var(--spacing-md);
  font-size: var(--text-sm);
}

.z-badge--lg {
  height: 28px;
  padding: 0 var(--spacing-md);
  font-size: var(--text-base);
}

/* 变体 */
.z-badge--default {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.z-badge--primary {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.z-badge--secondary {
  background: var(--color-secondary-light);
  color: var(--color-secondary);
}

.z-badge--accent {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.z-badge--success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.z-badge--warning {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.z-badge--error {
  background: var(--color-error-light);
  color: var(--color-error);
}

.z-badge--info {
  background: var(--color-info-light);
  color: var(--color-info);
}
</style>
