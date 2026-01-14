/**
 * PPT 테마 설정
 */

import type { ThemeConfig, ThemePreview, ThemeId } from '@/types/ppt';

/** 사용 가능한 테마 목록 */
export const PPT_THEMES: ThemeConfig[] = [
  {
    id: 'modern-blue',
    name: '모던 블루',
    description: '깔끔하고 전문적인 파란색 테마',
    colors: {
      primary: '#2563EB',
      secondary: '#3B82F6',
      background: '#FFFFFF',
      text: '#1F2937',
      accent: '#0EA5E9',
      muted: '#6B7280',
    },
    fonts: {
      heading: 'Arial',
      body: 'Arial',
    },
    styles: {
      headingSize: 36,
      subheadingSize: 24,
      bodySize: 18,
      bulletStyle: 'circle',
    },
  },
  {
    id: 'corporate-dark',
    name: '코퍼레이트 다크',
    description: '고급스러운 다크 테마',
    colors: {
      primary: '#F59E0B',
      secondary: '#FBBF24',
      background: '#1F2937',
      text: '#F9FAFB',
      accent: '#F97316',
      muted: '#9CA3AF',
    },
    fonts: {
      heading: 'Arial',
      body: 'Arial',
    },
    styles: {
      headingSize: 36,
      subheadingSize: 24,
      bodySize: 18,
      bulletStyle: 'square',
    },
  },
  {
    id: 'minimal-light',
    name: '미니멀 라이트',
    description: '심플하고 깨끗한 라이트 테마',
    colors: {
      primary: '#374151',
      secondary: '#6B7280',
      background: '#FAFAFA',
      text: '#111827',
      accent: '#4B5563',
      muted: '#9CA3AF',
    },
    fonts: {
      heading: 'Arial',
      body: 'Arial',
    },
    styles: {
      headingSize: 36,
      subheadingSize: 24,
      bodySize: 18,
      bulletStyle: 'dash',
    },
  },
  {
    id: 'professional-green',
    name: '프로페셔널 그린',
    description: '신뢰감을 주는 그린 테마',
    colors: {
      primary: '#059669',
      secondary: '#10B981',
      background: '#FFFFFF',
      text: '#1F2937',
      accent: '#14B8A6',
      muted: '#6B7280',
    },
    fonts: {
      heading: 'Arial',
      body: 'Arial',
    },
    styles: {
      headingSize: 36,
      subheadingSize: 24,
      bodySize: 18,
      bulletStyle: 'arrow',
    },
  },
];

/** 테마 프리뷰 목록 (UI 표시용) */
export const THEME_PREVIEWS: ThemePreview[] = PPT_THEMES.map((theme) => ({
  id: theme.id,
  name: theme.name,
  description: theme.description,
  previewColors: {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    background: theme.colors.background,
  },
}));

/**
 * 테마 ID로 테마 설정 조회
 */
export function getThemeById(themeId: ThemeId): ThemeConfig {
  const theme = PPT_THEMES.find((t) => t.id === themeId);
  if (!theme) {
    // 기본 테마 반환
    return PPT_THEMES[0];
  }
  return theme;
}

/**
 * 기본 테마 ID
 */
export const DEFAULT_THEME_ID: ThemeId = 'modern-blue';
