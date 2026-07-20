import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tenantRegistrationSchema } from '../types';
import { registrationApi } from '../services/registrationApi';

const BASE_DOMAIN = import.meta.env.VITE_TENANT_BASE_DOMAIN || 'onecampus.local';

const ORG_TYPES = [
  { value: 'kindergarten', label: 'Kindergarten' },
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' }
];

export function TenantRegisterPage() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({ resolver: zodResolver(tenantRegistrationSchema) });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(null);

  const slug = watch('slug');
  const prefix = watch('prefix');

  async function onSubmit(values) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { admin_password_confirm, ...payload } = values;
      const data = await registrationApi.register(payload);
      setSubmitted(data);
    } catch (err) {
      setSubmitError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10 font-body">
        <div className="w-full max-w-[420px] rounded-xl border border-border bg-surface p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-xl text-success">
            &#10003;
          </div>
          <h1 className="font-display text-xl font-bold text-ink-900">Registration submitted</h1>
          <p className="mt-2 text-sm text-ink-500">
            <strong className="text-ink-700">{submitted.org_name}</strong> has been registered with the prefix{' '}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 text-[12.5px]">{submitted.prefix}</code>. Once
            approved, everyone signs in with just a username and password — no domain to remember — and every
            username at your institution will start with{' '}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 text-[12.5px]">{submitted.prefix}_</code>. Your
            own admin login will be{' '}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 text-[12.5px]">
              {submitted.prefix}_{submitted.admin_username}
            </code>
            . A super admin will review your registration —{' '}
            <Link to="/login" className="font-semibold underline">
              Login as Tenant
            </Link>{' '}
            once approved.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block w-full rounded bg-ink-900 py-2.5 text-sm font-semibold text-white"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10 font-body">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-[440px] rounded-xl border border-border bg-surface p-6 sm:p-8"
      >
        <div className="mb-1 text-lg font-bold text-ink-900">Register your institution</div>
        <div className="mb-6 text-sm text-ink-500">Submit your details for super admin approval.</div>

        <div className="mb-4 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Institution</div>
        <Field label="Organization Name" error={errors.org_name}>
          <input className="input" {...register('org_name')} />
        </Field>
        <Field label="Institution Type" error={errors.org_type}>
          <select className="input" defaultValue="" {...register('org_type')}>
            <option value="" disabled>
              Choose one…
            </option>
            {ORG_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subdomain" error={errors.slug}>
          <input className="input" placeholder="yourschool" {...register('slug')} />
          {slug && (
            <div className="mt-1 text-[11px] text-ink-500">
              Your domain will be{' '}
              <code className="rounded bg-surface-muted px-1 py-0.5">
                {slug}.{BASE_DOMAIN}
              </code>
            </div>
          )}
        </Field>
        <Field label="Username Prefix" error={errors.prefix}>
          <input className="input" placeholder="qs" autoCapitalize="none" {...register('prefix')} />
          <div className="mt-1 text-[11px] text-ink-500">
            {prefix
              ? (
                <>
                  Everyone's username will start with{' '}
                  <code className="rounded bg-surface-muted px-1 py-0.5">{prefix}_</code> — e.g.{' '}
                  <code className="rounded bg-surface-muted px-1 py-0.5">{prefix}_adam2345</code>. There's no
                  domain to sign in with anymore, just this prefix baked into the username.
                </>
              )
              : "A short prefix (2-6 letters/numbers) every username at your institution starts with — e.g. \"qs\" for Q School."}
          </div>
        </Field>

        <div className="mb-4 mt-5 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Contact</div>
        <Field label="Contact Name" error={errors.contact_name}>
          <input className="input" {...register('contact_name')} />
        </Field>
        <Field label="Phone Number" error={errors.contact_phone}>
          <input type="tel" className="input" {...register('contact_phone')} />
        </Field>
        <Field label="Email" error={errors.contact_email}>
          <input type="email" className="input" {...register('contact_email')} />
        </Field>

        <div className="mb-4 mt-5 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          Admin Login (used once approved)
        </div>
        <Field label="Admin Username" error={errors.admin_username}>
          <input className="input" autoCapitalize="none" {...register('admin_username')} />
          <div className="mt-1 text-[11px] text-ink-500">
            Just the part after your prefix — e.g. "principal", not "{prefix || 'qs'}_principal". Your full login
            username will have the prefix added automatically.
          </div>
        </Field>
        <Field label="Password" error={errors.admin_password}>
          <input type="password" className="input" {...register('admin_password')} />
        </Field>
        <Field label="Confirm Password" error={errors.admin_password_confirm}>
          <input type="password" className="input" {...register('admin_password_confirm')} />
        </Field>

        {submitError && <div className="mb-3 text-xs font-semibold text-danger">{submitError}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded bg-accent py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit for approval'}
        </button>

        <div className="mt-5 flex justify-between text-xs">
          <Link to="/" className="font-semibold text-ink-500 hover:text-ink-900">
            &larr; Back
          </Link>
          <Link to="/login" className="font-semibold text-ink-500 hover:text-ink-900">
            Already approved? Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 text-xs font-semibold text-ink-700">{label}</div>
      {children}
      {error && <div className="mt-1 text-[11px] font-semibold text-danger">{error.message}</div>}
    </label>
  );
}
