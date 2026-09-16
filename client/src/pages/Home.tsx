import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowRight,
  AudioLines,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  Clipboard,
  Copy,
  Film,
  Flame,
  Headphones,
  Heart,
  Link2,
  Lock,
  MessageCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Radio,
  Search,
  Send,
  Settings2,
  Share2,
  Sparkles,
  SquareArrowOutUpRight,
  SunMedium,
  Users,
  Video,
  Volume2,
  Waves,
  X,
  Youtube,
  Zap,
} from "lucide-react";

type Platform = "YouTube" | "Twitch" | "Netflix" | "Generic web";
type Tab = "chat" | "people";

type Member = {
  name: string;
  initials: string;
  color: string;
  role?: string;
  speaking?: boolean;
  mic?: boolean;
  watching?: string;
  you?: boolean;
};

type ChatMessage = {
  id: number;
  name: string;
  initials: string;
  color: string;
  message: string;
  time: string;
  reactions?: string[];
  own?: boolean;
};

const initialMembers: Member[] = [
  { name: "Rahul Mehta", initials: "RM", color: "#e99658", role: "Host", speaking: true, mic: true, watching: "1:24:32" },
  { name: "Ananya Shah", initials: "AS", color: "#c47bde", mic: true, watching: "1:24:31" },
  { name: "You", initials: "YO", color: "#8eabe9", mic: false, watching: "1:24:32", you: true },
  { name: "Kabir Rao", initials: "KR", color: "#8ccfb4", mic: true, watching: "1:24:30" },
];

const initialMessages: ChatMessage[] = [
  { id: 1, name: "Rahul Mehta", initials: "RM", color: "#e99658", message: "Okay, this shot is unreal.", time: "9:42 PM", reactions: ["🔥", "❤️"] },
  { id: 2, name: "Ananya Shah", initials: "AS", color: "#c47bde", message: "Right?? The lighting is perfect", time: "9:42 PM" },
  { id: 3, name: "Kabir Rao", initials: "KR", color: "#8ccfb4", message: "Wait for the next scene 👀", time: "9:43 PM", reactions: ["👀"] },
  { id: 4, name: "PlayOra", initials: "P", color: "#d6ff3f", message: "Everyone is 1.2s out of sync", time: "9:43 PM", reactions: ["✓"] },
];

const platforms: { label: Platform; icon: typeof Youtube; tint: string }[] = [
  { label: "YouTube", icon: Youtube, tint: "#ff6666" },
  { label: "Twitch", icon: Radio, tint: "#a88bff" },
  { label: "Netflix", icon: Film, tint: "#e64d5b" },
  { label: "Generic web", icon: Link2, tint: "#d6ff3f" },
];

function Avatar({ member, small = false }: { member: Pick<Member, "initials" | "color">; small?: boolean }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-[#0b0d10] ${small ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"}`} style={{ background: member.color }}>
      {member.initials}
    </span>
  );
}

function IconButton({ label, children, active = false, onClick }: { label: string; children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className={`btn-press inline-flex h-9 w-9 items-center justify-center rounded-lg border text-[#a6adbd] transition-colors ${active ? "border-[#d6ff3f]/30 bg-[#d6ff3f]/10 text-[#d6ff3f]" : "border-white/[.08] bg-white/[.03] hover:border-white/20 hover:bg-white/[.08] hover:text-white"}`}>
      {children}
    </button>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#d6ff3f] text-[#11150e] shadow-[0_0_25px_rgba(214,255,63,.15)]">
        <Waves size={18} strokeWidth={2.6} />
      </div>
      {!compact && <span className="text-[15px] font-extrabold tracking-[-.03em] text-white">playora<span className="text-[#d6ff3f]">.</span></span>}
    </div>
  );
}

function Landing({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  const { user, isAuthenticated } = useAuth();
  const featureStats = [
    ["01", "Sync playback", "Stay perfectly in step, even across different networks."],
    ["02", "Talk it out", "Voice, chat, and reactions made for shared moments."],
    ["03", "Any screen", "YouTube, Twitch, Netflix, or your favorite web player."],
  ];

  return (
    <div className="playora-shell relative overflow-hidden">
      <div className="noise-overlay" />
      <div className="ambient-orb left-[10%] top-[18%] bg-[#d6ff3f]" />
      <div className="ambient-orb right-[8%] top-[4%] bg-[#566de4]" />
      <header className="relative z-10 mx-auto flex max-w-[1240px] items-center justify-between px-6 py-6 lg:px-8">
        <Brand />
        <nav className="hidden items-center gap-8 text-[12px] font-semibold text-[#8c93a5] md:flex">
          <a href="#how-it-works" className="transition hover:text-white">How it works</a>
          <a href="#platforms" className="transition hover:text-white">Platforms</a>
          <a href="#safety" className="transition hover:text-white">Built responsibly</a>
        </nav>
        <div className="flex items-center gap-2">
          {isAuthenticated ? <span className="hidden text-xs text-[#a7adbd] sm:inline">Hi, {user?.name?.split(" ")[0] || "there"}</span> : <button onClick={() => startLogin()} className="btn-press hidden rounded-full px-4 py-2 text-xs font-bold text-white transition hover:bg-white/[.06] sm:inline">Sign in</button>}
          <Button onClick={onCreate} className="btn-press h-9 rounded-full bg-[#d6ff3f] px-4 text-[11px] font-extrabold text-[#10150d] hover:bg-[#e1ff70]">Start a party <ArrowRight size={14} className="ml-1" /></Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1240px] px-6 pb-20 pt-14 lg:px-8 lg:pt-24">
        <section className="grid items-center gap-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-20">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d6ff3f]/20 bg-[#d6ff3f]/[.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#d6ff3f]"><span className="h-1.5 w-1.5 rounded-full bg-[#d6ff3f] status-pulse" /> The social layer for streaming</div>
            <h1 className="max-w-[650px] text-[clamp(3.6rem,7vw,6.9rem)] font-extrabold leading-[.92] tracking-[-.075em] text-white">Watch together.<br /><span className="text-[#8c93a5]">Even when</span><br /><span className="text-[#d6ff3f]">you’re apart.</span></h1>
            <p className="mt-8 max-w-[475px] text-[15px] leading-7 text-[#9ba2b3]">Sync your watch party, talk in real time, and make a night of it — wherever everyone happens to be.</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button onClick={onCreate} className="btn-press h-12 rounded-xl bg-[#d6ff3f] px-5 text-[12px] font-extrabold text-[#10150d] shadow-[0_10px_35px_rgba(214,255,63,.12)] hover:bg-[#e1ff70]">Create a watch party <ArrowRight size={16} className="ml-2" /></Button>
              <Button onClick={onJoin} variant="outline" className="btn-press h-12 rounded-xl border-white/[.13] bg-white/[.03] px-5 text-[12px] font-bold text-white hover:bg-white/[.08]">Join with an invite</Button>
            </div>
            <div className="mt-9 flex items-center gap-3 text-[11px] text-[#747b8d]"><div className="flex -space-x-2"><Avatar member={initialMembers[0]} small /><Avatar member={initialMembers[1]} small /><Avatar member={initialMembers[3]} small /></div><span><strong className="font-semibold text-[#c3c8d3]">12,840+</strong> moments shared this week</span></div>
          </div>

          <div className="relative min-h-[410px] lg:min-h-[520px]">
            <div className="absolute right-[4%] top-[5%] h-[86%] w-[87%] rotate-[3deg] rounded-[24px] border border-white/[.08] bg-[#161a27] shadow-[0_35px_100px_rgba(0,0,0,.4)]" />
            <div className="glass relative mt-8 overflow-hidden rounded-[24px] border border-white/[.1] p-3 shadow-[0_35px_100px_rgba(0,0,0,.46)] lg:mt-14">
              <div className="flex items-center justify-between border-b border-white/[.07] px-3 pb-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f66]" /><span className="text-[10px] font-bold text-white">Friday Movie Night</span></div><span className="rounded-full bg-[#d6ff3f]/10 px-2 py-1 text-[9px] font-bold text-[#d6ff3f]">● LIVE</span></div>
              <div className="relative mt-3 aspect-video overflow-hidden rounded-[16px] bg-[#1a1f32]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_30%,rgba(218,191,132,.62),transparent_23%),linear-gradient(135deg,#2d3a5b_0%,#101622_52%,#07090e_100%)]" />
                <div className="absolute bottom-0 left-0 right-0 h-[54%] bg-gradient-to-t from-[#090b11] to-transparent" />
                <div className="absolute left-7 top-7 max-w-[220px]"><p className="font-mono text-[8px] uppercase tracking-[.18em] text-white/60">Now playing · YouTube</p><p className="mt-2 text-xl font-extrabold leading-tight tracking-[-.04em] text-white">The Art of<br />Slow Cinema</p></div>
                <div className="absolute bottom-5 left-5 right-5"><div className="mb-2 h-1 rounded-full bg-white/20"><div className="h-full w-[64%] rounded-full bg-[#d6ff3f]" /></div><div className="flex justify-between font-mono text-[8px] text-white/55"><span>1:24:32</span><span>2:05:18</span></div></div>
                <div className="absolute bottom-[32%] right-[18%] flex -space-x-2"><div className="reaction-pop rounded-full bg-[#ff6464]/90 px-2 py-1 text-[13px]">🔥</div><div className="rounded-full bg-[#fff]/90 px-2 py-1 text-[13px]">❤️</div></div>
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/30 p-4 text-white backdrop-blur-md"><Play size={23} fill="currentColor" /></div>
              </div>
              <div className="flex items-center justify-between px-1 pt-3"><div className="flex items-center gap-1.5"><Avatar member={initialMembers[0]} small /><Avatar member={initialMembers[1]} small /><Avatar member={initialMembers[3]} small /><span className="ml-1 text-[9px] text-[#8a91a3]">+ 2 watching</span></div><div className="flex gap-1.5"><span className="rounded-md bg-white/[.06] px-2 py-1 text-[9px] text-[#a9b0c0]">🎙 Voice on</span><span className="rounded-md bg-[#d6ff3f]/10 px-2 py-1 text-[9px] font-bold text-[#d6ff3f]">Synced</span></div></div>
            </div>
            <div className="absolute -bottom-1 -left-4 hidden w-[198px] rounded-2xl border border-white/[.1] bg-[#161a23]/95 p-3 shadow-2xl backdrop-blur-xl sm:block"><div className="mb-2 flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-[#7f8798]">Room pulse</span><span className="text-[9px] text-[#d6ff3f]">+12%</span></div><div className="flex h-12 items-end gap-1">{[22,34,27,43,31,50,39,45,58,48,62,56,72,65].map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-[#d6ff3f] opacity-40" style={{ height: `${height}%` }} />)}</div><p className="mt-2 text-[9px] text-[#7f8798]">Your people are here.</p></div>
          </div>
        </section>

        <section id="how-it-works" className="mt-28 border-t border-white/[.08] pt-8"><div className="mb-10 flex items-end justify-between gap-6"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#d6ff3f]">01 / How it works</p><h2 className="mt-3 max-w-[470px] text-3xl font-extrabold tracking-[-.05em] text-white md:text-4xl">Less setup. More <span className="text-[#8c93a5]">“remember when?”</span></h2></div><p className="hidden max-w-[260px] text-right text-xs leading-5 text-[#777f91] md:block">The good stuff stays on your streaming service. PlayOra brings everyone into the same moment.</p></div><div className="grid gap-3 md:grid-cols-3">{featureStats.map(([number, title, body]) => <div key={number} className="group rounded-2xl border border-white/[.08] bg-white/[.025] p-5 transition hover:-translate-y-1 hover:border-[#d6ff3f]/25 hover:bg-[#d6ff3f]/[.04]"><div className="flex items-center justify-between"><span className="font-mono text-[10px] text-[#d6ff3f]">{number}</span><ArrowRight size={15} className="text-[#4d5567] transition group-hover:translate-x-1 group-hover:text-[#d6ff3f]" /></div><h3 className="mt-10 text-base font-bold text-white">{title}</h3><p className="mt-2 text-xs leading-5 text-[#858c9d]">{body}</p></div>)}</div></section>
        <section id="platforms" className="mt-24 flex flex-col justify-between gap-8 border-t border-white/[.08] pt-8 md:flex-row md:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#d6ff3f]">02 / Bring your own screen</p><h2 className="mt-3 max-w-[570px] text-3xl font-extrabold tracking-[-.05em] text-white md:text-4xl">Your subscription. <span className="text-[#8c93a5]">Your playback.</span></h2></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{platforms.map(({ label, icon: PlatformIcon, tint }) => <div key={label} className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.025] px-3 py-2.5 text-[10px] font-bold text-[#aab1c0]"><PlatformIcon size={14} style={{ color: tint }} />{label}</div>)}</div></section>
      </main>
      <footer id="safety" className="relative z-10 mx-auto flex max-w-[1240px] flex-col gap-3 border-t border-white/[.08] px-6 py-7 text-[10px] text-[#656d7f] sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© 2026 PlayOra. Made for the moments between the moments.</span><span className="flex items-center gap-2"><Lock size={11} /> We sync playback — never stream or store it.</span></footer>
    </div>
  );
}

function CreateRoom({ onBack, onCreated }: { onBack: () => void; onCreated: (name: string, platform: Platform, url: string) => void }) {
  const [roomName, setRoomName] = useState("Friday Movie Night");
  const [platform, setPlatform] = useState<Platform>("YouTube");
  const [url, setUrl] = useState("https://youtube.com/watch?v=...");
  const [privacy, setPrivacy] = useState("Invite only");
  return <div className="playora-shell relative min-h-screen overflow-hidden"><div className="noise-overlay" /><div className="mx-auto max-w-[900px] px-6 py-7 lg:px-8"><div className="flex items-center justify-between"><button onClick={onBack} className="btn-press inline-flex items-center gap-2 text-xs font-bold text-[#9da5b6] hover:text-white"><ChevronLeft size={16} /> Back to PlayOra</button><Brand /></div><div className="mx-auto mt-16 max-w-[660px]"><div className="mb-8"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#d6ff3f]">New room</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-.06em] text-white md:text-5xl">Set the scene.</h1><p className="mt-3 text-sm text-[#8e96a7]">Pick a room name, share what you’re watching, and send the invite.</p></div><div className="glass rounded-3xl border border-white/[.1] p-5 md:p-8"><label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#858d9e]">Room name</label><Input value={roomName} onChange={e => setRoomName(e.target.value)} className="mt-2 h-12 border-white/[.1] bg-black/20 text-sm text-white placeholder:text-[#5e6575]" /><label className="mt-7 block text-[11px] font-bold uppercase tracking-[.12em] text-[#858d9e]">Where are you watching?</label><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{platforms.map(({ label, icon: PlatformIcon, tint }) => <button key={label} onClick={() => setPlatform(label)} className={`btn-press flex h-16 flex-col items-center justify-center gap-1.5 rounded-xl border text-[10px] font-bold ${platform === label ? "border-[#d6ff3f]/50 bg-[#d6ff3f]/10 text-white" : "border-white/[.08] bg-white/[.025] text-[#8991a2] hover:bg-white/[.06]"}`}><PlatformIcon size={17} style={{ color: tint }} />{label}</button>)}</div><label className="mt-7 block text-[11px] font-bold uppercase tracking-[.12em] text-[#858d9e]">Content URL <span className="font-normal normal-case tracking-normal text-[#5f6778]">(optional for manual sync)</span></label><div className="relative mt-2"><Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#697183]" /><Input value={url} onChange={e => setUrl(e.target.value)} className="h-12 border-white/[.1] bg-black/20 pl-9 text-sm text-white placeholder:text-[#5e6575]" /></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><div><label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#858d9e]">Room privacy</label><button onClick={() => setPrivacy(privacy === "Invite only" ? "Anyone with link" : "Invite only")} className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-white/[.1] bg-white/[.025] px-3 text-xs font-semibold text-white"><span className="flex items-center gap-2"><Lock size={14} className="text-[#d6ff3f]" /> {privacy}</span><ChevronDown size={14} className="text-[#6e7688]" /></button></div><div><label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#858d9e]">Playback control</label><button className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-white/[.1] bg-white/[.025] px-3 text-xs font-semibold text-white"><span className="flex items-center gap-2"><Users size={14} className="text-[#9eacff]" /> Host only</span><ChevronDown size={14} className="text-[#6e7688]" /></button></div></div><div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/[.08] pt-6 sm:flex-row sm:justify-end"><Button onClick={onBack} variant="outline" className="btn-press h-11 rounded-xl border-white/[.1] bg-white/[.02] text-xs font-bold text-white hover:bg-white/[.07]">Cancel</Button><Button onClick={() => onCreated(roomName || "Movie Night", platform, url)} className="btn-press h-11 rounded-xl bg-[#d6ff3f] px-5 text-xs font-extrabold text-[#10150d] hover:bg-[#e1ff70]">Create party <ArrowRight size={15} className="ml-2" /></Button></div></div><div className="mt-5 flex items-start gap-2 rounded-xl border border-[#d6ff3f]/10 bg-[#d6ff3f]/[.035] p-3 text-[10px] leading-5 text-[#8f987e]"><Sparkles size={14} className="mt-0.5 shrink-0 text-[#d6ff3f]" /><span>PlayOra never downloads, records, or proxies the content. Everyone watches from their own legitimate service while we sync the moment.</span></div></div></div></div>;
}

function InviteModal({ onClose, onCopied }: { onClose: () => void; onCopied: () => void }) {
  const invite = "playora.app/party/FRI5NITE";
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"><div className="glass w-full max-w-[440px] rounded-3xl border border-white/[.12] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#d6ff3f]">Invite your people</p><h2 className="mt-2 text-xl font-extrabold text-white">Bring the group in.</h2><p className="mt-2 text-xs leading-5 text-[#8d95a6]">Anyone with this link can join the party.</p></div><IconButton label="Close" onClick={onClose}><X size={16} /></IconButton></div><div className="mt-6 flex items-center gap-2 rounded-xl border border-white/[.1] bg-black/20 p-2 pl-3"><span className="min-w-0 flex-1 truncate font-mono text-xs text-[#d2d7e2]">{invite}</span><Button onClick={onCopied} className="h-9 rounded-lg bg-[#d6ff3f] px-3 text-[10px] font-extrabold text-[#10150d] hover:bg-[#e1ff70]"><Copy size={13} className="mr-1.5" /> Copy</Button></div><div className="mt-5 flex gap-2"><Button onClick={onCopied} variant="outline" className="h-10 flex-1 rounded-xl border-white/[.1] bg-white/[.03] text-[11px] font-bold text-white hover:bg-white/[.08]"><Share2 size={14} className="mr-2" /> Share link</Button><Button onClick={onClose} variant="outline" className="h-10 rounded-xl border-white/[.1] bg-white/[.03] px-4 text-[11px] font-bold text-[#aab2c2] hover:bg-white/[.08]">Done</Button></div></div></div>;
}

function WatchRoom({ roomName, platform, url, onLeave }: { roomName: string; platform: Platform; url: string; onLeave: () => void }) {
  const [playing, setPlaying] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [members, setMembers] = useState(initialMembers);
  const [reaction, setReaction] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(5072);
  const [joinedVoice, setJoinedVoice] = useState(true);
  const [muted, setMuted] = useState(false);
  const [synced, setSynced] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"none" | Tab>("none");

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setSeconds(value => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  const currentTime = useMemo(() => `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`, [seconds]);
  const sendMessage = () => {
    const clean = message.trim();
    if (!clean) return;
    setMessages(prev => [...prev, { id: Date.now(), name: "You", initials: "YO", color: "#8eabe9", message: clean, time: "now", own: true }]);
    setMessage("");
  };
  const triggerReaction = (emoji: string) => { setReaction(emoji); window.setTimeout(() => setReaction(null), 2100); toast.success(`Sent ${emoji} to the room`); };
  const syncNow = () => { setSynced(true); setSeconds(value => value + 1); toast.success("You’re back in sync", { description: "Playback aligned to the room." }); };
  const copyInvite = () => { navigator.clipboard?.writeText("https://playora.app/party/FRI5NITE"); toast.success("Invite link copied"); };

  return <div className="playora-shell flex min-h-screen flex-col overflow-hidden"><div className="noise-overlay" />
    <header className="relative z-20 flex h-[68px] shrink-0 items-center justify-between border-b border-white/[.08] bg-[#0e1016]/90 px-4 backdrop-blur-xl lg:px-7"><div className="flex items-center gap-5"><Brand /><span className="hidden h-5 w-px bg-white/[.12] sm:block" /><div className="hidden items-center gap-2 sm:flex"><div className="h-2 w-2 rounded-full bg-[#d6ff3f] status-pulse" /><span className="max-w-[180px] truncate text-xs font-bold text-white">{roomName}</span><span className="rounded bg-white/[.07] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-[#8c94a5]">{platform}</span></div></div><div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 text-[10px] font-bold text-[#7f8798] md:flex"><Users size={13} /> {members.length} watching</span><IconButton label="Invite friends" onClick={() => setShowInvite(true)}><Share2 size={15} /></IconButton><IconButton label="Room settings" active={showSettings} onClick={() => setShowSettings(!showSettings)}><Settings2 size={15} /></IconButton><Avatar member={{ initials: "YO", color: "#8eabe9" }} small /></div></header>
    {showSettings && <div className="absolute right-4 top-[58px] z-30 w-[238px] rounded-2xl border border-white/[.12] bg-[#181b25] p-2 shadow-2xl"><p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#6e7688]">Room controls</p>{["Host-only playback control", "Lock seeking", "Allow reactions", "Allow voice"].map((setting, index) => <button key={setting} onClick={() => toast.success(`${setting} ${index === 0 ? "enabled" : "updated"}`)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[11px] font-semibold text-[#c8ced9] hover:bg-white/[.06]"><span>{setting}</span><span className={`h-4 w-7 rounded-full p-0.5 ${index === 1 ? "bg-white/[.13]" : "bg-[#d6ff3f]"}`}><span className={`block h-3 w-3 rounded-full ${index === 1 ? "bg-[#848c9d]" : "ml-3 bg-[#10150d]"}`} /></span></button>)}<button onClick={onLeave} className="mt-1 w-full rounded-lg border-t border-white/[.08] px-3 py-2.5 text-left text-[11px] font-bold text-[#ff8181] hover:bg-[#ff5d5d]/[.08]">Leave room</button></div>}

    <main className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-3 p-3 lg:grid lg:grid-cols-[minmax(0,1fr)_350px] lg:p-5"><section className="min-w-0"><div className="relative aspect-video min-h-[260px] overflow-hidden rounded-2xl border border-white/[.1] bg-[#151a2a] shadow-[0_25px_90px_rgba(0,0,0,.3)] lg:aspect-[16/8.7]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_54%_22%,rgba(228,198,138,.48),transparent_19%),radial-gradient(circle_at_22%_60%,rgba(59,95,151,.34),transparent_31%),linear-gradient(130deg,#293553_0%,#101722_53%,#080a0e_100%)]" /><div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(4,6,10,.88),transparent_60%)]" /><div className="absolute left-6 top-6 flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 text-[9px] font-bold text-white/75 backdrop-blur-md"><Youtube size={13} className="text-[#ff6a6a]" /> {platform === "YouTube" ? "YouTube" : "Manual sync mode"}<span className="ml-1 text-white/30">•</span><span className="text-[#d6ff3f]">LIVE TO ROOM</span></div><div className="absolute left-7 top-[31%] max-w-[320px] md:left-12"><p className="font-mono text-[9px] uppercase tracking-[.22em] text-white/60">The Art of Slow Cinema</p><h1 className="mt-2 text-2xl font-extrabold leading-[.98] tracking-[-.05em] text-white md:text-5xl">A quiet frame<br />can say everything.</h1><p className="mt-4 hidden max-w-[285px] text-[11px] leading-5 text-white/55 md:block">An evening of considered images, lingering light, and stories that take their time.</p></div><div className="absolute bottom-5 left-5 right-5 md:bottom-7 md:left-8 md:right-8"><div className="mb-2 h-1 rounded-full bg-white/20"><div className="h-full w-[64%] rounded-full bg-[#d6ff3f] shadow-[0_0_12px_rgba(214,255,63,.5)]" /></div><div className="flex items-center justify-between font-mono text-[9px] text-white/60"><span>{currentTime}</span><span>2:05:18</span></div></div>{reaction && <div className="reaction-pop absolute bottom-[32%] right-[15%] text-4xl">{reaction}</div>}<button onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause playback" : "Play playback"} className="btn-press absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white shadow-2xl backdrop-blur-md transition hover:scale-105 hover:bg-black/40">{playing ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" className="ml-1" />}</button></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[.08] bg-[#11141c] px-3 py-2.5"><div className="flex items-center gap-1.5"><button onClick={() => setPlaying(!playing)} className="btn-press inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#d6ff3f] px-3 text-[10px] font-extrabold text-[#10150d] hover:bg-[#e1ff70]">{playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />} {playing ? "Pause" : "Play"}</button><IconButton label="Mute player"><Volume2 size={14} /></IconButton><span className="mx-1 h-4 w-px bg-white/[.1]" /><button onClick={syncNow} className="btn-press inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#d6ff3f]/25 bg-[#d6ff3f]/[.07] px-3 text-[10px] font-bold text-[#d6ff3f] hover:bg-[#d6ff3f]/[.13]"><Zap size={12} /> Sync now</button></div><div className="flex items-center gap-2"><div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[9px] font-bold ${synced ? "bg-[#d6ff3f]/[.08] text-[#d6ff3f]" : "bg-[#ffba5d]/[.1] text-[#ffba5d]"}`}><span className={`h-1.5 w-1.5 rounded-full ${synced ? "bg-[#d6ff3f]" : "bg-[#ffba5d]"}`} /> {synced ? "Synced" : "Slight drift"}</div><button onClick={() => toast.info("Opening the content on your device", { description: url || "Open the selected service and press play." })} className="btn-press hidden h-8 items-center gap-1.5 rounded-lg border border-white/[.09] px-2.5 text-[10px] font-semibold text-[#aeb5c4] hover:bg-white/[.06] sm:inline-flex">Open source <SquareArrowOutUpRight size={12} /></button></div></div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:hidden"><button onClick={() => setMobilePanel("chat")} className={`rounded-xl border py-2.5 text-[10px] font-bold ${mobilePanel === "chat" ? "border-[#d6ff3f]/30 bg-[#d6ff3f]/10 text-[#d6ff3f]" : "border-white/[.08] bg-white/[.025] text-[#8f97a8]"}`}><MessageCircle size={14} className="mx-auto mb-1" />Chat</button><button onClick={() => setMobilePanel("people")} className={`rounded-xl border py-2.5 text-[10px] font-bold ${mobilePanel === "people" ? "border-[#d6ff3f]/30 bg-[#d6ff3f]/10 text-[#d6ff3f]" : "border-white/[.08] bg-white/[.025] text-[#8f97a8]"}`}><Users size={14} className="mx-auto mb-1" />People</button><button onClick={() => setJoinedVoice(!joinedVoice)} className="rounded-xl border border-white/[.08] bg-white/[.025] py-2.5 text-[10px] font-bold text-[#8f97a8]"><Mic size={14} className="mx-auto mb-1" />{joinedVoice ? "Voice on" : "Join voice"}</button></div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[.08] bg-[#11141c] px-3 py-2"><div className="flex items-center gap-2"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-[#6f7789]">Quick reactions</span>{["❤️", "😂", "😭", "😱", "🔥", "👏"].map(emoji => <button key={emoji} onClick={() => triggerReaction(emoji)} className="btn-press rounded-md px-1.5 py-1 text-sm transition hover:bg-white/[.09]">{emoji}</button>)}</div><button onClick={() => setSynced(false)} className="hidden text-[10px] font-semibold text-[#727b8c] hover:text-white sm:block">Report drift</button></div></section>

      <aside className={`mobile-bottom-sheet ${mobilePanel === "none" ? "hidden" : ""} relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/[.1] bg-[#11141c] lg:flex`}><div className="flex shrink-0 items-center justify-between border-b border-white/[.08] px-4 py-3"><div className="flex gap-1 rounded-lg bg-white/[.04] p-1"><button onClick={() => setTab("chat")} className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${tab === "chat" ? "bg-white/[.1] text-white" : "text-[#737c8e]"}`}><MessageCircle size={12} className="mr-1.5 inline" />Chat</button><button onClick={() => setTab("people")} className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${tab === "people" ? "bg-white/[.1] text-white" : "text-[#737c8e]"}`}><Users size={12} className="mr-1.5 inline" />People <span className="ml-1 rounded bg-[#d6ff3f]/10 px-1.5 py-0.5 text-[9px] text-[#d6ff3f]">{members.length}</span></button></div><button onClick={() => setMobilePanel("none")} className="text-[#697183] hover:text-white sm:hidden"><X size={15} /></button><span className="hidden items-center gap-1.5 text-[9px] font-semibold text-[#6e7688] lg:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#d6ff3f]" /> Room is live</span></div>{tab === "chat" ? <><div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4">{messages.map(chat => <div key={chat.id} className={`flex gap-2.5 ${chat.own ? "flex-row-reverse" : ""}`}><Avatar member={chat} small /><div className={`min-w-0 ${chat.own ? "items-end text-right" : ""}`}><div className={`flex items-baseline gap-2 ${chat.own ? "flex-row-reverse" : ""}`}><span className="text-[10px] font-bold text-[#d2d7e1]">{chat.name}</span><span className="text-[9px] text-[#5f6778]">{chat.time}</span></div><div className={`mt-1 inline-block max-w-[220px] rounded-xl px-3 py-2 text-[11px] leading-4 ${chat.own ? "bg-[#d6ff3f]/10 text-[#e9f7bc]" : "bg-white/[.05] text-[#b4bbc9]"}`}>{chat.message}</div>{chat.reactions && <div className="mt-1 flex gap-1">{chat.reactions.map((item, i) => <span key={i} className="rounded-full border border-white/[.08] bg-white/[.04] px-1.5 py-0.5 text-[10px]">{item}</span>)}</div>}</div></div>)}</div><div className="border-t border-white/[.08] p-3"><div className="flex items-end gap-2 rounded-xl border border-white/[.08] bg-white/[.03] p-2"><Textarea value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Say something..." className="min-h-[32px] resize-none border-0 bg-transparent p-1.5 text-[11px] text-white shadow-none focus-visible:ring-0" rows={1} /><button onClick={sendMessage} aria-label="Send message" className="btn-press flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#d6ff3f] text-[#10150d] hover:bg-[#e1ff70]"><Send size={13} /></button></div><div className="mt-2 flex items-center justify-between px-1 text-[9px] text-[#616a7b]"><span>Enter to send</span><span>Everyone can chat</span></div></div></> : <div className="scrollbar-thin flex-1 overflow-y-auto p-3">{members.map(member => <div key={member.name} className="group flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-white/[.04]"><div className="relative"><Avatar member={member} />{member.speaking && <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#11141c] bg-[#d6ff3f] text-[#10150d]"><AudioLines size={9} /></span>}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="truncate text-[11px] font-bold text-white">{member.name}</span>{member.you && <span className="rounded bg-white/[.08] px-1 py-0.5 text-[8px] text-[#8e96a7]">YOU</span>}</div><div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-[#687183]"><span className="h-1.5 w-1.5 rounded-full bg-[#d6ff3f]" /> Watching · {member.watching}</div></div><div className="flex items-center gap-2 text-[#677082]">{member.role && <span className="rounded bg-[#d6ff3f]/10 px-1.5 py-1 text-[8px] font-bold text-[#d6ff3f]">{member.role}</span>}{member.mic ? <Mic size={13} className={member.speaking ? "text-[#d6ff3f]" : ""} /> : <MicOff size={13} />}</div></div>)}<div className="mt-4 rounded-xl border border-[#d6ff3f]/10 bg-[#d6ff3f]/[.035] p-3"><p className="text-[10px] font-bold text-[#d6ff3f]">Room sync health</p><div className="mt-2 flex items-end justify-between"><span className="text-lg font-extrabold text-white">98%</span><span className="text-[9px] text-[#8d967b]">excellent</span></div><div className="mt-2 h-1 rounded-full bg-white/[.08]"><div className="h-full w-[98%] rounded-full bg-[#d6ff3f]" /></div></div></div>}<div className="flex shrink-0 items-center justify-between border-t border-white/[.08] bg-[#0e1016] px-4 py-3"><div className="flex items-center gap-2"><button onClick={() => setJoinedVoice(!joinedVoice)} className={`btn-press inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[10px] font-bold ${joinedVoice ? "bg-[#d6ff3f] text-[#10150d]" : "border border-white/[.1] bg-white/[.03] text-white"}`}><Mic size={13} /> {joinedVoice ? "Voice on" : "Join voice"}</button>{joinedVoice && <IconButton label={muted ? "Unmute microphone" : "Mute microphone"} active={muted} onClick={() => setMuted(!muted)}>{muted ? <MicOff size={14} /> : <Mic size={14} />}</IconButton>}</div><button onClick={onLeave} className="text-[10px] font-semibold text-[#6f7788] hover:text-[#ff8181]">Leave room</button></div></aside>
    </main>
    {showInvite && <InviteModal onClose={() => setShowInvite(false)} onCopied={copyInvite} />}
  </div>;
}

export default function Home() {
  const [, params] = useRoute("/party/:code");
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"landing" | "create" | "room">(params?.code ? "room" : "landing");
  const [room, setRoom] = useState({ name: "Friday Movie Night", platform: "YouTube" as Platform, url: "https://youtube.com/watch?v=..." });
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => { if (params?.code) setView("room"); }, [params?.code]);
  if (view === "create") return <CreateRoom onBack={() => setView("landing")} onCreated={(name, platform, url) => { setRoom({ name, platform, url }); setView("room"); toast.success("Your party is ready", { description: "Share the invite and press play when everyone arrives." }); }} />;
  if (view === "room") return <WatchRoom roomName={room.name} platform={room.platform} url={room.url} onLeave={() => { setView("landing"); setLocation("/"); }} />;
  return <><Landing onCreate={() => setView("create")} onJoin={() => setJoinOpen(true)} />{joinOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"><div className="glass w-full max-w-[410px] rounded-3xl border border-white/[.12] p-6"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#d6ff3f]">Join a party</p><h2 className="mt-2 text-xl font-extrabold text-white">You’re on the list.</h2><p className="mt-2 text-xs leading-5 text-[#8d95a6]">Paste an invite code or the last part of a PlayOra link.</p></div><IconButton label="Close" onClick={() => setJoinOpen(false)}><X size={16} /></IconButton></div><Input autoFocus value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="e.g. FRI5NITE" className="mt-6 h-12 border-white/[.1] bg-black/20 text-sm uppercase tracking-[.12em] text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-[#5e6575]" /><div className="mt-4 flex justify-end gap-2"><Button onClick={() => setJoinOpen(false)} variant="outline" className="h-10 rounded-xl border-white/[.1] bg-white/[.03] text-[11px] font-bold text-white hover:bg-white/[.08]">Cancel</Button><Button onClick={() => { setJoinOpen(false); setView("room"); toast.success("Welcome to the party"); }} className="h-10 rounded-xl bg-[#d6ff3f] px-4 text-[11px] font-extrabold text-[#10150d] hover:bg-[#e1ff70]">Join room <ArrowRight size={14} className="ml-1.5" /></Button></div></div></div>}</>;
}
