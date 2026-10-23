# SPP TALENT SHOWDOWN — Plateforme de concours

Plateforme web mobile-first de gestion de concours artisanaux et sportifs pour le marché béninois (FCFA) : inscriptions, dépôt de photos/vidéos, autorisation parentale des mineurs, paiement Mobile Money, votes payants, reçus, exports et administration.

## Démarrage rapide

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Le script `npm run dev` démarre automatiquement une base **PostgreSQL embarquée** (sans installation système) dans `.data/postgres`, puis Next.js sur <http://localhost:3000>.

> Pour utiliser une base externe (Neon, Supabase, PostgreSQL local), modifiez `DATABASE_URL` dans `.env` puis lancez `npm run db:push && npm run db:seed`.

## Comptes de démonstration

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Administrateur | `admin@spp.bj` | `Admin@2026` |
| Organisateur | `organisateur@spp.bj` | `Organisateur@2026` |
| Candidat | `candidat@spp.bj` | `Candidat@2026` |

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Démarre PostgreSQL embarqué + Next.js |
| `npm run db:start` | Démarre uniquement PostgreSQL embarqué |
| `npm run db:push` | Synchronise le schéma Prisma |
| `npm run db:seed` | Charge les 9 domaines, concours et candidats de démo |
| `npm run db:studio` | Ouvre Prisma Studio |
| `npm run typecheck` | Vérifie TypeScript |
| `npm run lint` | Vérifie ESLint |
| `npm run build` | Build de production |

## Domaines du concours

Musique · Danse · Arts culinaires · Arts visuels · Arts cinématographiques · Mode · Technologie · Football · Génie en herbe.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- PostgreSQL + Prisma
- Auth.js v5 + Argon2id
- Prisma Studio, Zod, Lucide

## Paiements

Architecture prévue avec une interface fournisseur unique :

- `MANUAL` : Mobile Money manuel vérifié par l'administration (aucun agrégateur requis) ;
- `MTN_MOMO` / `MOOV_MONEY` : API directes (à activer avec un compte marchand) ;
- `FEDAPAY` / `KKIAY` / `CINETPAY` : adaptateurs optionnels.

Aucun montant n'est accepté depuis le client : il est toujours recalculé côté serveur.

## Statut

- [x] M0 — Fondations, schéma de données, seed SPP
- [x] M1 — Authentification, rôles, pages publiques de base
- [ ] M2 — Pages publiques complètes (calendrier, filtres)
- [ ] M3 — Inscriptions candidats/équipes + médias + mineurs
- [ ] M4 — Paiements et reçus
- [ ] M5 — Votes payants et anti-abus
- [ ] M6 — Back-office et exports
- [ ] M7 — Notifications, i18n, RGPD
- [ ] M8 — Tests, déploiement
