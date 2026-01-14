/**
 * PPT 다운로드 API
 * GET /api/download/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPPTFile } from '@/lib/storage/temp-storage';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: '파일 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 파일 조회
    const fileData = await getPPTFile(id);

    if (!fileData) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다. 파일이 만료되었을 수 있습니다.' },
        { status: 404 }
      );
    }

    // 파일 스트림 응답 (Buffer를 Uint8Array로 변환)
    return new Response(new Uint8Array(fileData.buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileData.metadata.fileName)}"`,
        'Content-Length': String(fileData.metadata.size),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Download error:', error);

    return NextResponse.json(
      { error: '파일 다운로드 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
