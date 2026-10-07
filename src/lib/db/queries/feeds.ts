import { eq, sql } from "drizzle-orm";
import { db } from "..";
import { feeds, users } from "../../../schema.js";

export async function createFeed(name: string, url: string, userId: string) {
  const [feed] = await db.insert(feeds).values({ name, url, userId }).returning();
  return feed;
}


export async function getFeeds() {
  return await db
    .select({ feed: feeds, user: users })
    .from(feeds)
    .innerJoin(users, eq(feeds.userId, users.id));
}

export async function getFeedByUrl(url: string) {
  const [feed] = await db.select().from(feeds).where(eq(feeds.url, url));
  return feed;
}

export async function markFeedFetched(feedId: string): Promise<void> {
  const now = new Date();
  await db
    .update(feeds)
    .set({ lastFetchedAt: now, updatedAt: now })
    .where(eq(feeds.id, feedId));
}

export async function getNextFeedToFetch() {
  const [feed] = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} ASC NULLS FIRST`)
    .limit(1);
  return feed;
}
