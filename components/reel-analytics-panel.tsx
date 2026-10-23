"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeft, Bookmark, ChartNoAxesCombined, Clock3, Download, Eye, Heart, MessageCircle, Share2, Sparkles, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ReelAnalyticsPanelProps = {
  post: { id: string; caption: string; created_at: string; media_url?: string | null };
  onClose: () => void;
};
type ViewRow = { viewed_at: string; viewer_id: string | null };
type EventRow = { event_type: string; watch_seconds: number | null; completion_pct: number | null; created_at: string };

const numberFormat = (value: number) => new Intl.NumberFormat(undefined, { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
const dateLabel = (value: Date, compact = false) => value.toLocaleDateString([], compact ? { month: "numeric", day: "numeric" } : { month: "short", day: "numeric" });
const formatDuration = (value: number) => { const total = Math.max(0, Math.floor(value)); if (total < 60) return total + "s"; if (total < 3600) return Math.floor(total / 60) + "m " + (total % 60) + "s"; return Math.floor(total / 3600) + "h " + Math.floor((total % 3600) / 60) + "m"; };

export default function ReelAnalyticsPanel({ post, onClose }: ReelAnalyticsPanelProps) {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [views, setViews] = useState<ViewRow[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [advancedAvailable, setAdvancedAvailable] = useState(true);
  const [viewHistoryAvailable, setViewHistoryAvailable] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const client = createClient();
    const since = new Date(Date.now() - range * 86400000).toISOString();
    void (async () => {
      try {
        const [viewResult, eventResult, likeResult, commentResult] = await Promise.all([
          client.from("zeechat_post_views").select("viewed_at,viewer_id", { count: "exact" }).eq("post_id", post.id).gte("viewed_at", since).order("viewed_at", { ascending: false }).limit(10000),
          client.from("zeechat_reel_analytics_events").select("event_type,watch_seconds,completion_pct,created_at").eq("post_id", post.id).gte("created_at", since).limit(10000),
          client.from("zeechat_post_likes").select("post_id", { count: "exact", head: true }).eq("post_id", post.id).gte("created_at", since),
          client.from("zeechat_comments").select("id", { count: "exact", head: true }).eq("post_id", post.id).gte("created_at", since),
        ]);
        if (!active) return;
        setLikes(likeResult.count ?? 0);
        setComments(commentResult.count ?? 0);
        if (viewResult.error) {
          setAdvancedAvailable(false);
          setViewHistoryAvailable(false);
          setViews([]);
          const fallback = await client.rpc("zeechat_post_view_counts", { post_ids: [post.id] });
          if (fallback.error) throw viewResult.error;
          const row = (fallback.data as { post_id: string; view_count: number | string }[] | null)?.find(item => item.post_id === post.id);
          setTotalViews(row ? Number(row.view_count) : 0);
        } else {
          setViewHistoryAvailable(true);
          setViews(((viewResult.data ?? []) as ViewRow[]).reverse());
          setTotalViews(viewResult.count ?? (viewResult.data ?? []).length);
        }
        if (eventResult.error) {
          setAdvancedAvailable(false);
          setEvents([]);
        } else {
          setEvents((eventResult.data ?? []) as EventRow[]);
          if (!viewResult.error) setAdvancedAvailable(true);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Analytics could not be loaded right now.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [post.id, range]);

  const metrics = useMemo(() => {
    const unique = new Set(views.map(row => row.viewer_id).filter((id): id is string => Boolean(id))).size;
    const watchEvents = events.filter(event => event.event_type === "watch_session");
    const totalWatch = watchEvents.reduce((sum, event) => sum + Math.max(0, Number(event.watch_seconds) || 0), 0);
    const completions = events.filter(event => event.event_type === "completion").length;
    const shares = events.filter(event => event.event_type === "share").length;
    const saves = events.filter(event => event.event_type === "save").length;
    const avgWatch = watchEvents.length ? totalWatch / watchEvents.length : 0;
    const completionRate = watchEvents.length ? (completions / watchEvents.length) * 100 : 0;
    const engagement = totalViews ? ((likes + comments + saves + shares) / totalViews) * 100 : 0;
    return { views: totalViews, unique, totalWatch, completions, shares, saves, avgWatch, completionRate, engagement };
  }, [views, totalViews, events, likes, comments]);

  const trend = useMemo(() => {
    const days: { key: string; label: string; count: number }[] = [];
    const today = new Date();
    for (let offset = range - 1; offset >= 0; offset--) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      const key = day.getFullYear() + "-" + String(day.getMonth() + 1).padStart(2, "0") + "-" + String(day.getDate()).padStart(2, "0");
      days.push({ key, label: dateLabel(day, true), count: 0 });
    }
    const lookup = new Map(days.map(day => [day.key, day]));
    for (const row of views) {
      const date = new Date(row.viewed_at);
      const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
      const day = lookup.get(key);
      if (day) day.count += 1;
    }
    return days;
  }, [views, range]);

  const chart = useMemo(() => {
    const max = Math.max(1, ...trend.map(day => day.count));
    const points = trend.map((day, index) => ({
      x: trend.length <= 1 ? 6 : 6 + (index / (trend.length - 1)) * 288,
      y: 92 - (day.count / max) * 76,
    }));
    return { max, path: points.map((point, index) => (index ? "L" : "M") + point.x.toFixed(1) + " " + point.y.toFixed(1)).join(" "), points };
  }, [trend]);

  const exportCsv = () => {
    const quote = (value: string | number) => '"' + String(value).replace(/"/g, '""') + '"';
    const rows: (string | number)[][] = [
      ["ZeeChat Reel analytics"],
      ["Caption", post.caption || "Untitled Reel"],
      ["Post ID", post.id],
      ["Period (days)", range],
      ["Metric", "Value"],
      ["Total views", metrics.views],
      ["Unique signed-in viewers", metrics.unique],
      ["Likes", likes],
      ["Comments", comments],
      ["Tracked shares", metrics.shares],
      ["Tracked saves", metrics.saves],
      ["Total watch time (seconds)", Math.round(metrics.totalWatch)],
      ["Average watch time (seconds)", Math.round(metrics.avgWatch)],
      ["Completion rate (%)", metrics.completionRate.toFixed(1)],
      ["Engagement rate (%)", metrics.engagement.toFixed(1)],
      [],
      ["Date", "Views"],
      ...trend.map(day => [day.key, day.count]),
    ];
    const csv = rows.map(row => row.map(value => quote(value ?? "")).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zeechat-reel-analytics-" + post.id.slice(0, 8) + "-" + range + "d.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Allow the browser to start the download before releasing the object URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const cards = [
    { label: "Total views", value: metrics.views, icon: Eye, note: "Plays recorded in this period" },
    { label: "Unique viewers", value: metrics.unique, icon: Users, note: viewHistoryAvailable ? "Signed-in accounts in view history" : "Detailed view history unavailable" },
    { label: "Likes", value: likes, icon: Heart, note: "Likes in selected period" },
    { label: "Comments", value: comments, icon: MessageCircle, note: "Comments in selected period" },
    { label: "Shares", value: metrics.shares, icon: Share2, note: "Shares tracked from ZeeChat" },
    { label: "Saves", value: metrics.saves, icon: Bookmark, note: "Saves tracked from ZeeChat" },
  ];

  return (
    <div className="reel-analytics-backdrop" role="presentation" onClick={onClose}>
      <section className="reel-analytics-panel" role="dialog" aria-modal="true" aria-labelledby="reel-analytics-title" onClick={event => event.stopPropagation()}>
        <header className="reel-analytics-header">
          <button type="button" className="analytics-back-button" onClick={onClose} aria-label="Close analytics"><ArrowLeft size={19}/></button>
          <div className="analytics-heading-copy"><span><ChartNoAxesCombined size={14}/> CREATOR STUDIO</span><h2 id="reel-analytics-title">Reel analytics</h2><p>Understand your reach, engagement and watch quality.</p></div>
          <button type="button" className="analytics-export-button" onClick={exportCsv} disabled={loading} aria-label="Export analytics as CSV"><Download size={15}/><span>Export</span></button>
          <button type="button" className="analytics-close-button" onClick={onClose} aria-label="Close analytics"><X size={19}/></button>
        </header>
        <div className="reel-analytics-content">
          <article className="analytics-featured-reel">
            {post.media_url ? <video src={post.media_url} muted playsInline preload="metadata" /> : <div className="analytics-video-placeholder"><ChartNoAxesCombined size={24}/></div>}
            <div><span className="analytics-status-pill"><span/> PUBLISHED REEL</span><h3>{post.caption?.trim() || "Untitled Reel"}</h3><p>Published {new Date(post.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</p></div>
          </article>
          <div className="analytics-range-row"><div><b>Performance overview</b><span>Choose a time range for views and watch activity</span></div><div className="analytics-range-switch" aria-label="Analytics time range">{([7, 30, 90] as const).map(value => <button type="button" key={value} className={range === value ? "is-active" : ""} aria-pressed={range === value} onClick={() => setRange(value)}>{value}d</button>)}</div></div>
          {error && <div className="analytics-error" role="alert">{error}</div>}
          <div className="analytics-metric-grid">{cards.map(card => { const Icon = card.icon; return <article className="analytics-metric-card" key={card.label}><div className="analytics-metric-top"><span>{card.label}</span><Icon size={17}/></div><b>{loading || (card.label === "Unique viewers" && !viewHistoryAvailable) ? "—" : numberFormat(card.value)}</b><small>{card.note}</small></article>; })}</div>
          <article className="analytics-chart-card"><header><div><b>Views over time</b><span>Daily view activity</span></div><strong><Eye size={15}/>{loading ? "—" : numberFormat(metrics.views)}</strong></header>
            <div className="analytics-chart-wrap">
              {loading ? <div className="analytics-chart-loading"><span/><span/><span/><span/><span/><span/><span/></div> : trend.some(day => day.count > 0) ? <svg viewBox="0 0 300 112" role="img" aria-label={"Views trend for the last " + range + " days"} preserveAspectRatio="none"><defs><linearGradient id="reel-analytics-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ff6ba6" stopOpacity=".32"/><stop offset="100%" stopColor="#a88bff" stopOpacity="0"/></linearGradient></defs><path d={chart.path + " L294 100 L6 100 Z"} fill="url(#reel-analytics-fill)"/><path d={chart.path} fill="none" stroke="#ff6ba6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>{chart.points.filter((_, index) => index === chart.points.length - 1 || trend[ index ].count > 0 && index % Math.max(1, Math.floor(range / 7)) === 0).map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3" fill="#f9e4f0" stroke="#ff6ba6" strokeWidth="1.5"/>)}</svg> : <div className="analytics-chart-empty"><ChartNoAxesCombined size={24}/><b>{metrics.views > 0 ? "Detailed view history unavailable" : "No views in this period yet"}</b><span>{metrics.views > 0 ? "Daily trends appear after the analytics update is enabled." : "Share your Reel to help it find its audience."}</span></div>}
            </div>
            <footer><span>{trend[0]?.label}</span><span>{trend[Math.floor(trend.length / 2)]?.label}</span><span>{trend[trend.length - 1]?.label}</span></footer>
          </article>
          <div className="analytics-watch-grid"><article><div><Clock3 size={17}/><span>Total watch time</span></div><b>{advancedAvailable && !loading ? formatDuration(metrics.totalWatch) : "—"}</b><small>Combined tracked watch sessions</small></article><article><div><Clock3 size={17}/><span>Average watch time</span></div><b>{advancedAvailable && !loading ? Math.floor(metrics.avgWatch / 60) + ":" + String(Math.floor(metrics.avgWatch % 60)).padStart(2, "0") : "—"}</b><small>Average per tracked play session</small></article><article><div><Sparkles size={17}/><span>Completion rate</span></div><b>{advancedAvailable && !loading ? metrics.completionRate.toFixed(1) + "%" : "—"}</b><small>{numberFormat(metrics.completions)} completed plays in this period</small></article><article><div><ArrowDownLeft size={17}/><span>Engagement rate</span></div><b>{loading ? "—" : metrics.engagement.toFixed(1) + "%"}</b><small>Likes, comments, shares and tracked saves ÷ views</small></article></div>
          {!advancedAvailable && <p className="analytics-data-note">Detailed watch time, completion, share and save insights will appear after the Reel analytics update is enabled.</p>}
          <p className="analytics-privacy-note">Analytics are visible only to you as the Reel owner. Views may include repeat plays; unique viewers count signed-in accounts.</p>
        </div>
      </section>
    </div>
  );
}
