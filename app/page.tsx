"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Bell, Bookmark, CalendarClock, Check, CheckCheck, ChartNoAxesCombined, Compass, Eye, Film, Heart, LockKeyhole, Pause, Play, LogOut, MessageCircle, Mic, MoreHorizontal, Paperclip, Plus, Reply, Search, Send, Settings2, ShieldCheck, Smile, Sparkles, Users, UserRound, Video, Volume2, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PartyRoom from "@/components/party-room";
import VoiceNotePlayer from "@/components/voice-note-player";
import ReelAnalyticsPanel from "@/components/reel-analytics-panel";
import ReelAtmosphere from "@/components/reel-atmosphere";

function formatVideoTime(seconds: number) { if (!Number.isFinite(seconds) || seconds < 0) return "0:00"; const total = Math.floor(seconds); return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0"); }

function formatChatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysAgo = Math.round((startOfToday - startOfMessageDay) / 86400000);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo > 1 && daysAgo < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

type View = "Home" | "Reels" | "Discover" | "Parties" | "Chats" | "Profile" | "Sounds";
type PartyEntry = { id: string; host_id: string; title: string; description: string; format: "video" | "audio" | "watch"; access: "public" | "private"; status: "scheduled" | "live" | "ended"; scheduled_at: string; participant_count: number; created_at: string; thumbnail_url?: string | null; sticker_id?: string | null; hostName: string; hostUsername: string };
const partyStickerOptions = [
  { id: "cosmic", label: "Cosmic club", emoji: "🌌", colors: ["#312e81", "#c026d3"] },
  { id: "disco", label: "Disco fever", emoji: "🪩", colors: ["#be185d", "#7c3aed"] },
  { id: "sunset", label: "Golden hour", emoji: "🌅", colors: ["#f97316", "#db2777"] },
  { id: "chill", label: "Chill zone", emoji: "🧸", colors: ["#0f766e", "#38bdf8"] },
  { id: "movie", label: "Movie night", emoji: "🍿", colors: ["#1e293b", "#7c3aed"] },
  { id: "music", label: "Music energy", emoji: "🎧", colors: ["#4f46e5", "#06b6d4"] },
  { id: "gaming", label: "Game on", emoji: "🎮", colors: ["#166534", "#65a30d"] },
  { id: "hearts", label: "Love & friends", emoji: "💖", colors: ["#be123c", "#fb7185"] },
  { id: "party", label: "Confetti", emoji: "🎉", colors: ["#7c2d12", "#f59e0b"] },
  { id: "coffee", label: "Coffee chat", emoji: "☕", colors: ["#78350f", "#d97706"] },
  { id: "sports", label: "Game day", emoji: "🏆", colors: ["#1d4ed8", "#0f766e"] },
  { id: "creative", label: "Creative minds", emoji: "🎨", colors: ["#6d28d9", "#ec4899"] },
] as const;

type ZeeStory = { id: string; user_id: string; media_url: string; media_path?: string | null; media_type: "image" | "video"; caption: string | null; created_at: string; expires_at: string; authorName: string; username: string; avatarUrl: string | null };
type Post = { id: string; caption: string; created_at: string; author_id: string; post_type: string; media_url?: string | null; thumbnail_url?: string | null; media_path?: string | null; thumbnail_path?: string | null; sound_id?: string | null; is_reel?: boolean; atmosphere_location_enabled?: boolean | null; atmosphere_latitude?: number | null; atmosphere_longitude?: number | null; atmosphere_location_label?: string | null; };
type ZeeSound = { id: string; creator_id: string; title: string; audio_url: string; source_post_id?: string | null; created_at: string; };
type PostAuthor = { username: string; display_name: string; avatar_url?: string | null; };
type PostComment = { id: string; post_id: string; author_id: string; body: string; created_at: string; };
type ProfileSummary = { username: string; display_name: string; bio: string | null; avatar_url?: string | null; cover_url?: string | null; is_private?: boolean | null; };
type IncomingFollowRequest = { id: string; requester_id: string; created_at: string; username: string; display_name: string };
type ReelDraft = { id: string; user_id: string; caption: string; media_path: string; media_type: string; media_name: string; filter_name: string; zoom: number; crop_ratio: string; created_at: string; updated_at: string };
type LiveMessage = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; read_at?: string | null; reply_to_id?: string | null; attachment_path?: string | null; attachment_type?: string | null; attachment_name?: string | null; attachment_url?: string | null };
type ZeeNotification = { id: string; recipient_id: string; actor_id: string | null; kind: "message" | "follow" | "comment" | "like" | "caption_vote"; title: string; body: string; entity_id: string | null; source_id: string | null; created_at: string; read_at: string | null };
type ZeeNotificationPreferences = { messages: boolean; follows: boolean; comments: boolean; likes: boolean; community: boolean };
const DEFAULT_NOTIFICATION_PREFERENCES: ZeeNotificationPreferences = { messages: true, follows: true, comments: true, likes: true, community: true };
type InboxConversation = { id: string; otherUserId: string; username: string; displayName: string; avatarUrl: string | null; lastMessage: string; lastAt: string | null; unreadCount: number };
const sampleReels = [
  { user: "mira.moves", caption: "POV: the group chat finally makes it outside 😂✨", tags: "#goodvibes #weekendenergy", sound: "original audio · Mira", image: "photo-1533174072545-7a4b6ad7a6c3", likes: "24.8K", comments: "1,204", initial: "M" },
  { user: "jaycreates", caption: "When the beat drops and nobody is ready 🔥", tags: "#dancebreak #zeevibes", sound: "Late Night Bounce · DJ K", image: "photo-1501386761578-eac5c94b800a", likes: "18.2K", comments: "936", initial: "J" },
  { user: "tomi.laughs", caption: "Tag the friend who would absolutely do this 😭", tags: "#relatable #friendship", sound: "comedy loop · ZeeSounds", image: "photo-1527529482837-4698179dc6ce", likes: "31.6K", comments: "2,087", initial: "T" },
];
const nav: { name: View; icon: typeof Film }[] = [
  { name: "Home", icon: Film }, { name: "Reels", icon: Video }, { name: "Discover", icon: Compass }, { name: "Parties", icon: Users }, { name: "Chats", icon: MessageCircle }, { name: "Profile", icon: UserRound },
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

function localDateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function localDateTimeInput(date: Date) { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); }
export default function HomePage() {
  const [view, setView] = useState<View>("Home");


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
  const [partyThumbnailFile, setPartyThumbnailFile] = useState<File | null>(null);
  const [partyThumbnailPreview, setPartyThumbnailPreview] = useState<string | null>(null);
  const [partyStickerId, setPartyStickerId] = useState<string>("cosmic");
  const [partyFormat, setPartyFormat] = useState<"video" | "audio" | "watch">("video");
  const [partyAccess, setPartyAccess] = useState<"public" | "private">("public");
  const [partyScheduledAt, setPartyScheduledAt] = useState(() => localDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [partyEntries, setPartyEntries] = useState<PartyEntry[]>([]);
  const [partyJoinedIds, setPartyJoinedIds] = useState<string[]>([]);
  const [partyLoading, setPartyLoading] = useState(false);
  const [partySubmitting, setPartySubmitting] = useState(false);
  const [partyBusyIds, setPartyBusyIds] = useState<string[]>([]);
  const [partyFilter, setPartyFilter] = useState<"all" | "live" | "upcoming" | "mine">("all");
  const [activePartyRoom, setActivePartyRoom] = useState<PartyEntry | null>(null);
  const [partyProfileBrowsing, setPartyProfileBrowsing] = useState(false);
  const [caption, setCaption] = useState("");
  const [atmosphereLocationEnabled, setAtmosphereLocationEnabled] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [reelDrafts, setReelDrafts] = useState<ReelDraft[]>([]);
  const [reelDraftBusy, setReelDraftBusy] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedDraftPath, setSelectedDraftPath] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioStartSeconds, setAudioStartSeconds] = useState(0);
  const [musicVolume, setMusicVolume] = useState(70);
  const [originalVolume, setOriginalVolume] = useState(80);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const editorAudioRef = useRef<HTMLAudioElement | null>(null);
  const editorVideoRef = useRef<HTMLVideoElement | null>(null);
  const [sounds, setSounds] = useState<ZeeSound[]>([]);
  const [selectedSound, setSelectedSound] = useState<ZeeSound | null>(null);
  const [selectedSoundDetail, setSelectedSoundDetail] = useState<ZeeSound | null>(null);
  const [soundCreatorProfiles, setSoundCreatorProfiles] = useState<Record<string, { username: string; display_name: string; avatar_url?: string | null }>>({});
  const [postKind, setPostKind] = useState<"post" | "reel">("post");
  const [activeReelPostId, setActiveReelPostId] = useState<string | null>(null);
  const [reelFeedMode, setReelFeedMode] = useState<"for-you" | "following" | "fresh" | "saved">("for-you");
  const [reelDuration, setReelDuration] = useState(0);
  const [reelCurrentTime, setReelCurrentTime] = useState(0);
  const [reelControlsVisible, setReelControlsVisible] = useState(true);
  const [reelIsPlaying, setReelIsPlaying] = useState(true);
  const reelControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealReelControls = useCallback(() => {
    setReelControlsVisible(true);
    if (reelControlsTimer.current) clearTimeout(reelControlsTimer.current);
    reelControlsTimer.current = setTimeout(() => setReelControlsVisible(false), 2400);
  }, []);
  const [reelMuted, setReelMuted] = useState(true);
  const [reelLikeBurst, setReelLikeBurst] = useState(false);
  const [savedReelIds, setSavedReelIds] = useState<string[]>([]);
  const [saveReelBusyIds, setSaveReelBusyIds] = useState<string[]>([]);
  const [reelOptionsOpen, setReelOptionsOpen] = useState(false);
  const [reelAnalyticsOpen, setReelAnalyticsOpen] = useState(false);
  const [hiddenReelIds, setHiddenReelIds] = useState<string[]>([]);
  const reelVideoRef = useRef<HTMLVideoElement | null>(null);
  const reelPlaybackSessionRef = useRef<{ postId: string; startedAt: number; maxTime: number; duration: number } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [storyItems, setStoryItems] = useState<ZeeStory[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [storyUploading, setStoryUploading] = useState(false);
  const storyPickerRef = useRef<HTMLInputElement | null>(null);
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
  const [reelCommentStickerOpen, setReelCommentStickerOpen] = useState(false);
  const [commentBusyIds, setCommentBusyIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"posts" | "videos" | "likes">("posts");
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [usernameDraft, setUsernameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [privacyDraft, setPrivacyDraft] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [incomingFollowRequests, setIncomingFollowRequests] = useState<IncomingFollowRequest[]>([]);
  const [followRequestBusyId, setFollowRequestBusyId] = useState<string | null>(null);
  const [pendingFollowRequestUserIds, setPendingFollowRequestUserIds] = useState<string[]>([]);
  const [avatarUploadBusy, setAvatarUploadBusy] = useState(false);
  const [coverUploadBusy, setCoverUploadBusy] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [creatorFollowState, setCreatorFollowState] = useState<Record<string, boolean>>({});
  const [followBusy, setFollowBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ZeeNotification[]>([]);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState<ZeeNotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [notificationPreferencesSaving, setNotificationPreferencesSaving] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [activeChat, setActiveChat] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>([]);
  const [inboxSearch, setInboxSearch] = useState("");
  const [inboxFilter, setInboxFilter] = useState<"all" | "unread">("all");
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newMessageQuery, setNewMessageQuery] = useState("");
  const [newMessageResults, setNewMessageResults] = useState<(ProfileSummary & { user_id: string })[]>([]);
  const [newMessageSearchLoading, setNewMessageSearchLoading] = useState(false);
  const [discoverSearchOpen, setDiscoverSearchOpen] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverResults, setDiscoverResults] = useState<(ProfileSummary & { user_id: string })[]>([]);
  const [discoverSearchLoading, setDiscoverSearchLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatOpenRequestRef = useRef(0);
  const activeConversationRef = useRef<string | null>(null);
  const inboxLoadRequestRef = useRef(0);
  const [selectedCreator, setSelectedCreator] = useState<{username:string;initial:string;avatarUrl?:string|null;userId?:string}|null>(null);
  const [failedAvatarUrls, setFailedAvatarUrls] = useState<string[]>([]);
  const [selectedCreatorProfile, setSelectedCreatorProfile] = useState<(ProfileSummary & { user_id: string }) | null>(null);
  const [selectedCreatorPosts, setSelectedCreatorPosts] = useState<Post[]>([]);
  const [creatorProfileLoading, setCreatorProfileLoading] = useState(false);
  const [selectedCreatorFollowCounts, setSelectedCreatorFollowCounts] = useState({ followers: 0, following: 0 });
  const [chatDraft, setChatDraft] = useState("");
  const chatAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [chatAttachmentBusy, setChatAttachmentBusy] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<LiveMessage | null>(null);
  const [chatOptionsOpen, setChatOptionsOpen] = useState(false);
  const [chatReportOpen, setChatReportOpen] = useState(false);
  const [chatReportReason, setChatReportReason] = useState("spam");
  const [chatReportDetails, setChatReportDetails] = useState("");
  const [chatSafetyBusy, setChatSafetyBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [pendingUploadPost, setPendingUploadPost] = useState<{id:string;authorId:string;caption:string;previewUrl:string|null;mediaType:string;progress:number;label:string;createdAt:string}|null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const mediaPickerRef = useRef<HTMLInputElement | null>(null);
  const [editorFilter, setEditorFilter] = useState("none");
  const [editorZoom, setEditorZoom] = useState(1);
  const [editorRatio, setEditorRatio] = useState("original");
  const pendingOwnPost = pendingUploadPost && pendingUploadPost.authorId === userId ? pendingUploadPost : null;
  const ownProfilePosts = profileTab === "posts" ? posts.filter(post => post.author_id === userId) : profileTab === "videos" ? posts.filter(post => post.author_id === userId && ["video","reel"].includes(post.post_type)) : posts.filter(post => likedPostIds.includes(post.id));
  const pendingOwnPostVisible = Boolean(pendingOwnPost && (profileTab === "posts" || (profileTab === "videos" && pendingOwnPost.mediaType.startsWith("video/"))));
  const liveReels = posts.filter(post => (post.is_reel || post.post_type === "reel" || post.post_type === "video") && Boolean(post.media_url));
  const followedCreatorIds = new Set(Object.entries(creatorFollowState).filter(([, isFollowing]) => isFollowing).map(([username]) => username));
  const editorFilterCss = ({none:"none",warm:"saturate(1.12) sepia(.22)",mono:"grayscale(1) contrast(1.08)",vivid:"saturate(1.55) contrast(1.08)",cool:"saturate(1.08) hue-rotate(12deg)",fade:"contrast(.88) saturate(.82) brightness(1.08)"} as Record<string,string>)[editorFilter] || "none";
  function openPostComposer(openGallery = false) { setCreateOpen(true); if (openGallery) window.setTimeout(() => mediaPickerRef.current?.click(), 180); }
  const viewHistoryRef = useRef<View[]>(["Home"]);
  const currentViewRef = useRef<View>(view);
  useEffect(() => { currentViewRef.current = view; }, [view]);
  useEffect(() => {
    const url = window.location.pathname + window.location.search;
    window.history.replaceState({ zeechatApp: true, zeechatView: view }, "", url);
    const onBack = (event: PopStateEvent) => {
      if (createOpen) { setCreateOpen(false); window.history.pushState({zeechatApp:true,zeechatView:currentViewRef.current},"",url); return; }
      if (partyCreateOpen) { setPartyCreateOpen(false); window.history.pushState({zeechatApp:true,zeechatView:currentViewRef.current},"",url); return; }
      if (notificationsOpen) { setNotificationsOpen(false); window.history.pushState({zeechatApp:true,zeechatView:currentViewRef.current},"",url); return; }
      if (activeStoryId) { setActiveStoryId(null); window.history.pushState({zeechatApp:true,zeechatView:currentViewRef.current},"",url); return; }
      const validViews: View[] = ["Home","Reels","Discover","Parties","Chats","Profile"];
      const target = event.state?.zeechatView as View | undefined;
      const nextView = target && validViews.includes(target)
        ? target
        : (viewHistoryRef.current.length > 1 ? viewHistoryRef.current[viewHistoryRef.current.length - 2] : "Home");
      setView(nextView);
      const targetIndex = viewHistoryRef.current.lastIndexOf(nextView);
      if (targetIndex >= 0) viewHistoryRef.current = viewHistoryRef.current.slice(0, targetIndex + 1);
      else viewHistoryRef.current = [nextView];
      window.history.pushState({zeechatApp:true,zeechatView:nextView},"",url);
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, [createOpen,partyCreateOpen,notificationsOpen,activeStoryId]);
  useEffect(() => {
    if (viewHistoryRef.current[viewHistoryRef.current.length-1] !== view) viewHistoryRef.current.push(view);
    window.history.pushState({zeechatApp:true,zeechatView:view},"",window.location.pathname+window.location.search);
  }, [view]);
  useEffect(() => {
    if (view !== "Reels") {
      if (reelControlsTimer.current) clearTimeout(reelControlsTimer.current);
      setReelControlsVisible(true);
      return;
    }
    revealReelControls();
    return () => { if (reelControlsTimer.current) clearTimeout(reelControlsTimer.current); };
  }, [view, index, activeReelPostId, revealReelControls]);
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

  const loadParties = useCallback(async () => {
    if (!userId) { setPartyEntries([]); setPartyJoinedIds([]); setPartyLoading(false); return; }
    setPartyLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("zeechat_parties")
        .select("id,host_id,title,description,format,access,status,scheduled_at,participant_count,created_at,thumbnail_url,sticker_id")
        .or(`access.eq.public,host_id.eq.${userId}`).neq("status", "ended")
        .order("scheduled_at", { ascending: true }).limit(100);
      if (error) throw error;
      const rows = (data ?? []) as Omit<PartyEntry, "hostName" | "hostUsername">[];
      const hostIds = [...new Set(rows.map(party => party.host_id))];
      const { data: hosts, error: hostError } = hostIds.length
        ? await supabase.from("zeechat_profiles").select("user_id,username,display_name").in("user_id", hostIds)
        : { data: [], error: null };
      if (hostError) throw hostError;
      const hostMap = new Map((hosts ?? []).map(host => [host.user_id, host]));
      const { data: memberships, error: membershipError } = await supabase.from("zeechat_party_members").select("party_id").eq("user_id", userId);
      if (membershipError) throw membershipError;
      setPartyEntries(rows.map(party => {
        const host = hostMap.get(party.host_id);
        return { ...party, hostName: host?.display_name || "ZeeChat host", hostUsername: host?.username || "member" };
      }));
      setPartyJoinedIds((memberships ?? []).map(member => member.party_id));
    } catch (error) {
      setNotice(error instanceof Error ? "Parties couldn’t load: " + error.message : "Parties couldn’t load. Please try again.");
    } finally { setPartyLoading(false); }
  }, [userId]);

  useEffect(() => {
    if (view !== "Parties") return;
    void loadParties();
    let client: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    try {
      client = createClient();
      channel = client.channel("zeechat-parties-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "zeechat_parties" }, () => { void loadParties(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "zeechat_party_members" }, () => { void loadParties(); })
        .subscribe();
    } catch { /* Manual refresh remains available when realtime is unavailable. */ }
    return () => { if (channel && client) void client.removeChannel(channel); };
  }, [view, loadParties]);

  async function createParty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) { setNotice("Sign in to create a party."); return; }
    const title = partyName.trim();
    if (title.length < 3) { setNotice("Party names need at least 3 characters."); return; }
    const scheduled = new Date(partyScheduledAt);
    if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() < Date.now() - 60_000) { setNotice("Choose a future start time."); return; }
    if (partyThumbnailFile && (!partyThumbnailFile.type.startsWith("image/") || partyThumbnailFile.size > 8 * 1024 * 1024)) {
      setNotice("Choose an image under 8 MB for your party thumbnail.");
      return;
    }
    setPartySubmitting(true);
    let uploadedThumbnailPath: string | null = null;
    try {
      const supabase = createClient();
      let thumbnailUrl: string | null = null;
      if (partyThumbnailFile) {
        const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" } as Record<string, string>)[partyThumbnailFile.type];
        if (!extension) throw new Error("Choose a JPG, PNG, WebP, or GIF thumbnail.");
        uploadedThumbnailPath = userId + "/party-thumbnail-" + Date.now() + "." + extension;
        const { error: uploadError } = await supabase.storage.from("zeechat-media").upload(uploadedThumbnailPath, partyThumbnailFile, {
          contentType: partyThumbnailFile.type, cacheControl: "3600", upsert: false,
        });
        if (uploadError) throw new Error("Thumbnail upload failed: " + uploadError.message);
        thumbnailUrl = supabase.storage.from("zeechat-media").getPublicUrl(uploadedThumbnailPath).data.publicUrl;
      }
      const { data, error } = await supabase.from("zeechat_parties").insert({
        host_id: userId, title, description: partyDescription.trim(), format: partyFormat,
        access: partyAccess, scheduled_at: scheduled.toISOString(), status: "scheduled",
        thumbnail_url: thumbnailUrl, sticker_id: partyStickerId,
      }).select("id").single();
      if (error) throw error;
      if (partyAccess === "public") {
        const { error: memberError } = await supabase.from("zeechat_party_members").insert({ party_id: data.id, user_id: userId });
        if (memberError) console.warn("Party created, but host RSVP failed", memberError);
      }
      setPartyName(""); setPartyDescription(""); setPartyThumbnailFile(null); setPartyThumbnailPreview(null); setPartyStickerId("cosmic"); setPartyAccess("public");
      setPartyScheduledAt(localDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
      setPartyCreateOpen(false);
      await loadParties();
      setNotice("Your party is scheduled and published.");
    } catch (error) {
      if (uploadedThumbnailPath) {
        try { await createClient().storage.from("zeechat-media").remove([uploadedThumbnailPath]); } catch { /* Best-effort cleanup for failed party creation. */ }
      }
      setNotice(error instanceof Error ? "Could not create party: " + error.message : "Could not create your party. Please try again.");
    } finally { setPartySubmitting(false); }
  }

  async function togglePartyMembership(party: PartyEntry): Promise<boolean> {
    if (!userId) { setNotice("Sign in to join a party or RSVP."); return false; }
    if (party.host_id === userId) { setNotice("You’re hosting this party."); return false; }
    setPartyBusyIds(current => [...current, party.id]);
    try {
      const supabase = createClient();
      if (partyJoinedIds.includes(party.id)) {
        const { error } = await supabase.from("zeechat_party_members").delete().eq("party_id", party.id).eq("user_id", userId);
        if (error) throw error;
        setPartyJoinedIds(current => current.filter(id => id !== party.id));
        setPartyEntries(current => current.map(item => item.id === party.id ? { ...item, participant_count: Math.max(0, item.participant_count - 1) } : item));
        setNotice("You’ve left the guest list.");
      } else {
        const { error } = await supabase.from("zeechat_party_members").insert({ party_id: party.id, user_id: userId });
        if (error && error.code !== "23505") throw error;
        setPartyJoinedIds(current => current.includes(party.id) ? current : [...current, party.id]);
        setPartyEntries(current => current.map(item => item.id === party.id ? { ...item, participant_count: item.participant_count + (error ? 0 : 1) } : item));
        setNotice(party.status === "live" ? "You’re on the guest list. Enter the room to connect live." : "You’re going! Your RSVP is saved.");
      }
      return true;
    } catch (error) {
      const message = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
        ? error.message
        : error instanceof Error ? error.message : "Please try again.";
      console.error("Couldn’t update ZeeChat party RSVP", error);
      setNotice("Couldn’t update your RSVP: " + message);
      return false;
    } finally { setPartyBusyIds(current => current.filter(id => id !== party.id)); }
  }

  async function updatePartyStatus(party: PartyEntry, status: "live" | "ended"): Promise<boolean> {
    if (!userId || party.host_id !== userId) return false;
    setPartyBusyIds(current => [...current, party.id]);
    try {
      const { error } = await createClient().from("zeechat_parties").update({ status, updated_at: new Date().toISOString() }).eq("id", party.id).eq("host_id", userId);
      if (error) throw error;
      await loadParties();
      setNotice(status === "live" ? "Party is live. Guests can now enter the room." : "Party ended and removed from discovery.");
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? "Couldn’t update your party: " + error.message : "Couldn’t update your party.");
      return false;
    } finally { setPartyBusyIds(current => current.filter(id => id !== party.id)); }
  }

  const unreadConversationCount = inboxConversations.filter(item => item.unreadCount > 0).length;
  const filteredInboxConversations = inboxConversations.filter(item => (inboxFilter !== "unread" || item.unreadCount > 0) && `${item.displayName} ${item.username} ${item.lastMessage}`.toLowerCase().includes(inboxSearch.trim().toLowerCase()));
  const visibleReels = liveReels.filter(post => !hiddenReelIds.includes(post.id));
  const feedReels = (reelFeedMode === "saved" ? visibleReels.filter(post => savedReelIds.includes(post.id)).sort((a, b) => savedReelIds.indexOf(b.id) - savedReelIds.indexOf(a.id)) : reelFeedMode === "following" ? visibleReels.filter(post => followedCreatorIds.has(postAuthors[post.author_id]?.username || "")) : reelFeedMode === "fresh" ? [...visibleReels].sort((a, b) => b.created_at.localeCompare(a.created_at)) : [...visibleReels].sort((a, b) => { const score = (post: Post) => { const ageHours = Math.max(0, (Date.now() - new Date(post.created_at).getTime()) / 3600000); const engagement = (postLikeCounts[post.id] ?? 0) * 3 + (commentCounts[post.id] ?? 0) * 5 + Math.log1p(postViewCounts[post.id] ?? 0) * 2; return engagement + 12 * Math.exp(-ageHours / 72); }; return score(b) - score(a); }));
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

  useEffect(() => {
    let active = true;
    const loadStories = async () => {
      if (!userId) { setStoryItems([]); return; }
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("zeechat_stories")
          .select("id,user_id,media_url,media_path,media_type,caption,created_at,expires_at")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: true }).limit(100);
        if (error) throw error;
        const rawRows = (data ?? []) as { id: string; user_id: string; media_url: string; media_path?: string | null; media_type: "image" | "video"; caption: string | null; created_at: string; expires_at: string }[];
        const rows = (await Promise.all(rawRows.map(async story => {
          if (!story.media_path) return story; // Legacy Stories still use their existing public media URLs.
          const secondsRemaining = Math.min(86400, Math.floor((Date.parse(story.expires_at) - Date.now()) / 1000));
          if (secondsRemaining <= 0) return { ...story, media_url: "" };
          const { data: signed, error: signError } = await supabase.storage.from("zeechat-private-stories").createSignedUrl(story.media_path, secondsRemaining);
          return { ...story, media_url: signError ? "" : (signed?.signedUrl ?? "") };
        }))).filter(story => Boolean(story.media_url));
        const authorIds = [...new Set(rows.map(story => story.user_id))];
        const { data: authors, error: authorsError } = authorIds.length
          ? await supabase.from("zeechat_profiles").select("user_id,username,display_name,avatar_url").in("user_id", authorIds)
          : { data: [], error: null };
        if (authorsError) throw authorsError;
        const authorRows = (authors ?? []) as { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }[];
        const authorMap = new Map(authorRows.map(author => [author.user_id, author] as const));
        if (active) setStoryItems(rows.map(story => {
          const author = authorMap.get(story.user_id);
          return { ...story, authorName: author?.display_name || author?.username || "ZeeChat member", username: author?.username || "member", avatarUrl: author?.avatar_url || null };
        }));
      } catch (error) {
        if (active) {
          setStoryItems([]);
          console.warn("Stories could not load. Check that the ZeeChat stories migration has been applied.", error);
        }
      }
    };
    void loadStories();
    return () => { active = false; };
  }, [userId]);

  const selectedCreatorUsername = selectedCreator?.username;
  const activeStory = storyItems.find(story => story.id === activeStoryId) ?? null;
  const visibleNotifications = notifications.filter(item => notificationPreferences[item.kind === "message" ? "messages" : item.kind === "follow" ? "follows" : item.kind === "comment" ? "comments" : item.kind === "like" ? "likes" : "community"]);
  const storyGroups = storyItems.reduce((groups, story) => {
    const existing = groups.find(group => group.user_id === story.user_id);
    if (existing) existing.stories.push(story);
    else groups.push({ user_id: story.user_id, authorName: story.authorName, username: story.username, avatarUrl: story.avatarUrl, stories: [story] });
    return groups;
  }, [] as { user_id: string; authorName: string; username: string; avatarUrl: string | null; stories: ZeeStory[] }[]);

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
          .select("user_id,username,display_name,bio,avatar_url,cover_url,is_private")
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
          .select("id,caption,created_at,author_id,post_type,media_url,thumbnail_url,media_path,thumbnail_path,is_reel")
          .eq("author_id", creator.user_id).in("visibility", ["public", "followers"])
          .order("created_at", { ascending: false }).limit(60);
        if (postsError) throw postsError;
        const resolvedCreatorPosts = await resolvePostMedia((creatorPosts ?? []) as Post[]);
        if (active) setSelectedCreatorPosts(resolvedCreatorPosts);
        if (userId && creator.user_id !== userId) {
          const { data: follow } = await supabase.from("zeechat_follows").select("follower_id")
            .eq("follower_id", userId).eq("followed_id", creator.user_id).maybeSingle();
          if (active) setCreatorFollowState(state => ({ ...state, [creator.username]: Boolean(follow) }));
          if (active && !follow && creator.is_private) {
            const { data: request } = await supabase.from("zeechat_follow_requests").select("id,status").eq("requester_id", userId).eq("target_id", creator.user_id).eq("status", "pending").maybeSingle();
            if (active && request) setPendingFollowRequestUserIds(current => current.includes(creator.user_id) ? current : [...current, creator.user_id]);
          }
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
    if (!createOpen || !userId) return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await createClient().from("zeechat_reel_drafts").select("id,user_id,caption,media_path,media_type,media_name,filter_name,zoom,crop_ratio,created_at,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(10);
        if (error) throw error;
        if (active) setReelDrafts((data ?? []) as ReelDraft[]);
      } catch (error) { if (active) setNotice(error instanceof Error ? "Could not load Reel drafts: " + error.message : "Could not load Reel drafts."); }
    })();
    return () => { active = false; };
  }, [createOpen, userId]);

  useEffect(() => {
    if (!mediaFile) { setMediaPreview(null); return; }
    const url = URL.createObjectURL(mediaFile);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);
  useEffect(() => {
    if (!pendingUploadPost) return;
    setPendingUploadPost(current => current ? { ...current, progress: uploadProgress ?? current.progress, label: uploadLabel || current.label } : current);
  }, [uploadProgress, uploadLabel]);

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
    const target = event.target;
    if (target instanceof Element && target.closest("button,input,textarea,select,a,[role='slider'],.reel-comments-panel")) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
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
    // Require a deliberate vertical swipe; taps, horizontal drags and control gestures do not change the Reel.
    if (Math.abs(dy) >= 64 && Math.abs(dy) > Math.abs(dx) * 1.25) moveReel(dy < 0 ? 1 : -1);
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
          const { data: profileData } = await supabase.from("zeechat_profiles").select("username,display_name,bio,avatar_url,cover_url,is_private").eq("user_id", user.id).maybeSingle();
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
      supabase.from("zeechat_posts").select("id,caption,created_at,author_id,post_type,media_url,thumbnail_url,media_path,thumbnail_path,sound_id,is_reel,atmosphere_location_enabled,atmosphere_latitude,atmosphere_longitude,atmosphere_location_label").in("visibility", ["public", "followers"]).order("created_at", { ascending: false }).limit(200)
        .then(async ({ data, error }) => {
          if (!active) return;
          if (error) { setNotice("Connect Supabase to load live posts."); return; }
          const loadedPosts = await resolvePostMedia((data ?? []) as Post[]);
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
        void hydrateChatMessages([incoming]).then(([hydrated]) => {
          if (!active) return;
          setLiveMessages(current => current.some(message => message.id === hydrated.id)
            ? current
            : [...current.filter(message => !(message.id.startsWith("optimistic-") && message.sender_id === hydrated.sender_id && message.body === hydrated.body)), hydrated]
              .sort((a, b) => a.created_at.localeCompare(b.created_at)));
        });
        void loadInbox(userId);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "zeechat_messages",
        filter: "conversation_id=eq." + activeConversationId
      }, payload => {
        if (!active) return;
        const updated = payload.new as LiveMessage;
        if (!updated?.id || updated.conversation_id !== activeConversationId) return;
        setLiveMessages(current => current.map(message => message.id === updated.id
          ? { ...message, read_at: updated.read_at ?? message.read_at }
          : message));
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
      setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      setNotificationSettingsOpen(false);
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
    const loadNotificationPreferences = async () => {
      const { data, error } = await supabase.from("zeechat_notification_preferences")
        .select("messages,follows,comments,likes,community")
        .eq("user_id", userId).maybeSingle();
      if (!active) return;
      if (error) {
        console.error("Unable to load notification preferences", error);
        return;
      }
      if (data) setNotificationPreferences({
        messages: data.messages !== false,
        follows: data.follows !== false,
        comments: data.comments !== false,
        likes: data.likes !== false,
        community: data.community !== false,
      });
      else setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
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
    void loadNotificationPreferences();
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
        supabase.from("zeechat_profiles").select("user_id,username,display_name,bio,avatar_url,cover_url,is_private").ilike("username", pattern).limit(20),
        supabase.from("zeechat_profiles").select("user_id,username,display_name,bio,avatar_url,cover_url,is_private").ilike("display_name", pattern).limit(20)
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
    if (item.kind === "message") {
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
      const { data: messages, error: messageError } = await supabase.from("zeechat_messages").select("id,conversation_id,sender_id,body,created_at,read_at,reply_to_id,attachment_path,attachment_type,attachment_name").in("conversation_id", conversationIds).order("created_at", { ascending: false });
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

  async function hydrateChatMessages(rows: LiveMessage[]): Promise<LiveMessage[]> {
    const supabase = createClient();
    return Promise.all(rows.map(async message => {
      if (!message.attachment_path) return message;
      const { data, error } = await supabase.storage.from("zeechat-chat-media").createSignedUrl(message.attachment_path, 3600);
      return { ...message, attachment_url: error ? null : data?.signedUrl ?? null };
    }));
  }

  async function sendChatAttachment(file: File, targetConversationId?: string) {
    const conversationId = targetConversationId ?? activeConversationId;
    if (!userId || !conversationId) { setNotice("Open a conversation before attaching media."); return; }
    const allowed = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime","audio/webm","audio/mp4","audio/ogg","audio/mpeg","audio/wav","audio/aac"];
    if (!allowed.includes(file.type)) { setNotice("Choose a supported photo, video, or voice-note file."); return; }
    if (file.size > 50 * 1024 * 1024) { setNotice("Chat attachments must be 50 MB or smaller."); return; }
    const isAudio = file.type.startsWith("audio/");
    setChatAttachmentBusy(true); setNotice("");
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "attachment";
      const path = userId + "/" + conversationId + "/" + crypto.randomUUID() + "-" + safeName;
      const { error: uploadError } = await supabase.storage.from("zeechat-chat-media").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const body = isAudio ? "Voice note" : file.type.startsWith("video/") ? "Video" : "Photo";
      const { data, error } = await supabase.from("zeechat_messages").insert({ conversation_id: conversationId, sender_id: userId, body, attachment_path: path, attachment_type: file.type, attachment_name: file.name.slice(0, 255) }).select("id,conversation_id,sender_id,body,created_at,read_at,reply_to_id,attachment_path,attachment_type,attachment_name").single();
      if (error) { await supabase.storage.from("zeechat-chat-media").remove([path]); throw error; }
      const hydrated = (await hydrateChatMessages([data as LiveMessage]))[0];
      if (activeConversationRef.current === conversationId) setLiveMessages(current => [...current.filter(message => message.id !== hydrated.id), hydrated].sort((a,b) => a.created_at.localeCompare(b.created_at)));
      await loadInbox(userId);
    } catch (error) { setNotice(error instanceof Error ? "Attachment not sent: " + error.message : "Attachment not sent. Please try again."); }
    finally { setChatAttachmentBusy(false); if (chatAttachmentInputRef.current) chatAttachmentInputRef.current.value = ""; }
  }

  async function startVoiceRecording() {
    const recordingConversationId = activeConversationId;
    if (!userId || !recordingConversationId) { setNotice("Open a conversation before recording a voice note."); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setNotice("Voice recording is not supported by this browser. Try the latest Chrome browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      const preferredTypes = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];
      const mimeType = preferredTypes.find(type => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      voiceChunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size > 0) voiceChunksRef.current.push(event.data); };
      recorder.onerror = () => {
        stream.getTracks().forEach(track => track.stop());
        if (voiceStreamRef.current === stream) voiceStreamRef.current = null;
        voiceRecorderRef.current = null;
        setVoiceRecording(false);
        setNotice("Voice recording failed. Please try again.");
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (voiceStreamRef.current === stream) voiceStreamRef.current = null;
        if (voiceRecorderRef.current === recorder) voiceRecorderRef.current = null;
        const chunks = voiceChunksRef.current;
        voiceChunksRef.current = [];
        const actualType = (recorder.mimeType || chunks[0]?.type || "audio/webm").split(";")[0].toLowerCase();
        const extension = actualType === "audio/mp4" ? "m4a" : actualType === "audio/ogg" ? "ogg" : actualType === "audio/mpeg" ? "mp3" : actualType === "audio/wav" ? "wav" : "webm";
        const blob = new Blob(chunks, { type: actualType });
        if (!blob.size) { setNotice("No audio was captured. Please record again."); return; }
        void sendChatAttachment(new File([blob], "voice-note-" + Date.now() + "." + extension, { type: actualType }), recordingConversationId);
      };
      voiceRecorderRef.current = recorder;
      recorder.start();
      setVoiceRecording(true);
      setNotice("Recording voice note… tap the microphone again to finish.");
    } catch (error) {
      voiceStreamRef.current?.getTracks().forEach(track => track.stop());
      voiceStreamRef.current = null;
      voiceRecorderRef.current = null;
      setVoiceRecording(false);
      setNotice(error instanceof Error && error.name === "NotAllowedError" ? "Allow microphone access to record a voice note." : "Could not start recording. Check your microphone and try again.");
    }
  }

  function stopVoiceRecording() {
    const recorder = voiceRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else voiceStreamRef.current?.getTracks().forEach(track => track.stop());
    voiceRecorderRef.current = null;
    setVoiceRecording(false);
  }

  useEffect(() => () => {
    const recorder = voiceRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      // Navigating away should release the microphone without unexpectedly sending a partial recording.
      recorder.onstop = null;
      recorder.onerror = null;
      recorder.ondataavailable = null;
      try { recorder.stop(); } catch { /* The recorder may already have stopped. */ }
    }
    voiceStreamRef.current?.getTracks().forEach(track => track.stop());
    voiceStreamRef.current = null;
    voiceRecorderRef.current = null;
    voiceChunksRef.current = [];
  }, []);

  async function openExistingConversation(item: InboxConversation) {
    if (!userId) { setNotice("Sign in to view your messages."); return; }
    const requestId = ++chatOpenRequestRef.current;
    setChatLoading(true);
    setActiveChat(false);
    try {
      const supabase = createClient();
      const { data: messages, error } = await supabase.from("zeechat_messages")
        .select("id,conversation_id,sender_id,body,created_at,read_at,reply_to_id,attachment_path,attachment_type,attachment_name")
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
      setSelectedCreator({ username: item.username, initial: (item.displayName[0] || "Z").toUpperCase(), avatarUrl: item.avatarUrl, userId: item.otherUserId });
      activeConversationRef.current = item.id;
      setActiveConversationId(item.id);
      setLiveMessages(await hydrateChatMessages((messages ?? []) as LiveMessage[]));
      setChatDraft("");
      setReplyToMessage(null);
      setActiveChat(true);
      setView("Chats");
      setNotice("");
    } catch (error) {
      if (requestId === chatOpenRequestRef.current) setNotice(error instanceof Error ? "Could not open conversation: " + error.message : "Could not open this conversation. Try again.");
    } finally {
      if (requestId === chatOpenRequestRef.current) setChatLoading(false);
    }
  }

  async function searchNewMessagePeople() {
    const query = newMessageQuery.trim().replace(/[%,_]/g, "").slice(0, 60);
    if (!query) { setNewMessageResults([]); return; }
    if (!userId) { setNotice("Sign in to start a conversation."); return; }
    setNewMessageSearchLoading(true);
    try {
      const supabase = createClient();
      const pattern = "%" + query + "%";
      const [byUsername, byName] = await Promise.all([
        supabase.from("zeechat_profiles").select("user_id,username,display_name,bio,avatar_url,cover_url,is_private").ilike("username", pattern).neq("user_id", userId).limit(15),
        supabase.from("zeechat_profiles").select("user_id,username,display_name,bio,avatar_url,cover_url,is_private").ilike("display_name", pattern).neq("user_id", userId).limit(15),
      ]);
      if (byUsername.error) throw byUsername.error;
      if (byName.error) throw byName.error;
      const unique = new Map<string, ProfileSummary & { user_id: string }>();
      for (const person of [...(byUsername.data ?? []), ...(byName.data ?? [])]) unique.set(person.user_id, person as ProfileSummary & { user_id: string });
      setNewMessageResults([...unique.values()].sort((a, b) => a.display_name.localeCompare(b.display_name)).slice(0, 20));
    } catch (error) {
      setNewMessageResults([]);
      setNotice(error instanceof Error ? "People search failed: " + error.message : "People search failed. Please try again.");
    } finally { setNewMessageSearchLoading(false); }
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
      const { data: messages, error: messageError } = await supabase.from("zeechat_messages").select("id,conversation_id,sender_id,body,created_at,read_at,reply_to_id,attachment_path,attachment_type,attachment_name").eq("conversation_id",id).order("created_at",{ascending:true});
      if (messageError) throw messageError;
      const { data: targetProfile } = await supabase.from("zeechat_profiles").select("avatar_url").eq("user_id",targetUserId).maybeSingle();
      if (requestId !== chatOpenRequestRef.current) return;
      activeConversationRef.current = id;
      setActiveConversationId(id); setLiveMessages(await hydrateChatMessages((messages ?? []) as LiveMessage[])); setReplyToMessage(null); setSelectedCreator({username:targetUsername,initial:targetInitial,avatarUrl:targetProfile?.avatar_url ?? null,userId:targetUserId}); void loadCreatorFollowState(targetUsername); setActiveChat(true); setView("Chats"); setNotice("");
      await loadInbox(userId);
    } catch (error) { if (requestId === chatOpenRequestRef.current) setNotice(error instanceof Error ? error.message : "Could not open this conversation. Please try again."); } finally { if (requestId === chatOpenRequestRef.current) setChatLoading(false); }
  }

  async function blockChatUser() {
    if (!userId || !selectedCreator?.userId) { setNotice("Could not identify this account to block."); return; }
    if (selectedCreator.userId === userId) { setNotice("You cannot block your own account."); return; }
    setChatSafetyBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("zeechat_user_blocks").upsert(
        { blocker_id: userId, blocked_id: selectedCreator.userId },
        { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true }
      );
      if (error) throw error;
      const blockedName = selectedCreator.username;
      setChatOptionsOpen(false);
      setChatReportOpen(false);
      setActiveChat(false);
      setActiveConversationId(null);
      activeConversationRef.current = null;
      setLiveMessages([]);
      setReplyToMessage(null);
      setView("Chats");
      setNotice("You blocked @" + blockedName + ". New messages between you are now restricted.");
      void loadInbox(userId);
    } catch (error) {
      setNotice(error instanceof Error ? "Could not block this account: " + error.message : "Could not block this account.");
    } finally { setChatSafetyBusy(false); }
  }

  async function submitChatReport() {
    if (!userId || !selectedCreator?.userId) { setNotice("Could not identify this account to report."); return; }
    if (selectedCreator.userId === userId) { setNotice("You cannot report your own account."); return; }
    setChatSafetyBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("zeechat_user_reports").insert({
        reporter_id: userId,
        reported_user_id: selectedCreator.userId,
        reason: chatReportReason,
        details: chatReportDetails.trim().slice(0, 2000),
      });
      if (error) throw error;
      setChatReportOpen(false);
      setChatOptionsOpen(false);
      setChatReportDetails("");
      setNotice("Report submitted. Thank you for helping keep ZeeChat safe.");
    } catch (error) {
      setNotice(error instanceof Error ? "Could not submit report: " + error.message : "Could not submit your report.");
    } finally { setChatSafetyBusy(false); }
  }

  async function sendLiveMessage() {
    const body = chatDraft.trim();
    if (!body || !activeConversationId || !userId) return;
    const conversationId = activeConversationId;
    const replyToId = replyToMessage?.conversation_id === conversationId ? replyToMessage.id : null;
    const optimistic: LiveMessage = {
      id: "optimistic-" + crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: userId,
      body,
      created_at: new Date().toISOString(),
      reply_to_id: replyToId,
    };
    setLiveMessages(current => [...current, optimistic]);
    setChatDraft("");
    setReplyToMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("zeechat_messages")
        .insert({ conversation_id: conversationId, sender_id: userId, body, reply_to_id: replyToId })
        .select("id,conversation_id,sender_id,body,created_at,read_at,reply_to_id,attachment_path,attachment_type,attachment_name").single();
      if (error) throw error;
      if (activeConversationRef.current === conversationId) {
        setLiveMessages(current => current.map(message => message.id === optimistic.id ? data as LiveMessage : message));
      }
      await loadInbox(userId);
    } catch (error) {
      setLiveMessages(current => current.filter(message => message.id !== optimistic.id));
      if (activeConversationRef.current === conversationId) {
        setChatDraft(current => current || body);
        if (replyToId) setReplyToMessage(optimistic);
        setNotice(error instanceof Error ? `Message not sent: ${error.message}` : "Message not sent. Check your connection and try again.");
      }
    }
  }

  async function updateNotificationPreference<K extends keyof ZeeNotificationPreferences>(key: K, value: boolean) {
    if (!userId) { setNotice("Sign in to save notification preferences."); return; }
    const previous = notificationPreferences;
    const next = { ...previous, [key]: value };
    setNotificationPreferences(next);
    setNotificationPreferencesSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("zeechat_notification_preferences").upsert({
        user_id: userId, ...next, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (error) {
      setNotificationPreferences(previous);
      setNotice(error instanceof Error ? "Preferences were not saved: " + error.message : "Preferences were not saved. Try again.");
    } finally {
      setNotificationPreferencesSaving(false);
    }
  }

  async function openProfileEditor() {
    setDisplayNameDraft(profile?.display_name ?? "");
    setUsernameDraft(profile?.username ?? "");
    setBioDraft(profile?.bio ?? "");
    setPrivacyDraft(profile?.is_private === true);
    setEditProfileOpen(true);
    if (!userId) return;
    try {
      const supabase = createClient();
      const { data: requests, error } = await supabase.from("zeechat_follow_requests").select("id,requester_id,created_at").eq("target_id", userId).eq("status", "pending").order("created_at", { ascending: false });
      if (error) throw error;
      const rows = requests ?? [];
      const requesterIds = [...new Set(rows.map((row: {requester_id:string}) => row.requester_id))];
      const { data: profiles, error: profilesError } = requesterIds.length ? await supabase.from("zeechat_profiles").select("user_id,username,display_name").in("user_id", requesterIds) : { data: [], error: null };
      if (profilesError) throw profilesError;
      const byId = new Map((profiles ?? []).map((item: {user_id:string;username:string;display_name:string}) => [item.user_id, item]));
      setIncomingFollowRequests(rows.map((row: {id:string;requester_id:string;created_at:string}) => { const requester = byId.get(row.requester_id); return { ...row, username: requester?.username ?? "unknown", display_name: requester?.display_name ?? "ZeeChat user" }; }));
    } catch (error) { setNotice(error instanceof Error ? "Could not load follow requests: " + error.message : "Could not load follow requests."); }
  }

  async function respondToFollowRequest(requestId: string, approve: boolean) {
    if (!userId || followRequestBusyId) return;
    setFollowRequestBusyId(requestId);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("zeechat_respond_follow_request", { p_request_id: requestId, p_approve: approve });
      if (error) throw error;
      const handled = incomingFollowRequests.find(request => request.id === requestId);
      setIncomingFollowRequests(current => current.filter(request => request.id !== requestId));
      if (approve && handled) {
        setFollowCounts(current => ({ ...current, followers: current.followers + 1 }));
        setNotice("Approved @" + handled.username + " to follow you.");
      } else setNotice("Follow request declined.");
    } catch (error) { setNotice(error instanceof Error ? "Could not respond to request: " + error.message : "Could not respond to request."); }
    finally { setFollowRequestBusyId(null); }
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
      if (profile?.is_private !== privacyDraft) {
        const { error: privacyError } = await supabase.rpc("zeechat_set_account_privacy", { p_is_private: privacyDraft });
        if (privacyError) throw privacyError;
      }
      const { data, error } = await supabase.from("zeechat_profiles").update({ username, display_name: displayName, bio }).eq("user_id", userId).select("username,display_name,bio,avatar_url,cover_url,is_private").maybeSingle();
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
          await createClient().storage.from("zeechat-private-drafts").remove([uploadedPath]);
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
      const { data: creator, error: lookupError } = await supabase.from("zeechat_profiles").select("user_id,username,is_private").eq("username", username).maybeSingle();
      if (lookupError) throw lookupError;
      if (!creator) { setNotice("This creator is not linked to a ZeeChat account yet."); return; }
      if (creator.user_id === userId) { setNotice("You cannot follow your own profile."); return; }
      const { data: existing, error: followLookupError } = await supabase.from("zeechat_follows").select("follower_id").eq("follower_id", userId).eq("followed_id", creator.user_id).maybeSingle();
      if (followLookupError) throw followLookupError;

      const wasFollowing = Boolean(existing);
      if (!wasFollowing && creator.is_private) {
        const { data: existingRequest, error: requestLookupError } = await supabase.from("zeechat_follow_requests").select("id,status").eq("requester_id", userId).eq("target_id", creator.user_id).maybeSingle();
        if (requestLookupError) throw requestLookupError;
        if (existingRequest?.status === "pending") {
          const { error: cancelError } = await supabase.from("zeechat_follow_requests").delete().eq("id", existingRequest.id).eq("requester_id", userId).eq("status", "pending");
          if (cancelError) throw cancelError;
          setPendingFollowRequestUserIds(current => current.filter(id => id !== creator.user_id));
          setNotice("Follow request to @" + username + " cancelled.");
          return;
        }
        const { data: requestResult, error: requestError } = await supabase.rpc("zeechat_request_private_follow", { p_target_id: creator.user_id });
        if (requestError) throw requestError;
        if (requestResult === "following") {
          setCreatorFollowState(state => ({ ...state, [username]: true }));
          setPendingFollowRequestUserIds(current => current.filter(id => id !== creator.user_id));
          setNotice("You already follow @" + username + ".");
          return;
        }
        setPendingFollowRequestUserIds(current => current.includes(creator.user_id) ? current : [...current, creator.user_id]);
        setNotice("Follow request sent to @" + username + ".");
        return;
      }
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

  async function trackReelAnalyticsEvent(postId: string, eventType: "watch_session" | "completion" | "share" | "save", watchSeconds = 0, completionPct = 0) {
    if (!userId || posts.some(post => post.id === postId && post.author_id === userId)) return;
    try {
      await createClient().from("zeechat_reel_analytics_events").insert({
        post_id: postId,
        viewer_id: userId,
        event_type: eventType,
        watch_seconds: Math.max(0, Math.min(86400, Math.floor(watchSeconds))),
        completion_pct: Math.max(0, Math.min(100, Math.floor(completionPct))),
      });
    } catch { /* Analytics must never interrupt Reel playback or sharing. */ }
  }

  function finishReelWatchSession(completed = false) {
    const session = reelPlaybackSessionRef.current;
    if (!session) return;
    reelPlaybackSessionRef.current = null;
    const seconds = Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));
    const duration = Math.max(session.duration, reelDuration);
    const completionPct = duration > 0 ? Math.min(100, (session.maxTime / duration) * 100) : 0;
    void trackReelAnalyticsEvent(session.postId, "watch_session", seconds, completionPct);
    if (completed) void trackReelAnalyticsEvent(session.postId, "completion", seconds, 100);
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
      if (!wasSaved) void trackReelAnalyticsEvent(postId, "save");
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

  async function resolvePostMedia(rows: Post[]): Promise<Post[]> {
    const supabase = createClient();
    return Promise.all(rows.map(async post => {
      let mediaUrl = post.media_url ?? null;
      let thumbnailUrl = post.thumbnail_url ?? null;
      if (post.media_path) {
        const { data, error } = await supabase.storage.from("zeechat-private-posts").createSignedUrl(post.media_path, 3600);
        mediaUrl = error ? null : (data?.signedUrl ?? null);
      }
      if (post.thumbnail_path) {
        const { data, error } = await supabase.storage.from("zeechat-private-posts").createSignedUrl(post.thumbnail_path, 3600);
        thumbnailUrl = error ? null : (data?.signedUrl ?? null);
      }
      return { ...post, media_url: mediaUrl, thumbnail_url: thumbnailUrl };
    }));
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
      const privatePaths = [...new Set([post.media_path, post.thumbnail_path].filter((p): p is string => Boolean(p && p.startsWith(userId + "/"))))];
      const legacyPaths = [...new Set([storageObjectPath(post.media_url), storageObjectPath(post.thumbnail_url)].filter((p): p is string => Boolean(p && p.startsWith(userId + "/"))))];
      let mediaCleanupFailed = false;
      if (privatePaths.length) {
        const { error: storageError } = await supabase.storage.from("zeechat-private-posts").remove(privatePaths);
        if (storageError) { mediaCleanupFailed = true; console.warn("Post deleted, but private media files could not be removed", storageError); }
      }
      if (legacyPaths.length) {
        const { error: storageError } = await supabase.storage.from("zeechat-media").remove(legacyPaths);
        if (storageError) { mediaCleanupFailed = true; console.warn("Post deleted, but legacy media files could not be removed", storageError); }
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

  async function openSoundDetail(sound: ZeeSound) {
    setSelectedSoundDetail(sound);
    setView("Sounds");
    if (soundCreatorProfiles[sound.creator_id]) return;
    try {
      const { data, error } = await createClient().from("zeechat_profiles").select("user_id,username,display_name,avatar_url").eq("user_id", sound.creator_id).maybeSingle();
      if (error) throw error;
      if (data) setSoundCreatorProfiles(current => ({ ...current, [sound.creator_id]: { username: data.username, display_name: data.display_name, avatar_url: data.avatar_url } }));
    } catch (error) { console.warn("Could not load sound creator profile", error); }
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


  function uploadWithProgress(path: string, file: File | Blob, contentType: string, onProgress: (percent: number) => void, bucket = "zeechat-media"): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const supabase = createClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.access_token) throw new Error("Your session expired. Sign in again to upload.");
        const xhr = new XMLHttpRequest();
        xhr.open("POST", process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/" + bucket + "/" + path.split("/").map(encodeURIComponent).join("/"));
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

  async function prepareImageForPublish(file: File): Promise<File> {
    if (!file.type.startsWith("image/") || file.type === "image/gif" || (editorFilter === "none" && editorZoom === 1 && editorRatio === "original")) return file;
    return new Promise((resolve, reject) => {
      const image = new window.Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        try {
          const sw = image.naturalWidth, sh = image.naturalHeight;
          let ratio = sw / sh;
          if (editorRatio === "square") ratio = 1;
          if (editorRatio === "portrait") ratio = 4 / 5;
          if (editorRatio === "story") ratio = 9 / 16;
          let cw = sw, ch = sh;
          if (sw / sh > ratio) cw = sh * ratio; else ch = sw / ratio;
          cw /= editorZoom; ch /= editorZoom;
          const sx = (sw - cw) / 2, sy = (sh - ch) / 2;
          const ow = Math.max(1, Math.round(Math.min(1440, cw))), oh = Math.max(1, Math.round(ow / ratio));
          const canvas = document.createElement("canvas"); canvas.width = ow; canvas.height = oh;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Image editor is unavailable on this device.");
          const filters: Record<string,string> = {none:"none",warm:"saturate(1.12) sepia(.22)",mono:"grayscale(1) contrast(1.08)",vivid:"saturate(1.55) contrast(1.08)",cool:"saturate(1.08) hue-rotate(12deg)",fade:"contrast(.88) saturate(.82) brightness(1.08)"};
          ctx.filter = filters[editorFilter] || "none";
          ctx.drawImage(image, sx, sy, cw, ch, 0, 0, ow, oh);
          canvas.toBlob(blob => {
            URL.revokeObjectURL(url);
            if (!blob) { reject(new Error("Could not export your edited image.")); return; }
            resolve(new File([blob], (file.name.replace(/\.[^.]+$/, "") || "zeechat-photo") + "-edited.jpg", {type:"image/jpeg",lastModified:Date.now()}));
          }, "image/jpeg", .92);
        } catch (error) { URL.revokeObjectURL(url); reject(error); }
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not open this photo for editing.")); };
      image.src = url;
    });
  }

  async function handleStoryFile(file: File | null) {
    if (!file) return;
    if (!userId) { setNotice("Sign in to share a story."); return; }
    const isImage = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
    const isVideo = ["video/mp4", "video/webm", "video/quicktime", "video/ogg"].includes(file.type);
    if (!isImage && !isVideo) { setNotice("Choose a JPG, PNG, WebP, GIF, MP4, WebM, MOV or OGG file for your story."); return; }
    if (file.size > 30 * 1024 * 1024) { setNotice("Stories must be smaller than 30 MB."); return; }
    const extension = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
    const path = userId + "/story-" + crypto.randomUUID() + "." + extension.replace(/[^a-z0-9]/g, "");
    setStoryUploading(true);
    let uploaded = false;
    let insertedStoryId: string | null = null;
    try {
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from("zeechat-private-stories").upload(path, file, {
        contentType: file.type, cacheControl: "3600", upsert: false,
      });
      if (uploadError) throw new Error("Story upload failed: " + uploadError.message);
      uploaded = true;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from("zeechat_stories").insert({
        user_id: userId, media_url: "", media_path: path, media_type: isVideo ? "video" : "image",
        caption: "", expires_at: expiresAt,
      }).select("id,user_id,media_url,media_path,media_type,caption,created_at,expires_at").single();
      if (error) throw error;
      insertedStoryId = data.id;
      const { data: signed, error: signError } = await supabase.storage.from("zeechat-private-stories").createSignedUrl(path, 24 * 60 * 60);
      if (signError || !signed?.signedUrl) throw signError || new Error("Could not prepare private Story media.");
      const newStory: ZeeStory = {
        ...data, media_url: signed.signedUrl,
        authorName: profile?.display_name || profile?.username || "You",
        username: profile?.username || "you", avatarUrl: profile?.avatar_url || null,
      } as ZeeStory;
      setStoryItems(current => [...current.filter(story => story.id !== newStory.id), newStory]);
      setActiveStoryId(newStory.id);
      setNotice("Your Story is live for 24 hours.");
    } catch (error) {
      const supabase = createClient();
      if (insertedStoryId) { try { await supabase.from("zeechat_stories").delete().eq("id", insertedStoryId).eq("user_id", userId); } catch { /* Preserve the original error. */ } }
      if (uploaded) { try { await supabase.storage.from("zeechat-private-stories").remove([path]); } catch { /* Preserve the original error. */ } }
      setNotice(error instanceof Error ? error.message : "Could not publish your Story. Please try again.");
    } finally { setStoryUploading(false); }
  }

  async function saveReelDraft() {
    if (!userId) { setNotice("Sign in to save a Reel draft."); return; }
    if (reelDrafts.length >= 10 && !selectedDraftId) { setNotice("You have 10 saved drafts. Delete one before saving another."); return; }
    if (!mediaFile || !mediaFile.type.startsWith("video/")) { setNotice("Choose a video before saving a Reel draft."); return; }
    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowedTypes.includes(mediaFile.type)) { setNotice("Choose an MP4, WebM or MOV video."); return; }
    if (mediaFile.size > 100 * 1024 * 1024) { setNotice("Choose a video smaller than 100 MB."); return; }
    setReelDraftBusy(true);
    let uploadedPath: string | null = null;
    const previousDraft = selectedDraftId ? reelDrafts.find(draft => draft.id === selectedDraftId) : null;
    const previousPath = selectedDraftPath ?? previousDraft?.media_path ?? null;
    try {
      const supabase = createClient();
      const extension = mediaFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      uploadedPath = userId + "/drafts/" + crypto.randomUUID() + "." + extension;
      const { error: uploadError } = await supabase.storage.from("zeechat-private-drafts").upload(uploadedPath, mediaFile, { contentType: mediaFile.type, cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const draftValues = { user_id: userId, caption: caption.trim(), media_path: uploadedPath, media_type: mediaFile.type, media_name: mediaFile.name, filter_name: editorFilter, zoom: editorZoom, crop_ratio: editorRatio, updated_at: new Date().toISOString() };
      const draftFields = "id,user_id,caption,media_path,media_type,media_name,filter_name,zoom,crop_ratio,created_at,updated_at";
      let savedDraft: ReelDraft;
      if (selectedDraftId) {
        const { data, error } = await supabase.from("zeechat_reel_drafts").update(draftValues).eq("id", selectedDraftId).eq("user_id", userId).select(draftFields).single();
        if (error) throw error;
        savedDraft = data as ReelDraft;
      } else {
        const { data, error } = await supabase.from("zeechat_reel_drafts").insert(draftValues).select(draftFields).single();
        if (error) throw error;
        savedDraft = data as ReelDraft;
      }
      setReelDrafts(current => [savedDraft, ...current.filter(draft => draft.id !== savedDraft.id)].slice(0, 10));
      setSelectedDraftId(savedDraft.id); setSelectedDraftPath(uploadedPath);
      let cleanupWarning = false;
      if (previousPath && previousPath !== uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from("zeechat-private-drafts").remove([previousPath]);
        cleanupWarning = Boolean(cleanupError);
      }
      setNotice(cleanupWarning ? "Draft saved, but the previous video needs storage cleanup." : "Reel draft saved.");
    } catch (error) {
      if (uploadedPath) { try { await createClient().storage.from("zeechat-private-drafts").remove([uploadedPath]); } catch { /* Keep the original save error. */ } }
      setNotice(error instanceof Error ? "Could not save Reel draft: " + error.message : "Could not save Reel draft.");
    } finally { setReelDraftBusy(false); }
  }

  async function openReelDraft(draft: ReelDraft) {
    if (!userId || reelDraftBusy) return;
    setReelDraftBusy(true);
    try {
      const { data, error } = await createClient().storage.from("zeechat-private-drafts").download(draft.media_path);
      if (error || !data) throw error || new Error("The saved video could not be downloaded.");
      const file = new File([data], draft.media_name, { type: draft.media_type, lastModified: Date.now() });
      setMediaFile(file); setCaption(draft.caption); setPostKind("reel"); setEditorFilter(draft.filter_name); setEditorZoom(Number(draft.zoom)); setEditorRatio(draft.crop_ratio); setSelectedDraftId(draft.id); setSelectedDraftPath(draft.media_path);
      setNotice("Reel draft opened.");
    } catch (error) { setNotice(error instanceof Error ? "Could not open Reel draft: " + error.message : "Could not open Reel draft."); }
    finally { setReelDraftBusy(false); }
  }

  async function deleteReelDraft(draft: ReelDraft) {
    if (!userId || reelDraftBusy) return;
    setReelDraftBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("zeechat_reel_drafts").delete().eq("id", draft.id).eq("user_id", userId);
      if (error) throw error;
      const { error: storageError } = await supabase.storage.from("zeechat-private-drafts").remove([draft.media_path]);
      setReelDrafts(current => current.filter(item => item.id !== draft.id));
      if (selectedDraftId === draft.id) { setSelectedDraftId(null); setSelectedDraftPath(null); }
      setNotice(storageError ? "Draft deleted, but its stored video needs cleanup." : "Reel draft deleted.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not delete Reel draft."); }
    finally { setReelDraftBusy(false); }
  }

  useEffect(() => {
    if (!audioFile) { setAudioPreviewUrl(null); return; }
    const url = URL.createObjectURL(audioFile);
    setAudioPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  useEffect(() => {
    if (editorAudioRef.current) editorAudioRef.current.volume = musicVolume / 100;
  }, [musicVolume, audioPreviewUrl, selectedSound]);

  useEffect(() => {
    if (editorVideoRef.current) editorVideoRef.current.volume = originalVolume / 100;
  }, [originalVolume, mediaFile]);

  async function publish() {
    if ((selectedSound || audioFile) && (!mediaFile || !mediaFile.type.startsWith("video/"))) { setNotice("Choose a video for your sound Reel. Photos continue to publish to Home without added music."); return; }
    if (!caption.trim() && !mediaFile) return;
    if (!userId) { setNotice("Sign in first to publish a post."); return; }
    const pendingId = crypto.randomUUID();
    const pendingPreviewUrl = mediaFile ? URL.createObjectURL(mediaFile) : null;
    setPendingUploadPost({id:pendingId,authorId:userId,caption:caption.trim(),previewUrl:pendingPreviewUrl,mediaType:mediaFile?.type ?? "text/plain",progress:0,label:mediaFile?.type.startsWith("video/") ? "Preparing your Reel…" : "Uploading your post…",createdAt:new Date().toISOString()});
    setBusy(true);
    setUploadProgress(0);
    setUploadLabel(mediaFile?.type.startsWith("video/") ? "Preparing your Reel…" : "Uploading your post…");
    const supabase = createClient();
    const uploadedPaths: string[] = [];
    const uploadedPrivatePaths: string[] = [];
    let mediaPath: string | null = null;
    let storedThumbnailPath: string | null = null;
    let postInserted = false;
    try {
      let mediaForPublish = mediaFile;
      if (mediaFile?.type.startsWith("video/") && (selectedSound || audioFile)) {
        const mixerUrl = process.env.NEXT_PUBLIC_MEDIA_MIXER_URL?.replace(/\/$/, "");
        if (!mixerUrl) throw new Error("Sound mixing is not configured yet. The Reel mixer service must be deployed and NEXT_PUBLIC_MEDIA_MIXER_URL set before publishing Reels with music.");
        let audioBlob: Blob;
        if (audioFile) audioBlob = audioFile;
        else {
          const audioResponse = await fetch(selectedSound!.audio_url);
          if (!audioResponse.ok) throw new Error("Could not load the selected sound. Choose another sound and try again.");
          audioBlob = await audioResponse.blob();
        }
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) throw new Error("Please sign in again before mixing audio.");
        const form = new FormData();
        form.append("video", mediaFile, mediaFile.name);
        form.append("audio", audioBlob, audioFile?.name || "reused-sound.mp3");
        form.append("audioStartSeconds", String(audioStartSeconds));
        form.append("musicVolume", String(musicVolume / 100));
        form.append("originalVolume", String(originalVolume / 100));
        setUploadLabel("Mixing your Reel audio…");
        setUploadProgress(8);
        const mixResponse = await fetch(mixerUrl + "/v1/mix", { method: "POST", headers: { Authorization: "Bearer " + session.access_token }, body: form });
        if (!mixResponse.ok) {
          const reason = (await mixResponse.text().catch(() => "")).slice(0, 300);
          throw new Error("Could not mix Reel audio" + (reason ? ": " + reason : ".") + " Please try again.");
        }
        const mixedVideo = await mixResponse.blob();
        if (!mixedVideo.size || mixedVideo.size > 100 * 1024 * 1024) throw new Error("The mixed video is empty or exceeds the 100 MB upload limit.");
        const filename = mediaFile.name.replace(/\.[^.]+$/, "") + "-with-sound.mp4";
        mediaForPublish = new File([mixedVideo], filename, { type: "video/mp4", lastModified: Date.now() });
      }
      const uploadMedia = mediaForPublish ? await prepareImageForPublish(mediaForPublish) : null;
      let mediaUrl: string | null = null;
      let soundId: string | null = selectedSound?.id ?? null;
      let thumbnailUrl: string | null = null;
      let publishedType = "text";
      if (uploadMedia) {
        const isVideo = uploadMedia.type.startsWith("video/");
        const allowedTypes = isVideo ? ["video/mp4", "video/webm", "video/quicktime"] : ["image/jpeg", "image/png", "image/webp", "image/gif"];
        const maxBytes = isVideo ? 100 * 1024 * 1024 : 8 * 1024 * 1024;
        if (!allowedTypes.includes(uploadMedia.type)) throw new Error(isVideo ? "Choose an MP4, WebM or MOV video." : "Choose a JPEG, PNG, WebP or GIF image.");
        if (uploadMedia.size > maxBytes) throw new Error(isVideo ? "Choose a video smaller than 100 MB." : "Choose an image smaller than 8 MB.");
        const extension = uploadMedia.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
        const path = userId + "/" + crypto.randomUUID() + "." + extension;
        setUploadLabel(isVideo ? "Uploading video…" : "Uploading photo…");
        setUploadProgress(0);
        await uploadWithProgress(path, uploadMedia, uploadMedia.type, setUploadProgress, "zeechat-private-posts");
        uploadedPrivatePaths.push(path);
        mediaPath = path;
        mediaUrl = null;
        publishedType = isVideo ? "reel" : "image";
        if (isVideo) {
          const thumbnail = await createVideoThumbnail(uploadMedia);
          const thumbnailPath = userId + "/" + crypto.randomUUID() + ".jpg";
          setUploadLabel("Finishing Reel thumbnail…");
          await uploadWithProgress(thumbnailPath, thumbnail, "image/jpeg", () => {}, "zeechat-private-posts");
          uploadedPrivatePaths.push(thumbnailPath);
          storedThumbnailPath = thumbnailPath;
          thumbnailUrl = null;
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
      const makeReel = Boolean(mediaFile?.type.startsWith("video/"));
      if (makeReel && !mediaFile) throw new Error("Choose a photo or video for your sound Reel.");
      let atmosphereCoordinates: { latitude: number; longitude: number } | null = null;
      if (makeReel && atmosphereLocationEnabled) {
        if (!navigator.geolocation) throw new Error("This browser cannot share a post location. Turn off the Atmosphere location option or use a supported browser.");
        atmosphereCoordinates = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
            () => reject(new Error("Location permission was not granted. Your Reel was not published with Atmosphere location. Allow location access or turn the option off and try again.")),
            { maximumAge: 60000, timeout: 10000, enableHighAccuracy: false },
          );
        });
      }
      const { data: createdPost, error } = await supabase.from("zeechat_posts").insert({ author_id: userId, caption: caption.trim(), post_type: makeReel ? "reel" : publishedType, is_reel: makeReel, sound_id: soundId, media_url: mediaUrl, thumbnail_url: thumbnailUrl, media_path: mediaPath, thumbnail_path: storedThumbnailPath, visibility: profile?.is_private ? "followers" : "public", atmosphere_location_enabled: Boolean(makeReel && atmosphereCoordinates), atmosphere_latitude: atmosphereCoordinates?.latitude ?? null, atmosphere_longitude: atmosphereCoordinates?.longitude ?? null }).select("id").single();
      if (error) throw error;
      postInserted = true;
      if (soundId && audioFile) {
        const { error: sourceLinkError } = await supabase.from("zeechat_sounds").update({ source_post_id: createdPost.id }).eq("id", soundId).eq("creator_id", userId);
        if (sourceLinkError) console.warn("Reel published, but original sound attribution link could not be saved", sourceLinkError);
      }
      if (selectedDraftId) {
        try {
          const { error: draftDeleteError } = await supabase.from("zeechat_reel_drafts").delete().eq("id", selectedDraftId).eq("user_id", userId);
          if (!draftDeleteError && selectedDraftPath) await supabase.storage.from("zeechat-private-drafts").remove([selectedDraftPath]);
          setReelDrafts(current => current.filter(draft => draft.id !== selectedDraftId));
        } catch (draftCleanupError) { console.warn("Published Reel, but draft cleanup failed", draftCleanupError); }
      }
      setSelectedDraftId(null); setSelectedDraftPath(null);
      setUploadProgress(null); setUploadLabel("");
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
      setPendingUploadPost(current => current?.id === pendingId ? null : current);
      setCaption(""); setMediaFile(null); setAtmosphereLocationEnabled(false); setAudioFile(null); setSelectedSound(null); setAudioStartSeconds(0); setMusicVolume(70); setOriginalVolume(80); setPostKind("post"); setEditorFilter("none"); setEditorZoom(1); setEditorRatio("original"); setCreateOpen(false); setNotice(makeReel ? (soundId ? "Your Reel is live with mixed sound!" : "Your Reel is live!") : "Your post is live!");
      const { data, error: refreshError } = await supabase.from("zeechat_posts").select("id,caption,created_at,author_id,post_type,media_url,thumbnail_url,media_path,thumbnail_path,atmosphere_location_enabled,atmosphere_latitude,atmosphere_longitude,atmosphere_location_label").in("visibility", ["public", "followers"]).order("created_at", { ascending: false }).limit(10);
      if (refreshError) throw new Error("Your post was published, but Home could not refresh. Reload the page to see it.");
      const refreshedPosts = await resolvePostMedia((data ?? []) as Post[]);
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
      // Keep the owner on the page they chose while the post completes.
    } catch (error) {
      if (!postInserted && uploadedPaths.length) await supabase.storage.from("zeechat-media").remove(uploadedPaths).catch(() => undefined);
      if (!postInserted && uploadedPrivatePaths.length) await supabase.storage.from("zeechat-private-posts").remove(uploadedPrivatePaths).catch(() => undefined);
      setUploadProgress(null); setUploadLabel("");
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
      setPendingUploadPost(current => current?.id === pendingId ? null : current);
      setNotice(error instanceof Error ? error.message : "Could not publish. Check your connection and try again.");
    } finally { setBusy(false); }
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
      <div className="sidebar-bottom"><div className="sidebar-promo"><Sparkles size={18}/><b>Make a little magic.</b><p>Your next favourite memory starts with a hello.</p><button onClick={() => openPostComposer(true)}>Create something <Plus size={15}/></button></div>{userId && <button type="button" className="nav-link sign-out-button" onClick={async () => { try { const { error } = await createClient().auth.signOut(); if (error) throw error; setView("Home"); setNotice("You have been signed out."); } catch (error) { setNotice(error instanceof Error ? `Could not sign out: ${error.message}` : "Could not sign out. Please try again."); } }}><LogOut size={19}/><span>Sign out</span></button>}<small>© 2026 ZeeChat · Good vibes only</small></div>
    </aside>
    <section className="main-column">

      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {notificationsOpen && <section className="notification-center" aria-label="Notifications" aria-live="polite">
        <header className="notification-center-header"><div><span className="eyebrow">YOUR ACTIVITY</span><h2>{notificationSettingsOpen ? "Notification preferences" : "Notifications"}</h2><p>{notificationSettingsOpen ? "Choose which in-app alerts appear here." : visibleNotifications.filter(item => !item.read_at).length ? visibleNotifications.filter(item => !item.read_at).length + " unread" : "You’re all caught up"}</p></div><div className="notification-center-actions">{!notificationSettingsOpen && visibleNotifications.some(item => !item.read_at) && <button type="button" onClick={() => void markAllNotificationsRead()}>Mark all read</button>}<button type="button" className="notification-preferences-button" aria-label={notificationSettingsOpen ? "Back to notifications" : "Notification preferences"} title="Notification preferences" onClick={() => setNotificationSettingsOpen(value => !value)}><Settings2 size={17}/></button><button type="button" className="notification-close" aria-label="Close notifications" onClick={() => {setNotificationsOpen(false);setNotificationSettingsOpen(false);}}>×</button></div></header>
        {!userId ? <p className="notification-empty">Sign in to manage your notification preferences.</p> : notificationSettingsOpen ? <div className="notification-preferences-list">{([{key:"messages",title:"Messages",description:"New direct messages"},{key:"follows",title:"New followers",description:"When someone follows you"},{key:"comments",title:"Comments",description:"Comments on your posts and Reels"},{key:"likes",title:"Likes",description:"Likes and reactions to your content"},{key:"community",title:"Community activity",description:"Caption Battle votes and other community updates"}] as {key:keyof ZeeNotificationPreferences;title:string;description:string}[]).map(option=><label className="notification-preference-row" key={option.key}><span><b>{option.title}</b><small>{option.description}</small></span><input type="checkbox" checked={notificationPreferences[option.key]} disabled={notificationPreferencesSaving} onChange={event=>void updateNotificationPreference(option.key,event.target.checked)}/></label>)}<p className="notification-preferences-note">{notificationPreferencesSaving ? "Saving preferences…" : "These preferences sync to your account and apply to the in-app notification list."}</p></div> : visibleNotifications.length ? <div className="notification-list">{visibleNotifications.map(item => <button type="button" key={item.id} className={"notification-item " + (item.read_at ? "" : "is-unread")} onClick={() => void openNotification(item)}><span className={"notification-kind-icon notification-kind-" + item.kind}>{item.kind === "message" ? <MessageCircle size={18}/> : item.kind === "follow" ? <Users size={18}/> : item.kind === "comment" ? <MessageCircle size={18}/> : item.kind === "caption_vote" ? <Sparkles size={18}/> : <Heart size={18}/>}</span><span className="notification-item-copy"><b>{item.title}</b><span>{item.body}</span><small>{new Date(item.created_at).toLocaleString()}</small></span>{!item.read_at && <i className="notification-unread-dot" aria-label="Unread"/>}</button>)}</div> : <p className="notification-empty">{notifications.length ? "All notifications are hidden by your preferences. Open preferences to show more activity." : "No notifications yet. New messages, follows, comments, likes and Caption Battle votes will show up here."}</p>}
      </section>}
      {view === "Home" && <section className="home-feed-view"><div className="home-feed-heading"><div><span className="eyebrow">YOUR COMMUNITY</span><h1>Home <span className="home-heading-chevron">⌄</span></h1></div><div className="home-feed-actions"><button className="home-watch-reels" onClick={() => setView("Reels")}><Video size={16}/><span>Reels</span></button><button aria-label="Search" onClick={() => setView("Discover")}><Search size={19}/></button><button className="home-notification-button" aria-label={`Notifications${notifications.filter(item => !item.read_at).length ? `, ${notifications.filter(item => !item.read_at).length} unread` : ""}`} onClick={() => setNotificationsOpen(value => !value)}><Bell size={19}/>{notifications.some(item => !item.read_at) && <span className="notification-count-badge">{notifications.filter(item => !item.read_at).length > 99 ? "99+" : notifications.filter(item => !item.read_at).length}</span>}</button></div></div><div className="home-story-strip"><button className="home-story-add" disabled={storyUploading} onClick={() => storyPickerRef.current?.click()}><span>{storyUploading ? "…" : "＋"}</span><small>{storyUploading ? "Uploading" : "Your story"}</small></button><input ref={storyPickerRef} className="story-file-input" type="file" accept="image/*,video/*" onChange={event => { const file = event.target.files?.[0] ?? null; event.target.value = ""; void handleStoryFile(file); }} />{storyGroups.map((group,i)=><button key={group.user_id} className="home-story" onClick={() => setActiveStoryId(group.stories[0]?.id ?? null)} aria-label={"View " + group.authorName + " story"}><span className={"home-story-avatar tone-"+(i%6)}>{group.avatarUrl ? <Image src={group.avatarUrl} alt="" width={48} height={48} unoptimized/> : (group.authorName[0] || "Z").toUpperCase()}</span><small>{group.user_id === userId ? "You" : group.authorName.split(" ")[0]}</small></button>)}</div>{activeStory && <div className="story-viewer-backdrop" role="presentation" onClick={() => setActiveStoryId(null)}><section className="story-viewer" role="dialog" aria-modal="true" aria-label={activeStory.authorName + " story"} onClick={event => event.stopPropagation()}><div className="story-viewer-progress"><span /></div><header><div className="story-viewer-author"><span className="story-viewer-avatar">{activeStory.avatarUrl ? <Image src={activeStory.avatarUrl} alt="" width={36} height={36} unoptimized/> : activeStory.authorName[0]}</span><div><b>{activeStory.authorName}</b><small>{new Date(activeStory.created_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</small></div></div><button type="button" aria-label="Close story" onClick={() => setActiveStoryId(null)}>×</button></header><div className="story-viewer-media">{activeStory.media_type === "video" ? <video src={activeStory.media_url} controls autoPlay playsInline /> : <Image src={activeStory.media_url} alt={activeStory.caption || "Story"} fill unoptimized sizes="(max-width: 700px) 100vw, 420px" />}</div>{activeStory.caption && <p className="story-viewer-caption">{activeStory.caption}</p>}<footer><span>@{activeStory.username}</span><div><button type="button" disabled={storyItems.findIndex(story => story.id === activeStory.id) <= 0} onClick={() => setActiveStoryId(storyItems[storyItems.findIndex(story => story.id === activeStory.id)-1]?.id ?? activeStory.id)}>Previous</button><button type="button" disabled={storyItems.findIndex(story => story.id === activeStory.id) >= storyItems.length-1} onClick={() => setActiveStoryId(storyItems[storyItems.findIndex(story => story.id === activeStory.id)+1]?.id ?? activeStory.id)}>Next</button></div></footer></section></div>}<div className="daily-prompt-card"><div className="daily-prompt-topline"><span className="daily-prompt-icon"><Sparkles size={18}/></span><span className="eyebrow">TODAY&apos;S COMMUNITY PROMPT</span><span className="daily-prompt-refresh">A fresh prompt every day</span></div><h2>{getDailyCommunityPrompt()}</h2><p>Start a conversation, share your perspective, and give someone a reason to reply.</p><div className="daily-prompt-actions"><button className="daily-prompt-answer" onClick={() => { setCaption(`Today’s ZeeChat prompt: ${getDailyCommunityPrompt()}\n\nMy take: `); setPostKind("post"); setMediaFile(null); setCreateOpen(true); }}>Answer with a post <MessageCircle size={16}/></button><button className="daily-prompt-share" onClick={() => void shareDailyPrompt()}>Invite a friend <Send size={15}/></button></div></div><section className="live-feed"><div className="feed-heading"><div><span className="eyebrow">FROM THE COMMUNITY</span><h2>Fresh on ZeeChat</h2></div><span>{posts.length} posts</span></div>{posts.length ? posts.map(p => <article className="post-card" key={p.id} data-post-id={p.id}><div className="post-avatar">{postAuthors[p.author_id]?.avatar_url ? <img className="post-avatar-image" src={postAuthors[p.author_id].avatar_url!} alt="" /> : (postAuthors[p.author_id]?.display_name?.[0] || postAuthors[p.author_id]?.username?.[0] || "z").toUpperCase()}</div><div className="post-body"><b>{postAuthors[p.author_id]?.display_name || postAuthors[p.author_id]?.username || "ZeeChat member"} <span className="post-username">{postAuthors[p.author_id]?.username ? `@${postAuthors[p.author_id].username}` : ""}</span></b><div className="post-meta-row"><small>{new Date(p.created_at).toLocaleString()}</small>{p.author_id === userId && <ContentActionMenu label="post" disabled={busy} onDelete={() => void deletePost(p)} />}</div>{p.caption && <><p>{expandedCaptions.includes(p.id) || p.caption.length <= 240 ? p.caption : p.caption.slice(0, 240).trimEnd() + "…"}</p>{p.caption.length > 240 && <button type="button" className="post-caption-toggle" onClick={() => setExpandedCaptions(current => current.includes(p.id) ? current.filter(id => id !== p.id) : [...current, p.id])}>{expandedCaptions.includes(p.id) ? "Show less" : "Read more"}</button>}</>}{p.post_type === "reel" && p.media_url ? <button type="button" className="home-reel-thumbnail" onClick={() => { setActiveReelPostId(p.id); setView("Reels"); }} aria-label="Play Reel"><img className="community-post-image" src={p.thumbnail_url || p.media_url} alt="Reel thumbnail" loading="lazy" /><span className="home-reel-play"><Video size={25} fill="currentColor"/></span><small>PLAY REEL</small></button> : p.media_url && p.post_type !== "video" ? <img className="community-post-image" src={p.media_url} alt="Image shared in a ZeeChat post" loading="lazy" /> : null}<div className="post-actions"><button className={likedPostIds.includes(p.id) ? "post-like liked" : "post-like"} disabled={likeBusyIds.includes(p.id)} aria-label={likedPostIds.includes(p.id) ? "Unlike post" : "Like post"} onClick={() => togglePostLike(p.id)}><Heart size={16} fill={likedPostIds.includes(p.id) ? "currentColor" : "none"}/><span>{postLikeCounts[p.id] ?? 0}</span></button><button className="post-like" onClick={() => toggleComments(p.id)}><MessageCircle size={16}/><span>{commentCounts[p.id] ?? 0}</span><span>{openCommentPostIds.includes(p.id) ? "Hide comments" : "Comments"}</span></button><span className="post-view-count" aria-label={`${(postViewCounts[p.id] ?? 0).toLocaleString()} views`}><Eye size={16}/><span>{(postViewCounts[p.id] ?? 0).toLocaleString()}</span></span></div>{openCommentPostIds.includes(p.id) && <div className="comments-panel">{(commentsByPost[p.id] ?? []).map(comment => <div className="comment-row" key={comment.id}><span className="comment-avatar">z</span><div><small>{comment.author_id === userId ? "You" : "Community member"} · {new Date(comment.created_at).toLocaleString()}</small>{comment.author_id === userId && <ContentActionMenu label="comment" onDelete={() => void deleteComment(comment)} />}<p>{comment.body}</p></div></div>)}<form className="comment-form" onSubmit={event => { event.preventDefault(); void submitComment(p.id); }}><input aria-label="Write a comment" maxLength={1000} value={commentDrafts[p.id] ?? ""} onChange={event => setCommentDrafts(current => ({ ...current, [p.id]: event.target.value }))} placeholder="Add a kind comment…" /><button disabled={commentBusyIds.includes(p.id) || !(commentDrafts[p.id] ?? "").trim()} type="submit">{commentBusyIds.includes(p.id) ? "Posting…" : "Send"}</button></form></div>}</div></article>) : <p className="muted">No community posts yet. Be the first to share something.</p>}</section></section>}
      {view === "Reels" && <section className="reels-view immersive-reels">
        {reelFeedMode === "saved" && !selectedLiveReel ? <div className="saved-reels-empty"><div className="immersive-brand"><span className="immersive-brand-mark">z</span><span>Zee<b>Chat</b></span></div><div className="saved-reels-empty-icon"><Bookmark size={34}/></div><h2>Your Reel library</h2><p>Save standout Reels and come back whenever you want. Your collection is private to your account.</p><button type="button" onClick={() => {setReelFeedMode("for-you");setActiveReelPostId(null);}}>Explore For You</button></div> : <><div className="reel-layout"><div key={reel.postId || reel.user} className="reel-player reel-enter" data-reel-index={index} onPointerDown={revealReelControls} onPointerMove={() => { if (reelControlsTimer.current) { clearTimeout(reelControlsTimer.current); reelControlsTimer.current = setTimeout(() => setReelControlsVisible(false), 2400); } }} onTouchStart={event => { revealReelControls(); handleReelTouchStart(event); }} onTouchEnd={handleReelTouchEnd} onWheel={event => { if (Math.abs(event.deltaY) < 18) return; const now = Date.now(); if (now - lastWheelAt.current < 520) return; lastWheelAt.current = now; moveReel(event.deltaY > 0 ? 1 : -1); }} onKeyDown={event => { if (event.key === "ArrowDown") moveReel(1); if (event.key === "ArrowUp") moveReel(-1); }} tabIndex={0} aria-label="Reel viewer. Swipe up or down to change videos." style={!reel.mediaUrl ? { backgroundImage: `linear-gradient(0deg,#08070ddf,transparent 55%,#08070d55),url(https://images.unsplash.com/${reel.image}?auto=format&fit=crop&w=1000&q=85)` } : undefined}>{reel.mediaUrl && <>{selectedLiveReel?.media_url && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(selectedLiveReel.media_url) ? <img className="live-reel-video" src={reel.mediaUrl} alt={reel.caption || "Photo Reel"} onDoubleClick={event => { event.stopPropagation(); handleReelDoubleTap(); }} /> : <video ref={reelVideoRef} key={reel.postId || reel.mediaUrl} className="live-reel-video" src={reel.mediaUrl} autoPlay playsInline muted={reelMuted} preload="metadata" poster={selectedLiveReel?.thumbnail_url || undefined} onPlay={() => { setReelIsPlaying(true); const postId = selectedLiveReel?.id; if (!postId || !userId) return; if (reelPlaybackSessionRef.current && reelPlaybackSessionRef.current.postId !== postId) finishReelWatchSession(); if (!reelPlaybackSessionRef.current) reelPlaybackSessionRef.current = { postId, startedAt: Date.now(), maxTime: reelVideoRef.current?.currentTime || 0, duration: reelVideoRef.current?.duration || 0 }; }} onPause={() => { setReelIsPlaying(false); finishReelWatchSession(); }} onEnded={() => { finishReelWatchSession(true); moveReel(1); }} onDoubleClick={event => { event.stopPropagation(); handleReelDoubleTap(); }} onLoadedMetadata={event => { setReelDuration(event.currentTarget.duration || 0); setReelCurrentTime(event.currentTarget.currentTime || 0); }} onTimeUpdate={event => { const video = event.currentTarget; setReelCurrentTime(video.currentTime || 0); const session = reelPlaybackSessionRef.current; if (session && selectedLiveReel?.id === session.postId) { session.maxTime = Math.max(session.maxTime, video.currentTime || 0); session.duration = video.duration || session.duration; } }} onDurationChange={event => setReelDuration(event.currentTarget.duration || 0)} onError={() => setNotice("This video could not be loaded. Check the video file or try again.")} onClick={event => { event.stopPropagation(); const video = event.currentTarget; if (video.paused) void video.play().catch(() => setNotice("Tap the video to start playback.")); else video.pause(); }} />} {reel.mediaUrl && !(selectedLiveReel?.media_url && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(selectedLiveReel.media_url)) && <button type="button" className={`reel-center-playback ${reelControlsVisible ? "controls-visible" : "controls-hidden"}`} aria-label={reelIsPlaying ? "Pause Reel" : "Play Reel"} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); revealReelControls(); const video = reelVideoRef.current; if (!video) return; if (video.paused) void video.play().catch(() => setNotice("Tap the video to start playback.")); else video.pause(); }}>{reelIsPlaying ? <Pause size={27} strokeWidth={1.8} fill="currentColor" /> : <Play size={27} strokeWidth={1.8} fill="currentColor" />}</button>} <div className={`reel-video-controls ${reelControlsVisible ? "controls-visible" : "controls-hidden"}`} onClick={event => event.stopPropagation()} onPointerDown={revealReelControls} onPointerMove={revealReelControls}><div className="reel-scrubber-row"><span>{formatVideoTime(reelCurrentTime)}</span><input aria-label="Seek through Reel" className="reel-scrubber" type="range" min={0} max={Math.max(reelDuration, 0.1)} step="0.1" value={Math.min(reelCurrentTime, reelDuration || 0)} style={{"--reel-progress": (reelDuration ? reelCurrentTime / reelDuration * 100 : 0) + "%"} as React.CSSProperties} onChange={event => { revealReelControls(); const time = Number(event.target.value); setReelCurrentTime(time); if (reelVideoRef.current) reelVideoRef.current.currentTime = time; }} /><span>{formatVideoTime(reelDuration)}</span></div></div></>}{selectedLiveReel?.sound_id && sounds.find(sound => sound.id === selectedLiveReel.sound_id) && <audio className="reel-sound-audio" src={sounds.find(sound => sound.id === selectedLiveReel.sound_id)?.audio_url} autoPlay loop muted={reelMuted} />}
          <ReelAtmosphere enabled={true} userId={userId} creatorLatitude={selectedLiveReel?.atmosphere_location_enabled ? selectedLiveReel.atmosphere_latitude : null} creatorLongitude={selectedLiveReel?.atmosphere_location_enabled ? selectedLiveReel.atmosphere_longitude : null} />
          {reelLikeBurst && <div className="reel-like-burst" aria-hidden="true"><Heart size={76} fill="currentColor"/></div>}
          <div className="immersive-reel-header"><div className="immersive-brand"><span className="immersive-brand-mark">z</span><span>Zee<b>Chat</b></span></div><div className="reel-feed-tabs" role="group" aria-label="Reel feed"><button className={reelFeedMode === "following" ? "selected" : ""} aria-pressed={reelFeedMode === "following"} onClick={() => {setReelFeedMode("following");setIndex(0);setActiveReelPostId(null);}}>Following</button><button className={reelFeedMode === "for-you" ? "selected" : ""} aria-pressed={reelFeedMode === "for-you"} onClick={() => {setReelFeedMode("for-you");setIndex(0);setActiveReelPostId(null);}}>For You</button><button className={reelFeedMode === "fresh" ? "selected" : ""} aria-pressed={reelFeedMode === "fresh"} onClick={() => {setReelFeedMode("fresh");setIndex(0);setActiveReelPostId(null);}}>Fresh</button><button className={reelFeedMode === "saved" ? "selected" : ""} aria-pressed={reelFeedMode === "saved"} onClick={() => { if (!userId) { setNotice("Sign in to view your saved Reels."); return; } setReelFeedMode("saved");setIndex(0);setActiveReelPostId(null); }}>Saved</button></div><button className="immersive-search" aria-label="Search ZeeChat" onClick={() => setView("Discover")}><Search size={21}/></button></div><button type="button" className={`sound-button ${reelMuted ? "sound-disc-muted" : "sound-disc-playing"}`} aria-label={reelMuted ? "Unmute Reel" : "Mute Reel"} aria-pressed={!reelMuted} title={reelMuted ? "Turn sound on" : "Mute sound"} onClick={() => setReelMuted(value => !value)}><span className="sound-vinyl" aria-hidden="true"><span className="sound-vinyl-label">♫</span><span className="sound-vinyl-state">{reelMuted ? "×" : "♪"}</span></span></button>
          <div className="reel-caption"><div className="creator-row"><div className="creator-name-line"><b>@{reel.user}</b><ShieldCheck size={13} aria-label="Creator badge"/></div><small>Creator · 2h ago</small></div><div className={"reel-caption-heading" + (expandedCaptions.includes(reel.postId || reel.user) ? " caption-expanded" : "")}><p>{reel.caption}</p></div>{reel.caption.length > 100 && <button type="button" className="reel-caption-toggle" onClick={() => setExpandedCaptions(current => current.includes(reel.postId || reel.user) ? current.filter(id => id !== (reel.postId || reel.user)) : [...current, reel.postId || reel.user])}>{expandedCaptions.includes(reel.postId || reel.user) ? "Show less" : "Read more"}</button>}<strong>{reel.tags}</strong><button type="button" className="sound-line sound-line-button" onClick={() => { const sound = sounds.find(item => item.id === selectedLiveReel?.sound_id); if (sound) void openSoundDetail(sound); else { setSelectedSoundDetail(null); setView("Sounds"); } }}><span className={`reel-sound-disc ${reelMuted ? "paused" : "spinning"}`} aria-hidden="true"><span>♫</span></span><span className="reel-sound-title">{sounds.find(sound => sound.id === selectedLiveReel?.sound_id)?.title || reel.sound}</span><span className="reel-sound-cta">{selectedLiveReel?.sound_id ? "Use sound ↗" : "Explore sounds ↗"}</span></button></div>
        </div><div className="reel-actions"><div className="reel-creator-action"><button type="button" className="creator-avatar creator-profile-trigger" aria-label={`View @${reel.user} profile`} onClick={() => {setSelectedCreator({username:reel.user,initial:reel.initial});setView("Profile");}}>{reel.initial}</button><button type="button" className="rail-follow-button" aria-label={selectedLiveReel ? (creatorFollowState[reel.user] ? "Unfollow creator" : (selectedLiveReel.author_id !== userId && pendingFollowRequestUserIds.some(id => id === selectedLiveReel.author_id) ? "Cancel follow request" : "Follow creator")) : (following.includes(index) ? "Unfollow creator" : "Follow creator")} aria-pressed={selectedLiveReel ? Boolean(creatorFollowState[reel.user]) : following.includes(index)} disabled={selectedLiveReel ? (followBusy || selectedLiveReel.author_id === userId) : false} onClick={() => { if (selectedLiveReel) void toggleCreatorFollow(reel.user); else setFollowing(a => a.includes(index) ? a.filter(x => x !== index) : [...a, index]); }}>{selectedLiveReel ? (creatorFollowState[reel.user] ? "✓" : "+") : (following.includes(index) ? "✓" : "+")}</button></div><button onClick={() => { if (selectedLiveReel) void togglePostLike(selectedLiveReel.id); else setLiked(a => a.includes(index) ? a.filter(x => x !== index) : [...a, index]); }} className={((selectedLiveReel ? likedPostIds.includes(selectedLiveReel.id) : liked.includes(index)) ? "liked" : "") + " reel-reaction-button"} aria-label="Like reel"><span className="action-circle"><Heart size={22} fill={(selectedLiveReel ? likedPostIds.includes(selectedLiveReel.id) : liked.includes(index)) ? "currentColor" : "none"}/></span><b>{selectedLiveReel ? (postLikeCounts[selectedLiveReel.id] ?? 0) : (liked.includes(index) ? "24.9K" : reel.likes)}</b></button><button onClick={() => { if (selectedLiveReel) void toggleComments(selectedLiveReel.id); else setNotice("Comments are available on published community Reels."); }} aria-label="View comments"><span className="action-circle"><MessageCircle size={22}/></span><b>{selectedLiveReel ? (commentCounts[selectedLiveReel.id] ?? 0) : reel.comments}</b></button><button type="button" className={selectedLiveReel && savedReelIds.includes(selectedLiveReel.id) ? "saved-reel-action saved" : "saved-reel-action"} aria-label={selectedLiveReel && savedReelIds.includes(selectedLiveReel.id) ? "Remove saved Reel" : "Save Reel"} aria-pressed={Boolean(selectedLiveReel && savedReelIds.includes(selectedLiveReel.id))} disabled={!selectedLiveReel || saveReelBusyIds.includes(selectedLiveReel.id)} onClick={() => { if (selectedLiveReel) void toggleSavedReel(selectedLiveReel.id); }}><span className="action-circle"><Bookmark size={20} fill={selectedLiveReel && savedReelIds.includes(selectedLiveReel.id) ? "currentColor" : "none"}/></span><b>{selectedLiveReel && savedReelIds.includes(selectedLiveReel.id) ? "Saved" : "Save"}</b></button><div className="reel-view-count" aria-label={`${selectedLiveReel ? (postViewCounts[selectedLiveReel.id] ?? 0) : 0} views`}><span className="action-circle"><Eye size={21}/></span><b>{selectedLiveReel ? (postViewCounts[selectedLiveReel.id] ?? 0).toLocaleString() : "0"}</b><small>Views</small></div><button onClick={async () => { const shareUrl = selectedLiveReel ? `${window.location.origin}/?reel=${selectedLiveReel.id}` : window.location.href; try { if (navigator.share) { await navigator.share({ title: "ZeeChat Reel", text: reel.caption, url: shareUrl }); if (selectedLiveReel) await trackReelAnalyticsEvent(selectedLiveReel.id, "share"); } else { await navigator.clipboard.writeText(shareUrl); if (selectedLiveReel) await trackReelAnalyticsEvent(selectedLiveReel.id, "share"); setNotice("Reel link copied to clipboard."); } } catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setNotice("Could not share this Reel on this device."); } }} aria-label="Share reel"><span className="action-circle"><Send size={20}/></span><b>Share</b></button><button type="button" onClick={() => setReelOptionsOpen(true)} aria-label="Reel options" aria-haspopup="dialog"><span className="action-circle"><MoreHorizontal size={21}/></span><b>Options</b></button></div></div>

        {selectedLiveReel && userId && selectedLiveReel.author_id === userId && <section className="reel-creator-performance" aria-label="Your Reel performance"><header><div><span>CREATOR STUDIO</span><b>Reel performance</b></div><small><span className="creator-live-dot"/> Live stats</small></header><div className="reel-performance-metrics"><div><b>{(postViewCounts[selectedLiveReel.id] ?? 0).toLocaleString()}</b><span>Views</span></div><div><b>{(postLikeCounts[selectedLiveReel.id] ?? 0).toLocaleString()}</b><span>Likes</span></div><div><b>{(commentCounts[selectedLiveReel.id] ?? 0).toLocaleString()}</b><span>Comments</span></div><div><b>{(Math.round((((postLikeCounts[selectedLiveReel.id] ?? 0) + (commentCounts[selectedLiveReel.id] ?? 0)) / Math.max(postViewCounts[selectedLiveReel.id] ?? 0, 1)) * 1000) / 10).toFixed(1)}%</b><span>Engagement</span></div></div><p>Keep the conversation going: reply to comments and share another Reel when your audience is active.</p></section>}
        <div className="reel-creator-nudge"><div className="reel-creator-nudge-mark"><Sparkles size={18}/></div><div className="reel-creator-nudge-copy"><b>Your next Reel could start a conversation.</b><span>Share a moment, use a sound, and give people something worth responding to.</span></div><button type="button" onClick={() => { if (!userId) { setNotice("Sign in to publish your own Reel."); return; } setPostKind("reel"); setMediaFile(null); setAudioFile(null); setSelectedSound(null); setCreateOpen(true); }}>Create a Reel <Plus size={15}/></button></div>
        {reelOptionsOpen && <div className="reel-options-backdrop" role="presentation" onClick={() => setReelOptionsOpen(false)}><section className="reel-options-sheet" role="dialog" aria-modal="true" aria-labelledby="reel-options-title" onClick={event => event.stopPropagation()}><header><div><span className="eyebrow">REEL CONTROLS</span><h2 id="reel-options-title">Options</h2></div><button type="button" className="reel-options-close" aria-label="Close options" onClick={() => setReelOptionsOpen(false)}>×</button></header><button type="button" className="reel-option-row" onClick={() => { setReelOptionsOpen(false); setReelMuted(value => !value); }}><span className="reel-option-icon">{reelMuted ? <Volume2 size={19}/> : <VolumeX size={19}/>}</span><span><b>{reelMuted ? "Turn sound on" : "Mute Reel"}</b><small>Change playback sound for Reels</small></span></button><button type="button" className="reel-option-row" disabled={!selectedLiveReel || saveReelBusyIds.includes(selectedLiveReel.id)} onClick={() => { if (!selectedLiveReel) { setNotice("Save is available for published Reels."); return; } setReelOptionsOpen(false); void toggleSavedReel(selectedLiveReel.id); }}><span className="reel-option-icon"><Bookmark size={19}/></span><span><b>{selectedLiveReel && savedReelIds.includes(selectedLiveReel.id) ? "Remove from Saved" : "Save Reel"}</b><small>{selectedLiveReel ? "Keep this Reel in your private library" : "Available on published Reels"}</small></span></button><button type="button" className="reel-option-row" onClick={async () => { const link = selectedLiveReel ? window.location.origin + "/?reel=" + selectedLiveReel.id : window.location.href; try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(link); if (selectedLiveReel) await trackReelAnalyticsEvent(selectedLiveReel.id, "share"); setNotice("Reel link copied to clipboard."); } else { setNotice("Clipboard access is unavailable on this browser."); } } catch { setNotice("Could not copy the Reel link. Check browser permissions."); } setReelOptionsOpen(false); }}><span className="reel-option-icon"><Send size={19}/></span><span><b>Copy Reel link</b><small>Copy a link you can share with friends</small></span></button><button type="button" className="reel-option-row" disabled={!selectedLiveReel} onClick={() => { if (selectedLiveReel) { setHiddenReelIds(ids => ids.includes(selectedLiveReel.id) ? ids : [...ids, selectedLiveReel.id]); setActiveReelPostId(null); setNotice("Reel hidden from your feed for this session."); } setReelOptionsOpen(false); }}><span className="reel-option-icon"><Eye size={19}/></span><span><b>Hide this Reel</b><small>Remove it from your feed for this session</small></span></button>{selectedLiveReel && userId && selectedLiveReel.author_id === userId && <><div className="reel-options-divider"/><button type="button" className="reel-option-row reel-analytics-option" onClick={() => { setReelOptionsOpen(false); setReelAnalyticsOpen(true); }}><span className="reel-option-icon"><ChartNoAxesCombined size={19}/></span><span><b>View analytics</b><small>Reach, watch time, engagement and trends</small></span></button><button type="button" className="reel-option-row reel-option-delete" disabled={busy} onClick={() => { setReelOptionsOpen(false); void deletePost(selectedLiveReel); }}><span className="reel-option-icon"><Film size={19}/></span><span><b>Delete Reel</b><small>Permanently delete your Reel and its media</small></span></button></>}<p className="reel-options-footnote">Changes apply to this device or your ZeeChat account, depending on the option.</p></section></div>}
        {reelAnalyticsOpen && selectedLiveReel && userId && selectedLiveReel.author_id === userId && <ReelAnalyticsPanel post={selectedLiveReel} onClose={() => setReelAnalyticsOpen(false)} />}
        {selectedLiveReel && openCommentPostIds.includes(selectedLiveReel.id) && <section className="reel-comments-panel" aria-label="Reel comments"><header><b>Comments · {commentCounts[selectedLiveReel.id] ?? 0}</b><button type="button" aria-label="Close comments" onClick={() => { setReelCommentStickerOpen(false); void toggleComments(selectedLiveReel.id); }}>×</button></header><div className="reel-comments-list">{(commentsByPost[selectedLiveReel.id] ?? []).map(comment => <article key={comment.id}><b>{comment.author_id === userId ? "You" : "Community member"}</b>{comment.author_id === userId && <ContentActionMenu label="comment" onDelete={() => void deleteComment(comment)} />}<p>{comment.body}</p></article>)}{!(commentsByPost[selectedLiveReel.id] ?? []).length && <p className="muted">Be the first to comment.</p>}</div>{reelCommentStickerOpen && <div className="reel-comment-sticker-tray" aria-label="Quick stickers">{["😂","❤️","🔥","😭","✨","🥹","👏","😍","🙌","🎉","💯","🫶","😎","🥰","🥺","💖"].map(sticker => <button type="button" key={sticker} aria-label={`Insert ${sticker}`} onClick={() => setCommentDrafts(current => ({...current,[selectedLiveReel.id]:(current[selectedLiveReel.id] ?? "") + sticker}))}>{sticker}</button>)}</div>}<form onSubmit={event => {event.preventDefault(); void submitComment(selectedLiveReel.id);}}><button className="reel-comment-sticker-toggle" type="button" aria-label="Open sticker picker" aria-expanded={reelCommentStickerOpen} onClick={() => setReelCommentStickerOpen(value => !value)}><Smile size={18}/></button><input value={commentDrafts[selectedLiveReel.id] ?? ""} onChange={event => setCommentDrafts(current => ({...current,[selectedLiveReel.id]:event.target.value}))} placeholder="Add a comment or emoji…" maxLength={1000}/><button type="submit" aria-label="Send comment" disabled={commentBusyIds.includes(selectedLiveReel.id) || !(commentDrafts[selectedLiveReel.id] ?? "").trim()}><Send size={16}/></button></form></section>}
      </>}</section>}
{view === "Sounds" && selectedSoundDetail ? <section className="content-view sound-library-view sound-detail-view"><button className="outline-button" onClick={() => setSelectedSoundDetail(null)}>← Back to sound library</button><div className="sound-detail-hero"><span className="sound-icon">♫</span><span className="eyebrow">ZEECHAT ORIGINAL SOUND</span><h1>{selectedSoundDetail.title}</h1><p>Original audio by {selectedSoundDetail.creator_id === userId ? "you" : (soundCreatorProfiles[selectedSoundDetail.creator_id]?.username ? "@" + soundCreatorProfiles[selectedSoundDetail.creator_id].username : "@" + (soundCreatorProfiles[selectedSoundDetail.creator_id]?.display_name || "creator"))}</p><audio controls preload="metadata" src={selectedSoundDetail.audio_url}/><button className="create-button" onClick={() => {setSelectedSound(selectedSoundDetail);setAudioFile(null);setMediaFile(null);setPostKind("reel");openPostComposer(true);}}>Use this sound ↗</button></div><div className="sound-detail-posts">{selectedSoundDetail.source_post_id&&<button type="button" className="sound-detail-post" onClick={()=>{setActiveReelPostId(selectedSoundDetail.source_post_id!);setView("Reels");}}><span className="sound-icon">▶</span><span><b>Original Reel</b><small>View the source video ↗</small></span></button>}<h2>Reels using this sound</h2>{posts.filter(post => post.sound_id === selectedSoundDetail.id).length ? posts.filter(post => post.sound_id === selectedSoundDetail.id).map(post => <button type="button" className="sound-detail-post" key={post.id} onClick={() => {setActiveReelPostId(post.id);setView("Reels");}}><span className="sound-icon">▶</span><span><b>{post.caption || "Untitled Reel"}</b><small>Open Reel ↗</small></span></button>) : <p>No public Reels using this sound have loaded yet. Be the first to use it.</p>}</div></section> : view === "Sounds" && <section className="content-view sound-library-view"><button className="outline-button" onClick={() => setView("Reels")}>← Back to Reels</button><span className="eyebrow">SOUND LIBRARY</span><h1>Find your <em>sound.</em></h1><p>Preview a sound, see Reels using it, and reuse it in your own video.</p>{sounds.length ? <div className="sound-library-list">{sounds.map(sound => <article className="sound-library-card" key={sound.id}><span className="sound-icon">♫</span><div><button type="button" className="sound-title-button" onClick={() => void openSoundDetail(sound)}>{sound.title}</button><small>Original audio · {new Date(sound.created_at).toLocaleDateString()}</small><audio controls preload="none" src={sound.audio_url}/><button type="button" className="outline-button sound-detail-link" onClick={() => void openSoundDetail(sound)}>View sound and Reels ↗</button><div className="sound-using-posts"><b>Posts using this sound</b>{posts.filter(post => post.sound_id === sound.id).length ? posts.filter(post => post.sound_id === sound.id).map(post => <button type="button" key={post.id} onClick={() => {setActiveReelPostId(post.id);setView("Reels");}}>{post.caption || "Open sound Reel"} ↗</button>) : <small>No posts using this sound yet.</small>}</div></div><div className="sound-card-actions"><button className="create-button" onClick={() => {setSelectedSound(sound);setAudioFile(null);setMediaFile(null);setPostKind("reel");openPostComposer(true);}}>Use sound</button>{userId === sound.creator_id && <ContentActionMenu label="sound" onDelete={() => void deleteSound(sound)} />}</div></article>)}</div> : <div className="empty-state"><span>♫</span><h3>No reusable sounds yet</h3><p>Publish a Reel with an audio file to add the first sound to the library.</p><button className="create-button" onClick={() => {setSelectedSound(null);setAudioFile(null);setPostKind("reel");setCreateOpen(true);}}>Create a sound Reel</button></div>}</section>}
      {view === "Discover" && <section className="content-view discover-view"><div className="discover-heading"><div><span className="eyebrow">YOUR NEXT FAVOURITE THING</span><h1>Find your <em>people.</em></h1><p>Discover creators and vibes.</p></div><button type="button" className="discover-search-action" aria-label="Search creators" aria-expanded={discoverSearchOpen} onClick={() => setDiscoverSearchOpen(value => !value)}><Search size={19}/></button></div>{discoverSearchOpen && <form className="discover-search-form" onSubmit={event => {event.preventDefault();void searchDiscoverCreators();}}><input aria-label="Search creators" placeholder="Search by name or username…" value={discoverQuery} maxLength={60} onChange={event => setDiscoverQuery(event.target.value)}/><button type="submit" disabled={discoverSearchLoading}>{discoverSearchLoading ? "Searching…" : "Search"}</button></form>}{discoverSearchOpen && discoverQuery.trim() && <div className="discover-search-results" aria-live="polite">{discoverSearchLoading ? <p>Searching public creators…</p> : discoverResults.length ? discoverResults.map(creator => <button type="button" className="discover-creator-result" key={creator.user_id} onClick={() => {setSelectedCreator({username:creator.username,initial:(creator.display_name || creator.username || "Z").slice(0,1).toUpperCase(),avatarUrl:creator.avatar_url});setView("Profile");}}><span className="discover-creator-avatar">{creator.avatar_url && !failedAvatarUrls.includes(creator.avatar_url) ? <Image src={creator.avatar_url} alt="" width={42} height={42} unoptimized onError={() => setFailedAvatarUrls(current => current.includes(creator.avatar_url!) ? current : [...current, creator.avatar_url!])}/> : (creator.display_name?.[0] || creator.username?.[0] || "Z").toUpperCase()}</span><span className="discover-creator-copy"><b>{creator.display_name || creator.username}</b><small>@{creator.username}</small>{creator.bio && <span>{creator.bio}</span>}</span><span className="discover-creator-arrow">→</span></button>) : <p className="discover-search-empty">No public creators found. Try a different name or username.</p>}</div>}<h2 className="discover-section-title">Trending topics</h2><div className="discover-category-grid">{[["😂","Comedy"],["🎧","Music"],["🎮","Gaming"],["🎬","Movies"],["🎤","Creators"],["🎉","Parties"]].map(([emoji,label])=><button type="button" className="discover-category" key={label} onClick={() => label === "Parties" ? setView("Parties") : setNotice(label + " discovery is coming soon. Recommendations are preview content.")}><span className="discover-category-icon" aria-hidden="true">{emoji}</span><span>{label}</span><span className="discover-category-arrow" aria-hidden="true">↗</span></button>)}</div><h2 className="discover-section-title discover-live-title">Live creators</h2><div className="discover-live-placeholder"><span className="discover-live-dot"/>Live creator discovery is coming soon.</div><h2 className="discover-section-title">Recommended for you</h2><p className="discover-recommendation-note">Personalized recommendations will appear here as ZeeChat’s community grows.</p></section>}
      {view === "Parties" && <section className="content-view parties-view">
        <div className="parties-hero"><div><span className="eyebrow"><i className="live-dot"/> LIVE COMMUNITY</span><h1>Good people.<br/><em>Great energy.</em></h1><p>Discover real community events, RSVP to upcoming hangs, or host a party for your people.</p></div><div className="party-hero-orbit"><Users size={42}/><span>LIVE</span></div></div>
        {!userId && <div className="party-empty-state"><b>Sign in to join the party.</b><p>Browse, RSVP, and host events with your ZeeChat account.</p></div>}
        <div className="party-mode-switch" role="tablist" aria-label="Filter parties">
          {[{id:"all",label:"All parties"},{id:"live",label:"Live now"},{id:"upcoming",label:"Coming up"},{id:"mine",label:"My parties"}].map(option => <button key={option.id} type="button" role="tab" aria-selected={partyFilter === option.id} className={partyFilter === option.id ? "active" : ""} onClick={() => setPartyFilter(option.id as typeof partyFilter)}>{option.label}</button>)}
        </div>
        <div className="party-section-heading"><div><span className="eyebrow">COMMUNITY ROOMS</span><h2>{partyFilter === "live" ? "Live now" : partyFilter === "upcoming" ? "Coming up" : partyFilter === "mine" ? "Your hosted parties" : "Discover parties"} <span className="live-count">{partyEntries.filter(p => partyFilter === "live" ? p.status === "live" : partyFilter === "upcoming" ? p.status === "scheduled" : partyFilter === "mine" ? p.host_id === userId : true).length}</span></h2></div><button className="text-action" onClick={() => void loadParties()} disabled={partyLoading}>{partyLoading ? "Refreshing…" : "Refresh ↻"}</button></div>
        {partyLoading && !partyEntries.length ? <div className="party-empty-state">Loading parties…</div> : <>
          {partyEntries.filter(p => p.status === "live" && (partyFilter === "all" || partyFilter === "live" || partyFilter === "mine") && (partyFilter !== "mine" || p.host_id === userId)).length > 0 && <div className="party-live-grid">
            {partyEntries.filter(p => p.status === "live" && (partyFilter === "all" || partyFilter === "live" || partyFilter === "mine") && (partyFilter !== "mine" || p.host_id === userId)).map((party, index) => <article key={party.id} className={"party-live-card " + (["party-card-violet","party-card-cyan","party-card-rose"][index % 3])}>
              <div className="party-card-art" style={party.thumbnail_url ? { backgroundImage: "linear-gradient(180deg, rgba(8,7,15,.06), rgba(8,7,15,.58)), url(" + JSON.stringify(party.thumbnail_url) + ")", backgroundSize: "cover", backgroundPosition: "center" } : { background: "linear-gradient(135deg, " + (partyStickerOptions.find(item => item.id === party.sticker_id)?.colors[0] ?? "#312e81") + ", " + (partyStickerOptions.find(item => item.id === party.sticker_id)?.colors[1] ?? "#c026d3") + ")" }}>{!party.thumbnail_url && <span>{partyStickerOptions.find(item => item.id === party.sticker_id)?.emoji ?? "🌌"}</span>}<small>PARTY VIBES</small></div><div className="party-card-top"><div className="party-card-badges"><span className={"party-type-pill party-type-" + party.format}>{party.format === "audio" ? <><Mic size={12}/> VOICE CHAT</> : party.format === "watch" ? <><Film size={12}/> MOVIE NIGHT</> : <><Video size={12}/> VIDEO CHAT</>}</span><span className="party-live-pill"><i/> LIVE NOW</span></div><span className="party-lock"><Users size={14}/> {party.participant_count}</span></div>
              <div className="party-card-content"><div className="party-host-avatar">{(party.hostName[0] || "Z").toUpperCase()}</div><small>@{party.hostUsername} · {party.host_id === userId ? "YOU HOST" : "HOST"}</small><h3>{party.title}</h3><p>{party.description || (party.format === "audio" ? "An audio hangout with the community." : party.format === "watch" ? "A community watch party." : "Come hang out with the community.")}</p><div className="party-card-actions">
                {party.host_id === userId ? <><button type="button" onClick={() => setActivePartyRoom(party)}><Video size={15}/> Enter room ↗</button><button type="button" disabled={partyBusyIds.includes(party.id)} onClick={() => void updatePartyStatus(party,"ended")}>End party <span>×</span></button></> : <><button type="button" disabled={partyBusyIds.includes(party.id)} onClick={() => { if (partyJoinedIds.includes(party.id)) setActivePartyRoom(party); else void togglePartyMembership(party).then(joined => { if (joined) setActivePartyRoom(party); }); }}>{partyBusyIds.includes(party.id) ? "Saving…" : partyJoinedIds.includes(party.id) ? "Join room" : "Join & enter"} <span>↗</span></button>{partyJoinedIds.includes(party.id) && <button type="button" className="party-cancel-rsvp" disabled={partyBusyIds.includes(party.id)} onClick={() => void togglePartyMembership(party)}>Leave</button>}</>}
              </div></div>
            </article>)}
          </div>}
          {partyEntries.filter(p => p.status === "scheduled" && (partyFilter === "all" || partyFilter === "upcoming" || partyFilter === "mine") && (partyFilter !== "mine" || p.host_id === userId)).length > 0 && <div className="upcoming-party-list">
            {partyEntries.filter(p => p.status === "scheduled" && (partyFilter === "all" || partyFilter === "upcoming" || partyFilter === "mine") && (partyFilter !== "mine" || p.host_id === userId)).map(party => <article key={party.id}>
              <div className="upcoming-party-art" style={party.thumbnail_url ? { backgroundImage: "linear-gradient(180deg, rgba(8,7,15,.05), rgba(8,7,15,.35)), url(" + JSON.stringify(party.thumbnail_url) + ")", backgroundSize: "cover", backgroundPosition: "center" } : { background: "linear-gradient(145deg, " + (partyStickerOptions.find(item => item.id === party.sticker_id)?.colors[0] ?? "#312e81") + ", " + (partyStickerOptions.find(item => item.id === party.sticker_id)?.colors[1] ?? "#c026d3") + ")" }}>{!party.thumbnail_url && <span>{partyStickerOptions.find(item => item.id === party.sticker_id)?.emoji ?? "🌌"}</span>}</div><div className="upcoming-date"><b>{new Date(party.scheduled_at).toLocaleDateString(undefined,{day:"2-digit"})}</b><span>{new Date(party.scheduled_at).toLocaleDateString(undefined,{month:"short"}).toUpperCase()}</span></div>
              <div className="upcoming-copy"><h3>{party.title}</h3><p><CalendarClock size={13}/> {new Date(party.scheduled_at).toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})} · Hosted by {party.hostName} · {party.format === "audio" ? "Audio" : party.format === "watch" ? "Watch party" : "Video"} · {party.participant_count} going</p>{party.description && <p>{party.description}</p>}</div>
              <div className="upcoming-party-actions">{party.host_id === userId ? <><button type="button" disabled={partyBusyIds.includes(party.id)} onClick={() => { void updatePartyStatus(party,"live").then(started => { if (started) setActivePartyRoom({ ...party, status: "live" }); }); }}>Start & enter ↗</button><button type="button" className="party-cancel-rsvp" disabled={partyBusyIds.includes(party.id)} onClick={() => void updatePartyStatus(party,"ended")}>Cancel</button></> : <button type="button" disabled={partyBusyIds.includes(party.id)} onClick={() => void togglePartyMembership(party)}>{partyBusyIds.includes(party.id) ? "Saving…" : partyJoinedIds.includes(party.id) ? "Going ✓" : "I’m going ＋"}</button>}</div>
            </article>)}
          </div>}
          {partyEntries.filter(p => partyFilter === "mine" ? p.host_id === userId : partyFilter === "live" ? p.status === "live" : partyFilter === "upcoming" ? p.status === "scheduled" : true).length === 0 && <div className="party-empty-state"><b>{partyFilter === "mine" ? "You haven’t hosted a party yet." : partyFilter === "live" ? "No parties are live right now." : partyFilter === "upcoming" ? "Nothing scheduled just yet." : "Be the first to bring people together."}</b><p>{partyFilter === "mine" ? "Create a party and it’ll show up here." : "Create a party, invite your community, and give everyone something to look forward to."}</p></div>}
        </>}
        <div className="party-bottom-cta"><div><span className="eyebrow">YOUR ROOM. YOUR RULES.</span><h2>Host the next <em>great night.</em></h2><p>Schedule a community hangout and let people RSVP.</p></div><button className="create-button" onClick={() => { if (!userId) { setNotice("Sign in to create a party."); return; } setPartyCreateOpen(true); }}><Plus size={18}/> Create party</button></div>
        <p className="party-capability-note">Live rooms support peer-to-peer audio/video for small groups. Allow microphone/camera access when your browser asks.</p>
      </section>}
      {view === "Chats" && <section className={activeChat ? "content-view chat-view chat-detail-view" : "content-view chat-view"}>{activeChat ? <><header className="chat-detail-header"><button className="chat-back-button" onClick={() => {setActiveChat(false);setActiveConversationId(null);activeConversationRef.current=null;void loadInbox(userId ?? "");}} aria-label="Back to messages"><ArrowLeft size={20}/></button><button className="chat-contact" onClick={() => { if (selectedCreator?.username) setView("Profile"); else setNotice("This conversation has no linked creator profile."); }}><span className="chat-contact-avatar">{selectedCreator?.avatarUrl && !failedAvatarUrls.includes(selectedCreator.avatarUrl) ? <Image src={selectedCreator.avatarUrl} alt={`${selectedCreator.username} profile photo`} width={44} height={44} unoptimized onError={() => setFailedAvatarUrls(current => current.includes(selectedCreator.avatarUrl!) ? current : [...current, selectedCreator.avatarUrl!])}/> : (selectedCreator?.initial ?? "Z")}<i/></span><span><b>{selectedCreator?.username ?? "Conversation"}</b><small><i/> Direct message</small></span></button><button className="chat-more-button" onClick={() => setChatOptionsOpen(open => !open)} aria-label="Conversation options" aria-expanded={chatOptionsOpen}><MoreHorizontal size={22}/></button>{chatOptionsOpen && <div className="chat-options-menu"><button type="button" onClick={() => {setChatOptionsOpen(false);setChatReportOpen(true);}}> <ShieldCheck size={16}/> Report @{selectedCreator?.username ?? "user"}</button><button type="button" className="chat-option-danger" disabled={chatSafetyBusy} onClick={() => {if(window.confirm("Block @"+(selectedCreator?.username ?? "this user")+"? They will not be able to send messages to you in this conversation.")) void blockChatUser();setChatOptionsOpen(false);}}><LockKeyhole size={16}/> Block user</button></div>}</header>{chatReportOpen && <div className="chat-report-backdrop" role="presentation" onClick={() => setChatReportOpen(false)}><section className="chat-report-dialog" role="dialog" aria-modal="true" aria-label="Report account" onClick={event=>event.stopPropagation()}><header><div><b>Report @{selectedCreator?.username ?? "user"}</b><small>Tell us what went wrong. Reports are private.</small></div><button type="button" aria-label="Close report form" onClick={()=>setChatReportOpen(false)}>×</button></header><label htmlFor="chat-report-reason">Reason</label><select id="chat-report-reason" value={chatReportReason} onChange={event=>setChatReportReason(event.target.value)}><option value="spam">Spam or scams</option><option value="harassment">Harassment or bullying</option><option value="hate_or_violence">Hate or violent threats</option><option value="impersonation">Impersonation</option><option value="inappropriate_content">Inappropriate content</option><option value="other">Something else</option></select><label htmlFor="chat-report-details">Additional details (optional)</label><textarea id="chat-report-details" rows={3} maxLength={2000} value={chatReportDetails} onChange={event=>setChatReportDetails(event.target.value)} placeholder="Add context to help us review…"/><div className="chat-report-actions"><button type="button" onClick={()=>setChatReportOpen(false)}>Cancel</button><button type="button" disabled={chatSafetyBusy} onClick={()=>void submitChatReport()}>{chatSafetyBusy?"Submitting…":"Submit report"}</button></div></section></div>}<div className="chat-timeline" aria-label="Conversation messages">{liveMessages.map((message,index)=>{const repliedMessage=message.reply_to_id?liveMessages.find(item=>item.id===message.reply_to_id):null;const currentDay=new Date(message.created_at);const previousDay=index>0?new Date(liveMessages[index-1].created_at):null;const showDate=index===0||!previousDay||currentDay.getFullYear()!==previousDay.getFullYear()||currentDay.getMonth()!==previousDay.getMonth()||currentDay.getDate()!==previousDay.getDate();return <Fragment key={message.id}>{showDate&&<div className="chat-date-divider"><span>{formatChatDate(message.created_at)}</span></div>}<div className={"chat-message-row "+(message.sender_id===userId ? "mine" : "theirs")}><div className="chat-message-content">{repliedMessage && <button type="button" className="chat-reply-quote" onClick={()=>document.getElementById("chat-message-"+repliedMessage.id)?.scrollIntoView({behavior:"smooth",block:"center"})}><span>Replying to {repliedMessage.sender_id===userId?"you":selectedCreator?.username||"them"}</span><span>{repliedMessage.body}</span></button>}<div className={"chat-bubble "+(message.attachment_path?"chat-media-bubble":"")} id={"chat-message-"+message.id}>{message.attachment_path ? message.attachment_type?.startsWith("audio/") ? (message.attachment_url ? <VoiceNotePlayer src={message.attachment_url} /> : <span>Voice note unavailable. Reopen the conversation to refresh it.</span>) : message.attachment_type?.startsWith("video/") ? (message.attachment_url ? <video className="chat-message-media" src={message.attachment_url} controls playsInline preload="metadata"/> : <span>Video attachment unavailable. Reopen the conversation to refresh it.</span>) : message.attachment_url ? <a className="chat-message-image-link" href={message.attachment_url} target="_blank" rel="noreferrer"><Image className="chat-message-media" src={message.attachment_url} alt={message.attachment_name||"Chat photo"} width={480} height={480} unoptimized/></a> : <span>Photo attachment unavailable. Reopen the conversation to refresh it.</span> : message.body}</div><div className="chat-message-meta"><time>{new Date(message.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time>{message.sender_id===userId && (message.read_at ? <CheckCheck size={13}/> : <Check size={13}/>)}<button type="button" className="chat-reply-action" aria-label="Reply to message" title="Reply" onClick={()=>setReplyToMessage(message)}><Reply size={12}/></button></div></div></div></Fragment>})}{!liveMessages.length && <p className="chat-first-message">You’re connected. Send the first message.</p>}</div><form className="chat-composer" onSubmit={event => {event.preventDefault(); void sendLiveMessage();}}>{replyToMessage && <div className="chat-replying-banner"><div><b>Replying to {replyToMessage.sender_id===userId?"your message":selectedCreator?.username||"message"}</b><span>{replyToMessage.body}</span></div><button type="button" aria-label="Cancel reply" onClick={()=>setReplyToMessage(null)}>×</button></div>}<div className="chat-composer-main"><input ref={chatAttachmentInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" hidden onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void sendChatAttachment(file); }}/><button type="button" className="chat-attach-button" aria-label="Attach photo or video" title="Attach photo or video" disabled={chatAttachmentBusy||voiceRecording} onClick={() => chatAttachmentInputRef.current?.click()}><Paperclip size={20}/></button><button type="button" className={"chat-attach-button chat-voice-button"+(voiceRecording?" is-recording":"")} aria-label={voiceRecording?"Stop voice note recording":"Record voice note"} title={voiceRecording?"Stop recording and send":"Record voice note"} disabled={chatAttachmentBusy} onClick={() => voiceRecording ? stopVoiceRecording() : void startVoiceRecording()}><Mic size={20}/></button><textarea rows={1} aria-label="Write a message" placeholder={replyToMessage?"Write a reply…":"Message ZeeChat…"} value={chatDraft} maxLength={4000} onChange={event=>setChatDraft(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/><button type="button" className="chat-emoji-button" aria-label="Emoji" onClick={()=>setChatDraft(draft=>draft+"😊")}><Smile size={19}/></button><button type="submit" className="chat-send-button" disabled={!chatDraft.trim()} aria-label="Send message"><Send size={18}/></button></div></form></> : <>{newMessageOpen && <div className="new-message-backdrop" role="presentation" onClick={() => setNewMessageOpen(false)}><section className="new-message-dialog" role="dialog" aria-modal="true" aria-labelledby="new-message-title" onClick={event => event.stopPropagation()}><div className="new-message-dialog-heading"><div><span className="eyebrow">START A CONVERSATION</span><h2 id="new-message-title">New message</h2></div><button type="button" className="icon-button" onClick={() => setNewMessageOpen(false)} aria-label="Close new message">×</button></div><form className="new-message-search" onSubmit={event => { event.preventDefault(); void searchNewMessagePeople(); }}><Search size={17}/><input autoFocus aria-label="Search people" placeholder="Search name or username…" value={newMessageQuery} maxLength={60} onChange={event => { setNewMessageQuery(event.target.value); if (!event.target.value.trim()) setNewMessageResults([]); }}/><button type="submit" disabled={newMessageSearchLoading || !newMessageQuery.trim()}>{newMessageSearchLoading ? "Searching…" : "Search"}</button></form><div className="new-message-results" aria-live="polite">{newMessageSearchLoading ? <p>Searching ZeeChat profiles…</p> : newMessageResults.length ? newMessageResults.map(person => <button type="button" className="new-message-person" key={person.user_id} disabled={chatLoading} onClick={() => { setNewMessageOpen(false); void openLiveConversation(person.user_id, person.username, (person.display_name[0] || person.username[0] || "Z").toUpperCase()); }}><span className="new-message-avatar">{person.avatar_url ? <Image src={person.avatar_url} alt="" width={42} height={42} unoptimized/> : (person.display_name[0] || person.username[0] || "Z").toUpperCase()}</span><span><strong>{person.display_name}</strong><small>@{person.username}</small></span><MessageCircle size={17}/></button>) : newMessageQuery.trim() ? <p>No profiles found. Try another name or username.</p> : <p>Search for someone by their name or username to start chatting.</p>}</div></section></div>}<div className="chat-heading"><div><span className="eyebrow">YOUR PEOPLE, YOUR SPACE</span><h1>Messages</h1><p>Keep good conversations going.</p></div><button type="button" className="chat-compose" onClick={() => { setNewMessageOpen(true); setNewMessageQuery(""); setNewMessageResults([]); setNotice(""); }} aria-label="New message"><Plus size={20}/></button></div><div className="chat-search"><Search size={17}/><input aria-label="Search conversations" placeholder="Search conversations…" value={inboxSearch} onChange={event => setInboxSearch(event.target.value)}/>{inboxSearch && <button type="button" aria-label="Clear conversation search" onClick={() => setInboxSearch("")}>×</button>}</div><div className="chat-filter-row"><button type="button" className={inboxFilter === "all" ? "chat-filter-active" : ""} onClick={() => setInboxFilter("all")}>All messages</button><button type="button" className={inboxFilter === "unread" ? "chat-filter-active" : ""} onClick={() => setInboxFilter("unread")}>Unread{unreadConversationCount > 0 ? ` (${unreadConversationCount})` : ""}</button><button type="button" onClick={() => setNotice("Message requests are not available yet.")}>Requests</button></div>{filteredInboxConversations.length ? (<div className="chat-live-inbox">{filteredInboxConversations.map(item=><button type="button" className="chat-demo-thread" key={item.id} onClick={()=>void openExistingConversation(item)} disabled={chatLoading}><span className="chat-contact-avatar">{item.avatarUrl && !failedAvatarUrls.includes(item.avatarUrl) ? <Image src={item.avatarUrl} alt="" width={44} height={44} unoptimized onError={() => setFailedAvatarUrls(current => current.includes(item.avatarUrl!) ? current : [...current, item.avatarUrl!])}/> : (item.displayName[0]||"Z").toUpperCase()}<i/></span><span className="chat-demo-thread-copy"><b>{item.displayName}<small>{item.lastAt ? new Date(item.lastAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : ""}</small>{item.unreadCount > 0 && <i className="chat-demo-unread" aria-label={`${item.unreadCount} unread messages`}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</i>}</b><span>{item.lastMessage}</span></span></button>)}</div>) : (inboxConversations.length && (inboxSearch.trim() || inboxFilter === "unread") ? (<div className="chat-inbox-empty"><div className="chat-empty-art"><Search size={25}/></div><h2>{inboxFilter === "unread" && !inboxSearch.trim() ? "You’re all caught up" : inboxFilter === "unread" ? "No matching unread chats" : "No matching conversations"}</h2><p>{inboxFilter === "unread" && !inboxSearch.trim() ? "There are no unread conversations right now." : "Try another name, username, or message keyword."}</p><button onClick={() => {setInboxSearch("");setInboxFilter("all");}}>Show all messages <span>→</span></button></div>) : (<div className="chat-inbox-empty"><div className="chat-empty-art"><MessageCircle size={29}/></div><h2>No conversations yet</h2><p>Visit a creator’s profile and tap Message to start a real conversation.</p><button onClick={() => setView("Discover")}>Discover people <span>→</span></button></div>))}</>}</section>}
      {view === "Profile" && selectedCreator ? <section className="content-view profile-view creator-preview-view">
        <button className="creator-preview-back" onClick={() => {setSelectedCreator(null);setView("Reels");}}><ArrowLeft size={17}/> Back to Reels</button>
        <div className="profile-cover" style={selectedCreatorProfile?.cover_url ? {backgroundImage:`linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.52)),url("${selectedCreatorProfile.cover_url}")`,backgroundSize:"cover",backgroundPosition:"center"} : undefined}><span>{selectedCreatorProfile?.cover_url ? "" : "✦ GOOD ENERGY ONLY"}</span></div>
        <div className="profile-summary">
          <div className="profile-avatar">{selectedCreatorProfile?.avatar_url ? <Image src={selectedCreatorProfile.avatar_url} alt="" width={88} height={88} unoptimized/> : (selectedCreatorProfile?.display_name?.[0] || selectedCreatorProfile?.username?.[0] || selectedCreator.initial).toUpperCase()}</div>
          <h1>{selectedCreatorProfile?.display_name || selectedCreator.username}</h1><p>@{selectedCreatorProfile?.username || selectedCreator.username}</p>
          {selectedCreatorProfile?.bio && <p>{selectedCreatorProfile.bio}</p>}
          <div className="creator-preview-actions">
            <button className="create-button" disabled={!selectedCreatorProfile || selectedCreatorProfile.user_id === userId} onClick={() => {if(selectedCreatorProfile) void openLiveConversation(selectedCreatorProfile.user_id,selectedCreatorProfile.username,selectedCreator.initial);}}>Message</button>
            <button className="outline-button" disabled={followBusy || !selectedCreatorProfile || selectedCreatorProfile.user_id === userId} onClick={() => void toggleCreatorFollow(selectedCreatorProfile?.username || selectedCreator.username)}>{followBusy ? "Please wait…" : creatorFollowState[selectedCreatorProfile?.username || selectedCreator.username] ? "Following" : (selectedCreatorProfile?.is_private && pendingFollowRequestUserIds.includes(selectedCreatorProfile.user_id) ? "Cancel request" : "Follow")}</button>
          </div>
          <div className="profile-stats"><div><b>{selectedCreatorPosts.length}</b><small>Posts</small></div><div><b>{selectedCreatorFollowCounts.followers.toLocaleString()}</b><small>Followers</small></div><div><b>{selectedCreatorFollowCounts.following.toLocaleString()}</b><small>Following</small></div></div>
        </div>
        {creatorProfileLoading ? <div className="profile-empty-state"><h2>Loading profile…</h2><p>Fetching creator details and public posts.</p></div> : !selectedCreatorProfile ? <div className="profile-empty-state"><h2>Profile unavailable</h2><p>This creator may be using a preview Reel rather than a registered ZeeChat account.</p></div> : selectedCreatorProfile.is_private && selectedCreatorProfile.user_id !== userId && !creatorFollowState[selectedCreatorProfile.username] ? <div className="profile-empty-state"><span className="profile-empty-icon"><LockKeyhole size={25}/></span><h2>This account is private</h2><p>Send a follow request and wait for approval to see this creator’s posts and Reels.</p></div> : selectedCreatorPosts.length ? <div className="profile-post-list">{selectedCreatorPosts.map(post=><article className="profile-post-item" key={post.id}>{post.media_url && (post.post_type === "reel" || post.post_type === "video" || post.is_reel ? <button type="button" className="profile-post-thumbnail" onClick={()=>{setActiveReelPostId(post.id);setReelFeedMode("for-you");setView("Reels");}} aria-label="Play creator video">{post.thumbnail_url ? <img src={post.thumbnail_url} alt="" loading="lazy"/> : <img src={post.media_url} alt="" loading="lazy"/>}<span><Video size={22} fill="currentColor"/></span></button> : <img className="profile-post-thumbnail-image" src={post.thumbnail_url || post.media_url} alt="Creator post" loading="lazy"/>)}{post.caption && <p>{post.caption}</p>}</article>)}</div> : <div className="profile-empty-state"><h2>No public posts yet</h2><p>When this creator shares something, it will appear here.</p></div>}
      </section> : view === "Profile" && <section className="content-view profile-view"><div className="profile-cover" style={profile?.cover_url ? {backgroundImage:`linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.52)),url("${profile.cover_url}")`,backgroundSize:"cover",backgroundPosition:"center"} : undefined}><span>{profile?.cover_url ? "" : "✦ GOOD ENERGY ONLY"}</span>{userId && <label className={`profile-image-change cover-image-change${coverUploadBusy ? " is-uploading" : ""}`} aria-disabled={coverUploadBusy}>{coverUploadBusy ? "Uploading cover…" : "Change cover"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={coverUploadBusy} onChange={event=>{const input=event.currentTarget;const file=input.files?.[0];if(file)void uploadProfileImage(file,"cover");input.value="";}} /></label>}</div><div className="profile-summary"><div className="profile-avatar">{profile?.avatar_url ? <Image src={profile.avatar_url} alt="Profile photo" width={88} height={88} unoptimized /> : (userId ? (profile?.display_name?.[0] || profile?.username?.[0] || "Z").toUpperCase() : "z")}</div>{userId && <label className={`profile-image-change avatar-image-change${avatarUploadBusy ? " is-uploading" : ""}`} aria-disabled={avatarUploadBusy}>{avatarUploadBusy ? "Uploading profile photo…" : "Change profile photo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={avatarUploadBusy} onChange={event=>{const input=event.currentTarget;const file=input.files?.[0];if(file)void uploadProfileImage(file,"avatar");input.value="";}} /></label>}{userId ? <><button className="outline-button" onClick={openProfileEditor}>Edit profile</button><button type="button" className="outline-button profile-sign-out-button" onClick={async () => { try { const { error } = await createClient().auth.signOut(); if (error) throw error; setView("Home"); setNotice("You have been signed out."); } catch (error) { setNotice(error instanceof Error ? `Could not sign out: ${error.message}` : "Could not sign out. Please try again."); } }}><LogOut size={14}/> Sign out</button></> : <a href="/login" className="outline-button">Sign in</a>}<h1>{userId ? (profile?.display_name || profile?.username || (userEmail ? userEmail.split("@")[0] : "Your profile")) : "Your profile"}</h1><p>{userId ? (profile?.username ? `@${profile.username}` : "You’re signed in. Your profile is being set up.") : "Sign in to personalize your space."}</p>{userId && profile?.bio && <p>{profile.bio}</p>}{userId && <div className="profile-stats"><div><b>{posts.filter(post => post.author_id === userId).length}</b><small>Posts</small></div><div><b>{followCounts.followers}</b><small>Followers</small></div><div><b>{followCounts.following}</b><small>Following</small></div></div>}</div>{!userId ? <div className="profile-empty-state"><span className="profile-empty-icon"><UserRound size={25}/></span><h2>Your space is waiting</h2><p>Sign in to share videos, follow creators, and connect with your people.</p><div className="profile-empty-actions"><a className="create-button" href="/login">Sign in</a><a className="outline-button" href="/signup">Create account</a></div></div> : <><div className="profile-content-tabs"><button className={profileTab === "posts" ? "selected" : ""} onClick={() => setProfileTab("posts")}>Posts</button><button className={profileTab === "videos" ? "selected" : ""} onClick={() => setProfileTab("videos")}>Videos</button><button className={profileTab === "likes" ? "selected" : ""} onClick={() => setProfileTab("likes")}>Likes</button></div>{ownProfilePosts.length === 0 && !pendingOwnPostVisible ? <div className="profile-empty-state"><span className="profile-empty-icon"><Plus size={25}/></span><h2>{profileTab === "posts" ? "Your story starts here" : profileTab === "videos" ? "Your videos will appear here" : "No liked posts yet"}</h2><p>{profileTab === "posts" ? "Share your first post with the community." : profileTab === "videos" ? "Publish a Reel or video to build your gallery." : "Posts you like will be collected here."}</p>{profileTab === "posts" && <button className="create-button" onClick={() => setCreateOpen(true)}>Create your first post <Plus size={16}/></button>}</div> : <div className="profile-post-list">{pendingOwnPostVisible && pendingOwnPost && <article className="profile-post-item profile-pending-post" key={pendingOwnPost.id}><div className="profile-pending-thumbnail">{pendingOwnPost.previewUrl && (pendingOwnPost.mediaType.startsWith("video/") ? <video src={pendingOwnPost.previewUrl} muted playsInline /> : <img src={pendingOwnPost.previewUrl} alt="Your post is uploading" />)}<div className="profile-pending-progress"><span className="upload-progress-ring" style={{background:"conic-gradient(#45d6a0 "+(pendingOwnPost.progress*3.6)+"deg,#263a33 0deg)"}}><span>{pendingOwnPost.progress}%</span></span><small>{pendingOwnPost.label || "Uploading…"}</small></div></div>{pendingOwnPost.caption && <p>{pendingOwnPost.caption}</p>}<small className="profile-pending-status">Uploading in background · You can keep browsing</small></article>}{ownProfilePosts.map(post => <article className="profile-post-item" key={post.id}>{post.media_url && (post.post_type === "reel" || post.post_type === "video" ? <button type="button" className="profile-post-thumbnail" onClick={() => { setActiveReelPostId(post.id); setView("Reels"); }} aria-label="Play video post">{post.thumbnail_url ? <img src={post.thumbnail_url} alt="Video thumbnail" loading="lazy"/> : /\.(mp4|webm|mov)(\?|$)/i.test(post.media_url) ? <video src={post.media_url} muted playsInline preload="metadata" aria-label="Video thumbnail"/> : <img src={post.media_url} alt="Photo Reel thumbnail" loading="lazy"/>}<span><Video size={22} fill="currentColor"/></span></button> : <img className="profile-post-thumbnail-image" src={post.thumbnail_url || post.media_url} alt="Photo in post" loading="lazy" />)}{post.author_id === userId && <div className="profile-post-menu"><ContentActionMenu label="post" disabled={busy} onDelete={() => void deletePost(post)} /></div>}{post.caption && <p>{post.caption}</p>}</article>)}</div>}</>}</section>}
    </section>
    <nav className="mobile-nav">{[{name:"Home" as View,icon:Film,label:"Home"},{name:"Discover" as View,icon:Compass,label:"Discover"}].map(({name,icon:Icon,label})=><button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)}><Icon size={19}/><span>{label}</span></button>)}<button className="post-nav-button" onClick={() => openPostComposer(true)} aria-label="Choose media to post" title="Choose media to post"><span className="post-nav-orbit"><Plus size={27}/></span><span>Post</span></button><button type="button" className={view === "Parties" ? "active" : ""} onClick={() => setView("Parties")} aria-label="Parties"><Users size={19}/><span>Parties</span></button>{[{name:"Chats" as View,icon:MessageCircle,label:"Messages"},{name:"Profile" as View,icon:UserRound,label:"Profile"}].map(({name,icon:Icon,label})=><button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)}><Icon size={19}/><span>{label}</span>{name === "Chats" && unreadMessageCount > 0 && <i className="unread-count-badge">{unreadMessageCount > 99 ? "99+" : unreadMessageCount}</i>}</button>)}</nav>
    {partyProfileBrowsing && activePartyRoom && <button type="button" className="party-return-live" onClick={() => setPartyProfileBrowsing(false)}><Video size={17} /> Return to live room <span>· {activePartyRoom.title}</span></button>}
    {activePartyRoom && userId && <PartyRoom party={activePartyRoom} userId={userId} isBrowsingProfile={partyProfileBrowsing} onOpenProfile={liveProfile => { if (liveProfile.user_id === userId) { setSelectedCreator(null); } else { setSelectedCreator({ username: liveProfile.username, initial: (liveProfile.display_name?.[0] || liveProfile.username?.[0] || "Z").toUpperCase(), avatarUrl: liveProfile.avatar_url }); void loadCreatorFollowState(liveProfile.username); } setView("Profile"); setPartyProfileBrowsing(true); }} onClose={() => { setPartyProfileBrowsing(false); setActivePartyRoom(null); }} /> }
    {partyCreateOpen && <div className="modal-backdrop" onClick={() => !partySubmitting && setPartyCreateOpen(false)}><section className="create-modal party-create-modal" role="dialog" aria-modal="true" aria-labelledby="party-create-title" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => !partySubmitting && setPartyCreateOpen(false)} aria-label="Close party setup" disabled={partySubmitting}>×</button><span className="eyebrow">MAKE IT A MOMENT</span><h2 id="party-create-title">Create your <em>party.</em></h2><p>Publish a public community event or keep a private listing for yourself. Choose when it starts and let guests RSVP.</p><form onSubmit={event => void createParty(event)}><label>Party name<input value={partyName} onChange={event => setPartyName(event.target.value)} minLength={3} maxLength={70} placeholder="e.g. Friday Night Hangout" required /></label><label>What’s the vibe?<textarea value={partyDescription} onChange={event => setPartyDescription(event.target.value)} maxLength={240} placeholder="Tell people what to expect…" /></label><div className="party-form-label">Give your party a cover</div><div className="party-thumbnail-upload">{partyThumbnailPreview ? <img src={partyThumbnailPreview} alt="Party thumbnail preview" /> : <div className="party-thumbnail-placeholder" style={{ background: "linear-gradient(135deg, " + (partyStickerOptions.find(item => item.id === partyStickerId)?.colors[0] ?? "#312e81") + ", " + (partyStickerOptions.find(item => item.id === partyStickerId)?.colors[1] ?? "#c026d3") + ")" }}><span>{partyStickerOptions.find(item => item.id === partyStickerId)?.emoji ?? "🌌"}</span><small>YOUR PARTY COVER</small></div>}<label className="party-thumbnail-pick"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => { const file = event.target.files?.[0] ?? null; if (!file) return; if (file.size > 8 * 1024 * 1024) { setNotice("Choose an image under 8 MB."); event.currentTarget.value = ""; return; } if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { setNotice("Choose a JPG, PNG, WebP, or GIF image."); event.currentTarget.value = ""; return; } setPartyThumbnailFile(file); setPartyThumbnailPreview(URL.createObjectURL(file)); }} /><span>＋ Upload thumbnail</span></label>{partyThumbnailPreview && <button type="button" className="party-thumbnail-remove" onClick={() => { setPartyThumbnailFile(null); setPartyThumbnailPreview(null); }}>Remove image</button>}</div><div className="party-form-label">Or choose a party sticker</div><div className="party-sticker-box" role="group" aria-label="Choose a party sticker">{partyStickerOptions.map(sticker => <button key={sticker.id} type="button" className={"party-sticker-option " + (partyStickerId === sticker.id ? "selected" : "")} onClick={() => setPartyStickerId(sticker.id)} aria-pressed={partyStickerId === sticker.id} style={{ background: "linear-gradient(145deg, " + sticker.colors[0] + ", " + sticker.colors[1] + ")" }}><span>{sticker.emoji}</span><small>{sticker.label}</small>{partyStickerId === sticker.id && <i>✓</i>}</button>)}</div><label>Start date and time<input type="datetime-local" value={partyScheduledAt} min={localDateTimeInput(new Date(Date.now() + 5 * 60 * 1000))} onChange={event => setPartyScheduledAt(event.target.value)} required /></label><div className="party-form-label">Choose a format</div><div className="party-format-options"><button type="button" className={partyFormat === "video" ? "selected" : ""} onClick={() => setPartyFormat("video")}><Video size={19}/><b>Video</b><small>Face-to-face hangout</small></button><button type="button" className={partyFormat === "audio" ? "selected" : ""} onClick={() => setPartyFormat("audio")}><Mic size={19}/><b>Audio</b><small>Talk it out</small></button><button type="button" className={partyFormat === "watch" ? "selected" : ""} onClick={() => setPartyFormat("watch")}><Film size={19}/><b>Watch</b><small>Watch together</small></button></div><div className="party-form-label">Who can discover it?</div><div className="party-access-options"><button type="button" className={partyAccess === "public" ? "selected" : ""} onClick={() => setPartyAccess("public")}><Users size={18}/><span><b>Public</b><small>Discoverable and open for RSVP</small></span></button><button type="button" className={partyAccess === "private" ? "selected" : ""} onClick={() => setPartyAccess("private")}><LockKeyhole size={18}/><span><b>Private</b><small>Hidden from the public party list</small></span></button></div><div className="modal-footer"><small>{partyName.length}/70</small><button className="create-button" type="submit" disabled={partySubmitting || partyName.trim().length < 3 || !partyScheduledAt}>{partySubmitting ? "Publishing…" : "Publish party ↗"}</button></div></form></section></div>}
    {editProfileOpen && <div className="modal-backdrop" onClick={() => setEditProfileOpen(false)}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setEditProfileOpen(false)}>×</button><span className="eyebrow">MAKE IT YOURS</span><h2 id="edit-profile-title">Edit your <em>profile.</em></h2><form onSubmit={event => { event.preventDefault(); void saveProfile(); }}><label>Username<input value={usernameDraft} onChange={event => setUsernameDraft(event.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))} maxLength={24} minLength={3} required /><small>3–24 characters · letters, numbers, dots and underscores</small></label><label>Display name<input value={displayNameDraft} onChange={event => setDisplayNameDraft(event.target.value)} maxLength={60} required /></label><label>Bio<textarea value={bioDraft} onChange={event => setBioDraft(event.target.value)} maxLength={300} placeholder="A little about you…" /></label><label className="profile-privacy-setting"><span><b>Private account</b><small>Only approved followers can follow your private account.</small></span><input type="checkbox" checked={privacyDraft} onChange={event => setPrivacyDraft(event.target.checked)} /></label>{privacyDraft && <section className="follow-request-panel"><h3>Follow requests <span>{incomingFollowRequests.length}</span></h3>{incomingFollowRequests.length === 0 ? <p>No pending requests.</p> : incomingFollowRequests.map(request => <div className="follow-request-row" key={request.id}><div><b>{request.display_name}</b><small>@{request.username}</small></div><button type="button" className="outline-button" disabled={followRequestBusyId === request.id} onClick={() => void respondToFollowRequest(request.id, false)}>Decline</button><button type="button" className="create-button" disabled={followRequestBusyId === request.id} onClick={() => void respondToFollowRequest(request.id, true)}>{followRequestBusyId === request.id ? "Saving…" : "Approve"}</button></div>)}</section>}<div className="modal-footer"><small>{bioDraft.length}/300</small><button className="create-button" type="submit" disabled={profileSaving || !displayNameDraft.trim() || !usernameDraft.trim()}>{profileSaving ? "Saving…" : "Save profile ↗"}</button></div></form></section></div>}
    {createOpen && <div className="modal-backdrop" onClick={() => setCreateOpen(false)}><section className="create-modal media-editor-modal" role="dialog" aria-modal="true" aria-labelledby="create-title" onClick={e=>e.stopPropagation()}><button className="modal-close" type="button" onClick={()=>setCreateOpen(false)}>×</button><span className="eyebrow">ZEECHAT CREATOR STUDIO</span><h2 id="create-title">{mediaFile?.type.startsWith("video/")?"Make your Reel":"Create your post"}</h2><p className="editor-intro">Choose media, tune the look, crop it, add a sound, then share.</p>
<input ref={mediaPickerRef} className="editor-file-input" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0]??null;e.currentTarget.value="";if(!file)return;const video=file.type.startsWith("video/");const allowed=video?["video/mp4","video/webm","video/quicktime"]:["image/jpeg","image/png","image/webp","image/gif"];const limit=video?100*1024*1024:8*1024*1024;if(!allowed.includes(file.type)||file.size>limit){setNotice(video?"Choose an MP4, WebM or MOV video smaller than 100 MB.":"Choose a JPG, PNG, WebP or GIF photo smaller than 8 MB.");return;}setMediaFile(file);setPostKind(video?"reel":"post");if(!video){setSelectedSound(null);setAudioFile(null);setAudioStartSeconds(0);}setEditorFilter("none");setEditorZoom(1);setEditorRatio("original");setSelectedDraftId(null);setSelectedDraftPath(null);}} />
{!mediaFile?<button type="button" className="editor-gallery-pick" onClick={()=>mediaPickerRef.current?.click()}><span>＋</span><b>Choose from gallery</b><small>Photos go to Home · Videos go to Reels</small></button>:<div className="editor-preview-wrap"><div className={"editor-preview editor-ratio-"+editorRatio}><button type="button" className="editor-change-media" onClick={()=>mediaPickerRef.current?.click()}>Change media</button>{mediaPreview&&(mediaFile.type.startsWith("video/")?<video ref={editorVideoRef} src={mediaPreview} controls playsInline onPlay={e=>{const audio=editorAudioRef.current;if(audio){audio.currentTime=audioStartSeconds+e.currentTarget.currentTime;audio.play().catch(()=>{});}}} onPause={()=>editorAudioRef.current?.pause()} onSeeking={e=>{const audio=editorAudioRef.current;if(audio)audio.currentTime=audioStartSeconds+e.currentTarget.currentTime;}} onTimeUpdate={e=>{const audio=editorAudioRef.current;const video=e.currentTarget;if(audio&&!audio.paused&&Math.abs(audio.currentTime-(audioStartSeconds+video.currentTime))>0.45)audio.currentTime=audioStartSeconds+video.currentTime;}} style={{filter:editorFilterCss,transform:"scale("+editorZoom+")"}}/>:<Image src={mediaPreview} alt="Media preview" width={720} height={900} unoptimized style={{filter:editorFilterCss,transform:"scale("+editorZoom+")"}}/>)}{uploadProgress!==null&&<div className="editor-upload-overlay"><div className="upload-progress-ring" style={{background:"conic-gradient(#45d6a0 "+(uploadProgress*3.6)+"deg,#263a33 0deg)"}}><span>{uploadProgress}%</span></div><b>{uploadLabel||"Publishing…"}</b></div>}</div>
<div className="editor-tool-block"><b>Filters</b><div className="editor-filter-row">{[{id:"none",label:"Original"},{id:"warm",label:"Warm"},{id:"mono",label:"B&W"},{id:"vivid",label:"Vivid"},{id:"cool",label:"Cool"},{id:"fade",label:"Soft"}].map(item=><button type="button" key={item.id} className={editorFilter===item.id?"selected":""} onClick={()=>setEditorFilter(item.id)}>{item.label}</button>)}</div></div>
<div className="editor-controls-grid"><label>Crop ratio<select value={editorRatio} onChange={e=>setEditorRatio(e.target.value)}><option value="original">Original</option><option value="square">Square 1:1</option><option value="portrait">Portrait 4:5</option><option value="story">Story / Reel 9:16</option></select></label><label>Zoom crop · {Math.round(editorZoom*100)}%<input type="range" min="1" max="2.5" step=".05" value={editorZoom} onChange={e=>setEditorZoom(Number(e.target.value))}/></label></div></div>}
<label className="composer-field-label" htmlFor="post-caption">Caption</label>{mediaFile?.type.startsWith("video/") && <label className="atmosphere-location-optin" style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",margin:"12px 0",border:"1px solid var(--border, #dbe3ee)",borderRadius:14,background:"var(--surface-soft, #f8fafc)",fontSize:13}}><input type="checkbox" style={{marginTop:3,flex:"none"}} checked={atmosphereLocationEnabled} onChange={e=>setAtmosphereLocationEnabled(e.target.checked)} disabled={busy} /><span style={{display:"block"}}><b>Enable Creator’s Weather on this Reel</b><small style={{display:"block",marginTop:5,lineHeight:1.5,opacity:.75}}>Share this Reel’s location only to show live local weather effects. Your coordinates are not shown as a public address. Location is requested only when you publish with this enabled.</small></span></label>}<textarea id="post-caption" value={caption} onChange={e=>setCaption(e.target.value)} maxLength={2200} placeholder="Write something…" disabled={busy}/>
{(selectedSound||audioFile)&&mediaFile?.type.startsWith("video/")&&<div className="editor-audio-mix-controls"><div className="editor-audio-mix-heading"><b>Sound mix</b><small>Music is mixed into the exported Reel</small></div><label>Music start · {audioStartSeconds.toFixed(1)}s<input type="range" min="0" max="60" step="0.5" value={audioStartSeconds} onChange={e=>{setAudioStartSeconds(Number(e.target.value));if(editorAudioRef.current)editorAudioRef.current.currentTime=Number(e.target.value)+(editorVideoRef.current?.currentTime??0);}} disabled={busy}/></label><label>Music volume · {musicVolume}%<input type="range" min="0" max="100" step="5" value={musicVolume} onChange={e=>setMusicVolume(Number(e.target.value))} disabled={busy}/></label><label>Original video sound · {originalVolume}%<input type="range" min="0" max="100" step="5" value={originalVolume} onChange={e=>setOriginalVolume(Number(e.target.value))} disabled={busy}/></label></div>}{(selectedSound||audioFile)&&<audio ref={editorAudioRef} className="editor-audio-preview" src={selectedSound?.audio_url||audioPreviewUrl||undefined} loop preload="metadata" onLoadedMetadata={e=>{e.currentTarget.volume=musicVolume/100;e.currentTarget.currentTime=audioStartSeconds;}} />}
<div className="editor-sound-row"><label>Sound library<select value={selectedSound?.id??""} onChange={e=>{const found=sounds.find(sound=>sound.id===e.target.value)??null;setSelectedSound(found);setAudioFile(null);}} disabled={busy}><option value="">No library sound</option>{sounds.map(sound=><option key={sound.id} value={sound.id}>{sound.title}</option>)}</select></label><label className="editor-audio-pick">Or add audio<input type="file" accept="audio/*" disabled={busy||Boolean(selectedSound)} onChange={e=>{const file=e.currentTarget.files?.[0]??null;e.currentTarget.value="";if(file&&!file.type.startsWith("audio/")){setNotice("Choose an audio file.");return;}if(file&&file.size>25*1024*1024){setNotice("Choose audio smaller than 25 MB.");return;}setAudioFile(file);setSelectedSound(null);}}/></label>{(selectedSound||audioFile)&&<button type="button" className="editor-remove-sound" onClick={()=>{setSelectedSound(null);setAudioFile(null);}}>Remove sound</button>}</div>
{mediaFile&&<p className="editor-media-meta">{mediaFile.name} · {mediaFile.type.startsWith("video/")?"Video → Reel":"Photo → Home"}</p>}
{userId && <div className="reel-drafts-panel"><div className="reel-drafts-heading"><b>Reel drafts</b><small>{reelDrafts.length}/10 saved</small></div>{reelDrafts.length === 0 ? <p>Save a video draft to finish it later.</p> : reelDrafts.map(draft => <div className="reel-draft-row" key={draft.id}><div><b>{draft.caption.trim() || "Untitled Reel"}</b><small>{new Date(draft.updated_at).toLocaleDateString()} · Video draft</small></div><button type="button" className="outline-button" disabled={reelDraftBusy || busy} onClick={() => void openReelDraft(draft)}>Open</button><button type="button" className="outline-button" disabled={reelDraftBusy || busy} onClick={() => void deleteReelDraft(draft)}>Delete</button></div>)}</div>}<div className="modal-footer"><small>{caption.length}/2200</small>{mediaFile?.type.startsWith("video/") && <button type="button" className="outline-button" disabled={busy||reelDraftBusy} onClick={()=>void saveReelDraft()}>{reelDraftBusy?"Saving…":"Save Reel draft"}</button>}<button type="button" className="create-button" disabled={busy||reelDraftBusy||(!caption.trim()&&!mediaFile)} onClick={()=>void publish()}>{busy?(uploadLabel||"Publishing…"):"Share post ↗"}</button></div></section></div>}
  </main>;
}