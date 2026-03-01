import { useState, useEffect } from 'react';

interface Translations {
  title: string;
  description: string;
  learnMore: string;
  privacyLink: string;
  acceptAll: string;
  rejectAll: string;
  customize: string;
  customizeTitle: string;
  essential: string;
  essentialDesc: string;
  alwaysActive: string;
  analytics: string;
  analyticsDesc: string;
  marketing: string;
  marketingDesc: string;
  save: string;
}

interface Props {
  translations: Translations;
  privacyUrl: string;
}

interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'bienbon_cookie_consent';

function getStoredConsent(): CookieConsent | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as CookieConsent;
    }
  } catch {
    // localStorage not available or invalid data
  }
  return null;
}

function storeConsent(consent: CookieConsent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // localStorage not available
  }
}

export default function CookieBanner({ translations: t, privacyUrl }: Props) {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function handleAcceptAll() {
    const consent: CookieConsent = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    };
    storeConsent(consent);
    setVisible(false);
  }

  function handleRejectAll() {
    const consent: CookieConsent = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    storeConsent(consent);
    setVisible(false);
  }

  function handleSavePreferences() {
    const consent: CookieConsent = {
      essential: true,
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
      timestamp: new Date().toISOString(),
    };
    storeConsent(consent);
    setVisible(false);
    setShowCustomize(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      role="dialog"
      aria-label={t.title}
      aria-modal="false"
    >
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-neutral-200 p-6">
        {!showCustomize ? (
          <>
            <h2 className="text-base font-bold text-neutral-900 mb-2">
              {t.title}
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              {t.description}{' '}
              {t.learnMore}{' '}
              <a
                href={privacyUrl}
                className="text-green-700 font-semibold hover:underline"
              >
                {t.privacyLink}
              </a>.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-5 py-2.5 rounded-lg bg-green-700 text-white font-bold text-sm hover:bg-green-900 transition-colors min-h-[44px]"
              >
                {t.acceptAll}
              </button>
              <button
                type="button"
                onClick={handleRejectAll}
                className="px-5 py-2.5 rounded-lg border-2 border-neutral-200 text-neutral-700 font-bold text-sm hover:border-neutral-400 transition-colors min-h-[44px]"
              >
                {t.rejectAll}
              </button>
              <button
                type="button"
                onClick={() => setShowCustomize(true)}
                className="px-5 py-2.5 rounded-lg border-2 border-neutral-200 text-neutral-700 font-bold text-sm hover:border-green-500 hover:text-green-700 transition-colors min-h-[44px]"
              >
                {t.customize}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-neutral-900">
                {t.customizeTitle}
              </h2>
              <button
                type="button"
                onClick={() => setShowCustomize(false)}
                className="w-8 h-8 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Essential cookies */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-bold text-neutral-900">{t.essential}</p>
                  <p className="text-xs text-neutral-500 mt-1">{t.essentialDesc}</p>
                </div>
                <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full whitespace-nowrap">
                  {t.alwaysActive}
                </span>
              </div>

              {/* Analytics cookies */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-bold text-neutral-900">{t.analytics}</p>
                  <p className="text-xs text-neutral-500 mt-1">{t.analyticsDesc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analyticsEnabled}
                  aria-label={t.analytics}
                  onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors min-w-[44px] min-h-[24px] ${
                    analyticsEnabled ? 'bg-green-700' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      analyticsEnabled ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Marketing cookies */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-bold text-neutral-900">{t.marketing}</p>
                  <p className="text-xs text-neutral-500 mt-1">{t.marketingDesc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={marketingEnabled}
                  aria-label={t.marketing}
                  onClick={() => setMarketingEnabled(!marketingEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors min-w-[44px] min-h-[24px] ${
                    marketingEnabled ? 'bg-green-700' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      marketingEnabled ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSavePreferences}
                className="px-5 py-2.5 rounded-lg bg-green-700 text-white font-bold text-sm hover:bg-green-900 transition-colors min-h-[44px]"
              >
                {t.save}
              </button>
              <a
                href={privacyUrl}
                className="text-sm text-green-700 font-semibold hover:underline"
              >
                {t.privacyLink}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
