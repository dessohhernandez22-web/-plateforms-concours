"use client";

import { useActionState } from "react";

import {
  initialContestState,
  type ContestActionState,
} from "@/lib/validations/contest-state";
import {
  createContestAction,
  createEventAction,
  updateContestAction,
  updateEventAction,
} from "@/server/actions/contest";

const inputClass =
  "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none";
const textareaClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none";
const labelClass = "text-sm font-medium text-stone-700";
const errorClass = "text-xs text-red-600";

export type OrganizerOption = { id: string; name: string; email: string | null };
export type DomainOption = { id: string; name: string };
export type EventOption = { id: string; title: string };

export type EventFormValues = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  organizerId: string;
  startsAt: string;
  endsAt: string;
  coverUrl: string;
};

export type ContestFormValues = {
  id?: string;
  eventId: string;
  domainId: string;
  title: string;
  slug: string;
  description: string;
  rules: string;
  status:
    | "DRAFT"
    | "PUBLISHED"
    | "REGISTRATION_CLOSED"
    | "VOTING_CLOSED"
    | "RESULTS_PUBLISHED"
    | "ARCHIVED";
  registrationFee: number;
  voteUnitPrice: number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  votingOpenAt: string;
  votingCloseAt: string;
  resultsAt: string;
  maxCandidates: string;
  coverUrl: string;
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className={errorClass}>{messages[0]}</p>;
}

function Feedback({ state }: { state: ContestActionState }) {
  if (!state.message) return null;
  return (
    <p
      role="alert"
      className={`rounded-xl border px-4 py-3 text-sm ${
        state.ok
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </p>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-clay-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay-800 disabled:opacity-60"
    >
      {pending ? "Enregistrement…" : label}
    </button>
  );
}

export function EventForm({
  values,
  organizers,
}: {
  values?: EventFormValues;
  organizers: OrganizerOption[];
}) {
  const isEdit = Boolean(values?.id);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateEventAction : createEventAction,
    initialContestState,
  );
  const v = values;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isEdit && <input type="hidden" name="eventId" value={v?.id} />}
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Titre</span>
          <input name="title" defaultValue={v?.title ?? ""} required className={inputClass} />
          <FieldError messages={state.errors?.title} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Identifiant URL (facultatif)</span>
          <input name="slug" defaultValue={v?.slug ?? ""} className={inputClass} />
          <FieldError messages={state.errors?.slug} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Description</span>
        <textarea
          name="description"
          defaultValue={v?.description ?? ""}
          required
          rows={3}
          className={textareaClass}
        />
        <FieldError messages={state.errors?.description} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Statut</span>
          <select name="status" defaultValue={v?.status ?? "DRAFT"} className={inputClass}>
            <option value="DRAFT">Brouillon</option>
            <option value="PUBLISHED">Publié</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
          <FieldError messages={state.errors?.status} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Organisateur</span>
          <select
            name="organizerId"
            defaultValue={v?.organizerId ?? ""}
            className={inputClass}
          >
            <option value="">Administrateur courant</option>
            {organizers.map((organizer) => (
              <option key={organizer.id} value={organizer.id}>
                {organizer.name} {organizer.email ? `(${organizer.email})` : ""}
              </option>
            ))}
          </select>
          <FieldError messages={state.errors?.organizerId} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Début (optionnel)</span>
          <input
            type="datetime-local"
            name="startsAt"
            defaultValue={v?.startsAt ?? ""}
            className={inputClass}
          />
          <FieldError messages={state.errors?.startsAt} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Fin (optionnel)</span>
          <input
            type="datetime-local"
            name="endsAt"
            defaultValue={v?.endsAt ?? ""}
            className={inputClass}
          />
          <FieldError messages={state.errors?.endsAt} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Image de couverture (URL, optionnel)</span>
        <input name="coverUrl" defaultValue={v?.coverUrl ?? ""} className={inputClass} />
        <FieldError messages={state.errors?.coverUrl} />
      </label>
      <div>
        <SubmitButton pending={pending} label={isEdit ? "Enregistrer l'événement" : "Créer l'événement"} />
      </div>
    </form>
  );
}

export function ContestForm({
  values,
  events,
  domains,
}: {
  values?: ContestFormValues;
  events: EventOption[];
  domains: DomainOption[];
}) {
  const isEdit = Boolean(values?.id);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateContestAction : createContestAction,
    initialContestState,
  );
  const v = values;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isEdit && <input type="hidden" name="contestId" value={v?.id} />}
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Événement</span>
          <select name="eventId" defaultValue={v?.eventId ?? ""} required className={inputClass}>
            <option value="">Choisir un événement</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
          <FieldError messages={state.errors?.eventId} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Domaine</span>
          <select name="domainId" defaultValue={v?.domainId ?? ""} required className={inputClass}>
            <option value="">Choisir un domaine</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
          <FieldError messages={state.errors?.domainId} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Titre</span>
          <input name="title" defaultValue={v?.title ?? ""} required className={inputClass} />
          <FieldError messages={state.errors?.title} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Identifiant URL (facultatif)</span>
          <input name="slug" defaultValue={v?.slug ?? ""} className={inputClass} />
          <FieldError messages={state.errors?.slug} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Description</span>
        <textarea
          name="description"
          defaultValue={v?.description ?? ""}
          required
          rows={3}
          className={textareaClass}
        />
        <FieldError messages={state.errors?.description} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Règlement</span>
        <textarea
          name="rules"
          defaultValue={v?.rules ?? ""}
          required
          rows={5}
          className={textareaClass}
        />
        <FieldError messages={state.errors?.rules} />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Statut</span>
          <select name="status" defaultValue={v?.status ?? "DRAFT"} className={inputClass}>
            <option value="DRAFT">Brouillon</option>
            <option value="PUBLISHED">Publié</option>
            <option value="REGISTRATION_CLOSED">Inscriptions closes</option>
            <option value="VOTING_CLOSED">Votes clos</option>
            <option value="RESULTS_PUBLISHED">Résultats publiés</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
          <FieldError messages={state.errors?.status} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Frais d&apos;inscription (FCFA)</span>
          <input
            type="number"
            name="registrationFee"
            min={0}
            defaultValue={v?.registrationFee ?? 0}
            className={inputClass}
          />
          <FieldError messages={state.errors?.registrationFee} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Prix du vote (FCFA)</span>
          <input
            type="number"
            name="voteUnitPrice"
            min={1}
            defaultValue={v?.voteUnitPrice ?? 100}
            className={inputClass}
          />
          <FieldError messages={state.errors?.voteUnitPrice} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Ouverture des inscriptions</span>
          <input
            type="datetime-local"
            name="registrationOpenAt"
            defaultValue={v?.registrationOpenAt ?? ""}
            required
            className={inputClass}
          />
          <FieldError messages={state.errors?.registrationOpenAt} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Clôture des inscriptions</span>
          <input
            type="datetime-local"
            name="registrationCloseAt"
            defaultValue={v?.registrationCloseAt ?? ""}
            required
            className={inputClass}
          />
          <FieldError messages={state.errors?.registrationCloseAt} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Ouverture des votes</span>
          <input
            type="datetime-local"
            name="votingOpenAt"
            defaultValue={v?.votingOpenAt ?? ""}
            required
            className={inputClass}
          />
          <FieldError messages={state.errors?.votingOpenAt} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Clôture des votes</span>
          <input
            type="datetime-local"
            name="votingCloseAt"
            defaultValue={v?.votingCloseAt ?? ""}
            required
            className={inputClass}
          />
          <FieldError messages={state.errors?.votingCloseAt} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Publication des résultats (optionnel)</span>
          <input
            type="datetime-local"
            name="resultsAt"
            defaultValue={v?.resultsAt ?? ""}
            className={inputClass}
          />
          <FieldError messages={state.errors?.resultsAt} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Nombre max. de candidats (optionnel)</span>
          <input
            type="number"
            name="maxCandidates"
            min={1}
            defaultValue={v?.maxCandidates ?? ""}
            className={inputClass}
          />
          <FieldError messages={state.errors?.maxCandidates} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Image de couverture (URL, optionnel)</span>
        <input name="coverUrl" defaultValue={v?.coverUrl ?? ""} className={inputClass} />
        <FieldError messages={state.errors?.coverUrl} />
      </label>
      <div>
        <SubmitButton pending={pending} label={isEdit ? "Enregistrer le concours" : "Créer le concours"} />
      </div>
    </form>
  );
}
