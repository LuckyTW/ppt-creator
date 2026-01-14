/**
 * PPT Builder 에이전트
 * PptxGenJS를 사용하여 실제 PPTX 파일 생성
 * 전문적인 디자인이 적용된 고품질 PPT 생성
 */

import PptxGenJS from 'pptxgenjs';
import type {
  Agent,
  AgentResult,
  PPTBuilderInput,
  PPTBuilderOutput,
} from './types';
import type {
  SlideVisualSpec,
  VisualElement,
  ThemeConfig,
  BulletContent,
} from '@/types/ppt';

const AGENT_NAME = 'PPTBuilder';

/**
 * PPT Builder 에이전트 클래스
 */
class PPTBuilderAgent implements Agent<PPTBuilderInput, PPTBuilderOutput> {
  name = AGENT_NAME;

  async execute(input: PPTBuilderInput): Promise<AgentResult<PPTBuilderOutput>> {
    const startTime = Date.now();

    try {
      const { visualSpec, outputOptions } = input;
      const { slides, appliedTheme } = visualSpec;

      // PptxGenJS 인스턴스 생성
      const pptx = new PptxGenJS();

      // 프레젠테이션 기본 설정
      this.setupPresentation(pptx, appliedTheme);

      // 각 슬라이드 생성
      for (let i = 0; i < slides.length; i++) {
        const slideSpec = slides[i];
        const slideNumber = i + 1;
        const totalSlides = slides.length;
        this.createSlide(pptx, slideSpec, appliedTheme, slideNumber, totalSlides);
      }

      // 파일 생성
      const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;

      const output: PPTBuilderOutput = {
        file: {
          buffer,
          fileName: outputOptions.fileName,
          size: buffer.length,
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        },
        stats: {
          totalSlides: slides.length,
          generationTime: Date.now() - startTime,
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

      return {
        success: false,
        error: {
          code: 'PPT_BUILD_FAILED',
          message: error instanceof Error ? error.message : 'PPT 생성 실패',
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
   * 프레젠테이션 기본 설정
   */
  private setupPresentation(pptx: PptxGenJS, theme: ThemeConfig): void {
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'PPT Creator';
    pptx.subject = 'Auto-generated Presentation';
    pptx.title = 'Presentation';

    // 마스터 슬라이드 정의 - 일반 콘텐츠용
    pptx.defineSlideMaster({
      title: 'CONTENT_SLIDE',
      background: { color: theme.colors.background.replace('#', '') },
      objects: [
        // 상단 헤더 바
        {
          rect: {
            x: 0,
            y: 0,
            w: '100%',
            h: 0.8,
            fill: { color: theme.colors.primary.replace('#', '') },
          },
        },
        // 하단 악센트 라인
        {
          rect: {
            x: 0,
            y: 5.5,
            w: '100%',
            h: 0.05,
            fill: { color: theme.colors.primary.replace('#', '') },
          },
        },
      ],
    });

    // 마스터 슬라이드 정의 - 타이틀용
    pptx.defineSlideMaster({
      title: 'TITLE_SLIDE',
      background: { color: theme.colors.primary.replace('#', '') },
      objects: [
        // 하단 악센트 영역
        {
          rect: {
            x: 0,
            y: 4.5,
            w: '100%',
            h: 1.125,
            fill: { color: this.darkenColor(theme.colors.primary, 20).replace('#', '') },
          },
        },
      ],
    });

    // 마스터 슬라이드 정의 - 섹션 헤더용
    pptx.defineSlideMaster({
      title: 'SECTION_SLIDE',
      background: { color: theme.colors.secondary.replace('#', '') },
      objects: [
        // 좌측 악센트 바
        {
          rect: {
            x: 0,
            y: 0,
            w: 0.15,
            h: '100%',
            fill: { color: theme.colors.primary.replace('#', '') },
          },
        },
      ],
    });

    // 마스터 슬라이드 정의 - Thank You용
    pptx.defineSlideMaster({
      title: 'THANKYOU_SLIDE',
      background: { color: theme.colors.primary.replace('#', '') },
      objects: [
        // 중앙 원형 장식
        {
          rect: {
            x: 3.5,
            y: 1.5,
            w: 3,
            h: 0.1,
            fill: { color: 'FFFFFF' },
          },
        },
      ],
    });
  }

  /**
   * 슬라이드 생성
   */
  private createSlide(
    pptx: PptxGenJS,
    slideSpec: SlideVisualSpec,
    theme: ThemeConfig,
    slideNumber: number,
    totalSlides: number
  ): void {
    // 슬라이드 타입 확인
    const slideType = this.detectSlideType(slideSpec);

    // 슬라이드 타입에 따른 마스터 슬라이드 선택
    let masterName = 'CONTENT_SLIDE';
    if (slideType === 'title') {
      masterName = 'TITLE_SLIDE';
    } else if (slideType === 'section_header') {
      masterName = 'SECTION_SLIDE';
    } else if (slideType === 'thank_you') {
      masterName = 'THANKYOU_SLIDE';
    }

    const slide = pptx.addSlide({ masterName });

    // 슬라이드 타입별 렌더링
    switch (slideType) {
      case 'title':
        this.renderTitleSlide(slide, slideSpec, theme);
        break;
      case 'section_header':
        this.renderSectionSlide(slide, slideSpec, theme);
        break;
      case 'thank_you':
        this.renderThankYouSlide(slide, slideSpec, theme);
        break;
      case 'toc':
        this.renderTocSlide(slide, slideSpec, theme, slideNumber, totalSlides);
        break;
      default:
        this.renderContentSlide(slide, slideSpec, theme, slideNumber, totalSlides);
    }
  }

  /**
   * 슬라이드 타입 감지
   */
  private detectSlideType(slideSpec: SlideVisualSpec): string {
    // 첫 번째 요소의 스타일로 타입 추측
    const firstElement = slideSpec.elements[0];
    if (!firstElement) return 'content';

    const title = String(firstElement.content || '').toLowerCase();

    // 타이틀 슬라이드: 큰 폰트, 중앙 정렬
    if (firstElement.style.fontSize && firstElement.style.fontSize >= 36 && firstElement.style.align === 'center') {
      if (title.includes('감사') || title.includes('thank')) {
        return 'thank_you';
      }
      // 콘텐츠가 적으면 타이틀 또는 섹션 헤더
      if (slideSpec.elements.length <= 2) {
        // 부제목이 있으면 타이틀
        if (slideSpec.elements.length === 2) {
          return 'title';
        }
        return 'section_header';
      }
    }

    // TOC 슬라이드
    if (title.includes('목차') || title.includes('contents') || title.includes('table of')) {
      return 'toc';
    }

    return 'content';
  }

  /**
   * 타이틀 슬라이드 렌더링
   */
  private renderTitleSlide(
    slide: PptxGenJS.Slide,
    slideSpec: SlideVisualSpec,
    theme: ThemeConfig
  ): void {
    const titleElement = slideSpec.elements[0];
    const subtitleElement = slideSpec.elements[1];

    // 메인 타이틀
    if (titleElement) {
      slide.addText(String(titleElement.content || ''), {
        x: 0.5,
        y: 1.8,
        w: 9,
        h: 1.5,
        fontSize: 44,
        fontFace: theme.fonts.heading,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
        valign: 'middle',
      });
    }

    // 부제목
    if (subtitleElement) {
      slide.addText(String(subtitleElement.content || ''), {
        x: 0.5,
        y: 3.5,
        w: 9,
        h: 0.8,
        fontSize: 24,
        fontFace: theme.fonts.body,
        color: 'FFFFFF',
        align: 'center',
        valign: 'middle',
        italic: true,
      });
    }

    // 장식 라인
    slide.addShape('rect', {
      x: 3,
      y: 3.3,
      w: 4,
      h: 0.05,
      fill: { color: 'FFFFFF' },
    });
  }

  /**
   * 섹션 헤더 슬라이드 렌더링
   */
  private renderSectionSlide(
    slide: PptxGenJS.Slide,
    slideSpec: SlideVisualSpec,
    theme: ThemeConfig
  ): void {
    const titleElement = slideSpec.elements[0];

    if (titleElement) {
      slide.addText(String(titleElement.content || ''), {
        x: 0.8,
        y: 2,
        w: 8.5,
        h: 1.5,
        fontSize: 40,
        fontFace: theme.fonts.heading,
        color: 'FFFFFF',
        bold: true,
        align: 'left',
        valign: 'middle',
      });
    }

    // 장식 라인
    slide.addShape('rect', {
      x: 0.8,
      y: 3.6,
      w: 2,
      h: 0.08,
      fill: { color: 'FFFFFF' },
    });
  }

  /**
   * Thank You 슬라이드 렌더링
   */
  private renderThankYouSlide(
    slide: PptxGenJS.Slide,
    slideSpec: SlideVisualSpec,
    theme: ThemeConfig
  ): void {
    const titleElement = slideSpec.elements[0];

    if (titleElement) {
      slide.addText(String(titleElement.content || ''), {
        x: 0.5,
        y: 2,
        w: 9,
        h: 1.5,
        fontSize: 48,
        fontFace: theme.fonts.heading,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
        valign: 'middle',
      });
    }

    // 상단 장식 라인
    slide.addShape('rect', {
      x: 3.5,
      y: 1.8,
      w: 3,
      h: 0.05,
      fill: { color: 'FFFFFF' },
    });

    // 하단 장식 라인
    slide.addShape('rect', {
      x: 3.5,
      y: 3.7,
      w: 3,
      h: 0.05,
      fill: { color: 'FFFFFF' },
    });
  }

  /**
   * 목차 슬라이드 렌더링
   */
  private renderTocSlide(
    slide: PptxGenJS.Slide,
    slideSpec: SlideVisualSpec,
    theme: ThemeConfig,
    slideNumber: number,
    totalSlides: number
  ): void {
    // 제목
    slide.addText(slideSpec.elements[0]?.content as string || '목차', {
      x: 0.5,
      y: 0.15,
      w: 9,
      h: 0.5,
      fontSize: 24,
      fontFace: theme.fonts.heading,
      color: 'FFFFFF',
      bold: true,
      align: 'left',
      valign: 'middle',
    });

    // 콘텐츠 (목차 항목)
    if (slideSpec.elements[1]) {
      const content = slideSpec.elements[1].content;
      if (Array.isArray(content)) {
        const textRows: PptxGenJS.TextProps[] = content.map((item, idx) => ({
          text: `${idx + 1}. ${item}`,
          options: {
            fontSize: 20,
            fontFace: theme.fonts.body,
            color: theme.colors.text.replace('#', ''),
            paraSpaceAfter: 14,
            bullet: false,
          },
        }));

        slide.addText(textRows, {
          x: 0.8,
          y: 1.2,
          w: 8.4,
          h: 4,
          valign: 'top',
        });
      }
    }

    // 슬라이드 번호
    this.addSlideNumber(slide, theme, slideNumber, totalSlides);
  }

  /**
   * 콘텐츠 슬라이드 렌더링
   */
  private renderContentSlide(
    slide: PptxGenJS.Slide,
    slideSpec: SlideVisualSpec,
    theme: ThemeConfig,
    slideNumber: number,
    totalSlides: number
  ): void {
    // 제목 (헤더 바 위)
    const titleElement = slideSpec.elements[0];
    if (titleElement && titleElement.style.bold) {
      slide.addText(String(titleElement.content || ''), {
        x: 0.5,
        y: 0.15,
        w: 9,
        h: 0.5,
        fontSize: 22,
        fontFace: theme.fonts.heading,
        color: 'FFFFFF',
        bold: true,
        align: 'left',
        valign: 'middle',
      });
    }

    // 나머지 콘텐츠 요소들
    for (let i = 1; i < slideSpec.elements.length; i++) {
      const element = slideSpec.elements[i];
      this.renderElement(slide, element, theme, 1.0);
    }

    // 슬라이드 번호
    this.addSlideNumber(slide, theme, slideNumber, totalSlides);
  }

  /**
   * 슬라이드 번호 추가
   */
  private addSlideNumber(
    slide: PptxGenJS.Slide,
    theme: ThemeConfig,
    slideNumber: number,
    totalSlides: number
  ): void {
    slide.addText(`${slideNumber} / ${totalSlides}`, {
      x: 8.5,
      y: 5.2,
      w: 1,
      h: 0.3,
      fontSize: 10,
      fontFace: theme.fonts.body,
      color: theme.colors.muted.replace('#', ''),
      align: 'right',
    });
  }

  /**
   * 요소 렌더링
   */
  private renderElement(
    slide: PptxGenJS.Slide,
    element: VisualElement,
    theme: ThemeConfig,
    yOffset: number
  ): void {
    const adjustedY = element.position.y + yOffset - 0.2;

    switch (element.type) {
      case 'text':
        this.renderTextElement(slide, element, theme, adjustedY);
        break;
      case 'chart':
        this.renderChartElement(slide, element, theme, adjustedY);
        break;
      case 'table':
        this.renderTableElement(slide, element, theme, adjustedY);
        break;
      case 'shape':
        this.renderShapeElement(slide, element, theme, adjustedY);
        break;
      default:
        this.renderTextElement(slide, element, theme, adjustedY);
    }
  }

  /**
   * 텍스트 요소 렌더링
   */
  private renderTextElement(
    slide: PptxGenJS.Slide,
    element: VisualElement,
    theme: ThemeConfig,
    adjustedY: number
  ): void {
    const content = element.content;

    // 불릿 포인트 처리
    if (this.isBulletContent(content)) {
      this.renderBulletList(slide, element, content, theme, adjustedY);
      return;
    }

    // 배열 처리 (번호 리스트 등)
    if (Array.isArray(content)) {
      this.renderNumberedList(slide, element, content, theme, adjustedY);
      return;
    }

    // 일반 텍스트
    slide.addText(String(content || ''), {
      x: element.position.x,
      y: adjustedY,
      w: element.size.w,
      h: element.size.h,
      fontSize: element.style.fontSize || theme.styles.bodySize,
      fontFace: element.style.fontFace || theme.fonts.body,
      color: (element.style.color || theme.colors.text).replace('#', ''),
      bold: element.style.bold,
      italic: element.style.italic,
      align: element.style.align || 'left',
      valign: element.style.valign || 'top',
      wrap: true,
    });
  }

  /**
   * 불릿 리스트 렌더링
   */
  private renderBulletList(
    slide: PptxGenJS.Slide,
    element: VisualElement,
    content: BulletContent,
    theme: ThemeConfig,
    adjustedY: number
  ): void {
    const textRows: PptxGenJS.TextProps[] = content.items.map((item) => ({
      text: item,
      options: {
        bullet: {
          type: 'bullet',
          code: this.getBulletChar(theme.styles.bulletStyle),
          color: theme.colors.primary.replace('#', ''),
        },
        fontSize: element.style.fontSize || theme.styles.bodySize,
        fontFace: element.style.fontFace || theme.fonts.body,
        color: (element.style.color || theme.colors.text).replace('#', ''),
        paraSpaceAfter: 12,
        indentLevel: 0,
      },
    }));

    slide.addText(textRows, {
      x: element.position.x,
      y: adjustedY,
      w: element.size.w,
      h: element.size.h,
      valign: 'top',
    });
  }

  /**
   * 번호 리스트 렌더링
   */
  private renderNumberedList(
    slide: PptxGenJS.Slide,
    element: VisualElement,
    items: string[],
    theme: ThemeConfig,
    adjustedY: number
  ): void {
    const textRows: PptxGenJS.TextProps[] = items.map((item, index) => ({
      text: item,
      options: {
        bullet: { type: 'number', startAt: index + 1 },
        fontSize: element.style.fontSize || theme.styles.bodySize,
        fontFace: element.style.fontFace || theme.fonts.body,
        color: (element.style.color || theme.colors.text).replace('#', ''),
        paraSpaceAfter: 12,
      },
    }));

    slide.addText(textRows, {
      x: element.position.x,
      y: adjustedY,
      w: element.size.w,
      h: element.size.h,
      valign: 'top',
    });
  }

  /**
   * 차트 요소 렌더링
   */
  private renderChartElement(
    slide: PptxGenJS.Slide,
    element: VisualElement,
    theme: ThemeConfig,
    adjustedY: number
  ): void {
    const content = element.content as { type?: string; labels?: string[]; datasets?: Array<{ name: string; values: number[] }> } | undefined;

    if (!content || !content.labels || !content.datasets) {
      slide.addText('[차트]', {
        x: element.position.x,
        y: adjustedY,
        w: element.size.w,
        h: element.size.h,
        fontSize: theme.styles.bodySize,
        color: theme.colors.muted.replace('#', ''),
        align: 'center',
        valign: 'middle',
      });
      return;
    }

    const chartType = this.mapChartType(content.type);
    const chartData: PptxGenJS.OptsChartData[] = content.datasets.map((ds) => ({
      name: ds.name,
      labels: content.labels!,
      values: ds.values,
    }));

    slide.addChart(chartType, chartData, {
      x: element.position.x,
      y: adjustedY,
      w: element.size.w,
      h: element.size.h,
      showLegend: true,
      legendPos: 'b',
      chartColors: [
        theme.colors.primary.replace('#', ''),
        theme.colors.secondary.replace('#', ''),
        theme.colors.accent.replace('#', ''),
      ],
    });
  }

  /**
   * 테이블 요소 렌더링
   */
  private renderTableElement(
    slide: PptxGenJS.Slide,
    element: VisualElement,
    theme: ThemeConfig,
    adjustedY: number
  ): void {
    const content = element.content as { headers?: string[]; rows?: string[][] } | undefined;

    if (!content || !content.headers || !content.rows) {
      slide.addText('[테이블]', {
        x: element.position.x,
        y: adjustedY,
        w: element.size.w,
        h: element.size.h,
        fontSize: theme.styles.bodySize,
        color: theme.colors.muted.replace('#', ''),
        align: 'center',
        valign: 'middle',
      });
      return;
    }

    const tableData: PptxGenJS.TableRow[] = [
      content.headers.map((header) => ({
        text: header,
        options: {
          bold: true,
          fill: { color: theme.colors.primary.replace('#', '') },
          color: 'FFFFFF',
          fontSize: 14,
        },
      })),
      ...content.rows.map((row, idx) =>
        row.map((cell) => ({
          text: cell,
          options: {
            color: theme.colors.text.replace('#', ''),
            fontSize: 12,
            fill: { color: idx % 2 === 0 ? 'F8F9FA' : 'FFFFFF' },
          },
        }))
      ),
    ];

    slide.addTable(tableData, {
      x: element.position.x,
      y: adjustedY,
      w: element.size.w,
      colW: Array(content.headers.length).fill(element.size.w / content.headers.length),
      fontFace: theme.fonts.body,
      border: { pt: 0.5, color: theme.colors.muted.replace('#', '') },
      align: 'center',
      valign: 'middle',
    });
  }

  /**
   * 도형 요소 렌더링
   */
  private renderShapeElement(
    slide: PptxGenJS.Slide,
    element: VisualElement,
    theme: ThemeConfig,
    adjustedY: number
  ): void {
    slide.addShape('rect', {
      x: element.position.x,
      y: adjustedY,
      w: element.size.w,
      h: element.size.h,
      fill: element.style.fill || { color: theme.colors.primary.replace('#', '') },
      line: element.style.line || { color: theme.colors.primary.replace('#', ''), pt: 1 },
    });
  }

  /**
   * BulletContent 타입 체크
   */
  private isBulletContent(content: unknown): content is BulletContent {
    return (
      typeof content === 'object' &&
      content !== null &&
      'items' in content &&
      Array.isArray((content as BulletContent).items)
    );
  }

  /**
   * 불릿 스타일에 따른 문자 코드 반환
   */
  private getBulletChar(style: ThemeConfig['styles']['bulletStyle']): string {
    switch (style) {
      case 'circle':
        return '25CF';
      case 'square':
        return '25A0';
      case 'arrow':
        return '25B6';
      case 'dash':
        return '2014';
      default:
        return '25CF';
    }
  }

  /**
   * 차트 타입 매핑
   */
  private mapChartType(type?: string): PptxGenJS.CHART_NAME {
    switch (type) {
      case 'bar':
        return 'bar';
      case 'line':
        return 'line';
      case 'pie':
        return 'pie';
      case 'doughnut':
        return 'doughnut';
      case 'area':
        return 'area';
      default:
        return 'bar';
    }
  }

  /**
   * 색상 어둡게 조정
   */
  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
}

/**
 * PPT Builder 에이전트 인스턴스 생성
 */
export function createPPTBuilder(): Agent<PPTBuilderInput, PPTBuilderOutput> {
  return new PPTBuilderAgent();
}

/**
 * PPT Builder 실행 헬퍼 함수
 */
export async function buildPPT(
  input: PPTBuilderInput
): Promise<AgentResult<PPTBuilderOutput>> {
  const agent = createPPTBuilder();
  return agent.execute(input);
}
