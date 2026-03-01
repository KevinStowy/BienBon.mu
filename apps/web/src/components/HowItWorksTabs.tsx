import { useState } from 'react';

interface Step {
  title: string;
  desc: string;
  img?: string | null;
  iconName?: string;
}

interface Props {
  consumerTab: string;
  partnerTab: string;
  consumerSteps: Step[];
  partnerSteps: Step[];
  consumerCta: string;
  consumerCtaHref: string;
  partnerCta: string;
  partnerCtaHref: string;
  stepLabel: string;
}

function StepIcon({ img, iconName, color }: { img?: string | null; iconName?: string; color: string }) {
  if (img) {
    return (
      <div className={`w-16 h-16 rounded-xl ${color} flex items-center justify-center overflow-hidden`} aria-hidden="true">
        <img src={img} alt="" className="w-full h-full object-contain p-1" />
      </div>
    );
  }

  // Fallback icon SVGs based on iconName
  const iconPaths: Record<string, string> = {
    Store: 'M3 21h18M3 7v1a3 3 0 006 0V7m0 0a3 3 0 006 0V7m0 0a3 3 0 006 0V7M3 7l1.5-4h15L21 7',
    ClipboardList: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    Smartphone: 'M12 18h.01M7 4h10a1 1 0 011 1v14a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z',
    Banknote: 'M2 9a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9zM12 12a2 2 0 100-4 2 2 0 000 4z',
    UtensilsCrossed: 'M12 12l-8-5v10l8-5zm0 0l8-5v10l-8-5z',
  };

  return (
    <div className={`w-16 h-16 rounded-xl ${color} flex items-center justify-center`} aria-hidden="true">
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d={iconPaths[iconName || 'UtensilsCrossed'] || iconPaths.UtensilsCrossed} />
      </svg>
    </div>
  );
}

export default function HowItWorksTabs({
  consumerTab,
  partnerTab,
  consumerSteps,
  partnerSteps,
  consumerCta,
  consumerCtaHref,
  partnerCta,
  partnerCtaHref,
  stepLabel,
}: Props) {
  const [activeTab, setActiveTab] = useState<'consumer' | 'partner'>('consumer');

  const isConsumer = activeTab === 'consumer';
  const steps = isConsumer ? consumerSteps : partnerSteps;
  const ctaLabel = isConsumer ? consumerCta : partnerCta;
  const ctaHref = isConsumer ? consumerCtaHref : partnerCtaHref;
  const stepColor = isConsumer ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600';
  const stepNumberColor = isConsumer ? 'text-green-700' : 'text-orange-600';
  const ctaColor = isConsumer
    ? 'bg-green-700 text-white hover:bg-green-900'
    : 'bg-orange-600 text-white hover:bg-orange-700';

  return (
    <div>
      {/* Tabs */}
      <div className="flex justify-center mb-10" role="tablist" aria-label="Parcours">
        <div className="inline-flex bg-neutral-100 rounded-xl p-1">
          <button
            type="button"
            role="tab"
            aria-selected={isConsumer}
            aria-controls="panel-consumer"
            id="tab-consumer"
            onClick={() => setActiveTab('consumer')}
            className={`px-6 py-3 rounded-lg text-sm font-bold transition-colors min-h-[44px] ${
              isConsumer
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {consumerTab}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isConsumer}
            aria-controls="panel-partner"
            id="tab-partner"
            onClick={() => setActiveTab('partner')}
            className={`px-6 py-3 rounded-lg text-sm font-bold transition-colors min-h-[44px] ${
              !isConsumer
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {partnerTab}
          </button>
        </div>
      </div>

      {/* Tab panel */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="transition-opacity duration-200"
      >
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <li key={`${activeTab}-${i}`} className="flex flex-col items-center text-center">
              <StepIcon img={step.img} iconName={step.iconName} color={stepColor} />
              <div className={`text-xs font-black mt-3 mb-1 tracking-widest ${stepNumberColor}`}>
                {stepLabel} {i + 1}
              </div>
              <h3 className="text-base font-extrabold text-neutral-900 mb-2">{step.title}</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{step.desc}</p>
            </li>
          ))}
        </ol>

        <div className="text-center mt-10">
          <a
            href={ctaHref}
            className={`inline-flex items-center justify-center px-8 py-4 rounded-lg font-bold text-base transition-colors min-h-[52px] ${ctaColor}`}
          >
            {ctaLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
