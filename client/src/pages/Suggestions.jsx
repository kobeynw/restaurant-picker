import { useMemo, useState } from 'react';
import { useSession, useIsHost } from '../context/SessionContext.jsx';
import RestaurantCard from '../components/RestaurantCard.jsx';
import FilterBar, { applyFilters, emptyFilters } from '../components/FilterBar.jsx';
import ParticipantList from '../components/ParticipantList.jsx';

export default function Suggestions() {
  const { session, restaurants, restaurantsLoaded, socket, clientId } = useSession();
  const isHost = useIsHost();
  const [filters, setFilters] = useState(emptyFilters);
  const [showSidebar, setShowSidebar] = useState(false);

  const suggestionsByRestaurant = useMemo(() => {
    const map = new Map();
    if (session) for (const s of session.suggestions) map.set(s.restaurantId, s);
    return map;
  }, [session]);

  const visible = useMemo(
    () => applyFilters(restaurants, filters),
    [restaurants, filters],
  );

  if (!session) return null;

  function suggest(id) {
    socket.emit('submit_suggestion', { sessionId: session.id, restaurantId: id });
  }
  function unsuggest(id) {
    socket.emit('remove_suggestion', { sessionId: session.id, restaurantId: id });
  }
  function setMode(mode) {
    socket.emit('set_decision_mode', { sessionId: session.id, mode });
  }
  function startDeciding() {
    socket.emit('start_deciding', { sessionId: session.id });
  }

  const suggestedList = session.suggestions
    .map((s) => ({ ...s, restaurant: restaurants.find((r) => r.id === s.restaurantId) }))
    .filter((s) => s.restaurant);

  const canDecide = session.suggestions.length >= 2 && session.decisionMode;

  return (
    <div className="min-h-screen max-w-6xl mx-auto p-4 md:p-6 pb-24 md:pb-6">
      <header className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {showSidebar ? 'Your pool' : 'Suggest restaurants'}
          </h1>
          <p className="text-slate-400 text-sm">
            {showSidebar
              ? `${session.suggestions.length} suggested so far`
              : `Tap any spot you'd be happy with. Pool: ${session.suggestions.length}`}
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-[1fr_320px] gap-4">
        <div className={showSidebar ? 'hidden md:block' : 'block'}>
          <div className="space-y-4">
            <FilterBar
              restaurants={restaurants}
              filters={filters}
              setFilters={setFilters}
            />
            {!restaurantsLoaded ? (
              <div className="text-slate-400 text-sm">Loading restaurants…</div>
            ) : visible.length === 0 ? (
              <div className="bg-slate-900/60 rounded-xl p-6 text-center text-slate-400 ring-1 ring-slate-800">
                No restaurants match those filters.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {visible.map((r) => {
                  const sug = suggestionsByRestaurant.get(r.id);
                  return (
                    <RestaurantCard
                      key={r.id}
                      restaurant={r}
                      suggested={!!sug}
                      suggestedByMe={sug && sug.suggestedBy === clientId}
                      onSuggest={() => suggest(r.id)}
                      onRemove={() => unsuggest(r.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className={showSidebar ? 'block' : 'hidden md:block'}>
          <div className="md:sticky md:top-4 space-y-4">
            <section className="bg-slate-900/60 rounded-xl p-4 ring-1 ring-slate-800">
              <h2 className="font-semibold mb-2">Suggestion pool</h2>
              {suggestedList.length === 0 ? (
                <p className="text-slate-500 text-sm">Nothing suggested yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {suggestedList.map((s) => (
                    <li
                      key={s.restaurantId}
                      className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2 text-sm"
                    >
                      <span className="truncate">{s.restaurant.name}</span>
                      {s.suggestedBy === clientId && (
                        <button
                          onClick={() => unsuggest(s.restaurantId)}
                          className="text-xs text-slate-400 hover:text-red-300 ml-2"
                        >
                          remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-slate-900/60 rounded-xl p-4 ring-1 ring-slate-800 space-y-3">
              <h2 className="font-semibold">Decide</h2>
              {isHost ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMode('spin')}
                      className={`py-2 rounded-lg text-sm font-semibold ring-1 transition ${
                        session.decisionMode === 'spin'
                          ? 'bg-emerald-500 text-slate-900 ring-emerald-400'
                          : 'bg-slate-800 text-slate-200 ring-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      Spin
                    </button>
                    <button
                      onClick={() => setMode('vote')}
                      className={`py-2 rounded-lg text-sm font-semibold ring-1 transition ${
                        session.decisionMode === 'vote'
                          ? 'bg-emerald-500 text-slate-900 ring-emerald-400'
                          : 'bg-slate-800 text-slate-200 ring-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      Vote
                    </button>
                  </div>
                  <button
                    onClick={startDeciding}
                    disabled={!canDecide}
                    className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-semibold"
                  >
                    Let's Decide
                  </button>
                  {!canDecide && (
                    <p className="text-xs text-slate-500">
                      {session.suggestions.length < 2
                        ? 'Need at least 2 suggestions.'
                        : 'Pick a decision mode.'}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">
                  Waiting for the host to lock it in…
                  {session.decisionMode && (
                    <span className="block mt-1 text-emerald-300">
                      Mode: {session.decisionMode}
                    </span>
                  )}
                </p>
              )}
            </section>

            <section className="bg-slate-900/60 rounded-xl p-4 ring-1 ring-slate-800">
              <h2 className="font-semibold mb-2 text-sm">
                Participants ({session.participants.length})
              </h2>
              <ParticipantList participants={session.participants} myClientId={clientId} />
            </section>
          </div>
        </aside>
      </div>

      <nav
        aria-label="View switcher"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-2">
          <button
            type="button"
            onClick={() => setShowSidebar(false)}
            aria-current={!showSidebar ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium border-t-2 transition ${
              !showSidebar
                ? 'text-emerald-300 border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span>Browse</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSidebar(true)}
            aria-current={showSidebar ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium border-t-2 transition ${
              showSidebar
                ? 'text-emerald-300 border-emerald-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span className="relative">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M5 7h14M5 12h14M5 17h14" />
              </svg>
              {session.suggestions.length > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-400 text-slate-900 text-[10px] font-bold flex items-center justify-center">
                  {session.suggestions.length}
                </span>
              )}
            </span>
            <span>Pool</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
