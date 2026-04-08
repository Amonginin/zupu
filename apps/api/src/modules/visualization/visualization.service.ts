import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface TreeNode {
  id: string;
  name: string;
  generation?: number;
  gender?: string;
  isLiving: boolean;
  spouse?: { id: string; name: string };
  children: TreeNode[];
}

export interface GenerationGroup {
  generation: number;
  members: (any & { spouse?: any })[];
}

@Injectable()
export class VisualizationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 构建树状图数据 (嵌套结构)
   */
  async getTreeData(familyId: string): Promise<TreeNode[]> {
    // 1. 一次性获取所有成员
    const members = await this.prisma.member.findMany({
      where: { familyId },
      orderBy: { generation: 'asc' }, // 尽量让长辈在前
    });

    if (members.length === 0) return [];

    // 2. 一次性获取所有关系
    const relations = await this.prisma.relationship.findMany({
      where: { familyId },
    });

    // 3. 构建快速查找表
    const memberMap = new Map<string, any>();
    members.forEach((m) => {
      memberMap.set(m.id, { ...m, children: [] });
    });

    // 4. 重建连接
    const parentsOf = new Map<string, string>(); // childId -> parentId

    relations.forEach((rel) => {
      if (rel.type === 'parent_of') {
        const parent = memberMap.get(rel.fromMemberId);
        const child = memberMap.get(rel.toMemberId);
        if (parent && child) {
          parent.children.push(child);
          parentsOf.set(child.id, parent.id);
        }
      } else if (rel.type === 'spouse_of') {
        const m1 = memberMap.get(rel.fromMemberId);
        const m2 = memberMap.get(rel.toMemberId);
        if (m1 && m2) {
          m1.spouse = { id: m2.id, name: m2.name, isLiving: m2.isLiving, generation: m2.generation };
          // 双向绑定配偶（简单处理）
          m2.spouse = { id: m1.id, name: m1.name, isLiving: m1.isLiving, generation: m1.generation };
        }
      }
    });

    // 5. 寻找根节点 (没有父节点的成员)
    const rootNodes: TreeNode[] = [];
    memberMap.forEach((node, id) => {
      if (!parentsOf.has(id)) {
        // 如果是别人的配偶且没有父辈，通常视为挂载在伴侣身上，不作为独立的根
        // 查找是否自己是配偶，如果自己是女性或别人通过spouse_of关联，也许可以隐藏
        // 但简单起见，只要没父母，就可能是树根（或者孤立节点）
        // 优化：如果有spouse但其spouse有父母，则他不是主根
        let isMainRoot = true;
        if (node.spouse) {
            const spouseNode = memberMap.get(node.spouse.id);
            if (spouseNode && parentsOf.has(spouseNode.id)) {
                isMainRoot = false;
            }
            // 防止互相没父母导致出现两个根
            if (isMainRoot && !parentsOf.has(node.spouse.id)) {
               // 约定男性优先作根，或id小的
               if (node.id > node.spouse.id) {
                   isMainRoot = false;
               }
            }
        }
        if (isMainRoot) {
          rootNodes.push(this.formatTreeNode(node));
        }
      }
    });

    return rootNodes;
  }

  private formatTreeNode(node: any): TreeNode {
    return {
      id: node.id,
      name: node.name,
      generation: node.generation,
      gender: node.gender,
      isLiving: node.isLiving,
      spouse: node.spouse ? { id: node.spouse.id, name: node.spouse.name } : undefined,
      children: node.children.map((c: any) => this.formatTreeNode(c)),
    };
  }

  /**
   * 构建吊线图数据 (按世代分组并打平)
   */
  async getDropLineData(familyId: string): Promise<GenerationGroup[]> {
    const trees = await this.getTreeData(familyId);
    
    const genMap = new Map<number, any[]>();
    
    // 递归拍平并按世代分类
    const traverse = (node: TreeNode, currentGen: number) => {
      const g = node.generation || currentGen;
      if (!genMap.has(g)) {
        genMap.set(g, []);
      }
      genMap.get(g)!.push(node);
      
      node.children.forEach(child => traverse(child, g + 1));
    };

    trees.forEach(root => traverse(root, root.generation || 1));

    // 按世代排序
    const sortedGens = Array.from(genMap.keys()).sort((a, b) => a - b);
    
    return sortedGens.map(g => ({
      generation: g,
      members: genMap.get(g)!,
    }));
  }
}
