<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="login-page__bg">
      <div class="login-page__mountain"></div>
    </div>

    <!-- 登录卡片 -->
    <ZCard class="login-card" decorated>
      <template #header>
        <div class="login-card__header">
          <div class="login-card__logo">族</div>
          <h1 class="login-card__title">族谱系统</h1>
          <p class="login-card__subtitle">传承家族记忆 · 延续血脉情谊</p>
        </div>
      </template>

      <!-- 登录表单 -->
      <form v-if="!showRegister" class="login-form" @submit.prevent="onLogin">
        <ZInput
          v-model="form.username"
          label="用户名"
          placeholder="请输入用户名"
          required
          :error="error && !form.username ? '请输入用户名' : ''"
        />
        
        <ZInput
          v-model="form.password"
          type="password"
          label="密码"
          placeholder="请输入密码"
          required
          :error="error && !form.password ? '请输入密码' : ''"
        />

        <div v-if="error" class="login-form__error">
          {{ error }}
        </div>

        <div v-if="success" class="login-form__success">
          {{ success }}
        </div>

        <ZButton type="submit" variant="primary" block :loading="loading">
          {{ loading ? '登录中...' : '登录' }}
        </ZButton>

        <p class="login-form__hint">
          没有账号？
          <a href="#" @click.prevent="showRegister = true">立即注册</a>
        </p>
      </form>

      <!-- 注册表单 -->
      <form v-else class="login-form" @submit.prevent="onRegister">
        <h3 class="login-form__title">注册新用户</h3>
        
        <ZInput
          v-model="registerForm.username"
          label="用户名"
          placeholder="请输入用户名"
          required
        />
        
        <ZInput
          v-model="registerForm.password"
          type="password"
          label="密码"
          placeholder="请输入密码（至少6位）"
          required
        />

        <div v-if="error" class="login-form__error">
          {{ error }}
        </div>

        <div class="login-form__actions">
          <ZButton type="button" variant="secondary" @click="showRegister = false">
            取消
          </ZButton>
          <ZButton type="submit" variant="primary" :loading="loading">
            注册
          </ZButton>
        </div>
      </form>
    </ZCard>

    <!-- 版权信息 -->
    <p class="login-page__copyright">
      © {{ new Date().getFullYear() }} 族谱数字化系统
    </p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { register } from '../services/api';
import { ZCard, ZInput, ZButton } from '../components/ui';

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({ username: '', password: '' });
const registerForm = reactive({ username: '', password: '' });
const loading = ref(false);
const error = ref('');
const success = ref('');
const showRegister = ref(false);

async function onLogin() {
  loading.value = true;
  error.value = '';
  success.value = '';
  try {
    await authStore.login(form.username, form.password);
    router.push('/members');
  } catch (e: any) {
    error.value = e.response?.data?.message || '登录失败';
  } finally {
    loading.value = false;
  }
}

async function onRegister() {
  loading.value = true;
  error.value = '';
  success.value = '';
  try {
    await register(registerForm.username, registerForm.password);
    showRegister.value = false;
    form.username = registerForm.username;
    form.password = '';
    success.value = '注册成功，请登录';
  } catch (e: any) {
    error.value = e.response?.data?.message || '注册失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.login-page__bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}

.login-page__mountain {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40vh;
  background: linear-gradient(
    to top,
    var(--border-light) 0%,
    transparent 100%
  );
  opacity: 0.5;
  clip-path: polygon(
    0 100%,
    0 60%,
    15% 40%,
    30% 55%,
    45% 30%,
    55% 45%,
    70% 25%,
    85% 50%,
    100% 35%,
    100% 100%
  );
}

/* 登录卡片 */
.login-card {
  width: min(420px, 100%);
  animation: fadeInUp 0.6s ease-out;
}

.login-card__header {
  text-align: center;
  padding: var(--spacing-md) 0;
}

.login-card__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  color: var(--text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-md);
  box-shadow: 
    inset 0 0 0 3px var(--color-accent-hover),
    inset 3px 3px 6px rgba(0,0,0,0.2),
    var(--shadow-md);
  margin-bottom: var(--spacing-md);
}

.login-card__title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs);
}

.login-card__subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

/* 登录表单 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.login-form__title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-primary);
  margin: 0;
  text-align: center;
}

.login-form__error {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-error);
  background: var(--color-error-light);
  border-radius: var(--radius-sm);
  text-align: center;
}

.login-form__success {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-success);
  background: var(--color-success-light);
  border-radius: var(--radius-sm);
  text-align: center;
}

.login-form__hint {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-align: center;
  margin: 0;
}

.login-form__hint a {
  color: var(--color-primary);
  font-weight: 500;
}

.login-form__hint a:hover {
  text-decoration: underline;
}

.login-form__actions {
  display: flex;
  gap: var(--spacing-md);
}

.login-form__actions > * {
  flex: 1;
}

/* 版权信息 */
.login-page__copyright {
  position: absolute;
  bottom: var(--spacing-lg);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式 */
@media (max-width: 767px) {
  .login-card__logo {
    width: 56px;
    height: 56px;
    font-size: var(--text-2xl);
  }

  .login-card__title {
    font-size: var(--text-2xl);
  }
}
</style>
