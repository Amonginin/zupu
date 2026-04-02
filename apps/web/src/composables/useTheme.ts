/**
 * 主题切换 Composable
 * 支持三套主题：light(墨韵素雅)、dark(夜墨深沉)、artistic(水墨丹青)
 */

import { ref, watch, computed } from 'vue';
import { useLocalStorage, usePreferredDark } from '@vueuse/core';

export type ThemeType = 'light' | 'dark' | 'artistic';

export interface ThemeInfo {
  id: ThemeType;
  name: string;
  description: string;
  icon: string;
}

export const themes: ThemeInfo[] = [
  {
    id: 'light',
    name: '墨韵素雅',
    description: '宣纸米白底，紫檀棕与朱砂红点缀',
    icon: '☀️',
  },
  {
    id: 'dark',
    name: '夜墨深沉',
    description: '墨黑底色，金褐与珊瑚红装饰',
    icon: '🌙',
  },
  {
    id: 'artistic',
    name: '水墨丹青',
    description: '花青蓝调，赭石金与石绿搭配',
    icon: '🎨',
  },
];

const THEME_STORAGE_KEY = 'zupu-theme';

// 全局响应式主题状态
const currentTheme = ref<ThemeType>('light');
const isInitialized = ref(false);

/**
 * 主题切换 Composable
 */
export function useTheme() {
  const prefersDark = usePreferredDark();
  const storedTheme = useLocalStorage<ThemeType | null>(THEME_STORAGE_KEY, null);

  // 初始化主题
  function initTheme() {
    if (isInitialized.value) return;

    // 优先使用存储的主题，其次根据系统偏好
    if (storedTheme.value && themes.some((t) => t.id === storedTheme.value)) {
      currentTheme.value = storedTheme.value;
    } else if (prefersDark.value) {
      currentTheme.value = 'dark';
    } else {
      currentTheme.value = 'light';
    }

    applyTheme(currentTheme.value);
    isInitialized.value = true;
  }

  // 应用主题到DOM
  function applyTheme(theme: ThemeType) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // 更新meta主题色
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const themeColors: Record<ThemeType, string> = {
      light: '#F8F5F0',
      dark: '#1A1A1A',
      artistic: '#F0EDE8',
    };
    
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColors[theme]);
    }
  }

  // 设置主题
  function setTheme(theme: ThemeType) {
    currentTheme.value = theme;
    storedTheme.value = theme;
    applyTheme(theme);
  }

  // 切换到下一个主题
  function toggleTheme() {
    const currentIndex = themes.findIndex((t) => t.id === currentTheme.value);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].id);
  }

  // 获取当前主题信息
  const currentThemeInfo = computed(() => {
    return themes.find((t) => t.id === currentTheme.value) || themes[0];
  });

  // 判断是否是深色主题
  const isDark = computed(() => currentTheme.value === 'dark');

  // 监听系统主题变化（仅在未手动设置时响应）
  watch(prefersDark, (dark) => {
    if (!storedTheme.value) {
      setTheme(dark ? 'dark' : 'light');
    }
  });

  return {
    // 状态
    theme: currentTheme,
    themes,
    currentThemeInfo,
    isDark,
    
    // 方法
    initTheme,
    setTheme,
    toggleTheme,
  };
}
