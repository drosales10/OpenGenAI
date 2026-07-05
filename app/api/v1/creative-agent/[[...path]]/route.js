import { NextResponse } from 'next/server';
import { resolveMuapiProxyAuth } from '@/src/lib/server/muapiProxyAuth';
import { recordProviderRequest } from '@/src/lib/db/providerUsage';
import { enforceMuapiQuota } from '@/src/lib/server/muapiQuota';
import { extractProviderRequestContext } from '@/src/lib/server/providerRequestContext';

const MUAPI_BASE = 'https://api.muapi.ai';

function getApiKey(request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    const headerKey = request.headers.get('x-api-key');
    if (headerKey) return headerKey;
    const cookieKey = request.cookies.get('muapi_key')?.value;
    return cookieKey;
}

function cleanHeaders(request) {
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.delete('cookie');
    headers.delete('Authorization');
    headers.delete('x-api-key');
    return headers;
}

export async function GET(request, { params }) {
    const startedAt = Date.now();
    const requestContext = extractProviderRequestContext(request);
    const slug = await params;
    const pathSegments = slug.path || [];
    const path = pathSegments.join('/');
    
    const { search } = new URL(request.url);
    const targetUrl = `${MUAPI_BASE}/api/v1/creative-agent/${path}${search}`;

    const headers = cleanHeaders(request);
    const auth = await resolveMuapiProxyAuth(request, getApiKey, 'creative-agent');
    if (!auth.ok) return auth.response;
    const quota = await enforceMuapiQuota({ routeGroup: 'creative-agent', userId: auth.userId, projectId: requestContext.projectId });
    if (!quota.ok) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'creative-agent', method: 'GET', targetPath: `/api/v1/creative-agent/${path}`, statusCode: 429, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', reason: 'quota' } });
        return quota.response;
    }
    headers.set('x-api-key', auth.apiKey);

    try {
        const response = await fetch(targetUrl, { headers, method: 'GET' });
        const data = await response.json();
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'creative-agent', method: 'GET', targetPath: `/api/v1/creative-agent/${path}`, statusCode: response.status, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '' } });
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'creative-agent', method: 'GET', targetPath: `/api/v1/creative-agent/${path}`, statusCode: 500, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', error: error.message } });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const startedAt = Date.now();
    const requestContext = extractProviderRequestContext(request);
    const slug = await params;
    const pathSegments = slug.path || [];
    const path = pathSegments.join('/');
    
    const { search } = new URL(request.url);
    const targetUrl = `${MUAPI_BASE}/api/v1/creative-agent/${path}${search}`;

    const headers = cleanHeaders(request);
    const auth = await resolveMuapiProxyAuth(request, getApiKey, 'creative-agent');
    if (!auth.ok) return auth.response;
    const quota = await enforceMuapiQuota({ routeGroup: 'creative-agent', userId: auth.userId, projectId: requestContext.projectId });
    if (!quota.ok) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'creative-agent', method: 'POST', targetPath: `/api/v1/creative-agent/${path}`, statusCode: 429, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', reason: 'quota' } });
        return quota.response;
    }
    headers.set('x-api-key', auth.apiKey);

    try {
        const body = await request.arrayBuffer();
        const response = await fetch(targetUrl, { method: 'POST', headers, body });
        const data = await response.json();
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'creative-agent', method: 'POST', targetPath: `/api/v1/creative-agent/${path}`, statusCode: response.status, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '' } });
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'creative-agent', method: 'POST', targetPath: `/api/v1/creative-agent/${path}`, statusCode: 500, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', error: error.message } });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    const startedAt = Date.now();
    const requestContext = extractProviderRequestContext(request);
    const slug = await params;
    const pathSegments = slug.path || [];
    const path = pathSegments.join('/');
    
    const { search } = new URL(request.url);
    const targetUrl = `${MUAPI_BASE}/api/v1/creative-agent/${path}${search}`;

    const headers = cleanHeaders(request);
    const auth = await resolveMuapiProxyAuth(request, getApiKey, 'creative-agent');
    if (!auth.ok) return auth.response;
    const quota = await enforceMuapiQuota({ routeGroup: 'creative-agent', userId: auth.userId, projectId: requestContext.projectId });
    if (!quota.ok) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'creative-agent', method: 'PATCH', targetPath: `/api/v1/creative-agent/${path}`, statusCode: 429, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', reason: 'quota' } });
        return quota.response;
    }
    headers.set('x-api-key', auth.apiKey);

    try {
        const body = await request.arrayBuffer();
        const response = await fetch(targetUrl, { method: 'PATCH', headers, body });
        const data = await response.json();
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'creative-agent', method: 'PATCH', targetPath: `/api/v1/creative-agent/${path}`, statusCode: response.status, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '' } });
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'creative-agent', method: 'PATCH', targetPath: `/api/v1/creative-agent/${path}`, statusCode: 500, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', error: error.message } });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const startedAt = Date.now();
    const requestContext = extractProviderRequestContext(request);
    const slug = await params;
    const pathSegments = slug.path || [];
    const path = pathSegments.join('/');
    
    const { search } = new URL(request.url);
    const targetUrl = `${MUAPI_BASE}/api/v1/creative-agent/${path}${search}`;

    const headers = cleanHeaders(request);
    const auth = await resolveMuapiProxyAuth(request, getApiKey, 'creative-agent');
    if (!auth.ok) return auth.response;
    const quota = await enforceMuapiQuota({ routeGroup: 'creative-agent', userId: auth.userId, projectId: requestContext.projectId });
    if (!quota.ok) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'creative-agent', method: 'DELETE', targetPath: `/api/v1/creative-agent/${path}`, statusCode: 429, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', reason: 'quota' } });
        return quota.response;
    }
    headers.set('x-api-key', auth.apiKey);

    try {
        const response = await fetch(targetUrl, { method: 'DELETE', headers });
        const data = await response.json();
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'creative-agent', method: 'DELETE', targetPath: `/api/v1/creative-agent/${path}`, statusCode: response.status, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '' } });
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'creative-agent', method: 'DELETE', targetPath: `/api/v1/creative-agent/${path}`, statusCode: 500, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', error: error.message } });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
