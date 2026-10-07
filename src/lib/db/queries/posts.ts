import { desc, eq } from "drizzle-orm";
import { db } from "..";
import { feedFollows, feeds, posts } from "../../../schema.js";

export async function createPost(
  title: string,
  url: string,
  description: string | null,
  publishedAt: Date,
  feedId: string,
) {
  const [post] = await db
    .insert(posts)
    .values({ title, url, description, publishedAt, feedId })
    .onConflictDoNothing({ target: posts.url })
    .returning();
  return post;
}

export async function getPostsForUser(userId: string, limit: number) {
  return await db
    .select({ post: posts, feedName: feeds.name })
    .from(posts)
    .innerJoin(feeds, eq(posts.feedId, feeds.id))
    .innerJoin(feedFollows, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.userId, userId))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}
