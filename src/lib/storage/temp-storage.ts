/**
 * 임시 파일 저장소
 * 파일과 생성된 PPT를 임시로 저장하고 관리
 */

import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { nanoid } from 'nanoid';
import type { ExtractedContent, FileType } from '@/types/ppt';

// 임시 저장소 기본 경로
const TEMP_BASE_DIR = join(tmpdir(), 'ppt-creator');

// 파일 만료 시간 (30분)
const FILE_EXPIRY_MS = 30 * 60 * 1000;

/**
 * 저장된 파일 메타데이터
 */
interface StoredFileMetadata {
  id: string;
  originalName: string;
  fileType: FileType;
  size: number;
  extractedContent: ExtractedContent;
  createdAt: number;
  expiresAt: number;
}

/**
 * 생성된 PPT 메타데이터
 */
interface StoredPPTMetadata {
  id: string;
  fileName: string;
  size: number;
  createdAt: number;
  expiresAt: number;
}

/**
 * 글로벌 저장소 타입 (개발 모드에서 핫 리로드 시 데이터 유지용)
 */
interface GlobalStorage {
  fileMetadataStore: Map<string, StoredFileMetadata>;
  pptMetadataStore: Map<string, StoredPPTMetadata>;
}

// 글로벌 객체에 저장소 유지 (개발 모드에서 모듈 리로드 시에도 데이터 보존)
const globalForStorage = globalThis as unknown as {
  pptCreatorStorage: GlobalStorage | undefined;
};

// 기존 글로벌 저장소가 있으면 재사용, 없으면 새로 생성
if (!globalForStorage.pptCreatorStorage) {
  globalForStorage.pptCreatorStorage = {
    fileMetadataStore: new Map<string, StoredFileMetadata>(),
    pptMetadataStore: new Map<string, StoredPPTMetadata>(),
  };
}

// 메모리 내 메타데이터 저장소 (글로벌 참조)
const fileMetadataStore = globalForStorage.pptCreatorStorage.fileMetadataStore;
const pptMetadataStore = globalForStorage.pptCreatorStorage.pptMetadataStore;

/**
 * 저장소 디렉토리 초기화
 */
async function ensureStorageDir(): Promise<void> {
  if (!existsSync(TEMP_BASE_DIR)) {
    await mkdir(TEMP_BASE_DIR, { recursive: true });
  }
}

/**
 * 파일 경로 생성
 */
function getFilePath(id: string, extension: string): string {
  return join(TEMP_BASE_DIR, `${id}.${extension}`);
}

/**
 * 업로드된 파일 저장
 */
export async function saveUploadedFile(
  content: string,
  originalName: string,
  fileType: FileType,
  extractedContent: ExtractedContent
): Promise<{ id: string; metadata: StoredFileMetadata }> {
  await ensureStorageDir();

  const id = nanoid(12);
  const now = Date.now();

  const metadata: StoredFileMetadata = {
    id,
    originalName,
    fileType,
    size: Buffer.byteLength(content, 'utf-8'),
    extractedContent,
    createdAt: now,
    expiresAt: now + FILE_EXPIRY_MS,
  };

  // 파일 저장
  const filePath = getFilePath(id, 'txt');
  await writeFile(filePath, content, 'utf-8');

  // 메타데이터 저장
  fileMetadataStore.set(id, metadata);

  // 만료된 파일 정리 (비동기)
  cleanupExpiredFiles().catch(console.error);

  return { id, metadata };
}

/**
 * 저장된 파일 조회
 */
export async function getUploadedFile(
  id: string
): Promise<{ content: string; metadata: StoredFileMetadata } | null> {
  const metadata = fileMetadataStore.get(id);

  if (!metadata) {
    return null;
  }

  // 만료 확인
  if (Date.now() > metadata.expiresAt) {
    await deleteUploadedFile(id);
    return null;
  }

  try {
    const filePath = getFilePath(id, 'txt');
    const content = await readFile(filePath, 'utf-8');
    return { content, metadata };
  } catch {
    fileMetadataStore.delete(id);
    return null;
  }
}

/**
 * 저장된 파일 삭제
 */
export async function deleteUploadedFile(id: string): Promise<void> {
  const metadata = fileMetadataStore.get(id);

  if (metadata) {
    try {
      const filePath = getFilePath(id, 'txt');
      await unlink(filePath);
    } catch {
      // 파일이 이미 없을 수 있음
    }
    fileMetadataStore.delete(id);
  }
}

/**
 * 생성된 PPT 저장
 */
export async function savePPTFile(
  buffer: Buffer,
  originalFileName: string
): Promise<{ id: string; metadata: StoredPPTMetadata }> {
  await ensureStorageDir();

  const id = nanoid(12);
  const now = Date.now();
  const fileName = `${originalFileName.replace(/\.[^/.]+$/, '')}_presentation.pptx`;

  const metadata: StoredPPTMetadata = {
    id,
    fileName,
    size: buffer.length,
    createdAt: now,
    expiresAt: now + FILE_EXPIRY_MS,
  };

  // 파일 저장
  const filePath = getFilePath(id, 'pptx');
  await writeFile(filePath, buffer);

  // 메타데이터 저장
  pptMetadataStore.set(id, metadata);

  return { id, metadata };
}

/**
 * 저장된 PPT 조회
 */
export async function getPPTFile(
  id: string
): Promise<{ buffer: Buffer; metadata: StoredPPTMetadata } | null> {
  const metadata = pptMetadataStore.get(id);

  if (!metadata) {
    return null;
  }

  // 만료 확인
  if (Date.now() > metadata.expiresAt) {
    await deletePPTFile(id);
    return null;
  }

  try {
    const filePath = getFilePath(id, 'pptx');
    const buffer = await readFile(filePath);
    return { buffer, metadata };
  } catch {
    pptMetadataStore.delete(id);
    return null;
  }
}

/**
 * 저장된 PPT 삭제
 */
export async function deletePPTFile(id: string): Promise<void> {
  const metadata = pptMetadataStore.get(id);

  if (metadata) {
    try {
      const filePath = getFilePath(id, 'pptx');
      await unlink(filePath);
    } catch {
      // 파일이 이미 없을 수 있음
    }
    pptMetadataStore.delete(id);
  }
}

/**
 * 만료된 파일 정리
 */
async function cleanupExpiredFiles(): Promise<void> {
  const now = Date.now();

  // 만료된 업로드 파일 정리
  for (const [id, metadata] of fileMetadataStore.entries()) {
    if (now > metadata.expiresAt) {
      await deleteUploadedFile(id);
    }
  }

  // 만료된 PPT 파일 정리
  for (const [id, metadata] of pptMetadataStore.entries()) {
    if (now > metadata.expiresAt) {
      await deletePPTFile(id);
    }
  }
}

/**
 * 파일 메타데이터만 조회 (파일 내용 없이)
 */
export function getFileMetadata(id: string): StoredFileMetadata | null {
  const metadata = fileMetadataStore.get(id);

  if (!metadata) {
    return null;
  }

  // 만료 확인
  if (Date.now() > metadata.expiresAt) {
    return null;
  }

  return metadata;
}

/**
 * PPT 메타데이터만 조회
 */
export function getPPTMetadata(id: string): StoredPPTMetadata | null {
  const metadata = pptMetadataStore.get(id);

  if (!metadata) {
    return null;
  }

  // 만료 확인
  if (Date.now() > metadata.expiresAt) {
    return null;
  }

  return metadata;
}
