import { NextResponse } from 'next/server';
import { buildCatalogResponse } from '@/src/lib/providerCatalog';
import { getModelsForModule } from '@/src/lib/modelRegistry';
import { getProviderMeta } from '@/src/lib/modelProviders';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'es';
    const catalog = buildCatalogResponse(lang);

    const categoriesWithModels = catalog.categories.map((cat) => ({
      ...cat,
      modules: cat.modules.map((mod) => {
        const models = getModelsForModule(mod.id).map((m) => {
          const meta = getProviderMeta(m.provider);
          return {
            model_key: m.id,
            name: m.name,
            endpoint: m.endpoint,
            model_kind: m.kind,
            provider_id: m.provider,
            provider_label: lang === 'es' ? (meta.labelEs || meta.label) : meta.label,
            provider_docs_url: meta.docsUrl || null,
            supports_direct: Boolean(meta.supportsDirect),
          };
        });
        return { ...mod, models, model_count: models.length };
      }),
    }));

    return NextResponse.json({
      ok: true,
      ...catalog,
      categories: categoriesWithModels,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
