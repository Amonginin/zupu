<template>
  <div class="app-layout">
    <AppHeader @toggle-menu="mobileMenuOpen = true" />
    
    <main class="app-layout__main">
      <div class="app-layout__container">
        <slot />
      </div>
    </main>

    <MobileNav :open="mobileMenuOpen" @close="mobileMenuOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppHeader from './AppHeader.vue';
import MobileNav from './MobileNav.vue';
import { useTheme } from '../../composables/useTheme';

const mobileMenuOpen = ref(false);
const { initTheme } = useTheme();

onMounted(() => {
  initTheme();
});
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-layout__main {
  flex: 1;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.app-layout__container {
  max-width: var(--max-width);
  margin: 0 auto;
}

/* 响应式 */
@media (max-width: 767px) {
  .app-layout__main {
    padding: var(--spacing-md);
  }
}
</style>
