import { useMemo } from 'react';
import { useSession, useIsHost } from '../context/SessionContext.jsx';
import SpinWheel, { angleForIndex } from '../components/SpinWheel.jsx';

export default function Result() {
  const { session, restaurants, socket } = useSession();
  const isHost = useIsHost();

  const winner = useMemo(() => {
    if (!session || session.winnerId == null) return null;
    return restaurants.find((r) => r.id === session.winnerId) || null;
  }, [session, restaurants]);

  const wheelItems = useMemo(() => {
    if (!session) return [];
    return session.suggestions
      .map((s) => restaurants.find((r) => r.id === s.restaurantId))
      .filter(Boolean);
  }, [session, restaurants]);

  const winnerWheelAngle = useMemo(() => {
    if (!winner || wheelItems.length === 0) return 0;
    const idx = wheelItems.findIndex((r) => r.id === winner.id);
    if (idx < 0) return 0;
    return angleForIndex(idx, wheelItems.length);
  }, [winner, wheelItems]);

  const tally = useMemo(() => {
    if (!session || !session.votes) return null;
    const N = session.voteLimit ?? 1;
    const points = new Map();
    for (const ranking of Object.values(session.votes)) {
      ranking.forEach((id, idx) => points.set(id, (points.get(id) || 0) + (N - idx)));
    }
    return [...points.entries()]
      .map(([id, count]) => ({
        restaurant: restaurants.find((r) => r.id === id),
        count,
      }))
      .filter((x) => x.restaurant)
      .sort((a, b) => b.count - a.count);
  }, [session, restaurants]);

  if (!session) return null;

  function newRound() {
    socket.emit('new_round', { sessionId: session.id });
  }

  const isSpin = session.decisionMode === 'spin';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {isSpin && winner && wheelItems.length > 0 && (
          <div className="flex justify-center">
            <SpinWheel items={wheelItems} staticAngle={winnerWheelAngle} />
          </div>
        )}

        <div>
          <p className="text-sm uppercase tracking-widest text-emerald-400">Lunch is</p>
          {winner ? (
            <h1 className="text-4xl md:text-5xl font-bold mt-2">{winner.name}</h1>
          ) : (
            <h1 className="text-2xl font-bold mt-2 text-slate-300">Resolving…</h1>
          )}
        </div>

        {session.decisionMode === 'vote' && tally && tally.length > 0 && (
          <div className="bg-slate-900/60 rounded-2xl p-4 ring-1 ring-slate-800 text-left">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Tally</div>
            <ul className="space-y-1.5">
              {tally.map(({ restaurant, count }) => (
                <li
                  key={restaurant.id}
                  className={`flex items-center justify-between text-sm rounded-lg px-3 py-1.5 ${
                    restaurant.id === session.winnerId
                      ? 'bg-emerald-500/15 text-emerald-200'
                      : 'bg-slate-800/60'
                  }`}
                >
                  <span className="truncate">{restaurant.name}</span>
                  <span className="font-mono text-xs">
                    {count} pt{count === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isHost ? (
          <button
            onClick={newRound}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold"
          >
            New Round
          </button>
        ) : (
          <p className="text-sm text-slate-400">Waiting for the host to start a new round…</p>
        )}
      </div>
    </div>
  );
}
