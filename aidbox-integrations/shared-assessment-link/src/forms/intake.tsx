import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Renderer from '@formbox/renderer';
import { theme } from '@formbox/hs-theme';
import '@formbox/hs-theme/style.css';

/**
 * The GAD-7 intake form, rendered by @formbox/renderer — the same FHIR
 * Questionnaire renderer HealthSamurai/phr uses.
 *
 * This is a React "island": the surrounding page (share builder, dashboard,
 * recipient viewer) stays plain no-build HTML, and only this form is bundled.
 * `Bun.build()` in server.ts compiles it, so there is still no separate build
 * step to run — the server does it on boot.
 *
 * Why a real renderer rather than the hand-rolled radio buttons it replaces:
 * the form is now driven by the `Questionnaire/gad7` resource in Aidbox, so the
 * instrument is defined once, in FHIR, instead of duplicated in TypeScript. The
 * renderer also gives us enableWhen, validation, and `answerValueSet` expansion
 * against Aidbox's terminology server for free.
 */

/** Shape of the payload served by GET /demo/intake-form. */
interface IntakeConfig {
  /**
   * The FHIR Questionnaire to render. Its items carry inline `answerOption`, so
   * the renderer needs no terminology server and the browser needs no Aidbox
   * credentials to resolve the answer choices.
   */
  questionnaire: Record<string, unknown>;
  /** Patients the sharing organization can record against. */
  patients: Array<{ reference: string; name: string; birthDate?: string }>;
}

type Submitted = { total: number };

function IntakeForm(): React.JSX.Element {
  const [config, setConfig] = useState<IntakeConfig | null>(null);
  const [patient, setPatient] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Submitted | null>(null);
  const [busy, setBusy] = useState(false);
  // Remounts the renderer after a save so the next assessment starts blank.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    fetch('/demo/intake-form')
      .then((r) => r.json() as Promise<IntakeConfig>)
      .then((c) => {
        setConfig(c);
        setPatient(c.patients[0]?.reference ?? '');
      })
      .catch(() => setError('Could not load the questionnaire.'));
  }, []);

  /**
   * The renderer hands back a complete FHIR QuestionnaireResponse once its own
   * validation passes. We post it as-is; the server stamps the authoring
   * organization and computes the score, so neither is client-controlled.
   */
  async function handleSubmit(response: unknown): Promise<void> {
    setError(null);
    setSaved(null);
    setBusy(true);
    try {
      const res = await fetch('/demo/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient, questionnaireResponse: response }),
      });
      const data = (await res.json()) as { total?: number; error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not save the assessment');
      setSaved({ total: data.total ?? 0 });
      setFormKey((k) => k + 1);
      // Let the surrounding page refresh its "assessments on file" list.
      window.dispatchEvent(new CustomEvent('assessment-saved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the assessment');
    } finally {
      setBusy(false);
    }
  }

  if (error && !config) return <p className="empty">{error}</p>;
  if (!config) return <p className="empty">Loading the questionnaire…</p>;

  return (
    <>
      <div className="field">
        <label className="fld" htmlFor="formbox-patient">
          Patient
        </label>
        <select
          id="formbox-patient"
          value={patient}
          onChange={(e) => setPatient(e.target.value)}
        >
          {config.patients.map((p) => (
            <option key={p.reference} value={p.reference}>
              {p.name}
              {p.birthDate ? ` · b. ${p.birthDate}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="formbox-wrap" aria-busy={busy}>
        <Renderer
          key={formKey}
          fhirVersion="r4"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          questionnaire={config.questionnaire as any}
          theme={theme}
          onSubmit={handleSubmit}
        />
      </div>

      {saved && (
        <div className="ok-note">
          Saved — total {saved.total}/21. Any open share for this patient now includes it.
        </div>
      )}
      {error && <div className="err">{error}</div>}
    </>
  );
}

const mount = document.getElementById('gad7-root');
if (mount) createRoot(mount).render(<IntakeForm />);
