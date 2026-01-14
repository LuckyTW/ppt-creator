'use client';

/**
 * 파일 업로더 컴포넌트
 * 드래그 앤 드롭 및 클릭하여 파일 선택 지원
 */

import { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePPTStore } from '@/store/ppt-store';
import { cn } from '@/lib/utils';
import type { UploadResponse } from '@/types/ppt';

const ACCEPTED_EXTENSIONS = ['.txt', '.md'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function FileUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const {
    uploadedFile,
    isUploading,
    uploadError,
    setUploadedFile,
    setUploading,
    setUploadError,
    clearUploadedFile,
  } = usePPTStore();

  const handleFile = useCallback(
    async (file: File) => {
      // 파일 확장자 확인
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        setUploadError(
          `지원하지 않는 파일 형식입니다. 지원 형식: ${ACCEPTED_EXTENSIONS.join(', ')}`
        );
        return;
      }

      // 파일 크기 확인
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.`);
        return;
      }

      setUploading(true);
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result: UploadResponse = await response.json();

        if (!result.success || !result.data) {
          throw new Error(result.error?.message || '파일 업로드 실패');
        }

        setUploadedFile({
          id: result.data.fileId,
          name: result.data.fileName,
          type: result.data.fileType,
          size: file.size,
          extractedContent: {
            rawText: result.data.extractedContent.rawText,
            wordCount: result.data.extractedContent.wordCount,
            paragraphCount: 0,
            headings: [],
            lists: [],
            estimatedSlides: result.data.extractedContent.estimatedSlides,
          },
          uploadedAt: new Date(result.data.uploadedAt),
        });
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다.'
        );
      }
    },
    [setUploadedFile, setUploading, setUploadError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  // 업로드된 파일이 있는 경우
  if (uploadedFile) {
    return (
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{uploadedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {uploadedFile.extractedContent?.wordCount.toLocaleString()}단어 ·
                예상 {uploadedFile.extractedContent?.estimatedSlides}슬라이드
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearUploadedFile}
            aria-label="파일 제거"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 에러 메시지 */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* 드롭존 */}
      <Card
        className={cn(
          'relative cursor-pointer border-2 border-dashed transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          isUploading && 'pointer-events-none opacity-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label className="block cursor-pointer p-8">
          <input
            type="file"
            className="sr-only"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            onChange={handleInputChange}
            disabled={isUploading}
          />

          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isUploading ? '업로드 중...' : '파일을 드래그하거나 클릭하여 선택'}
              </p>
              <p className="text-sm text-muted-foreground">
                지원 형식: TXT, MD · 최대 5MB
              </p>
            </div>
          </div>
        </label>
      </Card>
    </div>
  );
}
