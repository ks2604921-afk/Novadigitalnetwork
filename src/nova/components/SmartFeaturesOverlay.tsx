import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  Check,
  Copy,
  Info,
  LogOut,
  Power,
  ShieldCheck,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import type { ContentKind } from '@/nova/related-catalog';
import type { ControlMode, CoWatchRoomState, ParticipantRole } from '@/nova/hooks/useCoWatchSync';

export type SmartFeatureTab = 'cowatch' | 'dialogue' | 'family' | 'scene';

type SmartFeaturesOverlayProps = {
  title: string;
  sceneKind: ContentKind;
  episodeTag?: string | undefined;
  currentTimeLabel: string;
  durationLabel: string;
  isIntro: boolean;
  audioLang: string;
  subtitle: string;
  dialogueBoost: boolean;
  onToggleDialogueBoost: () => void;
  familySafe: boolean;
  onToggleFamilySafe: () => void;
  roomId: string;
  role: ParticipantRole;
  room: CoWatchRoomState | null;
  connected: boolean;
  companionUrl: string;
  onEnsureHostRoom: () => Promise<string>;
  onJoinByRoomId: (roomId: string) => Promise<unknown>;
  onSetControlMode: (mode: ControlMode) => Promise<void>;
  onLeaveParty: () => Promise<void>;
  onEndParty: () => Promise<void>;
  onClose: () => void;
};

export default function SmartFeaturesOverlay({
  title,
  sceneKind,
  episodeTag,
  currentTimeLabel,
  durationLabel,
  isIntro,
  audioLang,
  subtitle,
  dialogueBoost,
  onToggleDialogueBoost,
  familySafe,
  onToggleFamilySafe,
  roomId,
  role,
  room,
  connected,
  companionUrl,
  onEnsureHostRoom,
  onJoinByRoomId,
  onSetControlMode,
  onLeaveParty,
  onEndParty,
  onClose,
}: SmartFeaturesOverlayProps) {
  const [activeTab, setActiveTab] = useState<SmartFeatureTab>('cowatch');
  const [copiedType, setCopiedType] = useState<'id' | 'link' | null>(null);
  const [joinInput, setJoinInput] = useState('');
  const [joinOpen, setJoinOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'cowatch' && !roomId) {
      void onEnsureHostRoom();
    }
  }, [activeTab, roomId, onEnsureHostRoom]);

  useEffect(() => {
    const first = rootRef.current?.querySelector<HTMLElement>('[data-dpad-item="true"]');
    first?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const target = event.target as HTMLElement | null;
    if (target?.tagName === 'INPUT') return;

    const items = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[data-dpad-item="true"]:not([disabled])') ?? [],
    );
    if (items.length === 0) return;

    event.preventDefault();
    event.stopPropagation();
    const currentIndex = items.findIndex(el => el === document.activeElement);
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + delta + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  const copyText = (value: string, type: 'id' | 'link') => {
    try {
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(value).catch(() => {});
      }
      setCopiedType(type);
      window.setTimeout(() => setCopiedType(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const controlMode: ControlMode = room?.controlMode ?? 'host-only';
  const participantCount = room?.participants.length || (roomId ? 1 : 0);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Smart Features"
      data-testid="smart-features-panel"
      onKeyDown={handleKeyDown}
      className="pointer-events-auto fixed inset-0 z-[140] flex flex-col overflow-y-auto bg-[#09080f]/92 text-white backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-5 sm:px-6 sm:py-7">
        {/* Clean Minimal Header */}
        <header className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <button
            type="button"
            data-dpad-item="true"
            aria-label="Close Smart Features"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 text-xs font-semibold text-white transition hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <h2 className="text-base font-bold text-white sm:text-lg">Smart Features</h2>

          <button
            type="button"
            data-dpad-item="true"
            aria-label="Close Smart Features icon"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.07] text-white transition hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Simple 4-Section Navigation Bar */}
        <nav
          aria-label="Smart Feature Sections"
          className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {(
            [
              { id: 'cowatch', label: 'Co-Watch', Icon: Users },
              { id: 'dialogue', label: 'Dialogue Boost', Icon: Volume2 },
              { id: 'family', label: 'Family Safe Mode', Icon: ShieldCheck },
              { id: 'scene', label: 'Scene Info', Icon: Info },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                data-dpad-item="true"
                aria-pressed={active}
                onClick={() => setActiveTab(id)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:text-sm ${
                  active
                    ? 'border-[#c084fc]/60 bg-white/[0.14] text-white'
                    : 'border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Section Body */}
        <main className="mt-5 flex flex-1 flex-col justify-center">
          {activeTab === 'cowatch' && (
            <section
              data-testid="tv-cowatch-card"
              aria-label="Co-Watch Room Controls"
              className="rounded-2xl border border-white/15 bg-white/[0.05] px-5 py-6 backdrop-blur-xl sm:px-8 sm:py-7"
            >
              {/* Top Headline */}
              <div className="text-center">
                <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Invite your friends to watch together
                </h3>
                <p className="mt-1 text-xs text-white/60">
                  {connected ? 'Live Sync Connected' : 'Room Ready'} · {participantCount}{' '}
                  {participantCount === 1 ? 'viewer' : 'viewers'}
                </p>
              </div>

              {/* Left: QR Code | Center: Vertical Line | Right: Room ID */}
              <div className="mt-7 grid grid-cols-1 items-center gap-6 sm:grid-cols-[1fr_auto_1fr] sm:gap-8">
                {/* Left Side: QR Code */}
                <div
                  data-testid="cowatch-qr-block"
                  className="flex flex-col items-center justify-center text-center"
                >
                  <div className="rounded-xl bg-white p-3">
                    <QRCodeSVG
                      value={companionUrl || `https://nova-tv.app/cowatch?room=${roomId || 'CW-8492'}`}
                      size={150}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#0b0716"
                      aria-label={`QR code to open Mobile Companion Dashboard for room ${roomId || 'CW-8492'}`}
                    />
                  </div>
                  <p className="mt-2.5 text-xs font-medium text-white/80">
                    Scan QR code to join on phone
                  </p>
                </div>

                {/* Middle Dividing Line */}
                <div className="h-px w-full bg-white/15 sm:hidden" aria-hidden="true" />
                <div className="hidden h-44 w-px bg-white/20 sm:block" aria-hidden="true" />

                {/* Right Side: Room ID */}
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-medium uppercase tracking-widest text-white/60">
                    Room ID
                  </p>
                  <p
                    data-testid="cowatch-room-id"
                    className="mt-2 font-mono text-3xl font-extrabold tracking-[0.16em] text-white sm:text-4xl"
                  >
                    {roomId || 'CW-8492'}
                  </p>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      data-dpad-item="true"
                      onClick={() => copyText(roomId || 'CW-8492', 'id')}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      {copiedType === 'id' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedType === 'id' ? 'Copied' : 'Copy ID'}</span>
                    </button>
                    <button
                      type="button"
                      data-dpad-item="true"
                      onClick={() => copyText(companionUrl, 'link')}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      {copiedType === 'link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedType === 'link' ? 'Copied Link' : 'Copy Link'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    data-dpad-item="true"
                    onClick={() => setJoinOpen(prev => !prev)}
                    className="mt-3 text-xs text-white/70 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {joinOpen ? 'Cancel' : 'Join with a Room ID'}
                  </button>

                  {joinOpen && (
                    <form
                      onSubmit={event => {
                        event.preventDefault();
                        if (!joinInput.trim()) return;
                        void onJoinByRoomId(joinInput);
                        setJoinOpen(false);
                        setJoinInput('');
                      }}
                      className="mt-2.5 flex w-full max-w-xs items-center gap-2"
                    >
                      <input
                        type="text"
                        value={joinInput}
                        onChange={e => setJoinInput(e.target.value)}
                        placeholder="CW-8492"
                        aria-label="Join Room ID"
                        className="h-9 flex-1 rounded-lg border border-white/20 bg-black/40 px-3 font-mono text-xs uppercase text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        data-dpad-item="true"
                        className="h-9 rounded-lg bg-white/20 px-3 text-xs font-bold text-white hover:bg-white/30"
                      >
                        Join
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Bottom Bar: Sync Control Toggle + Leave / End Party */}
              <div className="mt-7 flex flex-col gap-4 border-t border-white/12 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div
                  data-testid="cowatch-sync-control"
                  role="radiogroup"
                  aria-label="Playback Sync Control"
                  className="flex flex-wrap items-center gap-2"
                >
                  <button
                    type="button"
                    role="radio"
                    data-dpad-item="true"
                    aria-checked={controlMode === 'host-only'}
                    disabled={role !== 'host'}
                    onClick={() => void onSetControlMode('host-only')}
                    className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60 ${
                      controlMode === 'host-only'
                        ? 'border-[#c084fc] bg-[#7200ff]/35 text-white'
                        : 'border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/10'
                    }`}
                  >
                    Host Only Control
                  </button>
                  <button
                    type="button"
                    role="radio"
                    data-dpad-item="true"
                    aria-checked={controlMode === 'everyone'}
                    disabled={role !== 'host'}
                    onClick={() => void onSetControlMode('everyone')}
                    className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60 ${
                      controlMode === 'everyone'
                        ? 'border-[#f472b6] bg-[#ec4899]/25 text-white'
                        : 'border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/10'
                    }`}
                  >
                    Everyone Can Control
                  </button>
                </div>

                {role === 'host' ? (
                  <button
                    type="button"
                    data-dpad-item="true"
                    data-testid="cowatch-party-action-btn"
                    onClick={() => {
                      void onEndParty();
                      onClose();
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-rose-400/45 bg-rose-500/20 px-5 text-xs font-bold text-rose-100 transition hover:bg-rose-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <Power className="h-4 w-4" />
                    <span>End Party</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    data-dpad-item="true"
                    data-testid="cowatch-party-action-btn"
                    onClick={() => {
                      void onLeaveParty();
                      onClose();
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-amber-400/45 bg-amber-500/20 px-5 text-xs font-bold text-amber-100 transition hover:bg-amber-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Leave Party</span>
                  </button>
                )}
              </div>
            </section>
          )}

          {activeTab === 'dialogue' && (
            <section
              aria-label="Dialogue Boost Settings"
              className="rounded-2xl border border-white/15 bg-white/[0.05] p-6 backdrop-blur-xl sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white sm:text-xl">Dialogue Boost</h3>
                  <p className="mt-1 text-xs text-white/70 sm:text-sm">
                    Boosts spoken dialogue clarity over background music and sound effects.
                  </p>
                </div>
                <button
                  type="button"
                  data-dpad-item="true"
                  aria-pressed={dialogueBoost}
                  onClick={onToggleDialogueBoost}
                  className={`inline-flex h-10 items-center rounded-full border px-5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    dialogueBoost
                      ? 'border-[#c084fc] bg-[#7200ff]/35 text-white'
                      : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Dialogue Boost: {dialogueBoost ? 'ON' : 'OFF'}
                </button>
              </div>
            </section>
          )}

          {activeTab === 'family' && (
            <section
              aria-label="Family Safe Mode Settings"
              className="rounded-2xl border border-white/15 bg-white/[0.05] p-6 backdrop-blur-xl sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white sm:text-xl">Family Safe Mode</h3>
                  <p className="mt-1 text-xs text-white/70 sm:text-sm">
                    Keeps playback family-friendly with content filtering active.
                  </p>
                </div>
                <button
                  type="button"
                  data-dpad-item="true"
                  aria-pressed={familySafe}
                  onClick={onToggleFamilySafe}
                  className={`inline-flex h-10 items-center rounded-full border px-5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    familySafe
                      ? 'border-[#c084fc] bg-[#7200ff]/35 text-white'
                      : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Family Safe Mode: {familySafe ? 'ON' : 'OFF'}
                </button>
              </div>
            </section>
          )}

          {activeTab === 'scene' && (
            <section
              data-testid="scene-info-card"
              aria-label="Scene Info Details"
              className="rounded-2xl border border-white/15 bg-white/[0.05] p-6 backdrop-blur-xl sm:p-8"
            >
              <h3 className="text-lg font-bold text-white sm:text-xl">Scene Info</h3>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-white/55">Title</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {title} · {sceneKind}{episodeTag ? ` ${episodeTag}` : ''}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-white/55">Playback</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {isIntro ? 'Intro Sequence' : 'Main Feature'} · {currentTimeLabel} / {durationLabel}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-white/55">Audio &amp; Subtitles</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {audioLang} · Subtitles: {subtitle}
                  </p>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
