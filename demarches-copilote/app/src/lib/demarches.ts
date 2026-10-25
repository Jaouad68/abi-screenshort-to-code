import type { Answers } from './parcours/types';
import { supabase } from './supabase';

export type DemarcheEnCours = {
  id: string;
  procedure_slug: string;
  status: string;
  current_step: string | null;
  created_at: string;
};

export type ResultatCreation =
  | { ok: true; id: string }
  | { ok: false; raison: 'demo' | 'limite_gratuite' | 'erreur'; message: string };

export async function listerDemarchesEnCours(): Promise<DemarcheEnCours[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('user_procedures')
    .select('id, procedure_slug, status, current_step, created_at')
    .not('status', 'in', '(terminee,abandonnee)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function creerDemarche(
  slug: string,
  version: number,
  answers: Answers,
  premiereEtape: string | undefined,
): Promise<ResultatCreation> {
  if (!supabase) {
    return { ok: false, raison: 'demo', message: 'Mode démonstration : la démarche n’est pas enregistrée.' };
  }
  const { data, error } = await supabase
    .from('user_procedures')
    .insert({
      procedure_slug: slug,
      procedure_version: version,
      status: 'en_preparation',
      answers,
      current_step: premiereEtape ?? null,
    })
    .select('id')
    .single();
  if (!error) return { ok: true, id: data.id };
  // RG12 : la limite est vérifiée par un déclencheur SQL.
  if (error.message.includes('LIMITE_GRATUITE_DEMARCHES')) {
    return {
      ok: false,
      raison: 'limite_gratuite',
      message:
        'Avec l’offre gratuite, vous pouvez suivre une démarche à la fois. Terminez celle en cours ou passez à l’offre Sérénité.',
    };
  }
  return { ok: false, raison: 'erreur', message: 'L’enregistrement a échoué. Vérifiez votre connexion et réessayez.' };
}
