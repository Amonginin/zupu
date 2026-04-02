<template>
  <div :class="['z-input', { 'z-input--error': error, 'z-input--disabled': disabled }]">
    <label v-if="label" class="z-input__label" :for="inputId">
      {{ label }}
      <span v-if="required" class="z-input__required">*</span>
    </label>
    
    <div class="z-input__wrapper">
      <span v-if="$slots.prefix" class="z-input__prefix">
        <slot name="prefix" />
      </span>
      
      <input
        :id="inputId"
        ref="inputRef"
        class="z-input__field"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autocomplete="autocomplete"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      
      <span v-if="$slots.suffix || clearable" class="z-input__suffix">
        <button
          v-if="clearable && modelValue"
          type="button"
          class="z-input__clear"
          @click="handleClear"
        >
          ✕
        </button>
        <slot name="suffix" />
      </span>
      
      <!-- 底部墨迹线 -->
      <span class="z-input__line"></span>
    </div>
    
    <p v-if="error || hint" :class="['z-input__hint', { 'z-input__hint--error': error }]">
      {{ error || hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  modelValue?: string | number;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';
  label?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  clearable?: boolean;
  autocomplete?: string;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false,
  required: false,
  clearable: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  clear: [];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const isFocused = ref(false);

const inputId = computed(() => props.id || `z-input-${Math.random().toString(36).slice(2, 9)}`);

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = props.type === 'number' ? Number(target.value) : target.value;
  emit('update:modelValue', value);
}

function handleFocus(event: FocusEvent) {
  isFocused.value = true;
  emit('focus', event);
}

function handleBlur(event: FocusEvent) {
  isFocused.value = false;
  emit('blur', event);
}

function handleClear() {
  emit('update:modelValue', '');
  emit('clear');
  inputRef.value?.focus();
}

// 暴露方法
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
});
</script>

<style scoped>
.z-input {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.z-input__label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.z-input__required {
  color: var(--color-error);
  margin-left: 2px;
}

.z-input__wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.z-input__field {
  flex: 1;
  width: 100%;
  height: 44px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: none;
  border-bottom: 2px solid var(--border-color);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: all var(--transition-fast);
}

.z-input__field::placeholder {
  color: var(--text-tertiary);
}

.z-input__field:focus {
  outline: none;
  background: var(--bg-elevated);
}

.z-input__field:focus ~ .z-input__line {
  transform: scaleX(1);
}

/* 墨迹底线动画 */
.z-input__line {
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

/* 前缀/后缀 */
.z-input__prefix,
.z-input__suffix {
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-sm);
  color: var(--text-secondary);
}

.z-input__prefix {
  position: absolute;
  left: 0;
}

.z-input__suffix {
  position: absolute;
  right: 0;
}

.z-input__wrapper:has(.z-input__prefix) .z-input__field {
  padding-left: 40px;
}

.z-input__wrapper:has(.z-input__suffix) .z-input__field {
  padding-right: 40px;
}

/* 清除按钮 */
.z-input__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 12px;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.z-input__clear:hover {
  color: var(--text-primary);
  background: var(--border-color);
}

/* 提示文字 */
.z-input__hint {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin: 0;
}

.z-input__hint--error {
  color: var(--color-error);
}

/* 错误状态 */
.z-input--error .z-input__field {
  border-bottom-color: var(--color-error);
}

.z-input--error .z-input__line {
  background: var(--color-error);
}

/* 禁用状态 */
.z-input--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.z-input--disabled .z-input__field {
  background: var(--bg-tertiary);
  cursor: not-allowed;
}
</style>
