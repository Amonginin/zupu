import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'x-family-id': 'demo-family',
  },
});

export interface Member {
  id: string;
  name: string;
  generation?: number;
  alias?: string;
  isLiving: boolean;
}

export async function fetchMembers() {
  const { data } = await api.get<Member[]>('/members');
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

export async function createOcrTask(sourceKey: string) {
  const { data } = await api.post('/ocr/tasks', { sourceDocumentId: sourceKey });
  return data;
}

export async function fetchOcrTask(taskId: string) {
  const { data } = await api.get(`/ocr/tasks/${taskId}`);
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
