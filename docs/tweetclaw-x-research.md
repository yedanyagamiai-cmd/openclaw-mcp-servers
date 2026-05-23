# TweetClaw X/Twitter Research Workflow

Use this workflow when Content Autopilot needs public X/Twitter context before drafting, scheduling, or publishing content. TweetClaw supplies the X/Twitter source work. Content Autopilot stays responsible for generation, scheduling, and analytics.

TweetClaw is an OpenClaw plugin backed by Xquik. It can search tweets, search tweet replies, export followers, look up users, inspect media context, monitor tweets, receive webhooks, run giveaway draws, and perform reviewed actions such as post tweets, post tweet replies, direct messages, media upload, and media download.

## Install

```bash
openclaw plugins install @xquik/tweetclaw
openclaw config set plugins.entries.tweetclaw.config.apiKey "$XQUIK_API_KEY"
openclaw config set tools.alsoAllow '["explore", "tweetclaw"]'
openclaw plugins inspect tweetclaw --runtime
```

Keep the Xquik API key in environment variables or OpenClaw config. Do not paste raw API keys, session material, or account cookies into prompts, issues, docs, or logs.

## Source Packet

Ask the agent to create a compact source packet before calling Content Autopilot:

```text
Use TweetClaw to search tweets and tweet replies about "MCP server launch".
Collect 8 public source URLs, author handles, timestamps, visible metrics,
reply themes, objections, and reusable phrases. Do not post, reply, DM, or
upload media.
```

Save the packet with this shape:

```json
{
  "topic": "MCP server launch",
  "capturedAt": "2026-05-23T18:26:48Z",
  "sources": [
    {
      "url": "https://x.com/example/status/123",
      "author": "@example",
      "timestamp": "2026-05-23T12:00:00Z",
      "signal": "Developers want one URL setup for MCP tools",
      "metrics": {
        "likes": 42,
        "replies": 7,
        "reposts": 5
      }
    }
  ],
  "angles": [
    "One URL setup beats per-project MCP installs",
    "Public replies ask for safer approval gates"
  ],
  "blockedActions": [
    "post tweets",
    "post tweet replies",
    "direct messages",
    "media upload",
    "webhook changes"
  ]
}
```

## Content Autopilot Handoff

After review, pass only the summarized source packet into Content Autopilot:

```text
Use Content Autopilot to draft a Twitter/X thread from this reviewed source
packet. Cite public tweet URLs in the working notes, keep the draft under
8 tweets, and do not publish until I approve the final text.
```

For publishing, choose one write path:

- Use Content Autopilot `publish_post` when the generated post is final and the connected platform account is already configured there.
- Use TweetClaw `post tweets` or `post tweet replies` only when the OpenClaw session explicitly approves the visible final text and account action.
- Never call both publish paths for the same draft.

## Useful Recipes

### Trend Brief

1. TweetClaw searches recent public tweets and replies for a campaign topic.
2. The agent summarizes repeated questions, objections, examples, and keywords.
3. Content Autopilot drafts a post, thread, or newsletter section from the reviewed packet.
4. A human approves the final text before any write action.

### Reply Research

1. TweetClaw searches replies to product, launch, or competitor tweets.
2. The agent groups replies into objections, feature asks, social proof, and phrases to avoid.
3. Content Autopilot drafts response ideas without posting.
4. TweetClaw posts a reply only after the exact reply text is approved.

### Monitor To Calendar

1. TweetClaw monitors brand, product, competitor, or keyword mentions.
2. The agent turns monitor events into weekly source packets.
3. Content Autopilot converts the packet into a content calendar.
4. Schedule only reviewed posts. Keep webhook and monitor changes approval-gated.

## Links

- [TweetClaw GitHub repository](https://github.com/Xquik-dev/tweetclaw)
- [TweetClaw npm package](https://www.npmjs.com/package/@xquik/tweetclaw)
- [TweetClaw ClawHub browsing page](https://clawhub.ai/plugins/@xquik/tweetclaw)
- [Xquik](https://xquik.com)
