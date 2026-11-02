import type { Metadata } from "next";

import { CONTACT_EMAIL, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: `Politique de confidentialité et traitement des données personnelles de ${SITE.name}.`,
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="mb-8 flex flex-col gap-2 border-b border-stone-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-700">
          Informations légales
        </p>
        <h1 className="font-editorial text-3xl font-semibold text-stone-900 sm:text-4xl">
          Politique de confidentialité
        </h1>
        <p className="text-sm text-stone-500">Dernière mise à jour : octobre 2026</p>
      </header>

      <div className="flex flex-col gap-6 text-sm leading-7 text-stone-600">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            1. Responsable du traitement
          </h2>
          <p>
            Les données personnelles collectées sur {SITE.name} sont traitées
            par l’organisation du concours, pour la gestion des comptes, des
            candidatures, des paiements, des votes et des résultats.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            2. Données collectées
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Identité et coordonnées : nom, e-mail, téléphone.</li>
            <li>
              Données de candidature : date de naissance, bio, photos, vidéos,
              informations sur l’équipe et, pour les mineurs, coordonnées du
              parent ou tuteur.
            </li>
            <li>
              Données de paiement : montant, référence de transaction, statut,
              preuve de paiement. Les données de carte bancaire ne sont jamais
              stockées sur la plateforme.
            </li>
            <li>
              Données techniques : adresses IP et empreintes d’appareil
              pseudonymisées, journaux de sécurité et de connexion.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            3. Finalités et bases légales
          </h2>
          <p>
            Les données sont utilisées pour exécuter le contrat d’inscription,
            gérer les paiements et les votes, assurer la sécurité de la
            plateforme, envoyer les notifications nécessaires et respecter nos
            obligations légales. Le traitement des données des mineurs repose
            sur l’autorisation du parent ou tuteur.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">4. Destinataires</h2>
          <p>
            Les données sont accessibles aux administrateurs et organisateurs
            habilités, ainsi qu’aux prestataires techniques nécessaires au
            fonctionnement du service : hébergement, base de données, stockage
            des médias, envoi d’e-mails et prestataire de paiement. Ces
            prestataires n’utilisent les données que pour les services
            concernés.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            5. Durée de conservation
          </h2>
          <p>
            Les données sont conservées pendant la durée nécessaire à la gestion
            du concours et des obligations comptables, puis supprimées ou
            anonymisées. Les jetons de réinitialisation de mot de passe et les
            compteurs de limitation de débit sont supprimés automatiquement
            après expiration.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">6. Sécurité</h2>
          <p>
            Les mots de passe sont hachés avec Argon2id. Les coordonnées
            sensibles des parents ou tuteurs sont chiffrées. L’accès aux
            espaces d’administration est réservé aux comptes autorisés et les
            actions sensibles sont journalisées.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">7. Vos droits</h2>
          <p>
            Vous pouvez demander l’accès, la rectification ou la suppression de
            vos données, ainsi que vous opposer à certains traitements. Pour
            exercer ces droits, écrivez à{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-clay-700 underline">
              {CONTACT_EMAIL}
            </a>
            . Une pièce d’identité peut être demandée pour vérifier votre
            demande.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">8. Cookies</h2>
          <p>
            La plateforme utilise uniquement des cookies strictement
            nécessaires à l’authentification et à la sécurité des sessions.
            Aucun cookie publicitaire n’est déposé.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">9. Mineurs</h2>
          <p>
            Les candidatures de personnes mineures nécessitent l’autorisation
            du parent ou du tuteur légal. Ce dernier peut demander l’accès, la
            rectification ou la suppression des données de l’enfant en
            contactant l’organisation.
          </p>
        </section>
      </div>
    </main>
  );
}
