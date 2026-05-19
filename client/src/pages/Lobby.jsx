import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useSession, useIsHost } from '../context/SessionContext.jsx';
import ParticipantList from '../components/ParticipantList.jsx';

export default function Lobby() {
  const { session, socket, clientId } = useSession();
  const isHost = useIsHost();
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const joinUrl =
    typeof window !== 'undefined' && session
      ? `${window.location.origin}/join/${session.id}`
      : '';

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, { width: 240, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [joinUrl]);

  function copyLink() {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  function startSuggesting() {
    socket.emit('start_suggesting', { sessionId: session.id });
  }

  if (!session) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">
          Lunch<span className="text-emerald-400">Spin</span>
        </h1>
        <p className="text-slate-400 text-sm">Lobby · {session.id}</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-slate-900/60 rounded-xl p-5 ring-1 ring-slate-800 space-y-4">
          <h2 className="text-lg font-semibold">Invite your team</h2>
          <div className="bg-white p-2 rounded-lg flex items-center justify-center aspect-square max-w-xs mx-auto">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Join QR code" className="w-full h-full" />
            ) : (
              <span className="text-slate-400 text-sm">Generating QR…</span>
            )}
          </div>
          <div className="space-y-2">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Join link</div>
            <div className="flex gap-2">
              <input
                readOnly
                value={joinUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-sm font-mono"
              />
              <button
                onClick={copyLink}
                className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Anyone on the same Wi-Fi can open this link.
            </p>
          </div>
        </section>

        <section className="bg-slate-900/60 rounded-xl p-5 ring-1 ring-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">In the lobby</h2>
            <span className="text-xs text-slate-400">{session.participants.length} joined</span>
          </div>
          <ParticipantList participants={session.participants} myClientId={clientId} />

          {isHost ? (
            <button
              onClick={startSuggesting}
              disabled={session.participants.length < 1}
              className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-semibold"
            >
              Start Suggesting
            </button>
          ) : (
            <p className="text-sm text-slate-400 text-center">
              Waiting for the host to start…
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
