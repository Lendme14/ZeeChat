"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CalendarClock, Compass, Film, Gamepad2, Heart, LockKeyhole, MessageCircle, Mic, Plus, Search, Send, ShieldCheck, Sparkles, Users, UserRound, Video, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type View = "Reels" | "Discover" | "Parties" | "Play" | "Chats" | "Profile";
type Post = { id: string; caption: string; created_at: string; author_id: string; post_type: string; media_url?: string | null; };
type PostAuthor = { username: string; display_name: string; avatar_url?: string | null; };
type PostComment = { id: string; post_id: string; author_id: string; body: string; created_at: string; };
type ProfileSummary = { username: string; display_name: string; bio: string | null; };
const sampleReels = [
  { user: "mira.moves", caption: "POV: the group chat finally makes it outside 😂✨", tags: "#goodvibes #weekendenergy", sound: "original audio · Mira", image: "photo-1533174072545-7a4b6ad7a6c3", likes: "24.8K", comments: "1,204", initial: "M" },
  { user: "jaycreates", caption: "When the beat drops and nobody is ready 🔥", tags: "#dancebreak #zeevibes", sound: "Late Night Bounce · DJ K", image: "photo-1501386761578-eac5c94b800a", likes: "18.2K", comments: "936", initial: "J" },
  { user: "tomi.laughs", caption: "Tag the friend who would absolutely do this 😭", tags: "#relatable #friendship", sound: "comedy loop · ZeeSounds", image: "photo-1527529482837-4698179dc6ce", likes: "31.6K", comments: "2,087", initial: "T" },
];
const nav: { name: View; icon: typeof Film }[] = [
  { name: "Reels", icon: Film }, { name: "Discover", icon: Compass }, { name: "Parties", icon: Users }, { name: "Play", icon: Gamepad2 }, { name: "Chats", icon: MessageCircle }, { name: "Profile", icon: UserRound },
];

export default function HomePage() {
  const [view, setView] = useState<View>("Reels");
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
  const [busy, setBusy] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const reel = sampleReels[index];

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
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data }) => {
        if (!active) return;
        setUserId(data.user?.id ?? null);
        setUserEmail(data.user?.email ?? null);
        if (data.user) {
          const { data: profileData } = await supabase.from("zeechat_profiles").select("username,display_name,bio").eq("user_id", data.user.id).maybeSingle();
          if (active && profileData) setProfile(profileData as ProfileSummary);
        }
      });
      supabase.from("zeechat_posts").select("id,caption,created_at,author_id,post_type,media_url").eq("visibility", "public").order("created_at", { ascending: false }).limit(10)
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
    return () => { active = false; };
  }, []);

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

  async function publish() {
    if (!caption.trim() && !mediaFile) return;
    if (!userId) { setNotice("Sign in first to publish a post."); return; }
    setBusy(true);
    const supabase = createClient();
    let uploadedPath: string | null = null;
    try {
      let mediaUrl: string | null = null;
      if (mediaFile) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(mediaFile.type)) throw new Error("Choose a JPEG, PNG, WebP or GIF image.");
        if (mediaFile.size > 8 * 1024 * 1024) throw new Error("Choose an image smaller than 8 MB.");
        const extension = mediaFile.name.split(".").pop()?.toLowerCase() || "jpg";
        uploadedPath = userId + "/" + crypto.randomUUID() + "." + extension;
        const { error: uploadError } = await supabase.storage.from("zeechat-media").upload(uploadedPath, mediaFile, { contentType: mediaFile.type, upsert: false });
        if (uploadError) throw uploadError;
        mediaUrl = supabase.storage.from("zeechat-media").getPublicUrl(uploadedPath).data.publicUrl;
      }
      const { error } = await supabase.from("zeechat_posts").insert({ author_id: userId, caption: caption.trim(), post_type: mediaFile ? "image" : "text", media_url: mediaUrl, visibility: "public" });
      if (error) throw error;
      setCaption(""); setMediaFile(null); setCreateOpen(false); setNotice("Your post is live!");
      const { data } = await supabase.from("zeechat_posts").select("id,caption,created_at,author_id,post_type,media_url").eq("visibility", "public").order("created_at", { ascending: false }).limit(10);
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
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("zeechat-media").remove([uploadedPath]).catch(() => undefined);
      setNotice(error instanceof Error ? error.message : "Could not publish. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-mark">z</span><span>Zee<b>Chat</b></span></a>
      <p className="side-label">YOUR SPACE</p>
      {nav.map(({ name, icon: Icon }) => <button key={name} className={view === name ? "nav-link active" : "nav-link"} onClick={() => setView(name)}><Icon size={19}/><span>{name === "Reels" ? "Home" : name}</span>{name === "Chats" && <i className="unread"/>}</button>)}
      <div className="sidebar-bottom"><div className="sidebar-promo"><Sparkles size={18}/><b>Make a little magic.</b><p>Your next favourite memory starts with a hello.</p><button onClick={() => setCreateOpen(true)}>Create something <Plus size={15}/></button></div><small>© 2026 ZeeChat · Good vibes only</small></div>
    </aside>
    <section className="main-column">
{view === "Chats" && <section className="content-view chat-view"><div className="chat-heading"><div><h1>Messages</h1><p>Stay connected.</p></div><button className="chat-compose" onClick={() => setNotice("New conversations will be available when messaging is connected.")} aria-label="Start a new conversation" title="Start a new conversation"><Plus size={20}/></button></div><div className="chat-search"><Search size={17}/><input aria-label="Search conversations" placeholder="Search conversations…" onChange={event => setNotice(event.target.value ? "Inbox search will work once conversations are connected." : "")}/></div><div className="chat-filter-row"><button className="chat-filter-active" aria-pressed="true">All</button><button onClick={() => setNotice("Unread filtering will be available when live messaging is connected.")}>Unread</button></div><div className="chat-inbox-empty"><div className="chat-empty-art"><MessageCircle size={25}/></div><h2>No conversations yet</h2><p>Start a conversation with someone from your community.</p><button onClick={() => setView("Discover")}>Find people <span>→</span></button></div></section>}
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {view === "Reels" && <section className="reels-view immersive-reels">
        <div className="reel-layout"><div key={reel.user} className="reel-player reel-enter" data-reel-index={index} onTouchStart={handleReelTouchStart} onTouchEnd={handleReelTouchEnd} onWheel={event => { if (Math.abs(event.deltaY) < 18) return; const now = Date.now(); if (now - lastWheelAt.current < 520) return; lastWheelAt.current = now; setIndex(current => Math.max(0, Math.min(sampleReels.length - 1, current + (event.deltaY > 0 ? 1 : -1)))); }} onKeyDown={event => { if (event.key === "ArrowDown") setIndex(current => (current + 1) % sampleReels.length); if (event.key === "ArrowUp") setIndex(current => (current - 1 + sampleReels.length) % sampleReels.length); }} tabIndex={0} aria-label="Reel viewer. Swipe up or down to change videos." style={{ backgroundImage: `linear-gradient(0deg,#08070ddf,transparent 55%,#08070d55),url(https://images.unsplash.com/${reel.image}?auto=format&fit=crop&w=1000&q=85)` }}>
          <div className="immersive-reel-header"><div className="immersive-brand"><span className="immersive-brand-mark">z</span><span>Zee<b>Chat</b></span></div><div className="reel-feed-tabs" role="group" aria-label="Reel feed"><button onClick={() => setNotice("Following feed will be available when creator follows are connected.")}>Following</button><button className="selected" aria-current="page">For You</button><button onClick={() => setView("Parties")}>Live</button></div><button className="immersive-search" aria-label="Search ZeeChat" onClick={() => { setView("Discover"); setSearchOpen(true); }}><Search size={21}/></button></div><button className="sound-button" aria-label="Sound muted"><VolumeX size={18}/></button>
          <div className="reel-caption"><div className="creator-row"><span className="creator-avatar">{reel.initial}</span><div><b>{reel.user} <ShieldCheck size={13}/></b><small>Creator · 2h ago</small></div><button className="follow-button" onClick={() => setFollowing(a => a.includes(index) ? a.filter(x => x !== index) : [...a, index])}>{following.includes(index) ? "Following" : "Follow +"}</button></div><p>{reel.caption}</p><strong>{reel.tags}</strong><small className="sound-line">♫ &nbsp;{reel.sound}</small></div>
        </div><div className="reel-actions"><button onClick={() => setLiked(a => a.includes(index) ? a.filter(x => x !== index) : [...a, index])} className={liked.includes(index) ? "liked" : ""}><span className="action-circle"><Heart size={22} fill={liked.includes(index) ? "currentColor" : "none"}/></span><b>{liked.includes(index) ? "24.9K" : reel.likes}</b></button><button onClick={() => setNotice("Comments will be connected to live posts in the next pass.")}><span className="action-circle"><MessageCircle size={22}/></span><b>{reel.comments}</b></button><button onClick={() => setNotice("Sharing is coming soon.")}><span className="action-circle"><Send size={20}/></span><b>Share</b></button></div></div>
        
        <section className="live-feed"><div className="feed-heading"><div><span className="eyebrow">FROM THE COMMUNITY</span><h2>Fresh on ZeeChat</h2></div><span>{posts.length} posts</span></div>{posts.length ? posts.map(p => <article className="post-card" key={p.id}><div className="post-avatar">{postAuthors[p.author_id]?.avatar_url ? <Image src={postAuthors[p.author_id].avatar_url!} alt="" width={42} height={42} /> : (postAuthors[p.author_id]?.display_name?.[0] || postAuthors[p.author_id]?.username?.[0] || "z").toUpperCase()}</div><div className="post-body"><b>{postAuthors[p.author_id]?.display_name || postAuthors[p.author_id]?.username || "ZeeChat member"} <span className="post-username">{postAuthors[p.author_id]?.username ? `@${postAuthors[p.author_id].username}` : ""}</span></b><small>{new Date(p.created_at).toLocaleString()}</small>{p.caption && <p>{p.caption}</p>}{p.media_url && <Image className="community-post-image" src={p.media_url} alt="Image shared in a ZeeChat post" width={1200} height={900} sizes="(max-width: 640px) 100vw, 720px" />}<div className="post-actions"><button className={likedPostIds.includes(p.id) ? "post-like liked" : "post-like"} disabled={likeBusyIds.includes(p.id)} aria-label={likedPostIds.includes(p.id) ? "Unlike post" : "Like post"} onClick={() => togglePostLike(p.id)}><Heart size={16} fill={likedPostIds.includes(p.id) ? "currentColor" : "none"}/><span>{postLikeCounts[p.id] ?? 0}</span></button><button className="post-like" onClick={() => toggleComments(p.id)}><MessageCircle size={16}/><span>{commentCounts[p.id] ?? 0}</span><span>{openCommentPostIds.includes(p.id) ? "Hide comments" : "Comments"}</span></button></div>{openCommentPostIds.includes(p.id) && <div className="comments-panel">{(commentsByPost[p.id] ?? []).map(comment => <div className="comment-row" key={comment.id}><span className="comment-avatar">z</span><div><small>{comment.author_id === userId ? "You" : "Community member"} · {new Date(comment.created_at).toLocaleString()}</small><p>{comment.body}</p></div></div>)}<form className="comment-form" onSubmit={event => { event.preventDefault(); void submitComment(p.id); }}><input aria-label="Write a comment" maxLength={1000} value={commentDrafts[p.id] ?? ""} onChange={event => setCommentDrafts(current => ({ ...current, [p.id]: event.target.value }))} placeholder="Add a kind comment…" /><button disabled={commentBusyIds.includes(p.id) || !(commentDrafts[p.id] ?? "").trim()} type="submit">{commentBusyIds.includes(p.id) ? "Posting…" : "Send"}</button></form></div>}</div></article>) : <p className="muted">Live text posts will show up here when people start sharing.</p>}</section>
      </section>}
{view === "Discover" && <section className="content-view discover-view"><span className="eyebrow">YOUR NEXT FAVOURITE THING</span><h1>Find your <em>people.</em></h1><p>Discover creators and vibes.</p><h2 className="discover-section-title">Trending topics</h2><div className="discover-category-grid">{[["😂","Comedy"],["🎧","Music"],["🎮","Gaming"],["🎬","Movies"],["🎤","Creators"],["💬","Conversations"]].map(([emoji,label])=><button type="button" className="discover-category" key={label} onClick={() => setNotice(label + " discovery is coming soon. Recommendations are preview content.")}><span className="discover-category-icon" aria-hidden="true">{emoji}</span><span>{label}</span><span className="discover-category-arrow" aria-hidden="true">↗</span></button>)}</div><h2 className="discover-section-title discover-live-title">Live creators</h2><div className="discover-live-placeholder"><span className="discover-live-dot"/>Live creator discovery is coming soon.</div><h2 className="discover-section-title">Recommended for you</h2><p className="discover-recommendation-note">Personalized recommendations will appear here as ZeeChat’s community grows.</p></section>}
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
      {view === "Chats" && <section className="content-view chat-view"><div className="chat-heading"><div><span className="eyebrow">YOUR PEOPLE, YOUR SPACE</span><h1>Messages<span className="chat-online-dot"/></h1><p>Keep good conversations going.</p></div><button className="chat-compose" onClick={() => setNotice("New conversations will be available when messaging is connected.")} aria-label="New message"><Plus size={20}/></button></div><div className="chat-search"><Search size={17}/><input aria-label="Search conversations" placeholder="Search conversations…" onChange={event => setNotice(event.target.value ? "Inbox search will work once conversations are connected." : "")}/></div><div className="chat-filter-row"><button className="chat-filter-active">All messages</button><button onClick={() => setNotice("Unread filtering will be available with live messaging.")}>Unread</button><button onClick={() => setNotice("Requests will appear when messaging is connected.")}>Requests</button></div><div className="chat-inbox-empty"><div className="chat-empty-art"><MessageCircle size={29}/><span>✦</span></div><h2>Your next favourite conversation<br/>starts here.</h2><p>When messaging is connected, your private conversations will appear here.</p><button onClick={() => setView("Discover")}>Discover people <span>→</span></button><small>Private conversations · Your space, your people</small></div></section>}
      {view === "Profile" && <section className="content-view profile-view"><div className="profile-cover"><span>✦ GOOD ENERGY ONLY</span></div><div className="profile-summary"><div className="profile-avatar">{userId ? (profile?.display_name?.[0] || profile?.username?.[0] || "Z").toUpperCase() : "z"}</div>{userId ? <button className="outline-button" onClick={openProfileEditor}>Edit profile</button> : <a href="/login" className="outline-button">Sign in</a>}<h1>{userId ? (profile?.display_name || profile?.username || (userEmail ? userEmail.split("@")[0] : "Your profile")) : "Your profile"}</h1><p>{userId ? (profile?.username ? `@${profile.username}` : "You’re signed in. Your profile is being set up.") : "Sign in to personalize your space."}</p>{userId && profile?.bio && <p>{profile.bio}</p>}{userId && <div className="profile-stats"><div><b>{posts.filter(post => post.author_id === userId).length}</b><small>Posts</small></div><div><b>—</b><small>Followers</small></div><div><b>—</b><small>Following</small></div></div>}</div>{!userId ? <div className="profile-empty-state"><span className="profile-empty-icon"><UserRound size={25}/></span><h2>Your space is waiting</h2><p>Sign in to share videos, follow creators, and connect with your people.</p><div className="profile-empty-actions"><a className="create-button" href="/login">Sign in</a><a className="outline-button" href="/signup">Create account</a></div></div> : <><div className="profile-content-tabs"><button className="selected">Posts</button><button onClick={() => setNotice("Your video gallery will appear here when video publishing is connected.")}>Videos</button><button onClick={() => setNotice("Likes analytics will be available when profile analytics are connected.")}>Likes</button></div>{posts.filter(post => post.author_id === userId).length === 0 ? <div className="profile-empty-state"><span className="profile-empty-icon"><Plus size={25}/></span><h2>Your story starts here</h2><p>Share your first post with the community.</p><button className="create-button" onClick={() => setCreateOpen(true)}>Create your first post <Plus size={16}/></button></div> : <div className="profile-post-list">{posts.filter(post => post.author_id === userId).map(post => <article className="profile-post-item" key={post.id}>{post.media_url && <Image src={post.media_url} alt="Your post" width={640} height={480}/>}<p>{post.caption}</p></article>)}</div>}</>}</section>}
    </section>
    <nav className="mobile-nav">{[{name:"Reels" as View,icon:Film,label:"Home"},{name:"Discover" as View,icon:Compass,label:"Discover"},{name:"Parties" as View,icon:Users,label:"Parties"},{name:"Profile" as View,icon:UserRound,label:"Profile"}].map(({name,icon:Icon,label})=><button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)}><Icon size={19}/><span>{label}</span></button>)}<button className="post-nav-button" onClick={() => setCreateOpen(true)} aria-label="Create a post" title="Create a post"><span className="post-nav-orbit"><Plus size={27}/></span><span>Post</span></button></nav>
    {partyCreateOpen && <div className="modal-backdrop" onClick={() => setPartyCreateOpen(false)}><section className="create-modal party-create-modal" role="dialog" aria-modal="true" aria-labelledby="party-create-title" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setPartyCreateOpen(false)} aria-label="Close party setup">×</button><span className="eyebrow">MAKE IT A MOMENT</span><h2 id="party-create-title">Create your <em>party.</em></h2><p>Set up your room details. Party creation is currently a design preview; it won&apos;t publish a live room yet.</p><form onSubmit={event => { event.preventDefault(); setPartyCreateOpen(false); setNotice("Party setup preview saved locally. Connect the party backend to publish a real room."); }}><label>Party name<input value={partyName} onChange={event => setPartyName(event.target.value)} maxLength={70} placeholder="e.g. Friday Night Hangout" required /></label><label>What’s the vibe?<textarea value={partyDescription} onChange={event => setPartyDescription(event.target.value)} maxLength={240} placeholder="Tell people what to expect…" /></label><div className="party-form-label">Choose a format</div><div className="party-format-options"><button type="button" className={partyFormat === "video" ? "selected" : ""} onClick={() => setPartyFormat("video")}><Video size={19}/><b>Video</b><small>Face-to-face hangout</small></button><button type="button" className={partyFormat === "audio" ? "selected" : ""} onClick={() => setPartyFormat("audio")}><Mic size={19}/><b>Audio</b><small>Talk it out</small></button><button type="button" className={partyFormat === "watch" ? "selected" : ""} onClick={() => setPartyFormat("watch")}><Film size={19}/><b>Watch</b><small>Watch together</small></button></div><div className="party-form-label">Who can join?</div><div className="party-access-options"><button type="button" className={partyAccess === "public" ? "selected" : ""} onClick={() => setPartyAccess("public")}><Users size={18}/><span><b>Public</b><small>Anyone can discover and join</small></span></button><button type="button" className={partyAccess === "private" ? "selected" : ""} onClick={() => setPartyAccess("private")}><LockKeyhole size={18}/><span><b>Private</b><small>Invite-only room</small></span></button></div><div className="modal-footer"><small>{partyName.length}/70</small><button className="create-button" type="submit" disabled={!partyName.trim()}>Preview party ↗</button></div></form></section></div>}
    {editProfileOpen && <div className="modal-backdrop" onClick={() => setEditProfileOpen(false)}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setEditProfileOpen(false)}>×</button><span className="eyebrow">MAKE IT YOURS</span><h2 id="edit-profile-title">Edit your <em>profile.</em></h2><form onSubmit={event => { event.preventDefault(); void saveProfile(); }}><label>Display name<input value={displayNameDraft} onChange={event => setDisplayNameDraft(event.target.value)} maxLength={60} required /></label><label>Bio<textarea value={bioDraft} onChange={event => setBioDraft(event.target.value)} maxLength={300} placeholder="A little about you…" /></label><div className="modal-footer"><small>{bioDraft.length}/300</small><button className="create-button" type="submit" disabled={profileSaving || !displayNameDraft.trim()}>{profileSaving ? "Saving…" : "Save profile ↗"}</button></div></form></section></div>}
    {createOpen && <div className="modal-backdrop" onClick={() => setCreateOpen(false)}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setCreateOpen(false)}>×</button><h2 id="create-title">Create a post</h2><p>Share a thought or photo.</p><label className="composer-field-label" htmlFor="post-caption">What’s on your mind?</label><textarea id="post-caption" value={caption} onChange={e => setCaption(e.target.value)} maxLength={2200} placeholder="Write something…" /><label className="media-upload-label"><span className="upload-plus">＋</span><span><b>{mediaFile ? "Replace photo" : "Add photo"}</b><small>Tap to select an image · Up to 8 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => { const file = e.target.files?.[0] ?? null; if (file && file.size > 8 * 1024 * 1024) { setNotice("Choose an image smaller than 8 MB."); e.target.value = ""; setMediaFile(null); return; } setMediaFile(file); }} /></label>{mediaFile && <div className="composer-image-preview">{mediaPreview && <Image src={mediaPreview} alt="Selected post preview" width={640} height={480} unoptimized />}<div><small>{mediaFile.name}</small><button type="button" onClick={() => setMediaFile(null)}>Remove photo</button></div></div>}<div className="modal-footer"><small>{caption.length}/2200</small><button className="create-button" disabled={busy || (!caption.trim() && !mediaFile)} onClick={publish}>{busy ? "Publishing…" : "Publish post"}</button></div></section></div>}
  </main>;
}