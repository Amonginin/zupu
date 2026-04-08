<template>
  <div class="tree-container" ref="containerRef">
    <div v-if="!data || data.length === 0" class="empty-state">暂无族谱数据</div>
    <svg ref="svgRef" class="d3-svg"></svg>
    <div class="toolbar">
      <ZButton size="sm" variant="secondary" @click="resetZoom">重置视图</ZButton>
      <ZButton size="sm" variant="secondary" @click="expandAll">展开全图</ZButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import * as d3 from 'd3';
import { ZButton } from '../ui';

interface TreeNode {
  id: string;
  name: string;
  generation?: number;
  gender?: string;
  isLiving: boolean;
  spouse?: { id: string; name: string; isLiving?: boolean };
  children?: TreeNode[];
  _children?: TreeNode[]; // 内部用于折叠保存的数据
}

const props = defineProps<{
  data: TreeNode[];
}>();

const containerRef = ref<HTMLElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);

let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
let svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
let gSelection: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

// The standard tree layout params
const nodeWidth = 60;
const nodeHeight = 140;

let rootNode: d3.HierarchyPointNode<TreeNode> | null = null;
let rawHierarchy: d3.HierarchyNode<TreeNode> | null = null;

// Initialize
onMounted(() => {
  initD3();
  if (props.data && props.data.length > 0) {
    renderTree(props.data[0]); // 假设单根节点展示。多节点（多根）在d3中需要虚拟挂载或并排绘制。简单起见，取第一颗树。
  }
});

watch(() => props.data, (newData) => {
  if (newData && newData.length > 0) {
    renderTree(newData[0]);
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

  // Add zoom group
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
    const height = containerRef.value.clientHeight;
    // 默认平移至上中位置
    svgSelection.transition().duration(750).call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(width / 2, 50).scale(1)
    );
  }
}

function expandAll() {
  if (!rawHierarchy) return;
  rawHierarchy.each(d => {
    if (d.data._children) {
      d.data.children = d.data._children;
      d.data._children = undefined;
    }
  });
  update(rawHierarchy);
}

function renderTree(treeData: TreeNode) {
  clearSVG();
  if (!svgSelection || !gSelection || !containerRef.value) return;

  const width = containerRef.value.clientWidth;

  // Create hierarchy
  rawHierarchy = d3.hierarchy(treeData, d => d.children);
  
  // Collapse nodes over generation 3 by default
  rawHierarchy.each(d => {
    if (d.depth >= 3 && d.data.children) {
      d.data._children = d.data.children;
      d.data.children = undefined;
    }
  });

  (rawHierarchy as any).x0 = width / 2;
  (rawHierarchy as any).y0 = 50;

  update(rawHierarchy);
  resetZoom();
}

function update(source: d3.HierarchyNode<TreeNode> | any) {
  if (!rawHierarchy || !gSelection) return;

  const treeLayout = d3.tree<TreeNode>().nodeSize([nodeWidth * 2, nodeHeight]);
  const root = treeLayout(rawHierarchy);

  const nodes = root.descendants();
  const links = root.links();

  const transition = svgSelection!.transition().duration(500);

  // Nodes
  const nodeGroups = gSelection.selectAll<SVGGElement, d3.HierarchyPointNode<TreeNode>>('g.node')
    .data(nodes, d => (d.data.id || (Math.random() + '')));

  const nodeEnter = nodeGroups.enter().append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${source.x0 || root.x},${source.y0 || root.y})`)
    .style('opacity', 0)
    .on('click', (event, d) => {
      // Toggle children
      if (d.data.children) {
        d.data._children = d.data.children;
        d.data.children = undefined;
      } else if (d.data._children) {
        d.data.children = d.data._children;
        d.data._children = undefined;
      }
      update(d);
    });

  // 主节点矩形
  nodeEnter.append('rect')
    .attr('width', 40)
    .attr('height', 100)
    .attr('x', -20)
    .attr('y', 0)
    .attr('rx', 4)
    .attr('fill', d => d.data.isLiving ? '#fff' : '#f5f5f5')
    .attr('stroke', d => d.data.gender === 'female' ? '#e91e63' : '#1f4d7a')
    .attr('stroke-width', 2);

  // 如果有配偶，绘制配偶矩形
  const spouseEnter = nodeEnter.filter(d => Boolean(d.data.spouse));
  spouseEnter.append('rect')
    .attr('width', 40)
    .attr('height', 100)
    .attr('x', 24)
    .attr('y', 0)
    .attr('rx', 4)
    .attr('fill', d => d.data.spouse?.isLiving ? '#fff' : '#f5f5f5')
    .attr('stroke', '#9c27b0')
    .attr('stroke-width', 2);
  
  // 主节点文字
  nodeEnter.append('text')
    .attr('dy', 20)
    .attr('x', 0)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', '#333')
    .text(d => d.data.name.slice(0,1))
    .append('tspan')
    .attr('x', 0)
    .attr('dy', 16)
    .text(d => d.data.name.slice(1,2))
    .append('tspan')
    .attr('x', 0)
    .attr('dy', 16)
    .text(d => d.data.name.slice(2,3));

  // 配偶文字
  spouseEnter.append('text')
    .attr('dy', 20)
    .attr('x', 44)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', '#333')
    .text(d => d.data.spouse!.name.slice(0,1))
    .append('tspan')
    .attr('x', 44)
    .attr('dy', 16)
    .text(d => d.data.spouse!.name.slice(1,2))
    .append('tspan')
    .attr('x', 44)
    .attr('dy', 16)
    .text(d => d.data.spouse!.name.slice(2,3));

  // 配偶连线
  spouseEnter.append('line')
    .attr('x1', 20)
    .attr('y1', 50)
    .attr('x2', 24)
    .attr('y2', 50)
    .attr('stroke', '#ccc')
    .attr('stroke-width', 2);

  // 子节点指示圆点
  nodeEnter.filter(d => Boolean(d.data.children || d.data._children))
    .append('circle')
    .attr('r', 4)
    .attr('cx', d => d.data.spouse ? 22 : 0) // 如果有配偶，连线从中点发
    .attr('cy', 100)
    .attr('fill', '#1f4d7a');

  // Update
  const nodeUpdate = nodeEnter.merge(nodeGroups);
  nodeUpdate.transition(transition as any)
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('opacity', 1);

  // Exit
  const nodeExit = nodeGroups.exit().transition(transition as any)
    .attr('transform', d => `translate(${source.x},${source.y})`)
    .style('opacity', 0)
    .remove();

  // Links
  const linkGroups = gSelection.selectAll<SVGPathElement, d3.HierarchyLink<TreeNode>>('path.link')
    .data(links, d => (d.target.data.id as string));

  const linkEnter = linkGroups.enter().insert('path', 'g')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 1.5)
    .attr('d', d => {
      const o = { x: source.x0 || root.x, y: source.y0 || root.y + 100 };
      return diagonal(o, o);
    });

  const linkUpdate = linkEnter.merge(linkGroups);
  linkUpdate.transition(transition as any)
    .attr('d', d => {
      const startX = d.source.data.spouse ? d.source.x + 22 : d.source.x;
      return diagonal({ x: startX, y: d.source.y + 100 }, { x: d.target.x, y: d.target.y });
    });

  linkGroups.exit().transition(transition as any)
    .attr('d', d => {
      const o = { x: source.x, y: source.y + 100 };
      return diagonal(o, o);
    })
    .remove();

  nodes.forEach(d => {
    (d as any).x0 = d.x;
    (d as any).y0 = d.y;
  });
}

function diagonal(s: {x: number, y: number}, d: {x: number, y: number}) {
  return `M ${s.x} ${s.y}
          C ${s.x} ${(s.y + d.y) / 2},
            ${d.x} ${(s.y + d.y) / 2},
            ${d.x} ${d.y}`;
}

</script>

<style scoped>
.tree-container {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
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

:deep(.node) {
  cursor: pointer;
}
:deep(.node text) {
  pointer-events: none;
}
</style>
