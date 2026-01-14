/**
 * 파이프라인 오케스트레이터
 * 서브에이전트들을 순차적으로 실행하여 PPT 생성
 */

import { nanoid } from 'nanoid';
import type {
  ExtractedContent,
  GenerationOptions,
  PipelineStage,
  StageStatus,
  ThemeConfig,
} from '@/types/ppt';
import { analyzeContent } from '@/lib/agents/content-analyst';
import { designStructure } from '@/lib/agents/structure-designer';
import { designVisuals } from '@/lib/agents/visual-designer';
import { buildPPT } from '@/lib/agents/ppt-builder';
import { getThemeById } from '@/config/ppt-themes';
import { savePPTFile } from '@/lib/storage/temp-storage';

// ============================================
// 타입 정의
// ============================================

/**
 * 파이프라인 작업 상태
 */
export interface PipelineJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  currentStage: PipelineStage;
  stageProgress: Record<PipelineStage, StageStatus>;
  progress: number;
  error?: string;
  resultId?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * 진행 상태 콜백 타입
 */
export type ProgressCallback = (job: PipelineJob) => void;

/**
 * 파이프라인 입력
 */
export interface PipelineInput {
  fileId: string;
  fileName: string;
  extractedContent: ExtractedContent;
  options: GenerationOptions;
}

/**
 * 파이프라인 결과
 */
export interface PipelineResult {
  success: boolean;
  job: PipelineJob;
  resultId?: string;
  error?: string;
}

// ============================================
// 작업 상태 저장소 (메모리)
// ============================================

const jobStore = new Map<string, PipelineJob>();

/**
 * 작업 상태 조회
 */
export function getJob(jobId: string): PipelineJob | null {
  return jobStore.get(jobId) || null;
}

/**
 * 작업 상태 업데이트
 */
function updateJob(jobId: string, updates: Partial<PipelineJob>): PipelineJob {
  const job = jobStore.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const updatedJob = { ...job, ...updates };
  jobStore.set(jobId, updatedJob);
  return updatedJob;
}

/**
 * 단계 완료 처리
 */
function completeStage(
  jobId: string,
  stage: PipelineStage,
  onProgress?: ProgressCallback
): void {
  const stages: PipelineStage[] = [
    'content_analysis',
    'structure_design',
    'visual_design',
    'ppt_build',
  ];

  const currentIndex = stages.indexOf(stage);
  const nextStage = currentIndex < stages.length - 1 ? stages[currentIndex + 1] : stage;

  const job = jobStore.get(jobId);
  if (!job) return;

  const newStageProgress = { ...job.stageProgress, [stage]: 'completed' as StageStatus };
  if (nextStage !== stage) {
    newStageProgress[nextStage] = 'in_progress';
  }

  const completedCount = Object.values(newStageProgress).filter(
    (s) => s === 'completed'
  ).length;
  const progress = Math.round((completedCount / stages.length) * 100);

  const updatedJob = updateJob(jobId, {
    stageProgress: newStageProgress,
    currentStage: nextStage,
    progress,
  });

  onProgress?.(updatedJob);
}

// ============================================
// 파이프라인 실행
// ============================================

/**
 * PPT 생성 파이프라인 실행
 */
export async function runPipeline(
  input: PipelineInput,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const jobId = nanoid(12);

  // 초기 작업 상태 생성
  const initialJob: PipelineJob = {
    id: jobId,
    status: 'processing',
    currentStage: 'content_analysis',
    stageProgress: {
      content_analysis: 'in_progress',
      structure_design: 'pending',
      visual_design: 'pending',
      ppt_build: 'pending',
    },
    progress: 0,
    startedAt: new Date(),
  };

  jobStore.set(jobId, initialJob);
  onProgress?.(initialJob);

  try {
    // 테마 가져오기
    const theme: ThemeConfig = getThemeById(input.options.theme);

    // ----------------------------------------
    // Stage 1: Content Analysis
    // ----------------------------------------
    console.log(`[${jobId}] Stage 1: Content Analysis`);

    const analysisResult = await analyzeContent({
      extractedContent: input.extractedContent,
      fileName: input.fileName,
      language: input.options.language,
    });

    if (!analysisResult.success || !analysisResult.data) {
      throw new Error(analysisResult.error?.message || '콘텐츠 분석 실패');
    }

    completeStage(jobId, 'content_analysis', onProgress);

    // ----------------------------------------
    // Stage 2: Structure Design
    // ----------------------------------------
    console.log(`[${jobId}] Stage 2: Structure Design`);

    const structureResult = await designStructure({
      analysisResult: analysisResult.data,
      options: {
        targetSlideCount: input.options.slideCount,
        includeTableOfContents: true,
        includeConclusion: true,
        language: input.options.language,
      },
    });

    if (!structureResult.success || !structureResult.data) {
      throw new Error(structureResult.error?.message || '구조 설계 실패');
    }

    completeStage(jobId, 'structure_design', onProgress);

    // ----------------------------------------
    // Stage 3: Visual Design
    // ----------------------------------------
    console.log(`[${jobId}] Stage 3: Visual Design`);

    const visualResult = await designVisuals({
      structure: structureResult.data,
      theme,
    });

    if (!visualResult.success || !visualResult.data) {
      throw new Error(visualResult.error?.message || '비주얼 디자인 실패');
    }

    completeStage(jobId, 'visual_design', onProgress);

    // ----------------------------------------
    // Stage 4: PPT Build
    // ----------------------------------------
    console.log(`[${jobId}] Stage 4: PPT Build`);

    const pptResult = await buildPPT({
      visualSpec: visualResult.data,
      outputOptions: {
        fileName: `${input.fileName.replace(/\.[^/.]+$/, '')}_presentation.pptx`,
      },
    });

    if (!pptResult.success || !pptResult.data) {
      throw new Error(pptResult.error?.message || 'PPT 생성 실패');
    }

    // 파일 저장
    const { id: resultId } = await savePPTFile(
      pptResult.data.file.buffer,
      input.fileName
    );

    completeStage(jobId, 'ppt_build', onProgress);

    // 최종 완료
    const finalJob = updateJob(jobId, {
      status: 'completed',
      progress: 100,
      resultId,
      completedAt: new Date(),
    });

    onProgress?.(finalJob);

    return {
      success: true,
      job: finalJob,
      resultId,
    };
  } catch (error) {
    console.error(`[${jobId}] Pipeline error:`, error);

    const errorMessage = error instanceof Error ? error.message : 'PPT 생성 중 오류 발생';

    const failedJob = updateJob(jobId, {
      status: 'failed',
      error: errorMessage,
    });

    onProgress?.(failedJob);

    return {
      success: false,
      job: failedJob,
      error: errorMessage,
    };
  }
}

/**
 * 파이프라인 시작 (비동기 - jobId 즉시 반환)
 */
export function startPipeline(
  input: PipelineInput,
  onProgress?: ProgressCallback
): { jobId: string; promise: Promise<PipelineResult> } {
  const jobId = nanoid(12);

  // 초기 작업 상태 생성
  const initialJob: PipelineJob = {
    id: jobId,
    status: 'queued',
    currentStage: 'content_analysis',
    stageProgress: {
      content_analysis: 'pending',
      structure_design: 'pending',
      visual_design: 'pending',
      ppt_build: 'pending',
    },
    progress: 0,
    startedAt: new Date(),
  };

  jobStore.set(jobId, initialJob);

  // 비동기 실행
  const promise = (async () => {
    // 상태를 processing으로 변경
    updateJob(jobId, {
      status: 'processing',
      stageProgress: {
        ...initialJob.stageProgress,
        content_analysis: 'in_progress',
      },
    });

    // 실제 파이프라인 실행 (이미 저장된 jobId 사용)
    return runPipelineWithJobId(jobId, input, onProgress);
  })();

  return { jobId, promise };
}

/**
 * 기존 jobId로 파이프라인 실행
 */
async function runPipelineWithJobId(
  jobId: string,
  input: PipelineInput,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const job = jobStore.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  onProgress?.(job);

  try {
    const theme: ThemeConfig = getThemeById(input.options.theme);

    // Stage 1: Content Analysis
    const analysisResult = await analyzeContent({
      extractedContent: input.extractedContent,
      fileName: input.fileName,
      language: input.options.language,
    });

    if (!analysisResult.success || !analysisResult.data) {
      throw new Error(analysisResult.error?.message || '콘텐츠 분석 실패');
    }

    completeStage(jobId, 'content_analysis', onProgress);

    // Stage 2: Structure Design
    const structureResult = await designStructure({
      analysisResult: analysisResult.data,
      options: {
        targetSlideCount: input.options.slideCount,
        includeTableOfContents: true,
        includeConclusion: true,
        language: input.options.language,
      },
    });

    if (!structureResult.success || !structureResult.data) {
      throw new Error(structureResult.error?.message || '구조 설계 실패');
    }

    completeStage(jobId, 'structure_design', onProgress);

    // Stage 3: Visual Design
    const visualResult = await designVisuals({
      structure: structureResult.data,
      theme,
    });

    if (!visualResult.success || !visualResult.data) {
      throw new Error(visualResult.error?.message || '비주얼 디자인 실패');
    }

    completeStage(jobId, 'visual_design', onProgress);

    // Stage 4: PPT Build
    const pptResult = await buildPPT({
      visualSpec: visualResult.data,
      outputOptions: {
        fileName: `${input.fileName.replace(/\.[^/.]+$/, '')}_presentation.pptx`,
      },
    });

    if (!pptResult.success || !pptResult.data) {
      throw new Error(pptResult.error?.message || 'PPT 생성 실패');
    }

    const { id: resultId } = await savePPTFile(
      pptResult.data.file.buffer,
      input.fileName
    );

    completeStage(jobId, 'ppt_build', onProgress);

    const finalJob = updateJob(jobId, {
      status: 'completed',
      progress: 100,
      resultId,
      completedAt: new Date(),
    });

    onProgress?.(finalJob);

    return {
      success: true,
      job: finalJob,
      resultId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'PPT 생성 중 오류 발생';

    const failedJob = updateJob(jobId, {
      status: 'failed',
      error: errorMessage,
    });

    onProgress?.(failedJob);

    return {
      success: false,
      job: failedJob,
      error: errorMessage,
    };
  }
}
