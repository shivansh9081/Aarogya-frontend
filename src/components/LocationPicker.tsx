/**
 * LocationPicker — Search + always-visible Leaflet map
 *
 * - Search box with Indian city DB (or Google Places if API key set)
 * - Leaflet map always shown below the search bar
 * - Click map or drag marker to pick location + auto reverse-geocode
 * - GPS "use my location" button
 * - Outputs structured LocationData
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Loader2 } from "lucide-react";
import { LocationData, searchLocations } from "../data/indianLocations";

// ── Custom green SVG marker ───────────────────────────────────────────────────
const GREEN_MARKER = L.divIcon({
  className: "",
  html: `
    <div style="
      width:32px;height:42px;position:relative;
      filter:drop-shadow(0 4px 8px rgba(34,197,94,0.5));
    ">
      <svg viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 16 26 16 26S32 26.5 32 16C32 7.163 24.837 0 16 0z"
          fill="#22c55e" stroke="#16a34a" stroke-width="1.5"/>
        <circle cx="16" cy="16" r="6" fill="white" opacity="0.9"/>
        <circle cx="16" cy="16" r="3" fill="#16a34a"/>
      </svg>
    </div>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -44],
});

export type { LocationData };

interface Props {
  value: LocationData | null;
  onChange: (loc: LocationData | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  /** px height. 0 = hide map entirely. -1 = fill parent (100%). Default 280 */
  mapHeight?: number;
}

const GOOGLE_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const USE_GOOGLE = Boolean(GOOGLE_KEY && GOOGLE_KEY !== "YOUR_GOOGLE_API_KEY");

// ── Nominatim reverse geocode ─────────────────────────────────────────────────
async function nominatimReverse(lat: number, lng: number): Promise<LocationData | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const a = data.address || {};
    return {
      area:      a.suburb || a.neighbourhood || a.village || a.town || "",
      city:      a.city   || a.town          || a.county  || "",
      state:     a.state  || "",
      country:   a.country || "India",
      latitude:  lat,
      longitude: lng,
      display:   data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };
  } catch {
    return null;
  }
}

// ── Google Maps lazy loader ───────────────────────────────────────────────────
let googleLoaded = false;
let googleLoading = false;
const googleCallbacks: (() => void)[] = [];
function loadGoogleMaps(cb: () => void) {
  if (googleLoaded) { cb(); return; }
  googleCallbacks.push(cb);
  if (googleLoading) return;
  googleLoading = true;
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
  script.async = true;
  script.onload = () => {
    googleLoaded = true; googleLoading = false;
    googleCallbacks.forEach(fn => fn()); googleCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

function parseGooglePlace(place: any): LocationData | null {
  if (!place.address_components || !place.geometry) return null;
  const get = (type: string) =>
    place.address_components.find((c: any) => c.types.includes(type))?.long_name || "";
  return {
    area:      get("sublocality_level_1") || get("locality") || get("neighborhood") || "",
    city:      get("administrative_area_level_2") || get("locality") || "",
    state:     get("administrative_area_level_1") || "",
    country:   get("country") || "India",
    latitude:  place.geometry.location.lat(),
    longitude: place.geometry.location.lng(),
    display:   place.formatted_address || "",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
const LocationPicker: React.FC<Props> = ({
  value,
  onChange,
  placeholder = "Search area, city...",
  required,
  className,
  mapHeight = 280,
}) => {
  const fillParent = mapHeight === -1;
  const hideMap    = mapHeight === 0;
  const [query, setQuery]           = useState(value?.display || "");
  const [suggestions, setSuggestions] = useState<LocationData[]>([]);
  const [open, setOpen]             = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geocoding, setGeocoding]   = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  const inputRef     = useRef<HTMLInputElement>(null);
  const acRef        = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapDivRef    = useRef<HTMLDivElement>(null);
  const leafletMap   = useRef<L.Map | null>(null);
  const markerRef    = useRef<L.Marker | null>(null);

  // Sync display when value changes externally
  useEffect(() => { setQuery(value?.display || ""); }, [value]);

  // Load Google Maps if key present
  useEffect(() => {
    if (!USE_GOOGLE) return;
    loadGoogleMaps(() => setGoogleReady(true));
  }, []);

  // Attach Google Autocomplete once ready
  useEffect(() => {
    if (!USE_GOOGLE || !googleReady || !inputRef.current) return;
    const ac = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "in" },
      fields: ["address_components", "geometry", "formatted_address"],
      types: ["geocode", "establishment"],
    });
    acRef.current = ac;
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const parsed = parseGooglePlace(place);
      if (parsed) {
        onChange(parsed);
        setQuery(parsed.display);
        setSuggestions([]);
        setOpen(false);
      }
    });
    return () => (window as any).google?.maps?.event?.clearInstanceListeners(ac);
  }, [googleReady, onChange]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Init Leaflet map (always visible) ────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || leafletMap.current) return;

    const center: [number, number] = value?.latitude && value?.longitude
      ? [value.latitude, value.longitude]
      : [20.5937, 78.9629]; // India center

    const zoom = value?.latitude ? 13 : 5;
    const map = L.map(mapDivRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
    }).setView(center, zoom);

    // Dark-tinted tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Place marker if value already set
    if (value?.latitude && value?.longitude) {
      markerRef.current = L.marker([value.latitude, value.longitude], {
        icon: GREEN_MARKER,
        draggable: true,
      }).addTo(map);

      markerRef.current.on("dragend", async () => {
        const { lat, lng } = markerRef.current!.getLatLng();
        setGeocoding(true);
        const loc = await nominatimReverse(lat, lng);
        setGeocoding(false);
        const result: LocationData = loc || {
          area: "", city: "", state: "", country: "India",
          latitude: lat, longitude: lng,
          display: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        };
        onChange(result);
        setQuery(result.display);
      });
    }

    // Click to place / move marker
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], {
          icon: GREEN_MARKER,
          draggable: true,
        }).addTo(map);

        markerRef.current.on("dragend", async () => {
          const pos = markerRef.current!.getLatLng();
          setGeocoding(true);
          const loc = await nominatimReverse(pos.lat, pos.lng);
          setGeocoding(false);
          const result: LocationData = loc || {
            area: "", city: "", state: "", country: "India",
            latitude: pos.lat, longitude: pos.lng,
            display: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
          };
          onChange(result);
          setQuery(result.display);
        });
      }

      setGeocoding(true);
      const loc = await nominatimReverse(lat, lng);
      setGeocoding(false);
      const result: LocationData = loc || {
        area: "", city: "", state: "", country: "India",
        latitude: lat, longitude: lng,
        display: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      };
      onChange(result);
      setQuery(result.display);
    });

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      markerRef.current = null;
    };
  // init once — value/onChange intentionally omitted to avoid re-init
  }, []);

  // Move marker when value changes externally
  useEffect(() => {
    if (!leafletMap.current || !value?.latitude || !value?.longitude) return;
    const latlng: [number, number] = [value.latitude, value.longitude];

    if (markerRef.current) {
      markerRef.current.setLatLng(latlng);
    } else {
      markerRef.current = L.marker(latlng, {
        icon: GREEN_MARKER,
        draggable: true,
      }).addTo(leafletMap.current);

      markerRef.current.on("dragend", async () => {
        const pos = markerRef.current!.getLatLng();
        setGeocoding(true);
        const loc = await nominatimReverse(pos.lat, pos.lng);
        setGeocoding(false);
        const result: LocationData = loc || {
          area: "", city: "", state: "", country: "India",
          latitude: pos.lat, longitude: pos.lng,
          display: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
        };
        onChange(result);
        setQuery(result.display);
      });
    }

    leafletMap.current.setView(latlng, Math.max(leafletMap.current.getZoom(), 13));
  }, [value, onChange]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (value) onChange(null);
    if (!USE_GOOGLE) {
      const results = searchLocations(q);
      setSuggestions(results);
      setOpen(results.length > 0);
    }
  }, [value, onChange]);

  const handleSelect = (loc: LocationData) => {
    onChange(loc);
    setQuery(loc.display);
    setSuggestions([]);
    setOpen(false);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported."); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const loc = await nominatimReverse(latitude, longitude);
        const result: LocationData = loc || {
          area: "Current Location", city: "", state: "", country: "India",
          latitude, longitude,
          display: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        };
        onChange(result);
        setQuery(result.display);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        alert("Could not get location. Please enter manually or click the map.");
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    // Reset map to India center
    if (leafletMap.current) {
      leafletMap.current.setView([20.5937, 78.9629], 5);
    }
    if (markerRef.current && leafletMap.current) {
      leafletMap.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}
      style={fillParent ? { height: "100%", display: "flex", flexDirection: "column" } : undefined}>

      {/* ── Search row (hidden in fill-parent mode when no placeholder) ── */}
      {placeholder !== "" && (
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
              {geocoding ? "⟳" : "📍"}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInput}
              onFocus={() => !USE_GOOGLE && suggestions.length > 0 && setOpen(true)}
              placeholder={placeholder}
              required={required}
              autoComplete="off"
              className="glass-input pl-8 pr-8 w-full"
              style={{
                borderColor: value ? "rgba(34,197,94,0.5)" : undefined,
                fontSize: "0.875rem",
              }}
            />
            {query && (
              <button type="button" onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b8aec8] hover:text-[#f0ece8] text-sm transition-colors">
                ✕
              </button>
            )}
          </div>

          {/* GPS button */}
          <button type="button" onClick={handleGPS} disabled={geoLoading}
            title="Use current location"
            className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.35)" }}>
            {geoLoading
              ? <Loader2 size={16} color="#4ade80" className="animate-spin" />
              : <LocateFixed size={16} color="#4ade80" strokeWidth={2} />}
          </button>
        </div>
      )}

      {/* ── Dropdown suggestions ── */}
      {!USE_GOOGLE && open && suggestions.length > 0 && (
        <div className="absolute top-12 left-0 right-0 z-[9999] rounded-2xl overflow-hidden animate-slide-up"
          style={{
            background: "#0e1f12",
            border: "1px solid rgba(74,222,128,0.2)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          }}>
          {suggestions.map((loc, i) => (
            <button key={i} type="button" onMouseDown={() => handleSelect(loc)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-white/5 border-b border-white/5 last:border-0">
              <span className="text-sm mt-0.5 flex-shrink-0">📍</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#f0fdf4] truncate">{loc.area}</p>
                <p className="text-xs text-[#6ee7b7]">{loc.city}, {loc.state}</p>
              </div>
              <p className="text-[10px] text-[#4b7a5e] font-mono flex-shrink-0 self-center">
                {loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* ── Map (hidden when mapHeight=0) ── */}
      {!hideMap && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: "1px solid rgba(74,222,128,0.2)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            position: "relative",
            flex: fillParent ? 1 : undefined,
          }}>

          {/* Map header bar */}
          {!fillParent && (
            <div className="flex items-center justify-between px-3 py-2"
              style={{
                background: "rgba(14,31,18,0.95)",
                borderBottom: "1px solid rgba(74,222,128,0.15)",
              }}>
              <div className="flex items-center gap-2">
                <span className="text-sm">🗺️</span>
                <span className="text-xs font-medium" style={{ color: "#6ee7b7" }}>
                  {value ? "Location pinned" : "Click map to pin location"}
                </span>
                {geocoding && (
                  <span className="text-xs animate-pulse" style={{ color: "#4ade80" }}>
                    · Geocoding…
                  </span>
                )}
              </div>
              {value?.latitude && (
                <span className="text-[10px] font-mono" style={{ color: "#4b7a5e" }}>
                  {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
                </span>
              )}
            </div>
          )}

          {/* Map container */}
          <div ref={mapDivRef}
            style={{
              height: fillParent ? "100%" : mapHeight,
              width: "100%",
            }}
          />

          {/* Instruction overlay */}
          {!value && (
            <div style={{
              position: "absolute",
              bottom: 12, left: "50%", transform: "translateX(-50%)",
              background: "rgba(8,15,10,0.82)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(74,222,128,0.25)",
              borderRadius: 999,
              padding: "5px 14px",
              pointerEvents: "none",
              zIndex: 500,
            }}>
              <p style={{ fontSize: "0.7rem", color: "#6ee7b7", whiteSpace: "nowrap" }}>
                📍 Click anywhere · drag pin · or use GPS
              </p>
            </div>
          )}

          {/* GPS button overlay (fill-parent mode) */}
          {fillParent && (
            <button type="button" onClick={handleGPS} disabled={geoLoading}
              title="Use current location"
              style={{
                position: "absolute", top: 12, right: 12, zIndex: 500,
                width: 36, height: 36, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(14,31,18,0.9)",
                border: "1px solid rgba(74,222,128,0.35)",
                cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}>
              {geoLoading
                ? <Loader2 size={16} color="#4ade80" className="animate-spin" />
                : <LocateFixed size={16} color="#4ade80" strokeWidth={2} />}
            </button>
          )}

          {/* Geocoding indicator (fill-parent mode) */}
          {fillParent && geocoding && (
            <div style={{
              position: "absolute", top: 12, left: 12, zIndex: 500,
              background: "rgba(14,31,18,0.9)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(74,222,128,0.25)",
              borderRadius: 8, padding: "4px 10px",
              fontSize: "0.7rem", color: "#4ade80",
            }}>
              ⟳ Geocoding…
            </div>
          )}
        </div>
      )}

      {/* ── Selected location chips (non-fill mode, only when map is visible) ── */}
      {!fillParent && !hideMap && value && (
        <div className="mt-2 flex flex-wrap gap-2 animate-fade-in">
          {[
            value.area  && { label: value.area,  color: "#a78bfa" },
            value.city  && { label: value.city,  color: "#4ade80" },
            value.state && { label: value.state, color: "#6ee7b7" },
          ].filter(Boolean).map((chip: any, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: `${chip.color}18`,
                border: `1px solid ${chip.color}40`,
                color: chip.color,
              }}>
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* Mode indicator (non-fill mode, only when map is visible) */}
      {!fillParent && !hideMap && placeholder !== "" && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${USE_GOOGLE ? "bg-green-400" : "bg-amber-400"}`} />
          <span className="text-[10px]" style={{ color: "#4b7a5e" }}>
            {USE_GOOGLE ? "Google Places active" : "OpenStreetMap · search or click map"}
          </span>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
