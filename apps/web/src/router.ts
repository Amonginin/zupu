import { createRouter, createWebHistory } from 'vue-router';
import MembersPage from './pages/MembersPage.vue';
import OcrPage from './pages/OcrPage.vue';
import ExportsPage from './pages/ExportsPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/members' },
    { path: '/members', component: MembersPage },
    { path: '/ocr', component: OcrPage },
    { path: '/exports', component: ExportsPage },
  ],
});
