/**
 * Content Analyst 에이전트
 * 원본 텍스트를 분석하여 핵심 내용을 추출하고 구조화
 */

import { GoogleGenAI } from '@google/genai';
import type {
  Agent,
  AgentResult,
  ContentAnalystInput,
  ContentAnalystOutput,
  AnalyzedSection,
} from './types';

const AGENT_NAME = 'ContentAnalyst';

/**
 * Gemini API를 사용한 콘텐츠 분석 프롬프트
 */
function buildAnalysisPrompt(input: ContentAnalystInput): string {
  const { extractedContent, fileName, language } = input;

  const langInstruction = language === 'ko'
    ? '응답은 반드시 한국어로 작성해주세요.'
    : 'Please respond in English.';

  return `당신은 프레젠테이션 콘텐츠 분석 전문가입니다. 주어진 텍스트를 분석하여 PPT 제작에 최적화된 구조로 재구성해주세요.

${langInstruction}

## 파일 정보
- 파일명: ${fileName}
- 단어 수: ${extractedContent.wordCount}
- 문단 수: ${extractedContent.paragraphCount}

## 원본 텍스트
${extractedContent.rawText}

## 기존 구조 분석
- 헤딩: ${extractedContent.headings.map(h => `[L${h.level}] ${h.text}`).join(', ') || '없음'}
- 리스트: ${extractedContent.lists.length}개

## 분석 요청
다음 JSON 형식으로 분석 결과를 제공해주세요:

\`\`\`json
{
  "metadata": {
    "title": "프레젠테이션 제목 (간결하고 임팩트 있게)",
    "subtitle": "부제목 (선택사항)",
    "mainTopic": "핵심 주제 한 문장",
    "language": "${language}"
  },
  "sections": [
    {
      "id": "section_1",
      "title": "섹션 제목",
      "content": "섹션의 핵심 내용 요약",
      "bulletPoints": ["핵심 포인트 1", "핵심 포인트 2", "..."],
      "importance": "high|medium|low",
      "suggestedSlideType": "bullet_points|comparison|chart|table|quote"
    }
  ],
  "keywords": ["키워드1", "키워드2", "..."],
  "summary": "전체 내용 3문장 이내 요약",
  "dataElements": [
    {
      "type": "list|table|quote|statistic|comparison",
      "content": "데이터 내용",
      "sectionId": "소속 섹션 ID"
    }
  ],
  "recommendedSlideCount": 숫자
}
\`\`\`

## 분석 가이드라인
1. **제목**: 청중의 관심을 끌 수 있는 명확한 제목
2. **섹션**: 논리적 흐름에 따라 3-7개 섹션으로 구분
3. **불릿 포인트**: 각 섹션당 최대 5개, 각 항목 20단어 이내
4. **중요도**: high(핵심), medium(보조), low(선택적)
5. **슬라이드 타입 제안**: 콘텐츠 특성에 맞는 레이아웃 추천
6. **슬라이드 수**: 1슬라이드 1메시지 원칙, 표지/목차/결론 포함하여 추천

JSON만 응답해주세요.`;
}

/**
 * Content Analyst 에이전트 클래스
 */
class ContentAnalystAgent implements Agent<ContentAnalystInput, ContentAnalystOutput> {
  name = AGENT_NAME;
  private client: GoogleGenAI | null = null;
  private hasApiKey: boolean;

  constructor() {
    // API 키 존재 여부 확인
    this.hasApiKey = !!process.env.GEMINI_API_KEY;

    if (this.hasApiKey) {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  async execute(input: ContentAnalystInput): Promise<AgentResult<ContentAnalystOutput>> {
    const startTime = Date.now();

    // API 키가 없으면 바로 폴백 로직 실행
    if (!this.hasApiKey || !this.client) {
      console.log(`[${AGENT_NAME}] API 키가 없어 폴백 모드로 실행합니다.`);
      return this.fallbackAnalysis(input, startTime);
    }

    try {
      const prompt = buildAnalysisPrompt(input);

      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          maxOutputTokens: 4096,
          temperature: 0.7,
        },
      });

      // 응답에서 JSON 추출
      const responseText = response.text;
      if (!responseText) {
        throw new Error('응답에서 텍스트를 찾을 수 없습니다.');
      }

      // 마크다운 코드 블록에서 JSON 추출 (```json, ```, 또는 일반 텍스트)
      let jsonStr = responseText;
      const jsonBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1];
      } else {
        // JSON 객체만 추출 시도
        const jsonObjectMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonStr = jsonObjectMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr);

      // 섹션 ID 보장
      const sections: AnalyzedSection[] = parsed.sections.map(
        (section: Partial<AnalyzedSection>, index: number) => ({
          id: section.id || `section_${index + 1}`,
          title: section.title || `섹션 ${index + 1}`,
          content: section.content || '',
          bulletPoints: section.bulletPoints || [],
          importance: section.importance || 'medium',
          suggestedSlideType: section.suggestedSlideType || 'bullet_points',
        })
      );

      const output: ContentAnalystOutput = {
        metadata: {
          title: parsed.metadata?.title || input.fileName.replace(/\.[^/.]+$/, ''),
          subtitle: parsed.metadata?.subtitle,
          mainTopic: parsed.metadata?.mainTopic || '',
          language: input.language,
        },
        sections,
        keywords: parsed.keywords || [],
        summary: parsed.summary || '',
        dataElements: parsed.dataElements || [],
        recommendedSlideCount: parsed.recommendedSlideCount || Math.min(10, sections.length + 3),
      };

      return {
        success: true,
        data: output,
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          agentName: this.name,
        },
      };
    } catch (error) {
      console.error(`${AGENT_NAME} error:`, error);

      // API 에러 시 폴백 처리
      if (error instanceof Error) {
        return this.fallbackAnalysis(input, startTime);
      }

      return {
        success: false,
        error: {
          code: 'ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : '콘텐츠 분석 실패',
          details: error,
        },
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          agentName: this.name,
        },
      };
    }
  }

  /**
   * AI API 없이 기본 분석 수행 (폴백)
   */
  private fallbackAnalysis(
    input: ContentAnalystInput,
    startTime: number
  ): AgentResult<ContentAnalystOutput> {
    const { extractedContent, fileName, language } = input;

    // 헤딩 기반 섹션 생성
    const sections: AnalyzedSection[] = [];

    if (extractedContent.headings.length > 0) {
      extractedContent.headings.forEach((heading, index) => {
        sections.push({
          id: `section_${index + 1}`,
          title: heading.text,
          content: '',
          bulletPoints: [],
          importance: heading.level === 1 ? 'high' : 'medium',
          suggestedSlideType: 'bullet_points',
        });
      });
    } else {
      // 헤딩이 없으면 문단 기반으로 섹션 생성
      const paragraphs = extractedContent.rawText.split(/\n\s*\n/).filter((p) => p.trim());
      const chunkSize = Math.ceil(paragraphs.length / 3);

      for (let i = 0; i < 3 && i * chunkSize < paragraphs.length; i++) {
        const chunk = paragraphs.slice(i * chunkSize, (i + 1) * chunkSize);
        sections.push({
          id: `section_${i + 1}`,
          title: language === 'ko' ? `섹션 ${i + 1}` : `Section ${i + 1}`,
          content: chunk.join('\n\n').substring(0, 500),
          bulletPoints: chunk.slice(0, 5).map((p) => p.substring(0, 100)),
          importance: i === 0 ? 'high' : 'medium',
          suggestedSlideType: 'bullet_points',
        });
      }
    }

    // 리스트에서 불릿 포인트 추출
    extractedContent.lists.forEach((list, listIndex) => {
      if (sections.length > 0) {
        const targetSection = sections[Math.min(listIndex, sections.length - 1)];
        targetSection.bulletPoints = [
          ...targetSection.bulletPoints,
          ...list.items.slice(0, 5),
        ].slice(0, 5);
      }
    });

    const output: ContentAnalystOutput = {
      metadata: {
        title: fileName.replace(/\.[^/.]+$/, ''),
        mainTopic: sections[0]?.title || '',
        language,
      },
      sections,
      keywords: [],
      summary: extractedContent.rawText.substring(0, 200),
      dataElements: [],
      recommendedSlideCount: Math.min(10, sections.length + 3),
    };

    return {
      success: true,
      data: output,
      metadata: {
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        agentName: this.name,
      },
    };
  }
}

/**
 * Content Analyst 에이전트 인스턴스 생성
 */
export function createContentAnalyst(): Agent<ContentAnalystInput, ContentAnalystOutput> {
  return new ContentAnalystAgent();
}

/**
 * Content Analyst 실행 헬퍼 함수
 */
export async function analyzeContent(
  input: ContentAnalystInput
): Promise<AgentResult<ContentAnalystOutput>> {
  const agent = createContentAnalyst();
  return agent.execute(input);
}
