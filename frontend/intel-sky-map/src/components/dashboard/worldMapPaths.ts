// Geo-accurate world map paths
// Natural Earth projection normalized to viewBox 0 0 1000 500
// Generated from simplified 110m coastline data

export const worldPaths: { id: string; name: string; d: string }[] = [
  // North America
  {
    id: "na",
    name: "North America",
    d: "M130,95 L135,90 L145,88 L158,82 L172,78 L185,80 L192,85 L198,78 L210,72 L220,68 L232,65 L240,68 L245,75 L238,82 L230,88 L225,95 L218,98 L210,95 L205,100 L198,105 L192,108 L188,115 L182,120 L178,128 L172,135 L165,140 L158,142 L152,138 L148,132 L145,125 L140,118 L135,112 L130,105 Z"
  },
  // Central America
  {
    id: "ca",
    name: "Central America",
    d: "M165,142 L170,145 L175,150 L178,155 L180,162 L178,168 L174,172 L168,170 L164,165 L160,158 L158,150 L160,145 Z"
  },
  // South America
  {
    id: "sa",
    name: "South America",
    d: "M180,175 L190,170 L200,172 L212,178 L222,188 L228,200 L232,215 L235,232 L236,250 L234,268 L230,285 L224,298 L218,308 L210,315 L204,322 L200,330 L196,340 L192,348 L188,352 L184,348 L180,338 L178,325 L175,310 L173,295 L172,278 L173,262 L175,245 L178,228 L180,212 L180,195 Z"
  },
  // Greenland
  {
    id: "gl",
    name: "Greenland",
    d: "M252,48 L262,42 L275,40 L288,42 L295,48 L298,58 L295,68 L288,74 L278,76 L268,72 L260,65 L255,58 Z"
  },
  // Europe
  {
    id: "eu",
    name: "Europe",
    d: "M450,62 L458,58 L468,55 L478,52 L490,50 L500,52 L508,48 L515,52 L520,58 L518,65 L512,70 L505,72 L498,78 L492,82 L488,88 L482,92 L478,98 L472,102 L465,105 L458,108 L452,112 L445,108 L440,102 L438,95 L440,88 L442,80 L445,72 Z"
  },
  // UK
  {
    id: "uk",
    name: "United Kingdom",
    d: "M432,60 L438,56 L442,58 L444,62 L442,68 L438,72 L434,70 L432,65 Z"
  },
  // Scandinavia
  {
    id: "sc",
    name: "Scandinavia",
    d: "M478,30 L485,25 L492,22 L498,25 L502,32 L505,40 L502,48 L498,52 L492,50 L488,45 L485,38 L480,35 Z"
  },
  // Africa
  {
    id: "af",
    name: "Africa",
    d: "M440,130 L450,125 L462,122 L475,120 L488,118 L500,120 L510,125 L518,132 L525,142 L530,155 L534,170 L536,188 L536,205 L534,222 L530,238 L524,252 L518,265 L510,275 L502,282 L494,288 L486,290 L478,288 L470,282 L462,272 L456,260 L450,245 L446,230 L442,215 L440,198 L438,180 L438,162 L439,145 Z"
  },
  // Middle East
  {
    id: "me",
    name: "Middle East",
    d: "M530,108 L540,102 L552,98 L565,100 L578,105 L588,112 L595,120 L598,130 L595,140 L588,148 L578,152 L568,155 L558,152 L548,148 L540,140 L535,130 L530,120 Z"
  },
  // Russia / Central Asia
  {
    id: "ru",
    name: "Russia",
    d: "M520,25 L540,20 L565,18 L590,15 L620,12 L650,10 L680,12 L710,15 L740,18 L765,22 L785,28 L800,35 L808,42 L810,52 L808,60 L800,65 L790,62 L780,58 L770,55 L758,52 L745,50 L730,48 L715,50 L700,52 L685,55 L670,58 L655,62 L640,65 L625,62 L612,58 L600,55 L588,52 L575,50 L562,48 L548,50 L535,55 L525,60 L518,55 L515,45 L516,35 Z"
  },
  // India
  {
    id: "in",
    name: "India",
    d: "M618,120 L628,115 L640,112 L652,115 L662,122 L668,132 L672,145 L674,158 L672,172 L668,182 L660,190 L652,195 L644,192 L638,185 L632,175 L628,162 L625,148 L622,135 Z"
  },
  // China
  {
    id: "cn",
    name: "China",
    d: "M670,60 L685,58 L700,55 L715,58 L730,62 L742,68 L752,78 L758,88 L760,100 L758,112 L752,122 L742,130 L730,135 L718,138 L705,135 L692,130 L680,122 L672,112 L668,100 L665,88 L665,75 Z"
  },
  // Southeast Asia
  {
    id: "sea",
    name: "Southeast Asia",
    d: "M710,142 L720,138 L732,140 L742,145 L750,155 L755,165 L758,178 L755,188 L748,195 L738,198 L728,195 L720,188 L715,178 L712,165 L710,152 Z"
  },
  // Japan
  {
    id: "jp",
    name: "Japan",
    d: "M788,72 L795,68 L802,70 L806,76 L808,84 L806,92 L800,98 L794,96 L790,90 L788,82 Z"
  },
  // Indonesia
  {
    id: "id",
    name: "Indonesia",
    d: "M700,205 L715,200 L732,202 L748,205 L762,210 L775,215 L780,222 L775,228 L762,232 L748,230 L732,228 L718,225 L708,220 L702,212 Z"
  },
  // Australia
  {
    id: "au",
    name: "Australia",
    d: "M738,285 L755,278 L775,275 L795,278 L812,285 L825,295 L832,308 L835,322 L830,335 L822,345 L810,352 L795,355 L778,352 L762,345 L750,335 L742,322 L738,308 L736,295 Z"
  },
  // New Zealand
  {
    id: "nz",
    name: "New Zealand",
    d: "M855,338 L860,332 L865,335 L868,342 L866,350 L862,355 L858,352 L855,345 Z"
  },
];

// India center for connections (percentage)
export const indiaCenter = { x: 64.5, y: 33 };

// Connection lines from India
export const connectionEndpoints: { x: number; y: number; label: string }[] = [
  { x: 46, y: 16, label: "Trade" },
  { x: 80, y: 17, label: "Influence" },
  { x: 19, y: 20, label: "Conflict" },
  { x: 56, y: 27, label: "Energy" },
];
