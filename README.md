# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
bunx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bun x sv@0.17.1 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" tailwindcss="plugins:typography" sveltekit-adapter="adapter:auto" --install bun cooldownroom
```

## Developing

Once you've created a project and installed dependencies with `bun install`, start a development server:

```sh
bun run dev

# or start the server and open the app in a new browser tab
bun run dev -- --open
```

## Building

To create a production version of your app:

```sh
bun run build
```

You can preview the production build with `bun run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## OpenF1 access

The homepage loads the most recent completed session, excluding sessions until 30 minutes after their end time. It falls back to the previous season when needed. Historical data is available without authentication. Live access requires an OpenF1 subscription. Set `OPENF1_API_TOKEN` in the server environment to a valid bearer access token obtained from OpenF1. Keep it private and replace it when it expires. No token is sent to the browser.

On authentication failures, the server reuses cached data where available and pauses requests for five minutes. Without cached data, the page explains that live access requires authentication. Changing the token bypasses that pause. The cache is in memory and resets when the server restarts.
