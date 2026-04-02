<template>
  <div :class="['z-select', { 'z-select--error': error, 'z-select--disabled': disabled }]">
    <label v-if="label" class="z-select__label" :for="selectId">
      {{ label }}
      <span v-if="required" class="z-select__required">*</span>
    </label>
    
    <div class="z-select__wrapper">
      <select
        :id="selectId"
        ref="selectRef"
        class="z-select__field"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <slot>
          <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            :disabled="option.disabled"
          >
            {{ option.label }}
          </option>
        </slot>
      </select>
      
      <span class="z-select__arrow">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      
      <!-- 底部墨迹线 -->
      <span class="z-select__line"></span>
    </div>
    
    <p v-if="error || hint" :class="['z-select__hint', { 'z-select__hint--error': error }]">
      {{ error || hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

interface Props {
  modelValue?: string | number;
  options?: SelectOption[];
  label?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  options: () => [],
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}>();

const selectRef = ref<HTMLSelectElement | null>(null);

const selectId = computed(() => props.id || `z-select-${Math.random().toString(36).slice(2, 9)}`);

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
}

function handleFocus(event: FocusEvent) {
  emit('focus', event);
}

function handleBlur(event: FocusEvent) {
  emit('blur', event);
}

defineExpose({
  focus: () => selectRef.value?.focus(),
  blur: () => selectRef.value?.blur(),
});
</script>

<style scoped>
.z-select {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.z-select__label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.z-select__required {
  color: var(--color-error);
  margin-left: 2px;
}

.z-select__wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.z-select__field {
  flex: 1;
  width: 100%;
  height: 44px;
  padding: var(--spacing-sm) var(--spacing-xl) var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: none;
  border-bottom: 2px solid var(--border-color);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  cursor: pointer;
  appearance: none;
  transition: all var(--transition-fast);
}

.z-select__field:focus {
  outline: none;
  background: var(--bg-elevated);
}

.z-select__field:focus ~ .z-select__line {
  transform: scaleX(1);
}

/* 箭头 */
.z-select__arrow {
  position: absolute;
  right: var(--spacing-md);
  color: var(--text-secondary);
  pointer-events: none;
  transition: transform var(--transition-fast);
}

.z-select__field:focus ~ .z-select__arrow {
  transform: rotate(180deg);
}

/* 墨迹底线动画 */
.z-select__line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform var(--transition-base);
}

/* 提示文字 */
.z-select__hint {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: 0;
}

.z-select__hint--error {
  color: var(--color-error);
}

/* 错误状态 */
.z-select--error .z-select__field {
  border-bottom-color: var(--color-error);
}

.z-select--error .z-select__line {
  background: var(--color-error);
}

/* 禁用状态 */
.z-select--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.z-select--disabled .z-select__field {
  background: var(--bg-tertiary);
  cursor: not-allowed;
}
</style>
