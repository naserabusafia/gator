import { closeDb } from "./lib/db/index.js";
import {
  handlerAddFeed,
  handlerBrowse,
  handlerAgg,
  handlerFeeds,
  handlerFollow,
  handlerFollowing,
  handlerLogin,
  handlerRegister,
  handlerReset,
  handlerUsers,
  handlerUnfollow,
  middlewareLoggedIn,
  registerCommand,
  runCommand,
  type CommandsRegistry,
} from "./commands.js";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    throw new Error("not enough arguments were provided");
  }

  const cmdName = args[0];
  const cmdArgs = args.slice(1);
  const registry: CommandsRegistry = {};
  registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));
  registerCommand(registry, "browse", middlewareLoggedIn(handlerBrowse));
  registerCommand(registry, "agg", handlerAgg);
  registerCommand(registry, "feeds", handlerFeeds);
  registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
  registerCommand(registry, "following", middlewareLoggedIn(handlerFollowing));
  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "unfollow", middlewareLoggedIn(handlerUnfollow));

  await runCommand(registry, cmdName, ...cmdArgs);
}

main()
  .then(async () => {
    await closeDb();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await closeDb();
    process.exit(1);
  });


