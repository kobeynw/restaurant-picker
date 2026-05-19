import { useEffect, useMemo, useState } from 'react';
import { useSession, useIsHost } from '../context/SessionContext.jsx';
import SpinWheel from '../components/SpinWheel.jsx';
import VotePanel from '../components/VotePanel.jsx';

export default function Deciding() {
  const { session, restaurants, socket, clientId } = useSession();
  const isHost = useIsHost();
  const [localVote, setLocalVote] = useState(null);

  const options = useMemo(() => {
    if (!session) return [];
    return session.suggestions
      .map((s) => restaurants.find((r) => r.id === s.restaurantId))
      .filter(Boolean);
  }, [session, restaurants]);

  const revealedVote = session?.votes ? session.votes[clientId] : null;

  useEffect(() => {
    if (revealedVote) setLocalVote(revealedVote);
  }, [revealedVote]);

  useEffect(() => {
    if (session?.status !== 'deciding' || session?.decisionMode !== 'vote') {
      setLocalVote(null);
    }
  }, [session?.status, session?.decisionMode]);

  if (!session) return null;

  function handleSpinClick() {
    socket.emit('start_spin', { sessionId: session.id });
  }

  function handleVote(restaurantId) {
    setLocalVote(restaurantId);
    socket.emit('cast_vote', { sessionId: session.id, restaurantId });
  }

  function closeVoting() {
    socket.emit('close_voting', { sessionId: session.id });
  }

  const myVote = revealedVote ?? localVote;

  return (
    <div className="min-h-screen max-w-3xl mx-auto p-4 md:p-6">
      <header className="mb-6 text-center">
        <h1 className="text-2xl md:text-3xl font-bold">
          {session.decisionMode === 'spin' ? 'Spin the wheel' : 'Cast your vote'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {options.length} contender{options.length === 1 ? '' : 's'}
        </p>
      </header>

      {session.decisionMode === 'spin' ? (
        <div className="bg-slate-900/60 rounded-2xl p-6 ring-1 ring-slate-800 flex flex-col items-center">
          <SpinWheel
            items={options}
            spinState={session.spinState}
            onSpinClick={handleSpinClick}
            disabled={!!session.winnerId}
          />
          <p className="text-xs text-slate-500 mt-4 text-center">
            Anyone can tap SPIN. Results lock in once the wheel stops.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/60 rounded-2xl p-5 ring-1 ring-slate-800">
          <VotePanel
            options={options}
            myVote={myVote}
            onVote={handleVote}
            voteProgress={session.voteProgress}
            isHost={isHost}
            onCloseVoting={closeVoting}
          />
        </div>
      )}
    </div>
  );
}
