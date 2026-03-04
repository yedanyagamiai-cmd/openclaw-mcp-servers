# MCP_HACK//26 Demo Video Script (2 minutes)

## Category: MCP & AI Agents Starter Track

---

### [0:00-0:15] Hook
"What if you could build a production MCP server in 5 minutes, deploy it globally for free, and have it serving AI agents within the hour? That's exactly what this template does."

### [0:15-0:35] The Template
- Show `worker.js` — highlight the TOOLS object
- "Adding a tool is just a name, description, schema, and handler function. No framework, no dependencies, no build step."
- Show the 3 example tools (hello_world, get_timestamp, echo_json)

### [0:35-0:55] Deploy
- Run `npx wrangler deploy` in terminal
- Show the deployment URL appear
- "That's it. Your MCP server is live on Cloudflare's global edge — 300+ data centers, zero cold starts."

### [0:55-1:15] Connect
- Open Claude Desktop / Cursor config
- Add the server URL to MCP config
- Show the tools appearing in the AI client
- Call one of the tools — show the response

### [1:15-1:35] Production Features
- "Built-in rate limiting with KV storage — configurable per-IP daily limits"
- "SSE transport for real-time connections"
- "CORS support for browser-based clients"
- "Health check endpoint for monitoring"

### [1:35-1:55] Scale Proof
- Show Smithery dashboard with 9 servers listed
- "We used this exact pattern to build 9 production MCP servers serving thousands of AI agents"
- Show mcp.so / MCPize listings briefly
- "All running on the Cloudflare Workers free tier"

### [1:55-2:00] CTA
- "Clone the template, add your tools, deploy in 5 minutes. Link in the description."
- Show GitHub repo URL

---

## Recording Tips
- Screen record with OBS or Loom
- Use VS Code with the worker.js file open
- Terminal: use a clean prompt with dark theme
- Keep transitions quick — 2 minutes is tight
- No intro animation needed — jump straight in
