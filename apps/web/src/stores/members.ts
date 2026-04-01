import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  fetchMembers,
  searchMembers,
  createMember,
  deleteMember,
  type Member,
  api,
} from '../services/api';

export interface MemberRelations {
  parents: Member[];
  children: Member[];
  spouses: Member[];
}

export const useMembersStore = defineStore('members', () => {
  const members = ref<Member[]>([]);
  const currentMember = ref<Member | null>(null);
  const currentRelations = ref<MemberRelations | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadMembers() {
    loading.value = true;
    error.value = null;
    try {
      members.value = await fetchMembers();
    } catch (e: any) {
      error.value = e.response?.data?.message || '加载成员列表失败';
    } finally {
      loading.value = false;
    }
  }

  async function search(params: { name?: string; generation?: string; alias?: string }) {
    loading.value = true;
    error.value = null;
    try {
      members.value = await searchMembers(params);
    } catch (e: any) {
      error.value = e.response?.data?.message || '搜索失败';
    } finally {
      loading.value = false;
    }
  }

  async function addMember(payload: { name: string; generation?: number; alias?: string; isLiving: boolean }) {
    loading.value = true;
    error.value = null;
    try {
      const newMember = await createMember(payload);
      members.value.unshift(newMember);
      return newMember;
    } catch (e: any) {
      error.value = e.response?.data?.message || '创建成员失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function removeMember(id: string) {
    loading.value = true;
    error.value = null;
    try {
      await deleteMember(id);
      members.value = members.value.filter((m) => m.id !== id);
    } catch (e: any) {
      error.value = e.response?.data?.message || '删除成员失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadMemberDetail(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<Member>(`/members/${id}`);
      currentMember.value = data;
      return data;
    } catch (e: any) {
      error.value = e.response?.data?.message || '加载成员详情失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadMemberRelations(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<MemberRelations>(`/members/${id}/relations`);
      currentRelations.value = data;
      return data;
    } catch (e: any) {
      error.value = e.response?.data?.message || '加载关系失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createRelation(fromId: string, toMemberId: string, type: 'parent_of' | 'spouse_of') {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post(`/members/${fromId}/relations`, { toMemberId, type });
      await loadMemberRelations(fromId);
      return data;
    } catch (e: any) {
      error.value = e.response?.data?.message || '创建关系失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function clearCurrent() {
    currentMember.value = null;
    currentRelations.value = null;
  }

  return {
    members,
    currentMember,
    currentRelations,
    loading,
    error,
    loadMembers,
    search,
    addMember,
    removeMember,
    loadMemberDetail,
    loadMemberRelations,
    createRelation,
    clearCurrent,
  };
});
