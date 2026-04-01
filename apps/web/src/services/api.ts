import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// 请求拦截器：添加 token 和 family-id
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const parsed = JSON.parse(user);
      if (parsed.familyId) {
        config.headers['x-family-id'] = parsed.familyId;
      }
    } catch {
      // ignore
    }
  }
  if (!config.headers['x-family-id']) {
    config.headers['x-family-id'] = 'demo-family';
  }
  return config;
});

export interface Member {
  id: string;
  name: string;
  generation?: number;
  alias?: string;
  gender?: string;
  isLiving: boolean;
}

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    username: string;
    familyId?: string;
    role?: string;
  };
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>('/auth/login', { username, password });
  return data;
}

export async function register(username: string, password: string) {
  const { data } = await api.post('/auth/register', { username, password });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function fetchMembers() {
  const { data } = await api.get<Member[]>('/members');
  return data;
}

export async function searchMembers(params: { name?: string; generation?: string; alias?: string }) {
  const { data } = await api.get<Member[]>('/search/members', { params });
  return data;
}

export async function createMember(payload: {
  name: string;
  generation?: number;
  alias?: string;
  isLiving: boolean;
}) {
  const { data } = await api.post<Member>('/members', payload);
  return data;
}

export async function deleteMember(id: string) {
  const { data } = await api.delete(`/members/${id}`);
  return data;
}

export async function createOcrTask(sourceKey: string) {
  const { data } = await api.post('/ocr/tasks', { sourceDocumentId: sourceKey });
  return data;
}

export async function fetchOcrTask(taskId: string) {
  const { data } = await api.get(`/ocr/tasks/${taskId}`);
  return data;
}

export async function reviewOcrTask(taskId: string, members?: Array<{ name: string; generation?: number; alias?: string; isLiving?: boolean }>) {
  const { data } = await api.post(`/ocr/tasks/${taskId}/review`, { members });
  return data;
}

export async function uploadSourceFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/uploads/source', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function createExportTask() {
  const { data } = await api.post('/exports');
  return data;
}

export async function fetchExportTask(taskId: string) {
  const { data } = await api.get(`/exports/${taskId}`);
  return data;
}

export async function fetchAuditLogs(params?: { targetType?: string; limit?: number }) {
  const { data } = await api.get('/audits', { params });
  return data;
}
