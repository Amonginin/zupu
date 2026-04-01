import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from './pages/LoginPage.vue';
import MembersPage from './pages/MembersPage.vue';
import MemberDetailPage from './pages/MemberDetailPage.vue';
import OcrPage from './pages/OcrPage.vue';
import ExportsPage from './pages/ExportsPage.vue';
import AuditsPage from './pages/AuditsPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/members' },
    { path: '/login', component: LoginPage },
    { path: '/members', component: MembersPage },
    { path: '/members/:id', component: MemberDetailPage },
    { path: '/ocr', component: OcrPage },
    { path: '/exports', component: ExportsPage },
    { path: '/audits', component: AuditsPage },
  ],
});

// 路由守卫：检查登录状态
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');
  if (to.path !== '/login' && !token) {
    next('/login');
  } else {
    next();
  }
});
