import React, { useState, useRef } from 'react';
import {
  Building2,
  BookOpen,
  FileText,
  ShieldCheck,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Hash,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import type {
  CourseIntakeItem,
  StatutoryDocumentPayload,
  InstitutionalFilingResult,
} from '../types/domain';

// ── Helpers ───────────────────────────────────────────────────────────────────

const REGIONS = ['North', 'South', 'East', 'West', 'Central', 'South-West', 'North-West'];
const ROUTES = ['Scrutiny only', 'Scrutiny + EVC'] as const;
const PROGRAMS = ['B.E / B.Tech', 'M.E / M.Tech', 'MCA', 'MBA', 'B.Arch', 'Diploma'];
const LEVELS: Array<CourseIntakeItem['level']> = ['UG', 'PG', 'Diploma'];
const DOC_TYPES: Array<{
  key: StatutoryDocumentPayload['doc_type'];
  label: string;
  hint: string;
}> = [
  {
    key: 'registered_lease_deed',
    label: 'Registered Lease Deed',
    hint: 'Proof of building ownership or lease ≥ 30 years. Must be registered with Sub-Registrar.',
  },
  {
    key: 'fire_safety_noc',
    label: 'Fire Safety NOC',
    hint: 'No Objection Certificate from state Fire & Emergency Services authority.',
  },
  {
    key: 'faculty_cadre_undertaking',
    label: 'Faculty Cadre Undertaking',
    hint: 'Signed undertaking from institution head on availability of qualified faculty per AICTE norms.',
  },
];

async function computeSha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Step indicators ───────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Institute Profile', icon: Building2 },
  { label: 'Course & Intake', icon: BookOpen },
  { label: 'Statutory Docs', icon: FileText },
  { label: 'Declaration', icon: ShieldCheck },
];

interface StepIndicatorProps {
  current: number;
}
const StepIndicator: React.FC<StepIndicatorProps> = ({ current }) => (
  <div className="wizard-steps">
    {STEPS.map((s, i) => {
      const Icon = s.icon;
      const done = i < current;
      const active = i === current;
      return (
        <div key={s.label} className={`wizard-step${active ? ' active' : done ? ' done' : ''}`}>
          <div className="wizard-step-icon">
            {done ? <CheckCircle2 size={16} /> : <Icon size={16} />}
          </div>
          <span className="wizard-step-label">{s.label}</span>
          {i < STEPS.length - 1 && <div className="wizard-step-connector" />}
        </div>
      );
    })}
  </div>
);

// ── Props ─────────────────────────────────────────────────────────────────────
interface ApplicationWizardProps {
  onClose: () => void;
  onSuccess: (result: InstitutionalFilingResult) => void;
  onToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

// ── Wizard Component ──────────────────────────────────────────────────────────
export const ApplicationWizard: React.FC<ApplicationWizardProps> = ({
  onClose,
  onSuccess,
  onToast,
}) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Step 1 — Institute Profile
  const [aictePermanentId, setAictePermanentId] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [region, setRegion] = useState(REGIONS[0]);
  const [route, setRoute] = useState<typeof ROUTES[number]>('Scrutiny + EVC');
  const [appType, setAppType] = useState('Extension of Approval (EoA)');

  // Step 2 — Courses
  const [courses, setCourses] = useState<CourseIntakeItem[]>([
    { program: PROGRAMS[0], level: 'UG', title: '', intake: 60 },
  ]);

  // Step 3 — Documents
  const [docFiles, setDocFiles] = useState<
    Record<StatutoryDocumentPayload['doc_type'], { file: File | null; sha: string; computing: boolean }>
  >({
    registered_lease_deed: { file: null, sha: '', computing: false },
    fire_safety_noc: { file: null, sha: '', computing: false },
    faculty_cadre_undertaking: { file: null, sha: '', computing: false },
  });
  const fileInputRefs = {
    registered_lease_deed: useRef<HTMLInputElement>(null),
    fire_safety_noc: useRef<HTMLInputElement>(null),
    faculty_cadre_undertaking: useRef<HTMLInputElement>(null),
  };

  // Step 4 — Declaration
  const [affidavitAccepted, setAffidavitAccepted] = useState(false);
  const [signatoryDesignation, setSignatoryDesignation] = useState('Principal');

  // ── Validation per step ───────────────────────────────────────────────────
  const validateStep = (s: number): string[] => {
    const errs: string[] = [];
    if (s === 0) {
      if (!aictePermanentId.trim()) errs.push('AICTE Permanent ID is required.');
      if (!/^1-\d{5,12}$/.test(aictePermanentId.trim()) && aictePermanentId.trim())
        errs.push("AICTE Permanent ID must match format 1-XXXXXXXXXX (e.g. 1-9876543210).");
      if (!institutionName.trim()) errs.push('Institution name is required.');
    }
    if (s === 1) {
      if (courses.length === 0) errs.push('At least one course must be added.');
      courses.forEach((c, i) => {
        if (!c.title.trim()) errs.push(`Course ${i + 1}: Title is required.`);
        if (c.intake <= 0) errs.push(`Course ${i + 1}: Intake must be greater than 0.`);
      });
    }
    if (s === 2) {
      DOC_TYPES.forEach(({ key, label }) => {
        const d = docFiles[key];
        if (!d.file) errs.push(`${label}: File is required.`);
        else if (!d.sha || d.sha.length !== 64) errs.push(`${label}: SHA-256 hash computation pending.`);
      });
    }
    if (s === 3) {
      if (!affidavitAccepted) errs.push('You must accept the legal affidavit and APH 2026-27 declaration.');
      if (!signatoryDesignation.trim()) errs.push('Signatory designation is required.');
    }
    return errs;
  };

  const next = () => {
    const errs = validateStep(step);
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setStep((s) => s + 1);
  };

  const back = () => { setErrors([]); setStep((s) => s - 1); };

  // ── Document file handler ──────────────────────────────────────────────────
  const handleFileChange = async (
    key: StatutoryDocumentPayload['doc_type'],
    file: File | null
  ) => {
    if (!file) return;
    setDocFiles((prev) => ({
      ...prev,
      [key]: { file, sha: '', computing: true },
    }));
    try {
      const sha = await computeSha256(file);
      setDocFiles((prev) => ({
        ...prev,
        [key]: { file, sha, computing: false },
      }));
    } catch {
      setDocFiles((prev) => ({
        ...prev,
        [key]: { file, sha: '', computing: false },
      }));
      onToast('Failed to compute SHA-256 hash. Please re-select the file.', 'warning');
    }
  };

  const handleDrop = (
    key: StatutoryDocumentPayload['doc_type'],
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0] ?? null;
    if (file) handleFileChange(key, file);
  };

  // ── Course helpers ─────────────────────────────────────────────────────────
  const addCourse = () =>
    setCourses((prev) => [...prev, { program: PROGRAMS[0], level: 'UG', title: '', intake: 60 }]);

  const removeCourse = (idx: number) =>
    setCourses((prev) => prev.filter((_, i) => i !== idx));

  const updateCourse = (idx: number, field: keyof CourseIntakeItem, value: string | number) =>
    setCourses((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validateStep(3);
    if (errs.length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    setErrors([]);
    try {
      const now = new Date().toISOString().slice(0, 10);
      const documents: StatutoryDocumentPayload[] = DOC_TYPES.map(({ key, label }) => {
        const d = docFiles[key];
        return {
          doc_type: key,
          title: label,
          file_name: d.file!.name,
          checksum_sha256: d.sha,
          file_size: d.file!.size,
          uploaded_at: now,
        };
      });

      const result = await api.submitInstitutionalFiling({
        aicte_permanent_id: aictePermanentId.trim(),
        institution_name: institutionName.trim(),
        region,
        route: route as any,
        app_type: appType,
        courses,
        documents,
        affidavit_accepted: affidavitAccepted,
        signatory_designation: signatoryDesignation.trim(),
      });

      onSuccess(result);
    } catch (err: any) {
      const msg = err.message || 'Submission failed. Please try again.';
      setErrors([msg]);
      onToast(msg, 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="wizard-overlay" role="dialog" aria-modal="true" aria-label="Application Filing Wizard">
      <div className="wizard-container">
        {/* Header */}
        <div className="wizard-header">
          <div>
            <div className="wizard-eyebrow">AICTE Approval Process Handbook 2026-27</div>
            <h2 className="wizard-title">Institutional Application Filing</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close wizard" type="button">✕</button>
        </div>

        <StepIndicator current={step} />

        {/* Error banner */}
        {errors.length > 0 && (
          <div className="wizard-error-banner" role="alert">
            <AlertCircle size={16} />
            <ul>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <div className="wizard-body">
          {/* ── Step 0: Institute Profile ──────────────────────────────── */}
          {step === 0 && (
            <div className="wizard-step-content animate-fade-in">
              <h3 className="wizard-section-title"><Building2 size={18} /> Institute Profile</h3>
              <p className="wizard-section-hint">Enter the institution's registered AICTE identity and select the approval route for this filing cycle.</p>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="aicte-id">AICTE Permanent ID *</label>
                  <input
                    id="aicte-id"
                    className="form-input"
                    placeholder="1-9876543210"
                    value={aictePermanentId}
                    onChange={(e) => setAictePermanentId(e.target.value)}
                  />
                  <span className="form-hint">Format: 1-XXXXXXXXXX (as assigned by AICTE Bureau)</span>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="inst-name">Institution Name *</label>
                  <input
                    id="inst-name"
                    className="form-input"
                    placeholder="Shivneri College of Engineering"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="region">AICTE Region *</label>
                  <select id="region" className="form-select" value={region} onChange={(e) => setRegion(e.target.value)}>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="app-type">Application Type</label>
                  <select id="app-type" className="form-select" value={appType} onChange={(e) => setAppType(e.target.value)}>
                    <option>Extension of Approval (EoA)</option>
                    <option>New Institute</option>
                    <option>New Course / Intake Variation</option>
                    <option>Closure of Programme</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Approval Route *</label>
                <div className="wizard-route-grid">
                  {ROUTES.map((r) => (
                    <label key={r} className={`wizard-route-card${route === r ? ' selected' : ''}`}>
                      <input
                        type="radio"
                        name="route"
                        value={r}
                        checked={route === r}
                        onChange={() => setRoute(r)}
                        style={{ display: 'none' }}
                      />
                      <span className="wizard-route-title">{r}</span>
                      <span className="wizard-route-desc">
                        {r === 'Scrutiny only'
                          ? 'Initial Scrutiny → Decision Pending. Suitable for renewal without physical inspection.'
                          : 'Initial Scrutiny → EVC Visit → Report Review → Decision Pending. Required for new programmes.'}
                      </span>
                      {route === r && <CheckCircle2 className="wizard-route-check" size={16} />}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Course & Intake Planner ───────────────────────── */}
          {step === 1 && (
            <div className="wizard-step-content animate-fade-in">
              <h3 className="wizard-section-title"><BookOpen size={18} /> Course & Intake Planner</h3>
              <p className="wizard-section-hint">Add each programme offered by the institution. Intake must be a positive integer matching the sanctioned seats.</p>

              <div className="wizard-course-list">
                {courses.map((c, idx) => (
                  <div key={idx} className="wizard-course-row">
                    <div className="wizard-course-num">{idx + 1}</div>
                    <div className="form-grid-4 flex-1">
                      <div className="form-group">
                        <label className="form-label">Program</label>
                        <select className="form-select" value={c.program} onChange={(e) => updateCourse(idx, 'program', e.target.value)}>
                          {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Degree Level</label>
                        <select className="form-select" value={c.level} onChange={(e) => updateCourse(idx, 'level', e.target.value as any)}>
                          {LEVELS.map((l) => <option key={l}>{l}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Course Title</label>
                        <input className="form-input" placeholder="Computer Science & Engineering" value={c.title} onChange={(e) => updateCourse(idx, 'title', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Intake Capacity</label>
                        <input
                          className="form-input"
                          type="number"
                          min={1}
                          max={960}
                          value={c.intake}
                          onChange={(e) => updateCourse(idx, 'intake', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-icon btn-danger-soft"
                      onClick={() => removeCourse(idx)}
                      disabled={courses.length === 1}
                      aria-label={`Remove course ${idx + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" className="btn btn-outline wizard-add-btn" onClick={addCourse}>
                <Plus size={14} /> Add Another Course
              </button>

              {courses.length > 0 && (
                <div className="wizard-intake-summary">
                  <span>Total approved intake across {courses.length} programme(s):</span>
                  <strong>{courses.reduce((s, c) => s + (c.intake || 0), 0)} seats</strong>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Statutory Document Uploads ────────────────────── */}
          {step === 2 && (
            <div className="wizard-step-content animate-fade-in">
              <h3 className="wizard-section-title"><FileText size={18} /> Statutory Document Uploads</h3>
              <p className="wizard-section-hint">Upload PDF copies of the three mandatory statutory documents. A SHA-256 cryptographic hash is computed client-side for chain-of-custody integrity verification.</p>

              <div className="wizard-doc-list">
                {DOC_TYPES.map(({ key, label, hint }) => {
                  const d = docFiles[key];
                  return (
                    <div key={key} className={`wizard-doc-card${d.file ? ' uploaded' : ''}`}>
                      <div className="wizard-doc-header">
                        <div>
                          <div className="wizard-doc-title">{label}</div>
                          <div className="wizard-doc-hint">{hint}</div>
                        </div>
                        {d.file && !d.computing && d.sha && (
                          <CheckCircle2 className="wizard-doc-check" size={20} />
                        )}
                      </div>

                      {/* Drop zone */}
                      <div
                        className={`wizard-dropzone${d.file ? ' has-file' : ''}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(key, e)}
                        onClick={() => fileInputRefs[key].current?.click()}
                        role="button"
                        tabIndex={0}
                        aria-label={`Upload ${label}`}
                        onKeyDown={(e) => { if (e.key === 'Enter') fileInputRefs[key].current?.click(); }}
                      >
                        <input
                          ref={fileInputRefs[key]}
                          type="file"
                          accept=".pdf,application/pdf"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileChange(key, e.target.files?.[0] ?? null)}
                        />
                        {d.computing ? (
                          <div className="wizard-dropzone-computing">
                            <Loader2 size={20} className="spin" />
                            <span>Computing SHA-256…</span>
                          </div>
                        ) : d.file ? (
                          <div className="wizard-dropzone-uploaded">
                            <FileText size={16} />
                            <span className="wizard-dropzone-filename">{d.file.name}</span>
                            <span className="wizard-dropzone-size">({(d.file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                        ) : (
                          <div className="wizard-dropzone-prompt">
                            <Upload size={22} />
                            <span>Drop PDF here or <strong>click to browse</strong></span>
                          </div>
                        )}
                      </div>

                      {/* SHA-256 display */}
                      {d.sha && (
                        <div className="wizard-sha-row">
                          <Hash size={12} />
                          <code className="wizard-sha-value">{d.sha.slice(0, 16)}…{d.sha.slice(-8)}</code>
                          <span className="wizard-sha-label">SHA-256 verified</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Legal Affidavit & Declaration ─────────────────── */}
          {step === 3 && (
            <div className="wizard-step-content animate-fade-in">
              <h3 className="wizard-section-title"><ShieldCheck size={18} /> Legal Affidavit & Submission Declaration</h3>
              <p className="wizard-section-hint">Read the declaration carefully. Submission implies statutory commitment under the AICTE Approval Process Handbook 2026-27.</p>

              <div className="wizard-affidavit-box">
                <div className="wizard-affidavit-title">AICTE APH 2026-27 — Institutional Compliance Declaration</div>
                <p>
                  I, the undersigned authorised signatory of <strong>{institutionName || '[Institution Name]'}</strong> (AICTE Permanent ID: <strong>{aictePermanentId || '[ID]'}</strong>), 
                  do hereby solemnly declare and affirm that:
                </p>
                <ol>
                  <li>All information, documents, and data submitted in this application are true, accurate, and complete to the best of my knowledge.</li>
                  <li>The institution has complied with all statutory requirements under the AICTE Act 1987, UGC Act 1956, and applicable state regulations.</li>
                  <li>The statutory documents uploaded bear authentic SHA-256 checksums verifiable against the originals.</li>
                  <li>The institution accepts that any misrepresentation shall render this application void and may attract action under Section 10(n) of the AICTE Act 1987.</li>
                  <li>The institution consents to physical or virtual Expert Visit Committee (EVC) inspection as determined by the Regional Office.</li>
                  <li>The institution understands that approval, if granted, is subject to fulfilment of all APH 2026-27 conditions within stipulated timelines.</li>
                </ol>
                <p className="wizard-affidavit-policy">
                  Reference: AICTE Approval Process Handbook 2026-27, Chapter III, Clauses 3.1–3.9. | Application Year: 2026-27
                </p>
              </div>

              <div className="form-grid-2" style={{ marginTop: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="signatory">Signatory Designation *</label>
                  <input
                    id="signatory"
                    className="form-input"
                    placeholder="Principal / Nodal Officer"
                    value={signatoryDesignation}
                    onChange={(e) => setSignatoryDesignation(e.target.value)}
                  />
                </div>
              </div>

              <label className="wizard-affidavit-check">
                <input
                  id="affidavit-check"
                  type="checkbox"
                  checked={affidavitAccepted}
                  onChange={(e) => setAffidavitAccepted(e.target.checked)}
                />
                <span>
                  I confirm that I have read and understood the above declaration, and accept all conditions under the{' '}
                  <strong>AICTE Approval Process Handbook 2026-27</strong>.
                </span>
              </label>

              {/* Summary panel */}
              <div className="wizard-summary-panel">
                <div className="wizard-summary-title">Filing Summary</div>
                <div className="wizard-summary-grid">
                  <div className="wizard-summary-item"><span>Institution</span><strong>{institutionName}</strong></div>
                  <div className="wizard-summary-item"><span>AICTE ID</span><strong>{aictePermanentId}</strong></div>
                  <div className="wizard-summary-item"><span>Region</span><strong>{region}</strong></div>
                  <div className="wizard-summary-item"><span>Route</span><strong>{route}</strong></div>
                  <div className="wizard-summary-item"><span>Programmes</span><strong>{courses.length}</strong></div>
                  <div className="wizard-summary-item">
                    <span>Total Intake</span>
                    <strong>{courses.reduce((s, c) => s + (c.intake || 0), 0)} seats</strong>
                  </div>
                  <div className="wizard-summary-item"><span>Statutory Docs</span><strong>{DOC_TYPES.filter(({ key }) => docFiles[key].sha).length} / 3 uploaded &amp; verified</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="wizard-footer">
          <button type="button" className="btn btn-ghost" onClick={step === 0 ? onClose : back} disabled={submitting}>
            <ChevronLeft size={15} /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <div className="wizard-step-counter">Step {step + 1} of {STEPS.length}</div>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={next}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              id="wizard-submit-btn"
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !affidavitAccepted}
            >
              {submitting ? <><Loader2 size={14} className="spin" /> Submitting…</> : <><ShieldCheck size={14} /> Submit Application</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
