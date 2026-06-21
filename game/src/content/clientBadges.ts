/**
 * Fictional client sector badges.
 * Real client names/logos are never included here.
 * To add approved logos later, place PNG/SVG files in public/client-logos/
 * and set the logoFile property on the relevant badge.
 */

export interface ClientBadge {
  id: string;
  sector: string;
  label: string;
  colour: number;
  accentColour: number;
  symbol: 'triangle' | 'circle' | 'diamond' | 'hexagon' | 'square' | 'star';
  logoFile?: string; // optional: e.g. 'public/client-logos/gov-client.png'
}

export const CLIENT_BADGES: ClientBadge[] = [
  {
    id: 'government',
    sector: 'Government',
    label: 'Government Client',
    colour: 0x1144aa,
    accentColour: 0x3366cc,
    symbol: 'square',
  },
  {
    id: 'banking',
    sector: 'Financial Services',
    label: 'Banking Client',
    colour: 0x003366,
    accentColour: 0x004488,
    symbol: 'diamond',
  },
  {
    id: 'insurance',
    sector: 'Insurance',
    label: 'Insurance Client',
    colour: 0x005544,
    accentColour: 0x007755,
    symbol: 'hexagon',
  },
  {
    id: 'health',
    sector: 'Health',
    label: 'Health Client',
    colour: 0x990000,
    accentColour: 0xbb1111,
    symbol: 'circle',
  },
  {
    id: 'education',
    sector: 'Education',
    label: 'Education Client',
    colour: 0x884400,
    accentColour: 0xaa5500,
    symbol: 'triangle',
  },
  {
    id: 'utilities',
    sector: 'Utilities',
    label: 'Utilities Client',
    colour: 0x226622,
    accentColour: 0x338833,
    symbol: 'square',
  },
  {
    id: 'transport',
    sector: 'Transport',
    label: 'Transport Client',
    colour: 0x224488,
    accentColour: 0x335599,
    symbol: 'diamond',
  },
  {
    id: 'retail',
    sector: 'Retail',
    label: 'Retail Client',
    colour: 0x882244,
    accentColour: 0xaa3355,
    symbol: 'star',
  },
  {
    id: 'property',
    sector: 'Property',
    label: 'Property Client',
    colour: 0x664422,
    accentColour: 0x886633,
    symbol: 'hexagon',
  },
  {
    id: 'technology',
    sector: 'Technology',
    label: 'Technology Client',
    colour: 0x004466,
    accentColour: 0x006688,
    symbol: 'circle',
  },
];
