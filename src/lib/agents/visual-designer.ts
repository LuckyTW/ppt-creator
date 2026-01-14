/**
 * Visual Designer 에이전트
 * 슬라이드 구조에 비주얼 명세를 적용하여 최종 렌더링 준비
 */

import { nanoid } from 'nanoid';
import type {
  Agent,
  AgentResult,
  VisualDesignerInput,
  VisualDesignerOutput,
} from './types';
import type {
  SlideVisualSpec,
  VisualElement,
  Position,
  Size,
  ElementStyle,
  ThemeConfig,
  SlideType,
  ContentBlock,
} from '@/types/ppt';

const AGENT_NAME = 'VisualDesigner';

// ============================================
// 슬라이드 레이아웃 상수 (인치 단위)
// ============================================

const SLIDE = {
  WIDTH: 10,
  HEIGHT: 5.625, // 16:9 비율
};

const MARGIN = {
  TOP: 0.5,
  BOTTOM: 0.5,
  LEFT: 0.5,
  RIGHT: 0.5,
};

const CONTENT_AREA = {
  X: MARGIN.LEFT,
  Y: 1.2, // 제목 아래
  WIDTH: SLIDE.WIDTH - MARGIN.LEFT - MARGIN.RIGHT,
  HEIGHT: SLIDE.HEIGHT - 1.2 - MARGIN.BOTTOM,
};

// ============================================
// 레이아웃 템플릿 정의
// ============================================

interface LayoutTemplate {
  titlePosition: Position;
  titleSize: Size;
  contentAreas: Array<{
    position: ContentBlock['position'];
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}

const LAYOUTS: Record<SlideType, LayoutTemplate> = {
  title: {
    titlePosition: { x: 0.5, y: 2 },
    titleSize: { w: 9, h: 1.5 },
    contentAreas: [
      { position: 'main', x: 0.5, y: 3.5, w: 9, h: 1 },
    ],
  },
  toc: {
    titlePosition: { x: MARGIN.LEFT, y: MARGIN.TOP },
    titleSize: { w: CONTENT_AREA.WIDTH, h: 0.7 },
    contentAreas: [
      { position: 'main', x: CONTENT_AREA.X, y: CONTENT_AREA.Y, w: CONTENT_AREA.WIDTH, h: CONTENT_AREA.HEIGHT },
    ],
  },
  section_header: {
    titlePosition: { x: 0.5, y: 2.2 },
    titleSize: { w: 9, h: 1.2 },
    contentAreas: [],
  },
  content: {
    titlePosition: { x: MARGIN.LEFT, y: MARGIN.TOP },
    titleSize: { w: CONTENT_AREA.WIDTH, h: 0.7 },
    contentAreas: [
      { position: 'main', x: CONTENT_AREA.X, y: CONTENT_AREA.Y, w: CONTENT_AREA.WIDTH, h: CONTENT_AREA.HEIGHT },
    ],
  },
  bullet_points: {
    titlePosition: { x: MARGIN.LEFT, y: MARGIN.TOP },
    titleSize: { w: CONTENT_AREA.WIDTH, h: 0.7 },
    contentAreas: [
      { position: 'main', x: CONTENT_AREA.X, y: CONTENT_AREA.Y, w: CONTENT_AREA.WIDTH, h: CONTENT_AREA.HEIGHT },
    ],
  },
  comparison: {
    titlePosition: { x: MARGIN.LEFT, y: MARGIN.TOP },
    titleSize: { w: CONTENT_AREA.WIDTH, h: 0.7 },
    contentAreas: [
      { position: 'left', x: CONTENT_AREA.X, y: CONTENT_AREA.Y, w: CONTENT_AREA.WIDTH / 2 - 0.2, h: CONTENT_AREA.HEIGHT },
      { position: 'right', x: CONTENT_AREA.X + CONTENT_AREA.WIDTH / 2 + 0.2, y: CONTENT_AREA.Y, w: CONTENT_AREA.WIDTH / 2 - 0.2, h: CONTENT_AREA.HEIGHT },
    ],
  },
  chart: {
    titlePosition: { x: MARGIN.LEFT, y: MARGIN.TOP },
    titleSize: { w: CONTENT_AREA.WIDTH, h: 0.7 },
    contentAreas: [
      { position: 'main', x: 1, y: CONTENT_AREA.Y, w: 8, h: 3.5 },
    ],
  },
  table: {
    titlePosition: { x: MARGIN.LEFT, y: MARGIN.TOP },
    titleSize: { w: CONTENT_AREA.WIDTH, h: 0.7 },
    contentAreas: [
      { position: 'main', x: CONTENT_AREA.X, y: CONTENT_AREA.Y, w: CONTENT_AREA.WIDTH, h: CONTENT_AREA.HEIGHT },
    ],
  },
  quote: {
    titlePosition: { x: MARGIN.LEFT, y: MARGIN.TOP },
    titleSize: { w: CONTENT_AREA.WIDTH, h: 0.7 },
    contentAreas: [
      { position: 'main', x: 1.5, y: 1.8, w: 7, h: 2.5 },
    ],
  },
  conclusion: {
    titlePosition: { x: MARGIN.LEFT, y: MARGIN.TOP },
    titleSize: { w: CONTENT_AREA.WIDTH, h: 0.7 },
    contentAreas: [
      { position: 'main', x: CONTENT_AREA.X, y: CONTENT_AREA.Y, w: CONTENT_AREA.WIDTH, h: CONTENT_AREA.HEIGHT },
    ],
  },
  thank_you: {
    titlePosition: { x: 0.5, y: 2.2 },
    titleSize: { w: 9, h: 1.2 },
    contentAreas: [],
  },
};

/**
 * Visual Designer 에이전트 클래스
 */
class VisualDesignerAgent implements Agent<VisualDesignerInput, VisualDesignerOutput> {
  name = AGENT_NAME;

  async execute(input: VisualDesignerInput): Promise<AgentResult<VisualDesignerOutput>> {
    const startTime = Date.now();

    try {
      const { structure, theme } = input;
      const slides: SlideVisualSpec[] = [];

      for (const slideStructure of structure.slides) {
        const layout = LAYOUTS[slideStructure.type] || LAYOUTS.content;
        const elements: VisualElement[] = [];

        // 제목 요소 추가
        if (slideStructure.title) {
          elements.push(
            createTitleElement(
              slideStructure.title,
              slideStructure.type,
              layout,
              theme
            )
          );
        }

        // 부제목 요소 추가 (title 슬라이드만)
        if (slideStructure.subtitle && slideStructure.type === 'title') {
          elements.push(
            createSubtitleElement(slideStructure.subtitle, theme)
          );
        }

        // 콘텐츠 블록 요소 추가
        for (const block of slideStructure.contentBlocks) {
          const contentArea = layout.contentAreas.find(
            (area) => area.position === block.position
          ) || layout.contentAreas[0];

          if (contentArea) {
            elements.push(
              createContentElement(block, contentArea, theme)
            );
          }
        }

        slides.push({
          slideId: slideStructure.id,
          background: {
            color: theme.colors.background,
          },
          elements,
        });
      }

      const output: VisualDesignerOutput = {
        slides,
        appliedTheme: theme,
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

      return {
        success: false,
        error: {
          code: 'VISUAL_DESIGN_FAILED',
          message: error instanceof Error ? error.message : '비주얼 디자인 실패',
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
}

/**
 * 제목 요소 생성
 */
function createTitleElement(
  title: string,
  slideType: SlideType,
  layout: LayoutTemplate,
  theme: ThemeConfig
): VisualElement {
  const isMainTitle = slideType === 'title' || slideType === 'section_header' || slideType === 'thank_you';

  return {
    id: nanoid(8),
    type: 'text',
    position: layout.titlePosition,
    size: layout.titleSize,
    style: {
      fontSize: isMainTitle ? theme.styles.headingSize : theme.styles.subheadingSize,
      fontFace: theme.fonts.heading,
      color: theme.colors.text,
      bold: true,
      align: isMainTitle ? 'center' : 'left',
      valign: 'middle',
    },
    content: title,
  };
}

/**
 * 부제목 요소 생성
 */
function createSubtitleElement(
  subtitle: string,
  theme: ThemeConfig
): VisualElement {
  return {
    id: nanoid(8),
    type: 'text',
    position: { x: 0.5, y: 3.5 },
    size: { w: 9, h: 0.8 },
    style: {
      fontSize: theme.styles.subheadingSize,
      fontFace: theme.fonts.body,
      color: theme.colors.muted,
      align: 'center',
      valign: 'middle',
    },
    content: subtitle,
  };
}

/**
 * 콘텐츠 요소 생성
 */
function createContentElement(
  block: ContentBlock,
  area: { x: number; y: number; w: number; h: number },
  theme: ThemeConfig
): VisualElement {
  const baseStyle: ElementStyle = {
    fontSize: theme.styles.bodySize,
    fontFace: theme.fonts.body,
    color: theme.colors.text,
    align: 'left',
    valign: 'top',
  };

  return {
    id: block.id || nanoid(8),
    type: mapBlockTypeToVisualType(block.type),
    position: { x: area.x, y: area.y },
    size: { w: area.w, h: area.h },
    style: baseStyle,
    content: block.content,
  };
}

/**
 * ContentBlock 타입을 VisualElement 타입으로 매핑
 */
function mapBlockTypeToVisualType(
  blockType: ContentBlock['type']
): VisualElement['type'] {
  switch (blockType) {
    case 'chart':
      return 'chart';
    case 'table':
      return 'table';
    case 'image':
      return 'image';
    default:
      return 'text';
  }
}

/**
 * Visual Designer 에이전트 인스턴스 생성
 */
export function createVisualDesigner(): Agent<VisualDesignerInput, VisualDesignerOutput> {
  return new VisualDesignerAgent();
}

/**
 * Visual Designer 실행 헬퍼 함수
 */
export async function designVisuals(
  input: VisualDesignerInput
): Promise<AgentResult<VisualDesignerOutput>> {
  const agent = createVisualDesigner();
  return agent.execute(input);
}
