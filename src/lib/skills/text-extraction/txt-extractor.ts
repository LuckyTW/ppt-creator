/**
 * TXT 파일 텍스트 추출기
 */

import type { ExtractedContent, ExtractedHeading, ExtractedList } from '@/types/ppt';

/**
 * TXT 파일에서 텍스트 및 구조 추출
 */
export function extractFromTxt(content: string): ExtractedContent {
  const lines = content.split('\n');
  const headings: ExtractedHeading[] = [];
  const lists: ExtractedList[] = [];

  let currentList: string[] = [];
  let currentListType: 'bullet' | 'numbered' | null = null;

  // 각 라인 분석
  for (const line of lines) {
    const trimmedLine = line.trim();

    // 빈 라인이면 현재 리스트 종료
    if (!trimmedLine) {
      if (currentList.length > 0 && currentListType) {
        lists.push({ type: currentListType, items: [...currentList] });
        currentList = [];
        currentListType = null;
      }
      continue;
    }

    // 대문자로 시작하는 짧은 라인은 헤딩으로 처리
    if (
      trimmedLine.length < 100 &&
      trimmedLine === trimmedLine.toUpperCase() &&
      /^[A-Z가-힣]/.test(trimmedLine)
    ) {
      headings.push({ level: 1, text: trimmedLine });
      continue;
    }

    // 콜론으로 끝나는 짧은 라인은 서브헤딩으로 처리
    if (trimmedLine.length < 80 && trimmedLine.endsWith(':')) {
      headings.push({ level: 2, text: trimmedLine.slice(0, -1) });
      continue;
    }

    // 불릿 리스트 감지
    const bulletMatch = trimmedLine.match(/^[-•*]\s+(.+)/);
    if (bulletMatch) {
      if (currentListType !== 'bullet' && currentList.length > 0) {
        lists.push({ type: currentListType!, items: [...currentList] });
        currentList = [];
      }
      currentListType = 'bullet';
      currentList.push(bulletMatch[1]);
      continue;
    }

    // 번호 리스트 감지
    const numberedMatch = trimmedLine.match(/^(\d+)[.)]\s+(.+)/);
    if (numberedMatch) {
      if (currentListType !== 'numbered' && currentList.length > 0) {
        lists.push({ type: currentListType!, items: [...currentList] });
        currentList = [];
      }
      currentListType = 'numbered';
      currentList.push(numberedMatch[2]);
      continue;
    }
  }

  // 남은 리스트 추가
  if (currentList.length > 0 && currentListType) {
    lists.push({ type: currentListType, items: currentList });
  }

  // 통계 계산
  const wordCount = content
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const paragraphCount = content
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0).length;

  // 예상 슬라이드 수 계산 (약 100단어당 1슬라이드)
  const estimatedSlides = Math.max(
    3,
    Math.min(20, Math.ceil(wordCount / 100) + headings.length)
  );

  return {
    rawText: content,
    wordCount,
    paragraphCount,
    headings,
    lists,
    estimatedSlides,
  };
}
