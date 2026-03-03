# Prompt Enhancer MCP Server

A Model Context Protocol (MCP) server providing 6 prompt engineering tools for AI agents. Enhance prompts, analyze quality, convert formats, generate system prompts, and browse 30+ production-ready templates.

**Vendor:** OpenClaw Intelligence
**Protocol:** MCP 2025-03-26 (Streamable HTTP)
**Free tier:** 10 calls/day per IP -- no signup required
**4 free tools + 1 Pro tool + purchase helper**

---

## Quick Start

### Option 0: One-Click Cursor Install

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=prompt-enhancer&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vcHJvbXB0LWVuaGFuY2VyLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Option 1: Install via Smithery

```bash
npx -y @smithery/cli install @yedanyagamiai-cmd/prompt-enhancer-mcp --client claude
```

### Option 2: Manual Configuration

Add this to your MCP client config (Claude Desktop, Cursor, Windsurf, Cline):

```json
{
  "mcpServers": {
    "prompt-enhancer": {
      "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

**Config file locations:**

| Client | Config Path |
|--------|------------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) |
| Claude Code | `~/.claude.json` or `.mcp.json` in project root |
| Cursor | `.cursor/mcp.json` in project root |
| Windsurf | `.windsurf/mcp.json` in project root |
| Cline | VS Code Settings > MCP Servers |

---

## Tools Reference

| Tool | Tier | Description | Required Params |
|------|------|-------------|-----------------|
| `enhance_prompt` | FREE | Optimize a prompt with better structure and constraints | `prompt` |
| `analyze_prompt` | FREE | Quality analysis with clarity/specificity scores | `prompt` |
| `convert_prompt_format` | FREE | Convert between plain, xml, markdown, json formats | `prompt`, `from_format`, `to_format` |
| `generate_system_prompt` | FREE | Generate system prompt for a role and task | `role`, `task` |
| `prompt_template_library` | PRO | Browse 30+ production-ready templates by category | `category`, `api_key` |
| `purchase_pro_key` | FREE | Get Pro API key purchase instructions | _(none)_ |

---

## Usage Examples

### 1. Enhance a prompt

**Request:**

```bash
curl -X POST https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "enhance_prompt",
      "arguments": {
        "prompt": "Write a Python function to sort a list",
        "style": "structured"
      }
    }
  }'
```

**Response:**

```json
{
  "original": "Write a Python function to sort a list",
  "enhanced": "You are an expert Python developer.\n\n## Task\nWrite a Python function that sorts a list of elements.\n\n## Requirements\n- Accept a list of any comparable type\n- Support both ascending and descending order via a parameter\n- Handle edge cases: empty list, single element, already sorted\n- Use type hints and docstrings\n- Time complexity: O(n log n) or better\n\n## Output Format\nReturn the complete function with:\n1. Type-annotated signature\n2. Google-style docstring\n3. Implementation\n4. 3 usage examples",
  "style": "structured",
  "improvements": [
    "Added role context",
    "Specified input/output requirements",
    "Added edge case handling",
    "Requested type hints and documentation",
    "Set output format expectations"
  ]
}
```

### 2. Analyze prompt quality

**Request:**

```bash
curl -X POST https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "analyze_prompt",
      "arguments": {
        "prompt": "Make a website"
      }
    }
  }'
```

**Response:**

```json
{
  "prompt": "Make a website",
  "scores": {
    "clarity": 25,
    "specificity": 10,
    "structure": 15,
    "overall": 17
  },
  "issues": [
    "Too vague -- no details about type, purpose, or technology",
    "Missing output format specification",
    "No constraints or requirements defined",
    "No target audience mentioned"
  ],
  "suggestions": [
    "Specify the type of website (e-commerce, blog, portfolio, SaaS)",
    "Define the tech stack (React, Next.js, HTML/CSS)",
    "List required pages and features",
    "Include design preferences or brand guidelines",
    "Specify responsive/accessibility requirements"
  ],
  "word_count": 3,
  "has_examples": false,
  "has_constraints": false
}
```

### 3. Convert prompt format

**Request:**

```bash
curl -X POST https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "convert_prompt_format",
      "arguments": {
        "prompt": "You are a code reviewer. Check for bugs and security issues. Output as bullet points.",
        "from_format": "plain",
        "to_format": "xml"
      }
    }
  }'
```

**Response:**

```json
{
  "original_format": "plain",
  "target_format": "xml",
  "converted": "<system>\n  <role>code reviewer</role>\n  <task>Check for bugs and security issues</task>\n  <output_format>bullet points</output_format>\n</system>"
}
```

### 4. Generate a system prompt

**Request:**

```bash
curl -X POST https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "generate_system_prompt",
      "arguments": {
        "role": "senior software engineer",
        "task": "review pull requests and suggest improvements",
        "constraints": ["be concise", "focus on security", "use markdown"],
        "tone": "professional"
      }
    }
  }'
```

**Response:**

```json
{
  "system_prompt": "You are a senior software engineer specializing in code review.\n\n## Primary Task\nReview pull requests and provide actionable improvement suggestions.\n\n## Guidelines\n- Be concise and direct in feedback\n- Prioritize security vulnerabilities and risks\n- Format all responses in Markdown\n- Categorize issues as: Critical, Major, Minor, Suggestion\n- Include code snippets showing recommended fixes\n- Acknowledge good patterns and practices\n\n## Tone\nMaintain a professional, constructive tone. Focus on the code, not the author.",
  "role": "senior software engineer",
  "task": "review pull requests and suggest improvements",
  "tone": "professional",
  "sections": ["role", "task", "guidelines", "constraints", "tone"]
}
```

### 5. Browse prompt templates (Pro)

**Request:**

```bash
curl -X POST https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "prompt_template_library",
      "arguments": {
        "category": "coding",
        "api_key": "YOUR_PRO_KEY"
      }
    }
  }'
```

**Response:**

```json
{
  "category": "coding",
  "template_count": 5,
  "templates": [
    {
      "id": "code-review",
      "title": "Code Review Expert",
      "description": "Thorough code review with security, performance, and maintainability analysis",
      "variables": ["language", "code"]
    },
    {
      "id": "unit-test-gen",
      "title": "Unit Test Generator",
      "description": "Generate comprehensive unit tests for a function or class",
      "variables": ["language", "framework", "code"]
    }
  ]
}
```

**Template categories:** `coding`, `analysis`, `writing`, `translation`, `debugging`, `data-extraction` -- 30+ templates total.

---

## Tool Details

### enhance_prompt (FREE)

Optimize a prompt with clearer instructions, better structure, and added constraints.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | The original prompt to enhance |
| `style` | string | No | Enhancement style: `concise`, `detailed`, `structured`, `creative` (default: `structured`) |

Returns: `original`, `enhanced`, `style`, `improvements` list.

### analyze_prompt (FREE)

Analyze prompt quality with numerical scores and actionable suggestions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | The prompt to analyze |

Returns: `scores` (clarity, specificity, structure, overall 0-100), `issues`, `suggestions`.

### convert_prompt_format (FREE)

Convert a prompt between plain text, XML, Markdown, and JSON formats.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | The prompt to convert |
| `from_format` | string | Yes | Source format: `plain`, `xml`, `markdown`, `json` |
| `to_format` | string | Yes | Target format: `plain`, `xml`, `markdown`, `json` |

### generate_system_prompt (FREE)

Generate a high-quality system prompt for any AI role.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `role` | string | Yes | The AI role (e.g., "senior software engineer") |
| `task` | string | Yes | The primary task or purpose |
| `constraints` | string[] | No | Optional list of constraints |
| `tone` | string | No | Desired tone (default: "professional") |

### prompt_template_library (PRO)

Browse 30+ curated, production-ready prompt templates organized by category.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | Yes | One of: `coding`, `analysis`, `writing`, `translation`, `debugging`, `data-extraction` |
| `api_key` | string | Yes | Pro API key ($9 one-time) |

### purchase_pro_key (FREE)

Get instructions for purchasing a Pro API key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payment_method` | string | No | Preferred payment method |

---

## Pricing

| Tier | Cost | Daily Limit | Templates |
|------|------|-------------|-----------|
| Free | $0 | 10 calls/day per IP | No |
| Pro Trial | $0 (7 days) | 100 calls/day | Yes |
| Pro | $9 one-time | 1,000 calls/day | Yes (30+) |

**Start free trial:** [Sign up with GitHub](https://product-store.yagami8095.workers.dev/auth/login) -- no credit card required.

When the free tier is exceeded, the server returns HTTP 402 with x402 payment headers for automated micropayment agents.

---

## Error Handling

All errors follow JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32029,
    "message": "Rate limit exceeded (10/day)"
  }
}
```

| Error Code | Meaning |
|------------|---------|
| -32600 | Invalid JSON-RPC request |
| -32601 | Tool not found |
| -32602 | Invalid parameters |
| -32029 | Rate limit exceeded |
| -32001 | Pro key required (for template library) |

---

## Architecture

- **Runtime:** Cloudflare Workers (global edge, <50ms cold start)
- **Transport:** Streamable HTTP (MCP 2025-03-26)
- **Rate Limiting:** Cloudflare KV (per-IP daily counter)
- **Caching:** Semantic cache via KV (24h TTL for deterministic results)
- **Pro Keys:** Validated via shared KV namespace across all OpenClaw servers
- **Protocol:** JSON-RPC 2.0

## Related Servers

Part of the [OpenClaw MCP ecosystem](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers) -- 9 servers, 49 tools:

- [JSON Toolkit](https://smithery.ai/server/@yedanyagamiai-cmd/json-toolkit-mcp) -- validate, format, diff, query, transform JSON
- [Regex Engine](https://smithery.ai/server/@yedanyagamiai-cmd/regex-engine-mcp) -- pattern testing, building, explanation
- [Color Palette](https://smithery.ai/server/@yedanyagamiai-cmd/color-palette-mcp) -- color conversion, WCAG, palettes
- [Timestamp Converter](https://smithery.ai/server/@yedanyagamiai-cmd/timestamp-converter-mcp) -- time zones, cron, duration

## License

MIT

---

Built by [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
