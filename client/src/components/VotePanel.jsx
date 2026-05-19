export default function VotePanel({
  options,
  myVote,
  onVote,
  voteProgress,
  isHost,
  onCloseVoting,
  disabled = false,
}) {
  const allVoted = voteProgress.total > 0 && voteProgress.cast >= voteProgress.total;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-sm text-slate-400 uppercase tracking-wide">Voting</div>
        <div className="text-2xl font-bold mt-1">
          {voteProgress.cast} of {voteProgress.total} voted
        </div>
        {!allVoted && (
          <p className="text-xs text-slate-500 mt-1">Results hidden until everyone votes.</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const selected = myVote === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onVote(opt.id)}
              disabled={disabled}
              aria-pressed={selected}
              className={`relative text-left p-4 rounded-xl ring-2 transition disabled:opacity-50 ${
                selected
                  ? 'ring-emerald-400 bg-emerald-500/10'
                  : 'ring-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:ring-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">{opt.name}</span>
                <span className="text-xs font-mono text-emerald-300 shrink-0">{opt.price}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">{opt.cuisine.join(' · ')}</div>
            </button>
          );
        })}
      </div>

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
