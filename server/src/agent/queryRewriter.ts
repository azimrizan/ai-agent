const QUERY_REWRITES: Record<string, string[]> = {
  "electronic": ["tv", "led tv", "smart tv", "soundbar", "speaker", "air fryer", "kettle"],
  "electronics": ["tv", "led tv", "smart tv", "soundbar", "speaker", "air fryer", "kettle"],
  "electronic items": ["tv", "led tv", "smart tv", "soundbar", "speaker", "air fryer", "kettle"],
  "gadget": ["tv", "soundbar", "speaker", "air fryer"],
  "gadgets": ["tv", "soundbar", "speaker", "air fryer"],
  "appliance": ["air fryer", "kettle", "rice cooker"],
  "appliances": ["air fryer", "kettle", "rice cooker", "tv"],
  "kitchen appliances": ["air fryer", "kettle", "rice cooker", "pressure cooker"],
  "home appliances": ["air fryer", "kettle", "rice cooker", "tv", "soundbar"],
  "household": ["cookware", "frypan", "appachatty", "pressure cooker", "air fryer", "kettle"],
  "cookware": ["cookware", "frypan", "appachatty", "pressure cooker", "tawa", "kadai"],
  "kitchenware": ["cookware", "frypan", "appachatty", "pressure cooker", "tawa", "kadai"],
  "kitchen": ["cookware", "frypan", "appachatty", "pressure cooker", "tawa", "kadai", "air fryer"],
  "pan": ["frypan", "non-stick frypan", "tawa", "appachatty", "kadai"],
  "pans": ["frypan", "non-stick frypan", "tawa", "appachatty", "kadai"],
  "dosa": ["dosa pan", "tawa", "non-stick tawa", "appachatty"],
  "appam": ["appachatty", "non-stick appachatty", "cookware"],
  "rice": ["rice cooker", "pressure cooker", "5L pressure cooker"],
  "biryani": ["pressure cooker", "5L pressure cooker", "cookware"],
  "tv": ["tv", "led tv", "smart tv", "television"],
  "television": ["tv", "led tv", "smart tv", "television"],
  "hometheater": ["soundbar", "home theatre", "5.1 soundbar", "bluetooth speaker"],
  "home theater": ["soundbar", "home theatre", "5.1 soundbar", "bluetooth speaker"],
  "theatre": ["soundbar", "home theatre", "5.1 soundbar"],
  "monsoon sale": ["led tv", "home theatre", "pressure cooker", "ktf combo", "air fryer"],
  "monsoon sale tv": ["led tv", "tv", "smart tv"],
  "breakfast": ["frypan", "tawa", "appachatty", "kettle"],
};


export function rewriteQuery(rawQuery: string): string[] {
  const queryLower = rawQuery.toLowerCase().trim();
  const expanded: string[] = [rawQuery];

  for (const [keyword, expansions] of Object.entries(QUERY_REWRITES)) {
    if (queryLower.includes(keyword)) {
      expanded.push(...expansions);
    }
  }

  return Array.from(new Set(expanded));
}

export interface ResolvedSearchSpec {
  query: string;
  category?: string;
  maxPrice?: number;
}

export function resolveProductIntent(rawMessage: string, extractedPrice?: number): ResolvedSearchSpec[] {
  let textClean = rawMessage
    .toLowerCase()
    .replace(/(?:get|show|find|list|only|one|some|here|bring|workspace|in workspace|for me|combo)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!textClean) textClean = rawMessage.toLowerCase().trim();

  const specs: ResolvedSearchSpec[] = [];
  const splitMatch = textClean.split(/\+|\band\b|&|\bwith\b|\balso\b/i);

  if (splitMatch.length > 1) {
    for (const part of splitMatch) {
      const trimmed = part.trim();
      if (trimmed.length > 1) {
        const rewrites = rewriteQuery(trimmed);
        specs.push({
          query: rewrites[1] || rewrites[0] || trimmed,
          maxPrice: extractedPrice
        });
      }
    }
  }

  if (specs.length === 0) {
    const rewrites = rewriteQuery(textClean);
    specs.push({
      query: rewrites[1] || rewrites[0] || textClean,
      maxPrice: extractedPrice
    });
  }

  return specs;
}


export function filterDomainProducts(query: string, products: any[]): any[] {
  const q = query.toLowerCase();

  // If asking for electronics / TV / audio / speakers:
  if (/electronic|electronics|gadget|tv|television|soundbar|speaker|audio|bluetooth/i.test(q)) {
    return products.filter((p) => {
      const text = `${p.name || ""} ${p.title || ""} ${p.category || ""} ${p.subcategory || ""} ${(p.tags || []).join(" ")}`.toLowerCase();
      // Exclude manual non-electric cookware
      if (/pressure cooker|appachatty|frypan|tawa|kadai|cookware|casserole/i.test(text) && !/digital|electric|air fryer|kettle/i.test(text)) {
        return false;
      }
      return true;
    });
  }

  // If asking for cookware / kitchenware / pans:
  if (/cookware|kitchenware|frypan|pan|appachatty|tawa|kadai|casserole|saucepan/i.test(q) && !/tv|television|soundbar|speaker|audio/i.test(q)) {
    return products.filter((p) => {
      const text = `${p.name || ""} ${p.title || ""} ${p.category || ""} ${p.subcategory || ""} ${(p.tags || []).join(" ")}`.toLowerCase();
      // Exclude TVs and Soundbars
      if (/tv|television|led|soundbar|speaker|audio|home theatre/i.test(text)) {
        return false;
      }
      return true;
    });
  }

  return products;
}

