"use client";

import { useEffect, useState } from "react";
import { Bell, Compass, Film, Gamepad2, Heart, LogOut, MessageCircle, Plus, Search, Send, ShieldCheck, Sparkles, UserRound, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type View = "Reels" | "Discover" | "Play" | "Chats" | "Profile";
type Post = { id: string; caption: string; created_at: string; author_id: string; post_type: string; };
type PostComment = { id: string; post_id: string; author_id: string; body: string; created_at: string; };
type ProfileSummary = { username: string; display_name: string; bio: string | null; };
const sampleReels = [
  { user: "mira.moves", caption: "POV: the group chat finally makes it outside 😂✨", tags: "#goodvibes #weekendenergy", sound: "original audio · Mira", image: "photo-1533174072545-7a4b6ad7a6c3", likes: "24.8K", comments: "1,204", initial: "M" },
  { user: "jaycreates", caption: "When the beat drops and nobody is ready 🔥", tags: "#dancebreak #zeevibes", sound: "Late Night Bounce · DJ K", image: "photo-1501386761578-eac5c94b800a", likes: "18.2K", comments: "936", initial: "J" },
  { user: "tomi.laughs", caption: "Tag the friend who would absolutely do this 😭", tags: "#relatable #friendship", sound: "comedy loop · ZeeSounds", image: "photo-1527529482837-4698179dc6ce", likes: "31.6K", comments: "2,087", initial: "T" },
];
const nav: { name: View; icon: typeof Film }[] = [
  { name: "Reels", icon: Film }, { name: "Discover", icon: Compass }, { name: "Play", icon: Gamepad2 }, { name: "Chats", icon: MessageCircle }, { name: "Profile", icon: UserRound },
];

export default function HomePage() {
  const [view, setView] = useState<View>("Reels");
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<number[]>([]);
  const [following, setFollowing] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
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
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const reel = sampleReels[index];

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
      supabase.from("zeechat_posts").select("id,caption,created_at,author_id,post_type").eq("visibility", "public").order("created_at", { ascending: false }).limit(10)
        .then(async ({ data, error }) => {
          if (!active) return;
          if (error) { setNotice("Connect Supabase to load live posts."); return; }
          const loadedPosts = (data ?? []) as Post[];
          setPosts(loadedPosts);
          if (!loadedPosts.length) return;
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

  async function signOut() {
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      setUserId(null);
      setUserEmail(null);
      setProfile(null);
      setLikedPostIds([]);
      setNotice("You have signed out.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not sign out. Please try again.");
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
    if (!caption.trim()) return;
    if (!userId) { setNotice("Sign in first to publish a post."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("zeechat_posts").insert({ author_id: userId, caption: caption.trim(), post_type: "text", visibility: "public" });
      if (error) throw error;
      setCaption(""); setCreateOpen(false); setNotice("Your post is live!");
      const { data } = await supabase.from("zeechat_posts").select("id,caption,created_at,author_id,post_type").eq("visibility", "public").order("created_at", { ascending: false }).limit(10);
      setPosts((data ?? []) as Post[]);
    } catch (error) {
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
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">z</span>Zee<b>Chat</b></div><div className="search"><Search size={17}/><input aria-label="Search ZeeChat" placeholder="Find people, sounds, good vibes…"/></div><button className="icon-button" aria-label="Notifications"><Bell size={20}/></button>{userId ? <><span className="signin-link">{userEmail ?? "Signed in"}</span><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}><LogOut size={18}/></button></> : <a className="signin-link" href="/login">Sign in</a>}<button className="create-button" onClick={() => setCreateOpen(true)}<Plus size={18}/> Create</button></header>
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {view === "Reels" && <section className="reels-view">
        <div className="section-heading"><div><span className="eyebrow">YOUR DAILY DOSE OF FUN</span><h1>Catch a <em>vibe.</em></h1></div><div className="feed-tabs"><button>Following</button><button className="selected">For you</button><button>Live <i className="live-dot"/></button></div></div>
        <div className="reel-layout"><div className="reel-player" style={{ backgroundImage: `linear-gradient(0deg,#08070ddf,transparent 55%,#08070d55),url(https://images.unsplash.com/${reel.image}?auto=format&fit=crop&w=1000&q=85)` }}>
          <div className="reel-top-tag"><Sparkles size={13}/> MADE FOR YOUR MOOD</div><button className="sound-button" aria-label="Sound muted"><VolumeX size={18}/></button>
          <div className="reel-caption"><div className="creator-row"><span className="creator-avatar">{reel.initial}</span><div><b>{reel.user} <ShieldCheck size={13}/></b><small>Creator · 2h ago</small></div><button className="follow-button" onClick={() => setFollowing(a => a.includes(index) ? a.filter(x => x !== index) : [...a, index])}>{following.includes(index) ? "Following" : "Follow +"}</button></div><p>{reel.caption}</p><strong>{reel.tags}</strong><small className="sound-line">♫ &nbsp;{reel.sound}</small></div>
        </div><div className="reel-actions"><button onClick={() => setLiked(a => a.includes(index) ? a.filter(x => x !== index) : [...a, index])} className={liked.includes(index) ? "liked" : ""}><span className="action-circle"><Heart size={22} fill={liked.includes(index) ? "currentColor" : "none"}/></span><b>{liked.includes(index) ? "24.9K" : reel.likes}</b></button><button onClick={() => setNotice("Comments will be connected to live posts in the next pass.")}><span className="action-circle"><MessageCircle size={22}/></span><b>{reel.comments}</b></button><button onClick={() => setNotice("Sharing is coming soon.")}><span className="action-circle"><Send size={20}/></span><b>Share</b></button></div></div>
        <div className="reel-switcher"><button disabled={index === 0} onClick={() => setIndex(i => i - 1)}>↑ Previous</button><span>{index + 1} / {sampleReels.length}</span><button disabled={index === sampleReels.length - 1} onClick={() => setIndex(i => i + 1)}>Next ↓</button></div>
        <section className="live-feed"><div className="feed-heading"><div><span className="eyebrow">FROM THE COMMUNITY</span><h2>Fresh on ZeeChat</h2></div><span>{posts.length} posts</span></div>{posts.length ? posts.map(p => <article className="post-card" key={p.id}><div className="post-avatar">z</div><div className="post-body"><b>Community post</b><small>{new Date(p.created_at).toLocaleString()}</small><p>{p.caption}</p><div className="post-actions"><button className={likedPostIds.includes(p.id) ? "post-like liked" : "post-like"} disabled={likeBusyIds.includes(p.id)} aria-label={likedPostIds.includes(p.id) ? "Unlike post" : "Like post"} onClick={() => togglePostLike(p.id)}><Heart size={16} fill={likedPostIds.includes(p.id) ? "currentColor" : "none"}/><span>{postLikeCounts[p.id] ?? 0}</span></button><button className="post-like" onClick={() => toggleComments(p.id)}><MessageCircle size={16}/><span>{commentCounts[p.id] ?? 0}</span><span>{openCommentPostIds.includes(p.id) ? "Hide comments" : "Comments"}</span></button></div>{openCommentPostIds.includes(p.id) && <div className="comments-panel">{(commentsByPost[p.id] ?? []).map(comment => <div className="comment-row" key={comment.id}><span className="comment-avatar">z</span><div><small>{comment.author_id === userId ? "You" : "Community member"} · {new Date(comment.created_at).toLocaleString()}</small><p>{comment.body}</p></div></div>)}<form className="comment-form" onSubmit={event => { event.preventDefault(); void submitComment(p.id); }}><input aria-label="Write a comment" maxLength={1000} value={commentDrafts[p.id] ?? ""} onChange={event => setCommentDrafts(current => ({ ...current, [p.id]: event.target.value }))} placeholder="Add a kind comment…" /><button disabled={commentBusyIds.includes(p.id) || !(commentDrafts[p.id] ?? "").trim()} type="submit">{commentBusyIds.includes(p.id) ? "Posting…" : "Send"}</button></form></div>}</div></article>) : <p className="muted">Live text posts will show up here when people start sharing.</p>}</section>
      </section>}
      {view === "Discover" && <section className="content-view"><span className="eyebrow">YOUR NEXT FAVOURITE THING</span><h1>Find your <em>people.</em></h1><p>Creators, conversations and little adventures picked for your vibe.</p><div className="feature-grid">{[["😂","Make us laugh","Jump into today's comedy challenge."],["🎧","Music heads","Find people who love the same sounds."],["🎮","Play something","Fast games, friendly chaos."]].map(x=><article className="feature-card" key={x[1]}><div className="feature-emoji">{x[0]}</div><h3>{x[1]}</h3><p>{x[2]}</p><button onClick={() => setNotice("Discovery recommendations are currently preview content.")}>Explore ↗</button></article>)}</div></section>}
      {view === "Play" && <section className="content-view"><span className="eyebrow">BOREDOM DOESN'T LIVE HERE</span><h1>Let's <em>play.</em></h1><p>Little games, big laughs, and people to share them with.</p><div className="feature-grid">{[["🧠","Quickfire Trivia","5 questions. How sharp are you?"],["😂","Caption This","Make the funniest caption win."],["🎤","Voice Room Roulette","Meet people around shared interests."]].map(x=><article className="feature-card" key={x[1]}><div className="feature-emoji">{x[0]}</div><h3>{x[1]}</h3><p>{x[2]}</p><button onClick={() => setNotice("This activity is a UI preview; scoring and rewards are not yet connected.")}>Join activity ↗</button></article>)}</div></section>}
      {view === "Chats" && <section className="content-view"><span className="eyebrow">KEEP THE VIBE GOING</span><h1>Your <em>conversations.</em></h1><p>Good chats turn into great memories.</p><div className="empty-state"><MessageCircle size={34}/><h3>Good conversations start here.</h3><p>Secure real-time messaging is planned for a later implementation pass.</p></div></section>}
      {view === "Profile" && <section className="content-view"><div className="profile-cover"><span>✦ GOOD ENERGY ONLY</span></div><div className="profile-summary"><div className="profile-avatar">C</div>{userId ? <button className="outline-button" onClick={() => void signOut()}>Sign out</button> : <a href="/login" className="outline-button">Sign in</a>}<h1>{userId ? (profile?.display_name || profile?.username || (userEmail ? userEmail.split("@")[0] : "Your ZeeChat profile")) : "Your ZeeChat profile"}</h1><p>{userId ? (profile?.username ? `@${profile.username}` : "You’re signed in. Your profile is being set up.") : "Sign in to make this profile yours."}</p>{userId && profile?.bio && <p>{profile.bio}</p>}<div className="profile-stats"><div><b>—</b><small>Followers</small></div><div><b>—</b><small>Following</small></div><div><b>{posts.length}</b><small>Posts loaded</small></div><div><b>—</b><small>Likes</small></div></div></div></section>}
    </section>
    <nav className="mobile-nav">{nav.map(({name,icon:Icon})=><button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)}><Icon size={19}/><span>{name}</span></button>)}</nav>
    {createOpen && <div className="modal-backdrop" onClick={() => setCreateOpen(false)}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setCreateOpen(false)}>×</button><span className="eyebrow">YOUR VOICE, YOUR SPACE</span><h2 id="create-title">Share a little <em>something.</em></h2><p>Text posts are live. Photo and video publishing will be added next.</p><textarea value={caption} onChange={e => setCaption(e.target.value)} maxLength={2200} placeholder="What's the vibe today?" /><div className="modal-footer"><small>{caption.length}/2200</small><button className="create-button" disabled={busy || !caption.trim()} onClick={publish}>{busy ? "Publishing…" : "Publish post ↗"}</button></div></section></div>}
  </main>;
}