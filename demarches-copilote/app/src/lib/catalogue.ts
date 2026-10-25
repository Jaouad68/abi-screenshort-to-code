import cniPasseport from '../../../content/cni-passeport.v1.json';
import type { Procedure, ProcedureContent } from './parcours/types';
import { validateContent } from './parcours/valider';
import { supabase } from './supabase';

type Fichier = typeof cniPasseport;

function depuisFichier({ _meta, ...content }: Fichier): Procedure {
  return {
    slug: _meta.slug,
    version: _meta.version,
    title: _meta.title,
    officialUrl: _meta.official_url,
    sourceUrl: _meta.source_url,
    sourceUpdatedAt: _meta.source_updated_at,
    content: content as unknown as ProcedureContent,
  };
}

/** Contenu embarqué : mode démonstration et secours hors ligne. */
const EMBARQUES: Record<string, Procedure> = {
  'cni-passeport': depuisFichier(cniPasseport),
};

/**
 * Dernière version publiée d'un parcours (RG02).
 * Si le serveur est injoignable ou renvoie un contenu invalide, on retombe sur la version embarquée.
 */
export async function chargerParcours(slug: string, version?: number): Promise<Procedure | null> {
  if (supabase) {
    let query = supabase
      .from('procedures_catalog')
      .select('slug, version, title, official_url, source_url, source_updated_at, content')
      .eq('slug', slug)
      .eq('is_published', true);
    query = version ? query.eq('version', version) : query.order('version', { ascending: false }).limit(1);
    const { data, error } = await query.maybeSingle();
    if (!error && data && validateContent(data.content).length === 0) {
      return {
        slug: data.slug,
        version: data.version,
        title: data.title,
        officialUrl: data.official_url,
        sourceUrl: data.source_url,
        sourceUpdatedAt: data.source_updated_at,
        content: data.content as ProcedureContent,
      };
    }
  }
  return EMBARQUES[slug] ?? null;
}
