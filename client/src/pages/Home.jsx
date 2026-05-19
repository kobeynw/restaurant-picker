import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function startNewRound() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create session');
      const { sessionId } = await res.json();
      navigate(`/join/${sessionId}?host=1`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">
            Lunch<span className="text-emerald-400">Spin</span>
          </h1>
          <p className="text-slate-400 mt-2">Decide where to eat — together, fast.</p>
        </div>

        <button
          onClick={startNewRound}
          disabled={busy}
          className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-bold text-lg transition"
        >
          {busy ? 'Creating…' : 'Start New Round'}
        </button>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <p className="text-xs text-slate-500">
          Hosts a session on this machine. Share the join link with your team on the same Wi-Fi.
        </p>
      </div>
    </div>
  );
}
