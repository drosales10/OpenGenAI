import { handleLocalAgentsRequest } from '@/src/lib/server/localAgentsHandler';
import { bootstrapDatabase } from '@/src/lib/db/bootstrap';

export const runtime = 'nodejs';

let schemaReady = false;

async function ensureAgentsSchema() {
  if (schemaReady) return;
  await bootstrapDatabase();
  schemaReady = true;
}

async function dispatch(request, params, method) {
  await ensureAgentsSchema();
  const slug = await params;
  const pathSegments = slug.path || [];
  return handleLocalAgentsRequest(request, pathSegments, method);
}

export async function GET(request, ctx) {
  return dispatch(request, ctx.params, 'GET');
}

export async function POST(request, ctx) {
  return dispatch(request, ctx.params, 'POST');
}

export async function PUT(request, ctx) {
  return dispatch(request, ctx.params, 'PUT');
}

export async function DELETE(request, ctx) {
  return dispatch(request, ctx.params, 'DELETE');
}
