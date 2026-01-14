'use client';

/**
 * 다운로드 버튼 컴포넌트
 * 생성 완료 후 PPT 파일 다운로드
 */

import { useState } from 'react';
import { usePPTStore, selectCanDownload } from '@/store/ppt-store';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileDown } from 'lucide-react';

export function DownloadButton() {
  const canDownload = usePPTStore(selectCanDownload);
  const generatedFileId = usePPTStore((state) => state.generatedFileId);
  const uploadedFile = usePPTStore((state) => state.uploadedFile);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!generatedFileId) return;

    setIsDownloading(true);

    try {
      const response = await fetch(`/api/download/${generatedFileId}`);

      if (!response.ok) {
        throw new Error('다운로드 실패');
      }

      // Blob으로 변환
      const blob = await response.blob();

      // 다운로드 링크 생성
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        uploadedFile?.name.replace(/\.[^/.]+$/, '') + '_presentation.pptx' ||
        'presentation.pptx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('파일 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!canDownload) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-8">
      <div className="rounded-full bg-primary/10 p-4">
        <FileDown className="h-8 w-8 text-primary" />
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold">PPT가 준비되었습니다!</h3>
        <p className="text-sm text-muted-foreground">
          아래 버튼을 클릭하여 프레젠테이션을 다운로드하세요
        </p>
      </div>

      <Button
        size="lg"
        onClick={handleDownload}
        disabled={isDownloading}
        className="gap-2"
      >
        {isDownloading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            다운로드 중...
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            PPT 다운로드
          </>
        )}
      </Button>
    </div>
  );
}
