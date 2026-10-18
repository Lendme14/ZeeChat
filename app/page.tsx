"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, CalendarClock, Check, CheckCheck, Compass, Film, Gamepad2, Heart, LockKeyhole, MessageCircle, Mic, MoreHorizontal, Paperclip, Plus, Search, Send, ShieldCheck, Smile, Sparkles, Users, UserRound, Video, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type View = "Home" | "Reels" | "Discover" | "Parties" | "Play" | "Chats" | "Profile";
type Post = { id: string; caption: string; created_at: string; author_id: string; post_type: string; media_url?: string | null; thumbnail_url?: string | null; };
type PostAuthor = { username: string; display_name: string; avatar_url?: string | null; };
type PostComment = { id: string; post_id: string; author_id: string; body: string; created_at: string; };
type ProfileSummary = { username: string; display_name: string; bio: string | null; };
type LiveMessage = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
type InboxConversation = { id: string; otherUserId: string; username: string; displayName: string; avatarUrl: string | null; lastMessage: string; lastAt: string | null };
const sampleReels = [
  { user: "mira.moves", caption: "POV: the group chat finally makes it outside 😂✨", tags: "#goodvibes #weekendenergy", sound: "original audio · Mira", image: "photo-1533174072545-7a4b6ad7a6c3", likes: "24.8K", comments: "1,204", initial: "M" },
  { user: "jaycreates", caption: "When the beat drops and nobody is ready 🔥", tags: "#dancebreak #zeevibes", sound: "Late Night Bounce · DJ K", image: "photo-1501386761578-eac5c94b800a", likes: "18.2K", comments: "936", initial: "J" },
  { user: "tomi.laughs", caption: "Tag the friend who would absolutely do this 😭", tags: "#relatable #friendship", sound: "comedy loop · ZeeSounds", image: "photo-1527529482837-4698179dc6ce", likes: "31.6K", comments: "2,087", initial: "T" },
];
const nav: { name: View; icon: typeof Film }[] = [
  { name: "Home", icon: Film }, { name: "Reels", icon: Video }, { name: "Discover", icon: Compass }, { name: "Parties", icon: Users }, { name: "Play", icon: Gamepad2 }, { name: "Chats", icon: MessageCircle }, { name: "Profile", icon: UserRound },
];

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
  const [partyFormat, setPartyFormat] = useState<"video" | "audio" | "watch">("video");
  const [partyAccess, setPartyAccess] = useState<"public" | "private">("public");
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [postKind, setPostKind] = useState<"post" | "reel">("post");
  const [activeReelPostId, setActiveReelPostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postAuthors, setPostAuthors] = useState<Record<string, PostAuthor>>({});
  const [postLikeCounts, setPostLikeCounts] = useState<Record<string, number>>({});
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
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeChat, setActiveChat] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<{username:string;initial:string}|null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [demoMessages, setDemoMessages] = useState<{id:number; text:string; mine:boolean; time:string}[]>([
    { id: 1, text: "Hey! Are you free later?", mine: false, time: "10:42 AM" },
    { id: 2, text: "Yes, I’m free! What’s the plan?", mine: true, time: "10:43 AM" },
    { id: 3, text: "I was thinking we could catch up and share some ideas.", mine: false, time: "10:44 AM" },
    { id: 4, text: "That sounds good 😊", mine: true, time: "10:45 AM" },
  ]);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const liveReels = posts.filter(post => (post.post_type === "reel" || post.post_type === "video") && Boolean(post.media_url));
  const selectedLiveReel = activeReelPostId ? liveReels.find(post => post.id === activeReelPostId) : undefined;
  const reel = selectedLiveReel ? { user: postAuthors[selectedLiveReel.author_id]?.username || "zeechatter", caption: selectedLiveReel.caption, tags: "", sound: "original audio", image: "", likes: "0", comments: "0", initial: (postAuthors[selectedLiveReel.author_id]?.display_name || "Z").slice(0, 1).toUpperCase(), mediaUrl: selectedLiveReel.media_url || "", postId: selectedLiveReel.id } : { ...sampleReels[index], mediaUrl: "", postId: "" };

  useEffect(() => {
    if (!mediaFile) { setMediaPreview(null); return; }
    const url = URL.createObjectURL(mediaFile);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  function handleReelTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
    touchStartY.current = event.changedTouches[0]?.clientY ?? null;
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
    if (Math.abs(dy) >= 28 && Math.abs(dy) > Math.abs(dx) * 1.05) {
      setIndex(current => Math.max(0, Math.min(sampleReels.length - 1, current + (dy < 0 ? 1 : -1))));
    } else if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      setIndex(current => Math.max(0, Math.min(sampleReels.length - 1, current + (dx < 0 ? 1 : -1))));
    }
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
          const { data: profileData } = await supabase.from("zeechat_profiles").select("username,display_name,bio").eq("user_id", user.id).maybeSingle();
          if (active && profileData) setProfile(profileData as ProfileSummary);
          else if (active) setProfile(null);
        } else {
          setProfile(null);
          setInboxConversations([]);
          setActiveConversationId(null);
          setActiveChat(false);
        }
      };
      supabase.auth.getUser().then(({ data }) => syncAuthUser(data.user ?? null));
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        void syncAuthUser(session?.user ?? null);
      });
      unsubscribeAuth = () => authListener.subscription.unsubscribe();
      supabase.from("zeechat_posts").select("id,caption,created_at,author_id,post_type,media_url,thumbnail_url").eq("visibility", "public").order("created_at", { ascending: false }).limit(10)
        .then(async ({ data, error }) => {
          if (!active) return;
          if (error) { setNotice("Connect Supabase to load live posts."); return; }
          const loadedPosts = (data ?? []) as Post[];
          setPosts(loadedPosts);
          if (!loadedPosts.length) return;
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


  async function loadInbox(currentUserId: string) {
    try {
      const supabase = createClient();
      const { data: memberships, error } = await supabase.from("zeechat_conversation_members").select("conversation_id").eq("user_id", currentUserId);
      if (error) throw error;
      const conversationIds = [...new Set((memberships ?? []).map(row => row.conversation_id as string))];
      if (!conversationIds.length) { setInboxConversations([]); return; }
      const { data: members, error: memberError } = await supabase.from("zeechat_conversation_members").select("conversation_id,user_id").in("conversation_id", conversationIds).neq("user_id", currentUserId);
      if (memberError) throw memberError;
      const otherIds = [...new Set((members ?? []).map(row => row.user_id as string))];
      const { data: profiles, error: profileError } = await supabase.from("zeechat_profiles").select("user_id,username,display_name,avatar_url").in("user_id", otherIds);
      if (profileError) throw profileError;
      const { data: messages, error: messageError } = await supabase.from("zeechat_messages").select("id,conversation_id,sender_id,body,created_at").in("conversation_id", conversationIds).order("created_at", { ascending: false });
      if (messageError) throw messageError;
      const latest: Record<string, LiveMessage> = {}; for (const message of (messages ?? []) as LiveMessage[]) if (!latest[message.conversation_id]) latest[message.conversation_id] = message;
      const profileById: Record<string, {username:string;display_name:string;avatar_url:string|null}> = {}; for (const p of profiles ?? []) profileById[p.user_id] = p;
      setInboxConversations((members ?? []).map(member => { const p=profileById[member.user_id]; const last=latest[member.conversation_id]; return {id:member.conversation_id,otherUserId:member.user_id,username:p?.username ?? "member",displayName:p?.display_name ?? "ZeeChat member",avatarUrl:p?.avatar_url ?? null,lastMessage:last?.body ?? "Say hello 👋",lastAt:last?.created_at ?? null}; }).filter((item,index,all)=>all.findIndex(other=>other.id===item.id)===index).sort((a,b)=>(b.lastAt ?? "").localeCompare(a.lastAt ?? "")));
    } catch (error) { console.error("Unable to load ZeeChat inbox", error); }
  }

  async function openLiveConversation(targetUserId: string, targetUsername: string, targetInitial: string) {
    if (!userId) { setNotice("Sign in to start a conversation."); return; }
    if (targetUserId === userId) { setNotice("This is your own profile."); return; }
    setChatLoading(true);
    try {
      const supabase=createClient();
      const { data: conversationId, error } = await supabase.rpc("zeechat_start_conversation", { target_user: targetUserId });
      if (error) throw error;
      const id=conversationId as string;
      const { data: messages, error: messageError } = await supabase.from("zeechat_messages").select("id,conversation_id,sender_id,body,created_at").eq("conversation_id",id).order("created_at",{ascending:true});
      if (messageError) throw messageError;
      setActiveConversationId(id); setLiveMessages((messages ?? []) as LiveMessage[]); setSelectedCreator({username:targetUsername,initial:targetInitial}); setActiveChat(true); setView("Chats"); setNotice("");
      await loadInbox(userId);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not open this conversation. Please try again."); } finally { setChatLoading(false); }
  }

  async function sendLiveMessage() {
    const body=chatDraft.trim(); if(!body || !activeConversationId || !userId) return;
    const optimistic: LiveMessage={id:crypto.randomUUID(),conversation_id:activeConversationId,sender_id:userId,body,created_at:new Date().toISOString()};
    setLiveMessages(current=>[...current,optimistic]); setChatDraft("");
    try {
      const supabase=createClient(); const { data, error }=await supabase.from("zeechat_messages").insert({conversation_id:activeConversationId,sender_id:userId,body}).select("id,conversation_id,sender_id,body,created_at").single();
      if(error) throw error; setLiveMessages(current=>current.map(message=>message.id===optimistic.id ? data as LiveMessage : message)); await loadInbox(userId);
    } catch(error) { setLiveMessages(current=>current.filter(message=>message.id!==optimistic.id)); setChatDraft(body); setNotice(error instanceof Error ? `Message not sent: ${error.message}` : "Message not sent. Check your connection and try again."); }
  }

  function openProfileEditor() {
    setDisplayNameDraft(profile?.display_name ?? "");
    setBioDraft(profile?.bio ?? "");
    setEditProfileOpen(true);
  }

  async function saveProfile() {
    if (!userId) { setNotice("Sign in to edit your profile."); return; }
    const displayName = displayNameDraft.trim();
    const bio = bioDraft.trim();
    if (!displayName) { setNotice("Please enter a display name."); return; }
    setProfileSaving(true);
    try {
      const { data, error } = await createClient().from("zeechat_profiles").update({ display_name: displayName, bio: bio || null }).eq("user_id", userId).select("username,display_name,bio").single();
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
      if (postKind === "reel" && !mediaFile?.type.startsWith("video/")) throw new Error("Choose a video to publish a Reel.");
      const { data: createdPost, error } = await supabase.from("zeechat_posts").insert({ author_id: userId, caption: caption.trim(), post_type: publishedType === "text" ? "text" : (postKind === "reel" ? "reel" : publishedType), media_url: mediaUrl, thumbnail_url: thumbnailUrl, visibility: "public" }).select("id").single();
      if (error) throw error;
      postInserted = true;
      setUploadProgress(null); setUploadLabel("");
      setCaption(""); setMediaFile(null); setPostKind("post"); setNotice(postKind === "reel" ? "Your Reel is live and its thumbnail is on Home!" : "Your post is live!");
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
      if (postKind === "reel" && createdPost) { setActiveReelPostId(createdPost.id); setView("Reels"); }
    } catch (error) {
      if (!postInserted && uploadedPaths.length) await supabase.storage.from("zeechat-media").remove(uploadedPaths).catch(() => undefined);
      setUploadProgress(null); setUploadLabel("");
      setNotice(error instanceof Error ? error.message : "Could not publish. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-mark">z</span><span>Zee<b>Chat</b></span></a>
      <p className="side-label">YOUR SPACE</p>
      {nav.map(({ name, icon: Icon }) => <button key={name} className={view === name ? "nav-link active" : "nav-link"} onClick={() => setView(name)}><Icon size={19}/><span>{name}</span>{name === "Chats" && <i className="unread"/>}</button>)}
      <div className="sidebar-bottom"><div className="sidebar-promo"><Sparkles size={18}/><b>Make a little magic.</b><p>Your next favourite memory starts with a hello.</p><button onClick={() => setCreateOpen(true)}>Create something <Plus size={15}/></button></div><small>© 2026 ZeeChat · Good vibes only</small></div>
    </aside>
    <section className="main-column">

      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {uploadProgress !== null && <div className="upload-progress-card" role="status" aria-live="polite">
        <div className="upload-progress-ring" style={{background: `conic-gradient(#45d6a0 ${uploadProgress * 3.6}deg, #263a33 0deg)`}} aria-label={`Upload ${uploadProgress}% complete`}><span>{uploadProgress}%</span></div>
        <div className="upload-progress-copy"><b>{uploadLabel || "Publishing your video…"}</b><small>You can keep browsing ZeeChat while this finishes.</small><div className="upload-progress-track"><span style={{width: uploadProgress + "%"}}/></div></div>
      </div>}
      {view === "Home" && <section className="home-feed-view"><div className="home-feed-heading"><div><span className="eyebrow">YOUR COMMUNITY</span><h1>Home <span className="home-heading-chevron">⌄</span></h1></div><div className="home-feed-actions"><button className="home-watch-reels" onClick={() => setView("Reels")}><Video size={16}/><span>Reels</span></button><button aria-label="Search" onClick={() => setView("Discover")}><Search size={19}/></button><button aria-label="Notifications" onClick={() => setNotice("Notifications will appear here when activity alerts are connected.")}><Sparkles size={18}/></button></div></div><div className="home-story-strip"><button className="home-story-add" onClick={() => setCreateOpen(true)}><span>＋</span><small>Your story</small></button>{[{name:"Karma Hossain",initial:"K"},{name:"Mira James",initial:"M"},{name:"Jay Creates",initial:"J"},{name:"Tomi Laughs",initial:"T"},{name:"Amara",initial:"A"},{name:"David",initial:"D"}].map((person,i)=><button key={person.name} className="home-story" onClick={() => setNotice("Stories are a visual preview and are not published yet.")}><span className={"home-story-avatar tone-"+i}>{person.initial}</span><small>{person.name.split(" ")[0]}</small></button>)}</div><section className="live-feed"><div className="feed-heading"><div><span className="eyebrow">FROM THE COMMUNITY</span><h2>Fresh on ZeeChat</h2></div><span>{posts.length} posts</span></div>{posts.length ? posts.map(p => <article className="post-card" key={p.id}><div className="post-avatar">{postAuthors[p.author_id]?.avatar_url ? <img className="post-avatar-image" src={postAuthors[p.author_id].avatar_url!} alt="" /> : (postAuthors[p.author_id]?.display_name?.[0] || postAuthors[p.author_id]?.username?.[0] || "z").toUpperCase()}</div><div className="post-body"><b>{postAuthors[p.author_id]?.display_name || postAuthors[p.author_id]?.username || "ZeeChat member"} <span className="post-username">{postAuthors[p.author_id]?.username ? `@${postAuthors[p.author_id].username}` : ""}</span></b><small>{new Date(p.created_at).toLocaleString()}</small>{p.caption && <p>{p.caption}</p>}{p.post_type === "reel" && p.media_url ? <button type="button" className="home-reel-thumbnail" onClick={() => { setActiveReelPostId(p.id); setView("Reels"); }} aria-label="Play Reel"><img className="community-post-image" src={p.thumbnail_url || p.media_url} alt="Reel thumbnail" loading="lazy" /><span className="home-reel-play"><Video size={25} fill="currentColor"/></span><small>PLAY REEL</small></button> : p.media_url && p.post_type !== "video" ? <img className="community-post-image" src={p.media_url} alt="Image shared in a ZeeChat post" loading="lazy" /> : null}<div className="post-actions"><button className={likedPostIds.includes(p.id) ? "post-like liked" : "post-like"} disabled={likeBusyIds.includes(p.id)} aria-label={likedPostIds.includes(p.id) ? "Unlike post" : "Like post"} onClick={() => togglePostLike(p.id)}><Heart size={16} fill={likedPostIds.includes(p.id) ? "currentColor" : "none"}/><span>{postLikeCounts[p.id] ?? 0}</span></button><button className="post-like" onClick={() => toggleComments(p.id)}><MessageCircle size={16}/><span>{commentCounts[p.id] ?? 0}</span><span>{openCommentPostIds.includes(p.id) ? "Hide comments" : "Comments"}</span></button></div>{openCommentPostIds.includes(p.id) && <div className="comments-panel">{(commentsByPost[p.id] ?? []).map(comment => <div className="comment-row" key={comment.id}><span className="comment-avatar">z</span><div><small>{comment.author_id === userId ? "You" : "Community member"} · {new Date(comment.created_at).toLocaleString()}</small><p>{comment.body}</p></div></div>)}<form className="comment-form" onSubmit={event => { event.preventDefault(); void submitComment(p.id); }}><input aria-label="Write a comment" maxLength={1000} value={commentDrafts[p.id] ?? ""} onChange={event => setCommentDrafts(current => ({ ...current, [p.id]: event.target.value }))} placeholder="Add a kind comment…" /><button disabled={commentBusyIds.includes(p.id) || !(commentDrafts[p.id] ?? "").trim()} type="submit">{commentBusyIds.includes(p.id) ? "Posting…" : "Send"}</button></form></div>}</div></article>) : <p className="muted">No community posts yet. Be the first to share something.</p>}</section></section>}
      {view === "Reels" && <section className="reels-view immersive-reels">
        <div className="reel-layout"><div key={reel.user} className="reel-player reel-enter" data-reel-index={index} onTouchStart={handleReelTouchStart} onTouchEnd={handleReelTouchEnd} onWheel={event => { if (Math.abs(event.deltaY) < 18) return; const now = Date.now(); if (now - lastWheelAt.current < 520) return; lastWheelAt.current = now; setIndex(current => Math.max(0, Math.min(sampleReels.length - 1, current + (event.deltaY > 0 ? 1 : -1)))); }} onKeyDown={event => { if (event.key === "ArrowDown") setIndex(current => (current + 1) % sampleReels.length); if (event.key === "ArrowUp") setIndex(current => (current - 1 + sampleReels.length) % sampleReels.length); }} tabIndex={0} aria-label="Reel viewer. Swipe up or down to change videos." style={!reel.mediaUrl ? { backgroundImage: `linear-gradient(0deg,#08070ddf,transparent 55%,#08070d55),url(https://images.unsplash.com/${reel.image}?auto=format&fit=crop&w=1000&q=85)` } : undefined}>{reel.mediaUrl && <video className="live-reel-video" src={reel.mediaUrl} controls autoPlay playsInline loop poster={selectedLiveReel?.thumbnail_url || undefined} onClick={event => event.stopPropagation()} /> }
          <div className="immersive-reel-header"><div className="immersive-brand"><span className="immersive-brand-mark">z</span><span>Zee<b>Chat</b></span></div><div className="reel-feed-tabs" role="group" aria-label="Reel feed"><button onClick={() => setNotice("Following feed will be available when creator follows are connected.")}>Following</button><button className="selected" aria-current="page">For You</button><button onClick={() => setView("Parties")}>Live</button></div><button className="immersive-search" aria-label="Search ZeeChat" onClick={() => setView("Discover")}><Search size={21}/></button></div><button className="sound-button" aria-label="Sound muted"><VolumeX size={18}/></button>
          <div className="reel-caption"><div className="creator-row"><div className="creator-name-line"><b>@{reel.user}</b><ShieldCheck size={13} aria-label="Creator badge"/></div><small>Creator · 2h ago</small></div><p>{reel.caption}</p><strong>{reel.tags}</strong><small className="sound-line">♫ &nbsp;{reel.sound}</small></div>
        </div><div className="reel-actions"><div className="reel-creator-action"><button type="button" className="creator-avatar creator-profile-trigger" aria-label={`View @${reel.user} profile`} onClick={() => {setSelectedCreator({username:reel.user,initial:reel.initial});setView("Profile");}}>{reel.initial}</button><button className="rail-follow-button" aria-label={following.includes(index) ? "Unfollow creator" : "Follow creator"} onClick={() => setFollowing(a => a.includes(index) ? a.filter(x => x !== index) : [...a, index])}>{following.includes(index) ? "✓" : "+"}</button></div><button onClick={() => setLiked(a => a.includes(index) ? a.filter(x => x !== index) : [...a, index])} className={liked.includes(index) ? "liked" : ""} aria-label="Like reel"><span className="action-circle"><Heart size={22} fill={liked.includes(index) ? "currentColor" : "none"}/></span><b>{liked.includes(index) ? "24.9K" : reel.likes}</b></button><button onClick={() => setNotice("Comments will be connected to live posts in the next pass.")} aria-label="View comments"><span className="action-circle"><MessageCircle size={22}/></span><b>{reel.comments}</b></button><button onClick={() => setNotice("Sharing is coming soon.")} aria-label="Share reel"><span className="action-circle"><Send size={20}/></span><b>Share</b></button><button onClick={() => setNotice("More reel options will be available when creator tools are connected.")} aria-label="More options"><span className="action-circle"><MoreHorizontal size={21}/></span></button></div></div>
        
        
      </section>}
{view === "Discover" && <section className="content-view discover-view"><div className="discover-heading"><div><span className="eyebrow">YOUR NEXT FAVOURITE THING</span><h1>Find your <em>people.</em></h1><p>Discover creators and vibes.</p></div><button className="discover-search-action" aria-label="Search ZeeChat" onClick={() => setNotice("Search across creators and conversations is being connected.")}><Search size={19}/></button></div><h2 className="discover-section-title">Trending topics</h2><div className="discover-category-grid">{[["😂","Comedy"],["🎧","Music"],["🎮","Gaming"],["🎬","Movies"],["🎤","Creators"],["🎉","Parties"]].map(([emoji,label])=><button type="button" className="discover-category" key={label} onClick={() => label === "Parties" ? setView("Parties") : setNotice(label + " discovery is coming soon. Recommendations are preview content.")}><span className="discover-category-icon" aria-hidden="true">{emoji}</span><span>{label}</span><span className="discover-category-arrow" aria-hidden="true">↗</span></button>)}</div><h2 className="discover-section-title discover-live-title">Live creators</h2><div className="discover-live-placeholder"><span className="discover-live-dot"/>Live creator discovery is coming soon.</div><h2 className="discover-section-title">Recommended for you</h2><p className="discover-recommendation-note">Personalized recommendations will appear here as ZeeChat’s community grows.</p></section>}
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
      {view === "Play" && <section className="content-view"><span className="eyebrow">BOREDOM DOESN&apos;T LIVE HERE</span><h1>Let&apos;s <em>play.</em></h1><p>Little games, big laughs, and people to share them with.</p><div className="feature-grid">{[["🧠","Quickfire Trivia","5 questions. How sharp are you?"],["😂","Caption This","Make the funniest caption win."],["🎤","Voice Room Roulette","Meet people around shared interests."]].map(x=><article className="feature-card" key={x[1]}><div className="feature-emoji">{x[0]}</div><h3>{x[1]}</h3><p>{x[2]}</p><button onClick={() => setNotice("This activity is a UI preview; scoring and rewards are not yet connected.")}>Join activity ↗</button></article>)}</div></section>}
      {view === "Chats" && <section className={activeChat ? "content-view chat-view chat-detail-view" : "content-view chat-view"}>{activeChat ? <><header className="chat-detail-header"><button className="chat-back-button" onClick={() => {setActiveChat(false);setActiveConversationId(null);void loadInbox(userId ?? "");}} aria-label="Back to messages"><ArrowLeft size={20}/></button><button className="chat-contact" onClick={() => setNotice("Mira’s profile details will appear here when profiles and messaging are connected.")}><span className="chat-contact-avatar">M<i/></span><span><b>{selectedCreator?.username ?? "Conversation"}</b><small><i/> Direct message</small></span></button><button className="chat-more-button" onClick={() => setNotice("Conversation options: View profile, Search chat, Mute, Block and Report will be added with live messaging.")} aria-label="Conversation options"><MoreHorizontal size={22}/></button></header><div className="chat-timeline" aria-label="Conversation messages"><div className="chat-date-divider"><span>Today</span></div>{liveMessages.map(message=><div className={"chat-message-row "+(message.sender_id===userId ? "mine" : "theirs")} key={message.id}><div className="chat-message-content"><div className="chat-bubble">{message.body}</div><div className="chat-message-meta"><time>{new Date(message.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time>{message.sender_id===userId && <Check size={13}/>}</div></div></div>)}{!liveMessages.length && <p className="chat-first-message">You’re connected. Send the first message.</p>}</div><form className="chat-composer" onSubmit={event => {event.preventDefault(); void sendLiveMessage();}}><button type="button" className="chat-attach-button" aria-label="Attachment options" onClick={() => setNotice("Photo, video and file attachments will be available when chat storage is connected.")}><Paperclip size={20}/></button><textarea rows={1} aria-label="Write a message" placeholder="Message ZeeChat…" value={chatDraft} maxLength={4000} onChange={event=>setChatDraft(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/><button type="button" className="chat-emoji-button" aria-label="Emoji" onClick={()=>setChatDraft(draft=>draft+"😊")}><Smile size={19}/></button><button type="submit" className="chat-send-button" disabled={!chatDraft.trim()} aria-label="Send message"><Send size={18}/></button></form></> : <><div className="chat-heading"><div><span className="eyebrow">YOUR PEOPLE, YOUR SPACE</span><h1>Messages</h1><p>Keep good conversations going.</p></div><button className="chat-compose" onClick={() => setNotice("New conversations will be available when messaging is connected.")} aria-label="New message"><Plus size={20}/></button></div><div className="chat-search"><Search size={17}/><input aria-label="Search conversations" placeholder="Search conversations…" onChange={event => setNotice(event.target.value ? "Inbox search will work once conversations are connected." : "")}/></div><div className="chat-filter-row"><button className="chat-filter-active">All messages</button><button onClick={() => setNotice("Unread filtering will be available with live messaging.")}>Unread</button><button onClick={() => setNotice("Requests will appear when messaging is connected.")}>Requests</button></div>{inboxConversations.length ? <div className="chat-live-inbox">{inboxConversations.map(item=><button type="button" className="chat-demo-thread" key={item.id} onClick={()=>{setSelectedCreator({username:item.username,initial:(item.displayName[0]||"Z").toUpperCase()});setActiveConversationId(item.id);setActiveChat(true);const supabase=createClient();void supabase.from("zeechat_messages").select("id,conversation_id,sender_id,body,created_at").eq("conversation_id",item.id).order("created_at",{ascending:true}).then(({data,error})=>{if(error)setNotice("Could not load messages.");else setLiveMessages((data??[]) as LiveMessage[]);});}}><span className="chat-contact-avatar">{item.avatarUrl ? <Image src={item.avatarUrl} alt="" width={44} height={44}/> : (item.displayName[0]||"Z").toUpperCase()}<i/></span><span className="chat-demo-thread-copy"><b>{item.displayName}<small>{item.lastAt ? new Date(item.lastAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : ""}</small></b><span>{item.lastMessage}</span></span></button>)}</div> : <div className="chat-inbox-empty"><div className="chat-empty-art"><MessageCircle size={29}/></div><h2>No conversations yet</h2><p>Visit a creator’s profile and tap Message to start a real conversation.</p><button onClick={() => setView("Discover")}>Discover people <span>→</span></button></div>}</>}</section>}
      {view === "Profile" && selectedCreator ? <section className="content-view profile-view creator-preview-view"><button className="creator-preview-back" onClick={() => {setSelectedCreator(null);setView("Reels");}}><ArrowLeft size={17}/> Back to Reels</button><div className="profile-cover"><span>✦ GOOD ENERGY ONLY</span></div><div className="profile-summary"><div className="profile-avatar">{selectedCreator.initial}</div><h1>@{selectedCreator.username}</h1><p>Creator on ZeeChat</p><div className="creator-preview-actions"><button className="create-button" onClick={async () => { const supabase=createClient(); const {data:creator,error}=await supabase.from("zeechat_profiles").select("user_id,username,display_name").eq("username",selectedCreator.username).maybeSingle(); if(error){setNotice("Could not look up this creator right now.");return;} if(!creator){setNotice("This sample Reel creator is not linked to a real ZeeChat account yet.");return;} await openLiveConversation(creator.user_id,creator.username,selectedCreator.initial); }}>Message</button><button className="outline-button" onClick={() => setNotice("Follow status will be connected to real creator profiles.")}>Follow</button></div><p className="creator-preview-note">Sample creator profile · Real profiles and message permissions are not connected yet.</p></div></section> : view === "Profile" && <section className="content-view profile-view"><div className="profile-cover"><span>✦ GOOD ENERGY ONLY</span></div><div className="profile-summary"><div className="profile-avatar">{userId ? (profile?.display_name?.[0] || profile?.username?.[0] || "Z").toUpperCase() : "z"}</div>{userId ? <button className="outline-button" onClick={openProfileEditor}>Edit profile</button> : <a href="/login" className="outline-button">Sign in</a>}<h1>{userId ? (profile?.display_name || profile?.username || (userEmail ? userEmail.split("@")[0] : "Your profile")) : "Your profile"}</h1><p>{userId ? (profile?.username ? `@${profile.username}` : "You’re signed in. Your profile is being set up.") : "Sign in to personalize your space."}</p>{userId && profile?.bio && <p>{profile.bio}</p>}{userId && <div className="profile-stats"><div><b>{posts.filter(post => post.author_id === userId).length}</b><small>Posts</small></div></div>}</div>{!userId ? <div className="profile-empty-state"><span className="profile-empty-icon"><UserRound size={25}/></span><h2>Your space is waiting</h2><p>Sign in to share videos, follow creators, and connect with your people.</p><div className="profile-empty-actions"><a className="create-button" href="/login">Sign in</a><a className="outline-button" href="/signup">Create account</a></div></div> : <><div className="profile-content-tabs"><button className="selected">Posts</button><button onClick={() => setNotice("Your video gallery will appear here when video publishing is connected.")}>Videos</button><button onClick={() => setNotice("Likes analytics will be available when profile analytics are connected.")}>Likes</button></div>{posts.filter(post => post.author_id === userId).length === 0 ? <div className="profile-empty-state"><span className="profile-empty-icon"><Plus size={25}/></span><h2>Your story starts here</h2><p>Share your first post with the community.</p><button className="create-button" onClick={() => setCreateOpen(true)}>Create your first post <Plus size={16}/></button></div> : <div className="profile-post-list">{posts.filter(post => post.author_id === userId).map(post => <article className="profile-post-item" key={post.id}>{post.media_url && <Image src={post.media_url} alt="Your post" width={640} height={480}/>}<p>{post.caption}</p></article>)}</div>}</>}</section>}
    </section>
    <nav className="mobile-nav">{[{name:"Home" as View,icon:Film,label:"Home"},{name:"Discover" as View,icon:Compass,label:"Discover"},{name:"Chats" as View,icon:MessageCircle,label:"Messages"},{name:"Profile" as View,icon:UserRound,label:"Profile"}].map(({name,icon:Icon,label})=><button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)}><Icon size={19}/><span>{label}</span></button>)}<button className="post-nav-button" onClick={() => setCreateOpen(true)} aria-label="Create a post" title="Create a post"><span className="post-nav-orbit"><Plus size={27}/></span><span>Post</span></button></nav>
    {partyCreateOpen && <div className="modal-backdrop" onClick={() => setPartyCreateOpen(false)}><section className="create-modal party-create-modal" role="dialog" aria-modal="true" aria-labelledby="party-create-title" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setPartyCreateOpen(false)} aria-label="Close party setup">×</button><span className="eyebrow">MAKE IT A MOMENT</span><h2 id="party-create-title">Create your <em>party.</em></h2><p>Set up your room details. Party creation is currently a design preview; it won&apos;t publish a live room yet.</p><form onSubmit={event => { event.preventDefault(); setPartyCreateOpen(false); setNotice("Party setup preview saved locally. Connect the party backend to publish a real room."); }}><label>Party name<input value={partyName} onChange={event => setPartyName(event.target.value)} maxLength={70} placeholder="e.g. Friday Night Hangout" required /></label><label>What’s the vibe?<textarea value={partyDescription} onChange={event => setPartyDescription(event.target.value)} maxLength={240} placeholder="Tell people what to expect…" /></label><div className="party-form-label">Choose a format</div><div className="party-format-options"><button type="button" className={partyFormat === "video" ? "selected" : ""} onClick={() => setPartyFormat("video")}><Video size={19}/><b>Video</b><small>Face-to-face hangout</small></button><button type="button" className={partyFormat === "audio" ? "selected" : ""} onClick={() => setPartyFormat("audio")}><Mic size={19}/><b>Audio</b><small>Talk it out</small></button><button type="button" className={partyFormat === "watch" ? "selected" : ""} onClick={() => setPartyFormat("watch")}><Film size={19}/><b>Watch</b><small>Watch together</small></button></div><div className="party-form-label">Who can join?</div><div className="party-access-options"><button type="button" className={partyAccess === "public" ? "selected" : ""} onClick={() => setPartyAccess("public")}><Users size={18}/><span><b>Public</b><small>Anyone can discover and join</small></span></button><button type="button" className={partyAccess === "private" ? "selected" : ""} onClick={() => setPartyAccess("private")}><LockKeyhole size={18}/><span><b>Private</b><small>Invite-only room</small></span></button></div><div className="modal-footer"><small>{partyName.length}/70</small><button className="create-button" type="submit" disabled={!partyName.trim()}>Preview party ↗</button></div></form></section></div>}
    {editProfileOpen && <div className="modal-backdrop" onClick={() => setEditProfileOpen(false)}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setEditProfileOpen(false)}>×</button><span className="eyebrow">MAKE IT YOURS</span><h2 id="edit-profile-title">Edit your <em>profile.</em></h2><form onSubmit={event => { event.preventDefault(); void saveProfile(); }}><label>Display name<input value={displayNameDraft} onChange={event => setDisplayNameDraft(event.target.value)} maxLength={60} required /></label><label>Bio<textarea value={bioDraft} onChange={event => setBioDraft(event.target.value)} maxLength={300} placeholder="A little about you…" /></label><div className="modal-footer"><small>{bioDraft.length}/300</small><button className="create-button" type="submit" disabled={profileSaving || !displayNameDraft.trim()}>{profileSaving ? "Saving…" : "Save profile ↗"}</button></div></form></section></div>}
    {createOpen && <div className="modal-backdrop" onClick={() => setCreateOpen(false)}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setCreateOpen(false)}>×</button><h2 id="create-title">Create a post</h2><label className="composer-field-label" htmlFor="post-caption">What’s on your mind?</label><textarea id="post-caption" value={caption} onChange={e => setCaption(e.target.value)} maxLength={2200} placeholder="Write something…" /><div className="composer-kind-switch" role="group" aria-label="Post type"><button type="button" className={postKind === "post" ? "selected" : ""} onClick={() => setPostKind("post")}>Post</button><button type="button" className={postKind === "reel" ? "selected" : ""} onClick={() => { setPostKind("reel"); setMediaFile(null); }}>Reel video</button></div><label className="media-upload-label"><span className="upload-plus">＋</span><span><b>{mediaFile ? mediaFile.name : postKind === "reel" ? "Choose a Reel video" : "Add photo or video"}</b><small>{postKind === "reel" ? "MP4, WebM or MOV · Up to 100 MB" : "Images up to 8 MB or videos up to 100 MB"}</small></span><input type="file" accept={postKind === "reel" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"} onChange={e => { const file = e.target.files?.[0] ?? null; if (!file) return; const isVideo = file.type.startsWith("video/"); const limit = isVideo ? 100 * 1024 * 1024 : 8 * 1024 * 1024; if (file.size > limit) { setNotice(isVideo ? "Choose a video smaller than 100 MB." : "Choose an image smaller than 8 MB."); e.target.value = ""; setMediaFile(null); return; } if (postKind === "reel" && !isVideo) { setNotice("Choose a video file for a Reel."); e.target.value = ""; return; } setMediaFile(file); if (isVideo) setPostKind("reel"); }} /></label>{mediaFile && <div className="composer-image-preview">{mediaPreview && (mediaFile.type.startsWith("video/") ? <video src={mediaPreview} controls playsInline /> : <Image src={mediaPreview} alt="Selected post preview" width={640} height={480} unoptimized />)}<div><small>{mediaFile.name}</small><button type="button" onClick={() => setMediaFile(null)}>Remove media</button></div></div>}<div className="modal-footer"><small>{caption.length}/2200</small><button className="create-button" disabled={busy || (!caption.trim() && !mediaFile)} onClick={publish}>{busy ? "Publishing…" : "Publish post"}</button></div></section></div>}
  </main>;
}