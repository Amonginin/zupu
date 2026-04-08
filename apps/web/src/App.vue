<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useTheme } from './composables/useTheme';

import { useAuthStore } from './stores/auth';

const { initTheme } = useTheme();
const authStore = useAuthStore();

onMounted(() => {
  initTheme();
  if (authStore.token) {
    authStore.loadUserInfo();
  }
});
</script>
