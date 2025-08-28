---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Nuxt Processor"
  text: "Dedicated processing for Nuxt apps"
  tagline: Background job processing for Nuxt using BullMQ
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Define a Worker
      link: /define-worker

features:
  - title: "🚀 Dedicated processing"
    details: Workers run in a separate Node process – no coupling to your web server.
  - title: "📈 Scalability"
    details: Run multiple worker processes and instances across machines.
  - title: "✨ Simple DX"
    details: Define queues/workers using first-class helpers.
---
