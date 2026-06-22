export default function VotePanel({
  options,
  ranking,
  voteLimit,
  submitted,
  onToggle,
  onLockIn,
  onEdit,
  voteProgress,
  isHost,
  onCloseVoting,
}) {
  const allVoted = voteProgress.total > 0 && voteProgress.cast >= voteProgress.total;
  const atLimit = ranking.length >= voteLimit;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-sm text-slate-400 uppercase tracking-wide">Voting</div>
        <div className="text-2xl font-bold mt-1">
          {voteProgress.cast} of {voteProgress.total} voters locked in
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {submitted
            ? 'Your ballot is locked in.'
            : `Tap to rank up to ${voteLimit} in order of preference.`}
          {!allVoted && ' Results hidden until everyone locks in.'}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const rank = ranking.indexOf(opt.id);
          const selected = rank !== -1;
          const dimmed = !selected && atLimit && !submitted;
          return (
            <button
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              disabled={submitted || dimmed}
              aria-pressed={selected}
              className={`relative text-left p-4 rounded-xl ring-2 transition disabled:cursor-not-allowed ${
                selected
                  ? 'ring-emerald-400 bg-emerald-500/10'
                  : `ring-slate-700 bg-slate-800/60 ${
                      dimmed ? 'opacity-40' : 'hover:bg-slate-800 hover:ring-slate-600'
                    }`
              } ${submitted && !selected ? 'opacity-50' : ''}`}
            >
              {selected && (
                <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-emerald-400 text-slate-900 text-xs font-bold flex items-center justify-center ring-2 ring-slate-900">
                  {rank + 1}
                </span>
              )}
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">{opt.name}</span>
                <span className="text-xs font-mono text-emerald-300 shrink-0">{opt.price}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">{opt.cuisine.join(' · ')}</div>
            </button>
          );
        })}
      </div>

      {submitted ? (
        <button
          onClick={onEdit}
          className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
        >
          Edit my votes
        </button>
      ) : (
        <button
          onClick={onLockIn}
          disabled={ranking.length === 0}
          className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-semibold"
        >
          Lock in my votes
        </button>
      )}

      {isHost && !allVoted && voteProgress.cast > 0 && (
        <button
          onClick={onCloseVoting}
          className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
        >
          Close voting now
        </button>
      )}
    </div>
  );
}
