'use client';

/**
 * 생성 옵션 컴포넌트
 * 언어 선택 등 PPT 생성 옵션 설정
 */

import { usePPTStore } from '@/store/ppt-store';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { SupportedLanguage } from '@/types/ppt';

export function GenerationOptions() {
  const { generationOptions, setGenerationOptions } = usePPTStore();

  const handleLanguageChange = (value: string) => {
    setGenerationOptions({ language: value as SupportedLanguage });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">생성 옵션</h3>
          <p className="text-sm text-muted-foreground">
            프레젠테이션 생성에 적용할 옵션을 설정하세요
          </p>
        </div>

        {/* 언어 선택 */}
        <div className="space-y-3">
          <Label className="text-base">출력 언어</Label>
          <RadioGroup
            value={generationOptions.language}
            onValueChange={handleLanguageChange}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ko" id="lang-ko" />
              <Label htmlFor="lang-ko" className="cursor-pointer font-normal">
                한국어
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="en" id="lang-en" />
              <Label htmlFor="lang-en" className="cursor-pointer font-normal">
                English
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </Card>
  );
}
