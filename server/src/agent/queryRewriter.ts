const QUERY_REWRITES: Record<string, string[]> = {
  "electronic": ["tv", "led tv", "smart tv", "soundbar", "speaker", "air fryer", "kettle"],
  "electronics": ["tv", "led tv", "smart tv", "soundbar", "speaker", "air fryer", "kettle"],
  "electronic items": ["tv", "led tv", "smart tv", "soundbar", "speaker", "air fryer", "kettle"],
  "gadget": ["tv", "soundbar", "speaker", "air fryer"],
  "gadgets": ["tv", "soundbar", "speaker", "air fryer"],
  "appliance": ["air fryer", "kettle", "rice cooker"],
  "appliances": ["air fryer", "kettle", "rice cooker"],
  "kitchen appliances": ["air fryer", "kettle", "rice cooker"],
  "home appliances": ["air fryer", "kettle", "rice cooker", "tv", "soundbar"],
  "household": ["cookware", "frypan", "appachatty", "pressure cooker", "air fryer", "kettle"],
  "cookware": ["cookware", "frypan", "appachatty", "pressure cooker", "tawa", "kadai"],
  "kitchenware": ["cookware", "frypan", "appachatty", "pressure cooker", "tawa", "kadai"],
  "kitchen": ["cookware", "frypan", "appachatty", "pressure cooker", "tawa", "kadai", "air fryer"],
  "dosa": ["dosa pan", "tawa", "non-stick tawa", "appachatty"],
  "appam": ["appachatty", "non-stick appachatty", "cookware"],
  "rice": ["rice cooker", "pressure cooker", "5L pressure cooker"],
  "biryani": ["pressure cooker", "5L pressure cooker", "cookware"],
  "tv": ["tv", "led tv", "smart tv", "television"],
  "television": ["tv", "led tv", "smart tv", "television"],
  "speakers": ["soundbar", "bluetooth speaker", "2.1 soundbar", "home theatre"],
  "soundbar": ["soundbar", "2.1 soundbar", "5.1 soundbar", "soundbar speaker"],
  "music": ["soundbar", "bluetooth speaker"],
  "sound": ["soundbar", "bluetooth speaker"],
  "frying": ["frypan", "non-stick frypan", "tawa"],
  "items": ["cookware", "pressure cooker", "frypan", "soundbar", "tv", "air fryer"],
  "products": ["cookware", "pressure cooker", "frypan", "soundbar", "tv", "air fryer"],
  "anything": ["cookware", "pressure cooker", "frypan", "soundbar", "tv", "air fryer"],
  "best": ["cookware", "pressure cooker", "frypan", "soundbar", "tv", "air fryer"],
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
