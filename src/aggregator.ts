import { createPost } from "./lib/db/queries/posts.js";
import {
  getNextFeedToFetch,
  markFeedFetched,
} from "./lib/db/queries/feeds.js";
import { fetchFeed } from "./rss.js";

export async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();
  if (!feed) {
    console.log("No feeds to fetch");
    return;
  }

  console.log(`Fetching feed: ${feed.name} (${feed.url})`);
  const rssFeed = await fetchFeed(feed.url);
  await markFeedFetched(feed.id);
  for (const item of rssFeed.channel.item) {
    const publishedAt = new Date(item.pubDate);
    if (Number.isNaN(publishedAt.getTime())) {
      console.warn(`Skipping post with invalid publication date: ${item.title}`);
      continue;
    }
    await createPost(
      item.title,
      item.link,
      item.description || null,
      publishedAt,
      feed.id,
    );
  }
  console.log(`Saved posts from ${feed.name}`);
}

export function parseDuration(durationStr: string): number {
  const match = durationStr.match(/^(\d+)(ms|s|m|h)$/);
  if (!match) {
    throw new Error(`Invalid duration: ${durationStr}`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
  };
  const duration = amount * multipliers[unit];
  if (!Number.isSafeInteger(duration) || duration <= 0) {
    throw new Error(`Invalid duration: ${durationStr}`);
  }
  return duration;
}

function formatDuration(durationMs: number): string {
  const hours = Math.floor(durationMs / 3_600_000);
  const minutes = Math.floor((durationMs % 3_600_000) / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1000);
  const milliseconds = durationMs % 1000;
  if (hours > 0) {
    return `${hours}h${minutes}m${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m${seconds}s`;
  }
  if (seconds > 0) {
    return `${seconds}s`;
  }
  return `${milliseconds}ms`;
}

export async function startAggregator(durationStr: string): Promise<void> {
  const timeBetweenRequests = parseDuration(durationStr);
  console.log(`Collecting feeds every ${formatDuration(timeBetweenRequests)}`);

  const handleError = (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
  };
  const interval = setInterval(() => {
    void scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);
  void scrapeFeeds().catch(handleError);

  await new Promise<void>((resolve) => {
    process.once("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

