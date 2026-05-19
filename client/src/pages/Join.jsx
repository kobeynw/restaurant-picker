import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';

export default function Join() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const isHostFlag = searchParams.get('host') === '1';
  const navigate = useNavigate();
  const { joinSession, session, myName, joinError } = useSession();
  const [name, setName] = useState(myName);
  const [submitted, setSubmitted] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => {
        if (cancelled) return;
        if (r.status === 404) setNotFound(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (submitted && session && session.id === sessionId) {
      navigate(`/session/${sessionId}`, { replace: true });
    }
  }, [submitted, session, sessionId, navigate]);

  useEffect(() => {
    if (joinError) setSubmitted(false);
  }, [joinError]);

  function handleJoin(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    joinSession(sessionId, trimmed);
    setSubmitted(true);
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">Session not found</h1>
          <p className="text-slate-400 text-sm">Ask the host for a fresh link.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleJoin} className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            {isHostFlag ? 'Start hosting' : 'Join the round'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Pick a name your team will recognize.</p>
        </div>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your display name"
          maxLength={32}
          className="w-full bg-slate-800 rounded-lg px-4 py-3 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!name.trim() || submitted}
          className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-semibold"
        >
          {submitted ? 'Joining…' : 'Join'}
        </button>
        {joinError && (
          <p className="text-sm text-red-400 text-center">{joinError.message}</p>
        )}
      </form>
    </div>
  );
}
