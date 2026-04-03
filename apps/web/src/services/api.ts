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

// ===== v0.2 新增接口 =====

// -- 族谱管理 --
export async function createFamily(name: string, code: string) {
  const { data } = await api.post('/families', { name, code });
  return data;
}

export async function fetchMyFamilies() {
  const { data } = await api.get('/families');
  return data;
}

export async function updateFamilyAccessLevel(familyId: string, accessLevel: string) {
  const { data } = await api.patch(`/families/${familyId}/access-level`, { accessLevel });
  return data;
}

export async function fetchFamilyRoles(familyId: string) {
  const { data } = await api.get(`/families/${familyId}/roles`);
  return data;
}

export async function removeFamilyRole(familyId: string, userId: string) {
  const { data } = await api.delete(`/families/${familyId}/roles/${userId}`);
  return data;
}

// -- 申请审批 --
export interface AccessRequest {
  id: string;
  familyId: string;
  userId: string;
  type: 'collaborator' | 'viewer';
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  reviewerId?: string;
  reviewNote?: string;
  createdAt: string;
}

export async function submitAccessRequest(familyId: string, type: string, reason?: string) {
  const { data } = await api.post('/access-requests', { familyId, type, reason });
  return data;
}

export async function fetchAccessRequests(status?: string) {
  const { data } = await api.get<AccessRequest[]>('/access-requests', { params: { status } });
  return data;
}

export async function fetchMyAccessRequests() {
  const { data } = await api.get<AccessRequest[]>('/access-requests/mine');
  return data;
}

export async function approveAccessRequest(id: string, note?: string) {
  const { data } = await api.post(`/access-requests/${id}/approve`, { note });
  return data;
}

export async function rejectAccessRequest(id: string, note: string) {
  const { data } = await api.post(`/access-requests/${id}/reject`, { note });
  return data;
}

// -- 修改请求 --
export interface EditRequest {
  id: string;
  familyId: string;
  userId: string;
  editType: string;
  editPayload: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_needed';
  reviewerId?: string;
  reviewNote?: string;
  createdAt: string;
}

export async function submitEditRequest(editType: string, editPayload: object, reason?: string) {
  const { data } = await api.post('/edit-requests', {
    editType,
    editPayload: JSON.stringify(editPayload),
    reason,
  });
  return data;
}

export async function fetchEditRequests(status?: string) {
  const { data } = await api.get<EditRequest[]>('/edit-requests', { params: { status } });
  return data;
}

export async function approveEditRequest(id: string) {
  const { data } = await api.post(`/edit-requests/${id}/approve`);
  return data;
}

export async function rejectEditRequest(id: string, note: string) {
  const { data } = await api.post(`/edit-requests/${id}/reject`, { note });
  return data;
}

// -- 通知 --
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  content?: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

export async function fetchNotifications() {
  const { data } = await api.get<Notification[]>('/notifications');
  return data;
}

export async function fetchUnreadCount() {
  const { data } = await api.get<{ count: number }>('/notifications/unread-count');
  return data;
}

export async function markNotificationRead(id: string) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.post('/notifications/read-all');
  return data;
}
