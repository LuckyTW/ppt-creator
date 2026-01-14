/**
 * PPT 자동 생성 시스템 타입 정의
 */

// ============================================
// 기본 타입
// ============================================

/** 지원 파일 형식 */
export type FileType = 'txt' | 'md';

/** 작업 상태 */
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

/** 파이프라인 단계 */
export type PipelineStage =
  | 'content_analysis'
  | 'structure_design'
  | 'visual_design'
  | 'ppt_build';

/** 단계 상태 */
export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/** 슬라이드 타입 */
export type SlideType =
  | 'title'
  | 'toc'
  | 'section_header'
  | 'content'
  | 'bullet_points'
  | 'comparison'
  | 'chart'
  | 'table'
  | 'quote'
  | 'conclusion'
  | 'thank_you';

/** 차트 타입 */
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area';

/** 트랜지션 타입 */
export type TransitionType = 'fade' | 'push' | 'wipe' | 'none';

/** 테마 ID */
export type ThemeId =
  | 'modern-blue'
  | 'corporate-dark'
  | 'minimal-light'
  | 'professional-green';

/** 지원 언어 */
export type SupportedLanguage = 'ko' | 'en';

// ============================================
// 파일 관련 타입
// ============================================

/** 업로드된 파일 정보 */
export interface UploadedFile {
  id: string;
  name: string;
  type: FileType;
  size: number;
  extractedContent?: ExtractedContent;
  uploadedAt: Date;
}

/** 추출된 콘텐츠 */
export interface ExtractedContent {
  rawText: string;
  wordCount: number;
  paragraphCount: number;
  headings: ExtractedHeading[];
  lists: ExtractedList[];
  estimatedSlides: number;
}

/** 추출된 헤딩 */
export interface ExtractedHeading {
  level: number;
  text: string;
}

/** 추출된 리스트 */
export interface ExtractedList {
  type: 'bullet' | 'numbered';
  items: string[];
}

// ============================================
// 생성 옵션 관련 타입
// ============================================

/** 생성 옵션 */
export interface GenerationOptions {
  theme: ThemeId;
  slideCount?: number;
  language: SupportedLanguage;
}

// ============================================
// 작업 상태 관련 타입
// ============================================

/** 생성 작업 정보 */
export interface GenerationJob {
  id: string;
  fileId: string;
  status: JobStatus;
  progress: number;
  currentStage: PipelineStage;
  stageProgress: Record<PipelineStage, StageStatus>;
  startedAt: Date;
  completedAt?: Date;
  resultId?: string;
  error?: string;
}

// ============================================
// 슬라이드 구조 관련 타입
// ============================================

/** 콘텐츠 블록 위치 */
export type ContentPosition = 'main' | 'left' | 'right' | 'top' | 'bottom';

/** 콘텐츠 블록 타입 */
export type ContentBlockType =
  | 'heading'
  | 'paragraph'
  | 'bullets'
  | 'numbered'
  | 'table'
  | 'chart'
  | 'quote'
  | 'image';

/** 콘텐츠 블록 */
export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: ContentBlockContent;
  position: ContentPosition;
}

/** 콘텐츠 블록 내용 유니온 타입 */
export type ContentBlockContent =
  | string
  | string[]
  | BulletContent
  | TableContent
  | ChartContent;

/** 불릿 콘텐츠 */
export interface BulletContent {
  items: string[];
  level?: number;
}

/** 테이블 콘텐츠 */
export interface TableContent {
  headers: string[];
  rows: string[][];
}

/** 차트 콘텐츠 */
export interface ChartContent {
  type: ChartType;
  title?: string;
  labels: string[];
  datasets: ChartDataset[];
}

/** 차트 데이터셋 */
export interface ChartDataset {
  name: string;
  values: number[];
}

/** 슬라이드 구조 */
export interface SlideStructure {
  id: string;
  order: number;
  type: SlideType;
  title: string;
  subtitle?: string;
  contentBlocks: ContentBlock[];
  speakerNotes?: string;
  transitionType?: TransitionType;
}

// ============================================
// 테마 관련 타입
// ============================================

/** 테마 색상 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  muted: string;
}

/** 테마 폰트 */
export interface ThemeFonts {
  heading: string;
  body: string;
}

/** 테마 스타일 */
export interface ThemeStyles {
  headingSize: number;
  subheadingSize: number;
  bodySize: number;
  bulletStyle: 'circle' | 'square' | 'arrow' | 'dash';
}

/** 테마 설정 */
export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  styles: ThemeStyles;
}

/** 테마 프리뷰 (UI용) */
export interface ThemePreview {
  id: ThemeId;
  name: string;
  description: string;
  previewColors: {
    primary: string;
    secondary: string;
    background: string;
  };
}

// ============================================
// 비주얼 디자인 관련 타입
// ============================================

/** 위치 (인치 단위) */
export interface Position {
  x: number;
  y: number;
}

/** 크기 (인치 단위) */
export interface Size {
  w: number;
  h: number;
}

/** 요소 스타일 */
export interface ElementStyle {
  fontSize?: number;
  fontFace?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  fill?: { color: string };
  line?: { color: string; width: number };
}

/** 비주얼 요소 타입 */
export type VisualElementType =
  | 'text'
  | 'shape'
  | 'image'
  | 'chart'
  | 'table';

/** 비주얼 요소 */
export interface VisualElement {
  id: string;
  type: VisualElementType;
  position: Position;
  size: Size;
  style: ElementStyle;
  content: unknown;
}

/** 슬라이드 비주얼 명세 */
export interface SlideVisualSpec {
  slideId: string;
  background?: {
    color?: string;
    image?: string;
  };
  elements: VisualElement[];
}

// ============================================
// API 요청/응답 타입
// ============================================

/** 업로드 응답 */
export interface UploadResponse {
  success: boolean;
  data?: {
    fileId: string;
    fileName: string;
    fileType: FileType;
    extractedContent: {
      rawText: string;
      wordCount: number;
      estimatedSlides: number;
    };
    uploadedAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/** 생성 요청 */
export interface GenerateRequest {
  fileId: string;
  options: GenerationOptions;
}

/** 생성 응답 */
export interface GenerateResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: JobStatus;
    estimatedTime: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

/** 상태 이벤트 (SSE) */
export interface StatusEvent {
  type: 'progress' | 'complete' | 'error';
  data: {
    jobId: string;
    status: JobStatus;
    currentStage: PipelineStage;
    progress: number;
    stageProgress: Record<PipelineStage, StageStatus>;
    message?: string;
    resultId?: string;
  };
}
