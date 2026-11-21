"use client";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { Place, PlaceType } from "@/data/organize";

const COLORS: Record<PlaceType, string> = { zus: "#5b9bff", usc: "#f6c955", poz: "#34e3a5", szpital: "#ff5d7d" };

function FlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13, { duration: 0.8 });
  }, [center, map]);
  return null;
}

export default function PlacesMap({ places, focus, user }: { places: Place[]; focus: [number, number] | null; user: [number, number] | null }) {
  return (
    <MapContainer center={[52.235, 21.01]} zoom={12} scrollWheelZoom={false} className="h-[360px] w-full sm:h-[440px]" attributionControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {places.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={9} pathOptions={{ color: "#0b0e14", weight: 2, fillColor: COLORS[p.type], fillOpacity: 0.95 }}>
          <Popup>
            <b>{p.name}</b>
            <br />
            {p.address}
            {p.note && (
              <>
                <br />
                <i>{p.note}</i>
              </>
            )}
          </Popup>
        </CircleMarker>
      ))}
      {user && <CircleMarker center={user} radius={7} pathOptions={{ color: "#fff", weight: 3, fillColor: "#5b9bff", fillOpacity: 1 }} />}
      <FlyTo center={focus} />
    </MapContainer>
  );
}
