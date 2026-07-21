-- Rapprochement des libellés fournisseur avec les ingrédients connus par
-- similarité trigramme (pg_trgm, déjà activé en 0001_init.sql).
--
-- Fonction en `security invoker` (par défaut) : elle s'exécute avec les
-- droits de l'appelant et respecte donc la RLS de la table `ingredient`
-- sans avoir besoin de la redéclarer ici.

create or replace function rechercher_ingredients_similaires(
  p_etablissement_id uuid,
  p_libelle text,
  p_seuil real default 0.4
)
returns table (
  ingredient_id uuid,
  nom_normalise text,
  score real
)
language sql
stable
as $$
  select
    id as ingredient_id,
    nom_normalise,
    similarity(nom_normalise, p_libelle) as score
  from ingredient
  where etablissement_id = p_etablissement_id
    and similarity(nom_normalise, p_libelle) >= p_seuil
  order by score desc
  limit 5
$$;
