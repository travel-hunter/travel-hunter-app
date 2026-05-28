import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { hasKakaoMapKey, loadKakaoMaps } from "../../lib/kakaoMap";

export type KakaoMapMarker = {
  id: string;
  label: string;
  subtitle?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type PositionedMarker = KakaoMapMarker & {
  latitude: number;
  longitude: number;
  x: number;
  y: number;
};

function isValidCoordinate(marker: KakaoMapMarker): marker is KakaoMapMarker & { latitude: number; longitude: number } {
  return (
    typeof marker.latitude === "number" &&
    Number.isFinite(marker.latitude) &&
    typeof marker.longitude === "number" &&
    Number.isFinite(marker.longitude)
  );
}

function positionMarkers(markers: (KakaoMapMarker & { latitude: number; longitude: number })[]): PositionedMarker[] {
  if (markers.length === 0) return [];
  const latitudes = markers.map((marker) => marker.latitude);
  const longitudes = markers.map((marker) => marker.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;

  return markers.map((marker, index) => ({
    ...marker,
    id: marker.id || `${marker.label}-${index}`,
    subtitle: marker.subtitle ?? null,
    x: markers.length === 1 ? 50 : 12 + ((marker.longitude - minLng) / lngSpan) * 76,
    y: markers.length === 1 ? 50 : 88 - ((marker.latitude - minLat) / latSpan) * 76,
  }));
}

export function KakaoMapView({
  ariaLabel,
  fallback,
  markers,
  onSelectMarker,
  selectedMarkerId,
}: {
  ariaLabel: string;
  fallback: ReactNode;
  markers: KakaoMapMarker[];
  onSelectMarker: (id: string | null) => void;
  selectedMarkerId: string | null;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const mapMarkersRef = useRef<Array<{ setMap: (map: unknown | null) => void }>>([]);
  const [canUseSdk, setCanUseSdk] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const validMarkers = useMemo(() => markers.filter(isValidCoordinate), [markers]);
  const positionedMarkers = useMemo(() => positionMarkers(validMarkers), [validMarkers]);
  const shouldUseFallback = loadFailed || validMarkers.length === 0 || !hasKakaoMapKey();

  useEffect(() => {
    if (shouldUseFallback || !canvasRef.current) return;
    let disposed = false;

    loadKakaoMaps()
      .then((kakao) => {
        if (disposed || !canvasRef.current) return;
        const centerMarker = validMarkers[0];
        const center = new kakao.maps.LatLng(centerMarker.latitude, centerMarker.longitude);
        const map = new kakao.maps.Map(canvasRef.current, { center, level: validMarkers.length > 1 ? 8 : 5 });
        const bounds = new kakao.maps.LatLngBounds();
        const nextMarkers = validMarkers.map((marker) => {
          const position = new kakao.maps.LatLng(marker.latitude, marker.longitude);
          bounds.extend(position);
          const kakaoMarker = new kakao.maps.Marker({ map, position, title: marker.label });
          kakao.maps.event.addListener(kakaoMarker, "click", () => onSelectMarker(marker.id));
          return kakaoMarker;
        });

        if (validMarkers.length > 1) map.setBounds(bounds);
        else map.setCenter(center);
        mapMarkersRef.current.forEach((marker) => marker.setMap(null));
        mapMarkersRef.current = nextMarkers;
        mapRef.current = map;
        setCanUseSdk(true);
      })
      .catch(() => {
        if (!disposed) setLoadFailed(true);
      });

    return () => {
      disposed = true;
      mapMarkersRef.current.forEach((marker) => marker.setMap(null));
      mapMarkersRef.current = [];
      mapRef.current = null;
    };
  }, [onSelectMarker, shouldUseFallback, validMarkers]);

  if (shouldUseFallback) {
    return (
      <section className="kakao-map-view" data-kakao-map-view role="region" aria-label={ariaLabel}>
        {fallback}
      </section>
    );
  }

  return (
    <section className="kakao-map-view" data-kakao-map-view role="region" aria-label={ariaLabel}>
      <div className="kakao-map-canvas" ref={canvasRef} aria-hidden={!canUseSdk} />
      <div className="kakao-map-overlay-pins" aria-label={`${ariaLabel} 마커`}>
        {positionedMarkers.map((marker, index) => {
          const isSelected = selectedMarkerId === marker.id;
          return (
            <button
              aria-label={`${marker.label} 선택`}
              aria-pressed={isSelected}
              className={`kakao-map-overlay-pin${isSelected ? " selected" : ""}`}
              key={marker.id}
              onClick={() => onSelectMarker(isSelected ? null : marker.id)}
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              type="button"
            >
              <span>{index + 1}</span>
              <strong>{marker.label}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
