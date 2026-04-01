import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { login as apiLogin, fetchMe, type AuthResult } from '../services/api';

export interface User {
  id: string;
  username: string;
  familyId?: string;
  role?: string;
}

export interface Family {
  familyId: string;
  familyCode: string;
  familyName: string;
  role: string;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(null);
  const families = ref<Family[]>([]);
  const currentFamilyId = ref<string | null>(null);

  // 初始化时从 localStorage 恢复用户信息
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      user.value = JSON.parse(storedUser);
      currentFamilyId.value = user.value?.familyId ?? null;
    } catch {
      // ignore
    }
  }

  const isLoggedIn = computed(() => !!token.value);
  const username = computed(() => user.value?.username ?? '');
  const role = computed(() => user.value?.role ?? 'viewer');

  async function login(username: string, password: string) {
    const result: AuthResult = await apiLogin(username, password);
    token.value = result.accessToken;
    user.value = result.user;
    currentFamilyId.value = result.user.familyId ?? null;

    localStorage.setItem('token', result.accessToken);
    localStorage.setItem('user', JSON.stringify(result.user));

    return result;
  }

  async function loadUserInfo() {
    if (!token.value) return;
    try {
      const data = await fetchMe();
      user.value = {
        id: data.id,
        username: data.username,
        familyId: data.families?.[0]?.familyCode,
        role: data.families?.[0]?.role,
      };
      families.value = data.families ?? [];
      if (families.value.length > 0 && !currentFamilyId.value) {
        currentFamilyId.value = families.value[0].familyCode;
      }
      localStorage.setItem('user', JSON.stringify(user.value));
    } catch {
      logout();
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    families.value = [];
    currentFamilyId.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  function switchFamily(familyCode: string) {
    currentFamilyId.value = familyCode;
    const family = families.value.find((f) => f.familyCode === familyCode);
    if (family && user.value) {
      user.value = { ...user.value, familyId: familyCode, role: family.role };
      localStorage.setItem('user', JSON.stringify(user.value));
    }
  }

  return {
    token,
    user,
    families,
    currentFamilyId,
    isLoggedIn,
    username,
    role,
    login,
    logout,
    loadUserInfo,
    switchFamily,
  };
});
