"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Bell, Bookmark, CalendarClock, Check, CheckCheck, Compass, Eye, Film, Gamepad2, Heart, LockKeyhole, LogOut, MessageCircle, Mic, MoreHorizontal, Paperclip, Plus, Search, Send, ShieldCheck, Smile, Sparkles, Users, UserRound, Video, Volume2, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function formatVideoTime(seconds: number) { if (!Number.isFinite(seconds) || seconds < 0) return "0:00"; const total = Math.floor(seconds); return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0"); }

type View = "Home" | "Reels" | "Discover" | "Parties" | "Play" | "Chats" | "Profile";
type Post = { id: string; caption: string; created_at: string; author_id: string; post_type: string; media_url?: string | null; thumbnail_url?: string | null; sound_id?: string | null; is_reel?: boolean; };
type ZeeSound = { id: string; creator_id: string; title: string; audio_url: string; source_post_id?: string | null; created_at: string; };
type PostAuthor = { username: string; display_name: string; avatar_url?: string | null; };
type PostComment = { id: string; post_id: string; author_id: string; body: string; created_at: string; };
type ProfileSummary = { username: string; display_name: string; bio: string | null; avatar_url?: string | null; cover_url?: string | null; };
type LiveMessage = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; read_at?: string | null };
type ZeeNotification = { id: string; recipient_id: string; actor_id: string | null; kind: "message" | "follow" | "comment" | "like" | "caption_vote"; title: string; body: string; entity_id: string | null; source_id: string | null; created_at: string; read_at: string | null };
type InboxConversation = { id: string; otherUserId: string; username: string; displayName: string; avatarUrl: string | null; lastMessage: string; lastAt: string | null; unreadCount: number };
const sampleReels = [
  { user: "mira.moves", caption: "POV: the group chat finally makes it outside 😂✨", tags: "#goodvibes #weekendenergy", sound: "original audio · Mira", image: "photo-1533174072545-7a4b6ad7a6c3", likes: "24.8K", comments: "1,204", initial: "M" },
  { user: "jaycreates", caption: "When the beat drops and nobody is ready 🔥", tags: "#dancebreak #zeevibes", sound: "Late Night Bounce · DJ K", image: "photo-1501386761578-eac5c94b800a", likes: "18.2K", comments: "936", initial: "J" },
  { user: "tomi.laughs", caption: "Tag the friend who would absolutely do this 😭", tags: "#relatable #friendship", sound: "comedy loop · ZeeSounds", image: "photo-1527529482837-4698179dc6ce", likes: "31.6K", comments: "2,087", initial: "T" },
];
const nav: { name: View; icon: typeof Film }[] = [
  { name: "Home", icon: Film }, { name: "Reels", icon: Video }, { name: "Discover", icon: Compass }, { name: "Parties", icon: Users }, { name: "Play", icon: Gamepad2 }, { name: "Chats", icon: MessageCircle }, { name: "Profile", icon: UserRound },
];


function ContentActionMenu({ label, onDelete, disabled = false }: { label: string; onDelete: () => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  return <div className="content-action-menu" ref={rootRef}>
    <button type="button" className="content-action-trigger" aria-label={`More options for your ${label}`} aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen(value => !value)}><MoreHorizontal size={19} /></button>
    {open && <div className="content-action-popup" role="menu">
      <button type="button" role="menuitem" className="content-action-danger" onClick={() => { setOpen(false); onDelete(); }}>Delete {label}</button>
    </div>}
  </div>;
}


type CaptionBattleEntry = { id: string; author_id: string; challenge_date: string; caption: string; vote_count: number; created_at: string; displayName: string; username: string; avatarUrl?: string | null };
type WeeklyCaptionLeader = { authorId: string; displayName: string; username: string; avatarUrl?: string | null; votes: number; entries: number };
const DAILY_CAPTION_PROMPTS = [
  "Your friend said “I’m five minutes away” 45 minutes ago. Caption this.",
  "When payday lands and every bill was waiting in line. What’s the caption?",
  "POV: you opened the fridge for the fourth time hoping new food appeared.",
  "When someone says “we need to talk” and then disappears for three hours.",
  "That one friend who says “I’m not hungry” then eats half your food.",
  "You said “one more episode” and suddenly the birds are singing.",
  "When the group chat says “quick meeting” and sends a 47-minute voice note.",
  "The face you make when mobile data finishes at the worst possible moment.",
  "When you dress up just to find out the event was postponed.",
  "You finally sit down to rest and everyone suddenly needs something.",
  "When you hear “there’s food at home” but you were already outside.",
  "That moment your phone falls on your face at 2 a.m."
];
function getDailyCaptionPrompt() {
  const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
  return DAILY_CAPTION_PROMPTS[seed % DAILY_CAPTION_PROMPTS.length];
}
type TriviaQuestion = { question: string; options: string[]; answer: number; fact: string };
const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  { question: "Which planet is known as the Red Planet?", options: ["Mars", "Venus", "Jupiter", "Mercury"], answer: 0, fact: "Iron minerals on Mars give its surface that rusty red look." },
  { question: "How many sides does a hexagon have?", options: ["Five", "Six", "Seven", "Eight"], answer: 1, fact: "The prefix “hex” means six." },
  { question: "Which is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], answer: 3, fact: "The Pacific covers more area than all of Earth's land combined." },
  { question: "What does CPU stand for?", options: ["Computer Power Utility", "Central Processing Unit", "Core Program Upload", "Central Performance User"], answer: 1, fact: "The CPU executes instructions and coordinates work inside a computer." },
  { question: "What is the largest living mammal?", options: ["African elephant", "Giraffe", "Blue whale", "Orca"], answer: 2, fact: "Blue whales can grow longer than a basketball court." },
  { question: "How many minutes are in 2.5 hours?", options: ["120", "135", "150", "180"], answer: 2, fact: "2.5 × 60 = 150 minutes." },
  { question: "Which gas do plants absorb from the air?", options: ["Oxygen", "Carbon dioxide", "Helium", "Hydrogen"], answer: 1, fact: "Plants use carbon dioxide, water and sunlight during photosynthesis." },
  { question: "Who painted the Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Claude Monet", "Leonardo da Vinci"], answer: 3, fact: "Leonardo da Vinci painted the portrait during the Renaissance." },
  { question: "Which animal is the fastest land runner?", options: ["Lion", "Cheetah", "Horse", "Ostrich"], answer: 1, fact: "A cheetah can accelerate to around 100 km/h in short bursts." },
  { question: "What is 9 × 7?", options: ["56", "63", "72", "69"], answer: 1, fact: "A quick trick: 10 × 7 is 70, minus 7 gives 63." },
  { question: "Which instrument typically has keys, pedals and strings?", options: ["Flute", "Drum kit", "Piano", "Trumpet"], answer: 2, fact: "Pressing a piano key makes a hammer strike a string." },
  { question: "What is the smallest prime number?", options: ["0", "1", "2", "3"], answer: 2, fact: "Two is the only even prime number." },
  { question: "Which continent is Egypt mainly located in?", options: ["Asia", "Africa", "Europe", "South America"], answer: 1, fact: "Most of Egypt is in northeast Africa; the Sinai Peninsula lies in Asia." },
  { question: "Which language is mainly used to style web pages?", options: ["CSS", "SQL", "Bash", "Python"], answer: 0, fact: "CSS controls the visual presentation of HTML pages." },
  { question: "Which Nigerian city is nicknamed the Centre of Excellence?", options: ["Abuja", "Kano", "Lagos", "Enugu"], answer: 2, fact: "Lagos State is widely known by the slogan “Centre of Excellence.”" },
];

const DAILY_COMMUNITY_PROMPTS = [
  "What’s one small win you’re celebrating today?",
  "Drop a song that instantly lifts your mood.",
  "What’s a skill you wish you had learned sooner?",
  "What’s your most underrated comfort food?",
  "What’s one thing you’re grateful for this week?",
  "Which movie could you watch a hundred times?",
  "What advice would you give your younger self?",
  "Show your current mood using only three emojis.",
  "What habit has made your life better?",
  "What’s one goal you’re working toward this month?",
  "Which Nigerian slang should everyone know?",
  "If you could teleport anywhere this weekend, where would you go?",
  "What’s something you used to believe but no longer do?",
  "Share a creator or friend who made you laugh recently.",
  "What’s a tiny thing that makes an ordinary day better?",
];
function getDailyCommunityPrompt() {
  const seed = Number(localDateKey().replace(/-/g, ""));
  return DAILY_COMMUNITY_PROMPTS[seed % DAILY_COMMUNITY_PROMPTS.length];
}

type TriviaStats = { bestScore: number; streak: number; lastPlayed: string };
function localDateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function getDailyTriviaQuestions() {
  const key = localDateKey();
  const seed = Number(key.replace(/-/g, ""));
  const start = seed % TRIVIA_QUESTIONS.length;
  return Array.from({ length: 5 }, (_, i) => TRIVIA_QUESTIONS[(start + i) % TRIVIA_QUESTIONS.length]);
}

export default function HomePage() {
  const [view, setView] = useState<View>("Home");
  const [triviaQuestions, setTriviaQuestions] = useState<TriviaQuestion[]>([]);
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaAnswer, setTriviaAnswer] = useState<number | null>(null);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaStarted, setTriviaStarted] = useState(false);
  const [triviaFinished, setTriviaFinished] = useState(false);
  const [triviaStats, setTriviaStats] = useState<TriviaStats>({ bestScore: 0, streak: 0, lastPlayed: "" });
  const [captionBattleEntries, setCaptionBattleEntries] = useState<CaptionBattleEntry[]>([]);
  const [captionBattleDraft, setCaptionBattleDraft] = useState("");
  const [captionBattleLoading, setCaptionBattleLoading] = useState(false);
  const [captionBattleSubmitting, setCaptionBattleSubmitting] = useState(false);
  const [captionBattleSort, setCaptionBattleSort] = useState<"top" | "new">("top");
  const [captionBattleVotedIds, setCaptionBattleVotedIds] = useState<string[]>([]);
  const [captionBattleBusyIds, setCaptionBattleBusyIds] = useState<string[]>([]);
  const [weeklyCaptionLeaders, setWeeklyCaptionLeaders] = useState<WeeklyCaptionLeader[]>([]);
  const [weeklyCaptionLoading, setWeeklyCaptionLoading] = useState(false);


  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastWheelAt = useRef(0);
  const [liked, setLiked] = useState<number[]>([]);
  const [following, setFollowing] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [partyCreateOpen, setPartyCreateOpen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partyDescription, setPartyDescription] = useState("");
  const [partyFormat, setPartyFormat] = useState<"video" | "audio" | "watch">("video");
  const [partyAccess, setPartyAccess] = useState<"public" | "private">("public");
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [sounds, setSounds] = useState<ZeeSound[]>([]);
  const [selectedSound, setSelectedSound] = useState<ZeeSound | null>(null);
  const [postKind, setPostKind] = useState<"post" | "reel">("post");
  const [activeReelPostId, setActiveReelPostId] = useState<string | null>(null);
  const [reelFeedMode, setReelFeedMode] = useState<"for-you" | "following" | "fresh" | "saved">("for-you");
  const [reelDuration, setReelDuration] = useState(0);
  const [reelCurrentTime, setReelCurrentTime] = useState(0);
  const [reelMuted, setReelMuted] = useState(true);
  const [reelLikeBurst, setReelLikeBurst] = useState(false);
  const [savedReelIds, setSavedReelIds] = useState<string[]>([]);
  const [saveReelBusyIds, setSaveReelBusyIds] = useState<string[]>([]);
  const reelVideoRef = useRef<HTMLVideoElement | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postAuthors, setPostAuthors] = useState<Record<string, PostAuthor>>({});
  const [postLikeCounts, setPostLikeCounts] = useState<Record<string, number>>({});
  const [postViewCounts, setPostViewCounts] = useState<Record<string, number>>({});
  const [expandedCaptions, setExpandedCaptions] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [likeBusyIds, setLikeBusyIds] = useState<string[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [openCommentPostIds, setOpenCommentPostIds] = useState<string[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusyIds, setCommentBusyIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"posts" | "videos" | "likes">("posts");
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [usernameDraft, setUsernameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploadBusy, setAvatarUploadBusy] = useState(false);
  const [coverUploadBusy, setCoverUploadBusy] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [creatorFollowState, setCreatorFollowState] = useState<Record<string, boolean>>({});
  const [followBusy, setFollowBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ZeeNotification[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [activeChat, setActiveChat] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>([]);
  const [inboxSearch, setInboxSearch] = useState("");
  const [inboxFilter, setInboxFilter] = useState<"all" | "unread">("all");
  const [discoverSearchOpen, setDiscoverSearchOpen] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverResults, setDiscoverResults] = useState<(ProfileSummary & { user_id: string })[]>([]);
  const [discoverSearchLoading, setDiscoverSearchLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatOpenRequestRef = useRef(0);
  const activeConversationRef = useRef<string | null>(null);
  const inboxLoadRequestRef = useRef(0);
  const [selectedCreator, setSelectedCreator] = useState<{username:string;initial:string;avatarUrl?:string|null}|null>(null);
  const [failedAvatarUrls, setFailedAvatarUrls] = useState<string[]>([]);
  const [selectedCreatorProfile, setSelectedCreatorProfile] = useState<(ProfileSummary & { user_id: string }) | null>(null);
  const [selectedCreatorPosts, setSelectedCreatorPosts] = useState<Post[]>([]);
  const [creatorProfileLoading, setCreatorProfileLoading] = useState(false);
  const [selectedCreatorFollowCounts, setSelectedCreatorFollowCounts] = useState({ followers: 0, following: 0 });
  const [chatDraft, setChatDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const liveReels = posts.filter(post => (post.is_reel || post.post_type === "reel" || post.post_type === "video") && Boolean(post.media_url));
  const followedCreatorIds = new Set(Object.entries(creatorFollowState).filter(([, isFollowing]) => isFollowing).map(([username]) => username));
  const recordPostView = useCallback((postId: string) => {
    const storageKey = `zeechat-viewed-${userId ?? "anonymous"}-${postId}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch { /* Continue with a best-effort view if session storage is unavailable. */ }

    let client: ReturnType<typeof createClient>;
    try {
      client = createClient();
    } catch (error) {
      console.error("Unable to initialize ZeeChat view tracking", error);
      try { sessionStorage.removeItem(storageKey); } catch { /* Ignore unavailable storage. */ }
      return;
    }

    setPostViewCounts(current => ({ ...current, [postId]: (current[postId] ?? 0) + 1 }));
    void client.from("zeechat_post_views").insert({ post_id: postId, viewer_id: userId }).then(async ({ error }) => {
      if (error) {
        console.error("Unable to record ZeeChat post view", error);
        try { sessionStorage.removeItem(storageKey); } catch { /* Ignore unavailable storage. */ }
        setPostViewCounts(current => {
          const next = { ...current };
          const corrected = Math.max(0, (next[postId] ?? 1) - 1);
          if (corrected) next[postId] = corrected; else delete next[postId];
          return next;
        });
        return;
      }
      const { data, error: countError } = await client.rpc("zeechat_post_view_counts", { post_ids: [postId] });
      if (!countError && data) {
        const row = (data as { post_id: string; view_count: number | string }[]).find(item => item.post_id === postId);
        setPostViewCounts(current => ({ ...current, [postId]: row ? Number(row.view_count) : 0 }));
      }
    });
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (!userId) { setSavedReelIds([]); return () => { active = false; }; }
    void createClient().from("zeechat_saved_reels").select("post_id,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(500)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) { setNotice("Could not load your saved Reels."); return; }
        setSavedReelIds((data ?? []).map(item => item.post_id));
      });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    let active = true;
    const key = `zeechat-trivia-stats-${userId ?? "guest"}`;
    let localStats: TriviaStats = { bestScore: 0, streak: 0, lastPlayed: "" };
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<TriviaStats>;
        localStats = { bestScore: Number(parsed.bestScore) || 0, streak: Number(parsed.streak) || 0, lastPlayed: typeof parsed.lastPlayed === "string" ? parsed.lastPlayed : "" };
      }
    } catch { /* Keep clean defaults if local storage is unavailable. */ }
    if (active) setTriviaStats(localStats);
    if (!userId) return () => { active = false; };
    void (async () => {
      const { data, error } = await createClient().from("zeechat_trivia_stats")
        .select("best_score,streak,last_played")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active || error || !data) return;
      const remoteStats: TriviaStats = {
        bestScore: Number(data.best_score) || 0,
        streak: Number(data.streak) || 0,
        lastPlayed: typeof data.last_played === "string" ? data.last_played : "",
      };
      const localIsNewer = localStats.lastPlayed > remoteStats.lastPlayed;
      const merged: TriviaStats = {
        bestScore: Math.max(localStats.bestScore, remoteStats.bestScore),
        streak: localIsNewer ? localStats.streak : localStats.lastPlayed === remoteStats.lastPlayed ? Math.max(localStats.streak, remoteStats.streak) : remoteStats.streak,
        lastPlayed: localIsNewer ? localStats.lastPlayed : remoteStats.lastPlayed,
      };
      setTriviaStats(merged);
      try { localStorage.setItem(key, JSON.stringify(merged)); } catch { /* Database remains the durable copy. */ }
      if (localIsNewer || merged.bestScore > remoteStats.bestScore) {
        await createClient().from("zeechat_trivia_stats").upsert({
          user_id: userId, best_score: merged.bestScore, streak: merged.streak,
          last_played: merged.lastPlayed || null, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    })();
    return () => { active = false; };
  }, [userId]);

  const captionBattleHasEntered = Boolean(userId && captionBattleEntries.some(entry => entry.author_id === userId));
  const sortedCaptionBattleEntries = [...captionBattleEntries].sort((a, b) => captionBattleSort === "top" ? b.vote_count - a.vote_count || b.created_at.localeCompare(a.created_at) : b.created_at.localeCompare(a.created_at));
  const unreadConversationCount = inboxConversations.filter(item => item.unreadCount > 0).length;
  const filteredInboxConversations = inboxConversations.filter(item => (inboxFilter !== "unread" || item.unreadCount > 0) && `${item.displayName} ${item.username} ${item.lastMessage}`.toLowerCase().includes(inboxSearch.trim().toLowerCase()));
  const feedReels = reelFeedMode === "saved" ? liveReels.filter(post => savedReelIds.includes(post.id)).sort((a, b) => savedReelIds.indexOf(b.id) - savedReelIds.indexOf(a.id)) : reelFeedMode === "following" ? liveReels.filter(post => followedCreatorIds.has(postAuthors[post.author_id]?.username || "")) : reelFeedMode === "fresh" ? [...liveReels].sort((a, b) => b.created_at.localeCompare(a.created_at)) : [...liveReels].sort((a, b) => { const score = (post: Post) => { const ageHours = Math.max(0, (Date.now() - new Date(post.created_at).getTime()) / 3600000); const engagement = (postLikeCounts[post.id] ?? 0) * 3 + (commentCounts[post.id] ?? 0) * 5 + Math.log1p(postViewCounts[post.id] ?? 0) * 2; return engagement + 12 * Math.exp(-ageHours / 72); }; return score(b) - score(a); });
  const selectedLiveReel = (activeReelPostId ? feedReels.find(post => post.id === activeReelPostId) : undefined) || feedReels[0];
  useEffect(() => {
    if (!selectedLiveReel?.id) return;
    recordPostView(selectedLiveReel.id);
  }, [selectedLiveReel?.id, recordPostView]);

  useEffect(() => {
    if (view !== "Home" || typeof IntersectionObserver === "undefined") return;
    const cards = document.querySelectorAll<HTMLElement>(".post-card[data-post-id]");
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
        const postId = (entry.target as HTMLElement).dataset.postId;
        if (postId) recordPostView(postId);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.5 });
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [view, posts, recordPostView]);

  const reel = selectedLiveReel ? { user: postAuthors[selectedLiveReel.author_id]?.username || "zeechatter", caption: selectedLiveReel.caption, tags: "", sound: "original audio", image: "", likes: "0", comments: "0", initial: (postAuthors[selectedLiveReel.author_id]?.display_name || "Z").slice(0, 1).toUpperCase(), mediaUrl: selectedLiveReel.media_url || "", postId: selectedLiveReel.id } : reelFeedMode === "saved" ? { user: "Your library", caption: "Save Reels you want to revisit, learn from, or share later.", tags: "", sound: "Your saved collection", image: "", likes: "0", comments: "0", initial: "Z", mediaUrl: "", postId: "" } : { ...sampleReels[index], mediaUrl: "", postId: "" };

  const selectedCreatorUsername = selectedCreator?.username;

  useEffect(() => {
    if (view !== "Profile" || !selectedCreatorUsername) return;
    let active = true;
    setCreatorProfileLoading(true);
    setSelectedCreatorProfile(null);
    setSelectedCreatorPosts([]);
    setSelectedCreatorFollowCounts({ followers: 0, following: 0 });
    const loadCreatorProfile = async () => {
      try {
        const supabase = createClient();
        const { data: creator, error } = await supabase.from("zeechat_profiles")
          .select("user_id,username,display_name,bio,avatar_url,cover_url")
          .eq("username", selectedCreatorUsername).maybeSingle();
        if (error) throw error;
        if (!creator) {
          if (active) {
            setSelectedCreatorFollowCounts({ followers: 0, following: 0 });
            setNotice("This creator has no linked ZeeChat profile yet.");
          }
          return;
        }
        if (active) setSelectedCreatorProfile(creator as ProfileSummary & { user_id: string });
        const [creatorFollowers, creatorFollowing] = await Promise.all([
          supabase.from("zeechat_follows").select("follower_id", { count: "exact", head: true }).eq("followed_id", creator.user_id),
          supabase.from("zeechat_follows").select("followed_id", { count: "exact", head: true }).eq("follower_id", creator.user_id)
        ]);
        if (active) setSelectedCreatorFollowCounts({
          followers: creatorFollowers.error ? 0 : (creatorFollowers.count ?? 0),
          following: creatorFollowing.error ? 0 : (creatorFollowing.count ?? 0)
        });
        const { data: creatorPosts, error: postsError } = await supabase.from("zeechat_posts")
          .select("id,caption,created_at,author_id,post_type,media_url,thumbnail_url,is_reel")
          .eq("author_id", creator.user_id).eq("visibility", "public")
          .order("created_at", { ascending: false }).limit(60);
        if (postsError) throw postsError;
        if (active) setSelectedCreatorPosts((creatorPosts ?? []) as Post[]);
        if (userId && creator.user_id !== userId) {
          const { data: follow } = await supabase.from("zeechat_follows").select("follower_id")
            .eq("follower_id", userId).eq("followed_id", creator.user_id).maybeSingle();
          if (active) setCreatorFollowState(state => ({ ...state, [creator.username]: Boolean(follow) }));
        }
      } catch (error) {
        if (active) {
          setSelectedCreatorProfile(null);
          setSelectedCreatorPosts([]);
          setSelectedCreatorFollowCounts({ followers: 0, following: 0 });
          setNotice(error instanceof Error ? error.message : "Could not load this creator profile.");
        }
      } finally {
        if (active) setCreatorProfileLoading(false);
      }
    };
    void loadCreatorProfile();
    return () => { active = false; };
  }, [view, selectedCreatorUsername, userId]);

  useEffect(() => {
    if (!mediaFile) { setMediaPreview(null); return; }
    const url = URL.createObjectURL(mediaFile);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  function handleReelDoubleTap() {
    if (selectedLiveReel) {
      if (!likedPostIds.includes(selectedLiveReel.id)) void togglePostLike(selectedLiveReel.id);
    } else {
      setLiked(current => current.includes(index) ? current : [...current, index]);
    }
    setReelLikeBurst(true);
    window.setTimeout(() => setReelLikeBurst(false), 700);
  }

  function moveReel(direction: 1 | -1) {
    if (feedReels.length) {
      const foundIndex = feedReels.findIndex(post => post.id === activeReelPostId);
      const currentIndex = foundIndex < 0 ? 0 : foundIndex;
      const nextIndex = (currentIndex + direction + feedReels.length) % feedReels.length;
      setActiveReelPostId(feedReels[nextIndex]?.id ?? null);
      setReelCurrentTime(0);
      setReelDuration(0);
    } else if (reelFeedMode === "for-you") {
      setIndex(current => (current + direction + sampleReels.length) % sampleReels.length);
    }
  }

  function handleReelTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchStartY.current = event.touches[0]?.clientY ?? null;
  }

  function handleReelTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const startX = touchStartX.current;
    const startY = touchStartY.current;
    const endX = event.changedTouches[0]?.clientX;
    const endY = event.changedTouches[0]?.clientY;
    touchStartX.current = null;
    touchStartY.current = null;
    if (startX === null || startY === null || endX === undefined || endY === undefined) return;
    const dx = endX - startX;
    const dy = endY - startY;
    if (Math.abs(dy) >= 36 && Math.abs(dy) > Math.abs(dx) * 1.05) moveReel(dy < 0 ? 1 : -1);
  }

  useEffect(() => {
    let active = true;
    let unsubscribeAuth = () => {};
    try {
      const supabase = createClient();
      const syncAuthUser = async (user: { id: string; email?: string } | null) => {
        if (!active) return;
        setUserId(user?.id ?? null);
        setUserEmail(user?.email ?? null);
        if (user) {
          void loadInbox(user.id);
          const { data: profileData } = await supabase.from("zeechat_profiles").select("username,display_name,bio,avatar_url,cover_url").eq("user_id", user.id).maybeSingle();
          if (!active) return;
          if (profileData) {
            setProfile(profileData as ProfileSummary);
          } else {
            // Existing Zonix accounts may predate ZeeChat's profile trigger. Provision a
            // ZeeChat-only profile for this authenticated user without touching Zonix profiles.
            const metadata = user as typeof user & { user_metadata?: Record<string, unknown> };
            const metadataUsername = typeof metadata.user_metadata?.username === "string" ? metadata.user_metadata.username : "";
            const emailPrefix = (user.email ?? "member").split("@")[0];
            const baseUsername = (metadataUsername || emailPrefix).toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 17) || "member";
            const username = `${baseUsername}_${user.id.slice(0, 6)}`;
            const metadataDisplayName = typeof metadata.user_metadata?.display_name === "string" ? metadata.user_metadata.display_name : "";
            const displayName = metadataDisplayName.trim() || emailPrefix || "ZeeChat member";
            const { data: createdProfile, error: profileCreateError } = await supabase
              .from("zeechat_profiles")
              .upsert({ user_id: user.id, username, display_name: displayName, bio: "", is_private: false }, { onConflict: "user_id", ignoreDuplicates: true })
              .select("username,display_name,bio,avatar_url,cover_url")
              .maybeSingle();
            if (profileCreateError) {
              console.error("Could not provision ZeeChat profile for authenticated account", profileCreateError);
              setProfile(null);
              setNotice("You're signed in, but your ZeeChat profile could not be created. Please try refreshing.");
            } else if (createdProfile) {
              setProfile(createdProfile as ProfileSummary);
            } else {
              const { data: refreshedProfile } = await supabase.from("zeechat_profiles").select("username,display_name,bio,avatar_url,cover_url").eq("user_id", user.id).maybeSingle();
              setProfile(refreshedProfile as ProfileSummary | null);
            }
          }
        } else {
          // Invalidate pending inbox/chat requests so a late response from the
          // previous session cannot repopulate private conversation state after sign-out.
          inboxLoadRequestRef.current += 1;
          chatOpenRequestRef.current += 1;
          setChatLoading(false);
          setChatDraft("");
          setProfile(null);
          setInboxConversations([]);
          activeConversationRef.current = null;
          setActiveConversationId(null);
          setLiveMessages([]);
          setSelectedCreator(null);
          setActiveChat(false);
        }
      };
      supabase.auth.getUser().then(({ data }) => syncAuthUser(data.user ?? null));
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        void syncAuthUser(session?.user ?? null);
      });
      unsubscribeAuth = () => authListener.subscription.unsubscribe();
      supabase.from("zeechat_sounds").select("id,creator_id,title,audio_url,source_post_id,created_at").order("created_at", { ascending: false }).limit(100).then(({data}) => { if (active && data) setSounds(data as ZeeSound[]); });
      supabase.from("zeechat_posts").select("id,caption,created_at,author_id,post_type,media_url,thumbnail_url,sound_id,is_reel").eq("visibility", "public").order("created_at", { ascending: false }).limit(200)
        .then(async ({ data, error }) => {
          if (!active) return;
          if (error) { setNotice("Connect Supabase to load live posts."); return; }
          const loadedPosts = (data ?? []) as Post[];
          setPosts(loadedPosts);
          if (!loadedPosts.length) return;
          const { data: views } = await supabase.rpc("zeechat_post_view_counts", { post_ids: loadedPosts.map(post => post.id) });
          if (active && views) {
            const counts: Record<string, number> = {};
            for (const row of views as { post_id: string; view_count: number | string }[]) counts[row.post_id] = Number(row.view_count);
            setPostViewCounts(current => ({ ...current, ...counts }));
          }
          const authorIds = [...new Set(loadedPosts.map(post => post.author_id))];
          const { data: authorProfiles } = await supabase.from("zeechat_profiles").select("user_id,username,display_name,avatar_url").in("user_id", authorIds);
          if (active && authorProfiles) {
            const authorMap: Record<string, PostAuthor> = {};
            for (const author of authorProfiles) authorMap[author.user_id] = { username: author.username, display_name: author.display_name, avatar_url: author.avatar_url };
            setPostAuthors(authorMap);
          }
          const { data: likes, error: likesError } = await supabase.from("zeechat_post_likes").select("post_id,user_id").in("post_id", loadedPosts.map(post => post.id));
          if (!active || likesError) return;
          const { data: authData } = await supabase.auth.getUser();
          const counts: Record<string, number> = {};
          const mine: string[] = [];
          for (const like of likes ?? []) {
            counts[like.post_id] = (counts[like.post_id] ?? 0) + 1;
            if (authData.user && like.user_id === authData.user.id) mine.push(like.post_id);
          }
          setPostLikeCounts(counts);
          setLikedPostIds(mine);
          const { data: comments } = await supabase.from("zeechat_comments").select("id,post_id,author_id,body,created_at").in("post_id", loadedPosts.map(post => post.id));
          if (!active) return;
          const commentTally: Record<string, number> = {};
          for (const comment of comments ?? []) commentTally[comment.post_id] = (commentTally[comment.post_id] ?? 0) + 1;
          setCommentCounts(commentTally);
        });
    } catch {
      setNotice("Add your Supabase keys to .env.local to enable accounts and live posts.");
    }
    return () => { active = false; unsubscribeAuth(); };
  }, []);


  useEffect(() => {
    if (!userId || !activeConversationId || !activeChat) return;
    const supabase = createClient();
    let active = true;
    const channel = supabase
      .channel("zeechat-messages-" + activeConversationId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "zeechat_messages",
        filter: "conversation_id=eq." + activeConversationId
      }, payload => {
        if (!active) return;
        const incoming = payload.new as LiveMessage;
        if (!incoming?.id || incoming.conversation_id !== activeConversationId) return;
        setLiveMessages(current => current.some(message => message.id === incoming.id)
          ? current
          : [...current.filter(message => !(message.id.startsWith("optimistic-") && message.sender_id === incoming.sender_id && message.body === incoming.body)), incoming]
            .sort((a, b) => a.created_at.localeCompare(b.created_at)));
        void loadInbox(userId);
      })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, activeConversationId, activeChat]);


  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadMessageCount(0);
      return;
    }
    const supabase = createClient();
    let active = true;
    const refreshUnreadMessages = async () => {
      const { count, error } = await supabase.from("zeechat_messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", userId)
        .is("read_at", null);
      if (active && !error) setUnreadMessageCount(count ?? 0);
    };
    const loadNotifications = async () => {
      const { data, error } = await supabase.from("zeechat_notifications")
        .select("id,recipient_id,actor_id,kind,title,body,entity_id,source_id,created_at,read_at")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (active && !error) setNotifications((data ?? []) as ZeeNotification[]);
      if (error) console.error("Unable to load notifications", error);
    };
    void loadNotifications();
    void refreshUnreadMessages();
    const channel = supabase.channel("zeechat-user-activity-" + userId)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "zeechat_notifications",
        filter: "recipient_id=eq." + userId
      }, payload => {
        if (!active) return;
        const incoming = payload.new as ZeeNotification;
        if (!incoming?.id) return;
        const isOpenConversation = incoming.kind === "message" && Boolean(incoming.entity_id) && activeConversationRef.current === incoming.entity_id;
        const notification = isOpenConversation ? { ...incoming, read_at: new Date().toISOString() } : incoming;
        setNotifications(current => current.some(item => item.id === notification.id)
          ? current.map(item => item.id === notification.id ? { ...item, read_at: item.read_at ?? notification.read_at } : item)
          : [notification, ...current].slice(0, 50));
        if (isOpenConversation) {
          void supabase.from("zeechat_notifications").update({ read_at: notification.read_at })
            .eq("id", notification.id).eq("recipient_id", userId);
        }
        void refreshUnreadMessages();
        void loadInbox(userId);
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "zeechat_messages"
      }, payload => {
        if (!active) return;
        const incoming = payload.new as LiveMessage;
        if (!incoming?.id || incoming.sender_id === userId) return;
        void loadInbox(userId);
        void refreshUnreadMessages();
        if (activeConversationRef.current === incoming.conversation_id) {
          setLiveMessages(current => current.some(message => message.id === incoming.id)
            ? current
            : [...current.filter(message => !(message.id.startsWith("optimistic-") && message.sender_id === incoming.sender_id && message.body === incoming.body)), incoming]
              .sort((a, b) => a.created_at.localeCompare(b.created_at)));
          void supabase.from("zeechat_messages").update({ read_at: new Date().toISOString() })
            .eq("id", incoming.id).eq("conversation_id", incoming.conversation_id)
            .then(() => refreshUnreadMessages());
        }
      })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function searchDiscoverCreators() {
    const query = discoverQuery.trim().replace(/[%_]/g, "").slice(0, 60);
    if (!query) { setDiscoverResults([]); setNotice("Enter a creator name or username to search."); return; }
    setDiscoverSearchLoading(true);
    setNotice("");
    try {
      const supabase = createClient();
      const pattern = `%${query}%`;
      const [byUsername, byName] = await Promise.all([
        supabase.from("zeechat_profiles").select("user_id,username,display_name,bio,avatar_url,cover_url").eq("is_private", false).ilike("username", pattern).limit(20),
        supabase.from("zeechat_profiles").select("user_id,username,display_name,bio,avatar_url,cover_url").eq("is_private", false).ilike("display_name", pattern).limit(20)
      ]);
      if (byUsername.error) throw byUsername.error;
      if (byName.error) throw byName.error;
      const unique = new Map<string, ProfileSummary & { user_id: string }>();
      for (const creator of [...(byUsername.data ?? []), ...(byName.data ?? [])]) unique.set(creator.user_id, creator as ProfileSummary & { user_id: string });
      setDiscoverResults([...unique.values()].sort((a, b) => a.display_name.localeCompare(b.display_name)).slice(0, 30));
    } catch (error) {
      setDiscoverResults([]);
      setNotice(error instanceof Error ? `Creator search failed: ${error.message}` : "Creator search failed. Please try again.");
    } finally { setDiscoverSearchLoading(false); }
  }

  async function markAllNotificationsRead() {
    if (!userId) return;
    const now = new Date().toISOString();
    const { error } = await createClient().from("zeechat_notifications")
      .update({ read_at: now }).eq("recipient_id", userId).is("read_at", null);
    if (error) {
      setNotice("Could not mark notifications as read. Please try again.");
      return;
    }
    setNotifications(current => current.map(item => item.read_at ? item : { ...item, read_at: now }));
  }

  async function openNotification(item: ZeeNotification) {
    if (userId && !item.read_at) {
      const now = new Date().toISOString();
      const { error } = await createClient().from("zeechat_notifications")
        .update({ read_at: now }).eq("id", item.id).eq("recipient_id", userId);
      if (!error) setNotifications(current => current.map(row => row.id === item.id ? { ...row, read_at: now } : row));
    }
    setNotificationsOpen(false);
    if (item.kind === "caption_vote") {
      setView("Play");
    } else if (item.kind === "message") {
      setActiveChat(false);
      setActiveConversationId(null);
      activeConversationRef.current = null;
      setView("Chats");
      if (userId) void loadInbox(userId);
    } else {
      setView("Home");
    }
  }

  async function loadInbox(currentUserId: string) {
    const requestId = ++inboxLoadRequestRef.current;
    const isLatestRequest = () => requestId === inboxLoadRequestRef.current;
    try {
      const supabase = createClient();
      const { data: memberships, error } = await supabase.from("zeechat_conversation_members").select("conversation_id").eq("user_id", currentUserId);
      if (error) throw error;
      if (!isLatestRequest()) return;
      const conversationIds = [...new Set((memberships ?? []).map(row => row.conversation_id as string))];
      if (!conversationIds.length) { setInboxConversations([]); return; }
      const { data: members, error: memberError } = await supabase.from("zeechat_conversation_members").select("conversation_id,user_id").in("conversation_id", conversationIds).neq("user_id", currentUserId);
      if (memberError) throw memberError;
      if (!isLatestRequest()) return;
      const otherIds = [...new Set((members ?? []).map(row => row.user_id as string))];
      const { data: profiles, error: profileError } = await supabase.from("zeechat_profiles").select("user_id,username,display_name,avatar_url").in("user_id", otherIds);
      if (profileError) throw profileError;
      if (!isLatestRequest()) return;
      const { data: messages, error: messageError } = await supabase.from("zeechat_messages").select("id,conversation_id,sender_id,body,created_at,read_at").in("conversation_id", conversationIds).order("created_at", { ascending: false });
      if (messageError) throw messageError;
      if (!isLatestRequest()) return;
      const latest: Record<string, LiveMessage> = {};
      const unreadByConversation: Record<string, number> = {};
      for (const message of (messages ?? []) as LiveMessage[]) {
        if (!latest[message.conversation_id]) latest[message.conversation_id] = message;
        if (message.sender_id !== currentUserId && !message.read_at) unreadByConversation[message.conversation_id] = (unreadByConversation[message.conversation_id] ?? 0) + 1;
      }
      const profileById: Record<string, {username:string;display_name:string;avatar_url:string|null}> = {}; for (const p of profiles ?? []) profileById[p.user_id] = p;
      setInboxConversations((members ?? []).map(member => { const p=profileById[member.user_id]; const last=latest[member.conversation_id]; return {id:member.conversation_id,otherUserId:member.user_id,username:p?.username ?? "member",displayName:p?.display_name ?? "ZeeChat member",avatarUrl:p?.avatar_url ?? null,lastMessage:last?.body ?? "Say hello 👋",lastAt:last?.created_at ?? null,unreadCount:unreadByConversation[member.conversation_id] ?? 0}; }).filter((item,index,all)=>all.findIndex(other=>other.id===item.id)===index).sort((a,b)=>(b.lastAt ?? "").localeCompare(a.lastAt ?? "")));
    } catch (error) {
      if (!isLatestRequest()) return;
      console.error("Unable to load ZeeChat inbox", error);
      setNotice(error instanceof Error ? `Inbox could not refresh: ${error.message}` : "Inbox could not refresh. Check your connection and try again.");
    }
  }

  async function openExistingConversation(item: InboxConversation) {
    if (!userId) { setNotice("Sign in to view your messages."); return; }
    const requestId = ++chatOpenRequestRef.current;
    setChatLoading(true);
    setActiveChat(false);
    try {
      const supabase = createClient();
      const { data: messages, error } = await supabase.from("zeechat_messages")
        .select("id,conversation_id,sender_id,body,created_at,read_at")
        .eq("conversation_id", item.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (requestId !== chatOpenRequestRef.current) return;
      const readAt = new Date().toISOString();
      await supabase.from("zeechat_messages").update({ read_at: readAt }).eq("conversation_id", item.id).neq("sender_id", userId).is("read_at", null);
      void supabase.from("zeechat_notifications").update({ read_at: readAt }).eq("recipient_id", userId).eq("entity_id", item.id).eq("kind", "message").is("read_at", null);
      setNotifications(current => current.map(n => n.kind === "message" && n.entity_id === item.id && !n.read_at ? { ...n, read_at: readAt } : n));
      setUnreadMessageCount(current => Math.max(0, current - (messages ?? []).filter((message: LiveMessage) => message.sender_id !== userId && !(message as LiveMessage).read_at).length));
      void loadInbox(userId);
      setSelectedCreator({ username: item.username, initial: (item.displayName[0] || "Z").toUpperCase(), avatarUrl: item.avatarUrl });
      activeConversationRef.current = item.id;
      setActiveConversationId(item.id);
      setLiveMessages((messages ?? []) as LiveMessage[]);
      setChatDraft("");
      setActiveChat(true);
      setView("Chats");
      setNotice("");
    } catch (error) {
      if (requestId === chatOpenRequestRef.current) setNotice(error instanceof Error ? "Could not open conversation: " + error.message : "Could not open this conversation. Try again.");
    } finally {
      if (requestId === chatOpenRequestRef.current) setChatLoading(false);
    }
  }

  async function openLiveConversation(targetUserId: string, targetUsername: string, targetInitial: string) {
    if (!userId) { setNotice("Sign in to start a conversation."); return; }
    if (targetUserId === userId) { setNotice("This is your own profile."); return; }
    const requestId = ++chatOpenRequestRef.current;
    setChatLoading(true);
    setActiveChat(false);
    try {
      const supabase=createClient();
      const { data: conversationId, error } = await supabase.rpc("zeechat_start_conversation", { target_user: targetUserId });
      if (error) throw error;
      const id=conversationId as string;
      const { data: messages, error: messageError } = await supabase.from("zeechat_messages").select("id,conversation_id,sender_id,body,created_at,read_at").eq("conversation_id",id).order("created_at",{ascending:true});
      if (messageError) throw messageError;
      const { data: targetProfile } = await supabase.from("zeechat_profiles").select("avatar_url").eq("user_id",targetUserId).maybeSingle();
      if (requestId !== chatOpenRequestRef.current) return;
      activeConversationRef.current = id;
      setActiveConversationId(id); setLiveMessages((messages ?? []) as LiveMessage[]); setSelectedCreator({username:targetUsername,initial:targetInitial,avatarUrl:targetProfile?.avatar_url ?? null}); void loadCreatorFollowState(targetUsername); setActiveChat(true); setView("Chats"); setNotice("");
      await loadInbox(userId);
    } catch (error) { if (requestId === chatOpenRequestRef.current) setNotice(error instanceof Error ? error.message : "Could not open this conversation. Please try again."); } finally { if (requestId === chatOpenRequestRef.current) setChatLoading(false); }
  }

  async function sendLiveMessage() {
    const body=chatDraft.trim();
    if(!body || !activeConversationId || !userId) return;
    const conversationId=activeConversationId;
    const optimistic: LiveMessage={id:"optimistic-"+crypto.randomUUID(),conversation_id:conversationId,sender_id:userId,body,created_at:new Date().toISOString()};
    setLiveMessages(current=>[...current,optimistic]);
    setChatDraft("");
    try {
      const supabase=createClient();
      const { data, error }=await supabase.from("zeechat_messages").insert({conversation_id:conversationId,sender_id:userId,body}).select("id,conversation_id,sender_id,body,created_at,read_at").single();
      if(error) throw error;
      if (activeConversationRef.current === conversationId) {
        setLiveMessages(current=>current.map(message=>message.id===optimistic.id ? data as LiveMessage : message));
      }
      await loadInbox(userId);
    } catch(error) {
      setLiveMessages(current=>current.filter(message=>message.id!==optimistic.id));
      if (activeConversationRef.current === conversationId) {
        setChatDraft(current=>current || body);
        setNotice(error instanceof Error ? `Message not sent: ${error.message}` : "Message not sent. Check your connection and try again.");
      }
    }
  }

  function openProfileEditor() {
    setDisplayNameDraft(profile?.display_name ?? "");
    setUsernameDraft(profile?.username ?? "");
    setBioDraft(profile?.bio ?? "");
    setEditProfileOpen(true);
  }

  async function saveProfile() {
    if (!userId) { setNotice("Sign in to edit your profile."); return; }
    const displayName = displayNameDraft.trim();
    const username = usernameDraft.trim().toLowerCase().replace(/^@/, "");
    const bio = bioDraft.trim();
    if (!displayName) { setNotice("Please enter a display name."); return; }
    if (!/^[a-z0-9._]{3,24}$/.test(username)) { setNotice("Username must be 3–24 characters using letters, numbers, dots or underscores."); return; }
    setProfileSaving(true);
    try {
      const supabase = createClient(); 
      const { data, error } = await supabase.from("zeechat_profiles").update({ username, display_name: displayName, bio }).eq("user_id", userId).select("username,display_name,bio,avatar_url,cover_url").maybeSingle();
      if (!error && !data) throw new Error("Your ZeeChat profile was not found. Sign out and back in to recreate your profile, then try again.");
      if (error) throw error;
      setProfile(data as ProfileSummary);
      setEditProfileOpen(false);
      setNotice("Profile updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update your profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function uploadProfileImage(file: File, kind: "avatar" | "cover") {
    if (!userId) { setNotice("Sign in to customize your profile."); return; }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setNotice("This image format isn't supported. Choose a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setNotice("This image is larger than 20 MB. Please choose a smaller image.");
      return;
    }

    if (kind === "avatar") setAvatarUploadBusy(true);
    else setCoverUploadBusy(true);

    let stage: "upload" | "save" = "upload";
    let uploadedPath: string | null = null;
    try {
      const supabase = createClient();
      const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" } as Record<string, string>)[file.type];
      const path = userId + "/profile-" + kind + "-" + Date.now() + "." + extension;
      const { error: uploadError } = await supabase.storage.from("zeechat-media").upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw new Error("Storage upload failed: " + uploadError.message);
      uploadedPath = path;

      const { data: publicUrl } = supabase.storage.from("zeechat-media").getPublicUrl(path);
      const field = kind === "avatar" ? "avatar_url" : "cover_url";
      stage = "save";
      const { data, error } = await supabase.from("zeechat_profiles")
        .update({ [field]: publicUrl.publicUrl })
        .eq("user_id", userId)
        .select("username,display_name,bio,avatar_url,cover_url")
        .maybeSingle();

      if (error) throw new Error("Image uploaded, but saving it to your profile failed: " + error.message);
      if (!data) throw new Error("Image uploaded, but your ZeeChat profile record wasn't found. Sign out and back in, then try again.");
      setProfile(data as ProfileSummary);
      setNotice(kind === "avatar" ? "Profile photo updated successfully." : "Cover photo updated successfully.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("ZeeChat " + kind + " upload failed at " + stage, error);
      setNotice(detail || (stage === "upload" ? "Could not upload this image. Check your connection and try again." : "The image uploaded, but your profile could not be updated."));
      // If saving the profile failed after the file upload, remove the unused object to avoid orphaned uploads.
      if (uploadedPath) {
        try {
          await createClient().storage.from("zeechat-media").remove([uploadedPath]);
        } catch (cleanupError) {
          console.warn("Could not clean up failed " + kind + " upload", cleanupError);
        }
      }
    } finally {
      if (kind === "avatar") setAvatarUploadBusy(false);
      else setCoverUploadBusy(false);
    }
  }

  async function toggleCreatorFollow(username: string) {
    if (!userId) { setNotice("Sign in to follow creators."); return; }
    if (followBusy) return;
    setFollowBusy(true);
    try {
      const supabase = createClient();
      const { data: creator, error: lookupError } = await supabase.from("zeechat_profiles").select("user_id,username").eq("username", username).maybeSingle();
      if (lookupError) throw lookupError;
      if (!creator) { setNotice("This creator is not linked to a ZeeChat account yet."); return; }
      if (creator.user_id === userId) { setNotice("You cannot follow your own profile."); return; }
      const { data: existing, error: followLookupError } = await supabase.from("zeechat_follows").select("follower_id").eq("follower_id", userId).eq("followed_id", creator.user_id).maybeSingle();
      if (followLookupError) throw followLookupError;

      const wasFollowing = Boolean(existing);
      const nextFollowing = !wasFollowing;
      // Update the visible state before the write completes so the control feels immediate.
      setCreatorFollowState(state => ({ ...state, [username]: nextFollowing }));
      setFollowCounts(counts => ({
        followers: Math.max(0, counts.followers),
        following: Math.max(0, counts.following + (nextFollowing ? 1 : -1))
      }));
      try {
        if (wasFollowing) {
          const { error } = await supabase.from("zeechat_follows").delete().eq("follower_id", userId).eq("followed_id", creator.user_id);
          if (error) throw error;
          setNotice("You unfollowed @" + username + ".");
        } else {
          const { error } = await supabase.from("zeechat_follows").insert({ follower_id: userId, followed_id: creator.user_id });
          if (error) throw error;
          setNotice("You’re now following @" + username + ".");
        }
      } catch (writeError) {
        setCreatorFollowState(state => ({ ...state, [username]: wasFollowing }));
        setFollowCounts(counts => ({
          followers: counts.followers,
          following: Math.max(0, counts.following + (wasFollowing ? 1 : -1))
        }));
        throw writeError;
      }
      void refreshFollowCounts(userId);
      const [updatedFollowers, updatedFollowing] = await Promise.all([
        supabase.from("zeechat_follows").select("follower_id", { count: "exact", head: true }).eq("followed_id", creator.user_id),
        supabase.from("zeechat_follows").select("followed_id", { count: "exact", head: true }).eq("follower_id", creator.user_id)
      ]);
      if (selectedCreator?.username === creator.username) {
        setSelectedCreatorFollowCounts({
          followers: updatedFollowers.error ? selectedCreatorFollowCounts.followers : (updatedFollowers.count ?? 0),
          following: updatedFollowing.error ? selectedCreatorFollowCounts.following : (updatedFollowing.count ?? 0)
        });
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update follow status.");
    } finally { setFollowBusy(false); }
  }

  useEffect(() => {
    if (!userId) {
      setCreatorFollowState({});
      return;
    }
    let active = true;
    const loadFollowedCreators = async () => {
      try {
        const supabase = createClient();
        const { data: follows, error } = await supabase
          .from("zeechat_follows")
          .select("followed_id")
          .eq("follower_id", userId);
        if (error) throw error;
        const followedIds = [...new Set((follows ?? []).map(row => row.followed_id as string))];
        if (!followedIds.length) {
          if (active) setCreatorFollowState({});
          return;
        }
        const { data: creators, error: creatorsError } = await supabase
          .from("zeechat_profiles")
          .select("username,user_id")
          .in("user_id", followedIds);
        if (creatorsError) throw creatorsError;
        if (!active) return;
        setCreatorFollowState(Object.fromEntries((creators ?? []).map(creator => [creator.username, true])));
      } catch (error) {
        console.error("Could not load followed ZeeChat creators", error);
      }
    };
    void loadFollowedCreators();
    return () => { active = false; };
  }, [userId]);

  async function loadCreatorFollowState(username: string) {
    if (!userId) return;
    try {
      const supabase = createClient();
      const { data: creator } = await supabase.from("zeechat_profiles").select("user_id").eq("username", username).maybeSingle();
      if (!creator || creator.user_id === userId) return;
      const { data, error } = await supabase.from("zeechat_follows").select("follower_id").eq("follower_id", userId).eq("followed_id", creator.user_id).maybeSingle();
      if (!error) setCreatorFollowState(state => ({ ...state, [username]: Boolean(data) }));
    } catch { /* The profile remains usable if follow status cannot be loaded. */ }
  }

  async function refreshFollowCounts(currentUserId: string) {
    try {
      const supabase = createClient();
      const [followers, following] = await Promise.all([
        supabase.from("zeechat_follows").select("follower_id", { count: "exact", head: true }).eq("followed_id", currentUserId),
        supabase.from("zeechat_follows").select("followed_id", { count: "exact", head: true }).eq("follower_id", currentUserId)
      ]);
      setFollowCounts({ followers: followers.count ?? 0, following: following.count ?? 0 });
    } catch { /* Counts remain at their last known values when offline. */ }
  }

  async function toggleSavedReel(postId: string) {
    if (!userId) { setNotice("Sign in to save Reels to your personal library."); return; }
    if (saveReelBusyIds.includes(postId)) return;
    const wasSaved = savedReelIds.includes(postId);
    setSaveReelBusyIds(ids => [...ids, postId]);
    try {
      const client = createClient();
      const result = wasSaved
        ? await client.from("zeechat_saved_reels").delete().eq("post_id", postId).eq("user_id", userId)
        : await client.from("zeechat_saved_reels").insert({ post_id: postId, user_id: userId });
      if (result.error) throw result.error;
      setSavedReelIds(ids => wasSaved ? ids.filter(id => id !== postId) : [postId, ...ids]);
      setNotice(wasSaved ? "Removed from your saved Reels." : "Reel saved to your library.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update your saved Reels.");
    } finally {
      setSaveReelBusyIds(ids => ids.filter(id => id !== postId));
    }
  }

  async function togglePostLike(postId: string) {
    if (!userId) { setNotice("Sign in to like community posts."); return; }
    if (likeBusyIds.includes(postId)) return;
    const wasLiked = likedPostIds.includes(postId);
    setLikeBusyIds(ids => [...ids, postId]);
    try {
      const supabase = createClient();
      const result = wasLiked
        ? await supabase.from("zeechat_post_likes").delete().eq("post_id", postId).eq("user_id", userId)
        : await supabase.from("zeechat_post_likes").insert({ post_id: postId, user_id: userId });
      if (result.error) throw result.error;
      setLikedPostIds(ids => wasLiked ? ids.filter(id => id !== postId) : [...ids, postId]);
      setPostLikeCounts(counts => ({ ...counts, [postId]: Math.max(0, (counts[postId] ?? 0) + (wasLiked ? -1 : 1)) }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update like. Please try again.");
    } finally {
      setLikeBusyIds(ids => ids.filter(id => id !== postId));
    }
  }

  async function toggleComments(postId: string) {
    const isOpen = openCommentPostIds.includes(postId);
    setOpenCommentPostIds(ids => isOpen ? ids.filter(id => id !== postId) : [...ids, postId]);
    if (isOpen || commentsByPost[postId]) return;
    try {
      const { data, error } = await createClient().from("zeechat_comments")
        .select("id,post_id,author_id,body,created_at").eq("post_id", postId).order("created_at", { ascending: true });
      if (error) throw error;
      setCommentsByPost(current => ({ ...current, [postId]: (data ?? []) as PostComment[] }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load comments.");
    }
  }

  async function submitComment(postId: string) {
    const body = (commentDrafts[postId] ?? "").trim();
    if (!body) return;
    if (!userId) { setNotice("Sign in to comment on community posts."); return; }
    if (commentBusyIds.includes(postId)) return;
    setCommentBusyIds(ids => [...ids, postId]);
    try {
      const { data, error } = await createClient().from("zeechat_comments")
        .insert({ post_id: postId, author_id: userId, body }).select("id,post_id,author_id,body,created_at").single();
      if (error) throw error;
      setCommentsByPost(current => ({ ...current, [postId]: [...(current[postId] ?? []), data as PostComment] }));
      setCommentCounts(counts => ({ ...counts, [postId]: (counts[postId] ?? 0) + 1 }));
      setCommentDrafts(current => ({ ...current, [postId]: "" }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not post comment. Please try again.");
    } finally {
      setCommentBusyIds(ids => ids.filter(id => id !== postId));
    }
  }


  function storageObjectPath(publicUrl: string | null | undefined): string | null {
    if (!publicUrl) return null;
    const marker = "/storage/v1/object/public/zeechat-media/";
    const at = publicUrl.indexOf(marker);
    if (at < 0) return null;
    try { return decodeURIComponent(publicUrl.slice(at + marker.length).split("?")[0]); }
    catch { return null; }
  }

  async function deletePost(post: Post) {
    if (!userId) { setNotice("Sign in to delete your post."); return; }
    if (post.author_id !== userId) { setNotice("You can only delete your own posts."); return; }
    if (!window.confirm("Delete this post permanently? Its comments and likes will also be removed. This cannot be undone.")) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("zeechat_posts").delete().eq("id", post.id).eq("author_id", userId);
      if (error) throw error;
      const paths = [...new Set([storageObjectPath(post.media_url), storageObjectPath(post.thumbnail_url)].filter((p): p is string => Boolean(p && p.startsWith(userId + "/"))))];
      let mediaCleanupFailed = false;
      if (paths.length) {
        const { error: storageError } = await supabase.storage.from("zeechat-media").remove(paths);
        if (storageError) { mediaCleanupFailed = true; console.warn("Post deleted, but some media files could not be removed", storageError); }
      }
      setPosts(items => items.filter(item => item.id !== post.id));
      setOpenCommentPostIds(ids => ids.filter(id => id !== post.id));
      setCommentsByPost(items => { const next = { ...items }; delete next[post.id]; return next; });
      setCommentCounts(items => { const next = { ...items }; delete next[post.id]; return next; });
      setPostLikeCounts(items => { const next = { ...items }; delete next[post.id]; return next; });
      setLikedPostIds(ids => ids.filter(id => id !== post.id));
      if (activeReelPostId === post.id) setActiveReelPostId(null);
      setNotice(mediaCleanupFailed ? "Post deleted, but its media could not be fully removed. Please retry cleanup later." : "Post deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? "Could not delete post: " + error.message : "Could not delete post. Please try again.");
    } finally { setBusy(false); }
  }

  async function deleteComment(comment: PostComment) {
    if (!userId) { setNotice("Sign in to delete a comment."); return; }
    if (comment.author_id !== userId) { setNotice("You can only delete your own comments."); return; }
    if (!window.confirm("Delete this comment?")) return;
    try {
      const { error } = await createClient().from("zeechat_comments").delete().eq("id", comment.id).eq("author_id", userId);
      if (error) throw error;
      setCommentsByPost(current => ({ ...current, [comment.post_id]: (current[comment.post_id] ?? []).filter(item => item.id !== comment.id) }));
      setCommentCounts(current => ({ ...current, [comment.post_id]: Math.max(0, (current[comment.post_id] ?? 0) - 1) }));
      setNotice("Comment deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? "Could not delete comment: " + error.message : "Could not delete comment.");
    }
  }

  async function deleteSound(sound: ZeeSound) {
    if (!userId) { setNotice("Sign in to delete a sound."); return; }
    if (sound.creator_id !== userId) { setNotice("You can only delete sounds you uploaded."); return; }
    if (!window.confirm("Delete this sound from the library? Existing posts will keep their media, but the sound link will be removed. This cannot be undone.")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("zeechat_sounds").delete().eq("id", sound.id).eq("creator_id", userId);
      if (error) throw error;
      const path = storageObjectPath(sound.audio_url);
      let audioCleanupFailed = false;
      if (path && path.startsWith(userId + "/")) {
        const { error: storageError } = await supabase.storage.from("zeechat-media").remove([path]);
        if (storageError) { audioCleanupFailed = true; console.warn("Sound deleted, but audio storage cleanup failed", storageError); }
      }
      setSounds(items => items.filter(item => item.id !== sound.id));
      setPosts(items => items.map(item => item.sound_id === sound.id ? { ...item, sound_id: null } : item));
      if (selectedSound?.id === sound.id) setSelectedSound(null);
      setNotice(audioCleanupFailed ? "Sound deleted, but its audio file could not be removed. Please retry cleanup later." : "Sound deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? "Could not delete sound: " + error.message : "Could not delete sound.");
    }
  }

  async function createVideoThumbnail(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata"; video.muted = true; video.playsInline = true; video.src = objectUrl;
      const cleanup = () => URL.revokeObjectURL(objectUrl);
      video.onerror = () => { cleanup(); reject(new Error("Could not read this video. Try an MP4 file.")); };
      video.onloadeddata = () => { video.currentTime = Math.min(0.5, Math.max(0, video.duration / 2)); };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(video.videoWidth || 720, 720);
        canvas.height = Math.max(1, Math.round(canvas.width * (video.videoHeight || 1280) / (video.videoWidth || 720)));
        const context = canvas.getContext("2d");
        if (!context) { cleanup(); reject(new Error("Could not create a video thumbnail.")); return; }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => { cleanup(); if (blob) resolve(blob); else reject(new Error("Could not create a video thumbnail.")); }, "image/jpeg", 0.82);
      };
    });
  }


  function uploadWithProgress(path: string, file: File | Blob, contentType: string, onProgress: (percent: number) => void): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const supabase = createClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.access_token) throw new Error("Your session expired. Sign in again to upload.");
        const xhr = new XMLHttpRequest();
        xhr.open("POST", process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/zeechat-media/" + path.split("/").map(encodeURIComponent).join("/"));
        xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
        xhr.setRequestHeader("Authorization", "Bearer " + session.access_token);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.min(99, Math.round(event.loaded / event.total * 100))); };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(); }
          else { try { const body = JSON.parse(xhr.responseText); reject(new Error(body.message || body.error || "Upload failed (" + xhr.status + ").")); } catch { reject(new Error("Upload failed (" + xhr.status + ").")); } }
        };
        xhr.onerror = () => reject(new Error("Network error while uploading. Please try again."));
        xhr.onabort = () => reject(new Error("Upload was interrupted."));
        xhr.send(file);
      } catch (error) { reject(error); }
    });
  }

  async function publish() {
    if (!caption.trim() && !mediaFile) return;
    if (!userId) { setNotice("Sign in first to publish a post."); return; }
    setBusy(true);
    setUploadProgress(mediaFile?.type.startsWith("video/") ? 0 : null);
    setUploadLabel(mediaFile?.type.startsWith("video/") ? "Preparing your Reel…" : "Uploading your post…");
    setCreateOpen(false);
    const supabase = createClient();
    const uploadedPaths: string[] = [];
    let postInserted = false;
    try {
      let mediaUrl: string | null = null;
      let soundId: string | null = selectedSound?.id ?? null;
      let thumbnailUrl: string | null = null;
      let publishedType = "text";
      if (mediaFile) {
        const isVideo = mediaFile.type.startsWith("video/");
        const allowedTypes = isVideo ? ["video/mp4", "video/webm", "video/quicktime"] : ["image/jpeg", "image/png", "image/webp", "image/gif"];
        const maxBytes = isVideo ? 100 * 1024 * 1024 : 8 * 1024 * 1024;
        if (!allowedTypes.includes(mediaFile.type)) throw new Error(isVideo ? "Choose an MP4, WebM or MOV video." : "Choose a JPEG, PNG, WebP or GIF image.");
        if (mediaFile.size > maxBytes) throw new Error(isVideo ? "Choose a video smaller than 100 MB." : "Choose an image smaller than 8 MB.");
        const extension = mediaFile.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
        const path = userId + "/" + crypto.randomUUID() + "." + extension;
        setUploadLabel(isVideo ? "Uploading video…" : "Uploading photo…");
        setUploadProgress(0);
        await uploadWithProgress(path, mediaFile, mediaFile.type, setUploadProgress);
        uploadedPaths.push(path);
        mediaUrl = supabase.storage.from("zeechat-media").getPublicUrl(path).data.publicUrl;
        publishedType = isVideo ? "reel" : "image";
        if (isVideo) {
          const thumbnail = await createVideoThumbnail(mediaFile);
          const thumbnailPath = userId + "/" + crypto.randomUUID() + ".jpg";
          setUploadLabel("Finishing Reel thumbnail…");
          await uploadWithProgress(thumbnailPath, thumbnail, "image/jpeg", () => {});
          uploadedPaths.push(thumbnailPath);
          thumbnailUrl = supabase.storage.from("zeechat-media").getPublicUrl(thumbnailPath).data.publicUrl;
        }
      }
      if (audioFile && !selectedSound) {
        if (!audioFile.type.startsWith("audio/")) throw new Error("Choose a supported audio file.");
        if (audioFile.size > 25 * 1024 * 1024) throw new Error("Choose audio smaller than 25 MB.");
        const audioExt = audioFile.name.split(".").pop()?.toLowerCase() || "mp3";
        const audioPath = userId + "/sounds/" + crypto.randomUUID() + "." + audioExt;
        setUploadLabel("Uploading reusable sound…"); setUploadProgress(10);
        const { error: audioUploadError } = await supabase.storage.from("zeechat-media").upload(audioPath, audioFile, {contentType: audioFile.type, cacheControl:"3600", upsert:false});
        if (audioUploadError) throw new Error("Sound upload failed: " + audioUploadError.message);
        uploadedPaths.push(audioPath);
        const audioUrl = supabase.storage.from("zeechat-media").getPublicUrl(audioPath).data.publicUrl;
        const { data: newSound, error: soundError } = await supabase.from("zeechat_sounds").insert({creator_id:userId,title:audioFile.name.replace(/\.[^.]+$/, "").slice(0,120) || "Original sound",audio_url:audioUrl}).select("id,creator_id,title,audio_url,created_at").single();
        if (soundError) throw soundError;
        soundId = newSound.id; setSounds(current => [newSound as ZeeSound, ...current]);
      }
      const makeReel = postKind === "reel" || Boolean(selectedSound) || Boolean(audioFile);
      if (makeReel && !mediaFile) throw new Error("Choose a photo or video for your sound Reel.");
      const { data: createdPost, error } = await supabase.from("zeechat_posts").insert({ author_id: userId, caption: caption.trim(), post_type: makeReel ? "reel" : publishedType, is_reel: makeReel, sound_id: soundId, media_url: mediaUrl, thumbnail_url: thumbnailUrl, visibility: "public" }).select("id").single();
      if (error) throw error;
      postInserted = true;
      setUploadProgress(null); setUploadLabel("");
      setCaption(""); setMediaFile(null); setAudioFile(null); setSelectedSound(null); setPostKind("post"); setNotice((postKind === "reel" || soundId) ? "Your sound Reel is live!" : "Your post is live!");
      const { data, error: refreshError } = await supabase.from("zeechat_posts").select("id,caption,created_at,author_id,post_type,media_url,thumbnail_url").eq("visibility", "public").order("created_at", { ascending: false }).limit(10);
      if (refreshError) throw new Error("Your post was published, but Home could not refresh. Reload the page to see it.");
      const refreshedPosts = (data ?? []) as Post[];
      setPosts(refreshedPosts);
      const authorIds = [...new Set(refreshedPosts.map(post => post.author_id))];
      if (authorIds.length) {
        const { data: authorProfiles } = await supabase.from("zeechat_profiles").select("user_id,username,display_name,avatar_url").in("user_id", authorIds);
        if (authorProfiles) {
          const authorMap: Record<string, PostAuthor> = {};
          for (const author of authorProfiles) authorMap[author.user_id] = { username: author.username, display_name: author.display_name, avatar_url: author.avatar_url };
          setPostAuthors(authorMap);
        }
      }
      if ((postKind === "reel" || soundId) && createdPost) { setActiveReelPostId(createdPost.id); setView("Reels"); }
    } catch (error) {
      if (!postInserted && uploadedPaths.length) await supabase.storage.from("zeechat-media").remove(uploadedPaths).catch(() => undefined);
      setUploadProgress(null); setUploadLabel("");
      setNotice(error instanceof Error ? error.message : "Could not publish. Check your connection and try again.");
    } finally { setBusy(false); }
  }


  function startTrivia() {
    setTriviaQuestions(getDailyTriviaQuestions());
    setTriviaIndex(0);
    setTriviaAnswer(null);
    setTriviaScore(0);
    setTriviaFinished(false);
    setTriviaStarted(true);
  }

  function chooseTriviaAnswer(optionIndex: number) {
    const question = triviaQuestions[triviaIndex];
    if (!question || triviaAnswer !== null) return;
    setTriviaAnswer(optionIndex);
    if (optionIndex === question.answer) setTriviaScore(score => score + 1);
  }

  function advanceTrivia() {
    if (triviaIndex < triviaQuestions.length - 1) {
      setTriviaIndex(index => index + 1);
      setTriviaAnswer(null);
      return;
    }
    const today = localDateKey();
    const yesterday = localDateKey(new Date(Date.now() - 86400000));
    const storageKey = `zeechat-trivia-stats-${userId ?? "guest"}`;
    const nextStats: TriviaStats = {
      bestScore: Math.max(triviaStats.bestScore, triviaScore),
      streak: triviaStats.lastPlayed === today ? triviaStats.streak : triviaStats.lastPlayed === yesterday ? triviaStats.streak + 1 : 1,
      lastPlayed: today,
    };
    setTriviaStats(nextStats);
    try { localStorage.setItem(storageKey, JSON.stringify(nextStats)); } catch { /* Keep the result visible if storage is unavailable. */ }
    if (userId) {
      void createClient().from("zeechat_trivia_stats").upsert({
        user_id: userId,
        best_score: nextStats.bestScore,
        streak: nextStats.streak,
        last_played: nextStats.lastPlayed,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).then(({ error }) => {
        if (error) setNotice("Trivia saved on this device, but cloud sync failed. Your next result will retry.");
      });
    }
    setTriviaStarted(false);
    setTriviaFinished(true);
  }

  async function shareTriviaScore() {
    const message = `I scored ${triviaScore}/5 in today’s ZeeChat Quickfire Trivia! Can you beat me? ${window.location.origin}`;
    try {
      if (navigator.share) await navigator.share({ title: "ZeeChat Quickfire Trivia", text: message });
      else {
        await navigator.clipboard.writeText(message);
        setNotice("Score copied — send it to a friend!");
      }
    } catch { /* Share sheet dismissed or clipboard unavailable. */ }
  }


  const loadCaptionBattle = useCallback(async () => {
    if (!userId) {
      setCaptionBattleEntries([]);
      setCaptionBattleVotedIds([]);
      setCaptionBattleLoading(false);
      return;
    }
    setCaptionBattleLoading(true);
    try {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.from("zeechat_caption_battles")
        .select("id,author_id,challenge_date,caption,vote_count,created_at")
        .eq("challenge_date", today)
        .order("vote_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data ?? []) as Omit<CaptionBattleEntry, "displayName" | "username" | "avatarUrl">[];
      const authorIds = [...new Set(rows.map(entry => entry.author_id))];
      const authors: Record<string, { username: string; display_name: string; avatar_url?: string | null }> = {};
      if (authorIds.length) {
        const { data: authorRows, error: authorError } = await supabase.from("zeechat_profiles")
          .select("user_id,username,display_name,avatar_url")
          .in("user_id", authorIds);
        if (authorError) throw authorError;
        for (const author of authorRows ?? []) authors[author.user_id] = author;
      }
      const { data: votes, error: votesError } = await supabase.from("zeechat_caption_battle_votes")
        .select("entry_id").eq("voter_id", userId);
      if (votesError) throw votesError;
      setCaptionBattleEntries(rows.map(entry => ({
        ...entry,
        displayName: authors[entry.author_id]?.display_name || (entry.author_id === userId ? profile?.display_name || "You" : "ZeeChat member"),
        username: authors[entry.author_id]?.username || (entry.author_id === userId ? profile?.username || "you" : "member"),
        avatarUrl: authors[entry.author_id]?.avatar_url || null,
      })));
      setCaptionBattleVotedIds((votes ?? []).map(vote => vote.entry_id));
    } catch (error) {
      setNotice(error instanceof Error ? "Caption Battle couldn’t load: " + error.message : "Caption Battle couldn’t load. Please try again.");
    } finally {
      setCaptionBattleLoading(false);
    }
  }, [userId, profile]);

  const loadWeeklyCaptionLeaderboard = useCallback(async () => {
    if (!userId) {
      setWeeklyCaptionLeaders([]);
      setWeeklyCaptionLoading(false);
      return;
    }
    setWeeklyCaptionLoading(true);
    try {
      const supabase = createClient();
      const now = new Date();
      const utcDay = now.getUTCDay();
      now.setUTCDate(now.getUTCDate() - (utcDay === 0 ? 6 : utcDay - 1));
      const weekStart = now.toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.from("zeechat_caption_battles")
        .select("id,author_id,vote_count,challenge_date")
        .gte("challenge_date", weekStart)
        .lte("challenge_date", today)
        .order("vote_count", { ascending: false })
        .limit(500);
      if (error) throw error;
      const totals = new Map<string, { votes: number; entries: number }>();
      for (const entry of data ?? []) {
        const current = totals.get(entry.author_id) ?? { votes: 0, entries: 0 };
        current.votes += entry.vote_count ?? 0;
        current.entries += 1;
        totals.set(entry.author_id, current);
      }
      const authorIds = [...totals.keys()];
      if (!authorIds.length) {
        setWeeklyCaptionLeaders([]);
        return;
      }
      const { data: profiles, error: profileError } = await supabase.from("zeechat_profiles")
        .select("user_id,username,display_name,avatar_url")
        .in("user_id", authorIds);
      if (profileError) throw profileError;
      const profileMap = new Map((profiles ?? []).map(author => [author.user_id, author]));
      const leaders = authorIds.map(authorId => {
        const author = profileMap.get(authorId);
        const total = totals.get(authorId)!;
        return {
          authorId,
          displayName: author?.display_name || (authorId === userId ? profile?.display_name || "You" : "ZeeChat member"),
          username: author?.username || (authorId === userId ? profile?.username || "you" : "member"),
          avatarUrl: author?.avatar_url || null,
          votes: total.votes,
          entries: total.entries,
        };
      }).sort((a, b) => b.votes - a.votes || b.entries - a.entries || a.username.localeCompare(b.username)).slice(0, 10);
      setWeeklyCaptionLeaders(leaders);
    } catch (error) {
      setWeeklyCaptionLeaders([]);
      setNotice(error instanceof Error ? "Weekly leaderboard couldn’t load: " + error.message : "Weekly leaderboard couldn’t load. Please try again.");
    } finally {
      setWeeklyCaptionLoading(false);
    }
  }, [userId, profile]);

  useEffect(() => {
    if (view === "Play") {
      void loadCaptionBattle();
      void loadWeeklyCaptionLeaderboard();
    }
  }, [view, loadCaptionBattle, loadWeeklyCaptionLeaderboard]);

  async function submitCaptionBattleEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) { setNotice("Sign in to enter today’s Caption Battle."); return; }
    const text = captionBattleDraft.trim();
    if (text.length < 3 || text.length > 240) { setNotice("Your caption must be between 3 and 240 characters."); return; }
    setCaptionBattleSubmitting(true);
    try {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("zeechat_caption_battles").insert({
        author_id: userId, challenge_date: today, caption: text,
      });
      if (error) {
        if (error.code === "23505") { setNotice("You’ve already entered today. Vote for someone else’s caption!"); await loadCaptionBattle(); return; }
        throw error;
      }
      setCaptionBattleDraft("");
      setNotice("You’re in! Now vote for your favorite caption.");
      await loadCaptionBattle();
    } catch (error) {
      setNotice(error instanceof Error ? "Couldn’t submit your caption: " + error.message : "Couldn’t submit your caption. Please try again.");
    } finally {
      setCaptionBattleSubmitting(false);
    }
  }

  async function voteForCaptionBattleEntry(entry: CaptionBattleEntry) {
    if (!userId) { setNotice("Sign in to vote in Caption Battle."); return; }
    if (entry.author_id === userId) { setNotice("You can’t vote for your own caption."); return; }
    if (captionBattleVotedIds.includes(entry.id) || captionBattleBusyIds.includes(entry.id)) return;
    setCaptionBattleBusyIds(current => [...current, entry.id]);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("zeechat_caption_battle_votes").insert({ entry_id: entry.id, voter_id: userId });
      if (error) {
        if (error.code === "23505") {
          setCaptionBattleVotedIds(current => current.includes(entry.id) ? current : [...current, entry.id]);
          setNotice("You’ve already voted for this caption.");
          return;
        }
        throw error;
      }
      setCaptionBattleVotedIds(current => [...current, entry.id]);
      setCaptionBattleEntries(current => current.map(item => item.id === entry.id ? { ...item, vote_count: item.vote_count + 1 } : item));
    } catch (error) {
      setNotice(error instanceof Error ? "Couldn’t save your vote: " + error.message : "Couldn’t save your vote. Please try again.");
    } finally {
      setCaptionBattleBusyIds(current => current.filter(id => id !== entry.id));
    }
  }

  async function shareDailyPrompt() {
    const message = `Today’s ZeeChat community prompt: “${getDailyCommunityPrompt()}” — join the conversation at ${window.location.origin}`;
    try {
      if (navigator.share) await navigator.share({ title: "ZeeChat daily prompt", text: message });
      else {
        await navigator.clipboard.writeText(message);
        setNotice("Daily prompt copied — invite a friend to answer it with you!");
      }
    } catch { /* Share sheet dismissed or clipboard unavailable. */ }
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-mark">z</span><span>Zee<b>Chat</b></span></a>
      <p className="side-label">YOUR SPACE</p>
      {nav.map(({ name, icon: Icon }) => <button key={name} className={view === name ? "nav-link active" : "nav-link"} onClick={() => setView(name)}><Icon size={19}/><span>{name}</span>{name === "Chats" && unreadMessageCount > 0 && <i className="unread-count-badge">{unreadMessageCount > 99 ? "99+" : unreadMessageCount}</i>}</button>)}
      <div className="sidebar-bottom"><div className="sidebar-promo"><Sparkles size={18}/><b>Make a little magic.</b><p>Your next favourite memory starts with a hello.</p><button onClick={() => setCreateOpen(true)}>Create something <Plus size={15}/></button></div>{userId && <button type="button" className="nav-link sign-out-button" onClick={async () => { try { const { error } = await createClient().auth.signOut(); if (error) throw error; setView("Home"); setNotice("You have been signed out."); } catch (error) { setNotice(error instanceof Error ? `Could not sign out: ${error.message}` : "Could not sign out. Please try again."); } }}><LogOut size={19}/><span>Sign out</span></button>}<small>© 2026 ZeeChat · Good vibes only</small></div>
    </aside>
    <section className="main-column">

      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {notificationsOpen && <section className="notification-center" aria-label="Notifications" aria-live="polite">
        <header className="notification-center-header"><div><span className="eyebrow">YOUR ACTIVITY</span><h2>Notifications</h2><p>{notifications.filter(item => !item.read_at).length ? `${notifications.filter(item => !item.read_at).length} unread` : "You’re all caught up"}</p></div><div className="notification-center-actions">{notifications.some(item => !item.read_at) && <button type="button" onClick={() => void markAllNotificationsRead()}>Mark all read</button>}<button type="button" className="notification-close" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}>×</button></div></header>
        {!userId ? <p className="notification-empty">Sign in to see your notifications.</p> : notifications.length ? <div className="notification-list">{notifications.map(item => <button type="button" key={item.id} className={`notification-item ${item.read_at ? "" : "is-unread"}`} onClick={() => void openNotification(item)}><span className={`notification-kind-icon notification-kind-${item.kind}`}>{item.kind === "message" ? <MessageCircle size={18}/> : item.kind === "follow" ? <Users size={18}/> : item.kind === "comment" ? <MessageCircle size={18}/> : item.kind === "caption_vote" ? <Sparkles size={18}/> : <Heart size={18}/>}</span><span className="notification-item-copy"><b>{item.title}</b><span>{item.body}</span><small>{new Date(item.created_at).toLocaleString()}</small></span>{!item.read_at && <i className="notification-unread-dot" aria-label="Unread"/>}</button>)}</div> : <p className="notification-empty">No notifications yet. New messages, follows, comments, likes and Caption Battle votes will show up here.</p>}
      </section>}
      {uploadProgress !== null && <div className="upload-progress-card" role="status" aria-live="polite">
        <div className="upload-progress-ring" style={{background: `conic-gradient(#45d6a0 ${uploadProgress * 3.6}deg, #263a33 0deg)`}} aria-label={`Upload ${uploadProgress}% complete`}><span>{uploadProgress}%</span></div>
        <div className="upload-progress-copy"><b>{uploadLabel || "Publishing your video…"}</b><small>You can keep browsing ZeeChat while this finishes.</small><div className="upload-progress-track"><span style={{width: uploadProgress + "%"}}/></div></div>
      </div>}
      {view === "Home" && <section className="home-feed-view"><div className="home-feed-heading"><div><span className="eyebrow">YOUR COMMUNITY</span><h1>Home <span className="home-heading-chevron">⌄</span></h1></div><div className="home-feed-actions"><button className="home-watch-reels" onClick={() => setView("Reels")}><Video size={16}/><span>Reels</span></button><button aria-label="Search" onClick={() => setView("Discover")}><Search size={19}/></button><button className="home-notification-button" aria-label={`Notifications${notifications.filter(item => !item.read_at).length ? `, ${notifications.filter(item => !item.read_at).length} unread` : ""}`} onClick={() => setNotificationsOpen(value => !value)}><Bell size={19}/>{notifications.some(item => !item.read_at) && <span className="notification-count-badge">{notifications.filter(item => !item.read_at).length > 99 ? "99+" : notifications.filter(item => !item.read_at).length}</span>}</button></div></div><div className="home-story-strip"><button className="home-story-add" onClick={() => setCreateOpen(true)}><span>＋</span><small>Your story</small></button>{[{name:"Karma Hossain",initial:"K"},{name:"Mira James",initial:"M"},{name:"Jay Creates",initial:"J"},{name:"Tomi Laughs",initial:"T"},{name:"Amara",initial:"A"},{name:"David",initial:"D"}].map((person,i)=><button key={person.name} className="home-story" onClick={() => setNotice("Stories are a visual preview and are not published yet.")}><span className={"home-story-avatar tone-"+i}>{person.initial}</span><small>{person.name.split(" ")[0]}</small></button>)}</div><div className="daily-prompt-card"><div className="daily-prompt-topline"><span className="daily-prompt-icon"><Sparkles size={18}/></span><span className="eyebrow">TODAY&apos;S COMMUNITY PROMPT</span><span className="daily-prompt-refresh">A fresh prompt every day</span></div><h2>{getDailyCommunityPrompt()}</h2><p>Start a conversation, share your perspective, and give someone a reason to reply.</p><div className="daily-prompt-actions"><button className="daily-prompt-answer" onClick={() => { setCaption(`Today’s ZeeChat prompt: ${getDailyCommunityPrompt()}\n\nMy take: `); setPostKind("post"); setMediaFile(null); setCreateOpen(true); }}>Answer with a post <MessageCircle size={16}/></button><button className="daily-prompt-share" onClick={() => void shareDailyPrompt()}>Invite a friend <Send size={15}/></button></div></div><section className="live-feed"><div className="feed-heading"><div><span className="eyebrow">FROM THE COMMUNITY</span><h2>Fresh on ZeeChat</h2></div><span>{posts.length} posts</span></div>{posts.length ? posts.map(p => <article className="post-card" key={p.id} data-post-id={p.id}><div className="post-avatar">{postAuthors[p.author_id]?.avatar_url ? <img className="post-avatar-image" src={postAuthors[p.author_id].avatar_url!} alt="" /> : (postAuthors[p.author_id]?.display_name?.[0] || postAuthors[p.author_id]?.username?.[0] || "z").toUpperCase()}</div><div className="post-body"><b>{postAuthors[p.author_id]?.display_name || postAuthors[p.author_id]?.username || "ZeeChat member"} <span className="post-username">{postAuthors[p.author_id]?.username ? `@${postAuthors[p.author_id].username}` : ""}</span></b><div className="post-meta-row"><small>{new Date(p.created_at).toLocaleString()}</small>{p.author_id === userId && <ContentActionMenu label="post" disabled={busy} onDelete={() => void deletePost(p)} />}</div>{p.caption && <><p>{expandedCaptions.includes(p.id) || p.caption.length <= 240 ? p.caption : p.caption.slice(0, 240).trimEnd() + "…"}</p>{p.caption.length > 240 && <button type="button" className="post-caption-toggle" onClick={() => setExpandedCaptions(current => current.includes(p.id) ? current.filter(id => id !== p.id) : [...current, p.id])}>{expandedCaptions.includes(p.id) ? "Show less" : "Read more"}</button>}</>}{p.post_type === "reel" && p.media_url ? <button type="button" className="home-reel-thumbnail" onClick={() => { setActiveReelPostId(p.id); setView("Reels"); }} aria-label="Play Reel"><img className="community-post-image" src={p.thumbnail_url || p.media_url} alt="Reel thumbnail" loading="lazy" /><span className="home-reel-play"><Video size={25} fill="currentColor"/></span><small>PLAY REEL</small></button> : p.media_url && p.post_type !== "video" ? <img className="community-post-image" src={p.media_url} alt="Image shared in a ZeeChat post" loading="lazy" /> : null}<div className="post-actions"><button className={likedPostIds.includes(p.id) ? "post-like liked" : "post-like"} disabled={likeBusyIds.includes(p.id)} aria-label={likedPostIds.includes(p.id) ? "Unlike post" : "Like post"} onClick={() => togglePostLike(p.id)}><Heart size={16} fill={likedPostIds.includes(p.id) ? "currentColor" : "none"}/><span>{postLikeCounts[p.id] ?? 0}</span></button><button className="post-like" onClick={() => toggleComments(p.id)}><MessageCircle size={16}/><span>{commentCounts[p.id] ?? 0}</span><span>{openCommentPostIds.includes(p.id) ? "Hide comments" : "Comments"}</span></button><span className="post-view-count" aria-label={`${(postViewCounts[p.id] ?? 0).toLocaleString()} views`}><Eye size={16}/><span>{(postViewCounts[p.id] ?? 0).toLocaleString()}</span></span></div>{openCommentPostIds.includes(p.id) && <div className="comments-panel">{(commentsByPost[p.id] ?? []).map(comment => <div className="comment-row" key={comment.id}><span className="comment-avatar">z</span><div><small>{comment.author_id === userId ? "You" : "Community member"} · {new Date(comment.created_at).toLocaleString()}</small>{comment.author_id === userId && <ContentActionMenu label="comment" onDelete={() => void deleteComment(comment)} />}<p>{comment.body}</p></div></div>)}<form className="comment-form" onSubmit={event => { event.preventDefault(); void submitComment(p.id); }}><input aria-label="Write a comment" maxLength={1000} value={commentDrafts[p.id] ?? ""} onChange={event => setCommentDrafts(current => ({ ...current, [p.id]: event.target.value }))} placeholder="Add a kind comment…" /><button disabled={commentBusyIds.includes(p.id) || !(commentDrafts[p.id] ?? "").trim()} type="submit">{commentBusyIds.includes(p.id) ? "Posting…" : "Send"}</button></form></div>}</div></article>) : <p className="muted">No community posts yet. Be the first to share something.</p>}</section></section>}
      {view === "Reels" && <section className="reels-view immersive-reels">
        {reelFeedMode === "saved" && !selectedLiveReel ? <div className="saved-reels-empty"><div className="immersive-brand"><span className="immersive-brand-mark">z</span><span>Zee<b>Chat</b></span></div><div className="saved-reels-empty-icon"><Bookmark size={34}/></div><h2>Your Reel library</h2><p>Save standout Reels and come back whenever you want. Your collection is private to your account.</p><button type="button" onClick={() => {setReelFeedMode("for-you");setActiveReelPostId(null);}}>Explore For You</button></div> : <><div className="reel-layout"><div key={reel.postId || reel.user} className="reel-player reel-enter" data-reel-index={index} onTouchStart={handleReelTouchStart} onTouchEnd={handleReelTouchEnd} onWheel={event => { if (Math.abs(event.deltaY) < 18) return; const now = Date.now(); if (now - lastWheelAt.current < 520) return; lastWheelAt.current = now; moveReel(event.deltaY > 0 ? 1 : -1); }} onKeyDown={event => { if (event.key === "ArrowDown") moveReel(1); if (event.key === "ArrowUp") moveReel(-1); }} tabIndex={0} aria-label="Reel viewer. Swipe up or down to change videos." style={!reel.mediaUrl ? { backgroundImage: `linear-gradient(0deg,#08070ddf,transparent 55%,#08070d55),url(https://images.unsplash.com/${reel.image}?auto=format&fit=crop&w=1000&q=85)` } : undefined}>{reel.mediaUrl && <>{selectedLiveReel?.media_url && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(selectedLiveReel.media_url) ? <img className="live-reel-video" src={reel.mediaUrl} alt={reel.caption || "Photo Reel"} onDoubleClick={event => { event.stopPropagation(); handleReelDoubleTap(); }} /> : <video ref={reelVideoRef} key={reel.postId || reel.mediaUrl} className="live-reel-video" src={reel.mediaUrl} autoPlay playsInline muted={reelMuted} preload="metadata" poster={selectedLiveReel?.thumbnail_url || undefined} onEnded={() => moveReel(1)} onDoubleClick={event => { event.stopPropagation(); handleReelDoubleTap(); }} onLoadedMetadata={event => { setReelDuration(event.currentTarget.duration || 0); setReelCurrentTime(event.currentTarget.currentTime || 0); }} onTimeUpdate={event => setReelCurrentTime(event.currentTarget.currentTime || 0)} onDurationChange={event => setReelDuration(event.currentTarget.duration || 0)} onError={() => setNotice("This video could not be loaded. Check the video file or try again.")} onClick={event => { event.stopPropagation(); const video = event.currentTarget; if (video.paused) void video.play().catch(() => setNotice("Tap the video to start playback.")); else video.pause(); }} />} <div className="reel-video-controls" onClick={event => event.stopPropagation()}><div className="reel-scrubber-row"><span>{formatVideoTime(reelCurrentTime)}</span><input aria-label="Seek through Reel" className="reel-scrubber" type="range" min={0} max={Math.max(reelDuration, 0.1)} step="0.1" value={Math.min(reelCurrentTime, reelDuration || 0)} style={{"--reel-progress": (reelDuration ? reelCurrentTime / reelDuration * 100 : 0) + "%"} as React.CSSProperties} onChange={event => { const time = Number(event.target.value); setReelCurrentTime(time); if (reelVideoRef.current) reelVideoRef.current.currentTime = time; }} /><span>{formatVideoTime(reelDuration)}</span></div></div></>}{selectedLiveReel?.sound_id && sounds.find(sound => sound.id === selectedLiveReel.sound_id) && <audio className="reel-sound-audio" src={sounds.find(sound => sound.id === selectedLiveReel.sound_id)?.audio_url} autoPlay loop muted={reelMuted} />}
          {reelLikeBurst && <div className="reel-like-burst" aria-hidden="true"><Heart size={76} fill="currentColor"/></div>}
          <div className="immersive-reel-header"><div className="immersive-brand"><span className="immersive-brand-mark">z</span><span>Zee<b>Chat</b></span></div><div className="reel-feed-tabs" role="group" aria-label="Reel feed"><button className={reelFeedMode === "following" ? "selected" : ""} aria-pressed={reelFeedMode === "following"} onClick={() => {setReelFeedMode("following");setIndex(0);setActiveReelPostId(null);}}>Following</button><button className={reelFeedMode === "for-you" ? "selected" : ""} aria-pressed={reelFeedMode === "for-you"} onClick={() => {setReelFeedMode("for-you");setIndex(0);setActiveReelPostId(null);}}>For You</button><button className={reelFeedMode === "fresh" ? "selected" : ""} aria-pressed={reelFeedMode === "fresh"} onClick={() => {setReelFeedMode("fresh");setIndex(0);setActiveReelPostId(null);}}>Fresh</button><button className={reelFeedMode === "saved" ? "selected" : ""} aria-pressed={reelFeedMode === "saved"} onClick={() => { if (!userId) { setNotice("Sign in to view your saved Reels."); return; } setReelFeedMode("saved");setIndex(0);setActiveReelPostId(null); }}>Saved</button></div><button className="immersive-search" aria-label="Search ZeeChat" onClick={() => setView("Discover")}><Search size={21}/></button></div><button type="button" className={`sound-button ${reelMuted ? "sound-disc-muted" : "sound-disc-playing"}`} aria-label={reelMuted ? "Unmute Reel" : "Mute Reel"} aria-pressed={!reelMuted} title={reelMuted ? "Turn sound on" : "Mute sound"} onClick={() => setReelMuted(value => !value)}><span className="sound-vinyl" aria-hidden="true"><span className="sound-vinyl-label">♫</span><span className="sound-vinyl-state">{reelMuted ? "×" : "♪"}</span></span></button>
          <div className="reel-caption"><div className="creator-row"><div className="creator-name-line"><b>@{reel.user}</b><ShieldCheck size={13} aria-label="Creator badge"/></div><small>Creator · 2h ago</small></div><div className={"reel-caption-heading" + (expandedCaptions.includes(reel.postId || reel.user) ? " caption-expanded" : "")}><p>{reel.caption}</p>{selectedLiveReel?.author_id === userId && <ContentActionMenu label="Reel" onDelete={() => void deletePost(selectedLiveReel)} />}</div>{reel.caption.length > 100 && <button type="button" className="reel-caption-toggle" onClick={() => setExpandedCaptions(current => current.includes(reel.postId || reel.user) ? current.filter(id => id !== (reel.postId || reel.user)) : [...current, reel.postId || reel.user])}>{expandedCaptions.includes(reel.postId || reel.user) ? "Show less" : "Read more"}</button>}<strong>{reel.tags}</strong><button type="button" className="sound-line sound-line-button" onClick={() => { const sound = sounds.find(item => item.id === selectedLiveReel?.sound_id); if (sound) { setSelectedSound(sound); setAudioFile(null); setMediaFile(null); setPostKind("reel"); setCreateOpen(true); } else setView("Sounds" as View); }}><span className={`reel-sound-disc ${reelMuted ? "paused" : "spinning"}`} aria-hidden="true"><span>♫</span></span><span className="reel-sound-title">{sounds.find(sound => sound.id === selectedLiveReel?.sound_id)?.title || reel.sound}</span><span className="reel-sound-cta">{selectedLiveReel?.sound_id ? "Use sound ↗" : "Explore sounds ↗"}</span></button></div>
        </div><div className="reel-actions"><div className="reel-creator-action"><button type="button" className="creator-avatar creator-profile-trigger" aria-label={`View @${reel.user} profile`} onClick={() => {setSelectedCreator({username:reel.user,initial:reel.initial});setView("Profile");}}>{reel.initial}</button><button type="button" className="rail-follow-button" aria-label={selectedLiveReel ? (creatorFollowState[reel.user] ? "Unfollow creator" : "Follow creator") : (following.includes(index) ? "Unfollow creator" : "Follow creator")} aria-pressed={selectedLiveReel ? Boolean(creatorFollowState[reel.user]) : following.includes(index)} disabled={selectedLiveReel ? (followBusy || selectedLiveReel.author_id === userId) : false} onClick={() => { if (selectedLiveReel) void toggleCreatorFollow(reel.user); else setFollowing(a => a.includes(index) ? a.filter(x => x !== index) : [...a, index]); }}>{selectedLiveReel ? (creatorFollowState[reel.user] ? "✓" : "+") : (following.includes(index) ? "✓" : "+")}</button></div><button onClick={() => { if (selectedLiveReel) void togglePostLike(selectedLiveReel.id); else setLiked(a => a.includes(index) ? a.filter(x => x !== index) : [...a, index]); }} className={((selectedLiveReel ? likedPostIds.includes(selectedLiveReel.id) : liked.includes(index)) ? "liked" : "") + " reel-reaction-button"} aria-label="Like reel"><span className="action-circle"><Heart size={22} fill={(selectedLiveReel ? likedPostIds.includes(selectedLiveReel.id) : liked.includes(index)) ? "currentColor" : "none"}/></span><b>{selectedLiveReel ? (postLikeCounts[selectedLiveReel.id] ?? 0) : (liked.includes(index) ? "24.9K" : reel.likes)}</b></button><button onClick={() => { if (selectedLiveReel) void toggleComments(selectedLiveReel.id); else setNotice("Comments are available on published community Reels."); }} aria-label="View comments"><span className="action-circle"><MessageCircle size={22}/></span><b>{selectedLiveReel ? (commentCounts[selectedLiveReel.id] ?? 0) : reel.comments}</b></button><button type="button" className={selectedLiveReel && savedReelIds.includes(selectedLiveReel.id) ? "saved-reel-action saved" : "saved-reel-action"} aria-label={selectedLiveReel && savedReelIds.includes(selectedLiveReel.id) ? "Remove saved Reel" : "Save Reel"} aria-pressed={Boolean(selectedLiveReel && savedReelIds.includes(selectedLiveReel.id))} disabled={!selectedLiveReel || saveReelBusyIds.includes(selectedLiveReel.id)} onClick={() => { if (selectedLiveReel) void toggleSavedReel(selectedLiveReel.id); }}><span className="action-circle"><Bookmark size={20} fill={selectedLiveReel && savedReelIds.includes(selectedLiveReel.id) ? "currentColor" : "none"}/></span><b>{selectedLiveReel && savedReelIds.includes(selectedLiveReel.id) ? "Saved" : "Save"}</b></button><div className="reel-view-count" aria-label={`${selectedLiveReel ? (postViewCounts[selectedLiveReel.id] ?? 0) : 0} views`}><span className="action-circle"><Eye size={21}/></span><b>{selectedLiveReel ? (postViewCounts[selectedLiveReel.id] ?? 0).toLocaleString() : "0"}</b><small>Views</small></div><button onClick={async () => { const shareUrl = selectedLiveReel ? `${window.location.origin}/?reel=${selectedLiveReel.id}` : window.location.href; try { if (navigator.share) await navigator.share({ title: "ZeeChat Reel", text: reel.caption, url: shareUrl }); else { await navigator.clipboard.writeText(shareUrl); setNotice("Reel link copied to clipboard."); } } catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setNotice("Could not share this Reel on this device."); } }} aria-label="Share reel"><span className="action-circle"><Send size={20}/></span><b>Share</b></button><button onClick={() => setNotice("More reel options will be available when creator tools are connected.")} aria-label="More options"><span className="action-circle"><MoreHorizontal size={21}/></span></button></div></div>

        {selectedLiveReel && userId && selectedLiveReel.author_id === userId && <section className="reel-creator-performance" aria-label="Your Reel performance"><header><div><span>CREATOR STUDIO</span><b>Reel performance</b></div><small><span className="creator-live-dot"/> Live stats</small></header><div className="reel-performance-metrics"><div><b>{(postViewCounts[selectedLiveReel.id] ?? 0).toLocaleString()}</b><span>Views</span></div><div><b>{(postLikeCounts[selectedLiveReel.id] ?? 0).toLocaleString()}</b><span>Likes</span></div><div><b>{(commentCounts[selectedLiveReel.id] ?? 0).toLocaleString()}</b><span>Comments</span></div><div><b>{(Math.round((((postLikeCounts[selectedLiveReel.id] ?? 0) + (commentCounts[selectedLiveReel.id] ?? 0)) / Math.max(postViewCounts[selectedLiveReel.id] ?? 0, 1)) * 1000) / 10).toFixed(1)}%</b><span>Engagement</span></div></div><p>Keep the conversation going: reply to comments and share another Reel when your audience is active.</p></section>}
        <div className="reel-creator-nudge"><div className="reel-creator-nudge-mark"><Sparkles size={18}/></div><div className="reel-creator-nudge-copy"><b>Your next Reel could start a conversation.</b><span>Share a moment, use a sound, and give people something worth responding to.</span></div><button type="button" onClick={() => { if (!userId) { setNotice("Sign in to publish your own Reel."); return; } setPostKind("reel"); setMediaFile(null); setAudioFile(null); setSelectedSound(null); setCreateOpen(true); }}>Create a Reel <Plus size={15}/></button></div>
        {selectedLiveReel && openCommentPostIds.includes(selectedLiveReel.id) && <section className="reel-comments-panel" aria-label="Reel comments"><header><b>Comments · {commentCounts[selectedLiveReel.id] ?? 0}</b><button type="button" onClick={() => void toggleComments(selectedLiveReel.id)}>×</button></header><div className="reel-comments-list">{(commentsByPost[selectedLiveReel.id] ?? []).map(comment => <article key={comment.id}><b>{comment.author_id === userId ? "You" : "Community member"}</b>{comment.author_id === userId && <ContentActionMenu label="comment" onDelete={() => void deleteComment(comment)} />}<p>{comment.body}</p></article>)}{!(commentsByPost[selectedLiveReel.id] ?? []).length && <p className="muted">Be the first to comment.</p>}</div><form onSubmit={event => {event.preventDefault(); void submitComment(selectedLiveReel.id);}}><input value={commentDrafts[selectedLiveReel.id] ?? ""} onChange={event => setCommentDrafts(current => ({...current,[selectedLiveReel.id]:event.target.value}))} placeholder="Add a comment…" maxLength={1000}/><button type="submit" disabled={commentBusyIds.includes(selectedLiveReel.id) || !(commentDrafts[selectedLiveReel.id] ?? "").trim()}><Send size={16}/></button></form></section>}
      </>}</section>}
{view === ("Sounds" as View) && <section className="content-view sound-library-view"><button className="outline-button" onClick={() => setView("Reels")}>← Back to Reels</button><span className="eyebrow">SOUND LIBRARY</span><h1>Find your <em>sound.</em></h1><p>Choose an audio track and make a photo or video Reel with it.</p>{sounds.length ? <div className="sound-library-list">{sounds.map(sound => <article className="sound-library-card" key={sound.id}><span className="sound-icon">♫</span><div><b>{sound.title}</b><small>Original audio · {new Date(sound.created_at).toLocaleDateString()}</small><audio controls preload="none" src={sound.audio_url}/><div className="sound-using-posts"><b>Posts using this sound</b>{posts.filter(post => post.sound_id === sound.id).length ? posts.filter(post => post.sound_id === sound.id).map(post => <button type="button" key={post.id} onClick={() => {setActiveReelPostId(post.id);setView("Reels");}}>{post.caption || "Open sound Reel"} ↗</button>) : <small>No posts using this sound yet.</small>}</div></div><div className="sound-card-actions"><button className="create-button" onClick={() => {setSelectedSound(sound);setAudioFile(null);setMediaFile(null);setPostKind("reel");setCreateOpen(true);}}>Use sound</button>{userId === sound.creator_id && <ContentActionMenu label="sound" onDelete={() => void deleteSound(sound)} />}</div></article>)}</div> : <div className="empty-state"><span>♫</span><h3>No reusable sounds yet</h3><p>Publish a Reel with an audio file to add the first sound to the library.</p><button className="create-button" onClick={() => {setSelectedSound(null);setAudioFile(null);setPostKind("reel");setCreateOpen(true);}}>Create a sound Reel</button></div>}</section>}
      {view === "Discover" && <section className="content-view discover-view"><div className="discover-heading"><div><span className="eyebrow">YOUR NEXT FAVOURITE THING</span><h1>Find your <em>people.</em></h1><p>Discover creators and vibes.</p></div><button type="button" className="discover-search-action" aria-label="Search creators" aria-expanded={discoverSearchOpen} onClick={() => setDiscoverSearchOpen(value => !value)}><Search size={19}/></button></div>{discoverSearchOpen && <form className="discover-search-form" onSubmit={event => {event.preventDefault();void searchDiscoverCreators();}}><input aria-label="Search creators" placeholder="Search by name or username…" value={discoverQuery} maxLength={60} onChange={event => setDiscoverQuery(event.target.value)}/><button type="submit" disabled={discoverSearchLoading}>{discoverSearchLoading ? "Searching…" : "Search"}</button></form>}{discoverSearchOpen && discoverQuery.trim() && <div className="discover-search-results" aria-live="polite">{discoverSearchLoading ? <p>Searching public creators…</p> : discoverResults.length ? discoverResults.map(creator => <button type="button" className="discover-creator-result" key={creator.user_id} onClick={() => {setSelectedCreator({username:creator.username,initial:(creator.display_name || creator.username || "Z").slice(0,1).toUpperCase(),avatarUrl:creator.avatar_url});setView("Profile");}}><span className="discover-creator-avatar">{creator.avatar_url && !failedAvatarUrls.includes(creator.avatar_url) ? <Image src={creator.avatar_url} alt="" width={42} height={42} unoptimized onError={() => setFailedAvatarUrls(current => current.includes(creator.avatar_url!) ? current : [...current, creator.avatar_url!])}/> : (creator.display_name?.[0] || creator.username?.[0] || "Z").toUpperCase()}</span><span className="discover-creator-copy"><b>{creator.display_name || creator.username}</b><small>@{creator.username}</small>{creator.bio && <span>{creator.bio}</span>}</span><span className="discover-creator-arrow">→</span></button>) : <p className="discover-search-empty">No public creators found. Try a different name or username.</p>}</div>}<h2 className="discover-section-title">Trending topics</h2><div className="discover-category-grid">{[["😂","Comedy"],["🎧","Music"],["🎮","Gaming"],["🎬","Movies"],["🎤","Creators"],["🎉","Parties"]].map(([emoji,label])=><button type="button" className="discover-category" key={label} onClick={() => label === "Parties" ? setView("Parties") : setNotice(label + " discovery is coming soon. Recommendations are preview content.")}><span className="discover-category-icon" aria-hidden="true">{emoji}</span><span>{label}</span><span className="discover-category-arrow" aria-hidden="true">↗</span></button>)}</div><h2 className="discover-section-title discover-live-title">Live creators</h2><div className="discover-live-placeholder"><span className="discover-live-dot"/>Live creator discovery is coming soon.</div><h2 className="discover-section-title">Recommended for you</h2><p className="discover-recommendation-note">Personalized recommendations will appear here as ZeeChat’s community grows.</p></section>}
      {view === "Parties" && <section className="content-view parties-view">
        <div className="parties-hero"><div><span className="eyebrow"><i className="live-dot"/> LIVE COMMUNITY</span><h1>Good people.<br/><em>Great energy.</em></h1><p>Drop into a room, meet your people, and make something happen live.</p></div><div className="party-hero-orbit"><Users size={42}/><span>LIVE</span></div></div>
        <div className="party-mode-switch" role="tablist" aria-label="Choose ZeeChat mode"><button className="active" role="tab" aria-selected="true" onClick={() => setNotice("You're browsing the social party hub.")}>Social</button><button role="tab" aria-selected="false" onClick={() => setNotice("Party mode is the live-room discovery experience.")}>Parties <span className="live-dot"/></button></div>
        <div className="party-section-heading"><div><span className="eyebrow">HAPPENING RIGHT NOW</span><h2>Live now <span className="live-count">03</span></h2></div><button className="text-action" onClick={() => setNotice("Live rooms shown here are preview cards until party services are connected.")}>See all ↗</button></div>
        <div className="party-live-grid">
          <article className="party-live-card party-card-violet"><div className="party-card-top"><span className="party-live-pill"><i/> LIVE NOW</span><span className="party-lock"><Users size={14}/> 128</span></div><div className="party-card-content"><div className="party-host-avatar">M</div><small>@mira.moves · HOST</small><h3>Midnight Vibes ✨</h3><p>Music, stories & good company.</p><button onClick={() => setNotice("Live party rooms are a preview right now. Real-time audio/video joining is not connected yet.")}>Join party <span>↗</span></button></div></article>
          <article className="party-live-card party-card-cyan"><div className="party-card-top"><span className="party-live-pill"><i/> LIVE NOW</span><span className="party-lock"><Users size={14}/> 64</span></div><div className="party-card-content"><div className="party-host-avatar">J</div><small>@jaycreates · HOST</small><h3>After Hours 🎧</h3><p>Fresh sounds, zero skips.</p><button onClick={() => setNotice("Live party rooms are a preview right now. Real-time audio/video joining is not connected yet.")}>Join party <span>↗</span></button></div></article>
          <article className="party-live-card party-card-rose"><div className="party-card-top"><span className="party-live-pill"><i/> LIVE NOW</span><span className="party-lock"><Users size={14}/> 32</span></div><div className="party-card-content"><div className="party-host-avatar">T</div><small>@tomi.laughs · HOST</small><h3>Laugh Lounge 😂</h3><p>Bring your funniest stories.</p><button onClick={() => setNotice("Live party rooms are a preview right now. Real-time audio/video joining is not connected yet.")}>Join party <span>↗</span></button></div></article>
        </div>
        <div className="party-section-heading upcoming-heading"><div><span className="eyebrow">SAVE YOUR SEAT</span><h2>Coming up</h2></div><span className="party-muted-label">YOUR LOCAL TIME</span></div>
        <div className="upcoming-party-list"><article><div className="upcoming-date"><b>08</b><span>PM</span></div><div className="upcoming-copy"><h3>Creators Unplugged</h3><p><CalendarClock size={13}/> Tonight · Host Q&amp;A and open mic</p></div><button onClick={() => setNotice("Reminders will be available when party scheduling is connected.")}>Remind me <span>＋</span></button></article><article><div className="upcoming-date"><b>09</b><span>PM</span></div><div className="upcoming-copy"><h3>Chill &amp; Chat 🌙</h3><p><CalendarClock size={13}/> Tomorrow · Meet new people</p></div><button onClick={() => setNotice("Reminders will be available when party scheduling is connected.")}>Remind me <span>＋</span></button></article></div>
        <div className="party-bottom-cta"><div><span className="eyebrow">YOUR ROOM. YOUR RULES.</span><h2>Host the next <em>great night.</em></h2><p>Create a space for your people to hang out.</p></div><button className="create-button" onClick={() => setPartyCreateOpen(true)}><Plus size={18}/> Create party</button></div>
      </section>}
      {view === "Play" && (
        <section className="content-view play-view">
          <div className="play-heading">
            <span className="eyebrow">YOUR DAILY DOSE OF FUN</span>
            <h1>Let&apos;s <em>play.</em></h1>
            <p>Quick challenges, tiny wins, and something fun to share with your people.</p>
          </div>
          <div className="daily-challenge-banner">
            <div className="daily-challenge-icon">⚡</div>
            <div className="daily-challenge-copy">
              <span className="eyebrow">TODAY&apos;S CHALLENGE</span>
              <h2>Quickfire Trivia</h2>
              <p>Five questions. One daily run. How many can you get right?</p>
            </div>
            <div className="daily-challenge-meta">
              <span>🧠 5 rounds</span>
              <span>🏆 {triviaStats.bestScore}/5 best</span>
              <span>🔥 {triviaStats.streak} day streak</span>
            </div>
          </div>
          {!triviaStarted && !triviaFinished && (
            <div className="trivia-start-panel">
              <div className="trivia-orbit">🧠</div>
              <h2>Ready to flex your brain?</h2>
              <p>Your daily set refreshes each day. Play for fun, beat your personal best, then share your score with friends.</p>
              <div className="trivia-rules">
                <span><Check size={16}/> 5 multiple-choice questions</span>
                <span><Check size={16}/> Instant answer explanations</span>
                <span><Check size={16}/> Personal best and streak sync across devices when signed in</span>
              </div>
              <button className="trivia-primary-button" onClick={startTrivia}>Start today&apos;s challenge <ArrowLeft size={17} className="trivia-start-arrow"/></button>
            </div>
          )}
          {triviaStarted && !triviaFinished && triviaQuestions[triviaIndex] && (
            <div className="trivia-game-panel">
              <div className="trivia-progress-row">
                <span>QUESTION {triviaIndex + 1} OF {triviaQuestions.length}</span>
                <span>✨ {triviaScore} {triviaScore === 1 ? "point" : "points"}</span>
              </div>
              <div className="trivia-progress-track"><span style={{ width: `${((triviaIndex + (triviaAnswer !== null ? 1 : 0)) / triviaQuestions.length) * 100}%` }}/></div>
              <h2>{triviaQuestions[triviaIndex].question}</h2>
              <div className="trivia-options">
                {triviaQuestions[triviaIndex].options.map((option, optionIndex) => {
                  let optionClass = "trivia-option";
                  if (triviaAnswer !== null && optionIndex === triviaQuestions[triviaIndex].answer) optionClass += " is-correct";
                  else if (triviaAnswer === optionIndex) optionClass += " is-wrong";
                  else if (triviaAnswer !== null) optionClass += " is-muted";
                  return (
                    <button key={option} className={optionClass} disabled={triviaAnswer !== null} onClick={() => chooseTriviaAnswer(optionIndex)}>
                      {option}
                      <span>{triviaAnswer !== null && optionIndex === triviaQuestions[triviaIndex].answer ? "✓" : triviaAnswer === optionIndex ? "×" : String.fromCharCode(65 + optionIndex)}</span>
                    </button>
                  );
                })}
              </div>
              {triviaAnswer !== null && (
                <div className={triviaAnswer === triviaQuestions[triviaIndex].answer ? "trivia-feedback correct-feedback" : "trivia-feedback"}>
                  <b>{triviaAnswer === triviaQuestions[triviaIndex].answer ? "Correct!" : "Not quite!"}</b>
                  <p>{triviaQuestions[triviaIndex].fact}</p>
                  <button className="trivia-primary-button" onClick={advanceTrivia}>
                    {triviaIndex < triviaQuestions.length - 1 ? "Next question" : "See my result"} <span>→</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {triviaFinished && (
            <div className="trivia-result-panel">
              <div className="trivia-result-emoji">{triviaScore === 5 ? "🏆" : triviaScore >= 3 ? "🎉" : "💪"}</div>
              <span className="eyebrow">DAILY CHALLENGE COMPLETE</span>
              <h2>{triviaScore === 5 ? "Perfect run!" : triviaScore >= 3 ? "You showed up!" : "Every round makes you sharper."}</h2>
              <div className="trivia-score"><strong>{triviaScore}</strong><span>/ 5 correct</span></div>
              <p>{triviaScore === 5 ? "Five out of five. Go on and let your friends know." : "Your next run is another chance to beat your best."}</p>
              <div className="trivia-result-stats">
                <span><small>PERSONAL BEST</small><b>{triviaStats.bestScore}/5</b></span>
                <span><small>DAY STREAK</small><b>🔥 {triviaStats.streak}</b></span>
              </div>
              <div className="trivia-result-actions">
                <button className="trivia-primary-button" onClick={shareTriviaScore}>Share my score <Users size={17}/></button>
                <button className="trivia-secondary-button" onClick={() => { setTriviaFinished(false); setTriviaStarted(false); setTriviaAnswer(null); }}>Back to Play</button>
              </div>
            </div>
          )}
          <section className="weekly-caption-leaderboard" aria-labelledby="weekly-caption-title">
            <div className="weekly-caption-heading">
              <div><span className="eyebrow">WEEKLY RANKINGS</span><h2 id="weekly-caption-title">Caption Champions <span>🏆</span></h2><p>Creators ranked by real votes earned in this week’s Caption Battles.</p></div>
              <span className="weekly-caption-period">MON–SUN · UTC</span>
            </div>
            {!userId ? <div className="weekly-caption-empty">Sign in to see this week’s community leaderboard.</div> : weeklyCaptionLoading ? <div className="weekly-caption-empty">Counting this week’s votes…</div> : weeklyCaptionLeaders.length ? <ol className="weekly-caption-list">
              {weeklyCaptionLeaders.map((leader, rank) => <li key={leader.authorId} className="weekly-caption-row">
                <span className={"weekly-caption-rank" + (rank < 3 ? " weekly-caption-podium" : "")}>{rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : rank + 1}</span>
                <span className="weekly-caption-avatar">{leader.avatarUrl ? <img src={leader.avatarUrl} alt="" loading="lazy" /> : (leader.displayName[0] || "Z").toUpperCase()}</span>
                <span className="weekly-caption-creator"><b>{leader.authorId === userId ? "You" : leader.displayName}</b><small>@{leader.username} · {leader.entries} {leader.entries === 1 ? "entry" : "entries"}</small></span>
                <span className="weekly-caption-votes"><b>{leader.votes}</b><small>{leader.votes === 1 ? "vote" : "votes"}</small></span>
              </li>)}
            </ol> : <div className="weekly-caption-empty"><b>The leaderboard is wide open.</b><p>Enter today’s Caption Battle and start earning votes to claim the top spot.</p></div>}
            <button type="button" className="weekly-caption-refresh" onClick={() => void loadWeeklyCaptionLeaderboard()} disabled={weeklyCaptionLoading}>Refresh rankings ↻</button>
          </section>
          <section className="caption-battle-panel" aria-labelledby="caption-battle-title">
            <div className="caption-battle-header">
              <div>
                <span className="eyebrow">DAILY COMMUNITY BATTLE</span>
                <h2 id="caption-battle-title">Caption Battle <span>🔥</span></h2>
                <p>{getDailyCaptionPrompt()}</p>
              </div>
              <div className="caption-battle-today"><span>{captionBattleEntries.length}</span><small>captions today</small></div>
            </div>
            {!userId ? (
              <div className="caption-battle-empty"><b>Your people are waiting.</b><p>Sign in to enter the daily battle and vote for the funniest caption.</p></div>
            ) : (
              <>
                {!captionBattleHasEntered ? (
                  <form className="caption-battle-form" onSubmit={submitCaptionBattleEntry}>
                    <label htmlFor="caption-battle-draft">Your one-liner</label>
                    <textarea id="caption-battle-draft" value={captionBattleDraft} onChange={event => setCaptionBattleDraft(event.target.value)} placeholder="Make it funny. Make it memorable…" maxLength={240} rows={3} />
                    <div className="caption-battle-form-footer"><small>{captionBattleDraft.trim().length}/240 · one entry per day</small><button type="submit" disabled={captionBattleSubmitting || captionBattleDraft.trim().length < 3}>{captionBattleSubmitting ? "Submitting…" : "Enter the battle"} <ArrowLeft size={15} className="caption-battle-submit-arrow"/></button></div>
                  </form>
                ) : <div className="caption-battle-entered"><Check size={17}/><span>You’re in today’s battle. Cast a vote for someone else’s caption!</span></div>}
                <div className="caption-battle-toolbar"><b>Today’s captions</b><div><button type="button" className={captionBattleSort === "top" ? "active" : ""} onClick={() => setCaptionBattleSort("top")}>Top</button><button type="button" className={captionBattleSort === "new" ? "active" : ""} onClick={() => setCaptionBattleSort("new")}>Newest</button></div></div>
                {captionBattleLoading ? <div className="caption-battle-empty">Loading today’s captions…</div> : sortedCaptionBattleEntries.length === 0 ? <div className="caption-battle-empty"><b>Be the first to make the room laugh.</b><p>Drop the first caption for today’s prompt.</p></div> : (
                  <div className="caption-battle-list">
                    {sortedCaptionBattleEntries.map((entry, rank) => {
                      const ownEntry = entry.author_id === userId;
                      const voted = captionBattleVotedIds.includes(entry.id);
                      const voteBusy = captionBattleBusyIds.includes(entry.id);
                      return <article className="caption-battle-entry" key={entry.id}>
                        <div className="caption-battle-rank">{captionBattleSort === "top" && entry.vote_count > 0 ? (rank === 0 ? "🏆" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "#" + (rank + 1)) : "💬"}</div>
                        <div className="caption-battle-entry-copy"><p>{entry.caption}</p><div><b>{ownEntry ? "You" : entry.displayName}</b><span>@{entry.username}</span></div></div>
                        <button type="button" className={voted ? "caption-battle-vote voted" : "caption-battle-vote"} disabled={ownEntry || voted || voteBusy} onClick={() => void voteForCaptionBattleEntry(entry)} aria-label={ownEntry ? "Your caption" : voted ? "You voted for this caption" : "Vote for this caption"}><Heart size={15} fill={voted ? "currentColor" : "none"}/><span>{entry.vote_count}</span><small>{ownEntry ? "Yours" : voted ? "Voted" : voteBusy ? "Saving…" : "Vote"}</small></button>
                      </article>;
                    })}
                  </div>
                )}
              </>
            )}
            <div className="caption-battle-footnote"><ShieldCheck size={14}/> One entry per person daily · one vote per caption · no voting for yourself</div>
          </section>
          <div className="feature-grid play-coming-soon">
            <article className="feature-card"><div className="feature-emoji">😂</div><h3>Caption This</h3><p>Turn a photo into the funniest line in the room.</p><button onClick={() => setNotice("Caption battles are next on the ZeeChat Play roadmap.")}>Coming next ↗</button></article>
            <article className="feature-card"><div className="feature-emoji">🎤</div><h3>Voice Room Roulette</h3><p>Meet people through shared interests and conversation.</p><button onClick={() => setNotice("Voice Room Roulette is planned for a future release.")}>Coming next ↗</button></article>
          </div>
        </section>
      )}
      {view === "Chats" && <section className={activeChat ? "content-view chat-view chat-detail-view" : "content-view chat-view"}>{activeChat ? <><header className="chat-detail-header"><button className="chat-back-button" onClick={() => {setActiveChat(false);setActiveConversationId(null);activeConversationRef.current=null;void loadInbox(userId ?? "");}} aria-label="Back to messages"><ArrowLeft size={20}/></button><button className="chat-contact" onClick={() => { if (selectedCreator?.username) setView("Profile"); else setNotice("This conversation has no linked creator profile."); }}><span className="chat-contact-avatar">{selectedCreator?.avatarUrl && !failedAvatarUrls.includes(selectedCreator.avatarUrl) ? <Image src={selectedCreator.avatarUrl} alt={`${selectedCreator.username} profile photo`} width={44} height={44} unoptimized onError={() => setFailedAvatarUrls(current => current.includes(selectedCreator.avatarUrl!) ? current : [...current, selectedCreator.avatarUrl!])}/> : (selectedCreator?.initial ?? "Z")}<i/></span><span><b>{selectedCreator?.username ?? "Conversation"}</b><small><i/> Direct message</small></span></button><button className="chat-more-button" onClick={() => setNotice("Conversation options: View profile, Search chat, Mute, Block and Report will be added with live messaging.")} aria-label="Conversation options"><MoreHorizontal size={22}/></button></header><div className="chat-timeline" aria-label="Conversation messages"><div className="chat-date-divider"><span>Today</span></div>{liveMessages.map(message=><div className={"chat-message-row "+(message.sender_id===userId ? "mine" : "theirs")} key={message.id}><div className="chat-message-content"><div className="chat-bubble">{message.body}</div><div className="chat-message-meta"><time>{new Date(message.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time>{message.sender_id===userId && <Check size={13}/>}</div></div></div>)}{!liveMessages.length && <p className="chat-first-message">You’re connected. Send the first message.</p>}</div><form className="chat-composer" onSubmit={event => {event.preventDefault(); void sendLiveMessage();}}><button type="button" className="chat-attach-button" aria-label="Attachment options" onClick={() => setNotice("Photo, video and file attachments will be available when chat storage is connected.")}><Paperclip size={20}/></button><textarea rows={1} aria-label="Write a message" placeholder="Message ZeeChat…" value={chatDraft} maxLength={4000} onChange={event=>setChatDraft(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/><button type="button" className="chat-emoji-button" aria-label="Emoji" onClick={()=>setChatDraft(draft=>draft+"😊")}><Smile size={19}/></button><button type="submit" className="chat-send-button" disabled={!chatDraft.trim()} aria-label="Send message"><Send size={18}/></button></form></> : <><div className="chat-heading"><div><span className="eyebrow">YOUR PEOPLE, YOUR SPACE</span><h1>Messages</h1><p>Keep good conversations going.</p></div><button className="chat-compose" onClick={() => setNotice("New conversations will be available when messaging is connected.")} aria-label="New message"><Plus size={20}/></button></div><div className="chat-search"><Search size={17}/><input aria-label="Search conversations" placeholder="Search conversations…" value={inboxSearch} onChange={event => setInboxSearch(event.target.value)}/>{inboxSearch && <button type="button" aria-label="Clear conversation search" onClick={() => setInboxSearch("")}>×</button>}</div><div className="chat-filter-row"><button type="button" className={inboxFilter === "all" ? "chat-filter-active" : ""} onClick={() => setInboxFilter("all")}>All messages</button><button type="button" className={inboxFilter === "unread" ? "chat-filter-active" : ""} onClick={() => setInboxFilter("unread")}>Unread{unreadConversationCount > 0 ? ` (${unreadConversationCount})` : ""}</button><button type="button" onClick={() => setNotice("Message requests are not available yet.")}>Requests</button></div>{filteredInboxConversations.length ? (<div className="chat-live-inbox">{filteredInboxConversations.map(item=><button type="button" className="chat-demo-thread" key={item.id} onClick={()=>void openExistingConversation(item)} disabled={chatLoading}><span className="chat-contact-avatar">{item.avatarUrl && !failedAvatarUrls.includes(item.avatarUrl) ? <Image src={item.avatarUrl} alt="" width={44} height={44} unoptimized onError={() => setFailedAvatarUrls(current => current.includes(item.avatarUrl!) ? current : [...current, item.avatarUrl!])}/> : (item.displayName[0]||"Z").toUpperCase()}<i/></span><span className="chat-demo-thread-copy"><b>{item.displayName}<small>{item.lastAt ? new Date(item.lastAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : ""}</small>{item.unreadCount > 0 && <i className="chat-demo-unread" aria-label={`${item.unreadCount} unread messages`}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</i>}</b><span>{item.lastMessage}</span></span></button>)}</div>) : (inboxConversations.length && (inboxSearch.trim() || inboxFilter === "unread") ? (<div className="chat-inbox-empty"><div className="chat-empty-art"><Search size={25}/></div><h2>{inboxFilter === "unread" && !inboxSearch.trim() ? "You’re all caught up" : inboxFilter === "unread" ? "No matching unread chats" : "No matching conversations"}</h2><p>{inboxFilter === "unread" && !inboxSearch.trim() ? "There are no unread conversations right now." : "Try another name, username, or message keyword."}</p><button onClick={() => {setInboxSearch("");setInboxFilter("all");}}>Show all messages <span>→</span></button></div>) : (<div className="chat-inbox-empty"><div className="chat-empty-art"><MessageCircle size={29}/></div><h2>No conversations yet</h2><p>Visit a creator’s profile and tap Message to start a real conversation.</p><button onClick={() => setView("Discover")}>Discover people <span>→</span></button></div>))}</>}</section>}
      {view === "Profile" && selectedCreator ? <section className="content-view profile-view creator-preview-view">
        <button className="creator-preview-back" onClick={() => {setSelectedCreator(null);setView("Reels");}}><ArrowLeft size={17}/> Back to Reels</button>
        <div className="profile-cover" style={selectedCreatorProfile?.cover_url ? {backgroundImage:`linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.52)),url("${selectedCreatorProfile.cover_url}")`,backgroundSize:"cover",backgroundPosition:"center"} : undefined}><span>{selectedCreatorProfile?.cover_url ? "" : "✦ GOOD ENERGY ONLY"}</span></div>
        <div className="profile-summary">
          <div className="profile-avatar">{selectedCreatorProfile?.avatar_url ? <Image src={selectedCreatorProfile.avatar_url} alt="" width={88} height={88} unoptimized/> : (selectedCreatorProfile?.display_name?.[0] || selectedCreatorProfile?.username?.[0] || selectedCreator.initial).toUpperCase()}</div>
          <h1>{selectedCreatorProfile?.display_name || selectedCreator.username}</h1><p>@{selectedCreatorProfile?.username || selectedCreator.username}</p>
          {selectedCreatorProfile?.bio && <p>{selectedCreatorProfile.bio}</p>}
          <div className="creator-preview-actions">
            <button className="create-button" disabled={!selectedCreatorProfile || selectedCreatorProfile.user_id === userId} onClick={() => {if(selectedCreatorProfile) void openLiveConversation(selectedCreatorProfile.user_id,selectedCreatorProfile.username,selectedCreator.initial);}}>Message</button>
            <button className="outline-button" disabled={followBusy || !selectedCreatorProfile || selectedCreatorProfile.user_id === userId} onClick={() => void toggleCreatorFollow(selectedCreatorProfile?.username || selectedCreator.username)}>{followBusy ? "Please wait…" : creatorFollowState[selectedCreatorProfile?.username || selectedCreator.username] ? "Following" : "Follow"}</button>
          </div>
          <div className="profile-stats"><div><b>{selectedCreatorPosts.length}</b><small>Posts</small></div><div><b>{selectedCreatorFollowCounts.followers.toLocaleString()}</b><small>Followers</small></div><div><b>{selectedCreatorFollowCounts.following.toLocaleString()}</b><small>Following</small></div></div>
        </div>
        {creatorProfileLoading ? <div className="profile-empty-state"><h2>Loading profile…</h2><p>Fetching creator details and public posts.</p></div> : !selectedCreatorProfile ? <div className="profile-empty-state"><h2>Profile unavailable</h2><p>This creator may be using a preview Reel rather than a registered ZeeChat account.</p></div> : selectedCreatorPosts.length ? <div className="profile-post-list">{selectedCreatorPosts.map(post=><article className="profile-post-item" key={post.id}>{post.media_url && (post.post_type === "reel" || post.post_type === "video" || post.is_reel ? <button type="button" className="profile-post-thumbnail" onClick={()=>{setActiveReelPostId(post.id);setReelFeedMode("for-you");setView("Reels");}} aria-label="Play creator video">{post.thumbnail_url ? <img src={post.thumbnail_url} alt="" loading="lazy"/> : <img src={post.media_url} alt="" loading="lazy"/>}<span><Video size={22} fill="currentColor"/></span></button> : <img className="profile-post-thumbnail-image" src={post.thumbnail_url || post.media_url} alt="Creator post" loading="lazy"/>)}{post.caption && <p>{post.caption}</p>}</article>)}</div> : <div className="profile-empty-state"><h2>No public posts yet</h2><p>When this creator shares something, it will appear here.</p></div>}
      </section> : view === "Profile" && <section className="content-view profile-view"><div className="profile-cover" style={profile?.cover_url ? {backgroundImage:`linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.52)),url("${profile.cover_url}")`,backgroundSize:"cover",backgroundPosition:"center"} : undefined}><span>{profile?.cover_url ? "" : "✦ GOOD ENERGY ONLY"}</span>{userId && <label className={`profile-image-change cover-image-change${coverUploadBusy ? " is-uploading" : ""}`} aria-disabled={coverUploadBusy}>{coverUploadBusy ? "Uploading cover…" : "Change cover"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={coverUploadBusy} onChange={event=>{const input=event.currentTarget;const file=input.files?.[0];if(file)void uploadProfileImage(file,"cover");input.value="";}} /></label>}</div><div className="profile-summary"><div className="profile-avatar">{profile?.avatar_url ? <Image src={profile.avatar_url} alt="Profile photo" width={88} height={88} unoptimized /> : (userId ? (profile?.display_name?.[0] || profile?.username?.[0] || "Z").toUpperCase() : "z")}</div>{userId && <label className={`profile-image-change avatar-image-change${avatarUploadBusy ? " is-uploading" : ""}`} aria-disabled={avatarUploadBusy}>{avatarUploadBusy ? "Uploading profile photo…" : "Change profile photo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={avatarUploadBusy} onChange={event=>{const input=event.currentTarget;const file=input.files?.[0];if(file)void uploadProfileImage(file,"avatar");input.value="";}} /></label>}{userId ? <><button className="outline-button" onClick={openProfileEditor}>Edit profile</button><button type="button" className="outline-button profile-sign-out-button" onClick={async () => { try { const { error } = await createClient().auth.signOut(); if (error) throw error; setView("Home"); setNotice("You have been signed out."); } catch (error) { setNotice(error instanceof Error ? `Could not sign out: ${error.message}` : "Could not sign out. Please try again."); } }}><LogOut size={14}/> Sign out</button></> : <a href="/login" className="outline-button">Sign in</a>}<h1>{userId ? (profile?.display_name || profile?.username || (userEmail ? userEmail.split("@")[0] : "Your profile")) : "Your profile"}</h1><p>{userId ? (profile?.username ? `@${profile.username}` : "You’re signed in. Your profile is being set up.") : "Sign in to personalize your space."}</p>{userId && profile?.bio && <p>{profile.bio}</p>}{userId && <div className="profile-stats"><div><b>{posts.filter(post => post.author_id === userId).length}</b><small>Posts</small></div><div><b>{followCounts.followers}</b><small>Followers</small></div><div><b>{followCounts.following}</b><small>Following</small></div></div>}</div>{!userId ? <div className="profile-empty-state"><span className="profile-empty-icon"><UserRound size={25}/></span><h2>Your space is waiting</h2><p>Sign in to share videos, follow creators, and connect with your people.</p><div className="profile-empty-actions"><a className="create-button" href="/login">Sign in</a><a className="outline-button" href="/signup">Create account</a></div></div> : <><div className="profile-content-tabs"><button className={profileTab === "posts" ? "selected" : ""} onClick={() => setProfileTab("posts")}>Posts</button><button className={profileTab === "videos" ? "selected" : ""} onClick={() => setProfileTab("videos")}>Videos</button><button className={profileTab === "likes" ? "selected" : ""} onClick={() => setProfileTab("likes")}>Likes</button></div>{(profileTab === "posts" ? posts.filter(post => post.author_id === userId) : profileTab === "videos" ? posts.filter(post => post.author_id === userId && ["video","reel"].includes(post.post_type)) : posts.filter(post => likedPostIds.includes(post.id))).length === 0 ? <div className="profile-empty-state"><span className="profile-empty-icon"><Plus size={25}/></span><h2>{profileTab === "posts" ? "Your story starts here" : profileTab === "videos" ? "Your videos will appear here" : "No liked posts yet"}</h2><p>{profileTab === "posts" ? "Share your first post with the community." : profileTab === "videos" ? "Publish a Reel or video to build your gallery." : "Posts you like will be collected here."}</p>{profileTab === "posts" && <button className="create-button" onClick={() => setCreateOpen(true)}>Create your first post <Plus size={16}/></button>}</div> : <div className="profile-post-list">{(profileTab === "posts" ? posts.filter(post => post.author_id === userId) : profileTab === "videos" ? posts.filter(post => post.author_id === userId && ["video","reel"].includes(post.post_type)) : posts.filter(post => likedPostIds.includes(post.id))).map(post => <article className="profile-post-item" key={post.id}>{post.media_url && (post.post_type === "reel" || post.post_type === "video" ? <button type="button" className="profile-post-thumbnail" onClick={() => { setActiveReelPostId(post.id); setView("Reels"); }} aria-label="Play video post">{post.thumbnail_url ? <img src={post.thumbnail_url} alt="Video thumbnail" loading="lazy"/> : /\.(mp4|webm|mov)(\?|$)/i.test(post.media_url) ? <video src={post.media_url} muted playsInline preload="metadata" aria-label="Video thumbnail"/> : <img src={post.media_url} alt="Photo Reel thumbnail" loading="lazy"/>}<span><Video size={22} fill="currentColor"/></span></button> : <img className="profile-post-thumbnail-image" src={post.thumbnail_url || post.media_url} alt="Photo in post" loading="lazy" />)}{post.author_id === userId && <div className="profile-post-menu"><ContentActionMenu label="post" disabled={busy} onDelete={() => void deletePost(post)} /></div>}{post.caption && <p>{post.caption}</p>}</article>)}</div>}</>}</section>}
    </section>
    <nav className="mobile-nav">{[{name:"Home" as View,icon:Film,label:"Home"},{name:"Discover" as View,icon:Compass,label:"Discover"}].map(({name,icon:Icon,label})=><button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)}><Icon size={19}/><span>{label}</span></button>)}<button className="post-nav-button" onClick={() => setCreateOpen(true)} aria-label="Create a post" title="Create a post"><span className="post-nav-orbit"><Plus size={27}/></span><span>Post</span></button>{[{name:"Chats" as View,icon:MessageCircle,label:"Messages"},{name:"Profile" as View,icon:UserRound,label:"Profile"}].map(({name,icon:Icon,label})=><button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)}><Icon size={19}/><span>{label}</span>{name === "Chats" && unreadMessageCount > 0 && <i className="unread-count-badge">{unreadMessageCount > 99 ? "99+" : unreadMessageCount}</i>}</button>)}</nav>
    {partyCreateOpen && <div className="modal-backdrop" onClick={() => setPartyCreateOpen(false)}><section className="create-modal party-create-modal" role="dialog" aria-modal="true" aria-labelledby="party-create-title" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setPartyCreateOpen(false)} aria-label="Close party setup">×</button><span className="eyebrow">MAKE IT A MOMENT</span><h2 id="party-create-title">Create your <em>party.</em></h2><p>Set up your room details. Party creation is currently a design preview; it won&apos;t publish a live room yet.</p><form onSubmit={event => { event.preventDefault(); setPartyCreateOpen(false); setNotice("Party setup preview saved locally. Connect the party backend to publish a real room."); }}><label>Party name<input value={partyName} onChange={event => setPartyName(event.target.value)} maxLength={70} placeholder="e.g. Friday Night Hangout" required /></label><label>What’s the vibe?<textarea value={partyDescription} onChange={event => setPartyDescription(event.target.value)} maxLength={240} placeholder="Tell people what to expect…" /></label><div className="party-form-label">Choose a format</div><div className="party-format-options"><button type="button" className={partyFormat === "video" ? "selected" : ""} onClick={() => setPartyFormat("video")}><Video size={19}/><b>Video</b><small>Face-to-face hangout</small></button><button type="button" className={partyFormat === "audio" ? "selected" : ""} onClick={() => setPartyFormat("audio")}><Mic size={19}/><b>Audio</b><small>Talk it out</small></button><button type="button" className={partyFormat === "watch" ? "selected" : ""} onClick={() => setPartyFormat("watch")}><Film size={19}/><b>Watch</b><small>Watch together</small></button></div><div className="party-form-label">Who can join?</div><div className="party-access-options"><button type="button" className={partyAccess === "public" ? "selected" : ""} onClick={() => setPartyAccess("public")}><Users size={18}/><span><b>Public</b><small>Anyone can discover and join</small></span></button><button type="button" className={partyAccess === "private" ? "selected" : ""} onClick={() => setPartyAccess("private")}><LockKeyhole size={18}/><span><b>Private</b><small>Invite-only room</small></span></button></div><div className="modal-footer"><small>{partyName.length}/70</small><button className="create-button" type="submit" disabled={!partyName.trim()}>Preview party ↗</button></div></form></section></div>}
    {editProfileOpen && <div className="modal-backdrop" onClick={() => setEditProfileOpen(false)}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setEditProfileOpen(false)}>×</button><span className="eyebrow">MAKE IT YOURS</span><h2 id="edit-profile-title">Edit your <em>profile.</em></h2><form onSubmit={event => { event.preventDefault(); void saveProfile(); }}><label>Username<input value={usernameDraft} onChange={event => setUsernameDraft(event.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))} maxLength={24} minLength={3} required /><small>3–24 characters · letters, numbers, dots and underscores</small></label><label>Display name<input value={displayNameDraft} onChange={event => setDisplayNameDraft(event.target.value)} maxLength={60} required /></label><label>Bio<textarea value={bioDraft} onChange={event => setBioDraft(event.target.value)} maxLength={300} placeholder="A little about you…" /></label><div className="modal-footer"><small>{bioDraft.length}/300</small><button className="create-button" type="submit" disabled={profileSaving || !displayNameDraft.trim() || !usernameDraft.trim()}>{profileSaving ? "Saving…" : "Save profile ↗"}</button></div></form></section></div>}
    {createOpen && <div className="modal-backdrop" onClick={() => setCreateOpen(false)}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setCreateOpen(false)}>×</button><h2 id="create-title">Create a post</h2><label className="composer-field-label" htmlFor="post-caption">What’s on your mind?</label><textarea id="post-caption" value={caption} onChange={e => setCaption(e.target.value)} maxLength={2200} placeholder="Write something…" /><div className="composer-kind-switch" role="group" aria-label="Post type"><button type="button" className={postKind === "post" ? "selected" : ""} onClick={() => setPostKind("post")}>Post</button><button type="button" className={postKind === "reel" ? "selected" : ""} onClick={() => { setPostKind("reel"); setMediaFile(null); }}>Reel video</button></div><label className="media-upload-label"><span className="upload-plus">＋</span><span><b>{mediaFile ? mediaFile.name : postKind === "reel" ? "Choose a Reel video" : "Add photo or video"}</b><small>{postKind === "reel" ? "MP4, WebM or MOV · Up to 100 MB" : "Images up to 8 MB or videos up to 100 MB"}</small></span><input type="file" accept={postKind === "reel" && !selectedSound && !audioFile ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"} onChange={e => { const file = e.target.files?.[0] ?? null; if (!file) return; const isVideo = file.type.startsWith("video/"); const limit = isVideo ? 100 * 1024 * 1024 : 8 * 1024 * 1024; if (file.size > limit) { setNotice(isVideo ? "Choose a video smaller than 100 MB." : "Choose an image smaller than 8 MB."); e.target.value = ""; setMediaFile(null); return; } if (postKind === "reel" && !isVideo && !selectedSound && !audioFile) { setNotice("Choose a video file for a Reel, or select a sound to create a photo Reel."); e.target.value = ""; return; } setMediaFile(file); if (isVideo) setPostKind("reel"); }} /></label>{mediaFile && <div className="composer-image-preview">{mediaPreview && (mediaFile.type.startsWith("video/") ? <video src={mediaPreview} controls playsInline /> : <Image src={mediaPreview} alt="Selected post preview" width={640} height={480} unoptimized />)}<div><small>{mediaFile.name}</small><button type="button" onClick={() => setMediaFile(null)}>Remove media</button></div></div>}<label className="audio-upload-label"><span><b>{selectedSound ? "♫ " + selectedSound.title : audioFile ? "♫ " + audioFile.name : "Add reusable sound (optional)"}</b><small>MP3, WAV, AAC, OGG or audio WebM · up to 25 MB</small></span><input type="file" accept="audio/*" disabled={Boolean(selectedSound)} onChange={event => {const file=event.target.files?.[0] ?? null;if(file && !file.type.startsWith("audio/")){setNotice("Choose an audio file.");event.target.value="";return;}setAudioFile(file);if(file){setSelectedSound(null);setPostKind("reel");}}}/>{selectedSound && <button type="button" onClick={() => setSelectedSound(null)}>Remove sound</button>}</label><div className="modal-footer"><small>{caption.length}/2200</small><button className="create-button" disabled={busy || (!caption.trim() && !mediaFile)} onClick={publish}>{busy ? "Publishing…" : "Publish post"}</button></div></section></div>}
  </main>;
}