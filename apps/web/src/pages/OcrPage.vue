<template>
  <section class="card">
    <h2>OCR 导入</h2>
    <div class="form">
      <input type="file" @change="onSelectFile" />
      <button :disabled="!selectedFile" @click="onUpload">上传原始图片</button>
    </div>

    <p v-if="sourceDocumentId">sourceDocumentId: {{ sourceDocumentId }}</p>

    <div class="form">
      <button :disabled="!sourceDocumentId" @click="onCreateOcrTask">创建 OCR 任务</button>
      <button :disabled="!ocrTaskId" @click="onRefresh">刷新任务状态</button>
    </div>

    <pre v-if="taskResult" class="result">{{ taskResult }}</pre>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createOcrTask, fetchOcrTask, uploadSourceFile } from '../services/api';

const selectedFile = ref<File | null>(null);
const sourceDocumentId = ref('');
const ocrTaskId = ref('');
const taskResult = ref('');

function onSelectFile(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFile.value = input.files?.[0] ?? null;
}

async function onUpload() {
  if (!selectedFile.value) return;
  const source = await uploadSourceFile(selectedFile.value);
  sourceDocumentId.value = source.id;
}

async function onCreateOcrTask() {
  const task = await createOcrTask(sourceDocumentId.value);
  ocrTaskId.value = task.id;
  taskResult.value = JSON.stringify(task, null, 2);
}

async function onRefresh() {
  const task = await fetchOcrTask(ocrTaskId.value);
  taskResult.value = JSON.stringify(task, null, 2);
}
</script>
