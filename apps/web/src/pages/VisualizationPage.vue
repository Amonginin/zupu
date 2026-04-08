<template>
  <AppLayout>
    <div class="visualization-page">
      <div class="viz-header">
        <div class="viz-header__title">
          <h2>全景大屏展示</h2>
          <p>以交互式视图探索世系脉络</p>
        </div>
        
        <div class="viz-header__controls">
          <div class="view-switch">
            <ZButton 
              :variant="viewMode === 'tree' ? 'primary' : 'secondary'"
              size="sm"
              @click="switchMode('tree')"
            >
              树状分支图
            </ZButton>
            <ZButton 
              :variant="viewMode === 'dropline' ? 'primary' : 'secondary'"
              size="sm"
              @click="switchMode('dropline')"
            >
              世系吊线图
            </ZButton>
          </div>
          <ZButton variant="primary" size="sm" @click="exportToImage" :loading="exporting">
            📸 导出高清图
          </ZButton>
        </div>
      </div>

      <div class="viz-content" ref="vizCanvasRef">
        <div v-if="loading" class="viz-loading">加载中，请稍候...</div>
        <div v-else-if="error" class="viz-error">{{ error }}</div>
        <template v-else>
          <TreeChart 
            v-if="viewMode === 'tree'" 
            :data="treeData"
            class="viz-canvas"
          />
          <DropLineChart 
            v-else-if="viewMode === 'dropline'" 
            :data="dropLineData"
            class="viz-canvas"
          />
        </template>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { fetchTreeData, fetchDropLineData } from '../services/api';
import { AppLayout } from '../components/layout';
import TreeChart from '../components/viz/TreeChart.vue';
import DropLineChart from '../components/viz/DropLineChart.vue';
import { ZButton } from '../components/ui';
import * as htmlToImage from 'html-to-image';

const authStore = useAuthStore();

const viewMode = ref<'tree' | 'dropline'>('tree');
const loading = ref(false);
const error = ref<string | null>(null);
const exporting = ref(false);

const treeData = ref<any[]>([]);
const dropLineData = ref<any[]>([]);
const vizCanvasRef = ref<HTMLElement | null>(null);

onMounted(() => {
  loadData();
});

watch(() => authStore.currentFamilyId, () => {
  loadData();
});

async function loadData() {
  const familyId = authStore.currentFamilyId;
  if (!familyId) {
    error.value = '请先选择或加入一个族谱';
    return;
  }
  
  error.value = null;
  loading.value = true;
  try {
    if (viewMode.value === 'tree') {
      treeData.value = await fetchTreeData(familyId);
    } else {
      dropLineData.value = await fetchDropLineData(familyId);
    }
  } catch (e: any) {
    error.value = e.response?.data?.message || '加载图表数据失败';
  } finally {
    loading.value = false;
  }
}

function switchMode(mode: 'tree' | 'dropline') {
  if (viewMode.value === mode) return;
  viewMode.value = mode;
  loadData();
}

async function exportToImage() {
  if (!vizCanvasRef.value) return;
  exporting.value = true;
  try {
    const dataUrl = await htmlToImage.toPng(vizCanvasRef.value, { 
      quality: 1, 
      pixelRatio: 2,
      backgroundColor: '#ffffff'
    });
    const link = document.createElement('a');
    link.download = `zupu_${viewMode.value}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  } catch (e) {
    alert('导出失败，请重试');
  } finally {
    exporting.value = false;
  }
}
</script>

<style scoped>
.visualization-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  gap: var(--spacing-md);
}

.viz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-secondary);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
}

.viz-header__title h2 {
  margin: 0;
  font-size: var(--text-2xl);
  font-family: var(--font-display);
}

.viz-header__title p {
  margin: 4px 0 0 0;
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.viz-header__controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.view-switch {
  display: flex;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  padding: 4px;
  border: 1px solid var(--border-light);
  gap: 4px;
}

.viz-content {
  flex: 1;
  position: relative;
  min-height: 500px;
}

.viz-loading,
.viz-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: var(--text-lg);
  color: var(--text-secondary);
}

.viz-error {
  color: var(--color-danger);
}

.viz-canvas {
  width: 100%;
  height: 100%;
}
</style>
