import { useState } from 'react';

import { Bouton, Carte, Champ, Ecran, Texte } from '@/components/ui';
import { Couleurs } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const ESSAIS_MAX = 5;

/** E02 : connexion sans mot de passe, par code à 6 chiffres reçu par e-mail (US02). */
export default function Connexion() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeEnvoye, setCodeEnvoye] = useState(false);
  const [echecs, setEchecs] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const envoyerCode = async () => {
    if (!supabase) return;
    setEnCours(true);
    setErreur(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setEnCours(false);
    if (error) {
      setErreur('Nous n’avons pas pu envoyer le code. Vérifiez votre adresse et votre connexion.');
      return;
    }
    setCode('');
    setEchecs(0);
    setCodeEnvoye(true);
  };

  const verifierCode = async () => {
    if (!supabase) return;
    setEnCours(true);
    setErreur(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
    setEnCours(false);
    if (error) {
      setEchecs(echecs + 1);
      setErreur(
        echecs + 1 >= ESSAIS_MAX
          ? 'Ce code ne fonctionne pas. Demandez-en un nouveau.'
          : 'Ce code est faux ou a expiré. Vérifiez les 6 chiffres reçus par e-mail.',
      );
    }
    // En cas de succès, la session change et la navigation bascule d'elle-même vers l'accueil.
  };

  return (
    <Ecran
      bas={
        codeEnvoye ? (
          <>
            <Bouton
              libelle="Me connecter"
              onPress={verifierCode}
              desactive={enCours || code.length !== 6 || echecs >= ESSAIS_MAX}
            />
            <Bouton variante="lien" libelle="Recevoir un nouveau code" onPress={envoyerCode} desactive={enCours} />
            <Bouton variante="lien" libelle="Changer d’adresse e-mail" onPress={() => setCodeEnvoye(false)} />
          </>
        ) : (
          <Bouton libelle="Recevoir un code" onPress={envoyerCode} desactive={enCours || !emailValide} />
        )
      }>
      <Texte variante="titre">{codeEnvoye ? 'Saisissez le code' : 'Connexion'}</Texte>
      {codeEnvoye ? (
        <>
          <Texte>
            Nous avons envoyé un code à 6 chiffres à <Texte variante="corpsGras">{email.trim()}</Texte>. Il est
            valable 10 minutes.
          </Texte>
          <Champ
            libelle="Code reçu"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
          />
        </>
      ) : (
        <>
          <Texte>Pas de mot de passe à retenir : nous vous envoyons un code par e-mail.</Texte>
          <Champ
            libelle="Votre adresse e-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="exemple@mail.fr"
          />
        </>
      )}
      {erreur ? (
        <Carte ton="erreur">
          <Texte couleur={Couleurs.erreur}>{erreur}</Texte>
        </Carte>
      ) : null}
    </Ecran>
  );
}
