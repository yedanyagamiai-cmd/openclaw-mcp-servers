---
name: openclaw-prompt-enhancer
version: 2.0.0
description: "Remote prompt engineering MCP server with 6 tools that turn weak prompts into powerful ones. Use when: (1) 'improve this prompt' or 'make my prompt better', (2) 'score this prompt' or 'rate prompt quality', (3) 'convert prompt to Claude format' or 'translate for Gemini', (4) 'generate system prompt' or 'create instructions', (5) 'prompt templates' or 'show me examples'. 10-dimension scoring, cross-model conversion, 100+ templates. Zero install, sub-100ms on Cloudflare Workers. Free 10/day + Pro $9/mo."
read_when:
  - User says "improve this prompt", "make this prompt better", or "enhance prompt"
  - User asks to "score prompt", "rate my prompt", or "analyze prompt quality"
  - User needs cross-model conversion — "convert to Claude format", "translate for Gemini"
  - User wants system prompts — "generate system prompt", "create AI instructions"
  - User asks for "prompt templates", "prompt library", or "prompt engineering tips"
metadata:
  openclaw:
    emoji: "\u270D\uFE0F"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Prompt Enhancer v2.0

**Prompt engineering on autopilot. 6 tools. 10-dimension scoring. Cross-model conversion. 100+ templates.**

| Tool | Purpose | Free |
|------|---------|------|
| `enhance_prompt` | Transform weak prompts into powerful ones | Yes |
| `analyze_prompt` | Score quality 0-100 across 10 dimensions | Yes |
| `convert_prompt_format` | Translate between OpenAI/Claude/Gemini/Llama/Mistral | Yes |
| `generate_system_prompt` | Create production-ready system instructions | Yes |
| `prompt_template_library` | Browse 100+ battle-tested templates | Pro |
| `purchase_pro_key` | Get Pro access for all 9 servers | Yes |

## What's New in v2.0

- **PromptScan Engine** -- 10-dimension quality analysis with per-axis scoring and actionable improvement suggestions.
- **ModelBridge Protocol** -- Lossless prompt translation between 5 major AI model formats, preserving intent and optimizing for each model's strengths.
- **TemplateVault** -- 100+ production-ready prompt templates organized by domain, each with fill-in variables, example I/O, and difficulty rating.
- **EnhanceChain** -- Multi-pass enhancement that applies role framing, context injection, format specification, few-shot examples, and edge case handling in sequence.

## Quick Start

```json
{
  "openclaw-prompt": {
    "type": "streamable-http",
    "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Zero install. Works immediately.

## Detection Triggers

This skill activates when a user says any of these:
- "improve this prompt", "make this prompt better", "enhance my prompt", "rewrite this prompt"
- "analyze prompt quality", "score this prompt", "rate my prompt", "how good is this prompt"
- "convert prompt to Claude format", "translate prompt for Gemini", "OpenAI to Llama format"
- "generate system prompt", "create system instructions", "write a system message", "build AI persona"
- "prompt templates", "prompt library", "show me prompt examples", "best prompts for coding"
- "prompt engineering", "prompt optimization", "better AI output", "why is my prompt bad"

## Named Protocols

### EnhanceChain
Multi-pass enhancement pipeline that transforms any prompt through 5 sequential stages:
1. **Role Framing** -- Adds expert persona and domain context
2. **Context Injection** -- Inserts background information and constraints
3. **Format Specification** -- Defines expected output structure
4. **Few-Shot Examples** -- Adds 1-3 concrete input/output pairs
5. **Edge Case Handling** -- Anticipates failure modes and adds guardrails

Each stage reports what it changed and why, so you learn prompt engineering by watching the tool work.

### PromptScan Engine
10-dimension quality analysis that scores your prompt on:

| Dimension | Weight | Measures |
|-----------|--------|----------|
| Clarity | 15% | Unambiguous language, no jargon |
| Specificity | 15% | Concrete details vs. vague requests |
| Context | 12% | Background info for the AI |
| Constraints | 12% | Boundaries and limitations defined |
| Examples | 10% | Few-shot demonstrations included |
| Format | 10% | Output structure specified |
| Role | 8% | Expert persona assigned |
| Tone | 6% | Voice and style defined |
| Edge Cases | 6% | Failure modes anticipated |
| Testability | 6% | Can output be objectively verified |

### ModelBridge Protocol
Lossless translation between AI model prompt formats:
- **OpenAI** -- system/user/assistant message array with function calling
- **Claude** -- Human/Assistant turns with XML tags and system prompt
- **Gemini** -- Parts-based format with safety settings
- **Llama** -- `[INST]` chat template with `<<SYS>>` blocks
- **Mistral** -- `[INST]` variant with tool-use formatting

Each translation preserves intent while applying model-specific best practices (e.g., Claude prefers XML structure, OpenAI benefits from JSON mode hints).

### TemplateVault
100+ curated templates across 9 categories, each with:
- Fill-in variable placeholders (`{topic}`, `{audience}`, `{format}`)
- Example input/output pair
- Compatible models list
- Difficulty rating (beginner/intermediate/advanced)
- Expected token usage estimate

## Tools (6)

### `enhance_prompt` -- Automatic Enhancement via EnhanceChain
Take any prompt and return a dramatically improved version. The EnhanceChain pipeline applies all 5 enhancement stages and returns both the enhanced prompt and a detailed changelog.

**Wrong / Right:**

```
WRONG prompt (vague, no structure):
  "Write about dogs"

RIGHT prompt (after enhance_prompt):
  "You are a veterinary science writer for a pet owner audience.
   Write a 500-word article about the top 5 health benefits of
   daily walks for dogs. Include one scientific study citation
   per benefit. Format: H2 headers, bullet points, casual tone.
   End with a practical tip."

Result: Score jumps from 18/100 -> 87/100.
The changelog explains each improvement.
```

```
WRONG: Manually trying to improve your prompt by guessing what's missing
RIGHT: enhance_prompt({ prompt: "summarize this article" })
       -> Enhanced version with role, format spec, length constraint, and example output
       -> Changelog: "+role: research analyst, +format: bullet points with headers, +constraint: 200 words max"
```

### `analyze_prompt` -- Quality Scoring via PromptScan Engine
Score any prompt on a 0-100 scale across 10 dimensions with actionable improvement suggestions.

**Wrong / Right:**

```
WRONG: Assuming your prompt is "good enough" without measurement
RIGHT: analyze_prompt({ prompt: "help me with my code" })
       -> Score: 12/100
       -> Clarity: 3/15 ("what code? what language? what help?")
       -> Specificity: 1/15 ("no file names, no error messages, no expected behavior")
       -> Suggestions: "Add language, error message, expected vs actual behavior, code snippet"

WRONG: Blindly trusting a high score for all use cases
RIGHT: A 60/100 conversational prompt may outperform a 95/100 rigid prompt for creative tasks.
       Context matters. The tool tells you which dimensions to prioritize for your use case.
```

### `convert_prompt_format` -- Cross-Model Translation via ModelBridge
Convert prompts between AI model formats while preserving intent and optimizing for each model's strengths.

**Wrong / Right:**

```
WRONG: Copy-pasting an OpenAI prompt into Claude and wondering why XML tags are ignored
RIGHT: convert_prompt_format({ prompt: openai_messages, target: "claude" })
       -> Restructures system prompt, converts function schemas to tool_use blocks,
          wraps structured data in XML tags, adjusts token estimation

WRONG: Converting a simple "hello world" prompt between models (no value added)
RIGHT: Convert complex multi-turn prompts with system instructions, tools, and format constraints
       where each model has genuinely different conventions
```

### `generate_system_prompt` -- System Prompt Factory
Generate complete, production-ready system prompts from a brief description.

**Input:** role description, key constraints, desired tone, output format preferences
**Output:** structured system prompt with persona, rules, examples, edge case handling, and output specification

### `prompt_template_library` (Pro) -- TemplateVault Access
Browse 100+ battle-tested prompt templates organized by category:
- **Coding** -- code review, bug fix, refactor, test generation, documentation
- **Writing** -- blog post, email, report, creative fiction, technical docs
- **Analysis** -- data analysis, comparison, pros/cons, SWOT, root cause
- **Data** -- extraction, transformation, classification, summarization
- **Creative** -- brainstorming, naming, taglines, storytelling
- **Business** -- pitch deck, proposal, meeting notes, OKR generation
- **Education** -- lesson plan, quiz generation, concept explanation
- **Research** -- literature review, hypothesis generation, methodology
- **Translation** -- localization, style adaptation, cultural context

### `purchase_pro_key` -- Upgrade to Pro
Get a Pro API key for full TemplateVault access and 1,000 calls/day across all 9 OpenClaw servers.

## Security & Privacy

- **No prompt storage** -- Your prompts are processed in-memory and never written to disk, database, or log files.
- **No training data** -- Your prompts are never used to train, fine-tune, or improve any AI model. Period.
- **No third-party calls** -- Enhancement and scoring run entirely on Cloudflare Workers. No external LLM API calls.
- **Edge isolation** -- Each request runs in an isolated V8 isolate. No shared state between users or requests.
- **HTTPS only** -- All connections are TLS 1.3 encrypted. HTTP requests are rejected, not redirected.
- **No prompt leakage** -- Templates are served as static data. Your custom prompts are never mixed into the template library.

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| **Free** | 10 | $0 | 5 tools (TemplateVault excluded) |
| **Pro** | 1,000 | $9/mo | All 6 tools + all 9 OpenClaw servers (49 tools) |
| **x402** | Pay-per-call | $0.05 USDC | No account needed, crypto-native |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **JSON Toolkit** | 6 | Format, validate, diff, query, transform JSON |
| **Regex Engine** | 5 | Test, extract, replace, explain regex patterns |
| **Color Palette** | 5 | Generate, convert, harmonize, accessibility-check colors |
| **Timestamp Converter** | 5 | Parse, format, diff, timezone-convert timestamps |
| **Prompt Enhancer** | 6 | Optimize, rewrite, score, A/B test AI prompts |
| **Market Intelligence** | 6 | AI market trends, GitHub stats, competitor analysis |
| **Fortune & Tarot** | 3 | Daily fortune, tarot readings, I Ching |
| **Content Publisher** | 8 | MoltBook posts, social content, newsletter |
| **AgentForge Compare** | 5 | Compare AI tools, frameworks, MCP servers |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
