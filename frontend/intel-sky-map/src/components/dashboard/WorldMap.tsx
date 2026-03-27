import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as topojson from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import { projectPoint, INDIA_PROJECTED, CONNECTION_TARGETS } from "./mapProjection";

const INDIA_ID = "356";
const [INDIA_X, INDIA_Y] = INDIA_PROJECTED;

type MapConnection = {
  label: string;
  impact?: number;
  code?: string;
};

const defaultConnections = CONNECTION_TARGETS.map((t) => ({ label: t.label }));

function geoPathToSvg(coordinates: number[][][]): string {
  return coordinates
    .map((ring) => {
      const points = ring.map(([lon, lat]) => {
        const [x, y] = projectPoint(lon, lat);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return `M${points.join("L")}Z`;
    })
    .join("");
}

function featureToPath(geometry: any): string {
  if (geometry.type === "Polygon") return geoPathToSvg(geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.map((poly: number[][][]) => geoPathToSvg(poly)).join("");
  return "";
}

interface WorldMapProps {
  selectedCountry?: string;
  mapConnections?: MapConnection[];
}

const WorldMap = ({ selectedCountry = "India", mapConnections = defaultConnections }: WorldMapProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [frame, setFrame] = useState(0);
  const animRef = useRef<number>(0);
  const navigate = useNavigate();

  const countries = useMemo(() => {
    const topo = worldData as any;
    const geo = topojson.feature(topo, topo.objects.countries) as any;
    return (geo.features as any[]).map((f) => ({
      id: f.id?.toString() ?? "",
      d: featureToPath(f.geometry),
    }));
  }, []);

  const connections = useMemo(() => {
    const source = mapConnections.length > 0 ? mapConnections : defaultConnections;
    return source.slice(0, 5).map((target, idx) => {
      const fallback = CONNECTION_TARGETS[idx % CONNECTION_TARGETS.length];
      const [tx, ty] = projectPoint(fallback.lon, fallback.lat);
      return {
        from: { x: INDIA_X, y: INDIA_Y },
        to: { x: tx, y: ty },
        label: target.label,
      };
    });
  }, [mapConnections]);

  useEffect(() => {
    let f = 0;
    const tick = () => {
      f += 1;
      setFrame(f);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const pulseR = 14 + Math.sin(frame * 0.03) * 5;

  return (
    <button
      type="button"
      className="relative h-full w-full overflow-hidden rounded-2xl border border-border/70 bg-[#060b13] text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
      onClick={() => navigate("/intelligence")}
      title="Click to explore intelligence view"
    >
      <svg ref={svgRef} viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        {Array.from({ length: 26 }, (_, i) => (
          <line key={`vg-${i}`} x1={i * 40} y1={0} x2={i * 40} y2={500} stroke="rgba(52, 72, 98, 0.16)" strokeWidth={0.5} />
        ))}
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`hg-${i}`} x1={0} y1={i * 40} x2={1000} y2={i * 40} stroke="rgba(52, 72, 98, 0.16)" strokeWidth={0.5} />
        ))}

        {countries.map((c) => (
          <path
            key={c.id}
            d={c.d}
            fill={c.id === INDIA_ID ? "rgba(255,83,67,0.26)" : "rgba(142,154,175,0.34)"}
            stroke={c.id === INDIA_ID ? "rgba(255,116,84,0.9)" : "rgba(131,145,168,0.55)"}
            strokeWidth={c.id === INDIA_ID ? 1.35 : 0.6}
          />
        ))}

        {connections.map((conn, ci) => {
          const { x: fx, y: fy } = conn.from;
          const { x: tx, y: ty } = conn.to;
          const cx = (fx + tx) / 2;
          const cy = Math.min(fy, ty) - 76;
          const dashOffset = -frame * 0.7 + ci * 16;
          return (
            <g key={ci}>
              <path
                d={`M${fx},${fy} Q${cx},${cy} ${tx},${ty}`}
                fill="none"
                stroke="rgba(255,154,82,0.72)"
                strokeWidth={1.4}
                strokeDasharray="8 10"
                strokeDashoffset={dashOffset}
              />
              <circle cx={tx} cy={ty} r={4} fill="rgba(255,180,112,0.7)" />
              <circle cx={tx} cy={ty} r={8} fill="rgba(255,180,112,0.14)" />
            </g>
          );
        })}

        <defs>
          <radialGradient id="india-hotspot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,80,70,0.7)" />
            <stop offset="40%" stopColor="rgba(255,95,72,0.45)" />
            <stop offset="100%" stopColor="rgba(255,80,70,0)" />
          </radialGradient>
          <radialGradient id="bg-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(31, 111, 172, 0.08)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>
        </defs>

        <circle cx="760" cy="120" r="260" fill="url(#bg-aura)" />
        <circle cx={INDIA_X} cy={INDIA_Y} r={pulseR * 4.8} fill="url(#india-hotspot)" />
        <circle cx={INDIA_X} cy={INDIA_Y} r={6.4} fill="#ff5e4a" />
      </svg>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black/25 to-transparent" />

      <div className="absolute bottom-4 left-4 rounded-lg border border-coral/55 bg-black/45 px-3 py-1.5 text-xs font-medium tracking-[0.08em] text-coral backdrop-blur-sm">
        Focus: {selectedCountry}
      </div>
    </button>
  );
};

export default WorldMap;
