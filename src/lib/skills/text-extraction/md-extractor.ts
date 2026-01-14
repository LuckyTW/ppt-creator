/**
 * Markdown 파일 텍스트 추출기
 */

import type { ExtractedContent, ExtractedHeading, ExtractedList } from '@/types/ppt';

/**
 * Markdown 파일에서 텍스트 및 구조 추출
 */
export function extractFromMd(content: string): ExtractedContent {
  const lines = content.split('\n');
  const headings: ExtractedHeading[] = [];
  const lists: ExtractedList[] = [];

  let currentList: string[] = [];
  let currentListType: 'bullet' | 'numbered' | null = null;
  let inCodeBlock = false;

  // 각 라인 분석
  for (const line of lines) {
    const trimmedLine = line.trim();

    // 코드 블록 감지
    if (trimmedLine.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // 코드 블록 내부는 건너뛰기
    if (inCodeBlock) {
      continue;
    }

    // 빈 라인이면 현재 리스트 종료
    if (!trimmedLine) {
      if (currentList.length > 0 && currentListType) {
        lists.push({ type: currentListType, items: [...currentList] });
        currentList = [];
        currentListType = null;
      }
      continue;
    }

    // Markdown 헤딩 감지 (# ~ ######)
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].replace(/\s*#+\s*$/, ''); // 끝의 # 제거
      headings.push({ level, text });
      continue;
    }

    // 대체 헤딩 스타일 (===, ---)
    const nextLineIndex = lines.indexOf(line) + 1;
    if (nextLineIndex < lines.length) {
      const nextLine = lines[nextLineIndex].trim();
      if (nextLine.match(/^=+$/) && trimmedLine.length > 0) {
        headings.push({ level: 1, text: trimmedLine });
        continue;
      }
      if (nextLine.match(/^-+$/) && trimmedLine.length > 0 && !trimmedLine.startsWith('-')) {
        headings.push({ level: 2, text: trimmedLine });
        continue;
      }
    }

    // 불릿 리스트 감지 (-, *, +)
    const bulletMatch = trimmedLine.match(/^[-*+]\s+(.+)/);
    if (bulletMatch) {
      if (currentListType !== 'bullet' && currentList.length > 0) {
        lists.push({ type: currentListType!, items: [...currentList] });
        currentList = [];
      }
      currentListType = 'bullet';
      // 마크다운 서식 제거
      const cleanText = removeMarkdownFormatting(bulletMatch[1]);
      currentList.push(cleanText);
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
      const cleanText = removeMarkdownFormatting(numberedMatch[2]);
      currentList.push(cleanText);
      continue;
    }
  }

  // 남은 리스트 추가
  if (currentList.length > 0 && currentListType) {
    lists.push({ type: currentListType, items: currentList });
  }

  // 통계 계산 (마크다운 문법 제외)
  const plainText = removeMarkdownSyntax(content);
  const wordCount = plainText
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const paragraphCount = content
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0 && !p.trim().startsWith('```')).length;

  // 예상 슬라이드 수 계산
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

/**
 * 인라인 마크다운 서식 제거
 */
function removeMarkdownFormatting(text: string): string {
  return text
    // 볼드 (**text** or __text__)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    // 이탤릭 (*text* or _text_)
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // 인라인 코드 (`code`)
    .replace(/`(.+?)`/g, '$1')
    // 링크 [text](url)
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // 이미지 ![alt](url)
    .replace(/!\[.*?\]\(.+?\)/g, '')
    // 취소선 ~~text~~
    .replace(/~~(.+?)~~/g, '$1')
    .trim();
}

/**
 * 마크다운 문법 전체 제거 (단어 수 계산용)
 */
function removeMarkdownSyntax(content: string): string {
  return content
    // 코드 블록 제거
    .replace(/```[\s\S]*?```/g, '')
    // 인라인 코드 제거
    .replace(/`[^`]+`/g, '')
    // 헤딩 마커 제거
    .replace(/^#{1,6}\s+/gm, '')
    // 불릿/번호 마커 제거
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    // 링크 제거
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // 이미지 제거
    .replace(/!\[.*?\]\(.+?\)/g, '')
    // 강조 마커 제거
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    // 인용 마커 제거
    .replace(/^>\s*/gm, '')
    // 수평선 제거
    .replace(/^[-*_]{3,}\s*$/gm, '');
}
