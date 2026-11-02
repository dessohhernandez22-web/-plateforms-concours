# SPP TALENT SHOWDOWN — Plateforme de concours

Plateforme web mobile-first de gestion de concours artisanaux et sportifs pour le marché béninois (FCFA) : inscriptions, dépôt de photos/vidéos, autorisation parentale des mineurs, paiement Mobile Money, votes payants, reçus et administration.

## Démarrage rapide

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Le script `npm run dev` démarre automatiquement une base **PostgreSQL embarquée** (sans installation système) dans `.data/postgres`, synchronise le schéma local, exécute le seed puis lance Next.js sur <http://localhost:3000>.

> Pour utiliser une base externe (Neon, Supabase, PostgreSQL local), renseignez `DATABASE_URL` et `DIRECT_URL` dans `.env`.

## Premier administrateur

Le seed ne crée **aucun compte de démonstration**. Il installe uniquement les 9 domaines de concours et, si les variables suivantes sont définies, le premier administrateur :

```bash
ADMIN_EMAIL="admin@votre-domaine.example"
ADMIN_PASSWORD="mot-de-passe-fort-de-12-caracteres-minimum"
ADMIN_NAME="Administrateur"
```

Relancez `npm run db:seed` après avoir renseigné ces variables. Le mot de passe est haché avec Argon2id et n'est jamais journalisé.

Les concours et événements se créent ensuite depuis **Administration → Concours**.

Si votre base locale contient encore les anciennes données de démonstration, supprimez-les avec :

```bash
npm run db:clean-demo
```

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Démarre PostgreSQL embarqué + Next.js |
| `npm run db:start` | Démarre uniquement PostgreSQL embarqué |
| `npm run db:push` | Synchronise le schéma Prisma (développement local) |
| `npm run db:push:remote` | Synchronise le schéma sur une base distante |
| `npm run db:migrate` | Crée une migration Prisma en développement |
| `npm run db:migrate:deploy` | Applique les migrations en production |
| `npm run db:seed` | Domaines + premier administrateur |
| `npm run db:seed:remote` | Exécute le seed sur une base distante |
| `npm run db:clean-demo` | Supprime l'événement de démonstration, ses concours/candidatures et les comptes de démonstration |
| `npm run db:studio` | Ouvre Prisma Studio |
| `npm run typecheck` | Vérifie TypeScript |
| `npm run lint` | Vérifie ESLint |
| `npm test` | Tests unitaires (Node test runner) |
| `npm run build` | Build de production |

## Fonctionnalités

- Inscription et connexion (Auth.js v5, JWT, Argon2id), réinitialisation du mot de passe par e-mail, rôles candidat / organisateur / administrateur.
- Candidatures individuelles ou en équipe, médias photos/vidéos, autorisation parentale pour les mineurs.
- Paiement d'inscription manuel avec preuve ou via SasPay, vérification administrateur, reçus HTML imprimables (PDF via l'impression du navigateur).
- Votes payants : commande, paiement, comptabilisation atomique, reçu.
- Anti-abus : une candidature active par concours et par compte, plafond `maxCandidates` par concours, une commande en attente par candidat et par votant, pseudonymisation IP/appareil, limitation de débit.
- Cycle de vie des concours synchronisé par cron Vercel (`/api/cron/contest-lifecycle`).
- Back-office : candidatures, paiements, concours, événements, résultats, notifications, gestion des rôles utilisateurs.
- Exports CSV des candidatures, paiements et résultats depuis l'administration.
- Journal d'audit des validations et rejets de paiement.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- PostgreSQL + Prisma 6
- Auth.js v5 + Argon2id
- Zod, Lucide, Vercel Blob, Nodemailer, SasPay

## Paiements

- `MANUAL` : Mobile Money vérifié par l'administration, avec preuve de paiement obligatoire avant validation ;
- `SASPAY` : paiement en ligne, webhook signé et idempotent, validation automatique.

Aucun montant n'est accepté depuis le client : il est toujours recalculé côté serveur.

## Variables d'environnement

Copiez `.env.example` vers `.env` puis renseignez les valeurs :

- `DATABASE_URL` / `DIRECT_URL`
- `AUTH_SECRET` / `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL` / `AUTH_URL` (URL HTTPS canonique du site)
- `NEXT_PUBLIC_CONTACT_EMAIL` (adresse affichée dans les pages légales et le pied de page)
- `PII_ENCRYPTION_KEY` (32 caractères minimum, obligatoire en production)
- `RATE_LIMIT_SECRET`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
- `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_UPLOAD_MODE` (`local` ou `blob`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- `SASPAY_API_KEY`, `SASPAY_WEBHOOK_SECRET`, `SASPAY_WEBHOOK_URL`
- `CRON_SECRET`

Générez les secrets avec `openssl rand -base64 48` (ou `openssl rand -hex 32` pour `CRON_SECRET`).

Sans configuration SMTP, les notifications restent enregistrées dans la base mais aucun e-mail n'est réellement envoyé.

## Déploiement Vercel

Le projet est prévu pour **Vercel + Neon (PostgreSQL) + Vercel Blob**.

1. Créez une base Neon :
   - `DATABASE_URL` : URL **pooled** (avec `-pooler`) pour l'exécution ;
   - `DIRECT_URL` : URL **directe** (sans `-pooler`) pour les migrations.
2. Ajoutez un store **Blob** et les variables d'environnement ci-dessus.
3. Déployez. `vercel-build` exécute `prisma generate`, `prisma migrate deploy` puis `next build`.
4. Créez le premier administrateur : définissez `ADMIN_EMAIL` / `ADMIN_PASSWORD` puis exécutez `npm run db:seed:remote` une seule fois.
5. Vérifiez le déploiement : `GET /api/health` doit répondre `{"status":"ok","database":"up"}`.

> Le cron Vercel appelle `/api/cron/contest-lifecycle` toutes les 15 minutes et exige `CRON_SECRET`.
> En production, `NEXT_PUBLIC_UPLOAD_MODE="blob"` : l'envoi local est refusé et les vidéos jusqu'à 500 Mo passent directement par Vercel Blob.
> Le stockage local (`.data/uploads`) reste réservé au développement.

### Checklist avant mise en ligne

1. `NEXT_PUBLIC_APP_URL` et `NEXTAUTH_URL` pointent vers le domaine HTTPS définitif.
2. `AUTH_SECRET`, `NEXTAUTH_SECRET`, `PII_ENCRYPTION_KEY`, `RATE_LIMIT_SECRET` et `CRON_SECRET` sont des valeurs aléatoires distinctes.
3. `NEXT_PUBLIC_UPLOAD_MODE="blob"` et `BLOB_READ_WRITE_TOKEN` est configuré.
4. Les identifiants SMTP et Saspay sont renseignés, et `SASPAY_WEBHOOK_URL` pointe vers `/api/saspay/callback`.
5. `npm run typecheck && npm run lint && npm test && npm run build` passe sans erreur.
6. Le compte administrateur est créé et les concours sont publiés depuis **Administration → Concours**.
7. Le sitemap (`/sitemap.xml`), le robots (`/robots.txt`) et l'image de partage (`/opengraph-image`) sont accessibles.

### Reprise d'une base existante

Si la base a été créée auparavant avec `prisma db push` (sans historique de migrations), appliquez d'abord le schéma courant puis marquez la migration initiale comme déjà appliquée :

```bash
npm run db:push:remote
npx prisma migrate resolve --applied 20261030120000_init
```

Les déploiements suivants utiliseront `prisma migrate deploy` normalement.

## Limites connues

- Les reçus sont générés en HTML et exportables en PDF via la fonction d'impression du navigateur (pas de génération PDF serveur).
- Les notifications sont envoyées par e-mail uniquement (pas de SMS).
- Interface en français uniquement.
