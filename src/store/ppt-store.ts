/**
 * PPT 생성 상태 관리 (Zustand)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  UploadedFile,
  GenerationJob,
  GenerationOptions,
  ThemeId,
  ThemePreview,
  PipelineStage,
  JobStatus,
} from '@/types/ppt';
import { THEME_PREVIEWS, DEFAULT_THEME_ID } from '@/config/ppt-themes';

// ============================================
// 상태 타입 정의
// ============================================

interface PPTState {
  // 파일 업로드 상태
  uploadedFile: UploadedFile | null;
  isUploading: boolean;
  uploadError: string | null;

  // 생성 옵션
  selectedTheme: ThemeId;
  generationOptions: GenerationOptions;
  availableThemes: ThemePreview[];

  // 생성 작업 상태
  currentJob: GenerationJob | null;

  // 결과
  generatedFileId: string | null;
}

interface PPTActions {
  // 파일 업로드 액션
  setUploadedFile: (file: UploadedFile) => void;
  setUploading: (status: boolean) => void;
  setUploadError: (error: string | null) => void;
  clearUploadedFile: () => void;

  // 생성 옵션 액션
  setSelectedTheme: (themeId: ThemeId) => void;
  setGenerationOptions: (options: Partial<GenerationOptions>) => void;

  // 생성 작업 액션
  startGeneration: (jobId: string, fileId: string) => void;
  updateJobProgress: (updates: Partial<GenerationJob>) => void;
  updateStageStatus: (stage: PipelineStage, status: JobStatus) => void;
  completeGeneration: (resultId: string) => void;
  failGeneration: (error: string) => void;
  resetJob: () => void;

  // 전체 초기화
  reset: () => void;
}

type PPTStore = PPTState & PPTActions;

// ============================================
// 초기 상태
// ============================================

const initialState: PPTState = {
  uploadedFile: null,
  isUploading: false,
  uploadError: null,
  selectedTheme: DEFAULT_THEME_ID,
  generationOptions: {
    theme: DEFAULT_THEME_ID,
    language: 'ko',
  },
  availableThemes: THEME_PREVIEWS,
  currentJob: null,
  generatedFileId: null,
};

// ============================================
// 스토어 생성
// ============================================

export const usePPTStore = create<PPTStore>()(
  devtools(
    (set) => ({
      ...initialState,

      // ----------------------------------------
      // 파일 업로드 액션
      // ----------------------------------------

      setUploadedFile: (file) =>
        set(
          {
            uploadedFile: file,
            uploadError: null,
            isUploading: false,
          },
          false,
          'setUploadedFile'
        ),

      setUploading: (status) =>
        set({ isUploading: status }, false, 'setUploading'),

      setUploadError: (error) =>
        set(
          {
            uploadError: error,
            isUploading: false,
          },
          false,
          'setUploadError'
        ),

      clearUploadedFile: () =>
        set(
          {
            uploadedFile: null,
            uploadError: null,
            generatedFileId: null,
            currentJob: null,
          },
          false,
          'clearUploadedFile'
        ),

      // ----------------------------------------
      // 생성 옵션 액션
      // ----------------------------------------

      setSelectedTheme: (themeId) =>
        set(
          (state) => ({
            selectedTheme: themeId,
            generationOptions: {
              ...state.generationOptions,
              theme: themeId,
            },
          }),
          false,
          'setSelectedTheme'
        ),

      setGenerationOptions: (options) =>
        set(
          (state) => ({
            generationOptions: {
              ...state.generationOptions,
              ...options,
            },
          }),
          false,
          'setGenerationOptions'
        ),

      // ----------------------------------------
      // 생성 작업 액션
      // ----------------------------------------

      startGeneration: (jobId, fileId) =>
        set(
          {
            currentJob: {
              id: jobId,
              fileId,
              status: 'processing',
              progress: 0,
              currentStage: 'content_analysis',
              stageProgress: {
                content_analysis: 'in_progress',
                structure_design: 'pending',
                visual_design: 'pending',
                ppt_build: 'pending',
              },
              startedAt: new Date(),
            },
            generatedFileId: null,
          },
          false,
          'startGeneration'
        ),

      updateJobProgress: (updates) =>
        set(
          (state) => ({
            currentJob: state.currentJob
              ? { ...state.currentJob, ...updates }
              : null,
          }),
          false,
          'updateJobProgress'
        ),

      updateStageStatus: (stage, status) =>
        set(
          (state) => {
            if (!state.currentJob) return state;

            const newStageProgress = {
              ...state.currentJob.stageProgress,
              [stage]: status,
            };

            // 다음 단계 계산
            const stages: PipelineStage[] = [
              'content_analysis',
              'structure_design',
              'visual_design',
              'ppt_build',
            ];
            const currentIndex = stages.indexOf(stage);
            const nextStage =
              currentIndex < stages.length - 1
                ? stages[currentIndex + 1]
                : stage;

            // 진행률 계산 (각 단계 25%)
            const completedStages = Object.values(newStageProgress).filter(
              (s) => s === 'completed'
            ).length;
            const progress = completedStages * 25;

            return {
              currentJob: {
                ...state.currentJob,
                stageProgress: newStageProgress,
                currentStage: status === 'completed' ? nextStage : stage,
                progress,
              },
            };
          },
          false,
          'updateStageStatus'
        ),

      completeGeneration: (resultId) =>
        set(
          (state) => ({
            currentJob: state.currentJob
              ? {
                  ...state.currentJob,
                  status: 'completed',
                  progress: 100,
                  completedAt: new Date(),
                  resultId,
                  stageProgress: {
                    content_analysis: 'completed',
                    structure_design: 'completed',
                    visual_design: 'completed',
                    ppt_build: 'completed',
                  },
                }
              : null,
            generatedFileId: resultId,
          }),
          false,
          'completeGeneration'
        ),

      failGeneration: (error) =>
        set(
          (state) => ({
            currentJob: state.currentJob
              ? {
                  ...state.currentJob,
                  status: 'failed',
                  error,
                }
              : null,
          }),
          false,
          'failGeneration'
        ),

      resetJob: () =>
        set(
          {
            currentJob: null,
          },
          false,
          'resetJob'
        ),

      // ----------------------------------------
      // 전체 초기화
      // ----------------------------------------

      reset: () => set(initialState, false, 'reset'),
    }),
    { name: 'ppt-store' }
  )
);

// ============================================
// 셀렉터 (성능 최적화용)
// ============================================

/** 업로드 상태만 선택 */
export const selectUploadState = (state: PPTStore) => ({
  uploadedFile: state.uploadedFile,
  isUploading: state.isUploading,
  uploadError: state.uploadError,
});

/** 생성 옵션만 선택 */
export const selectGenerationOptions = (state: PPTStore) => ({
  selectedTheme: state.selectedTheme,
  generationOptions: state.generationOptions,
  availableThemes: state.availableThemes,
});

/** 작업 상태만 선택 */
export const selectJobState = (state: PPTStore) => ({
  currentJob: state.currentJob,
  generatedFileId: state.generatedFileId,
});

/** 생성 가능 여부 */
export const selectCanGenerate = (state: PPTStore) =>
  state.uploadedFile !== null &&
  !state.isUploading &&
  state.currentJob?.status !== 'processing';

/** 다운로드 가능 여부 */
export const selectCanDownload = (state: PPTStore) =>
  state.generatedFileId !== null &&
  state.currentJob?.status === 'completed';
