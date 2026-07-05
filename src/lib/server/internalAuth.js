import { NextResponse } from 'next/server';
import { findUserByInternalApiKey } from '@/src/lib/db/apiKeys';

function extractApiKey(request) {
  const headerKey = request.headers.get('x-internal-api-key');
  if (headerKey) return headerKey.trim();

  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return '';
}

export async function requireInternalApiKey(request) {
  const apiKey = extractApiKey(request);
  if (!apiKey) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: 'Missing internal API key',
        },
        { status: 401 }
      ),
    };
  }

  const auth = await findUserByInternalApiKey(apiKey);
  if (!auth) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: 'Invalid internal API key',
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, auth };
}
