import { useState, useId } from 'react';

interface Translations {
  formTitle: string;
  formFirstName: string;
  formLastName: string;
  formEmail: string;
  formPhone: string;
  formBusinessName: string;
  formBusinessType: string;
  formBusinessTypePlaceholder: string;
  formBusinessTypes: Record<string, string>;
  formAddress: string;
  formBrn: string;
  formDescription: string;
  formConsent: string;
  formCgu: string;
  formAnd: string;
  formPrivacy: string;
  formSubmit: string;
  formSuccess: string;
  formRequired: string;
  formEmailInvalid: string;
  formPhoneInvalid: string;
  formConsentRequired: string;
}

interface Props {
  translations: Translations;
  cguUrl: string;
  privacyUrl: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: string;
  address: string;
  brn: string;
  description: string;
  consent: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  businessType?: string;
  address?: string;
  description?: string;
  consent?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  return /^[\d\s+()-]{7,}$/.test(phone);
}

export default function PartnerRegistrationForm({ translations: t, cguUrl, privacyUrl }: Props) {
  const formId = useId();
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    businessType: '',
    address: '',
    brn: '',
    description: '',
    consent: false,
  });

  function validate(): FormErrors {
    const newErrors: FormErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = t.formRequired;
    if (!formData.lastName.trim()) newErrors.lastName = t.formRequired;
    if (!formData.email.trim()) {
      newErrors.email = t.formRequired;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t.formEmailInvalid;
    }
    if (!formData.phone.trim()) {
      newErrors.phone = t.formRequired;
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = t.formPhoneInvalid;
    }
    if (!formData.businessName.trim()) newErrors.businessName = t.formRequired;
    if (!formData.businessType) newErrors.businessType = t.formRequired;
    if (!formData.address.trim()) newErrors.address = t.formRequired;
    if (!formData.description.trim()) newErrors.description = t.formRequired;
    if (!formData.consent) newErrors.consent = t.formConsentRequired;
    return newErrors;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      // Mock submit — no backend yet
      setSubmitted(true);
    }
  }

  function updateField(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof FormErrors];
        return next;
      });
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center" role="alert">
        <svg className="w-12 h-12 mx-auto mb-4 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg font-bold text-green-700">{t.formSuccess}</p>
      </div>
    );
  }

  const businessTypeOptions = Object.entries(t.formBusinessTypes);

  function renderField(
    field: keyof FormData,
    label: string,
    type: string = 'text',
    required: boolean = true,
    options?: { placeholder?: string }
  ) {
    const id = `${formId}-${field}`;
    const errorId = `${id}-error`;
    const error = errors[field as keyof FormErrors];

    return (
      <div>
        <label htmlFor={id} className="block text-sm font-bold text-neutral-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
        {type === 'textarea' ? (
          <textarea
            id={id}
            value={formData[field] as string}
            onChange={(e) => updateField(field, e.target.value)}
            rows={3}
            className={`w-full px-4 py-3 rounded-lg border-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-colors ${
              error ? 'border-red-400 focus:border-red-500' : 'border-neutral-200 focus:border-green-500'
            }`}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={!!error}
            aria-required={required}
          />
        ) : type === 'select' ? (
          <select
            id={id}
            value={formData[field] as string}
            onChange={(e) => updateField(field, e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-colors ${
              error ? 'border-red-400 focus:border-red-500' : 'border-neutral-200 focus:border-green-500'
            }`}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={!!error}
            aria-required={required}
          >
            <option value="">{options?.placeholder || ''}</option>
            {businessTypeOptions.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            type={type}
            value={formData[field] as string}
            onChange={(e) => updateField(field, e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-colors ${
              error ? 'border-red-400 focus:border-red-500' : 'border-neutral-200 focus:border-green-500'
            }`}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={!!error}
            aria-required={required}
          />
        )}
        {error && (
          <p id={errorId} className="mt-1 text-xs text-red-500 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <h3 className="text-xl font-extrabold text-neutral-900 mb-6">{t.formTitle}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderField('firstName', t.formFirstName)}
        {renderField('lastName', t.formLastName)}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderField('email', t.formEmail, 'email')}
        {renderField('phone', t.formPhone, 'tel')}
      </div>

      {renderField('businessName', t.formBusinessName)}
      {renderField('businessType', t.formBusinessType, 'select', true, {
        placeholder: t.formBusinessTypePlaceholder,
      })}
      {renderField('address', t.formAddress)}
      {renderField('brn', t.formBrn, 'text', false)}
      {renderField('description', t.formDescription, 'textarea')}

      {/* Consent checkbox */}
      <div>
        <div className="flex items-start gap-3">
          <input
            id={`${formId}-consent`}
            type="checkbox"
            checked={formData.consent}
            onChange={(e) => updateField('consent', e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-2 border-neutral-200 text-green-700 focus:ring-green-500 min-w-[20px]"
            aria-describedby={errors.consent ? `${formId}-consent-error` : undefined}
            aria-invalid={!!errors.consent}
            aria-required="true"
          />
          <label htmlFor={`${formId}-consent`} className="text-sm text-neutral-600 leading-relaxed">
            {t.formConsent}{' '}
            <a href={cguUrl} className="text-green-700 font-semibold hover:underline" target="_blank" rel="noopener noreferrer">
              {t.formCgu}
            </a>{' '}
            {t.formAnd}{' '}
            <a href={privacyUrl} className="text-green-700 font-semibold hover:underline" target="_blank" rel="noopener noreferrer">
              {t.formPrivacy}
            </a>
            <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
          </label>
        </div>
        {errors.consent && (
          <p id={`${formId}-consent-error`} className="mt-1 text-xs text-red-500 font-medium ml-8" role="alert">
            {errors.consent}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="w-full sm:w-auto px-8 py-4 rounded-lg bg-green-700 text-white font-bold text-base hover:bg-green-900 transition-colors min-h-[52px]"
      >
        {t.formSubmit}
      </button>
    </form>
  );
}
