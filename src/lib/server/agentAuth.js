import { NextResponse } from 'next/server';
import { findUserByInternalApiKey, ensureLocalAdminUser } from '@/src/lib/db/apiKeys';

function readInternalKey(request) {
  const headerKey = request.headers.get('x-internal-api-key');
  if (headerKey) return headerKey.trim();

  const cookieRaw = request.cookies.get('internal_api_key')?.value;
  if (!cookieRaw) return '';
  try {
    return decodeURIComponent(cookieRaw);
  } catch {
    return cookieRaw;
  }
}

/**
 * Resuelve el usuario para operaciones locales de agentes.
 * En self-host sin clave interna válida, usa el admin local por defecto.
 */
export async function resolveAgentApiUser(request, { allowFallback = true } = {}) {
  const internalKey = readInternalKey(request);
  if (internalKey) {
    const auth = await findUserByInternalApiKey(internalKey);
    if (auth) {
      return {
        ok: true,
        userId: Number(auth.user_id),
        email: auth.email,
        displayName: auth.display_name,
        authMode: 'internal',
      };
    }
    // Clave interna obsoleta: en self-host de un solo usuario, continuar con admin local
  }

  if (allowFallback) {
    const admin = await ensureLocalAdminUser();
    if (admin) {
      return {
        ok: true,
        userId: Number(admin.id),
        email: admin.email,
        displayName: admin.display_name,
        authMode: 'local-admin',
      };
    }
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: 'Authentication required', detail: 'Configura tu clave interna en Ajustes' },
      { status: 401 }
    ),
  };
}
