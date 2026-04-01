<template>
  <section class="login-card">
    <h2>族谱系统登录</h2>
    <form class="form" @submit.prevent="onLogin">
      <input v-model="form.username" placeholder="用户名" required />
      <input v-model="form.password" type="password" placeholder="密码" required />
      <button type="submit" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>
    <p class="register-link">
      没有账号？
      <a href="#" @click.prevent="showRegister = true">立即注册</a>
    </p>

    <div v-if="showRegister" class="register-form">
      <h3>注册新用户</h3>
      <form class="form" @submit.prevent="onRegister">
        <input v-model="registerForm.username" placeholder="用户名" required />
        <input v-model="registerForm.password" type="password" placeholder="密码（至少6位）" required />
        <button type="submit" :disabled="loading">注册</button>
        <button type="button" @click="showRegister = false">取消</button>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { register } from '../services/api';

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
.login-card {
  max-width: 400px;
  margin: 80px auto;
  padding: 2rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form button {
  padding: 0.75rem;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.form button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  color: #e74c3c;
  margin-top: 1rem;
}

.success {
  color: #27ae60;
  margin-top: 1rem;
}

.register-link {
  margin-top: 1rem;
  text-align: center;
}

.register-link a {
  color: #4a90d9;
  text-decoration: none;
}

.register-form {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}
</style>
