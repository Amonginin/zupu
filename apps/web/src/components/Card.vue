<template>
  <section class="card"><slot /></section>
</template>

<script setup lang="ts"></script>

<style scoped>
.card {
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 6px rgba(16,24,40,0.04);
  margin-bottom: 1rem;
}
</style>