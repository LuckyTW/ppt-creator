/**
 * 파일 업로드 API
 * POST /api/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractTextFromBuffer,
  validateFile,
  SUPPORTED_EXTENSIONS,
} from '@/lib/skills/text-extraction';
import { saveUploadedFile } from '@/lib/storage/temp-storage';
import type { UploadResponse } from '@/types/ppt';

// 최대 파일 크기 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // FormData 파싱
    const formData = await request.formData();
    const file = formData.get('file');

    // 파일 존재 확인
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_FILE',
            message: '파일이 제공되지 않았습니다.',
          },
        },
        { status: 400 }
      );
    }

    // 파일 크기 확인
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.`,
          },
        },
        { status: 400 }
      );
    }

    // 파일 유효성 검사
    const validation = validateFile(file.name, file.type);
    if (!validation.valid || !validation.fileType) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: validation.error || `지원하지 않는 파일 형식입니다. 지원 형식: ${SUPPORTED_EXTENSIONS.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // 파일 내용 읽기
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 텍스트 추출
    const extractionResult = await extractTextFromBuffer(buffer, file.name);

    if (!extractionResult.success || !extractionResult.content) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EXTRACTION_FAILED',
            message: extractionResult.error || '텍스트 추출에 실패했습니다.',
          },
        },
        { status: 400 }
      );
    }

    // 파일 저장
    const { id, metadata } = await saveUploadedFile(
      extractionResult.content.rawText,
      file.name,
      validation.fileType,
      extractionResult.content
    );

    // 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        fileId: id,
        fileName: metadata.originalName,
        fileType: metadata.fileType,
        extractedContent: {
          rawText: extractionResult.content.rawText.substring(0, 500) +
            (extractionResult.content.rawText.length > 500 ? '...' : ''),
          wordCount: extractionResult.content.wordCount,
          estimatedSlides: extractionResult.content.estimatedSlides,
        },
        uploadedAt: new Date(metadata.createdAt).toISOString(),
      },
    });
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '파일 업로드 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS 요청 처리 (CORS)
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
