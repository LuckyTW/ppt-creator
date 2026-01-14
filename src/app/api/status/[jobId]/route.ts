/**
 * 생성 상태 조회 API (Server-Sent Events)
 * GET /api/status/[jobId]
 */

import { NextRequest } from 'next/server';
import { getJob } from '@/lib/pipeline/orchestrator';

export const dynamic = 'force-dynamic';

/**
 * SSE 스트림으로 작업 상태 전송
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
  const { jobId } = await params;

  if (!jobId) {
    return new Response(
      JSON.stringify({ error: 'jobId가 필요합니다' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // SSE 스트림 생성
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // 초기 상태 확인
      const initialJob = getJob(jobId);

      if (!initialJob) {
        sendEvent({
          type: 'error',
          data: {
            jobId,
            error: '작업을 찾을 수 없습니다',
          },
        });
        controller.close();
        return;
      }

      // 초기 상태 전송
      sendEvent({
        type: 'progress',
        data: {
          jobId: initialJob.id,
          status: initialJob.status,
          currentStage: initialJob.currentStage,
          progress: initialJob.progress,
          stageProgress: initialJob.stageProgress,
        },
      });

      // 이미 완료/실패 상태면 종료
      if (initialJob.status === 'completed') {
        sendEvent({
          type: 'complete',
          data: {
            jobId: initialJob.id,
            status: 'completed',
            currentStage: initialJob.currentStage,
            progress: 100,
            stageProgress: initialJob.stageProgress,
            resultId: initialJob.resultId,
          },
        });
        controller.close();
        return;
      }

      if (initialJob.status === 'failed') {
        sendEvent({
          type: 'error',
          data: {
            jobId: initialJob.id,
            status: 'failed',
            error: initialJob.error,
          },
        });
        controller.close();
        return;
      }

      // 주기적으로 상태 확인 (폴링)
      let lastProgress = initialJob.progress;
      let checkCount = 0;
      const maxChecks = 120; // 최대 2분 (1초 간격)

      const interval = setInterval(() => {
        checkCount++;

        const job = getJob(jobId);

        if (!job) {
          sendEvent({
            type: 'error',
            data: {
              jobId,
              error: '작업이 사라졌습니다',
            },
          });
          clearInterval(interval);
          controller.close();
          return;
        }

        // 진행 상태가 변경되었을 때만 전송
        if (job.progress !== lastProgress || job.status !== 'processing') {
          lastProgress = job.progress;

          if (job.status === 'completed') {
            sendEvent({
              type: 'complete',
              data: {
                jobId: job.id,
                status: 'completed',
                currentStage: job.currentStage,
                progress: 100,
                stageProgress: job.stageProgress,
                resultId: job.resultId,
              },
            });
            clearInterval(interval);
            controller.close();
            return;
          }

          if (job.status === 'failed') {
            sendEvent({
              type: 'error',
              data: {
                jobId: job.id,
                status: 'failed',
                currentStage: job.currentStage,
                progress: job.progress,
                stageProgress: job.stageProgress,
                error: job.error,
              },
            });
            clearInterval(interval);
            controller.close();
            return;
          }

          // 진행 중
          sendEvent({
            type: 'progress',
            data: {
              jobId: job.id,
              status: job.status,
              currentStage: job.currentStage,
              progress: job.progress,
              stageProgress: job.stageProgress,
            },
          });
        }

        // 타임아웃
        if (checkCount >= maxChecks) {
          sendEvent({
            type: 'error',
            data: {
              jobId,
              error: '작업 시간이 초과되었습니다',
            },
          });
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      // 클라이언트 연결 종료 시 정리
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
