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
    headers.delete('cookie'); // CRITICAL: Stop forwarding browser cookies to MuAPI to avoid auth conflicts
    return headers;
}

export async function GET(request, { params }) {
    const startedAt = Date.now();
    const requestContext = extractProviderRequestContext(request);
    const slug = await params;
    const pathSegments = slug.path || [];
    const path = pathSegments.join('/');
    
    // Handle alias: get_upload_file -> get_file_upload_url
    const effectivePath = path === 'get_upload_file' ? 'get_file_upload_url' : path;
    
    const { search } = new URL(request.url);
    const targetUrl = `${MUAPI_BASE}/app/${effectivePath}${search}`;

    const headers = cleanHeaders(request);
    const auth = await resolveMuapiProxyAuth(request, getLegacyApiKey, 'app');
    if (!auth.ok) return auth.response;
    const quota = await enforceMuapiQuota({ routeGroup: 'app', userId: auth.userId, projectId: requestContext.projectId });
    if (!quota.ok) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'app', method: 'GET', targetPath: `/app/${effectivePath}`, statusCode: 429, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', reason: 'quota' } });
        return quota.response;
    }
    headers.set('x-api-key', auth.apiKey);

    try {
        const response = await fetch(targetUrl, {
            headers,
            method: 'GET',
        });

        const data = await response.json();

        // SPECIAL CASE: Intercept upload URL and redirect to local binary proxy
        if (effectivePath === 'get_file_upload_url' && data.url) {
            const originalS3Url = data.url;
            // We pass the real S3 URL as a header to our proxy
            data.url = `/api/upload-binary`;
            
            // Store target in a temporary way? 
            // Better: Return the target URL as an extra field that our proxy will look for
            data.fields = {
                ...data.fields,
                'x-proxy-target-url': originalS3Url
            };
        }

        await recordProviderRequest({ provider: 'muapi', routeGroup: 'app', method: 'GET', targetPath: `/app/${effectivePath}`, statusCode: response.status, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '' } });

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'app', method: 'GET', targetPath: `/app/${effectivePath}`, statusCode: 500, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', error: error.message } });
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
    const targetUrl = `${MUAPI_BASE}/app/${path}${search}`;

    const headers = cleanHeaders(request);
    const auth = await resolveMuapiProxyAuth(request, getLegacyApiKey, 'app');
    if (!auth.ok) return auth.response;
    const quota = await enforceMuapiQuota({ routeGroup: 'app', userId: auth.userId, projectId: requestContext.projectId });
    if (!quota.ok) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'app', method: 'POST', targetPath: `/app/${path}`, statusCode: 429, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', reason: 'quota' } });
        return quota.response;
    }
    headers.set('x-api-key', auth.apiKey);

    try {
        const body = await request.arrayBuffer();
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers,
            body
        });

        const data = await response.json();
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'app', method: 'POST', targetPath: `/app/${path}`, statusCode: response.status, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '' } });
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'app', method: 'POST', targetPath: `/app/${path}`, statusCode: 500, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', error: error.message } });
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
    const targetUrl = `${MUAPI_BASE}/app/${path}${search}`;

    const headers = cleanHeaders(request);
    const auth = await resolveMuapiProxyAuth(request, getLegacyApiKey, 'app');
    if (!auth.ok) return auth.response;
    const quota = await enforceMuapiQuota({ routeGroup: 'app', userId: auth.userId, projectId: requestContext.projectId });
    if (!quota.ok) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'app', method: 'DELETE', targetPath: `/app/${path}`, statusCode: 429, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', reason: 'quota' } });
        return quota.response;
    }
    headers.set('x-api-key', auth.apiKey);

    try {
        const response = await fetch(targetUrl, {
            method: 'DELETE',
            headers
        });
        const data = await response.json();
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'app', method: 'DELETE', targetPath: `/app/${path}`, statusCode: response.status, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '' } });
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'app', method: 'DELETE', targetPath: `/app/${path}`, statusCode: 500, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', error: error.message } });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const startedAt = Date.now();
    const requestContext = extractProviderRequestContext(request);
    const slug = await params;
    const pathSegments = slug.path || [];
    const path = pathSegments.join('/');
    
    const { search } = new URL(request.url);
    const targetUrl = `${MUAPI_BASE}/app/${path}${search}`;

    const headers = cleanHeaders(request);
    const auth = await resolveMuapiProxyAuth(request, getLegacyApiKey, 'app');
    if (!auth.ok) return auth.response;
    const quota = await enforceMuapiQuota({ routeGroup: 'app', userId: auth.userId, projectId: requestContext.projectId });
    if (!quota.ok) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'app', method: 'PUT', targetPath: `/app/${path}`, statusCode: 429, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', reason: 'quota' } });
        return quota.response;
    }
    headers.set('x-api-key', auth.apiKey);

    try {
        const body = await request.arrayBuffer();
        const response = await fetch(targetUrl, {
            method: 'PUT',
            headers,
            body
        });
        const data = await response.json();
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'app', method: 'PUT', targetPath: `/app/${path}`, statusCode: response.status, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '' } });
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        await recordProviderRequest({ provider: 'muapi', routeGroup: 'app', method: 'PUT', targetPath: `/app/${path}`, statusCode: 500, durationMs: Date.now() - startedAt, authMode: auth.authMode, userId: auth.userId, projectId: requestContext.projectId, requestMeta: { query: search || '', error: error.message } });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
