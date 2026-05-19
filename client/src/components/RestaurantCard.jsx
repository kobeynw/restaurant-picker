const TYPE_LABEL = {
  'fast-food': 'Fast Food',
  'fast-casual': 'Fast Casual',
  'sit-down': 'Sit-Down',
};

export default function RestaurantCard({
  restaurant,
  suggested = false,
  suggestedByMe = false,
  onSuggest,
  onRemove,
  disabled = false,
  variant = 'browse',
}) {
  const baseRing = suggested
    ? suggestedByMe
      ? 'ring-2 ring-emerald-400'
      : 'ring-2 ring-amber-400'
    : 'ring-1 ring-slate-700';

  return (
    <div
      className={`bg-slate-800/70 rounded-xl p-4 flex flex-col gap-2 ${baseRing} transition`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-base leading-tight">{restaurant.name}</h3>
        <span className="text-xs font-mono text-emerald-300 shrink-0">{restaurant.price}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {restaurant.cuisine.map((c) => (
          <span
            key={c}
            className="text-[11px] uppercase tracking-wide bg-slate-700/60 text-slate-200 px-2 py-0.5 rounded"
          >
            {c}
          </span>
        ))}
      </div>
      <div className="text-xs text-slate-400">{TYPE_LABEL[restaurant.type] || restaurant.type}</div>

      {variant === 'browse' && (
        <div className="mt-1">
          {suggested ? (
            suggestedByMe ? (
              <button
                onClick={onRemove}
                disabled={disabled}
                className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm font-medium"
              >
                Remove suggestion
              </button>
            ) : (
              <div className="w-full py-2 rounded-lg bg-amber-500/20 text-amber-200 text-sm font-medium text-center">
                Already suggested
              </div>
            )
          ) : (
            <button
              onClick={onSuggest}
              disabled={disabled}
              className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 text-sm font-semibold"
            >
              Suggest
            </button>
          )}
        </div>
      )}
    </div>
  );
}
