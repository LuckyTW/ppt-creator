/**
 * 서브에이전트 공통 타입 정의
 */

import type {
  ExtractedContent,
  SlideStructure,
  SlideVisualSpec,
  ThemeConfig,
  SupportedLanguage,
} from '@/types/ppt';

// ============================================
// 에이전트 기본 인터페이스
// ============================================

/**
 * 에이전트 실행 결과
 */
export interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: AgentError;
  metadata: {
    executionTime: number;
    timestamp: string;
    agentName: string;
  };
}

/**
 * 에이전트 오류
 */
export interface AgentError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * 에이전트 인터페이스
 */
export interface Agent<TInput, TOutput> {
  name: string;
  execute(input: TInput): Promise<AgentResult<TOutput>>;
}

// ============================================
// Content Analyst 타입
// ============================================

/**
 * Content Analyst 입력
 */
export interface ContentAnalystInput {
  extractedContent: ExtractedContent;
  fileName: string;
  language: SupportedLanguage;
}

/**
 * 분석된 섹션
 */
export interface AnalyzedSection {
  id: string;
  title: string;
  content: string;
  bulletPoints: string[];
  importance: 'high' | 'medium' | 'low';
  suggestedSlideType: string;
}

/**
 * 감지된 데이터 요소
 */
export interface DetectedDataElement {
  type: 'table' | 'list' | 'quote' | 'statistic' | 'comparison';
  content: unknown;
  sectionId: string;
}

/**
 * Content Analyst 출력
 */
export interface ContentAnalystOutput {
  /** 문서 메타데이터 */
  metadata: {
    title: string;
    subtitle?: string;
    author?: string;
    language: SupportedLanguage;
    mainTopic: string;
  };

  /** 분석된 섹션들 */
  sections: AnalyzedSection[];

  /** 핵심 키워드 */
  keywords: string[];

  /** 전체 요약 */
  summary: string;

  /** 감지된 데이터 요소 */
  dataElements: DetectedDataElement[];

  /** 권장 슬라이드 수 */
  recommendedSlideCount: number;
}

// ============================================
// Structure Designer 타입
// ============================================

/**
 * Structure Designer 입력
 */
export interface StructureDesignerInput {
  analysisResult: ContentAnalystOutput;
  options: {
    targetSlideCount?: number;
    includeTableOfContents: boolean;
    includeConclusion: boolean;
    language: SupportedLanguage;
  };
}

/**
 * 슬라이드 흐름 힌트
 */
export interface FlowHint {
  fromSlideId: string;
  toSlideId: string;
  connectionType: 'continuation' | 'contrast' | 'example' | 'conclusion';
}

/**
 * Structure Designer 출력
 */
export interface StructureDesignerOutput {
  /** 프레젠테이션 메타 */
  presentation: {
    title: string;
    subtitle?: string;
    totalSlides: number;
  };

  /** 슬라이드 구조 목록 */
  slides: SlideStructure[];

  /** 흐름 분석 */
  flow: {
    narrative: string;
    transitions: FlowHint[];
  };
}

// ============================================
// Visual Designer 타입
// ============================================

/**
 * Visual Designer 입력
 */
export interface VisualDesignerInput {
  structure: StructureDesignerOutput;
  theme: ThemeConfig;
}

/**
 * Visual Designer 출력
 */
export interface VisualDesignerOutput {
  /** 슬라이드별 비주얼 명세 */
  slides: SlideVisualSpec[];

  /** 적용된 테마 */
  appliedTheme: ThemeConfig;
}

// ============================================
// PPT Builder 타입
// ============================================

/**
 * PPT Builder 입력
 */
export interface PPTBuilderInput {
  visualSpec: VisualDesignerOutput;
  outputOptions: {
    fileName: string;
  };
}

/**
 * PPT Builder 출력
 */
export interface PPTBuilderOutput {
  /** 생성된 파일 정보 */
  file: {
    buffer: Buffer;
    fileName: string;
    size: number;
    mimeType: string;
  };

  /** 생성 통계 */
  stats: {
    totalSlides: number;
    generationTime: number;
  };
}
