/**
 * PPT 생성 API
 * POST /api/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUploadedFile } from '@/lib/storage/temp-storage';
import { startPipeline } from '@/lib/pipeline/orchestrator';
import type { GenerateResponse, GenerationOptions } from '@/types/ppt';
import { z } from 'zod';

// 요청 스키마 정의
const generateRequestSchema = z.object({
  fileId: z.string().min(1, '파일 ID가 필요합니다'),
  options: z.object({
    theme: z.enum(['modern-blue', 'corporate-dark', 'minimal-light', 'professional-green']),
    slideCount: z.number().optional(),
    language: z.enum(['ko', 'en']).default('ko'),
  }),
});

export async function POST(request: NextRequest): Promise<NextResponse<GenerateResponse>> {
  try {
    // 요청 파싱
    const body = await request.json();

    // 스키마 검증
    const parseResult = generateRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: parseResult.error.issues[0]?.message || '잘못된 요청입니다',
          },
        },
        { status: 400 }
      );
    }

    const { fileId, options } = parseResult.data;

    // 파일 존재 확인
    const fileData = await getUploadedFile(fileId);
    if (!fileData) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: '업로드된 파일을 찾을 수 없습니다. 파일이 만료되었을 수 있습니다.',
          },
        },
        { status: 404 }
      );
    }

    // 파이프라인 시작
    const { jobId, promise } = startPipeline({
      fileId,
      fileName: fileData.metadata.originalName,
      extractedContent: fileData.metadata.extractedContent,
      options: options as GenerationOptions,
    });

    // 파이프라인은 백그라운드에서 실행 (await 하지 않음)
    promise.catch((error) => {
      console.error(`Pipeline error for job ${jobId}:`, error);
    });

    // 즉시 응답 반환
    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: 'processing',
        estimatedTime: 30, // 예상 소요 시간 (초)
      },
    });
  } catch (error) {
    console.error('Generate API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'PPT 생성 요청 처리 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
