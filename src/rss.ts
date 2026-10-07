import { XMLParser } from "fast-xml-parser";

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

function requiredString(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  return value;
}

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: { "User-Agent": "gator" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed: ${response.status}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({ processEntities: false });
  const parsed: any = parser.parse(xml);
  const channel = parsed?.rss?.channel;
  if (typeof channel !== "object" || channel === null) {
    throw new Error("RSS feed is missing its channel");
  }

  const title = requiredString(channel.title);
  const link = requiredString(channel.link);
  const description = requiredString(channel.description);
  if (!title || !link || !description) {
    throw new Error("RSS channel is missing valid metadata");
  }

  const rawItems = channel.item;
  const itemList: unknown[] =
    rawItems === undefined
      ? []
      : Array.isArray(rawItems)
        ? rawItems
        : [rawItems];
  const items: RSSItem[] = [];
  for (const rawItem of itemList) {
    if (typeof rawItem !== "object" || rawItem === null) {
      continue;
    }
    const item = rawItem as Record<string, unknown>;
    const itemTitle = requiredString(item.title);
    const itemLink = requiredString(item.link);
    const itemDescription = requiredString(item.description);
    const pubDate = requiredString(item.pubDate);
    if (!itemTitle || !itemLink || !itemDescription || !pubDate) {
      continue;
    }
    items.push({
      title: itemTitle,
      link: itemLink,
      description: itemDescription,
      pubDate,
    });
  }

  return {
    channel: { title, link, description, item: items },
  };
}
