import { useState, useMemo, useId } from 'react';

interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

interface Props {
  items: FaqItem[];
  categories: Record<string, string>;
  searchPlaceholder: string;
  noResults: string;
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-green-700 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function FaqAccordion({ items, categories, searchPlaceholder, noResults }: Props) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const searchId = useId();

  const allCategories = useMemo(() => {
    const cats = Array.from(new Set(items.map((item) => item.category)));
    return cats;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch =
        search.trim() === '' ||
        item.question.toLowerCase().includes(search.toLowerCase()) ||
        item.answer.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, search]);

  function toggleItem(index: number) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Search input */}
      <div className="mb-6">
        <label htmlFor={searchId} className="sr-only">
          {searchPlaceholder}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none" aria-hidden="true">
            <svg className="w-5 h-5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors text-sm font-medium"
            aria-label={searchPlaceholder}
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filtrer par catégorie">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-colors min-h-[40px] ${
            activeCategory === 'all'
              ? 'bg-green-700 text-white'
              : 'bg-white border-2 border-neutral-200 text-neutral-600 hover:border-green-500 hover:text-green-700'
          }`}
          aria-pressed={activeCategory === 'all'}
        >
          Tout
        </button>
        {allCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors min-h-[40px] ${
              activeCategory === cat
                ? 'bg-green-700 text-white'
                : 'bg-white border-2 border-neutral-200 text-neutral-600 hover:border-green-500 hover:text-green-700'
            }`}
            aria-pressed={activeCategory === cat}
          >
            {categories[cat] || cat}
          </button>
        ))}
      </div>

      {/* FAQ items */}
      {filteredItems.length === 0 ? (
        <p className="text-center text-neutral-500 py-12">{noResults}</p>
      ) : (
        <div className="space-y-3" role="list">
          {filteredItems.map((item, globalIndex) => {
            // Use original index in items array for stable identity
            const originalIndex = items.indexOf(item);
            const isOpen = openItems.has(originalIndex);
            const panelId = `faq-panel-${originalIndex}`;
            const buttonId = `faq-button-${originalIndex}`;

            return (
              <div
                key={originalIndex}
                className="bg-white rounded-xl border-2 border-neutral-200 hover:border-green-300 transition-colors shadow-sm"
                role="listitem"
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    onClick={() => toggleItem(originalIndex)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-bold text-neutral-900 hover:text-green-700 transition-colors min-h-[56px]"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                  >
                    <span className="flex-1 text-sm sm:text-base leading-snug">
                      {item.question}
                    </span>
                    <ChevronIcon isOpen={isOpen} />
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                >
                  <div className="px-5 pb-5 pt-0">
                    <div className="h-px bg-neutral-100 mb-4" aria-hidden="true"></div>
                    <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
