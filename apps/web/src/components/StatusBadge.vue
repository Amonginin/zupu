<template>
  <span :class="['status-badge', variant]">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { defineProps } from 'vue';

const props = defineProps({
  variant: { type: String, default: 'default' },
  label: { type: String, default: '' },
});
</script>

<style scoped>
.status-badge { padding: 0.15rem 0.5rem; border-radius: 4px; font-size:0.8rem }
.status-badge.default { background:#eef2ff; color:#3b49a6 }
.status-badge.living { background:#e8f5e9; color:#2e7d32 }
.status-badge.deceased { background:#f5f5f5; color:#666 }
</style>