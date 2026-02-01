/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 代理音频流
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: '缺少 url 参数' },
        { status: 400 }
      );
    }

    // 安全检查：只允许代理音乐平台的音频和图片 CDN
    const allowedDomains = [
      'sycdn.kuwo.cn',
      'kwcdn.kuwo.cn',
      'img1.kwcdn.kuwo.cn',
      'img2.kwcdn.kuwo.cn',
      'img3.kwcdn.kuwo.cn',
      'img4.kwcdn.kuwo.cn',
      'music.163.com',
      'y.qq.com',
      'ws.stream.qqmusic.qq.com',
      'isure.stream.qqmusic.qq.com',
      'dl.stream.qqmusic.qq.com',
    ];

    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return NextResponse.json(
        { error: '无效的 URL' },
        { status: 400 }
      );
    }

    const isAllowed = allowedDomains.some(domain =>
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      console.warn(`拒绝代理音频请求: ${urlObj.hostname}`);
      return NextResponse.json(
        { error: '不允许的目标域名' },
        { status: 403 }
      );
    }

    // 发起请求获取音频流
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'http://www.kuwo.cn/',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: '获取音频失败' },
        { status: response.status }
      );
    }

    // 获取响应头
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');

    // 创建响应头
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    // 支持 Range 请求（用于音频拖动）
    const range = request.headers.get('range');
    if (range) {
      headers['Accept-Ranges'] = 'bytes';
    }

    // 返回音频流
    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('代理音频失败:', error);
    return NextResponse.json(
      {
        error: '代理请求失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
