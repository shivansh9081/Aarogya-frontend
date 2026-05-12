import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Leaflet + webpack issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  onSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

const MapPicker: React.FC<Props> = ({ onSelect, initialLat = 30.901, initialLng = 75.857 }) => {
  const mapRef     = useRef<HTMLDivElement>(null);
  const mapObj     = useRef<L.Map | null>(null);
  const markerObj  = useRef<L.Marker | null>(null);
  const [address, setAddress] = useState("");
  const [coords, setCoords]   = useState({ lat: initialLat, lng: initialLng });
  const [gpsLoading, setGps]  = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(addr);
      onSelect(lat, lng, addr);
    } catch {
      const addr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(addr);
      onSelect(lat, lng, addr);
    }
  };

  const moveMarker = (lat: number, lng: number) => {
    setCoords({ lat, lng });
    markerObj.current?.setLatLng([lat, lng]);
    mapObj.current?.setView([lat, lng], mapObj.current.getZoom());
    reverseGeocode(lat, lng);
  };

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;

    const map = L.map(mapRef.current, { zoomControl: true }).setView(
      [initialLat, initialLng], 14
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      moveMarker(lat, lng);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      moveMarker(e.latlng.lat, e.latlng.lng);
    });

    mapObj.current    = map;
    markerObj.current = marker;
    reverseGeocode(initialLat, initialLng);

    return () => { map.remove(); mapObj.current = null; };
  }, []);

  const handleGps = () => {
    setGps(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        moveMarker(pos.coords.latitude, pos.coords.longitude);
        setGps(false);
      },
      () => { setGps(false); alert("GPS unavailable"); }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="section-label">📍 Pick Location on Map</p>
        <motion.button type="button" onClick={handleGps} disabled={gpsLoading}
          className="text-xs px-3 py-1.5 rounded-full font-semibold"
          style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          {gpsLoading ? "Locating…" : "📡 Use GPS"}
        </motion.button>
      </div>

      {/* Map */}
      <div ref={mapRef} className="w-full rounded-2xl overflow-hidden"
        style={{ height: 260, border: "1px solid rgba(255,255,255,0.12)", zIndex: 0 }} />

      {/* Address */}
      {address && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl text-xs leading-relaxed"
          style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", color: "#f0ece8" }}>
          📍 {address}
        </motion.div>
      )}

      <p className="text-[10px] text-[#b8aec8]">
        Click map or drag pin · {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
      </p>
    </div>
  );
};

export default MapPicker;
