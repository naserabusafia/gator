# Gator

Gator is a local TypeScript CLI that stores RSS feeds and posts in PostgreSQL. Users can add feeds, follow feeds added by others, and browse recent posts.

## Requirements

- Node.js 24 or newer and npm
- PostgreSQL 16 or newer, running locally

## Setup

Install the project dependencies and create the database:

```sh
npm ci
createdb gator
```

Create `~/.gatorconfig.json` in your home directory. Replace `<password>` with the password for the local PostgreSQL `postgres` role:

```json
{
  "db_url": "postgres://postgres:<password>@localhost:5432/gator?sslmode=disable"
}
```

Apply the database migrations:

```sh
npx drizzle-kit migrate
```

## Use

Register a user. Registration also logs that user in:

```sh
npm run start register naser
```

Add a feed, then inspect or follow feeds:

```sh
npm run start addfeed "Hacker News" "https://news.ycombinator.com/rss"
npm run start feeds
npm run start follow "https://news.ycombinator.com/rss"
npm run start following
npm run start unfollow "https://news.ycombinator.com/rss"
```

Run the aggregator with a polling interval such as `1m`, `30s`, or `1h`. It fetches one feed at a time, stores new posts, and keeps running until you press Ctrl+C:

```sh
npm run start agg 1m
```

Browse the latest posts from feeds you follow. The limit defaults to 2:

```sh
npm run start browse 10
```

The `reset` command deletes every user. Because feeds and posts belong to users, PostgreSQL also deletes the related records through cascading foreign keys:

```sh
npm run start reset
```
