import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const vaultRoot = path.join(process.cwd(), 'content', 'docs');

function contentType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  return ({
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  } as Record<string, string>)[extension] ?? 'application/octet-stream';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const relativePath = (await params).path.map(decodeURIComponent).join(path.sep);
  const filePath = path.resolve(vaultRoot, relativePath);

  if (filePath !== vaultRoot && !filePath.startsWith(`${vaultRoot}${path.sep}`)) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: { 'Content-Type': contentType(filePath) },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
