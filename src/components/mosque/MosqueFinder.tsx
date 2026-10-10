"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { visibleMosques } from "@/lib/mosques";
import { SHARP_M, freshFix } from "@/lib/geofix";
import { gpsHint, platformOf } from "@/lib/mosque-messages";
import { findCityCoords, type CityCoord } from "@/lib/cities";
import { useGeolocationPermission } from "@/hooks/useGeolocationPermission";
import { useGeolocationWatch } from "@/hooks/useGeolocationWatch";
import { useMosqueSearch } from "@/hooks/useMosqueSearch";
import MosqueControls from "./MosqueControls";
import MosqueList from "./MosqueList";

export default function MosqueFinder() {
  const cityName = useStore((s) => s.location.cityName);
  const fix = useStore((s) => s.userCoords);
  const setUserCoords = useStore((s) => s.setUserCoords);
  const permission = useGeolocationPermission();
  const gps = useGeolocationWatch(setUserCoords);
  const { answer, loading, error, follow, refresh } = useMosqueSearch();
  // Whose settings a hint names (the finder only renders in the browser)
  const [platform] = useState(() => platformOf(navigator.userAgent));

  // A city picked in the search box wins until the GPS gives a new fix, or another city
  // is selected for the schedule
  const pickKey = `${fix?.at ?? "-"}|${cityName}`;
  const [pickedCity, setPickedCity] = useState<{ key: string; city: CityCoord } | null>(null);
  const picked = pickedCity?.key === pickKey ? pickedCity.city : null;

  // "Batal" before a first fix: the city's centre is searched instead
  const [gpsCancelled, setGpsCancelled] = useState(false);
  // While the GPS looks for a first fix, or is about to, the city's centre isn't searched
  // in the meantime: its results would only be replaced a moment later
  const awaitingGps =
    !picked &&
    !fix &&
    !gps.error &&
    !gpsCancelled &&
    (gps.status !== "idle" || permission === "unknown" || permission === "granted");

  // Where to search: a city picked here, else the GPS position, else the selected city's centre
  const cityCentre = useMemo(() => findCityCoords(cityName), [cityName]);
  const fixLat = fix?.lat;
  const fixLng = fix?.lng;
  const coords = useMemo(() => {
    if (picked) return { lat: picked.lat, lng: picked.lng };
    if (fixLat !== undefined && fixLng !== undefined) return { lat: fixLat, lng: fixLng };
    return awaitingGps ? null : cityCentre;
  }, [picked, fixLat, fixLng, awaitingGps, cityCentre]);
  const mode = picked ? "picked" : fix ? "gps" : "centre";
  const basis = picked ? `kota:${picked.name}` : fix ? "gps" : `pusat:${cityName}`;

  // Every new position or place: searched again only when the last answer can't tell
  // the nearest mosques there
  useEffect(() => {
    if (coords) follow({ coords, basis });
  }, [coords, basis, follow]);

  // Where the site may read the location, the GPS starts by itself: when the finder
  // opens and when the app comes back to the foreground, unless the fix in hand is
  // recent and sharp. A rough or old fix in hand is searched from meanwhile, and only a
  // better reading replaces it. Should the watch fail, a fix in hand stays without a
  // message.
  const sharpenFix = useEffectEvent(() => {
    if (picked || gps.status !== "idle") return;
    // A fix in hand shows the location may be read, even where the browser can't say
    if (permission !== "granted" && !fix) return;
    const seed = freshFix(fix);
    if (seed && seed.accuracy <= SHARP_M) return;
    gps.start({ quiet: fix !== null, seed });
  });
  const hasFix = fix !== null;
  useEffect(() => {
    if (permission === "granted" || hasFix) sharpenFix();
  }, [permission, hasFix]);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") sharpenFix();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // "Perbarui Lokasi GPS": a new reading, not one the device has from before, and only
  // if it betters a fresh fix in hand
  const startGps = () => {
    setPickedCity(null);
    setGpsCancelled(false);
    gps.start({ fresh: true, seed: freshFix(fix) });
  };

  const stopGps = () => {
    gps.stop();
    setGpsCancelled(true);
  };

  const pickCity = (city: CityCoord) => {
    // A fix arriving later would take the place of the city
    gps.stop();
    setPickedCity({ key: pickKey, city });
  };

  // "Muat Ulang" and "Coba Lagi"
  const searchAgain = () => {
    if (coords) refresh({ coords, basis });
  };

  // The answer for this place, ordered from the position now. Another place's answer
  // isn't shown while this one's is on its way.
  const current = answer?.basis === basis ? answer : null;
  const mosques = useMemo(() => (current && coords ? visibleMosques(current, coords) : []), [current, coords]);
  const firstLoad = (loading || awaitingGps) && !current;
  // Nothing to show until the search on its way comes back: the skeleton, not an empty list
  const showSkeleton = firstLoad || (loading && mosques.length === 0);

  return (
    // Wide screens: the controls stay in view on the left, the results on the right.
    // Below that one column of the screen's width: an auto-sized column would grow to a
    // long mosque name instead of truncating it
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-start">
      <div className="lg:sticky lg:top-[calc(var(--header-h)+var(--safe-t)+0.75rem)] lg:col-span-4">
        <MosqueControls
          mode={mode}
          placeName={picked?.name ?? cityName}
          accuracy={fix?.accuracy ?? null}
          canRefresh={coords !== null && !firstLoad}
          refreshing={loading && current !== null}
          gpsStatus={gps.status}
          gpsError={gps.error}
          hint={gpsHint(gps.settled, fix?.accuracy ?? null, platform)}
          onRefresh={searchAgain}
          onStartGps={startGps}
          onStopGps={stopGps}
          onPickCity={pickCity}
        />
      </div>
      <div className="space-y-3 lg:col-span-8">
        <MosqueList
          // Another place starts again from its first results
          key={basis}
          mosques={mosques}
          loading={showSkeleton}
          error={error}
          coords={coords}
          accuracy={mode === "gps" ? (fix?.accuracy ?? null) : null}
          onRetry={searchAgain}
        />
      </div>
    </div>
  );
}
