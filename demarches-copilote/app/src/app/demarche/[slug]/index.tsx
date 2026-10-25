import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { BandeauNonOfficiel, Bouton, BoutonEcouter, Choix, Ecran, Texte } from '@/components/ui';
import { Couleurs, Espace } from '@/constants/theme';
import { useParcours } from '@/hooks/use-parcours';
import { nomDuSite } from '@/lib/intention';
import { pruneAnswers, visibleQuestions } from '@/lib/parcours/evaluer';
import type { Answers, Procedure } from '@/lib/parcours/types';

/** E04 : une question par écran, au plus 4 réponses (US05). */
export default function Diagnostic() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const etat = useParcours(slug);

  if (etat.statut === 'chargement') {
    return (
      <Ecran>
        <ActivityIndicator size="large" color={Couleurs.principal} />
      </Ecran>
    );
  }
  if (etat.statut === 'introuvable') {
    return (
      <Ecran>
        <Texte>Cette démarche n’est pas disponible pour le moment.</Texte>
        <Bouton libelle="Revenir à l’accueil" onPress={() => router.back()} />
      </Ecran>
    );
  }
  return <Questions parcours={etat.parcours} />;
}

function Questions({ parcours }: { parcours: Procedure }) {
  const [reponses, setReponses] = useState<Answers>({});
  const [etape, setEtape] = useState(0);

  const questions = visibleQuestions(parcours.content, reponses);
  const question = questions[Math.min(etape, questions.length - 1)];

  const repondre = (valeur: string) => {
    const suivantes = pruneAnswers(parcours.content, { ...reponses, [question.id]: valeur });
    setReponses(suivantes);
    const restantes = visibleQuestions(parcours.content, suivantes);
    const index = restantes.findIndex((q) => q.id === question.id);
    if (index + 1 < restantes.length) {
      setEtape(index + 1);
    } else {
      // Diagnostic complet. On reste sur la dernière question pour pouvoir revenir et changer d'avis.
      router.push({
        pathname: '/demarche/[slug]/resultat',
        params: { slug: parcours.slug, version: String(parcours.version), reponses: JSON.stringify(suivantes) },
      });
    }
  };

  const texteLu = `${question.label} ${question.choices.map((c) => c.label).join('. ')}`;

  return (
    <Ecran
      bas={
        <>
          {etape > 0 ? (
            <Bouton variante="secondaire" libelle="Question précédente" onPress={() => setEtape(etape - 1)} />
          ) : null}
          <Texte variante="petit" couleur={Couleurs.texteSecondaire} style={{ textAlign: 'center' }}>
            Question {etape + 1} sur {questions.length}
          </Texte>
        </>
      }>
      <BandeauNonOfficiel siteOfficiel={{ nom: nomDuSite(parcours.officialUrl), url: parcours.officialUrl }} />
      <Texte variante="petit" couleur={Couleurs.texteSecondaire}>
        {parcours.title}
      </Texte>
      <Texte variante="titre" accessibilityRole="header">
        {question.label}
      </Texte>
      <View style={{ gap: Espace.m }} accessibilityRole="radiogroup">
        {question.choices.map((c) => (
          <Choix
            key={c.value}
            libelle={c.label}
            choisi={reponses[question.id] === c.value}
            onPress={() => repondre(c.value)}
          />
        ))}
      </View>
      <BoutonEcouter texte={texteLu} />
    </Ecran>
  );
}
