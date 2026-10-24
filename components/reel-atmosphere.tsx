"use client";

import { useEffect, useState } from "react";
import { CloudRain, Sun, Sunrise, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "creator" | "viewer";
type WeatherSnapshot = { code: number; isDay: boolean; precipitation: number; wind: number };

export default function ReelAtmosphere({ creatorLatitude, creatorLongitude, enabled = true, userId }: {
  creatorLatitude?: number | null;
  creatorLongitude?: number | null;
  enabled?: boolean;
  userId?: string | null;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [atmosphereEnabled, setAtmosphereEnabled] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const enabledSaved = localStorage.getItem("zeechat-atmosphere-enabled");
      if (enabledSaved === "false") setAtmosphereEnabled(false);
      const saved = localStorage.getItem("zeechat-atmosphere-mode") as Mode | null;
      if (saved === "creator" || saved === "viewer") setMode(saved);
      else setShowPicker(true);
      if (enabledSaved === "false") setShowPicker(false);
    } catch { setShowPicker(true); }

    if (userId) {
      void createClient().from("zeechat_atmosphere_preferences")
        .select("enabled,mode").eq("user_id", userId).maybeSingle()
        .then(({ data, error }) => {
          if (cancelled || error || !data) return;
          const savedMode = data.mode === "creator" || data.mode === "viewer" ? data.mode : "viewer";
          setMode(savedMode);
          setAtmosphereEnabled(data.enabled !== false);
          try {
            localStorage.setItem("zeechat-atmosphere-mode", savedMode);
            localStorage.setItem("zeechat-atmosphere-enabled", String(data.enabled !== false));
          } catch {}
          if (!data.enabled) setShowPicker(false);
        });
    }
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!enabled || !atmosphereEnabled || !mode) return;
    let cancelled = false;
    const refreshTimer = { current: undefined as ReturnType<typeof setInterval> | undefined };

    const load = async (latitude: number, longitude: number) => {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.search = new URLSearchParams({
          latitude: String(latitude), longitude: String(longitude),
          current: "weather_code,is_day,precipitation,wind_speed_10m",
          timezone: "auto",
        }).toString();
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data.current) setWeather({
          code: Number(data.current.weather_code ?? 0),
          isDay: Number(data.current.is_day ?? 1) === 1,
          precipitation: Number(data.current.precipitation ?? 0),
          wind: Number(data.current.wind_speed_10m ?? 0),
        });
      } catch { /* Weather is decorative: never interrupt video playback. */ }
    };

    const refresh = () => {
      if (mode === "creator") {
        if (Number.isFinite(creatorLatitude) && Number.isFinite(creatorLongitude)) {
          void load(creatorLatitude as number, creatorLongitude as number);
        } else {
          setWeather(null);
        }
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => { if (!cancelled) void load(position.coords.latitude, position.coords.longitude); },
          () => { if (!cancelled) setWeather(null); },
          { maximumAge: 300000, timeout: 7000, enableHighAccuracy: false },
        );
      } else {
        setWeather(null);
      }
    };

    refresh();
    refreshTimer.current = setInterval(refresh, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [enabled, atmosphereEnabled, mode, creatorLatitude, creatorLongitude]);

  const rain = Boolean(weather && (weather.precipitation > 0 || (weather.code >= 51 && weather.code <= 82)));
  const storm = Boolean(weather && weather.code >= 95);
  const cloudy = Boolean(weather && [1, 2, 3, 45, 48].includes(weather.code));
  const night = Boolean(weather && !weather.isDay);
  const effect = rain || storm ? "rain" : night ? "night" : cloudy ? "cloud" : "sun";
  const savePreference = (nextMode: Mode, nextEnabled: boolean) => {
    try {
      localStorage.setItem("zeechat-atmosphere-mode", nextMode);
      localStorage.setItem("zeechat-atmosphere-enabled", String(nextEnabled));
    } catch {}
    if (userId) {
      void createClient().from("zeechat_atmosphere_preferences").upsert({
        user_id: userId, mode: nextMode, enabled: nextEnabled, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).then(({ error }) => {
        if (error) console.warn("Atmosphere preference could not be synced to the account", error);
      });
    }
  };
  const choose = (next: Mode) => {
    setMode(next); setAtmosphereEnabled(true); setShowPicker(false);
    savePreference(next, true);
  };

  return <>
    {atmosphereEnabled && weather && <div className={"zee-atmosphere zee-atmosphere-" + effect} aria-hidden="true">
      {rain && Array.from({ length: 22 }, (_, i) => <i key={i} style={{ left: ((i * 37) % 100) + "%", animationDelay: ((i * 0.23) % 3) + "s", animationDuration: (1.5 + (i % 5) * 0.28) + "s" }} />)}
      {night && <span className="zee-atmosphere-moon">☾</span>}
      {!rain && !night && <span className="zee-atmosphere-sun">☼</span>}
      <button type="button" className="zee-atmosphere-switch" aria-label="Change atmosphere mode" title="Change atmosphere mode" onClick={() => setShowPicker(true)}><CloudRain size={15}/><span>{mode === "creator" ? "Creator" : "My weather"}</span></button>
    </div>}
    {!showPicker && mode && <button type="button" className="zee-atmosphere-toggle" aria-pressed={atmosphereEnabled} onClick={() => { const next = !atmosphereEnabled; setAtmosphereEnabled(next); if (mode) savePreference(mode, next); if (next && !weather) setShowPicker(true); }} title={atmosphereEnabled ? "Turn Atmosphere off" : "Turn Atmosphere on"}>{atmosphereEnabled ? "Atmosphere on" : "Atmosphere off"}</button>}
    {!showPicker && !mode && <button type="button" className="zee-atmosphere-toggle" onClick={() => setShowPicker(true)}>Set up Atmosphere</button>}
    {showPicker && <div className="zee-atmosphere-backdrop" role="presentation">
      <section className="zee-atmosphere-modal" role="dialog" aria-modal="true" aria-labelledby="zee-atmosphere-title">
        <button className="zee-atmosphere-close" type="button" onClick={() => setShowPicker(false)} aria-label="Close"><X size={18}/></button>
        <div className="zee-atmosphere-modal-icon"><CloudRain size={25}/></div>
        <p className="zee-atmosphere-eyebrow">ZEECHAT EXPERIENCE</p>
        <h2 id="zee-atmosphere-title">Choose your atmosphere</h2>
        <p>Live conditions shape subtle effects while you watch. Your video stays unchanged.</p>
        <button className={"zee-atmosphere-option " + (mode === "creator" ? "is-selected" : "")} type="button" onClick={() => choose("creator")}><span className="zee-atmosphere-option-icon"><Sun size={21}/></span><span><b>Creator&apos;s weather</b><small>Live conditions at the creator&apos;s saved post location</small></span></button>
        <button className={"zee-atmosphere-option " + (mode === "viewer" ? "is-selected" : "")} type="button" onClick={() => choose("viewer")}><span className="zee-atmosphere-option-icon"><Sunrise size={21}/></span><span><b>My local weather</b><small>Live conditions where you&apos;re watching; location permission may be requested</small></span></button>
        <p className="zee-atmosphere-footnote">Weather data may be approximate or delayed. If unavailable, the Reel plays normally.</p>
      </section>
    </div>}
    <style jsx global>{`
      .zee-atmosphere{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden;border-radius:inherit}
      .zee-atmosphere-rain{background:linear-gradient(180deg,rgba(93,157,211,.05),transparent 35%,rgba(18,54,82,.08))}
      .zee-atmosphere-rain i{position:absolute;top:-14%;width:2px;height:38px;border-radius:99px;background:linear-gradient(transparent,rgba(218,240,255,.55));animation:zee-rain-fall linear infinite;filter:drop-shadow(0 0 2px #8fc9ef55)}
      @keyframes zee-rain-fall{to{transform:translate3d(-18px,125vh,0)}}
      .zee-atmosphere-night{background:linear-gradient(180deg,rgba(20,32,85,.16),transparent 45%,rgba(17,30,73,.12))}
      .zee-atmosphere-cloud{background:linear-gradient(135deg,rgba(221,232,242,.05),transparent 55%,rgba(185,202,220,.08))}
      .zee-atmosphere-sun{background:radial-gradient(ellipse at 90% 8%,rgba(255,224,145,.22),transparent 34%);mix-blend-mode:screen}
      .zee-atmosphere-sun:after{content:"";position:absolute;inset:-30%;background:linear-gradient(115deg,transparent 42%,rgba(255,236,183,.07) 50%,transparent 58%);animation:zee-sun-drift 12s ease-in-out infinite alternate}
      @keyframes zee-sun-drift{to{transform:translateX(12%) rotate(4deg)}}
      .zee-atmosphere-moon{position:absolute;top:13%;right:10%;font-size:44px;color:#e1eaff;opacity:.55;text-shadow:0 0 25px #c6d9ff}
      .zee-atmosphere-toggle{position:absolute;z-index:4;right:12px;top:64px;pointer-events:auto;border:1px solid #ffffff45;border-radius:99px;background:#07111b80;color:#fff;padding:7px 10px;font-size:11px;backdrop-filter:blur(12px)}\n      .zee-atmosphere-switch{pointer-events:auto;position:absolute;top:64px;right:12px;display:flex;align-items:center;gap:5px;border:1px solid #ffffff45;border-radius:99px;background:#07111b80;color:#fff;padding:7px 10px;font-size:11px;backdrop-filter:blur(12px)}
      .zee-atmosphere-backdrop{position:absolute;inset:0;z-index:20;display:grid;place-items:center;padding:20px;background:#030712a8;backdrop-filter:blur(9px);pointer-events:auto}
      .zee-atmosphere-modal{position:relative;width:min(100%,360px);padding:25px 20px 20px;border:1px solid #ffffff20;border-radius:26px;background:linear-gradient(145deg,#172334,#0b111b 80%);color:#f8fafc;box-shadow:0 24px 80px #0008}
      .zee-atmosphere-close{position:absolute;right:14px;top:14px;display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:50%;background:#ffffff12;color:#dbeafe}
      .zee-atmosphere-modal-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:16px;background:#60a5fa20;color:#93c5fd;margin-bottom:15px}
      .zee-atmosphere-eyebrow{font-size:10px;letter-spacing:.17em;font-weight:800;color:#93c5fd;margin:0 0 8px}
      .zee-atmosphere-modal h2{font-size:23px;letter-spacing:-.04em;line-height:1.15;margin:0 0 9px}
      .zee-atmosphere-modal>p:not(.zee-atmosphere-eyebrow){font-size:12px;line-height:1.6;color:#a9b8ca;margin:0 0 16px}
      .zee-atmosphere-option{width:100%;display:flex;align-items:center;gap:12px;text-align:left;padding:13px;margin-top:9px;border:1px solid #ffffff20;border-radius:16px;background:#ffffff06;color:#fff}
      .zee-atmosphere-option.is-selected{border-color:#60a5fa;background:#60a5fa13}
      .zee-atmosphere-option-icon{display:grid;place-items:center;flex:none;width:40px;height:40px;border-radius:13px;background:#ffffff10;color:#bfdbfe}
      .zee-atmosphere-option b,.zee-atmosphere-option small{display:block}
      .zee-atmosphere-option b{font-size:13px;margin-bottom:4px}
      .zee-atmosphere-option small{font-size:10px;line-height:1.5;color:#a9b8ca}
      .zee-atmosphere-footnote{font-size:10px!important;margin:14px 0 0!important}
      @media(prefers-reduced-motion:reduce){.zee-atmosphere-rain i,.zee-atmosphere-sun:after{animation:none!important}}
    `}</style>
  </>;
}
