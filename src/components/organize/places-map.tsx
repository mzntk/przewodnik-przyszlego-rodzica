"use client";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { Place, PlaceType } from "@/data/organize";
import { PLACE_LABELS } from "@/data/organize";

export const PLACE_COLORS: Record<PlaceType, string> = { zus: "#33763c", usc: "#b8860b", poz: "#1d5fbf", szpital: "#c0122c" };

/** Płynne przejście do punktu – bez animacji, gdy mapa nie jest jeszcze gotowa (źródło dawnych awarii). */
function FlyTo({ center, zoom }: { center: [number, number] | null; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    try {
      map.whenReady(() => map.flyTo(center, zoom, { duration: 0.6 }));
    } catch {
      map.setView(center, zoom, { animate: false });
    }
  }, [center, zoom, map]);
  useEffect(
    () => () => {
      // zatrzymaj animację przy odmontowaniu (np. szybkie przejście na inną stronę)
      map.stop();
    },
    [map],
  );
  return null;
}

const route = (p: Place) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${p.name}, ${p.address}, ${p.city}`)}`;

export default function PlacesMap({ places, focus, user, center }: { places: Place[]; focus: [number, number] | null; user: [number, number] | null; center: [number, number] }) {
  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="h-[340px] w-full sm:h-[460px]" attributionControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
      {places.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={10} pathOptions={{ color: "#ffffff", weight: 3, fillColor: PLACE_COLORS[p.type], fillOpacity: 1 }}>
          <Popup>
            <div style={{ fontFamily: "Lato, sans-serif", minWidth: 180 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: PLACE_COLORS[p.type], textTransform: "uppercase" }}>{PLACE_LABELS[p.type]}</div>
              <b style={{ fontSize: 14 }}>{p.name}</b>
              <div>
                {p.address}, {p.city}
              </div>
              {p.hours && <div style={{ color: "#5b6472" }}>{p.hours}</div>}
              {p.note && <div style={{ color: "#5b6472" }}>{p.note}</div>}
              <a href={route(p)} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 6, fontWeight: 700, color: "#33763c" }}>
                Wyznacz trasę →
              </a>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      {user && <CircleMarker center={user} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#1d5fbf", fillOpacity: 1 }} />}
      <FlyTo center={focus} zoom={14} />
    </MapContainer>
  );
}
