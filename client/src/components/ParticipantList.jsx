export default function ParticipantList({ participants, myClientId }) {
  if (!participants || participants.length === 0) {
    return <div className="text-slate-500 text-sm">No one's here yet…</div>;
  }
  return (
    <ul className="space-y-1.5">
      {participants.map((p) => (
        <li
          key={p.id}
          className={`flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2 ${
            p.connected === false ? 'opacity-50' : ''
          }`}
        >
          <span className="font-medium">
            {p.name}
            {p.id === myClientId && <span className="text-slate-500 text-xs ml-2">(you)</span>}
            {p.connected === false && (
              <span className="text-amber-400 text-xs ml-2">(disconnected)</span>
            )}
          </span>
          {p.isHost && (
            <span className="text-[11px] uppercase tracking-wide bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
              Host
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
