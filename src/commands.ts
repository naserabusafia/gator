import { readConfig, setUser } from "./config.js";
import { startAggregator } from "./aggregator.js";
import { createFeedFollow, deleteFeedFollow, getFeedFollowsForUser } from "./lib/db/queries/feedFollows.js";
import { createFeed, getFeedByUrl, getFeeds } from "./lib/db/queries/feeds.js";
import { getPostsForUser } from "./lib/db/queries/posts.js";
import {
  createUser,
  deleteAllUsers,
  getUserByName,
  getUsers,
} from "./lib/db/queries/users.js";
import { fetchFeed } from "./rss.js";
import { feeds, users } from "./schema.js";

export type Feed = typeof feeds.$inferSelect;
export type User = typeof users.$inferSelect;

export type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export type CommandsRegistry = {
  [cmdName: string]: CommandHandler;
};

export function middlewareLoggedIn(
  handler: UserCommandHandler,
): CommandHandler {
  return async (cmdName, ...args) => {
    const userName = readConfig().currentUserName;
    if (!userName) {
      throw new Error("no user is currently logged in");
    }
    const user = await getUserByName(userName);
    if (!user) {
      throw new Error(`User ${userName} not found`);
    }
    await handler(cmdName, user, ...args);
  };
}

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];
  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }
  await handler(cmdName, ...args);
}

export async function handlerLogin(
  _cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("username is required");
  }
  const user = await getUserByName(args[0]);
  if (!user) {
    throw new Error(`User ${args[0]} does not exist`);
  }
  setUser(args[0]);
  console.log(`User switched to ${args[0]}`);
}

export async function handlerRegister(
  _cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("username is required");
  }
  const existingUser = await getUserByName(args[0]);
  if (existingUser) {
    throw new Error(`User ${args[0]} already exists`);
  }
  const user = await createUser(args[0]);
  setUser(args[0]);
  console.log(`User ${args[0]} has been created`);
  console.log(user);
}

export async function handlerReset(
  _cmdName: string,
  ..._args: string[]
): Promise<void> {
  await deleteAllUsers();
  console.log("Database reset successfully");
}

export async function handlerUsers(
  _cmdName: string,
  ..._args: string[]
): Promise<void> {
  const allUsers = await getUsers();
  const currentUserName = readConfig().currentUserName;
  for (const user of allUsers) {
    const currentMarker = user.name === currentUserName ? " (current)" : "";
    console.log(`* ${user.name}${currentMarker}`);
  }
}

export async function handlerAgg(
  _cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("time_between_reqs is required, for example 1m");
  }
  await startAggregator(args[0]);
}

export function printFeed(feed: Feed, user: User): void {
  console.log(`Feed created successfully:`);
  console.log(`  ID: ${feed.id}`);
  console.log(`  Name: ${feed.name}`);
  console.log(`  URL: ${feed.url}`);
  console.log(`  User: ${user.name}`);
  console.log(`  Created: ${feed.createdAt.toISOString()}`);
  console.log(`  Updated: ${feed.updatedAt.toISOString()}`);
}

export async function handlerAddFeed(
  _cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error("feed name and URL are required");
  }
  const feed = await createFeed(args[0], args[1], user.id);
  const follow = await createFeedFollow(user.id, feed.id);
  console.log(`${follow.userName} is now following ${follow.feedName}`);
}

export async function handlerFeeds(
  _cmdName: string,
  ..._args: string[]
): Promise<void> {
  const results = await getFeeds();
  for (const { feed, user } of results) {
    console.log(`* ${feed.name} (${feed.url}) by ${user.name}`);
  }
}

export async function handlerFollow(
  _cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("feed URL is required");
  }
  const feed = await getFeedByUrl(args[0]);
  if (!feed) {
    throw new Error(`Feed ${args[0]} does not exist`);
  }
  const follow = await createFeedFollow(user.id, feed.id);
  console.log(`${follow.userName} is now following ${follow.feedName}`);
}

export async function handlerFollowing(
  _cmdName: string,
  user: User,
  ..._args: string[]
): Promise<void> {
  const follows = await getFeedFollowsForUser(user.id);
  for (const follow of follows) {
    console.log(`${follow.feedName}`);
  }
}

export async function handlerUnfollow(
  _cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("feed URL is required");
  }
  const follow = await deleteFeedFollow(user.id, args[0]);
  if (!follow) {
    throw new Error("feed follow was not found");
  }
  console.log(`${user.name} is no longer following ${args[0]}`);
}


export async function handlerBrowse(
  _cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const limit = args.length > 0 ? Number(args[0]) : 2;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("limit must be a positive integer");
  }
  const results = await getPostsForUser(user.id, limit);
  for (const { post, feedName } of results) {
    console.log(`* ${post.title}`);
    console.log(`  Feed: ${feedName}`);
    console.log(`  URL: ${post.url}`);
    console.log(`  Published: ${post.publishedAt.toISOString()}`);
    if (post.description) {
      console.log(`  ${post.description}`);
    }
  }
}
