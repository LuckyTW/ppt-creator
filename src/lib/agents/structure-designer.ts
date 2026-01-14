/**
 * Structure Designer 에이전트
 * 분석된 콘텐츠를 기반으로 PPT 슬라이드 구조 설계
 */

import { GoogleGenAI } from '@google/genai';
import type {
  Agent,
  AgentResult,
  StructureDesignerInput,
  StructureDesignerOutput,
  FlowHint,
} from './types';
import type { SlideStructure, SlideType, ContentBlock } from '@/types/ppt';

const AGENT_NAME = 'StructureDesigner';

/**
 * Gemini API를 사용한 구조 설계 프롬프트
 */
function buildStructurePrompt(input: StructureDesignerInput): string {
  const { analysisResult, options } = input;
  const { language } = options;

  const langInstruction = language === 'ko'
    ? '응답은 반드시 한국어로 작성해주세요.'
    : 'Please respond in English.';

  return `당신은 프레젠테이션 구조 설계 전문가입니다. 분석된 콘텐츠를 바탕으로 최적의 슬라이드 구조를 설계해주세요.

${langInstruction}

## 분석 결과
- 제목: ${analysisResult.metadata.title}
- 부제목: ${analysisResult.metadata.subtitle || '없음'}
- 핵심 주제: ${analysisResult.metadata.mainTopic}
- 권장 슬라이드 수: ${analysisResult.recommendedSlideCount}

## 섹션 정보
${analysisResult.sections.map((s, i) => `
${i + 1}. ${s.title} (중요도: ${s.importance})
   - 내용: ${s.content.substring(0, 200)}
   - 불릿: ${s.bulletPoints.slice(0, 3).join(', ')}
   - 추천 타입: ${s.suggestedSlideType}
`).join('')}

## 키워드
${analysisResult.keywords.join(', ') || '없음'}

## 설계 옵션
- 목표 슬라이드 수: ${options.targetSlideCount || '자동'}
- 목차 포함: ${options.includeTableOfContents ? '예' : '아니오'}
- 결론 포함: ${options.includeConclusion ? '예' : '아니오'}

## 슬라이드 구조 설계

다음 JSON 형식으로 슬라이드 구조를 설계해주세요:

\`\`\`json
{
  "presentation": {
    "title": "프레젠테이션 제목",
    "subtitle": "부제목 (선택)",
    "totalSlides": 숫자
  },
  "slides": [
    {
      "id": "slide_1",
      "order": 1,
      "type": "title",
      "title": "슬라이드 제목",
      "subtitle": "슬라이드 부제목 (선택)",
      "contentBlocks": [
        {
          "id": "block_1",
          "type": "heading|paragraph|bullets|numbered|table|chart|quote",
          "content": "내용 또는 배열",
          "position": "main|left|right"
        }
      ],
      "speakerNotes": "발표자 노트 (선택)"
    }
  ],
  "flow": {
    "narrative": "전체 스토리라인 설명",
    "transitions": [
      {
        "fromSlideId": "slide_1",
        "toSlideId": "slide_2",
        "connectionType": "continuation|contrast|example|conclusion"
      }
    ]
  }
}
\`\`\`

## 슬라이드 타입
- title: 표지 슬라이드
- toc: 목차
- section_header: 섹션 구분
- content: 일반 콘텐츠
- bullet_points: 불릿 포인트 중심
- comparison: 2열 비교
- chart: 차트/그래프
- table: 테이블
- quote: 인용구
- conclusion: 결론
- thank_you: 마무리

## 설계 원칙
1. **1슬라이드 1메시지**: 각 슬라이드는 하나의 핵심 메시지만 전달
2. **불릿 제한**: 슬라이드당 불릿 포인트 최대 5개
3. **간결함**: 각 불릿 항목은 2줄 이내
4. **논리적 흐름**: 서론 → 본론 → 결론 구조
5. **시각적 다양성**: 다양한 슬라이드 타입 활용

JSON만 응답해주세요.`;
}

/**
 * Structure Designer 에이전트 클래스
 */
class StructureDesignerAgent implements Agent<StructureDesignerInput, StructureDesignerOutput> {
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

  async execute(input: StructureDesignerInput): Promise<AgentResult<StructureDesignerOutput>> {
    const startTime = Date.now();

    // API 키가 없으면 바로 폴백 로직 실행
    if (!this.hasApiKey || !this.client) {
      console.log(`[${AGENT_NAME}] API 키가 없어 폴백 모드로 실행합니다.`);
      return this.fallbackStructure(input, startTime);
    }

    try {
      const prompt = buildStructurePrompt(input);

      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          maxOutputTokens: 8192,
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

      // 슬라이드 구조 정규화
      const slides: SlideStructure[] = parsed.slides.map(
        (slide: Partial<SlideStructure>, index: number) => ({
          id: slide.id || `slide_${index + 1}`,
          order: slide.order || index + 1,
          type: (slide.type || 'content') as SlideType,
          title: slide.title || '',
          subtitle: slide.subtitle,
          contentBlocks: normalizeContentBlocks(slide.contentBlocks || []),
          speakerNotes: slide.speakerNotes,
        })
      );

      const output: StructureDesignerOutput = {
        presentation: {
          title: parsed.presentation?.title || input.analysisResult.metadata.title,
          subtitle: parsed.presentation?.subtitle,
          totalSlides: slides.length,
        },
        slides,
        flow: {
          narrative: parsed.flow?.narrative || '',
          transitions: parsed.flow?.transitions || [],
        },
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
        return this.fallbackStructure(input, startTime);
      }

      return {
        success: false,
        error: {
          code: 'STRUCTURE_DESIGN_FAILED',
          message: error instanceof Error ? error.message : '구조 설계 실패',
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
   * AI API 없이 기본 구조 생성 (폴백)
   */
  private fallbackStructure(
    input: StructureDesignerInput,
    startTime: number
  ): AgentResult<StructureDesignerOutput> {
    const { analysisResult, options } = input;
    const slides: SlideStructure[] = [];
    let slideOrder = 1;

    // 1. 표지 슬라이드
    slides.push({
      id: `slide_${slideOrder}`,
      order: slideOrder++,
      type: 'title',
      title: analysisResult.metadata.title,
      subtitle: analysisResult.metadata.subtitle || analysisResult.metadata.mainTopic,
      contentBlocks: [],
    });

    // 2. 목차 슬라이드 (옵션)
    if (options.includeTableOfContents && analysisResult.sections.length > 2) {
      slides.push({
        id: `slide_${slideOrder}`,
        order: slideOrder++,
        type: 'toc',
        title: options.language === 'ko' ? '목차' : 'Table of Contents',
        contentBlocks: [
          {
            id: `block_toc`,
            type: 'numbered',
            content: analysisResult.sections.map((s) => s.title),
            position: 'main',
          },
        ],
      });
    }

    // 3. 섹션별 슬라이드
    for (const section of analysisResult.sections) {
      // 섹션 헤더 (고중요도만)
      if (section.importance === 'high' && analysisResult.sections.length > 3) {
        slides.push({
          id: `slide_${slideOrder}`,
          order: slideOrder++,
          type: 'section_header',
          title: section.title,
          contentBlocks: [],
        });
      }

      // 콘텐츠 슬라이드
      const slideType = mapSuggestedType(section.suggestedSlideType);
      slides.push({
        id: `slide_${slideOrder}`,
        order: slideOrder++,
        type: slideType,
        title: section.title,
        contentBlocks: [
          {
            id: `block_${slideOrder}_1`,
            type: section.bulletPoints.length > 0 ? 'bullets' : 'paragraph',
            content:
              section.bulletPoints.length > 0
                ? { items: section.bulletPoints.slice(0, 5) }
                : section.content,
            position: 'main',
          },
        ],
      });
    }

    // 4. 결론 슬라이드 (옵션)
    if (options.includeConclusion) {
      slides.push({
        id: `slide_${slideOrder}`,
        order: slideOrder++,
        type: 'conclusion',
        title: options.language === 'ko' ? '결론' : 'Conclusion',
        contentBlocks: [
          {
            id: `block_conclusion`,
            type: 'bullets',
            content: {
              items: analysisResult.keywords.length > 0
                ? analysisResult.keywords.slice(0, 3).map((k) =>
                    options.language === 'ko' ? `핵심: ${k}` : `Key: ${k}`
                  )
                : [analysisResult.summary.substring(0, 100)],
            },
            position: 'main',
          },
        ],
      });
    }

    // 5. 감사 슬라이드
    slides.push({
      id: `slide_${slideOrder}`,
      order: slideOrder++,
      type: 'thank_you',
      title: options.language === 'ko' ? '감사합니다' : 'Thank You',
      contentBlocks: [],
    });

    // 흐름 생성
    const transitions: FlowHint[] = [];
    for (let i = 0; i < slides.length - 1; i++) {
      transitions.push({
        fromSlideId: slides[i].id,
        toSlideId: slides[i + 1].id,
        connectionType: 'continuation',
      });
    }

    const output: StructureDesignerOutput = {
      presentation: {
        title: analysisResult.metadata.title,
        subtitle: analysisResult.metadata.subtitle,
        totalSlides: slides.length,
      },
      slides,
      flow: {
        narrative: analysisResult.summary,
        transitions,
      },
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
 * ContentBlock 정규화
 */
function normalizeContentBlocks(blocks: Partial<ContentBlock>[]): ContentBlock[] {
  return blocks.map((block, index) => ({
    id: block.id || `block_${index + 1}`,
    type: block.type || 'paragraph',
    content: block.content || '',
    position: block.position || 'main',
  }));
}

/**
 * 추천 타입을 SlideType으로 매핑
 */
function mapSuggestedType(suggested: string): SlideType {
  const mapping: Record<string, SlideType> = {
    bullet_points: 'bullet_points',
    comparison: 'comparison',
    chart: 'chart',
    table: 'table',
    quote: 'quote',
  };
  return mapping[suggested] || 'content';
}

/**
 * Structure Designer 에이전트 인스턴스 생성
 */
export function createStructureDesigner(): Agent<StructureDesignerInput, StructureDesignerOutput> {
  return new StructureDesignerAgent();
}

/**
 * Structure Designer 실행 헬퍼 함수
 */
export async function designStructure(
  input: StructureDesignerInput
): Promise<AgentResult<StructureDesignerOutput>> {
  const agent = createStructureDesigner();
  return agent.execute(input);
}
