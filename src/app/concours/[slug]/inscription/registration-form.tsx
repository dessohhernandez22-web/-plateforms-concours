"use client";

import { useActionState, useMemo, useState } from "react";
import { ImagePlus, Loader2, Trash2, UserPlus, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/constants";
import { uploadMediaFile } from "@/lib/upload-client";
import { formatFcfa } from "@/lib/utils";
import type { TeamMemberInput } from "@/lib/validations/candidate";
import {
  initialCandidateState,
  type CandidateActionState,
} from "@/lib/validations/candidate-state";
import { createCandidateAction } from "@/server/actions/candidate";

type UploadedMedia = {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  mimeType: string;
  isPublic: boolean;
};

type ContestInfo = {
  id: string;
  title: string;
  domainName: string;
  registrationFee: number;
  voteUnitPrice: number;
};

const inputClass =
  "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none";

function calculateAge(value: string): number | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const month = now.getUTCMonth() - date.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < date.getUTCDate())) age -= 1;
  return age;
}

export function CandidateRegistrationForm({ contest }: { contest: ContestInfo }) {
  const [state, formAction, pending] = useActionState<CandidateActionState, FormData>(
    createCandidateAction,
    initialCandidateState,
  );

  const [type, setType] = useState<"INDIVIDUAL" | "TEAM">("INDIVIDUAL");
  const [birthDate, setBirthDate] = useState("");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [consent, setConsent] = useState<UploadedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([]);

  const age = useMemo(() => calculateAge(birthDate), [birthDate]);
  const isMinor = age !== null && age < 18;

  async function uploadFile(file: File, kind: "candidate-media" | "guardian-consent") {
    return uploadMediaFile(file, kind);
  }

  async function handleMediaFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (media.length >= 6) break;
        const isImage = (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
        const isVideo = (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(file.type);
        if (!isImage && !isVideo) {
          setUploadError("Format non accepté. Photos : JPG, PNG, WebP. Vidéos : MP4, WebM.");
          continue;
        }
        if (isImage && file.size > MAX_IMAGE_BYTES) {
          setUploadError("Image trop lourde (5 Mo maximum).");
          continue;
        }
        if (isVideo && file.size > MAX_VIDEO_BYTES) {
          setUploadError("Vidéo trop lourde (500 Mo maximum).");
          continue;
        }
        const uploaded = await uploadFile(file, "candidate-media");
        setMedia((current) => [...current, uploaded].slice(0, 6));
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Échec de l'envoi.");
    } finally {
      setUploading(false);
    }
  }

  async function handleConsentFile(file: File | null) {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await uploadFile(file, "guardian-consent");
      setConsent(uploaded);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Échec de l'envoi.");
    } finally {
      setUploading(false);
    }
  }

  function addTeamMember() {
    setTeamMembers((current) => [
      ...current,
      { fullName: "", role: "", birthDate: "", guardianName: "", guardianPhone: "" },
    ]);
  }

  function updateTeamMember(index: number, patch: Partial<TeamMemberInput>) {
    setTeamMembers((current) =>
      current.map((member, i) => (i === index ? { ...member, ...patch } : member)),
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="contestId" value={contest.id} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="mediaIds" value={JSON.stringify(media.map((m) => m.id))} />
      <input
        type="hidden"
        name="teamMembers"
        value={JSON.stringify(
          type === "TEAM"
            ? teamMembers.filter((m) => m.fullName.trim().length > 0)
            : [],
        )}
      />
      <input type="hidden" name="guardianConsentMediaId" value={consent?.id ?? ""} />

      {state.message && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </p>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Type de candidature</h2>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: "INDIVIDUAL", label: "Candidat individuel" },
              { value: "TEAM", label: "Équipe" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                type === option.value
                  ? "border-clay-600 bg-clay-50 text-clay-800"
                  : "border-stone-300 bg-white text-stone-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Informations</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            name="displayName"
            label={type === "TEAM" ? "Nom de l'équipe" : "Nom de scène / nom complet"}
            required
            error={state.errors?.displayName?.[0]}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="birthDate" className="text-sm font-medium text-stone-800">
              Date de naissance <span className="text-clay-600">*</span>
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              required
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              className={inputClass}
            />
            {state.errors?.birthDate && (
              <p className="text-xs font-medium text-red-600">{state.errors.birthDate[0]}</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="bio" className="text-sm font-medium text-stone-800">
            Présentation
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={1500}
            placeholder="Décrivez votre talent, votre parcours, votre projet…"
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none"
          />
        </div>
      </section>

      {isMinor && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h2 className="mb-1 text-lg font-semibold text-amber-900">
            Candidat mineur : autorisation parentale requise
          </h2>
          <p className="mb-4 text-sm text-amber-800">
            Une autorisation signée par le parent ou tuteur est obligatoire avant validation
            de l&apos;inscription.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              name="guardianName"
              label="Nom du parent / tuteur"
              required
              error={state.errors?.guardianName?.[0]}
            />
            <Field
              name="guardianPhone"
              label="Téléphone du parent / tuteur"
              type="tel"
              placeholder="0197000000"
              required
              error={state.errors?.guardianPhone?.[0]}
            />
          </div>
          <div className="mt-4">
            <Field
              name="guardianEmail"
              label="E-mail du parent / tuteur (optionnel)"
              type="email"
              error={state.errors?.guardianEmail?.[0]}
            />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <label htmlFor="consent" className="text-sm font-medium text-amber-900">
              Autorisation parentale (PDF, JPG ou PNG, 10 Mo max.)
            </label>
            <input
              id="consent"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) => handleConsentFile(event.target.files?.[0] ?? null)}
              className="text-sm"
            />
            {consent && (
              <p className="text-sm font-medium text-forest">
                Autorisation envoyée : {consent.id.slice(0, 8)}…
              </p>
            )}
            {state.errors?.guardianConsentMediaId && (
              <p className="text-xs font-medium text-red-600">
                {state.errors.guardianConsentMediaId[0]}
              </p>
            )}
          </div>
        </section>
      )}

      {type === "TEAM" && (
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900">Membres de l&apos;équipe</h2>
            <Button type="button" variant="ghost" size="sm" onClick={addTeamMember}>
              <UserPlus className="size-4" /> Ajouter
            </Button>
          </div>

          {teamMembers.length === 0 && (
            <p className="text-sm text-stone-500">
              Ajoutez au moins un membre. Le capitaine peut être ajouté ici aussi.
            </p>
          )}

          <div className="flex flex-col gap-4">
            {teamMembers.map((member, index) => {
              const memberAge = calculateAge(member.birthDate ?? "");
              const memberMinor = memberAge !== null && memberAge < 18;
              return (
                <div key={index} className="rounded-xl border border-stone-200 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      label="Nom complet"
                      value={member.fullName}
                      onChange={(value) => updateTeamMember(index, { fullName: value })}
                    />
                    <Field
                      label="Rôle (optionnel)"
                      value={member.role ?? ""}
                      onChange={(value) => updateTeamMember(index, { role: value })}
                    />
                    <Field
                      label="Date de naissance (optionnel)"
                      type="date"
                      value={member.birthDate ?? ""}
                      onChange={(value) => updateTeamMember(index, { birthDate: value })}
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setTeamMembers((current) => current.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="size-4" /> Retirer
                      </Button>
                    </div>
                  </div>
                  {memberMinor && (
                    <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg bg-amber-50 p-3 sm:grid-cols-2">
                      <Field
                        label="Responsable légal"
                        value={member.guardianName ?? ""}
                        onChange={(value) => updateTeamMember(index, { guardianName: value })}
                      />
                      <Field
                        label="Téléphone du responsable"
                        type="tel"
                        value={member.guardianPhone ?? ""}
                        onChange={(value) => updateTeamMember(index, { guardianPhone: value })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold text-stone-900">Photos et vidéos</h2>
        <p className="mb-4 text-sm text-stone-600">
          6 médias maximum. Photos JPG/PNG/WebP (5 Mo), vidéos MP4/WebM (500 Mo).
        </p>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500 hover:border-clay-400">
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-clay-600" />
          ) : (
            <ImagePlus className="size-6 text-clay-600" />
          )}
          <span>{uploading ? "Envoi en cours…" : "Ajouter des photos ou vidéos"}</span>
          <input
            type="file"
            multiple
            accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(",")}
            className="hidden"
            disabled={uploading || media.length >= 6}
            onChange={(event) => {
              void handleMediaFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>

        {uploadError && (
          <p className="mt-3 text-sm font-medium text-red-600">{uploadError}</p>
        )}

        {media.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {media.map((item) => (
              <li
                key={item.id}
                className="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
              >
                {item.type === "VIDEO" ? (
                  <video src={item.url} className="aspect-square size-full object-cover" />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.url}
                    alt="Aperçu"
                    className="aspect-square size-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setMedia((current) => current.filter((m) => m.id !== item.id))}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black"
                  aria-label="Retirer ce média"
                >
                  <Trash2 className="size-4" />
                </button>
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  {item.type === "VIDEO" ? <Video className="size-3" /> : "Photo"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-clay-200 bg-clay-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-clay-900">
              Frais d&apos;inscription : {formatFcfa(contest.registrationFee)}
            </p>
            <p className="text-xs text-clay-800">
              Vote de soutien : {formatFcfa(contest.voteUnitPrice)} par voix.
            </p>
          </div>
          <label className="flex items-start gap-2 text-sm text-clay-900">
            <input
              type="checkbox"
              name="acceptRules"
              className="mt-0.5 size-4 accent-clay-600"
            />
            <span>J&apos;accepte le règlement du concours.</span>
          </label>
        </div>
        {state.errors?.acceptRules && (
          <p className="mt-2 text-xs font-medium text-red-600">
            {state.errors.acceptRules[0]}
          </p>
        )}
      </section>

      <Button type="submit" size="lg" fullWidth disabled={pending || uploading}>
        {pending ? "Envoi du dossier…" : "Envoyer ma candidature"}
      </Button>
      <p className="text-center text-xs text-stone-500">
        Votre dossier sera examiné par l&apos;organisation. Vous recevrez une notification
        après validation.
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
  error,
  value,
  onChange,
}: {
  name?: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-stone-800">
        {label}
        {required && <span className="text-clay-600"> *</span>}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={inputClass}
      />
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
