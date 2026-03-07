/**
 * Color Palette MCP Server v1.0.0 — Design Utility for AI Agents
 *
 * Tools:
 *   - generate_palette: Generate harmonious color palettes using color theory
 *   - contrast_check: WCAG 2.1 contrast ratio checker (AA/AAA)
 *   - color_convert: Convert between hex, RGB, HSL, and CSS named colors
 *   - css_gradient: Generate CSS gradient code (linear/radial/conic)
 *   - tailwind_colors: Lookup Tailwind CSS v3 color shades or find nearest match
 *
 * Architecture: JSON-RPC 2.0, MCP 2025-03-26, CORS, KV rate limiting (20/day free)
 * Vendor: OpenClaw Intelligence
 */

const SERVER_INFO = { name: 'color-palette', version: '1.0.0' };
const CAPABILITIES = { tools: {} };

const ECOSYSTEM = {
  color:      'https://color-palette-mcp.yagami8095.workers.dev/mcp',
  json:       'https://json-toolkit-mcp.yagami8095.workers.dev/mcp',
  regex:      'https://regex-engine-mcp.yagami8095.workers.dev/mcp',
  prompt:     'https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp',
  timestamp:  'https://timestamp-converter-mcp.yagami8095.workers.dev/mcp',
  intel:      'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  fortune:    'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  moltbook:   'https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp',
  agentforge: 'https://agentforge-compare-mcp.yagami8095.workers.dev/mcp',
  store:      'https://product-store.yagami8095.workers.dev',
  fortune_api:'https://fortune-api.yagami8095.workers.dev',
  intel_api:  'https://openclaw-intel-api.yagami8095.workers.dev',
};

// ============================================================
// MCP TOOLS DEFINITION
// ============================================================
const TOOLS = [
  {
    name: 'generate_palette',
    description: 'Generate a harmonious color palette using color theory. Provide a base color, mood, or both. Returns an array of colors with hex, rgb, hsl, name, and CSS variable. Harmony modes use HSL rotation (complementary=180°, analogous=30°, triadic=120°, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        base_color: {
          type: 'string',
          description: 'Base hex color (e.g., "#3b82f6" or "3b82f6"). Optional if mood is provided.',
        },
        mood: {
          type: 'string',
          enum: ['warm', 'cool', 'vibrant', 'pastel', 'dark', 'earth', 'neon'],
          description: 'Mood/style of the palette. Warm: reds/oranges. Cool: blues/purples. Vibrant: saturated. Pastel: soft. Dark: deep. Earth: natural browns/greens. Neon: electric bright.',
        },
        count: {
          type: 'number',
          description: 'Number of colors to generate (2-10, default: 5)',
        },
        harmony: {
          type: 'string',
          enum: ['complementary', 'analogous', 'triadic', 'split-complementary', 'monochromatic'],
          description: 'Color harmony rule. complementary=opposite hue. analogous=adjacent hues. triadic=120° apart. split-complementary=two colors flanking complement. monochromatic=same hue, varying lightness.',
        },
      },
    },
  },
  {
    name: 'contrast_check',
    description: 'Check WCAG 2.1 accessibility contrast ratio between two colors. Returns the contrast ratio, AA pass/fail (4.5:1 normal, 3:1 large), AAA pass/fail (7:1 normal, 4.5:1 large), and suggestions for improving contrast if it fails.',
    inputSchema: {
      type: 'object',
      properties: {
        foreground: {
          type: 'string',
          description: 'Foreground (text) color as hex (e.g., "#ffffff"), rgb, hsl, or CSS name',
        },
        background: {
          type: 'string',
          description: 'Background color as hex, rgb, hsl, or CSS name',
        },
      },
      required: ['foreground', 'background'],
    },
  },
  {
    name: 'color_convert',
    description: 'Convert a color between formats: hex, rgb, hsl, and CSS named colors (140 standard names). Input any format and optionally specify the target format. Returns all formats if to_format is omitted.',
    inputSchema: {
      type: 'object',
      properties: {
        color: {
          type: 'string',
          description: 'Input color in any format: "#3b82f6", "rgb(59,130,246)", "hsl(217,91%,60%)", or CSS name like "cornflowerblue"',
        },
        to_format: {
          type: 'string',
          enum: ['hex', 'rgb', 'hsl', 'name', 'all'],
          description: 'Target format (default: all — returns all formats)',
        },
      },
      required: ['color'],
    },
  },
  {
    name: 'css_gradient',
    description: 'Generate ready-to-use CSS gradient code from an array of hex colors. Supports linear, radial, and conic gradients. Returns the CSS property value and a description of the visual effect.',
    inputSchema: {
      type: 'object',
      properties: {
        colors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of hex colors (e.g., ["#ff6b6b", "#4ecdc4", "#45b7d1"]). Minimum 2 colors.',
        },
        direction: {
          type: 'string',
          description: 'Gradient direction for linear (default: "to right"). Examples: "to bottom", "45deg", "135deg", "to bottom right".',
        },
        type: {
          type: 'string',
          enum: ['linear', 'radial', 'conic'],
          description: 'Gradient type (default: linear)',
        },
      },
      required: ['colors'],
    },
  },
  {
    name: 'tailwind_colors',
    description: 'Look up Tailwind CSS v3 color values. Provide color_name to get all shades (50–950), or provide closest_to (a hex value) to find the nearest Tailwind color and shade.',
    inputSchema: {
      type: 'object',
      properties: {
        color_name: {
          type: 'string',
          description: 'Tailwind color name (e.g., "blue", "emerald", "rose", "slate"). Returns all shades 50–950.',
        },
        closest_to: {
          type: 'string',
          description: 'A hex color (e.g., "#3b82f6"). Returns the nearest Tailwind color and shade.',
        },
      },
    },
  },
];

// ============================================================
// CSS NAMED COLORS (140 standard)
// ============================================================
const CSS_NAMED_COLORS = {
  aliceblue: '#f0f8ff', antiquewhite: '#faebd7', aqua: '#00ffff',
  aquamarine: '#7fffd4', azure: '#f0ffff', beige: '#f5f5dc',
  bisque: '#ffe4c4', black: '#000000', blanchedalmond: '#ffebcd',
  blue: '#0000ff', blueviolet: '#8a2be2', brown: '#a52a2a',
  burlywood: '#deb887', cadetblue: '#5f9ea0', chartreuse: '#7fff00',
  chocolate: '#d2691e', coral: '#ff7f50', cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc', crimson: '#dc143c', cyan: '#00ffff',
  darkblue: '#00008b', darkcyan: '#008b8b', darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9', darkgreen: '#006400', darkgrey: '#a9a9a9',
  darkkhaki: '#bdb76b', darkmagenta: '#8b008b', darkolivegreen: '#556b2f',
  darkorange: '#ff8c00', darkorchid: '#9932cc', darkred: '#8b0000',
  darksalmon: '#e9967a', darkseagreen: '#8fbc8f', darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f', darkslategrey: '#2f4f4f', darkturquoise: '#00ced1',
  darkviolet: '#9400d3', deeppink: '#ff1493', deepskyblue: '#00bfff',
  dimgray: '#696969', dimgrey: '#696969', dodgerblue: '#1e90ff',
  firebrick: '#b22222', floralwhite: '#fffaf0', forestgreen: '#228b22',
  fuchsia: '#ff00ff', gainsboro: '#dcdcdc', ghostwhite: '#f8f8ff',
  gold: '#ffd700', goldenrod: '#daa520', gray: '#808080',
  green: '#008000', greenyellow: '#adff2f', grey: '#808080',
  honeydew: '#f0fff0', hotpink: '#ff69b4', indianred: '#cd5c5c',
  indigo: '#4b0082', ivory: '#fffff0', khaki: '#f0e68c',
  lavender: '#e6e6fa', lavenderblush: '#fff0f5', lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd', lightblue: '#add8e6', lightcoral: '#f08080',
  lightcyan: '#e0ffff', lightgoldenrodyellow: '#fafad2', lightgray: '#d3d3d3',
  lightgreen: '#90ee90', lightgrey: '#d3d3d3', lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a', lightseagreen: '#20b2aa', lightskyblue: '#87cefa',
  lightslategray: '#778899', lightslategrey: '#778899', lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0', lime: '#00ff00', limegreen: '#32cd32',
  linen: '#faf0e6', magenta: '#ff00ff', maroon: '#800000',
  mediumaquamarine: '#66cdaa', mediumblue: '#0000cd', mediumorchid: '#ba55d3',
  mediumpurple: '#9370db', mediumseagreen: '#3cb371', mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a', mediumturquoise: '#48d1cc', mediumvioletred: '#c71585',
  midnightblue: '#191970', mintcream: '#f5fffa', mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5', navajowhite: '#ffdead', navy: '#000080',
  oldlace: '#fdf5e6', olive: '#808000', olivedrab: '#6b8e23',
  orange: '#ffa500', orangered: '#ff4500', orchid: '#da70d6',
  palegoldenrod: '#eee8aa', palegreen: '#98fb98', paleturquoise: '#afeeee',
  palevioletred: '#db7093', papayawhip: '#ffefd5', peachpuff: '#ffdab9',
  peru: '#cd853f', pink: '#ffc0cb', plum: '#dda0dd',
  powderblue: '#b0e0e6', purple: '#800080', rebeccapurple: '#663399',
  red: '#ff0000', rosybrown: '#bc8f8f', royalblue: '#4169e1',
  saddlebrown: '#8b4513', salmon: '#fa8072', sandybrown: '#f4a460',
  seagreen: '#2e8b57', seashell: '#fff5ee', sienna: '#a0522d',
  silver: '#c0c0c0', skyblue: '#87ceeb', slateblue: '#6a5acd',
  slategray: '#708090', slategrey: '#708090', snow: '#fffafa',
  springgreen: '#00ff7f', steelblue: '#4682b4', tan: '#d2b48c',
  teal: '#008080', thistle: '#d8bfd8', tomato: '#ff6347',
  turquoise: '#40e0d0', violet: '#ee82ee', wheat: '#f5deb3',
  white: '#ffffff', whitesmoke: '#f5f5f5', yellow: '#ffff00',
  yellowgreen: '#9acd32',
};

// ============================================================
// TAILWIND CSS v3 COLOR DATABASE
// ============================================================
const TAILWIND_COLORS = {
  slate: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
    800: '#1e293b', 900: '#0f172a', 950: '#020617',
  },
  gray: {
    50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db',
    400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151',
    800: '#1f2937', 900: '#111827', 950: '#030712',
  },
  zinc: {
    50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8',
    400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46',
    800: '#27272a', 900: '#18181b', 950: '#09090b',
  },
  neutral: {
    50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4',
    400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040',
    800: '#262626', 900: '#171717', 950: '#0a0a0a',
  },
  stone: {
    50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1',
    400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c',
    800: '#292524', 900: '#1c1917', 950: '#0c0a09',
  },
  red: {
    50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
    400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
    800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a',
  },
  orange: {
    50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
    400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
    800: '#9a3412', 900: '#7c2d12', 950: '#431407',
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
    400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
    800: '#92400e', 900: '#78350f', 950: '#451a03',
  },
  yellow: {
    50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047',
    400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207',
    800: '#854d0e', 900: '#713f12', 950: '#422006',
  },
  lime: {
    50: '#f7fee7', 100: '#ecfccb', 200: '#d9f99d', 300: '#bef264',
    400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f',
    800: '#3f6212', 900: '#365314', 950: '#1a2e05',
  },
  green: {
    50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
    400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
    800: '#166534', 900: '#14532d', 950: '#052e16',
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
    400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
    800: '#065f46', 900: '#064e3b', 950: '#022c22',
  },
  teal: {
    50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
    400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
    800: '#115e59', 900: '#134e4a', 950: '#042f2e',
  },
  cyan: {
    50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
    400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
    800: '#155e75', 900: '#164e63', 950: '#083344',
  },
  sky: {
    50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
    400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
    800: '#075985', 900: '#0c4a6e', 950: '#082f49',
  },
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
    800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
  },
  indigo: {
    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
    400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
    800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
  },
  violet: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
    400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
    800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065',
  },
  purple: {
    50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
    400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
    800: '#6b21a8', 900: '#581c87', 950: '#3b0764',
  },
  fuchsia: {
    50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc',
    400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf',
    800: '#86198f', 900: '#701a75', 950: '#4a044e',
  },
  pink: {
    50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4',
    400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d',
    800: '#9d174d', 900: '#831843', 950: '#500724',
  },
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
    400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
    800: '#9f1239', 900: '#881337', 950: '#4c0519',
  },
};

const TAILWIND_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const TAILWIND_COLOR_NAMES = Object.keys(TAILWIND_COLORS);

// ============================================================
// COLOR UTILITY FUNCTIONS
// ============================================================

/** Parse any color input to [r, g, b] (0-255) */
function parseColor(input) {
  if (!input) return null;
  const s = input.trim().toLowerCase();

  // Hex
  const hexMatch = s.match(/^#?([0-9a-f]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    if (hex.length === 4) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
    if (hex.length === 6 || hex.length === 8) {
      return [
        parseInt(hex.slice(0,2), 16),
        parseInt(hex.slice(2,4), 16),
        parseInt(hex.slice(4,6), 16),
      ];
    }
  }

  // CSS named color
  const namedHex = CSS_NAMED_COLORS[s];
  if (namedHex) return parseColor(namedHex);

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];

  // rgb with spaces
  const rgbSpaceMatch = s.match(/rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)/);
  if (rgbSpaceMatch) return [parseInt(rgbSpaceMatch[1]), parseInt(rgbSpaceMatch[2]), parseInt(rgbSpaceMatch[3])];

  // hsl(h, s%, l%)
  const hslMatch = s.match(/hsla?\(\s*([\d.]+)\s*,?\s*([\d.]+)%?\s*,?\s*([\d.]+)%?/);
  if (hslMatch) {
    return hslToRgb(parseFloat(hslMatch[1]), parseFloat(hslMatch[2]), parseFloat(hslMatch[3]));
  }

  return null;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if      (h < 60)  { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** WCAG relative luminance of an sRGB color */
function relativeLuminance(r, g, b) {
  const toLinear = c => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 2.1 contrast ratio */
function contrastRatio(rgb1, rgb2) {
  const L1 = relativeLuminance(...rgb1);
  const L2 = relativeLuminance(...rgb2);
  const lighter = Math.max(L1, L2);
  const darker  = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Generate a human-friendly color name approximation */
function approximateColorName(r, g, b) {
  // Find closest CSS named color by Euclidean distance
  let bestName = 'unknown', bestDist = Infinity;
  for (const [name, hex] of Object.entries(CSS_NAMED_COLORS)) {
    const nr = parseInt(hex.slice(1,3), 16);
    const ng = parseInt(hex.slice(3,5), 16);
    const nb = parseInt(hex.slice(5,7), 16);
    const dist = Math.sqrt((r-nr)**2 + (g-ng)**2 + (b-nb)**2);
    if (dist < bestDist) { bestDist = dist; bestName = name; }
  }
  return bestName;
}

/** Format a color as all representations */
function formatColor(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  const hex = rgbToHex(r, g, b);
  const name = approximateColorName(r, g, b);
  const cssVar = '--color-' + name.replace(/\s+/g, '-');
  return {
    hex,
    rgb: `rgb(${r}, ${g}, ${b})`,
    rgb_object: { r, g, b },
    hsl: `hsl(${h}, ${s}%, ${l}%)`,
    hsl_object: { h, s, l },
    name,
    css_variable: `${cssVar}: ${hex};`,
  };
}

// ============================================================
// MOOD PRESETS (HSL ranges)
// ============================================================
const MOOD_PRESETS = {
  warm:    { hMin: 0,   hMax: 60,  sMin: 50, sMax: 90, lMin: 35, lMax: 65 },
  cool:    { hMin: 180, hMax: 270, sMin: 40, sMax: 80, lMin: 35, lMax: 65 },
  vibrant: { hMin: 0,   hMax: 360, sMin: 75, sMax: 100,lMin: 45, lMax: 60 },
  pastel:  { hMin: 0,   hMax: 360, sMin: 20, sMax: 50, lMin: 70, lMax: 90 },
  dark:    { hMin: 0,   hMax: 360, sMin: 20, sMax: 70, lMin: 10, lMax: 35 },
  earth:   { hMin: 15,  hMax: 120, sMin: 20, sMax: 55, lMin: 25, lMax: 55 },
  neon:    { hMin: 0,   hMax: 360, sMin: 90, sMax: 100,lMin: 50, lMax: 65 },
};

/** Simple seeded random for deterministic palettes */
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }

// ============================================================
// TOOL HANDLERS
// ============================================================

function handleGeneratePalette(args) {
  const count  = Math.max(2, Math.min(10, args.count || 5));
  const mood   = args.mood;
  const harmony= args.harmony;
  let baseColor = args.base_color;

  // Determine base hue, saturation, lightness
  let baseH, baseS, baseL;

  if (baseColor) {
    const rgb = parseColor(baseColor);
    if (!rgb) return mcpError('Invalid base_color. Use hex, rgb(), hsl(), or a CSS color name.');
    [baseH, baseS, baseL] = rgbToHsl(...rgb);
  } else if (mood) {
    const preset = MOOD_PRESETS[mood];
    const rand = seededRand(Date.now() & 0xffff);
    baseH = Math.round(lerp(preset.hMin, preset.hMax, rand()));
    baseS = Math.round(lerp(preset.sMin, preset.sMax, rand()));
    baseL = Math.round(lerp(preset.lMin, preset.lMax, rand()));
  } else {
    // Default: generate a pleasant blue
    baseH = 210; baseS = 70; baseL = 55;
  }

  // Apply mood constraints if both mood and base_color are given
  let sMin = 20, sMax = 95, lMin = 20, lMax = 80;
  if (mood && MOOD_PRESETS[mood]) {
    const p = MOOD_PRESETS[mood];
    sMin = p.sMin; sMax = p.sMax; lMin = p.lMin; lMax = p.lMax;
    // Clamp base values to mood range
    baseS = Math.max(sMin, Math.min(sMax, baseS));
    baseL = Math.max(lMin, Math.min(lMax, baseL));
  }

  // Generate hue angles based on harmony
  let hues;
  const effectiveHarmony = harmony || 'analogous';

  switch (effectiveHarmony) {
    case 'complementary': {
      // Alternate between base and complement with variations
      const complement = (baseH + 180) % 360;
      hues = Array.from({ length: count }, (_, i) => {
        const isComplement = i % 2 === 1;
        const pivot = isComplement ? complement : baseH;
        const offset = Math.floor(i / 2) * (i % 2 === 0 ? 1 : -1) * 15;
        return (pivot + offset + 360) % 360;
      });
      break;
    }
    case 'triadic': {
      const t1 = (baseH + 120) % 360;
      const t2 = (baseH + 240) % 360;
      const anchors = [baseH, t1, t2];
      hues = Array.from({ length: count }, (_, i) => (anchors[i % 3] + Math.floor(i / 3) * 15) % 360);
      break;
    }
    case 'split-complementary': {
      const s1 = (baseH + 150) % 360;
      const s2 = (baseH + 210) % 360;
      const anchors = [baseH, s1, s2];
      hues = Array.from({ length: count }, (_, i) => (anchors[i % 3] + Math.floor(i / 3) * 10) % 360);
      break;
    }
    case 'monochromatic': {
      // Same hue, vary lightness and saturation evenly
      hues = Array.from({ length: count }, () => baseH);
      break;
    }
    case 'analogous':
    default: {
      // 30° steps around base
      const step = 30;
      const half = Math.floor(count / 2);
      hues = Array.from({ length: count }, (_, i) => ((baseH + (i - half) * step) + 360) % 360);
      break;
    }
  }

  // Build color entries
  const colors = hues.map((h, i) => {
    let s, l;
    if (effectiveHarmony === 'monochromatic') {
      // Spread lightness evenly across lMin..lMax
      const t = count === 1 ? 0.5 : i / (count - 1);
      l = Math.round(lerp(lMax - 10, lMin + 10, t));
      // Slightly vary saturation
      s = Math.round(baseS + (i % 2 === 0 ? 5 : -5));
      s = Math.max(sMin, Math.min(sMax, s));
    } else {
      // Gentle lightness variation around base
      const lightOffset = (i - Math.floor(count / 2)) * 6;
      l = Math.max(lMin, Math.min(lMax, baseL + lightOffset));
      // Slight saturation variation
      const satOffset = (i % 3 - 1) * 8;
      s = Math.max(sMin, Math.min(sMax, baseS + satOffset));
    }
    const [r, g, b] = hslToRgb(h, s, l);
    return formatColor(r, g, b);
  });

  return {
    palette: colors,
    metadata: {
      base_color: rgbToHex(...hslToRgb(baseH, baseS, baseL)),
      mood: mood || null,
      harmony: effectiveHarmony,
      count,
      generated_at: new Date().toISOString(),
    },
    usage_tips: [
      'Use the first color as your primary brand color.',
      'Use the last color as an accent or CTA.',
      'CSS variables are ready to paste into :root {}.',
      `Palette generated with ${effectiveHarmony} harmony${mood ? ` (${mood} mood)` : ''}.`,
    ],
    ecosystem: ECOSYSTEM,
  };
}

function handleContrastCheck(args) {
  const fgRgb = parseColor(args.foreground);
  const bgRgb = parseColor(args.background);

  if (!fgRgb) return mcpError(`Cannot parse foreground color: "${args.foreground}". Use hex, rgb(), hsl(), or CSS name.`);
  if (!bgRgb) return mcpError(`Cannot parse background color: "${args.background}". Use hex, rgb(), hsl(), or CSS name.`);

  const ratio = contrastRatio(fgRgb, bgRgb);
  const ratioRounded = Math.round(ratio * 100) / 100;

  const result = {
    foreground: formatColor(...fgRgb),
    background: formatColor(...bgRgb),
    contrast_ratio: ratioRounded,
    contrast_ratio_display: `${ratioRounded}:1`,
    wcag: {
      AA: {
        normal_text:  { required: '4.5:1', passes: ratio >= 4.5 },
        large_text:   { required: '3:1',   passes: ratio >= 3   },
        ui_component: { required: '3:1',   passes: ratio >= 3   },
      },
      AAA: {
        normal_text:  { required: '7:1',   passes: ratio >= 7   },
        large_text:   { required: '4.5:1', passes: ratio >= 4.5 },
      },
    },
    overall_rating: ratio >= 7 ? 'AAA (Excellent)' : ratio >= 4.5 ? 'AA (Good)' : ratio >= 3 ? 'AA Large Only (Fair)' : 'Fails WCAG (Poor)',
    suggestions: [],
    ecosystem: ECOSYSTEM,
  };

  // Generate suggestions if failing
  if (ratio < 4.5) {
    const [fh, fs, fl] = rgbToHsl(...fgRgb);
    const [bh, bs, bl] = rgbToHsl(...bgRgb);

    // Suggest darkening foreground or lightening background
    const darkerFg = hslToRgb(fh, fs, Math.max(5, fl - 30));
    const lighterBg = hslToRgb(bh, bs, Math.min(95, bl + 30));
    const darkerFgRatio = Math.round(contrastRatio(darkerFg, bgRgb) * 100) / 100;
    const lighterBgRatio = Math.round(contrastRatio(fgRgb, lighterBg) * 100) / 100;

    result.suggestions.push({
      action: 'Darken the foreground text',
      suggested_foreground: rgbToHex(...darkerFg),
      new_ratio: `${darkerFgRatio}:1`,
      passes_aa: darkerFgRatio >= 4.5,
    });
    result.suggestions.push({
      action: 'Lighten the background',
      suggested_background: rgbToHex(...lighterBg),
      new_ratio: `${lighterBgRatio}:1`,
      passes_aa: lighterBgRatio >= 4.5,
    });

    // Suggest white or black text
    const whiteRatio = Math.round(contrastRatio([255,255,255], bgRgb) * 100) / 100;
    const blackRatio = Math.round(contrastRatio([0,0,0], bgRgb) * 100) / 100;
    result.suggestions.push({
      action: 'Use white text on this background',
      suggested_foreground: '#ffffff',
      new_ratio: `${whiteRatio}:1`,
      passes_aa: whiteRatio >= 4.5,
    });
    result.suggestions.push({
      action: 'Use black text on this background',
      suggested_foreground: '#000000',
      new_ratio: `${blackRatio}:1`,
      passes_aa: blackRatio >= 4.5,
    });
  }

  return result;
}

function handleColorConvert(args) {
  const input = args.color;
  const toFormat = args.to_format || 'all';

  const rgb = parseColor(input);
  if (!rgb) return mcpError(`Cannot parse color: "${input}". Accepted formats: hex (#rrggbb), rgb(r,g,b), hsl(h,s%,l%), or CSS name.`);

  const [r, g, b] = rgb;
  const [h, s, l] = rgbToHsl(r, g, b);
  const hex = rgbToHex(r, g, b);

  // Find exact CSS name match
  let cssName = null;
  for (const [name, namedHex] of Object.entries(CSS_NAMED_COLORS)) {
    if (namedHex === hex) { cssName = name; break; }
  }
  const approxName = cssName || approximateColorName(r, g, b);

  const all = {
    input: input,
    hex,
    rgb: `rgb(${r}, ${g}, ${b})`,
    rgb_object: { r, g, b },
    hsl: `hsl(${h}, ${s}%, ${l}%)`,
    hsl_object: { h, s, l },
    css_name: cssName,
    nearest_css_name: approxName,
    relative_luminance: Math.round(relativeLuminance(r, g, b) * 1000) / 1000,
    is_dark: l < 50,
    recommended_text_color: l < 50 ? '#ffffff' : '#000000',
    ecosystem: ECOSYSTEM,
  };

  if (toFormat === 'all') return all;

  const filtered = { input, [toFormat]: all[toFormat] };
  if (toFormat === 'rgb') filtered.rgb_object = all.rgb_object;
  if (toFormat === 'hsl') filtered.hsl_object = all.hsl_object;
  filtered.ecosystem = ECOSYSTEM;
  return filtered;
}

function handleCssGradient(args) {
  const colors = args.colors || [];
  if (colors.length < 2) return mcpError('Please provide at least 2 colors in the colors array.');

  const type      = args.type      || 'linear';
  const direction = args.direction || 'to right';

  // Validate and parse all colors
  const parsedColors = [];
  for (const c of colors) {
    const rgb = parseColor(c);
    if (!rgb) return mcpError(`Cannot parse color: "${c}". Use hex values like "#ff6b6b".`);
    parsedColors.push({ original: c, hex: rgbToHex(...rgb), rgb });
  }

  const hexColors = parsedColors.map(c => c.hex);
  const colorStops = hexColors.join(', ');

  let cssValue, cssProperty;
  switch (type) {
    case 'radial':
      cssValue    = `radial-gradient(circle, ${colorStops})`;
      cssProperty = `background: ${cssValue};`;
      break;
    case 'conic':
      cssValue    = `conic-gradient(from 0deg, ${colorStops})`;
      cssProperty = `background: ${cssValue};`;
      break;
    case 'linear':
    default:
      cssValue    = `linear-gradient(${direction}, ${colorStops})`;
      cssProperty = `background: ${cssValue};`;
      break;
  }

  // Also generate with percentages evenly distributed
  const step = 100 / (hexColors.length - 1);
  const stopsWithPercent = hexColors.map((h, i) => `${h} ${Math.round(i * step)}%`).join(', ');
  let cssWithPercent;
  if (type === 'linear') cssWithPercent = `linear-gradient(${direction}, ${stopsWithPercent})`;
  else if (type === 'radial') cssWithPercent = `radial-gradient(circle, ${stopsWithPercent})`;
  else cssWithPercent = `conic-gradient(from 0deg, ${stopsWithPercent})`;

  // Describe the gradient visually
  const colorNames = parsedColors.map(c => approximateColorName(...c.rgb));
  const description = `${type.charAt(0).toUpperCase() + type.slice(1)} gradient`
    + (type === 'linear' ? ` flowing ${direction}` : '')
    + `: ${colorNames.join(' → ')}`;

  return {
    type,
    direction: type === 'linear' ? direction : null,
    colors: parsedColors.map(c => ({ input: c.original, hex: c.hex })),
    css: {
      property: cssProperty,
      value: cssValue,
      with_percentages: `background: ${cssWithPercent};`,
      tailwind_arbitrary: `bg-[${cssValue.replace(/,\s*/g, ',')}]`,
    },
    full_rule: `.gradient {\n  ${cssProperty}\n}`,
    description,
    preview_hint: description,
    ecosystem: ECOSYSTEM,
  };
}

function handleTailwindColors(args) {
  const colorName = args.color_name?.toLowerCase();
  const closestTo = args.closest_to;

  if (!colorName && !closestTo) {
    return {
      available_colors: TAILWIND_COLOR_NAMES,
      usage: 'Provide color_name (e.g., "blue") to get all shades, or closest_to (hex) to find the nearest Tailwind color.',
      ecosystem: ECOSYSTEM,
    };
  }

  if (colorName) {
    const palette = TAILWIND_COLORS[colorName];
    if (!palette) {
      const suggestions = TAILWIND_COLOR_NAMES.filter(n => n.startsWith(colorName[0]));
      return mcpError(`Unknown Tailwind color: "${colorName}". Available: ${TAILWIND_COLOR_NAMES.join(', ')}. Suggestions starting with "${colorName[0]}": ${suggestions.join(', ')}`);
    }

    const shades = {};
    for (const [shade, hex] of Object.entries(palette)) {
      const rgb = parseColor(hex);
      shades[shade] = {
        hex,
        class: `${colorName}-${shade}`,
        bg_class:   `bg-${colorName}-${shade}`,
        text_class: `text-${colorName}-${shade}`,
        border_class: `border-${colorName}-${shade}`,
        ring_class: `ring-${colorName}-${shade}`,
        css_var: `--tw-${colorName}-${shade}: ${hex};`,
        rgb: rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : null,
      };
    }

    return {
      color: colorName,
      shades,
      usage_example: {
        primary: `bg-${colorName}-500 text-white`,
        hover: `hover:bg-${colorName}-600`,
        light_variant: `bg-${colorName}-100 text-${colorName}-800`,
        dark_mode: `dark:bg-${colorName}-900 dark:text-${colorName}-100`,
      },
      ecosystem: ECOSYSTEM,
    };
  }

  if (closestTo) {
    const targetRgb = parseColor(closestTo);
    if (!targetRgb) return mcpError(`Cannot parse closest_to color: "${closestTo}". Use hex format.`);

    let bestColor = null, bestShade = null, bestDist = Infinity, bestHex = null;

    for (const [name, shades] of Object.entries(TAILWIND_COLORS)) {
      for (const [shade, hex] of Object.entries(shades)) {
        const rgb = parseColor(hex);
        if (!rgb) continue;
        const dist = Math.sqrt(
          (targetRgb[0]-rgb[0])**2 + (targetRgb[1]-rgb[1])**2 + (targetRgb[2]-rgb[2])**2
        );
        if (dist < bestDist) {
          bestDist = dist; bestColor = name; bestShade = shade; bestHex = hex;
        }
      }
    }

    // Top 5 matches
    const ranked = [];
    for (const [name, shades] of Object.entries(TAILWIND_COLORS)) {
      for (const [shade, hex] of Object.entries(shades)) {
        const rgb = parseColor(hex);
        if (!rgb) continue;
        const dist = Math.sqrt(
          (targetRgb[0]-rgb[0])**2 + (targetRgb[1]-rgb[1])**2 + (targetRgb[2]-rgb[2])**2
        );
        ranked.push({ color: name, shade: parseInt(shade), hex, dist });
      }
    }
    ranked.sort((a, b) => a.dist - b.dist);
    const top5 = ranked.slice(0, 5).map(r => ({
      tailwind_class: `${r.color}-${r.shade}`,
      hex: r.hex,
      distance: Math.round(r.dist),
    }));

    return {
      input_hex: rgbToHex(...targetRgb),
      closest_match: {
        tailwind_class: `${bestColor}-${bestShade}`,
        color: bestColor,
        shade: parseInt(bestShade),
        hex: bestHex,
        bg_class: `bg-${bestColor}-${bestShade}`,
        text_class: `text-${bestColor}-${bestShade}`,
        distance: Math.round(bestDist),
      },
      top_5_matches: top5,
      ecosystem: ECOSYSTEM,
    };
  }
}

// ============================================================
// HELPERS
// ============================================================

function mcpError(msg) {
  return { error: msg, ecosystem: ECOSYSTEM };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// ============================================================
// In-Memory Fallback Rate Limiter (KV Safe Mode)
// When KV is unavailable, degrade to 5 req/min/IP instead of unlimited
// ============================================================
const _memRL = new Map();
const MEM_RL_LIMIT = 5;
const MEM_RL_WINDOW = 60000; // 1 minute

function memoryRateLimit(ip) {
  const now = Date.now();
  const entry = _memRL.get(ip);
  if (!entry || now - entry.ts > MEM_RL_WINDOW) {
    _memRL.set(ip, { ts: now, count: 1 });
    return { allowed: true, remaining: MEM_RL_LIMIT - 1, safeMode: true };
  }
  if (entry.count >= MEM_RL_LIMIT) {
    return { allowed: false, remaining: 0, safeMode: true };
  }
  entry.count++;
  return { allowed: true, remaining: MEM_RL_LIMIT - entry.count, safeMode: true };
}

// ============================================================
// RATE LIMITING
// ============================================================

// ============================================================
// Pro API Key Validation (shared KV: prokey:{key})
// ============================================================
const PRO_DAILY_LIMIT = 1000;

async function validateProKey(kv, apiKey) {
  if (!apiKey || !kv) return null;
  try {
    const kd = await kv.get(`prokey:${apiKey}`, { type: 'json' });
    if (!kd) return null;
    if (kd.expires && new Date(kd.expires) < new Date()) return null;
    if (kd.tier === 'pro' || kd.tier === 'pro_trial') {
      return { valid: true, tier: kd.tier, daily_limit: kd.daily_limit || PRO_DAILY_LIMIT };
    }
    return null;
  } catch { return null; }
}

async function proKeyRateLimit(kv, apiKey, limit) {
  if (!kv) return { allowed: true, remaining: limit, total: limit, used: 0, pro: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:pro:${apiKey.slice(0, 16)}:${today}`;
  let count = 0;
  try { const val = await kv.get(key); count = val ? parseInt(val, 10) : 0; } catch {}
  if (count >= limit) return { allowed: false, remaining: 0, total: limit, used: count, pro: true };
  try { await kv.put(key, String(count + 1), { expirationTtl: 86400 }); } catch {}
  return { allowed: true, remaining: limit - count - 1, total: limit, used: count + 1, pro: true };
}

async function checkRateLimit(env, clientId) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `color-palette:rate:${clientId}:${today}`;
  const limit = 20;
  try {
    const current = parseInt(await env.KV.get(key) || '0');
    if (current >= limit) return { allowed: false, remaining: 0, limit };
    await env.KV.put(key, String(current + 1), { expirationTtl: 86400 });
    return { allowed: true, remaining: limit - current - 1, limit };
  } catch {
    return memoryRateLimit(clientId);
  }
}

// ============================================================
// LANDING PAGE (rainbow gradient theme)
// ============================================================
function landingPage() {
  const toolRows = TOOLS.map(t => `
    <div class="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-white/30 transition">
      <div class="flex items-start gap-3">
        <span class="text-2xl">${toolIcon(t.name)}</span>
        <div>
          <div class="font-semibold text-white">${t.name}</div>
          <div class="text-sm text-gray-300 mt-1">${t.description.split('.')[0]}.</div>
        </div>
      </div>
    </div>`).join('');

  const paletteSwatches = [
    '#ff6b6b','#ffa07a','#ffd700','#9acd32','#40e0d0','#6495ed','#da70d6'
  ].map(c => `<div style="background:${c}; width:36px; height:36px; border-radius:8px; display:inline-block; margin:3px;"></div>`).join('');

  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Color Palette MCP — Design Utility for AI Agents</title>
  <meta name="description" content="Generate color palettes, check WCAG contrast, convert colors, create CSS gradients, and look up Tailwind colors. MCP-native design utility.">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .rainbow-text {
      background: linear-gradient(90deg, #ff6b6b, #ffa500, #ffd700, #9acd32, #40e0d0, #6495ed, #da70d6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .rainbow-border {
      background: linear-gradient(90deg, #ff6b6b, #ffa500, #ffd700, #9acd32, #40e0d0, #6495ed, #da70d6);
      padding: 2px; border-radius: 14px;
    }
    .rainbow-border > * { background: #111827; border-radius: 12px; }
    body {
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    }
  </style>
</head>
<body class="min-h-screen text-white font-sans">
  <div class="max-w-4xl mx-auto px-4 py-16">

    <!-- Hero -->
    <div class="text-center mb-14">
      <div class="mb-4">${paletteSwatches}</div>
      <h1 class="text-5xl font-extrabold mb-3 rainbow-text">Color Palette MCP</h1>
      <p class="text-xl text-gray-300">Design Utility for AI Agents &amp; Developers</p>
      <p class="text-gray-500 mt-2 text-sm">Color Theory &bull; WCAG Contrast &bull; CSS Gradients &bull; Tailwind CSS &bull; MCP Protocol</p>
    </div>

    <!-- Tools Grid -->
    <h2 class="text-xl font-semibold text-gray-300 mb-4">5 Free Tools</h2>
    <div class="grid gap-4 mb-12">
      ${toolRows}
    </div>

    <!-- Rate Limit -->
    <div class="rainbow-border mb-12">
      <div class="p-6">
        <h3 class="font-semibold text-lg text-yellow-400 mb-2">Free Tier — 25 requests/day</h3>
        <ul class="text-sm text-gray-300 space-y-1">
          <li>&#x2705; All 5 tools fully free</li>
          <li>&#x2705; 25 requests per day (resets at 00:00 UTC)</li>
          <li>&#x2705; No API key required</li>
          <li>&#x2705; Batch JSON-RPC requests supported</li>
        </ul>
      </div>
    </div>

    <!-- MCP Config -->
    <div class="bg-white/5 rounded-xl p-6 border border-white/10 mb-12">
      <h3 class="font-semibold text-lg mb-3">Connect via MCP</h3>
      <pre class="bg-black/60 rounded-lg p-4 text-sm text-green-400 overflow-x-auto">{
  "mcpServers": {
    "color-palette": {
      "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp",
      "transport": "streamable-http"
    }
  }
}</pre>
    </div>

    <!-- Example Calls -->
    <div class="bg-white/5 rounded-xl p-6 border border-white/10 mb-12">
      <h3 class="font-semibold text-lg mb-4">Example Tool Calls</h3>
      <div class="space-y-4 text-sm">
        <div>
          <div class="text-gray-400 mb-1">Generate a pastel palette:</div>
          <pre class="bg-black/60 rounded p-3 text-green-400 overflow-x-auto">{"name":"generate_palette","arguments":{"mood":"pastel","count":5}}</pre>
        </div>
        <div>
          <div class="text-gray-400 mb-1">Check contrast (WCAG):</div>
          <pre class="bg-black/60 rounded p-3 text-green-400 overflow-x-auto">{"name":"contrast_check","arguments":{"foreground":"#ffffff","background":"#3b82f6"}}</pre>
        </div>
        <div>
          <div class="text-gray-400 mb-1">Find nearest Tailwind color:</div>
          <pre class="bg-black/60 rounded p-3 text-green-400 overflow-x-auto">{"name":"tailwind_colors","arguments":{"closest_to":"#3b82f6"}}</pre>
        </div>
        <div>
          <div class="text-gray-400 mb-1">Generate rainbow gradient CSS:</div>
          <pre class="bg-black/60 rounded p-3 text-green-400 overflow-x-auto">{"name":"css_gradient","arguments":{"colors":["#ff6b6b","#ffd700","#40e0d0","#6495ed"],"type":"linear","direction":"to right"}}</pre>
        </div>
      </div>
    </div>

    <!-- Ecosystem -->
    <div class="bg-white/5 rounded-xl p-6 border border-white/10 mb-8">
      <h3 class="font-semibold text-lg mb-3">OpenClaw Intelligence Ecosystem</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <a href="${ECOSYSTEM.json}" class="bg-white/5 rounded-lg p-3 text-center hover:bg-white/10 transition">
          <div>&#x1F4CB; JSON Toolkit</div>
        </a>
        <a href="${ECOSYSTEM.regex}" class="bg-white/5 rounded-lg p-3 text-center hover:bg-white/10 transition">
          <div>&#x1F9E9; Regex Engine</div>
        </a>
        <a href="${ECOSYSTEM.prompt}" class="bg-white/5 rounded-lg p-3 text-center hover:bg-white/10 transition">
          <div>&#x2728; Prompt Enhancer</div>
        </a>
        <a href="${ECOSYSTEM.timestamp}" class="bg-white/5 rounded-lg p-3 text-center hover:bg-white/10 transition">
          <div>&#x23F0; Timestamp</div>
        </a>
        <a href="${ECOSYSTEM.intel}" class="bg-white/5 rounded-lg p-3 text-center hover:bg-white/10 transition">
          <div>&#x1F4CA; Intel MCP</div>
        </a>
        <a href="${ECOSYSTEM.fortune}" class="bg-white/5 rounded-lg p-3 text-center hover:bg-white/10 transition">
          <div>&#x1F52E; Fortune MCP</div>
        </a>
        <a href="${ECOSYSTEM.moltbook}" class="bg-white/5 rounded-lg p-3 text-center hover:bg-white/10 transition">
          <div>&#x1F4DD; MoltBook</div>
        </a>
        <a href="${ECOSYSTEM.agentforge}" class="bg-white/5 rounded-lg p-3 text-center hover:bg-white/10 transition">
          <div>&#x2694;&#xFE0F; AgentForge</div>
        </a>
        <a href="${ECOSYSTEM.store}" class="bg-white/5 rounded-lg p-3 text-center hover:bg-white/10 transition col-span-2 md:col-span-2">
          <div>&#x1F6D2; Digital Store</div>
        </a>
      </div>
    </div>

    <div class="text-center text-gray-600 text-xs">
      <p>Color Palette MCP v1.0.0 &bull; OpenClaw Intelligence &bull; Powered by Cloudflare Workers</p>
      <p class="mt-1">Color theory: HSL harmony rotation &bull; WCAG 2.1 contrast formula &bull; Tailwind CSS v3 database</p>
    </div>
  </div>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function toolIcon(name) {
  const icons = {
    generate_palette: '&#x1F3A8;',
    contrast_check:   '&#x1F50D;',
    color_convert:    '&#x1F504;',
    css_gradient:     '&#x1F308;',
    tailwind_colors:  '&#x1F4A8;',
  };
  return icons[name] || '&#x1F527;';
}

// Semantic Cache — deterministic tool results cached in KV (24h TTL)
async function cacheHash(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCached(kv, server, tool, args) {
  if (!kv) return null;
  try {
    const h = await cacheHash(JSON.stringify(args));
    const val = await kv.get(`cache:${server}:${tool}:${h}`);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function setCache(kv, server, tool, args, result, ttl = 86400) {
  if (!kv) return;
  try {
    const h = await cacheHash(JSON.stringify(args));
    await kv.put(`cache:${server}:${tool}:${h}`, JSON.stringify(result), { expirationTtl: ttl });
  } catch {}
}

// Dynamic Upgrade Prompt — progressive messaging based on usage
function addUpgradePrompt(response, rateLimitInfo) {
  if (!rateLimitInfo || !response?.result?.content?.[0]) return;
  if (response.result.isError) return;
  const c = response.result.content[0];
  if (c.type !== 'text' || !c.text) return;

  const used = rateLimitInfo.used || 0;
  const remaining = rateLimitInfo.remaining ?? 0;

  let msg = '';
  if (remaining <= 2 && remaining > 0) {
    msg = `\n\n⚡ ${remaining} call${remaining === 1 ? '' : 's'} left today. Pro: $9 → 1000/day → paypal.me/Yagami8095/9`;
  } else if (used <= 3) {
    msg = '\n\n— powered by OpenClaw (openclaw.dev)';
  }

  if (msg) c.text += msg;
}

// ============================================================
// MCP REQUEST HANDLER
// ============================================================
async function handleMCPRequest(body, env, request) {
  const { jsonrpc, id, method, params } = body;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2025-03-26',
        serverInfo: {
          name: SERVER_INFO.name,
          version: SERVER_INFO.version,
          vendor: 'OpenClaw Intelligence',
          description: 'Color Palette MCP — design utility for AI agents. Generate palettes, check WCAG contrast, convert colors, create CSS gradients, and look up Tailwind CSS colors.',
        },
        capabilities: CAPABILITIES,
      },
    };
  }

  if (method === 'notifications/initialized') return undefined;
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    const clientId = request.headers.get('x-client-id')
      || request.headers.get('cf-connecting-ip')
      || 'anon';

    // Pro API Key validation
    const apiKey = request.headers.get('X-API-Key');
    let _proKeyInfo = null;
    if (apiKey && env?.KV) {
      _proKeyInfo = await validateProKey(env.KV, apiKey);
    }

    // Rate limiting
    let rateCheck = await checkRateLimit(env, clientId);

    // Pro key override: use higher limit
    if (_proKeyInfo && _proKeyInfo.valid) {
      rateCheck = await proKeyRateLimit(env?.KV, apiKey, _proKeyInfo.daily_limit);
    }

    if (!rateCheck.allowed) {
      return {
        jsonrpc: '2.0', id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Rate limit exceeded',
              limit: rateCheck.limit,
              reset: 'Daily at 00:00 UTC',
              message: `Rate limit exceeded (${rateCheck.limit}/day). FREE 7-day trial (100 calls/day): https://product-store.yagami8095.workers.dev/auth/login\n\nPro ($9 one-time, 1000/day): https://paypal.me/Yagami8095/9 | x402: $0.05/call USDC on Base`,
              ecosystem: ECOSYSTEM,
            }),
          }],
        },
      };
    }

    // Semantic cache check
    const kv = env.KV;
    const toolArgs = args || {};
    Object.keys(toolArgs).forEach(k => { if (typeof toolArgs[k] === 'string') toolArgs[k] = sanitizeInput(toolArgs[k]); });
    const cached = await getCached(kv, 'color', name, toolArgs);
    if (cached) {
      const cachedResp = { jsonrpc: '2.0', id, result: cached };
      addUpgradePrompt(cachedResp, { used: rateCheck.limit - rateCheck.remaining - 1, remaining: rateCheck.remaining });
      return cachedResp;
    }

    let result;
    switch (name) {
      case 'generate_palette':   result = handleGeneratePalette(toolArgs); break;
      case 'contrast_check':     result = handleContrastCheck(toolArgs); break;
      case 'color_convert':      result = handleColorConvert(toolArgs); break;
      case 'css_gradient':       result = handleCssGradient(toolArgs); break;
      case 'tailwind_colors':    result = handleTailwindColors(toolArgs); break;
      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}. Available: ${TOOLS.map(t => t.name).join(', ')}` } };
    }

    const toolResp = {
      jsonrpc: '2.0', id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        _rate_limit: { remaining: rateCheck.remaining, limit: rateCheck.limit, reset: 'Daily at 00:00 UTC' },
      },
    };

    // Cache successful results (24h)
    if (toolResp.result && !toolResp.result.isError) {
      await setCache(kv, 'color', name, toolArgs, toolResp.result);
    }

    addUpgradePrompt(toolResp, { used: rateCheck.limit - rateCheck.remaining - 1, remaining: rateCheck.remaining });
    return toolResp;
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } };
}

// ============================================================
// Edge Defense Layer
// ============================================================

const HONEYPOT_PATHS = ['/admin', '/wp-login.php', '/.env', '/config.json', '/.git/config', '/wp-admin', '/phpinfo.php'];
const PAYLOAD_MAX_BYTES = 51200;

async function sha256Short(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getRequestFingerprint(request) {
  const ua = request.headers.get('User-Agent') || '';
  const lang = request.headers.get('Accept-Language') || '';
  const isSuspicious = (/^(curl|wget|python|httpie|go-http|java)/i.test(ua) && lang.length > 5);
  return { ua: ua.slice(0, 80), lang: lang.slice(0, 20), isSuspicious };
}

async function edgeDefense(request, env, serverPrefix) {
  const kv = env.KV;
  if (!kv) return { action: 'allow' };
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Short(ip + '-openclaw-defense');
  const today = new Date().toISOString().slice(0, 10);
  const defenseKey = `defense:${ipHash}:${today}`;
  const path = new URL(request.url).pathname;

  if (HONEYPOT_PATHS.includes(path.toLowerCase())) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      raw.score = Math.max(0, raw.score - 30);
      raw.hits++;
      raw.flags.push('honeypot:' + path);
      await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
    } catch {}
    return { action: 'honeypot', status: 404 };
  }

  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > PAYLOAD_MAX_BYTES) return { action: 'reject', reason: 'Payload too large', status: 413 };

  try {
    const raw = await kv.get(defenseKey, { type: 'json' });
    if (raw && raw.score < 10) return { action: 'block', reason: 'IP blocked', status: 403 };
    if (raw && raw.score < 30) return { action: 'throttle', delay: 200 };
  } catch {}

  const fp = getRequestFingerprint(request);
  if (fp.isSuspicious) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      if (!raw.flags.includes('suspicious-fp')) {
        raw.score = Math.max(0, raw.score - 10);
        raw.flags.push('suspicious-fp');
        await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
      }
    } catch {}
  }
  return { action: 'allow' };
}

function sanitizeInput(str, maxLen = 2000) {
  if (!str) return '';
  if (typeof str !== 'string') return String(str).slice(0, maxLen);
  return str.slice(0, maxLen).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '');
}

// ============================================================
// FinOps Circuit Breaker
// ============================================================

const FINOPS_DAILY_WARN = 50000;
const FINOPS_DAILY_SLOW = 80000;
const FINOPS_DAILY_STOP = 95000;

async function finopsTrack(env, serverName) {
  const kv = env.KV;
  if (!kv) return { ok: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `finops:${today}`;
  try {
    const raw = await kv.get(key, { type: 'json' }) || { total: 0, by: {} };
    raw.total++;
    raw.by[serverName] = (raw.by[serverName] || 0) + 1;
    kv.put(key, JSON.stringify(raw), { expirationTtl: 172800 });
    if (raw.total >= FINOPS_DAILY_STOP) return { ok: false, reason: 'Daily capacity reached. Try again tomorrow.', status: 503 };
    if (raw.total >= FINOPS_DAILY_SLOW) return { ok: true, delay: 500 };
    if (raw.total >= FINOPS_DAILY_WARN) return { ok: true, warn: true };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

// Attribution Tracking — ?ref= parameter
async function trackRef(request, env, serverName) {
  const kv = env.KV;
  if (!kv) return;
  const ref = new URL(request.url).searchParams.get('ref');
  if (!ref) return;
  const source = ref.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!source) return;
  const today = new Date().toISOString().slice(0, 10);
  const key = `ref:${source}:${serverName}:${today}`;
  try {
    const count = parseInt(await kv.get(key) || '0', 10);
    await kv.put(key, String(count + 1), { expirationTtl: 2592000 }); // 30 days
  } catch {}
}

// ============================================================
// MAIN FETCH HANDLER
// ============================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Edge Defense
    const defense = await edgeDefense(request, env, 'color');
    if (defense.action === 'honeypot') return new Response('Not Found', { status: 404 });
    if (defense.action === 'reject' || defense.action === 'block') return jsonResponse({ error: defense.reason }, defense.status);
    if (defense.action === 'throttle' && defense.delay) await new Promise(r => setTimeout(r, defense.delay));

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'color-palette');
    if (!finops.ok) return jsonResponse({ error: finops.reason }, 503);
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));
    await trackRef(request, env, 'color-palette');

    // Landing page
    if (url.pathname === '/' && request.method === 'GET') {
      return landingPage();
    }

        // llms.txt for AI discoverability
    if (url.pathname === '/llms.txt' || url.pathname === '/.well-known/llms.txt') {
      const t = [
        "# OpenClaw MCP Servers",
        "> 9 free remote MCP servers with 49 tools for AI agents.",
        "",
        "## Servers",
        "- JSON Toolkit: https://json-toolkit-mcp.yagami8095.workers.dev/mcp",
        "- Regex Engine: https://regex-engine-mcp.yagami8095.workers.dev/mcp",
        "- Color Palette: https://color-palette-mcp.yagami8095.workers.dev/mcp",
        "- Timestamp Converter: https://timestamp-converter-mcp.yagami8095.workers.dev/mcp",
        "- Prompt Enhancer: https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp",
        "- OpenClaw Intel: https://openclaw-intel-mcp.yagami8095.workers.dev/mcp",
        "- Fortune: https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp",
        "- MoltBook Publisher: https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp",
        "- AgentForge Compare: https://agentforge-compare-mcp.yagami8095.workers.dev/mcp",
        "",
        "## Quick Start",
        'Add to MCP config: {"url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"}',
        "",
        "## Pro: 9 USD, 1000 calls/day all servers",
        "https://product-store.yagami8095.workers.dev/products/ecosystem-pro",
      ];
      return new Response(t.join("\n"), {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      });
    }

// Health check
    if (url.pathname === '/health') {
      return jsonResponse({
        status: 'ok',
        server: SERVER_INFO,
        tools: TOOLS.length,
        features: ['generate_palette', 'contrast_check', 'color_convert', 'css_gradient', 'tailwind_colors'],
        rate_limit: '20 free/day',
        timestamp: new Date().toISOString(),
      });
    }

    // MCP GET (discovery)
    if (url.pathname === '/mcp' && request.method === 'GET') {
      return jsonResponse({
        status: 'ok',
        server: SERVER_INFO.name,
        version: SERVER_INFO.version,
        description: 'Color Palette MCP — design utility for AI agents building UIs, websites, and visual content.',
        endpoint: '/mcp (POST)',
        tools: TOOLS.map(t => ({ name: t.name, description: t.description.split('.')[0] + '.' })),
        rate_limit: '20 free/day',
        ecosystem: ECOSYSTEM,
      });
    }

    // MCP POST (JSON-RPC)
    if (url.pathname === '/mcp' && request.method === 'POST') {
      try {
        const body = await request.json();

        // Batch support
        if (Array.isArray(body)) {
          const results = (await Promise.all(
            body.map(req => handleMCPRequest(req, env, request))
          )).filter(r => r !== undefined);

          // x402: Detect rate limit → HTTP 402 with payment headers
          const batchFirst = results[0];
          const batchRateLimited = batchFirst?.error?.code === -32029;
          if (batchRateLimited) return new Response(JSON.stringify(results), {
            status: 402,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              'X-Payment-Required': 'true',
              'X-Payment-Network': 'base',
              'X-Payment-Currency': 'USDC',
              'X-Payment-Amount': '0.05',
              'X-Payment-Address': '0x72aa56DAe3819c75C545c57778cc404092d60731',
            },
          });
          return jsonResponse(results);
        }

        const result = await handleMCPRequest(body, env, request);
        if (result === undefined) return new Response(null, { status: 204 });

        // x402: Detect rate limit → HTTP 402 with payment headers
        const singleRateLimited = result?.error?.code === -32029;
        if (singleRateLimited) return new Response(JSON.stringify(result), {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-Payment-Required': 'true',
            'X-Payment-Network': 'base',
            'X-Payment-Currency': 'USDC',
            'X-Payment-Amount': '0.05',
            'X-Payment-Address': '0x72aa56DAe3819c75C545c57778cc404092d60731',
          },
        });
        return jsonResponse(result);

      } catch (e) {
        return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: invalid JSON' } }, 400);
      }
    }

    return jsonResponse({ error: 'Not found', mcp_endpoint: '/mcp (POST)', docs: url.origin + '/' }, 404);
  },
};
