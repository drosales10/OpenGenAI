import { NextResponse } from 'next/server';
import { requireInternalApiKey } from '@/src/lib/server/internalAuth';
import { getMuapiProviderConfig } from '@/src/lib/db/providers';

export const runtime = 'nodejs';

async function proxyMuapi(request, params) {
  const auth = await requireInternalApiKey(request);
  if (!auth.ok) return auth.response;

  const provider = await getMuapiProviderConfig();
  if (!provider.apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'MuAPI provider key is not configured on server',
      },
      { status: 412 }
    );
  }

  const base = (provider.baseUrl || 'https://api.muapi.ai').replace(/\/$/, '');
  const pathParts = params?.path || [];
  const upstreamPath = `/${pathParts.join('/')}`;

  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(`${base}${upstreamPath}`);
  upstreamUrl.search = incomingUrl.search;

  const headers = {
    'x-api-key': provider.apiKey,
  };

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers['content-type'] = contentType;
  }

  const accept = request.headers.get('accept');
  if (accept) {
    headers.accept = accept;
  }

  const method = request.method;
  const bodyAllowed = method !== 'GET' && method !== 'HEAD';
  const rawBody = bodyAllowed ? await request.arrayBuffer() : undefined;

  const response = await fetch(upstreamUrl, {
    method,
    headers,
    body: rawBody,
  });

  const responseBytes = await response.arrayBuffer();
  const responseHeaders = new Headers();
  const responseContentType = response.headers.get('content-type');
  if (responseContentType) {
    responseHeaders.set('content-type', responseContentType);
  }

  return new NextResponse(responseBytes, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(request, { params }) {
  return proxyMuapi(request, params);
}

export async function POST(request, { params }) {
  return proxyMuapi(request, params);
}

export async function PUT(request, { params }) {
  return proxyMuapi(request, params);
}

export async function PATCH(request, { params }) {
  return proxyMuapi(request, params);
}

export async function DELETE(request, { params }) {
  return proxyMuapi(request, params);
}
