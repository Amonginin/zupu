<template>
  <div class="drop-line-container" ref="containerRef">
    <div v-if="!data || data.length === 0" class="empty-state">暂无族谱数据</div>
    <div class="canvas-wrapper">
      <svg ref="svgRef" class="d3-svg"></svg>
    </div>
    <div class="toolbar">
      <ZButton size="sm" variant="secondary" @click="resetZoom">重置视图</ZButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import * as d3 from 'd3';
import { ZButton } from '../ui';

interface MemberNode {
  id: string;
  name: string;
  gender?: string;
  isLiving: boolean;
  spouse?: { id: string; name: string };
  generation: number;
}

interface GenerationGroup {
  generation: number;
  members: MemberNode[];
}

const props = defineProps<{
  data: GenerationGroup[];
}>();

const containerRef = ref<HTMLElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);

let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
let svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
let gSelection: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

const rowHeight = 180;
const colWidth = 100;

onMounted(() => {
  initD3();
  if (props.data && props.data.length > 0) {
    renderChart(props.data);
  }
});

watch(() => props.data, (newData) => {
  if (newData && newData.length > 0) {
    renderChart(newData);
  } else {
    clearSVG();
  }
}, { deep: true });

function initD3() {
  if (!svgRef.value || !containerRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  svgSelection = d3.select(svgRef.value)
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);

  gSelection = svgSelection.append('g');

  zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 3])
    .on('zoom', (event) => {
      gSelection?.attr('transform', event.transform);
    });

  svgSelection.call(zoomBehavior).on("dblclick.zoom", null);
}

function clearSVG() {
  gSelection?.selectAll('*').remove();
}

function resetZoom() {
  if (svgSelection && zoomBehavior && containerRef.value) {
    const width = containerRef.value.clientWidth;
    svgSelection.transition().duration(750).call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(width / 2 - colWidth, 50).scale(1)
    );
  }
}

function renderChart(groupData: GenerationGroup[]) {
  clearSVG();
  if (!svgSelection || !gSelection) return;

  let maxMembersInGen = 0;
  groupData.forEach(g => {
    if (g.members.length > maxMembersInGen) maxMembersInGen = g.members.length;
  });

  // 每一代作为一行 (y轴)，每代里面的所有成员向右平铺 (x轴)
  // 不体现严谨的父子连线位置，主要体现扁平世系全貌
  const nodes: any[] = [];
  groupData.forEach((group, rowIndex) => {
    group.members.forEach((m, colIndex) => {
      nodes.push({
        ...m,
        x: colIndex * colWidth,
        y: rowIndex * rowHeight,
      });
    });
  });

  // Draw 世代背景提示
  const gens = gSelection.selectAll('g.gen')
    .data(groupData)
    .enter()
    .append('g')
    .attr('class', 'gen')
    .attr('transform', (d, i) => `translate(-80, ${i * rowHeight})`);

  gens.append('text')
    .text(d => `第${d.generation}世`)
    .style('font-size', '20px')
    .style('font-weight', 'bold')
    .style('fill', 'var(--text-tertiary)')
    .attr('y', 50);

  // Nodes
  const nodeGroups = gSelection.selectAll('g.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.x},${d.y})`);

  nodeGroups.append('rect')
    .attr('width', 40)
    .attr('height', 100)
    .attr('x', 0)
    .attr('y', 0)
    .attr('rx', 2)
    .attr('fill', d => d.isLiving ? '#fff' : '#eaeaea')
    .attr('stroke', d => (d.gender === 'female' ? '#e91e63' : '#1f4d7a'))
    .attr('stroke-width', 2);

  nodeGroups.append('text')
    .attr('x', 20)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .style('fill', '#333')
    .text(d => d.name.slice(0,1))
    .append('tspan')
    .attr('x', 20).attr('dy', 20).text(d => d.name.slice(1,2))
    .append('tspan')
    .attr('x', 20).attr('dy', 20).text(d => d.name.slice(2,3));

  resetZoom();
}
</script>

<style scoped>
.drop-line-container {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.canvas-wrapper {
  width: 100%;
  height: 100%;
}

.d3-svg {
  cursor: grab;
}

.d3-svg:active {
  cursor: grabbing;
}

.toolbar {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-tertiary);
}
</style>
