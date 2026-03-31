<template>
  <section class="card">
    <h2>PDF 导出</h2>
    <div class="form">
      <button @click="onCreateExport">创建导出任务</button>
      <button :disabled="!exportTaskId" @click="onRefresh">刷新导出状态</button>
    </div>

    <p v-if="downloadUrl">
      下载链接：<a :href="downloadUrl" target="_blank" rel="noreferrer">打开导出文件</a>
    </p>

    <pre v-if="result" class="result">{{ result }}</pre>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createExportTask, fetchExportTask } from '../services/api';

const exportTaskId = ref('');
const downloadUrl = ref('');
const result = ref('');

async function onCreateExport() {
  const task = await createExportTask();
  exportTaskId.value = task.id;
  result.value = JSON.stringify(task, null, 2);
}

async function onRefresh() {
  const task = await fetchExportTask(exportTaskId.value);
  result.value = JSON.stringify(task, null, 2);
  downloadUrl.value = task.downloadUrl ?? '';
}
</script>
