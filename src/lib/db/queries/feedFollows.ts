import { and, eq } from "drizzle-orm";
import { db } from "..";
import { feedFollows, feeds, users } from "../../../schema.js";
import { getFeedByUrl } from "./feeds.js";

export async function createFeedFollow(userId: string, feedId: string) {
  const [createdFollow] = await db
    .insert(feedFollows)
    .values({ userId, feedId })
    .returning();

  const [follow] = await db
    .select({
      feedFollow: feedFollows,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.id, createdFollow.id));
  return follow;
}

export async function getFeedFollowsForUser(userId: string) {
  return await db
    .select({
      feedFollow: feedFollows,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.userId, userId));
}

export async function deleteFeedFollow(userId: string, feedUrl: string) {
  const feed = await getFeedByUrl(feedUrl);
  if (!feed) {
    return undefined;
  }
  const [deletedFollow] = await db
    .delete(feedFollows)
    .where(and(eq(feedFollows.userId, userId), eq(feedFollows.feedId, feed.id)))
    .returning();
  return deletedFollow;
}
