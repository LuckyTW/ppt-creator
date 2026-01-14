'use client';

/**
 * PPT 생성 메인 페이지
 */

import { useState } from 'react';
import { usePPTStore, selectCanGenerate } from '@/store/ppt-store';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileUploader } from '@/components/ppt/file-uploader';
import { ThemeSelector } from '@/components/ppt/theme-selector';
import { GenerationOptions } from '@/components/ppt/generation-options';
import { GenerationProgress } from '@/components/ppt/generation-progress';
import { DownloadButton } from '@/components/ppt/download-button';
import { Sparkles, Loader2 } from 'lucide-react';
import type { GenerateResponse } from '@/types/ppt';

export default function GeneratePage() {
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate = usePPTStore(selectCanGenerate);
  const uploadedFile = usePPTStore((state) => state.uploadedFile);
  const generationOptions = usePPTStore((state) => state.generationOptions);
  const currentJob = usePPTStore((state) => state.currentJob);
  const startGeneration = usePPTStore((state) => state.startGeneration);
  const failGeneration = usePPTStore((state) => state.failGeneration);

  const handleGenerate = async () => {
    if (!uploadedFile) return;

    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: uploadedFile.id,
          options: generationOptions,
        }),
      });

      const result: GenerateResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'PPT 생성 요청 실패');
      }

      // 생성 시작 상태 업데이트
      startGeneration(result.data.jobId, uploadedFile.id);
    } catch (error) {
      console.error('Generate error:', error);
      failGeneration(
        error instanceof Error ? error.message : 'PPT 생성 요청 중 오류가 발생했습니다'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const isCompleted = currentJob?.status === 'completed';
  const showProgress = currentJob !== null;

  return (
    <Section className="py-12">
      <Container size="md">
        <div className="space-y-8">
          {/* 헤더 */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              텍스트를 PPT로 변환
            </h1>
            <p className="text-lg text-muted-foreground">
              텍스트 파일을 업로드하면 AI가 전문적인 프레젠테이션을 자동으로 생성합니다
            </p>
          </div>

          <Separator />

          {/* Step 1: 파일 업로드 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </span>
              <h2 className="text-xl font-semibold">파일 업로드</h2>
            </div>
            <FileUploader />
          </div>

          {/* Step 2: 테마 선택 (파일 업로드 후) */}
          {uploadedFile && !showProgress && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    2
                  </span>
                  <h2 className="text-xl font-semibold">테마 선택</h2>
                </div>
                <ThemeSelector />
              </div>
            </>
          )}

          {/* Step 3: 생성 옵션 (파일 업로드 후) */}
          {uploadedFile && !showProgress && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    3
                  </span>
                  <h2 className="text-xl font-semibold">옵션 설정</h2>
                </div>
                <GenerationOptions />
              </div>
            </>
          )}

          {/* 생성 버튼 */}
          {uploadedFile && !showProgress && (
            <>
              <Separator />
              <div className="flex justify-center py-4">
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={!canGenerate || isGenerating}
                  className="gap-2 px-8"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      요청 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      PPT 생성하기
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* 진행 상태 */}
          {showProgress && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    4
                  </span>
                  <h2 className="text-xl font-semibold">
                    {isCompleted ? '완료' : '생성 중'}
                  </h2>
                </div>
                <GenerationProgress />
              </div>
            </>
          )}

          {/* 다운로드 */}
          {isCompleted && (
            <>
              <Separator />
              <DownloadButton />
            </>
          )}

          {/* 새로 시작하기 */}
          {isCompleted && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => usePPTStore.getState().reset()}
              >
                새 파일로 다시 시작
              </Button>
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}
