import type { Metadata } from "next";

import { CONTACT_EMAIL, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Conditions d’utilisation",
  description: `Conditions d’utilisation de la plateforme ${SITE.name}.`,
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="mb-8 flex flex-col gap-2 border-b border-stone-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay-700">
          Informations légales
        </p>
        <h1 className="font-editorial text-3xl font-semibold text-stone-900 sm:text-4xl">
          Conditions d’utilisation
        </h1>
        <p className="text-sm text-stone-500">Dernière mise à jour : octobre 2026</p>
      </header>

      <div className="flex flex-col gap-6 text-sm leading-7 text-stone-600">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">1. Objet</h2>
          <p>
            La plateforme {SITE.name} permet aux candidats de déposer leur
            candidature aux concours organisés, de suivre leur dossier, de
            régler les frais d’inscription et de recueillir des votes de
            soutien. Elle permet également au public de consulter les concours
            et les résultats publiés.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">2. Compte utilisateur</h2>
          <p>
            Vous devez fournir des informations exactes et à jour. Vous êtes
            responsable de la confidentialité de votre mot de passe et des
            actions effectuées depuis votre compte. Un compte est personnel et
            ne peut pas être cédé.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            3. Candidatures et mineurs
          </h2>
          <p>
            Les candidatures sont soumises à validation par l’organisation. Pour
            toute personne mineure, une autorisation parentale ou du tuteur
            légal est obligatoire, y compris pour la diffusion des photos et
            vidéos de la candidature.
          </p>
          <p>
            L’organisation peut demander des pièces complémentaires, refuser ou
            disqualifier une candidature en cas de dossier incomplet, de
            fraude ou de non-respect du règlement du concours.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            4. Paiements et votes
          </h2>
          <p>
            Les montants des frais d’inscription et des votes sont affichés sur
            chaque concours et recalculés côté serveur. Un paiement n’est
            définitif qu’après confirmation par le prestataire de paiement ou
            validation par l’administration. Les votes comptabilisés sont
            définitifs.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            5. Contenus et médias
          </h2>
          <p>
            En déposant un contenu, vous garantissez en détenir les droits et
            autorisez l’organisation à l’utiliser pour la présentation et la
            promotion du concours. Les contenus illicites, diffamatoires ou
            portant atteinte aux droits de tiers sont interdits.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            6. Comportements interdits
          </h2>
          <p>
            Sont notamment interdits : la création de faux comptes, la
            manipulation des votes, l’usurpation d’identité, l’accès non
            autorisé aux systèmes, l’envoi massif de requêtes et toute
            tentative de contournement des dispositifs de sécurité.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            7. Suspension et responsabilité
          </h2>
          <p>
            L’organisation peut suspendre ou supprimer un compte en cas de
            violation des présentes conditions. La plateforme est fournie
            « en l’état » ; l’organisation ne peut être tenue responsable des
            interruptions indépendantes de sa volonté, notamment celles des
            réseaux ou des prestataires de paiement.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            8. Droit applicable et contact
          </h2>
          <p>
            Les présentes conditions sont régies par le droit béninois. Pour
            toute question, écrivez à{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-clay-700 underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
