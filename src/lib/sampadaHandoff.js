/**
 * Abhiruchi -> Sampada candidate handoff (BHIV vNEXT Team 2).
 *
 * Step 1 of the canonical journey:
 *   Abhiruchi -> Sampada -> Pravesh -> HackaVerse / Niyantran / Gurukul
 *
 * Posts the candidate's intake summary to the Sampada gateway's idempotent
 * endpoint `POST /api/v1/identity/abhiruchi/intake`. Sampada collapses
 * replays on `(source_system, source_reference)`, so calling this after every
 * profile save (first submission or edit) never creates duplicate candidates.
 *
 * Configuration (.env):
 *   VITE_SAMPADA_INTAKE_URL   full URL of the intake endpoint
 *                             e.g. http://localhost:8000/api/v1/identity/abhiruchi/intake
 *   VITE_SAMPADA_INTAKE_KEY   Sampada gateway API key (API_KEY_SECRET), sent
 *                             as Authorization: Bearer <key>
 *
 * Identity rules honoured here (BHIV vNEXT §1):
 *  - Only values the candidate actually supplied are sent — never derived,
 *    never guessed. An unmapped institute is omitted so Sampada records it
 *    as unknown instead of inventing one.
 *  - `source_reference` (the stable Clerk user id) is the replay key; email
 *    is a linking attribute only.
 *  - Failures are reported, never thrown: the candidate's own profile save
 *    must not fail because the handoff endpoint is unreachable.
 */

const INTAKE_URL = (import.meta.env.VITE_SAMPADA_INTAKE_URL || "").trim();
const INTAKE_KEY = (import.meta.env.VITE_SAMPADA_INTAKE_KEY || "").trim();

// Agreed institute codes + the RTMSSU alias Sampada normalises (§5).
const INSTITUTE_CODES = ["MSSU", "DYP-A", "SIT-S", "SIPS-S", "VJTI"];
const INSTITUTE_ALIASES = ["RTMSSU", "RTM-MSSU"];

// Display name for each code — used only to prefill `university` when the
// student picked an institute but did not fill a separate university field.
// The label comes from the SAME option the student selected, so nothing is
// invented (MSSU is canonical for RTMSSU).
const INSTITUTE_LABELS = {
  MSSU: "RTMSSU",
  "DYP-A": "DYP-A",
  "SIT-S": "SIT-S",
  "SIPS-S": "SIPS-S",
  VJTI: "VJTI",
};

/** First non-empty value among the given form keys (arrays are joined). */
function firstOf(formData, keys) {
  for (const key of keys) {
    const value = formData?.[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const parts = value.map((v) => String(v).trim()).filter(Boolean);
      if (parts.length) return parts.join(", ");
      continue;
    }
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

/**
 * Map free-text form answers to an agreed institute code — only on an exact
 * code/alias token match. Anything else stays unmapped (honest unknown).
 */
function deriveInstituteCode(formData) {
  const raw = firstOf(formData, [
    "institute_code",
    "institute",
    "college_code",
    "college",
    "institution",
    "university",
  ]);
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  for (const code of [...INSTITUTE_CODES, ...INSTITUTE_ALIASES]) {
    const token = code.replace(/[-]/g, "\\-");
    if (new RegExp(`(^|[^A-Z0-9-])${token}([^A-Z0-9-]|$)`).test(upper)) {
      return code;
    }
  }
  return undefined;
}

function newTraceId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `abh-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * Send the Abhiruchi -> Sampada handoff.
 *
 * @param {{userId: string, email?: string, formData?: object}} params
 * @returns {Promise<{ok: boolean, skipped?: boolean, status?: number,
 *   detail: string, sampada_local_id?: string, warnings?: string[]}>}
 */
export async function sendSampadaHandoff({ userId, email, formData = {} }) {
  if (!INTAKE_URL) {
    return {
      ok: false,
      skipped: true,
      detail: "VITE_SAMPADA_INTAKE_URL not configured — handoff skipped",
    };
  }
  if (!userId) {
    return { ok: false, skipped: true, detail: "no source user id — handoff skipped" };
  }

  const instituteCode = deriveInstituteCode(formData);

  const payload = {
    source_system: "abhiruchi",
    source_reference: `clerk:${userId}`,
    trace_id: newTraceId(),
    email: (email || formData.email || "").trim() || undefined,
    institute_code: instituteCode,
    university:
      firstOf(formData, [
        "university",
        "college",
        "institute_name",
        "institution",
      ]) || (instituteCode ? INSTITUTE_LABELS[instituteCode] : undefined),
    branch: firstOf(formData, [
      "branch",
      "field_of_study",
      "stream",
      "specialization",
      "course",
      "domain",
    ]) || undefined,
    // Campus the student picked in the intake dropdown ("Kharghar", "Pune", …)
    campus: firstOf(formData, ["campus"]) || undefined,
    cohort_id: firstOf(formData, ["cohort_id", "cohort"]) || undefined,
  };

  // Sampada's gateway authenticates service calls with HTTPBearer —
  // `Authorization: Bearer <API_KEY_SECRET>` (see jwt_auth.get_api_key).
  const headers = { "Content-Type": "application/json" };
  if (INTAKE_KEY) headers["Authorization"] = `Bearer ${INTAKE_KEY}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(INTAKE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail =
        (body && (body.detail || body.message)) ||
        `Sampada responded ${response.status}`;
      console.error("[Sampada handoff] rejected:", detail, payload);
      return { ok: false, status: response.status, detail: String(detail) };
    }
    return {
      ok: true,
      status: response.status,
      detail: body?.status || "accepted",
      sampada_local_id: body?.record?.sampada_local_id,
      warnings: body?.warnings || [],
    };
  } catch (err) {
    const detail = err?.name === "AbortError" ? "timeout after 8s" : String(err?.message || err);
    console.error("[Sampada handoff] failed:", detail);
    return { ok: false, detail };
  } finally {
    clearTimeout(timer);
  }
}

export default sendSampadaHandoff;
