import { NextResponse } from 'next/server';
import { resolveAgentApiUser } from '@/src/lib/server/agentAuth';
import { executeLocalAgentChat } from '@/src/lib/server/agentChat';
import {
  listAgentSkills,
  listTemplateAgents,
  listFeaturedAgents,
  listUserAgents,
  getAgentBySlugOrPublicId,
  createAgent,
  updateAgentBySlugOrPublicId,
  deleteAgentBySlugOrPublicId,
  toggleAgentLike,
  getAgentProfile,
  suggestAgentFromPrompt,
} from '@/src/lib/db/agents';
import {
  listUserConversations,
  getConversationHistory,
} from '@/src/lib/db/agentConversations';

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function notFound(message = 'Not found') {
  return json({ detail: message, error: message }, 404);
}

export async function handleLocalAgentsRequest(request, pathSegments, method) {
  const path = (pathSegments || []).join('/');
  const needsAuth = !['skills', 'templates/agents', 'featured/agents'].includes(path)
    && !path.match(/^by-slug\/[^/]+$/) // GET agent detail can be public
    && !path.match(/^[^/]+\/profile$/);

  const auth = await resolveAgentApiUser(request, { allowFallback: true });
  if (!auth.ok && needsAuth) return auth.response;

  const userId = auth.ok ? auth.userId : null;

  try {
    // GET /skills
    if (path === 'skills' && method === 'GET') {
      return json(await listAgentSkills());
    }

    // GET /templates/agents
    if (path === 'templates/agents' && method === 'GET') {
      return json(await listTemplateAgents());
    }

    // GET /featured/agents
    if (path === 'featured/agents' && method === 'GET') {
      return json(await listFeaturedAgents());
    }

    // GET /user/agents
    if (path === 'user/agents' && method === 'GET') {
      return json(await listUserAgents(userId));
    }

    // GET /user/conversations
    if (path === 'user/conversations' && method === 'GET') {
      return json(await listUserConversations(userId));
    }

    // POST /suggest
    if (path === 'suggest' && method === 'POST') {
      const body = await request.json();
      return json(await suggestAgentFromPrompt(body.prompt));
    }

    // POST / (create)
    if (path === '' && method === 'POST') {
      if (!auth.ok) return auth.response;
      const body = await request.json();
      const agent = await createAgent(body, userId);
      return json(agent, 201);
    }

    // GET /by-slug/:slug
    const bySlugGet = path.match(/^by-slug\/([^/]+)$/);
    if (bySlugGet && method === 'GET') {
      const agent = await getAgentBySlugOrPublicId(bySlugGet[1], { viewerUserId: userId });
      if (!agent) return notFound('Agent not found');
      return json(agent);
    }

    // PUT /by-slug/:slug
    if (bySlugGet && method === 'PUT') {
      if (!auth.ok) return auth.response;
      const body = await request.json();
      const result = await updateAgentBySlugOrPublicId(bySlugGet[1], body, userId);
      if (result.error) return json({ detail: result.error, error: result.error }, result.status);
      return json(result.agent);
    }

    // DELETE /by-slug/:slug
    if (bySlugGet && method === 'DELETE') {
      if (!auth.ok) return auth.response;
      const result = await deleteAgentBySlugOrPublicId(bySlugGet[1], userId);
      if (result.error) return json({ detail: result.error, error: result.error }, result.status);
      return json({ ok: true });
    }

    // POST /by-slug/:slug/chat
    const chatMatch = path.match(/^by-slug\/([^/]+)\/chat$/);
    if (chatMatch && method === 'POST') {
      if (!auth.ok) return auth.response;
      const body = await request.json();
      const agent = await getAgentBySlugOrPublicId(chatMatch[1], { viewerUserId: userId });
      if (!agent) return notFound('Agent not found');
      const result = await executeLocalAgentChat({
        agent,
        agentIdentifier: chatMatch[1],
        userId,
        message: body.message,
        conversationId: body.conversation_id || null,
      });
      return json(result);
    }

    // POST /by-slug/:slug/like
    const likeMatch = path.match(/^by-slug\/([^/]+)\/like$/);
    if (likeMatch && method === 'POST') {
      if (!auth.ok) return auth.response;
      const { searchParams } = new URL(request.url);
      const isLike = searchParams.get('is_like') !== 'false';
      const result = await toggleAgentLike(likeMatch[1], userId, isLike);
      if (!result) return notFound('Agent not found');
      return json(result);
    }

    // GET /by-slug/:slug/:conversationId
    const historyMatch = path.match(/^by-slug\/([^/]+)\/([^/]+)$/);
    if (historyMatch && method === 'GET') {
      const history = await getConversationHistory(historyMatch[1], historyMatch[2], userId);
      if (!history) return notFound('Conversation not found');
      return json(history);
    }

    // GET /:slug/profile
    const profileMatch = path.match(/^([^/]+)\/profile$/);
    if (profileMatch && method === 'GET' && profileMatch[1] !== 'by-slug') {
      const profile = await getAgentProfile(profileMatch[1]);
      if (!profile) return notFound('Agent not found');
      return json(profile);
    }

    // POST /by-slug/:slug/preview-realign
    const realignMatch = path.match(/^by-slug\/([^/]+)\/preview-realign$/);
    if (realignMatch && method === 'POST') {
      if (!auth.ok) return auth.response;
      const body = await request.json();
      const agent = await getAgentBySlugOrPublicId(realignMatch[1], { viewerUserId: userId });
      if (!agent) return notFound('Agent not found');
      const updatedPrompt = `${agent.system_prompt}\n\nAdditional instructions:\n${body.instructions || body.prompt || ''}`.trim();
      return json({ system_prompt: updatedPrompt });
    }

    return notFound(`Unknown agents route: ${path}`);
  } catch (error) {
    console.error('[localAgents]', error);
    return json({ error: error.message, detail: error.message }, 500);
  }
}
