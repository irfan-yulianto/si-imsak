"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { getSearchRadius, widerRadius } from "@/lib/mosques";
import { findCityCoords, type CityCoord } from "@/lib/cities";
import { useGeolocationWatch } from "@/hooks/useGeolocationWatch";
import { useMosqueSearch } from "@/hooks/useMosqueSearch";
import MosqueControls from "./MosqueControls";
import MosqueList from "./MosqueList";

export default function MosqueFinder() {
  const location = useStore((s) => s.location);
  const userCoords = useStore((s) => s.userCoords);
  const setUserCoords = useStore((s) => s.setUserCoords);
  // The accuracy of the GPS fix in use; null for a city picked by hand
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const onFix = useCallback(
    (coords: { lat: number; lng: number }, fixAccuracy: number) => {
      setUserCoords(coords);
      setAccuracy(fixAccuracy);
    },
    [setUserCoords]
  );
  const gps = useGeolocationWatch(onFix);
  const { mosques, loading, error, follow, refresh } = useMosqueSearch();

  // Where to search: the GPS position in the store, else the selected city's centre.
  // A city picked in the search box wins until either of those changes.
  const basisKey = `${userCoords ? `${userCoords.lat},${userCoords.lng}` : "-"}|${location.cityName}`;
  const [pickedCity, setPickedCity] = useState<{ basisKey: string; coords: { lat: number; lng: number } } | null>(null);
  const picked = pickedCity?.basisKey === basisKey ? pickedCity.coords : null;
  const coords = useMemo(
    () => picked ?? userCoords ?? findCityCoords(location.cityName),
    [picked, userCoords, location.cityName]
  );
  const isGps = !picked && !!userCoords;

  // "Perluas Pencarian" applies to the place it was used for
  const coordsKey = coords ? `${coords.lat},${coords.lng}` : "";
  const [radiusChoice, setRadiusChoice] = useState<{ coordsKey: string; radius: number } | null>(null);
  const radius = (radiusChoice?.coordsKey === coordsKey ? radiusChoice.radius : null) || getSearchRadius(accuracy);

  // Search when the place, its accuracy or the radius changes — not while the GPS is
  // still warming up, whose early fixes are rough
  useEffect(() => {
    if (!coords || gps.watching) return;
    follow({ coords, radius, accuracy, gps: isGps });
  }, [coords, accuracy, gps.watching, isGps, radius, follow]);

  // "Muat Ulang" and "Coba Lagi" search again with the radius on screen
  const searchAgain = () => {
    if (coords) refresh({ coords, radius, accuracy, gps: isGps });
  };

  const pickCity = (city: CityCoord) => {
    setPickedCity({ basisKey, coords: { lat: city.lat, lng: city.lng } });
    setAccuracy(null);
  };

  return (
    <div className="space-y-3">
      <MosqueControls
        coords={coords}
        isGps={isGps}
        accuracy={accuracy}
        radius={radius}
        cityName={location.cityName}
        loading={loading}
        watching={gps.watching}
        gpsError={gps.error}
        onRefresh={searchAgain}
        onStartGps={gps.start}
        onStopGps={gps.stop}
        onPickCity={pickCity}
      />
      <MosqueList
        mosques={mosques}
        loading={loading}
        error={error}
        coords={coords}
        radius={radius}
        onRetry={searchAgain}
        // The effect above searches the wider radius
        onWiden={() => {
          if (coords) setRadiusChoice({ coordsKey, radius: widerRadius(radius) });
        }}
      />
    </div>
  );
}
