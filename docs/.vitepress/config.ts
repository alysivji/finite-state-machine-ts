import { defineConfig } from "vitepress";

// Replace this with the production docs URL if the Vercel project uses a different domain.
const siteUrl = "https://finite-state-machine-ts.vercel.app";

export default defineConfig({
  title: "finite-state-machine-ts",
  description:
    "A small, readable finite state machine library for TypeScript built around decorated class methods.",
  cleanUrls: true,
  lastUpdated: false,
  head: [
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "finite-state-machine-ts" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "A small, readable finite state machine library for TypeScript built around decorated class methods.",
      },
    ],
  ],
  sitemap: {
    hostname: siteUrl,
  },
  themeConfig: {
    search: {
      provider: "local",
    },
    nav: [
      { text: "Guide", link: "/getting-started" },
      { text: "Examples", link: "/examples/" },
      { text: "Diagrams", link: "/diagrams" },
      { text: "GitHub", link: "https://github.com/alysivji/finite-state-machine-ts" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Overview", link: "/" },
          { text: "Getting Started", link: "/getting-started" },
          { text: "Transitions and Runtime", link: "/transitions-and-runtime" },
          { text: "State Diagrams", link: "/diagrams" },
          { text: "For AI Agents", link: "/for-ai-agents" },
        ],
      },
      {
        text: "Examples",
        items: [
          { text: "Examples Index", link: "/examples/" },
          { text: "Turnstile", link: "/examples/turnstile" },
          { text: "Light Switch", link: "/examples/light-switch" },
          { text: "Traffic Light", link: "/examples/traffic-light" },
          { text: "Background Job", link: "/examples/background-job" },
          {
            text: "GitHub Pull Request",
            link: "/examples/github-pull-request",
          },
          { text: "Async Deployment", link: "/examples/async-deployment" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/alysivji/finite-state-machine-ts" },
    ],
  },
});
