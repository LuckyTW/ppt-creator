import type { SiteConfig, NavConfig } from "@/types";

/**
 * 사이트 기본 설정
 */
export const siteConfig: SiteConfig = {
  name: "PPT Creator",
  description: "텍스트 파일을 AI가 분석하여 전문적인 프레젠테이션을 자동 생성하는 서비스",
  url: "https://example.com",
  ogImage: "https://example.com/og.jpg",
  links: {
    github: "https://github.com",
  },
};

/**
 * 네비게이션 설정
 */
export const navConfig: NavConfig = {
  mainNav: [
    {
      title: "PPT 생성",
      href: "/generate",
    },
  ],
};
