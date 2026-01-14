/**
 * 텍스트 추출 스킬 - 통합 인터페이스
 */

import type { ExtractedContent, FileType } from '@/types/ppt';
import { extractFromTxt } from './txt-extractor';
import { extractFromMd } from './md-extractor';

/**
 * 텍스트 추출 결과
 */
export interface TextExtractionResult {
  success: boolean;
  content?: ExtractedContent;
  error?: string;
}

/**
 * 파일 확장자로 FileType 추론
 */
export function inferFileType(fileName: string): FileType | null {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
      return 'txt';
    case 'md':
    case 'markdown':
      return 'md';
    default:
      return null;
  }
}

/**
 * 지원되는 MIME 타입 목록
 */
export const SUPPORTED_MIME_TYPES: Record<FileType, string[]> = {
  txt: ['text/plain'],
  md: ['text/markdown', 'text/x-markdown', 'text/plain'],
};

/**
 * 지원되는 파일 확장자 목록
 */
export const SUPPORTED_EXTENSIONS: string[] = ['.txt', '.md', '.markdown'];

/**
 * 파일 유효성 검사
 */
export function validateFile(
  fileName: string,
  mimeType?: string
): { valid: boolean; fileType?: FileType; error?: string } {
  const fileType = inferFileType(fileName);

  if (!fileType) {
    return {
      valid: false,
      error: `지원하지 않는 파일 형식입니다. 지원 형식: ${SUPPORTED_EXTENSIONS.join(', ')}`,
    };
  }

  // MIME 타입 검사 (제공된 경우)
  if (mimeType) {
    const validMimeTypes = SUPPORTED_MIME_TYPES[fileType];
    if (!validMimeTypes.includes(mimeType) && mimeType !== 'application/octet-stream') {
      // 확장자가 맞으면 MIME 타입은 경고만
      console.warn(`예상치 못한 MIME 타입: ${mimeType}, 파일명 기준으로 처리합니다.`);
    }
  }

  return { valid: true, fileType };
}

/**
 * 파일에서 텍스트 추출 (통합 함수)
 */
export async function extractText(
  content: string,
  fileType: FileType
): Promise<TextExtractionResult> {
  try {
    let extractedContent: ExtractedContent;

    switch (fileType) {
      case 'txt':
        extractedContent = extractFromTxt(content);
        break;
      case 'md':
        extractedContent = extractFromMd(content);
        break;
      default:
        return {
          success: false,
          error: `지원하지 않는 파일 타입: ${fileType}`,
        };
    }

    // 내용이 너무 짧은 경우 검사
    if (extractedContent.wordCount < 10) {
      return {
        success: false,
        error: '파일 내용이 너무 짧습니다. 최소 10단어 이상의 텍스트가 필요합니다.',
      };
    }

    return {
      success: true,
      content: extractedContent,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '텍스트 추출 중 오류가 발생했습니다.',
    };
  }
}

/**
 * Buffer에서 텍스트 추출
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<TextExtractionResult> {
  const validation = validateFile(fileName);

  if (!validation.valid || !validation.fileType) {
    return {
      success: false,
      error: validation.error,
    };
  }

  // Buffer를 문자열로 변환
  const content = buffer.toString('utf-8');

  return extractText(content, validation.fileType);
}

// 개별 추출기 내보내기
export { extractFromTxt } from './txt-extractor';
export { extractFromMd } from './md-extractor';
