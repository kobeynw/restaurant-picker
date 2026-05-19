import { useMemo } from 'react';

const TYPES = [
  { value: 'fast-food', label: 'Fast Food' },
  { value: 'fast-casual', label: 'Fast Casual' },
  { value: 'sit-down', label: 'Sit-Down' },
];

const PRICES = ['$', '$$', '$$$'];

export default function FilterBar({ restaurants, filters, setFilters }) {
  const allCuisines = useMemo(() => {
    const set = new Set();
    for (const r of restaurants) for (const c of r.cuisine) set.add(c);
    return [...set].sort();
  }, [restaurants]);

  function toggleArrayItem(key, value) {
    setFilters((f) => {
      const cur = f[key];
      return {
        ...f,
        [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
      };
    });
  }

  function clearAll() {
    setFilters({ cuisines: [], types: [], prices: [], query: '' });
  }

  const anyActive =
    filters.cuisines.length > 0 ||
    filters.types.length > 0 ||
    filters.prices.length > 0 ||
    filters.query.trim() !== '';

  return (
    <div className="space-y-3 bg-slate-900/60 p-3 rounded-xl ring-1 ring-slate-800">
      <input
        type="search"
        value={filters.query}
        onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
        placeholder="Search restaurants…"
        className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Type</div>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => {
            const active = filters.types.includes(t.value);
            return (
              <button
                key={t.value}
                onClick={() => toggleArrayItem('types', t.value)}
                className={`text-xs px-3 py-1.5 rounded-full ring-1 transition ${
                  active
                    ? 'bg-emerald-500 text-slate-900 ring-emerald-400'
                    : 'bg-slate-800 text-slate-200 ring-slate-700 hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Price</div>
        <div className="flex flex-wrap gap-2">
          {PRICES.map((p) => {
            const active = filters.prices.includes(p);
            return (
              <button
                key={p}
                onClick={() => toggleArrayItem('prices', p)}
                className={`text-xs px-3 py-1.5 rounded-full ring-1 font-mono transition ${
                  active
                    ? 'bg-emerald-500 text-slate-900 ring-emerald-400'
                    : 'bg-slate-800 text-slate-200 ring-slate-700 hover:bg-slate-700'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Cuisine</div>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {allCuisines.map((c) => {
            const active = filters.cuisines.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleArrayItem('cuisines', c)}
                className={`text-[11px] px-2 py-1 rounded ring-1 transition ${
                  active
                    ? 'bg-emerald-500 text-slate-900 ring-emerald-400'
                    : 'bg-slate-800 text-slate-200 ring-slate-700 hover:bg-slate-700'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {anyActive && (
        <button
          onClick={clearAll}
          className="text-xs text-slate-400 hover:text-slate-200 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export function applyFilters(restaurants, filters) {
  const q = filters.query.trim().toLowerCase();
  return restaurants.filter((r) => {
    if (filters.types.length > 0 && !filters.types.includes(r.type)) return false;
    if (filters.prices.length > 0 && !filters.prices.includes(r.price)) return false;
    if (filters.cuisines.length > 0 && !r.cuisine.some((c) => filters.cuisines.includes(c)))
      return false;
    if (q) {
      const inName = r.name.toLowerCase().includes(q);
      const inCuisine = r.cuisine.some((c) => c.toLowerCase().includes(q));
      if (!inName && !inCuisine) return false;
    }
    return true;
  });
}

export const emptyFilters = { cuisines: [], types: [], prices: [], query: '' };
