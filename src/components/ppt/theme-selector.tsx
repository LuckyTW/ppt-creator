'use client';

/**
 * 테마 선택 컴포넌트
 * 4개의 테마 프리뷰 카드를 그리드로 표시
 */

import { usePPTStore } from '@/store/ppt-store';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { ThemeId } from '@/types/ppt';

export function ThemeSelector() {
  const { selectedTheme, availableThemes, setSelectedTheme } = usePPTStore();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">테마 선택</h3>
        <p className="text-sm text-muted-foreground">
          프레젠테이션에 적용할 디자인 테마를 선택하세요
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {availableThemes.map((theme) => (
          <ThemeCard
            key={theme.id}
            id={theme.id}
            name={theme.name}
            description={theme.description}
            colors={theme.previewColors}
            isSelected={selectedTheme === theme.id}
            onSelect={setSelectedTheme}
          />
        ))}
      </div>
    </div>
  );
}

interface ThemeCardProps {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
  };
  isSelected: boolean;
  onSelect: (id: ThemeId) => void;
}

function ThemeCard({
  id,
  name,
  description,
  colors,
  isSelected,
  onSelect,
}: ThemeCardProps) {
  return (
    <Card
      className={cn(
        'relative cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary/50',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={() => onSelect(id)}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(id);
        }
      }}
    >
      {/* 테마 프리뷰 */}
      <div
        className="aspect-[16/10] p-3"
        style={{ backgroundColor: colors.background }}
      >
        {/* 미니 슬라이드 프리뷰 */}
        <div className="flex h-full flex-col gap-2">
          {/* 제목 영역 */}
          <div
            className="h-3 w-3/4 rounded-sm"
            style={{ backgroundColor: colors.primary }}
          />
          {/* 본문 영역 */}
          <div className="flex-1 space-y-1">
            <div
              className="h-1.5 w-full rounded-sm opacity-30"
              style={{ backgroundColor: colors.primary }}
            />
            <div
              className="h-1.5 w-5/6 rounded-sm opacity-30"
              style={{ backgroundColor: colors.primary }}
            />
            <div
              className="h-1.5 w-4/6 rounded-sm opacity-30"
              style={{ backgroundColor: colors.primary }}
            />
          </div>
          {/* 액센트 바 */}
          <div
            className="h-1 w-full rounded-sm"
            style={{ backgroundColor: colors.secondary }}
          />
        </div>
      </div>

      {/* 테마 정보 */}
      <div className="border-t p-3">
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {description}
        </p>
      </div>

      {/* 선택 표시 */}
      {isSelected && (
        <div className="absolute right-2 top-2 rounded-full bg-primary p-1">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </Card>
  );
}
