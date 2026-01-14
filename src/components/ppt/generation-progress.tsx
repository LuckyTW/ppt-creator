'use client';

/**
 * 생성 진행 상태 컴포넌트
 * 4단계 파이프라인의 진행 상황을 시각적으로 표시
 */

import { useEffect, useRef } from 'react';
import { usePPTStore } from '@/store/ppt-store';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  FileSearch,
  LayoutTemplate,
  Palette,
  FileOutput,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { PipelineStage, StageStatus } from '@/types/ppt';

interface StageInfo {
  id: PipelineStage;
  label: string;
  description: string;
  icon: React.ElementType;
}

const STAGES: StageInfo[] = [
  {
    id: 'content_analysis',
    label: '콘텐츠 분석',
    description: 'AI가 문서를 분석하고 핵심 내용을 추출합니다',
    icon: FileSearch,
  },
  {
    id: 'structure_design',
    label: '구조 설계',
    description: '슬라이드 구조와 스토리라인을 설계합니다',
    icon: LayoutTemplate,
  },
  {
    id: 'visual_design',
    label: '디자인 적용',
    description: '선택한 테마에 맞게 비주얼을 적용합니다',
    icon: Palette,
  },
  {
    id: 'ppt_build',
    label: 'PPT 생성',
    description: '최종 PPTX 파일을 생성합니다',
    icon: FileOutput,
  },
];

export function GenerationProgress() {
  const { currentJob, updateJobProgress, completeGeneration, failGeneration } =
    usePPTStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  // SSE 연결로 진행 상태 수신
  useEffect(() => {
    if (!currentJob || currentJob.status !== 'processing') {
      return;
    }

    // 기존 연결 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/status/${currentJob.id}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          updateJobProgress({
            currentStage: data.data.currentStage,
            progress: data.data.progress,
            stageProgress: data.data.stageProgress,
          });
        } else if (data.type === 'complete') {
          completeGeneration(data.data.resultId);
          eventSource.close();
        } else if (data.type === 'error') {
          failGeneration(data.data.error || 'PPT 생성 중 오류가 발생했습니다');
          eventSource.close();
        }
      } catch (error) {
        console.error('SSE parse error:', error);
      }
    };

    eventSource.onerror = () => {
      // 연결 오류 시 재시도 또는 에러 처리
      console.error('SSE connection error');
    };

    return () => {
      eventSource.close();
    };
  }, [currentJob?.id, currentJob?.status, updateJobProgress, completeGeneration, failGeneration]);

  if (!currentJob) {
    return null;
  }

  const { status, progress, stageProgress, error } = currentJob;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {status === 'completed'
                ? 'PPT 생성 완료!'
                : status === 'failed'
                  ? 'PPT 생성 실패'
                  : 'PPT 생성 중...'}
            </h3>
            {status === 'processing' && (
              <p className="text-sm text-muted-foreground">
                잠시만 기다려주세요. AI가 프레젠테이션을 만들고 있습니다.
              </p>
            )}
          </div>

          {/* 전체 진행률 */}
          {status === 'processing' && (
            <span className="text-2xl font-bold text-primary">{progress}%</span>
          )}
        </div>

        {/* 진행률 바 */}
        <Progress value={progress} className="h-2" />

        {/* 단계별 상태 */}
        <div className="space-y-4">
          {STAGES.map((stage, index) => (
            <StageItem
              key={stage.id}
              stage={stage}
              status={stageProgress[stage.id]}
              isLast={index === STAGES.length - 1}
            />
          ))}
        </div>

        {/* 에러 메시지 */}
        {status === 'failed' && error && (
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">오류 발생</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

interface StageItemProps {
  stage: StageInfo;
  status: StageStatus;
  isLast: boolean;
}

function StageItem({ stage, status, isLast }: StageItemProps) {
  const Icon = stage.icon;

  return (
    <div className="flex gap-4">
      {/* 아이콘 및 연결선 */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
            status === 'completed' && 'border-primary bg-primary text-primary-foreground',
            status === 'in_progress' && 'border-primary text-primary',
            status === 'pending' && 'border-muted text-muted-foreground',
            status === 'failed' && 'border-destructive text-destructive'
          )}
        >
          {status === 'completed' ? (
            <Check className="h-5 w-5" />
          ) : status === 'in_progress' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : status === 'failed' ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>

        {/* 연결선 */}
        {!isLast && (
          <div
            className={cn(
              'w-0.5 flex-1 min-h-[24px]',
              status === 'completed' ? 'bg-primary' : 'bg-muted'
            )}
          />
        )}
      </div>

      {/* 텍스트 */}
      <div className="flex-1 pb-4">
        <p
          className={cn(
            'font-medium',
            status === 'pending' && 'text-muted-foreground'
          )}
        >
          {stage.label}
        </p>
        <p className="text-sm text-muted-foreground">{stage.description}</p>
      </div>
    </div>
  );
}
