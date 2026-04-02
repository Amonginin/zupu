<template>
  <div :class="['z-card', { 'z-card--hoverable': hoverable, 'z-card--bordered': bordered }]">
    <!-- 装饰角纹 -->
    <div v-if="decorated" class="z-card__corner z-card__corner--tl"></div>
    <div v-if="decorated" class="z-card__corner z-card__corner--tr"></div>
    <div v-if="decorated" class="z-card__corner z-card__corner--bl"></div>
    <div v-if="decorated" class="z-card__corner z-card__corner--br"></div>

    <!-- 标题区 -->
    <div v-if="$slots.header || title" class="z-card__header">
      <slot name="header">
        <h3 class="z-card__title">{{ title }}</h3>
        <p v-if="subtitle" class="z-card__subtitle">{{ subtitle }}</p>
      </slot>
    </div>

    <!-- 内容区 -->
    <div class="z-card__body" :class="{ 'z-card__body--no-padding': noPadding }">
      <slot />
    </div>

    <!-- 底部区 -->
    <div v-if="$slots.footer" class="z-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  subtitle?: string;
  hoverable?: boolean;
  bordered?: boolean;
  decorated?: boolean;
  noPadding?: boolean;
}

withDefaults(defineProps<Props>(), {
  hoverable: false,
  bordered: true,
  decorated: false,
  noPadding: false,
});
</script>

<style scoped>
.z-card {
  position: relative;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: all var(--transition-base);
}

.z-card--bordered {
  border: 1px solid var(--border-color);
}

.z-card--hoverable:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

/* 装饰角纹 */
.z-card__corner {
  position: absolute;
  width: 24px;
  height: 24px;
  pointer-events: none;
  opacity: 0.6;
}

.z-card__corner::before,
.z-card__corner::after {
  content: '';
  position: absolute;
  background: var(--decoration-color);
}

.z-card__corner--tl {
  top: 8px;
  left: 8px;
}

.z-card__corner--tl::before {
  top: 0;
  left: 0;
  width: 16px;
  height: 2px;
}

.z-card__corner--tl::after {
  top: 0;
  left: 0;
  width: 2px;
  height: 16px;
}

.z-card__corner--tr {
  top: 8px;
  right: 8px;
}

.z-card__corner--tr::before {
  top: 0;
  right: 0;
  width: 16px;
  height: 2px;
}

.z-card__corner--tr::after {
  top: 0;
  right: 0;
  width: 2px;
  height: 16px;
}

.z-card__corner--bl {
  bottom: 8px;
  left: 8px;
}

.z-card__corner--bl::before {
  bottom: 0;
  left: 0;
  width: 16px;
  height: 2px;
}

.z-card__corner--bl::after {
  bottom: 0;
  left: 0;
  width: 2px;
  height: 16px;
}

.z-card__corner--br {
  bottom: 8px;
  right: 8px;
}

.z-card__corner--br::before {
  bottom: 0;
  right: 0;
  width: 16px;
  height: 2px;
}

.z-card__corner--br::after {
  bottom: 0;
  right: 0;
  width: 2px;
  height: 16px;
}

/* 标题区 */
.z-card__header {
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--border-light);
}

.z-card__title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
}

.z-card__subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: var(--spacing-xs) 0 0;
}

/* 内容区 */
.z-card__body {
  padding: var(--spacing-xl);
}

.z-card__body--no-padding {
  padding: 0;
}

/* 底部区 */
.z-card__footer {
  padding: var(--spacing-md) var(--spacing-xl);
  border-top: 1px solid var(--border-light);
  background: var(--bg-tertiary);
}

/* 响应式 */
@media (max-width: 767px) {
  .z-card__header {
    padding: var(--spacing-md) var(--spacing-lg);
  }

  .z-card__body {
    padding: var(--spacing-lg);
  }

  .z-card__footer {
    padding: var(--spacing-sm) var(--spacing-lg);
  }

  .z-card__title {
    font-size: var(--text-xl);
  }
}
</style>
