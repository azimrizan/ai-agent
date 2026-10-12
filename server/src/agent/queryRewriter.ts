const QUERY_REWRITES: Record<string, string[]> = {
  "electronic": ["air fryer", "kettle", "bldc fan"],
  "electronics": ["air fryer", "kettle", "bldc fan"],
  "electronic items": ["air fryer", "kettle", "bldc fan"],
  "appliance": ["air fryer", "kettle", "gas stove"],
  "appliances": ["air fryer", "kettle", "gas stove"],
  "kitchen appliances": ["air fryer", "kettle", "gas stove", "coconut scraper"],
  "home appliances": ["air fryer", "kettle", "bldc fan"],
  "household": ["cookware", "frypan", "appachatty", "air fryer", "kettle", "fan"],
  "cookware": ["cookware", "frypan", "appachatty", "tawa", "kadai", "biriyani pot"],
  "kitchenware": ["cookware", "frypan", "appachatty", "tawa", "kadai"],
  "kitchen": ["cookware", "frypan", "appachatty", "tawa", "kadai", "air fryer", "kettle"],
  "pan": ["frypan", "non-stick frypan", "tawa", "appachatty", "kadai"],
  "pans": ["frypan", "non-stick frypan", "tawa", "appachatty", "kadai"],
  "dosa": ["dosa pan", "tawa", "pathiri tawa", "appachatty"],
  "appam": ["appachatty", "non-stick appachatty", "cookware"],
  "biryani": ["biriyani pot", "kadai", "cookware"],
  "fan": ["bldc ceiling fan", "ceiling fan", "handheld fan"],
  "fans": ["bldc ceiling fan", "ceiling fan", "handheld fan"],
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

  // If asking for audio / TV / soundbars: exclude non-audio items
  if (/soundbar|speaker|audio|bluetooth|hometheater|home theater|theatre|led tv|smart tv|\btv\b/i.test(q)) {
    return products.filter((p) => {
      const text = `${p.name || ""} ${p.category || ""} ${(p.tags || []).join(" ")}`.toLowerCase();
      return /soundbar|speaker|audio|theatre|theater|led tv|smart tv|\btv\b/i.test(text);
    });
  }

  // If asking for air fryer: exclude fans, gas stoves, and cookware
  if (/air fryer|fryer/i.test(q) && !/frypan/i.test(q)) {
    return products.filter((p) => {
      const text = `${p.name || ""} ${p.category || ""}`.toLowerCase();
      return /air fryer|fryer/i.test(text);
    });
  }

  // If asking for fans: exclude cookware, air fryer, gas stove
  if (/\bfan\b|\bfans\b|\bbldc\b|\bceiling fan\b/i.test(q)) {
    return products.filter((p) => {
      const text = `${p.name || ""} ${p.category || ""}`.toLowerCase();
      return /fan|bldc/i.test(text);
    });
  }

  // If asking for cookware / pans: exclude fans, air fryers, kettles
  if (/cookware|kitchenware|frypan|\bpan\b|\bpans\b|appachatty|tawa|kadai|biriyani pot/i.test(q)) {
    return products.filter((p) => {
      const text = `${p.name || ""} ${p.category || ""}`.toLowerCase();
      return /appachatty|frypan|kadai|tawa|biriyani pot|cookware/i.test(text);
    });
  }

  // If asking for kettles:
  if (/kettle/i.test(q)) {
    return products.filter((p) => {
      const text = `${p.name || ""} ${p.category || ""}`.toLowerCase();
      return /kettle/i.test(text);
    });
  }

  return products;
}

