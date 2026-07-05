import { NextResponse } from 'next/server';
import { resolveMuapiProxyAuth } from '@/src/lib/server/muapiProxyAuth';
import { recordProviderRequest } from '@/src/lib/db/providerUsage';
import { enforceMuapiQuota } from '@/src/lib/server/muapiQuota';
import { extractProviderRequestContext } from '@/src/lib/server/providerRequestContext';

const MUAPI_BASE = 'https://api.muapi.ai';

function getLegacyApiKey(request) {
    const headerKey = request.headers.get('x-api-key');
    if (headerKey) return headerKey;
    const cookieKey = request.cookies.get('muapi_key')?.value;
    return cookieKey;
}

function cleanHeaders(request) {
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.delete('cookie'); // CRITICAL: Stop forwarding browser cookies to MuAPI
    return headers;
}

// Build the target URL without a trailing slash when path is empty.
// e.g. GET /api/agents?is_template=true  → https://api.muapi.ai/agents?is_template=true
// e.g. GET /api/agents/by-slug/foo       → https://api.muapi.ai/agents/by-slug/foo
function buildTargetUrl(pathSegments, search) {
    const path = pathSegments.join('/');
    const base = `${MUAPI_BASE}/agents`;
    return path ? `${base}/${path}${search}` : `${base}${search}`;
}

export async function GET(request, { params }) {
    const startedAt = Date.now();
    const requestContext = extractProviderRequestContext(request);
    const slug = await params;
    const pathSegments = slug.path || [];
    const { search } = new URL(request.url);
    const targetUrl = buildTargetUrl(pathSegments, search);
    const targetPath = pathSegments.length ? `/agents/${pathSegments.join('/')}` : '/agents';

    const headers = cleanHeaders(request);
    const auth = await resolveMuapiProxyAuth(request, getLegacyApiKey, 'agents');
    if (!auth.ok) return auth.response;
    const quota = await enforceMuapiQuota({ routeGroup: 'agents', userId: auth.userId, projectId: requestContext.projectId });
    if (!quota.ok) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'agents', method: 'GET', targetPath, statusCode: 429, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', reason: 'quota' } });
        return quota.response;
    }
    headers.set('x-api-key', auth.apiKey);

    try {
        const response = await fetch(targetUrl, { headers, method: 'GET' });
        const data = await response.json();
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'agents', method: 'GET', targetPath, statusCode: response.status, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '' } });
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'agents', method: 'GET', targetPath, statusCode: 500, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', error: error.message } });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const startedAt = Date.now();
    const requestContext = extractProviderRequestContext(request);
    const slug = await params;
    const pathSegments = slug.path || [];
    const { search } = new URL(request.url);
    const targetUrl = buildTargetUrl(pathSegments, search);
    const targetPath = pathSegments.length ? `/agents/${pathSegments.join('/')}` : '/agents';

    const headers = cleanHeaders(request);
    const auth = await resolveMuapiProxyAuth(request, getLegacyApiKey, 'agents');
    if (!auth.ok) return auth.response;
    const quota = await enforceMuapiQuota({ routeGroup: 'agents', userId: auth.userId, projectId: requestContext.projectId });
    if (!quota.ok) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'agents', method: 'POST', targetPath, statusCode: 429, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', reason: 'quota' } });
        return quota.response;
    }
    headers.set('x-api-key', auth.apiKey);

    try {
        const body = await request.arrayBuffer();
        const response = await fetch(targetUrl, { method: 'POST', headers, body });
        const data = await response.json();
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'agents', method: 'POST', targetPath, statusCode: response.status, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '' } });
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'agents', method: 'POST', targetPath, statusCode: 500, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', error: error.message } });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const startedAt = Date.now();
    const requestContext = extractProviderRequestContext(request);
    const slug = await params;
    const pathSegments = slug.path || [];
    const { search } = new URL(request.url);
    const targetUrl = buildTargetUrl(pathSegments, search);
    const targetPath = pathSegments.length ? `/agents/${pathSegments.join('/')}` : '/agents';

    const headers = cleanHeaders(request);
    const auth = await resolveMuapiProxyAuth(request, getLegacyApiKey, 'agents');
    if (!auth.ok) return auth.response;
    const quota = await enforceMuapiQuota({ routeGroup: 'agents', userId: auth.userId, projectId: requestContext.projectId });
    if (!quota.ok) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'agents', method: 'DELETE', targetPath, statusCode: 429, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', reason: 'quota' } });
        return quota.response;
    }
    headers.set('x-api-key', auth.apiKey);

    try {
        const response = await fetch(targetUrl, { method: 'DELETE', headers });
        const data = await response.json();
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'agents', method: 'DELETE', targetPath, statusCode: response.status, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '' } });
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'agents', method: 'DELETE', targetPath, statusCode: 500, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', error: error.message } });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const startedAt = Date.now();
    const requestContext = extractProviderRequestContext(request);
    const slug = await params;
    const pathSegments = slug.path || [];
    const { search } = new URL(request.url);
    const targetUrl = buildTargetUrl(pathSegments, search);
    const targetPath = pathSegments.length ? `/agents/${pathSegments.join('/')}` : '/agents';

    const headers = cleanHeaders(request);
    const auth = await resolveMuapiProxyAuth(request, getLegacyApiKey, 'agents');
    if (!auth.ok) return auth.response;
    const quota = await enforceMuapiQuota({ routeGroup: 'agents', userId: auth.userId, projectId: requestContext.projectId });
    if (!quota.ok) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'agents', method: 'PUT', targetPath, statusCode: 429, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', reason: 'quota' } });
        return quota.response;
    }
    headers.set('x-api-key', auth.apiKey);

    try {
        const body = await request.arrayBuffer();
        const response = await fetch(targetUrl, { method: 'PUT', headers, body });
        const data = await response.json();
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'agents', method: 'PUT', targetPath, statusCode: response.status, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '' } });
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'agents', method: 'PUT', targetPath, statusCode: 500, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', error: error.message } });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
