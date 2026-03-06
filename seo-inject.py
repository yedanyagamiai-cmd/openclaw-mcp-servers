#!/usr/bin/env python3
"""Inject SEO metadata into all 9 MCP server worker.js files."""
import os, re, json

servers = {
    "json-toolkit-mcp": {
        "title": "JSON Toolkit MCP Server - Format, Validate, Diff & Query JSON | OpenClaw",
        "desc": "Free MCP server with 6 JSON utilities for AI agents: format, validate, diff, query with JSONPath, transform, and generate JSON Schema. Works with Claude Code, Cursor, Windsurf.",
        "url": "https://json-toolkit-mcp.yagami8095.workers.dev",
        "keywords": "JSON formatter, JSON validator, JSON diff, JSONPath query, MCP server, AI tools, Claude Code"
    },
    "regex-engine-mcp": {
        "title": "Regex Engine MCP Server - Test, Debug & Generate Regular Expressions | OpenClaw",
        "desc": "Free MCP server for regex testing, debugging, and generation. Get explanations, examples, and multi-pattern matching for AI coding agents. Claude Code and Cursor compatible.",
        "url": "https://regex-engine-mcp.yagami8095.workers.dev",
        "keywords": "regex tester, regular expression, regex debugger, MCP server, AI tools, pattern matching"
    },
    "color-palette-mcp": {
        "title": "Color Palette MCP Server - Generate Palettes & Check Contrast | OpenClaw",
        "desc": "Free MCP server for color palette generation, format conversion, WCAG contrast checking, and color harmony. Perfect for AI-assisted design workflows.",
        "url": "https://color-palette-mcp.yagami8095.workers.dev",
        "keywords": "color palette generator, WCAG contrast, color converter, MCP server, AI design tools"
    },
    "timestamp-converter-mcp": {
        "title": "Timestamp Converter MCP Server - Unix/ISO Conversion & Timezone Math | OpenClaw",
        "desc": "Free MCP server for timestamp conversion between Unix, ISO 8601, and human-readable formats. Timezone math, duration calculations, and date arithmetic for AI agents.",
        "url": "https://timestamp-converter-mcp.yagami8095.workers.dev",
        "keywords": "timestamp converter, Unix timestamp, ISO 8601, timezone converter, MCP server, date calculator"
    },
    "prompt-enhancer-mcp": {
        "title": "Prompt Enhancer MCP Server - Optimize & Score AI Prompts | OpenClaw",
        "desc": "Free MCP server for prompt optimization, rewriting, scoring, and multilingual enhancement. Improve AI prompt quality automatically for Claude, GPT, and other LLMs.",
        "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev",
        "keywords": "prompt engineering, prompt optimizer, AI prompts, MCP server, prompt scoring, LLM tools"
    },
    "agentforge-compare-mcp": {
        "title": "AgentForge Compare MCP Server - AI Coding Tool Comparison Engine | OpenClaw",
        "desc": "Free MCP server comparing AI coding tools: Claude Code vs Cursor vs Devin vs GitHub Copilot. Get feature analysis, pricing comparison, and recommendation for your workflow.",
        "url": "https://agentforge-compare-mcp.yagami8095.workers.dev",
        "keywords": "AI coding tools, Claude Code comparison, Cursor vs Copilot, AI tool comparison, MCP server"
    },
    "moltbook-publisher-mcp": {
        "title": "MoltBook Publisher MCP Server - Japanese Content Publishing Toolkit | OpenClaw",
        "desc": "Free MCP server for Japanese content publishing: Markdown to HTML conversion, SEO optimization, and English to Japanese translation. Publish to note.com, Zenn, Qiita.",
        "url": "https://moltbook-publisher-mcp.yagami8095.workers.dev",
        "keywords": "Japanese content, note.com publishing, Markdown converter, EN-JP translation, MCP server"
    },
    "fortune-mcp": {
        "title": "Fortune MCP Server - Daily Horoscope & Tarot for AI Agents | OpenClaw",
        "desc": "Free MCP server delivering daily horoscopes and tarot card readings for all 12 zodiac signs. Love, work, health scores and lucky items for AI-powered personal assistants.",
        "url": "https://fortune-mcp.yagami8095.workers.dev",
        "keywords": "horoscope API, tarot reading, zodiac fortune, MCP server, AI assistant, daily horoscope"
    },
    "openclaw-intel-mcp": {
        "title": "OpenClaw Intel MCP Server - AI Market Intelligence & Trend Analysis | OpenClaw",
        "desc": "MCP server for AI market intelligence: track Claude Code, Cursor, Devin growth trends. Competitive analysis, ecosystem reports, and real-time AI industry insights.",
        "url": "https://openclaw-intel-mcp.yagami8095.workers.dev",
        "keywords": "AI market intelligence, competitive analysis, Claude Code trends, AI industry reports, MCP server"
    }
}

base_dir = os.path.dirname(os.path.abspath(__file__))
modified = 0

for server_name, seo in servers.items():
    worker_path = os.path.join(base_dir, server_name, "worker.js")
    if not os.path.exists(worker_path):
        print(f"SKIP: {server_name}/worker.js not found")
        continue

    with open(worker_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Check if already has meta description
    if 'meta name="description"' in content or 'meta name=\\"description\\"' in content:
        print(f"SKIP: {server_name} already has SEO meta")
        continue

    # Build SEO meta block
    seo_block = (
        '\n  <meta name="description" content="' + seo["desc"] + '">'
        + '\n  <meta name="keywords" content="' + seo["keywords"] + '">'
        + '\n  <meta name="robots" content="index, follow">'
        + '\n  <link rel="canonical" href="' + seo["url"] + '">'
        + '\n  <meta property="og:type" content="website">'
        + '\n  <meta property="og:title" content="' + seo["title"] + '">'
        + '\n  <meta property="og:description" content="' + seo["desc"] + '">'
        + '\n  <meta property="og:url" content="' + seo["url"] + '">'
        + '\n  <meta property="og:site_name" content="OpenClaw Intelligence">'
        + '\n  <meta name="twitter:card" content="summary">'
        + '\n  <meta name="twitter:title" content="' + seo["title"] + '">'
        + '\n  <meta name="twitter:description" content="' + seo["desc"] + '">'
    )

    # Build JSON-LD
    app_name = seo["title"].split(" - ")[0] if " - " in seo["title"] else seo["title"].split(" | ")[0]
    jsonld = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": app_name,
        "description": seo["desc"],
        "url": seo["url"],
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Any",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "author": {
            "@type": "Organization",
            "name": "OpenClaw Intelligence",
            "url": "https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers"
        }
    }
    jsonld_str = json.dumps(jsonld, indent=2)
    # Escape for JS template literal
    jsonld_escaped = jsonld_str.replace("\\", "\\\\")

    jsonld_block = '\n  <script type="application/ld+json">\n  ' + jsonld_escaped + '\n  <\\/script>'

    # Insert SEO block after <title>...</title> line
    title_pattern = r"(<title>.*?</title>)"
    match = re.search(title_pattern, content)
    if match:
        insert_pos = match.end()
        content = content[:insert_pos] + seo_block + content[insert_pos:]
    else:
        print(f"WARN: {server_name} no <title> tag found")
        continue

    # Insert JSON-LD before </head>
    head_close = content.find("</head>")
    if head_close > 0:
        content = content[:head_close] + jsonld_block + "\n" + content[head_close:]

    with open(worker_path, "w", encoding="utf-8") as f:
        f.write(content)

    modified += 1
    print(f"OK: {server_name} - SEO injected ({len(seo_block)} + {len(jsonld_block)} chars)")

print(f"\nTotal modified: {modified}/9")
