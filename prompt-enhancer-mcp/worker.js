/**
 * Prompt Enhancer MCP — Cloudflare Worker
 * MCP 2025-03-26 / JSON-RPC 2.0
 * Vendor: OpenClaw Intelligence
 *
 * Tools:
 *  FREE  — enhance_prompt, analyze_prompt, convert_prompt_format, generate_system_prompt
 *  PRO   — prompt_template_library
 *  FREE  — purchase_pro_key
 */

// ---------------------------------------------------------------------------
// Ecosystem cross-promo
// ---------------------------------------------------------------------------
const ECOSYSTEM = {
  prompt:      'https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp',
  json:        'https://json-toolkit-mcp.yagami8095.workers.dev/mcp',
  regex:       'https://regex-engine-mcp.yagami8095.workers.dev/mcp',
  color:       'https://color-palette-mcp.yagami8095.workers.dev/mcp',
  timestamp:   'https://timestamp-converter-mcp.yagami8095.workers.dev/mcp',
  intel:       'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  fortune:     'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  moltbook:    'https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp',
  agentforge:  'https://agentforge-compare-mcp.yagami8095.workers.dev/mcp',
  store:       'https://product-store.yagami8095.workers.dev',
  fortune_api: 'https://fortune-api.yagami8095.workers.dev',
  intel_api:   'https://openclaw-intel-api.yagami8095.workers.dev',
  pro_page:    'https://product-store.yagami8095.workers.dev/products/intel-api-pro',
  paypal:      'https://paypal.me/Yagami8095/9',
};

const SERVER_INFO = { name: 'prompt-enhancer', version: '1.0.0' };
const VENDOR      = 'OpenClaw Intelligence';

// ---------------------------------------------------------------------------
// MCP tool definitions
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    name: 'enhance_prompt',
    description: 'Take a basic prompt and return an optimized, enhanced version with clearer instructions, better structure, added constraints, and example format. FREE tool.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The original prompt to enhance.' },
        style: {
          type: 'string',
          enum: ['concise', 'detailed', 'structured', 'creative'],
          description: 'Enhancement style. Default: structured.',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'analyze_prompt',
    description: 'Analyze a prompt for quality: clarity score (0-100), specificity score, potential issues, and improvement suggestions. FREE tool.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The prompt to analyze.' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'convert_prompt_format',
    description: 'Convert a prompt between formats: plain, xml, markdown, json. FREE tool.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt:      { type: 'string', description: 'The prompt to convert.' },
        from_format: { type: 'string', enum: ['plain', 'xml', 'markdown', 'json'], description: 'Source format.' },
        to_format:   { type: 'string', enum: ['plain', 'xml', 'markdown', 'json'], description: 'Target format.' },
      },
      required: ['prompt', 'from_format', 'to_format'],
    },
  },
  {
    name: 'generate_system_prompt',
    description: 'Generate a high-quality system prompt for a given role and task. FREE tool.',
    inputSchema: {
      type: 'object',
      properties: {
        role:        { type: 'string', description: 'The AI role (e.g. "senior software engineer", "copywriter").' },
        task:        { type: 'string', description: 'The primary task or purpose.' },
        constraints: { type: 'array', items: { type: 'string' }, description: 'Optional list of constraints.' },
        tone:        { type: 'string', description: 'Desired tone (e.g. "professional", "friendly", "concise"). Default: professional.' },
      },
      required: ['role', 'task'],
    },
  },
  {
    name: 'prompt_template_library',
    description: 'Browse 30+ curated, production-ready prompt templates by category (coding, analysis, writing, translation, debugging, data-extraction). PRO tool — requires api_key.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['coding', 'analysis', 'writing', 'translation', 'debugging', 'data-extraction'],
          description: 'Template category.',
        },
        api_key: { type: 'string', description: 'Pro API key ($9 one-time — see purchase_pro_key).' },
      },
      required: ['category', 'api_key'],
    },
  },
  {
    name: 'purchase_pro_key',
    description: 'Get purchase instructions for a Pro API key ($9 one-time). Unlocks prompt_template_library and higher rate limits (100 req/day). FREE tool.',
    inputSchema: {
      type: 'object',
      properties: {
        payment_method: { type: 'string', description: 'Preferred payment method (optional).' },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Prompt Template Library (30+ templates across 6 categories)
// ---------------------------------------------------------------------------
const TEMPLATE_LIBRARY = {
  coding: [
    {
      id: 'code-review',
      title: 'Code Review Expert',
      description: 'Perform a thorough code review with security, performance, and maintainability analysis.',
      template: `Review the following {{language}} code and provide:

1. **Security Issues**: Identify vulnerabilities (SQL injection, XSS, insecure deps, etc.)
2. **Performance**: Flag bottlenecks, N+1 queries, memory leaks.
3. **Maintainability**: Assess readability, naming, structure, DRY violations.
4. **Correctness**: Logical errors, edge cases, off-by-one errors.
5. **Recommendations**: Prioritized list (P0/P1/P2) with code examples.

Format each issue as:
\`\`\`
[SEVERITY] Category: Description
Line X: <code snippet>
Fix: <suggested fix>
\`\`\`

Code to review:
{{code}}`,
      variables: ['language', 'code'],
      usage_example: 'Code review for Python API endpoint',
    },
    {
      id: 'unit-test-gen',
      title: 'Unit Test Generator',
      description: 'Generate comprehensive unit tests for a function or class.',
      template: `Generate complete unit tests for the following {{language}} code using {{framework}}.

Requirements:
- Cover all happy paths
- Cover edge cases and boundary conditions
- Cover error/exception scenarios
- Use descriptive test names (format: test_<behavior>_when_<condition>_returns_<result>)
- Include setup/teardown where needed
- Aim for >90% branch coverage

Code:
{{code}}

Output format: Complete, runnable test file.`,
      variables: ['language', 'framework', 'code'],
      usage_example: 'Generate pytest tests for a payment processing function',
    },
    {
      id: 'refactor-guide',
      title: 'Refactoring Planner',
      description: 'Create a step-by-step refactoring plan for legacy code.',
      template: `Analyze this {{language}} code and produce a refactoring plan.

Identify:
1. Code smells (long methods, god classes, feature envy, etc.)
2. Design pattern opportunities (strategy, factory, observer, etc.)
3. SOLID principle violations

For each improvement:
- Describe the problem
- Show the before/after code snippet
- Estimate effort (S/M/L)
- State risks and mitigation

Prioritize by: impact × effort⁻¹

Code:
{{code}}`,
      variables: ['language', 'code'],
      usage_example: 'Refactor a monolithic Express.js controller',
    },
    {
      id: 'api-design',
      title: 'REST API Designer',
      description: 'Design a RESTful API for a given feature with OpenAPI spec.',
      template: `Design a RESTful API for: {{feature_description}}

Deliverables:
1. Resource model (entities and relationships)
2. Endpoint list (method + path + description)
3. Request/response schemas (JSON)
4. Error codes and messages
5. Authentication strategy
6. Rate limiting recommendations
7. OpenAPI 3.0 YAML snippet for top 3 endpoints

Constraints: {{constraints}}`,
      variables: ['feature_description', 'constraints'],
      usage_example: 'Design a user authentication API',
    },
    {
      id: 'sql-optimizer',
      title: 'SQL Query Optimizer',
      description: 'Analyze and optimize slow SQL queries.',
      template: `Optimize this SQL query for {{database_type}}.

Query:
{{sql}}

Schema context:
{{schema}}

Provide:
1. Query analysis (what it does, why it's slow)
2. Index recommendations (CREATE INDEX statements)
3. Rewritten optimized query
4. Expected performance improvement estimate
5. EXPLAIN plan interpretation (if provided: {{explain_output}})`,
      variables: ['database_type', 'sql', 'schema', 'explain_output'],
      usage_example: 'Optimize a slow JOIN query on PostgreSQL',
    },
  ],
  analysis: [
    {
      id: 'data-analysis',
      title: 'Data Analysis Framework',
      description: 'Structured data analysis with insights and recommendations.',
      template: `Analyze the following data and provide a structured report.

Data:
{{data}}

Analysis framework:
1. **Summary Statistics**: Mean, median, std dev, min/max for numeric fields.
2. **Trend Analysis**: Identify patterns, seasonality, anomalies.
3. **Correlations**: Key relationships between variables.
4. **Outliers**: Flag unusual data points with explanations.
5. **Insights**: Top 3 actionable findings.
6. **Recommendations**: Concrete next steps based on data.

Output format: Executive summary (2-3 sentences) followed by detailed sections.`,
      variables: ['data'],
      usage_example: 'Analyze monthly sales data CSV',
    },
    {
      id: 'competitive-analysis',
      title: 'Competitive Intelligence Report',
      description: 'Comprehensive competitive analysis framework.',
      template: `Conduct a competitive analysis for {{company}} in the {{industry}} market.

Analyze:
1. **Market Position**: Market share, positioning, target segments.
2. **Product/Service**: Feature comparison matrix vs top 3 competitors.
3. **Pricing**: Pricing model, tiers, value proposition.
4. **Strengths**: Core competencies and moat.
5. **Weaknesses**: Vulnerabilities and gaps.
6. **Opportunities**: Market gaps to exploit.
7. **Threats**: Competitive and market risks.

Format: SWOT matrix + narrative for each section.
Data sources to consider: {{data_sources}}`,
      variables: ['company', 'industry', 'data_sources'],
      usage_example: 'Competitive analysis for a SaaS startup',
    },
    {
      id: 'root-cause-analysis',
      title: 'Root Cause Analysis (5 Whys)',
      description: 'Structured root cause analysis for problems.',
      template: `Perform a root cause analysis for: {{problem_statement}}

Context: {{context}}

Method: 5 Whys + Fishbone (Ishikawa)

1. Apply 5 Whys (iterate at least 5 levels deep)
2. Fishbone categories: People, Process, Technology, Environment, Materials, Measurement
3. Identify contributing vs root causes
4. Propose corrective actions per root cause
5. Define success metrics

Present as:
- Why chain diagram (text)
- Fishbone summary table
- Prioritized action plan`,
      variables: ['problem_statement', 'context'],
      usage_example: 'RCA for a production outage',
    },
    {
      id: 'document-summary',
      title: 'Executive Document Summary',
      description: 'Summarize long documents into executive-ready format.',
      template: `Summarize the following document for an executive audience.

Document:
{{document}}

Output format:
**TL;DR** (1-2 sentences): The absolute core message.

**Key Points** (bullet list, max 5):
- ...

**Decisions Required** (if any):
- ...

**Risks/Concerns** (if any):
- ...

**Recommended Action**:

Length constraint: Total summary must be under {{max_words}} words.`,
      variables: ['document', 'max_words'],
      usage_example: 'Summarize a 50-page technical spec',
    },
    {
      id: 'sentiment-analysis',
      title: 'Sentiment & Tone Analysis',
      description: 'Deep sentiment analysis for reviews, feedback, or communications.',
      template: `Analyze the sentiment and tone of the following text.

Text:
{{text}}

Provide:
1. **Overall Sentiment**: Positive/Neutral/Negative (with confidence %)
2. **Emotion Breakdown**: Joy, anger, fear, surprise, trust, anticipation (% each)
3. **Tone**: Formal/Informal, Assertive/Passive, etc.
4. **Key Sentiment Drivers**: Phrases or sentences causing the sentiment
5. **Intent**: What does the author want the reader to do or feel?
6. **Summary**: 1-paragraph interpretation

If multiple texts are provided, include a comparative table.`,
      variables: ['text'],
      usage_example: 'Analyze customer support ticket sentiment',
    },
  ],
  writing: [
    {
      id: 'blog-post',
      title: 'SEO Blog Post Writer',
      description: 'Write an SEO-optimized blog post with full structure.',
      template: `Write a {{word_count}}-word SEO-optimized blog post.

Topic: {{topic}}
Target keyword: {{keyword}}
Audience: {{audience}}
Tone: {{tone}}

Structure:
1. **Hook** (first paragraph grabs attention — stat, question, or bold claim)
2. **Introduction** (problem statement + what reader will gain)
3. **H2 Sections** (5-7 sections, each with H3 subpoints)
4. **Practical Examples** (real-world illustrations)
5. **Common Mistakes** (1 section)
6. **Conclusion** (summary + CTA)

SEO requirements:
- Keyword density: 1-2%
- Include keyword in H1, first paragraph, and one H2
- Meta description (155 chars): included at top
- Internal linking suggestions: [LINK: topic]`,
      variables: ['word_count', 'topic', 'keyword', 'audience', 'tone'],
      usage_example: 'Write a blog post about prompt engineering for developers',
    },
    {
      id: 'email-writer',
      title: 'Professional Email Composer',
      description: 'Write clear, professional emails for any business scenario.',
      template: `Write a professional email for the following scenario.

Scenario: {{scenario}}
Sender: {{sender_role}}
Recipient: {{recipient_role}}
Desired outcome: {{desired_outcome}}
Tone: {{tone}}

Requirements:
- Subject line: compelling, specific (< 60 chars)
- Opening: personalized, no "I hope this email finds you well"
- Body: clear, scannable (bullet points where appropriate)
- CTA: single, clear call-to-action
- Closing: professional, appropriate to tone
- Total length: {{length}} (short/medium/long)

Also provide: 2 alternative subject lines.`,
      variables: ['scenario', 'sender_role', 'recipient_role', 'desired_outcome', 'tone', 'length'],
      usage_example: 'Write a sales outreach email to a CTO',
    },
    {
      id: 'product-copy',
      title: 'Product Description Copywriter',
      description: 'Write compelling product descriptions that convert.',
      template: `Write product copy for: {{product_name}}

Product details: {{product_details}}
Target customer: {{target_customer}}
Key benefits: {{key_benefits}}
Unique selling proposition: {{usp}}
Platform: {{platform}} (e.g., Amazon, Shopify, landing page)

Deliverables:
1. **Headline** (benefit-driven, < 12 words)
2. **Subheadline** (elaborates on headline, < 20 words)
3. **Short description** (150 words — for listing/preview)
4. **Full description** (400 words — for product page)
5. **5 bullet points** (feature → benefit format)
6. **CTA button text** (3 options)

Avoid: passive voice, vague superlatives, feature-dumping.`,
      variables: ['product_name', 'product_details', 'target_customer', 'key_benefits', 'usp', 'platform'],
      usage_example: 'Write copy for an AI productivity tool',
    },
    {
      id: 'social-media',
      title: 'Social Media Content Pack',
      description: 'Generate a multi-platform social media content pack.',
      template: `Create a social media content pack for: {{topic}}

Brand voice: {{brand_voice}}
Goal: {{goal}} (awareness/engagement/conversion)

Generate:
1. **Twitter/X** (3 tweets, max 280 chars each, one with thread hook)
2. **LinkedIn** (1 post, 150-300 words, professional insight angle)
3. **Instagram** (caption + 10 hashtags, visual description suggestion)
4. **Facebook** (1 post, conversational, with engagement question)

Each post should:
- Stand alone (no context required)
- Have a clear hook in the first line
- Include a CTA appropriate to the platform`,
      variables: ['topic', 'brand_voice', 'goal'],
      usage_example: 'Social media pack for a product launch',
    },
    {
      id: 'technical-doc',
      title: 'Technical Documentation Writer',
      description: 'Write clear technical documentation for APIs, tools, or processes.',
      template: `Write technical documentation for: {{subject}}

Audience: {{audience}} (beginner/intermediate/expert)
Doc type: {{doc_type}} (API reference/how-to guide/tutorial/overview)

Structure:
1. **Overview** (what it is, why it matters, when to use it)
2. **Prerequisites** (requirements, dependencies, assumed knowledge)
3. **Quick Start** (minimal working example in < 5 steps)
4. **Detailed Reference** (parameters, options, return values)
5. **Code Examples** (3+ real-world examples with comments)
6. **Common Errors** (error codes + fixes)
7. **FAQ** (5 questions)

Style: Active voice, second-person ("you"), short sentences.
Code blocks: Use appropriate language tags.`,
      variables: ['subject', 'audience', 'doc_type'],
      usage_example: 'Document a REST API endpoint',
    },
  ],
  translation: [
    {
      id: 'cultural-translate',
      title: 'Cultural-Aware Translator',
      description: 'Translate with cultural context and localization notes.',
      template: `Translate the following text from {{source_language}} to {{target_language}}.

Text:
{{text}}

Requirements:
- Maintain original tone and register (formal/informal)
- Adapt cultural references for target audience
- Preserve idioms with natural equivalents
- Flag untranslatable terms with explanations

Output format:
**Translation:**
[translated text]

**Cultural Notes:**
- [Term]: [explanation and adaptation chosen]

**Alternative Phrasings** (where ambiguity exists):
- [Original phrase]: [Option A] / [Option B]

**Localization Flags** (items needing further review):
- [item]: [reason]`,
      variables: ['source_language', 'target_language', 'text'],
      usage_example: 'Translate marketing copy from English to Japanese',
    },
    {
      id: 'technical-translate',
      title: 'Technical Document Translator',
      description: 'Translate technical content preserving terminology and structure.',
      template: `Translate this technical document from {{source_language}} to {{target_language}}.

Domain: {{domain}} (software/medical/legal/engineering/etc.)

Document:
{{text}}

Rules:
- Use established technical terminology in target language
- Do NOT translate: code snippets, variable names, proper nouns, brand names
- Preserve all formatting (markdown, HTML tags, etc.)
- For ambiguous technical terms, provide: [translated term] (original: {{source_language}} term)
- Maintain consistent terminology throughout

Provide a terminology glossary (5-10 key terms) at the end.`,
      variables: ['source_language', 'target_language', 'domain', 'text'],
      usage_example: 'Translate API documentation to German',
    },
    {
      id: 'tone-adapt',
      title: 'Register & Tone Adapter',
      description: 'Rewrite text in a different register or formality level.',
      template: `Adapt the following text from {{current_register}} to {{target_register}}.

Current register: {{current_register}} (e.g., casual, academic, technical, business formal)
Target register: {{target_register}}
Language: {{language}}

Text:
{{text}}

Provide:
1. **Adapted version** (full rewrite)
2. **Key changes made** (bullet list of transformations)
3. **Vocabulary substitutions** (table: original → adapted)

Preserve: all factual content, core message, and intent.`,
      variables: ['current_register', 'target_register', 'language', 'text'],
      usage_example: 'Convert academic text to plain English',
    },
    {
      id: 'multilang-ui',
      title: 'UI String Localizer',
      description: 'Localize UI strings for multiple languages simultaneously.',
      template: `Localize the following UI strings for {{target_languages}}.

Context: {{app_context}} (e.g., "mobile banking app", "e-commerce checkout")

Strings (JSON format):
{{ui_strings}}

Requirements:
- Keep strings concise (UI space is limited)
- Maintain natural phrasing for each language
- Note where character count may cause UI issues (flag strings > 150% of English length)
- Use informal/formal based on: {{formality}}

Output: JSON object with language codes as keys.
Example: { "en": {...}, "ja": {...}, "de": {...} }`,
      variables: ['target_languages', 'app_context', 'ui_strings', 'formality'],
      usage_example: 'Localize checkout flow for EN/JA/DE/FR',
    },
    {
      id: 'subtitle-translate',
      title: 'Subtitle & Caption Translator',
      description: 'Translate subtitles with timing and length constraints.',
      template: `Translate these subtitles from {{source_language}} to {{target_language}}.

Constraints:
- Max 42 characters per line
- Max 2 lines per subtitle block
- Maintain timing cues exactly as provided
- Natural speech rhythm in target language

SRT content:
{{srt_content}}

Flag any blocks where meaning cannot be condensed to fit constraints.`,
      variables: ['source_language', 'target_language', 'srt_content'],
      usage_example: 'Translate YouTube video subtitles to Spanish',
    },
  ],
  debugging: [
    {
      id: 'error-diagnosis',
      title: 'Error Diagnosis & Fix',
      description: 'Diagnose errors with root cause analysis and fix.',
      template: `Diagnose and fix the following error.

Language/Framework: {{language}}
Error message:
{{error_message}}

Stack trace:
{{stack_trace}}

Relevant code:
{{code}}

Context (what were you trying to do?): {{context}}

Provide:
1. **Root Cause**: Exactly why this error occurs
2. **Explanation**: Plain-language description
3. **Immediate Fix**: Minimal code change to resolve
4. **Best Practice Fix**: Proper solution with explanation
5. **Prevention**: How to avoid this class of error in future
6. **Similar Errors**: Related issues to watch for`,
      variables: ['language', 'error_message', 'stack_trace', 'code', 'context'],
      usage_example: 'Debug a NullPointerException in Java',
    },
    {
      id: 'performance-debug',
      title: 'Performance Bottleneck Finder',
      description: 'Identify and fix performance issues in code.',
      template: `Analyze this {{language}} code for performance issues.

Code:
{{code}}

Performance symptoms: {{symptoms}} (e.g., "slow on large inputs", "high memory usage")
Data scale: {{data_scale}} (e.g., "1M rows", "1000 concurrent users")

Analysis:
1. **Complexity Analysis**: Time and space complexity (Big-O)
2. **Bottlenecks**: Top 3 performance issues with line references
3. **Quick Wins**: Low-effort, high-impact fixes
4. **Architectural Improvements**: Structural changes for scale
5. **Optimized Version**: Rewritten critical sections

Include: before/after benchmark estimates.`,
      variables: ['language', 'code', 'symptoms', 'data_scale'],
      usage_example: 'Find bottleneck in a data processing pipeline',
    },
    {
      id: 'debug-strategy',
      title: 'Debugging Strategy Planner',
      description: 'Create a systematic debugging plan for complex issues.',
      template: `Create a systematic debugging plan for this issue.

Problem description: {{problem}}
System: {{system}} (e.g., "Node.js API + PostgreSQL + Redis")
Symptoms: {{symptoms}}
Frequency: {{frequency}} (always/intermittent/rare)
Recent changes: {{recent_changes}}

Debugging plan:
1. **Hypothesis Matrix**: List 5 possible causes ranked by likelihood
2. **Information Gathering**: Commands/queries to run to gather evidence
3. **Isolation Steps**: How to narrow down the cause
4. **Test Cases**: Specific scenarios to reproduce
5. **Logging Strategy**: What to log and where
6. **Escalation Criteria**: When to involve other teams/experts

Format as a checklist with expected outcomes for each step.`,
      variables: ['problem', 'system', 'symptoms', 'frequency', 'recent_changes'],
      usage_example: 'Debug intermittent 502 errors in production',
    },
    {
      id: 'memory-leak',
      title: 'Memory Leak Analyzer',
      description: 'Identify and fix memory leaks in applications.',
      template: `Analyze this code for memory leaks.

Language: {{language}}
Runtime: {{runtime}} (e.g., Node.js v20, Python 3.11, JVM 17)

Code:
{{code}}

Memory profile data (if available):
{{profile_data}}

Provide:
1. **Leak Locations**: Specific lines/functions leaking memory
2. **Leak Type**: Event listeners, closures, circular refs, unclosed resources, etc.
3. **Severity**: Memory growth rate estimate
4. **Fix**: Corrected code with explanation
5. **Verification**: How to confirm the fix works (tooling commands)`,
      variables: ['language', 'runtime', 'code', 'profile_data'],
      usage_example: 'Find memory leak in a Node.js Express server',
    },
    {
      id: 'test-failure',
      title: 'Failing Test Investigator',
      description: 'Diagnose why tests are failing and provide fixes.',
      template: `Investigate why these tests are failing.

Test framework: {{framework}}
Failing tests:
{{failing_tests}}

Error output:
{{error_output}}

Source code:
{{source_code}}

Analysis:
1. **Failure Classification**: Test bug vs implementation bug vs environment issue
2. **Root Cause Per Test**: Individual explanation for each failing test
3. **Fixes**: Code changes needed (test or implementation)
4. **Flaky Test Detection**: Identify tests that may be non-deterministic
5. **Test Quality**: Suggestions to improve test reliability`,
      variables: ['framework', 'failing_tests', 'error_output', 'source_code'],
      usage_example: 'Investigate Jest test failures after a refactor',
    },
  ],
  'data-extraction': [
    {
      id: 'web-scrape',
      title: 'Web Scraping Instructions',
      description: 'Generate web scraping instructions and selectors for a target site.',
      template: `Generate web scraping instructions for extracting data from: {{url}}

Target data: {{target_data}}
Preferred method: {{method}} (CSS selectors/XPath/regex/API)

Provide:
1. **Page Structure Analysis**: Key HTML elements and their roles
2. **Selectors**: CSS/XPath for each data field
3. **Pagination**: How to handle pagination (if applicable)
4. **Anti-scraping Considerations**: Rate limits, bot detection, user-agent
5. **Code Snippet**: {{language}} example using {{library}}
6. **Data Schema**: JSON structure for extracted data
7. **Error Handling**: Common failures and handling strategies`,
      variables: ['url', 'target_data', 'method', 'language', 'library'],
      usage_example: 'Scrape product prices from an e-commerce site',
    },
    {
      id: 'document-extractor',
      title: 'Document Information Extractor',
      description: 'Extract structured data from unstructured documents.',
      template: `Extract the following information from this document.

Document type: {{doc_type}} (invoice/contract/report/email/etc.)
Extract these fields:
{{fields_to_extract}}

Document:
{{document_text}}

Output format: JSON with these exact field names:
{{output_schema}}

Rules:
- If a field is not found, use null
- For dates, normalize to ISO 8601 format
- For currency, include currency code
- Flag low-confidence extractions with a "_confidence": "low" sibling field
- Include "_source": "line N" for traceability`,
      variables: ['doc_type', 'fields_to_extract', 'document_text', 'output_schema'],
      usage_example: 'Extract line items from a PDF invoice',
    },
    {
      id: 'regex-extractor',
      title: 'Regex Pattern Builder',
      description: 'Build regex patterns to extract specific data from text.',
      template: `Build regex patterns to extract: {{target_data}}

Sample input text:
{{sample_input}}

Requirements:
- Language: {{regex_flavor}} (Python/JavaScript/PCRE/etc.)
- Handle these edge cases: {{edge_cases}}
- Named capture groups: yes

For each pattern:
1. **Pattern**: The regex (raw string format)
2. **Explanation**: Step-by-step breakdown of each component
3. **Test Cases**: 5 matching + 3 non-matching examples
4. **Code Snippet**: Extraction code with error handling

Also provide a single combined pattern if multiple extractions are needed.`,
      variables: ['target_data', 'sample_input', 'regex_flavor', 'edge_cases'],
      usage_example: 'Extract emails, phone numbers, and dates from text',
    },
    {
      id: 'log-parser',
      title: 'Log File Parser',
      description: 'Parse and structure log files for analysis.',
      template: `Create a log parsing solution for this log format.

Log sample:
{{log_sample}}

Log format: {{log_format}} (Apache/Nginx/JSON/custom)
Goals: Extract {{extraction_goals}}

Provide:
1. **Field Identification**: Map each log segment to a named field
2. **Parsing Strategy**: Regex vs structured parser recommendation
3. **Parser Code**: {{language}} implementation
4. **Data Schema**: SQL CREATE TABLE or JSON Schema
5. **Aggregation Queries**: 3 useful analytical queries on extracted data
6. **Error Handling**: Malformed line handling`,
      variables: ['log_sample', 'log_format', 'extraction_goals', 'language'],
      usage_example: 'Parse Nginx access logs for analytics',
    },
    {
      id: 'api-data-pipeline',
      title: 'API Data Pipeline Builder',
      description: 'Build an extraction pipeline from a REST API to structured data.',
      template: `Design a data extraction pipeline for API: {{api_name}}

API details:
- Base URL: {{base_url}}
- Authentication: {{auth_method}}
- Rate limit: {{rate_limit}}

Data to extract: {{target_data}}
Destination: {{destination}} (PostgreSQL/BigQuery/CSV/JSON/etc.)

Pipeline design:
1. **Extraction Layer**: API call strategy, pagination, retry logic
2. **Transformation Layer**: Field mapping, type coercion, normalization
3. **Load Layer**: Destination schema and insert strategy
4. **Scheduling**: Recommended frequency and incremental sync approach
5. **Code**: Full pipeline in {{language}} with error handling
6. **Monitoring**: Key metrics and alerting recommendations`,
      variables: ['api_name', 'base_url', 'auth_method', 'rate_limit', 'target_data', 'destination', 'language'],
      usage_example: 'Extract GitHub repo stats into PostgreSQL',
    },
    {
      id: 'table-extractor',
      title: 'Table & Spreadsheet Extractor',
      description: 'Extract and normalize tabular data from various sources.',
      template: `Extract and normalize the tabular data below.

Source format: {{source_format}} (HTML table/CSV/TSV/Markdown table/PDF table)
Table data:
{{table_data}}

Provide:
1. **Parsed Headers**: Detected column names (cleaned)
2. **Data Types**: Inferred type for each column
3. **Normalized JSON**: Array of row objects
4. **Data Quality Report**:
   - Missing values per column (%)
   - Duplicate rows count
   - Type inconsistencies
5. **SQL INSERT Statements**: For inferred schema
6. **Pandas Code**: Load and clean this data in Python`,
      variables: ['source_format', 'table_data'],
      usage_example: 'Extract pricing table from an HTML page',
    },
  ],
};

// ---------------------------------------------------------------------------
// Prompt enhancement logic
// ---------------------------------------------------------------------------
function enhancePrompt(prompt, style = 'structured') {
  const trimmed = prompt.trim();
  const words   = trimmed.split(/\s+/).length;

  // Detect prompt characteristics
  const hasRole          = /\b(you are|act as|as a|your role)\b/i.test(trimmed);
  const hasOutputFormat  = /\b(format|output|respond|return|provide|give me)\b/i.test(trimmed);
  const hasConstraints   = /\b(must|should|only|never|always|don't|do not|avoid|limit)\b/i.test(trimmed);
  const hasExamples      = /\b(example|for instance|e\.g\.|such as|like)\b/i.test(trimmed);
  const endsWithQuestion = trimmed.endsWith('?');
  const isVague          = words < 15 && !hasOutputFormat;

  let enhanced;

  switch (style) {
    case 'concise':
      enhanced = buildConciseEnhancement(trimmed, { hasRole, hasOutputFormat, hasConstraints, hasExamples, isVague });
      break;
    case 'detailed':
      enhanced = buildDetailedEnhancement(trimmed, { hasRole, hasOutputFormat, hasConstraints, hasExamples, isVague });
      break;
    case 'creative':
      enhanced = buildCreativeEnhancement(trimmed, { hasRole, hasOutputFormat, hasConstraints, hasExamples, isVague });
      break;
    case 'structured':
    default:
      enhanced = buildStructuredEnhancement(trimmed, { hasRole, hasOutputFormat, hasConstraints, hasExamples, isVague });
      break;
  }

  return {
    original:        trimmed,
    enhanced:        enhanced.text,
    style,
    changes_made:    enhanced.changes,
    word_count:      { original: words, enhanced: enhanced.text.split(/\s+/).length },
    quality_delta:   enhanced.qualityDelta,
  };
}

function buildStructuredEnhancement(prompt, flags) {
  const changes = [];
  const parts   = [];

  // Role definition
  if (!flags.hasRole) {
    parts.push('You are an expert assistant with deep knowledge in the relevant domain.');
    changes.push('Added role definition for context');
  }

  // Task clarity
  parts.push(`## Task\n${prompt}`);

  // Output requirements
  if (!flags.hasOutputFormat) {
    parts.push(`## Output Requirements\n- Provide a clear, well-organized response\n- Use headers and bullet points where appropriate\n- Include concrete examples to illustrate key points`);
    changes.push('Added output format requirements');
  }

  // Constraints
  if (!flags.hasConstraints) {
    parts.push(`## Constraints\n- Be specific and avoid vague generalizations\n- Cite reasoning for key decisions\n- If uncertain, clearly state limitations`);
    changes.push('Added quality constraints');
  }

  // Example format
  if (!flags.hasExamples) {
    parts.push(`## Response Format\nStructure your response as:\n1. Direct answer or summary\n2. Detailed explanation\n3. Examples or evidence\n4. Caveats or alternatives (if applicable)`);
    changes.push('Added response format template');
  }

  return {
    text:         parts.join('\n\n'),
    changes,
    qualityDelta: changes.length * 15 + 20,
  };
}

function buildConciseEnhancement(prompt, flags) {
  const changes = [];
  let text      = prompt;

  if (!flags.hasRole) {
    text     = `Expert assistant: ${text}`;
    changes.push('Added expert role prefix');
  }

  if (!flags.hasOutputFormat) {
    text     = `${text}\n\nRespond concisely with: (1) direct answer, (2) key reasoning, (3) one example.`;
    changes.push('Added concise output format');
  }

  if (!flags.hasConstraints) {
    text     = `${text} Be specific. Avoid padding.`;
    changes.push('Added brevity constraint');
  }

  return { text, changes, qualityDelta: changes.length * 12 + 15 };
}

function buildDetailedEnhancement(prompt, flags) {
  const changes = [];
  const parts   = [];

  if (!flags.hasRole) {
    parts.push('You are a world-class expert with extensive experience in the subject matter. Your responses are thorough, accurate, and educational.');
    changes.push('Added expert role with depth expectation');
  }

  parts.push(`# Primary Task\n${prompt}`);
  parts.push(`# Depth Requirements\nProvide a comprehensive response that covers:\n- Theoretical foundations and background\n- Step-by-step practical guidance\n- Real-world examples and case studies\n- Common pitfalls and how to avoid them\n- Advanced considerations for edge cases\n- References to best practices or standards`);
  changes.push('Added comprehensive depth requirements');

  if (!flags.hasOutputFormat) {
    parts.push(`# Output Structure\nOrganize your response with:\n1. Executive Summary (3-5 sentences)\n2. Detailed Explanation (with subsections)\n3. Practical Examples (minimum 2)\n4. Best Practices\n5. Common Mistakes\n6. Further Reading/Resources`);
    changes.push('Added detailed output structure');
  }

  parts.push(`# Quality Standards\n- Every claim must be supported by reasoning\n- Use precise terminology\n- Quantify where possible (avoid "many", "some", "often")\n- Length: as long as necessary, no unnecessary padding`);
  changes.push('Added quality standards');

  return { text: parts.join('\n\n'), changes, qualityDelta: changes.length * 18 + 10 };
}

function buildCreativeEnhancement(prompt, flags) {
  const changes = [];
  const parts   = [];

  if (!flags.hasRole) {
    parts.push('You are a creative visionary — imaginative, original, and skilled at thinking beyond conventional boundaries.');
    changes.push('Added creative persona');
  }

  parts.push(`## Creative Brief\n${prompt}`);
  parts.push(`## Creative Direction\n- Embrace unexpected angles and fresh perspectives\n- Use vivid, sensory language\n- Subvert expectations where it adds value\n- Balance originality with clarity and usefulness`);
  changes.push('Added creative direction guidelines');

  parts.push(`## Deliverables\n- Primary creative response\n- 2 alternative interpretations or angles\n- A "wildcard" option that pushes boundaries`);
  changes.push('Added creative deliverable structure');

  return { text: parts.join('\n\n'), changes, qualityDelta: changes.length * 14 + 20 };
}

// ---------------------------------------------------------------------------
// Prompt analysis logic
// ---------------------------------------------------------------------------
function analyzePrompt(prompt) {
  const trimmed = prompt.trim();
  const words   = trimmed.split(/\s+/).length;
  const sentences = trimmed.split(/[.!?]+/).filter(Boolean).length;

  // Scoring dimensions (each 0-100)
  const scores = {};
  const issues = [];
  const suggestions = [];

  // 1. Clarity (0-100)
  let clarityScore = 50;
  if (words < 5)  { clarityScore -= 30; issues.push('Prompt is too short to be actionable'); }
  if (words > 500){ clarityScore -= 20; issues.push('Prompt may be too long; consider breaking it up'); }
  if (/\b(thing|stuff|something|somehow|whatever)\b/i.test(trimmed)) {
    clarityScore -= 15;
    issues.push('Vague terms detected ("thing", "stuff", "something") — be more specific');
    suggestions.push('Replace vague nouns with precise terms');
  }
  if (/\b(you know|kind of|sort of|maybe|perhaps)\b/i.test(trimmed)) {
    clarityScore -= 10;
    issues.push('Hedging language reduces clarity');
    suggestions.push('Remove hedging qualifiers for clearer intent');
  }
  if (/\b(please|could you|would you|can you)\b/i.test(trimmed)) {
    clarityScore += 5; // polite = well-formed request
  }
  clarityScore = Math.min(100, Math.max(0, clarityScore + Math.min(words / 3, 25)));

  // 2. Specificity (0-100)
  let specificityScore = 40;
  const hasNumbers    = /\b\d+\b/.test(trimmed);
  const hasExamples   = /\b(example|e\.g\.|for instance|such as)\b/i.test(trimmed);
  const hasConstraint = /\b(must|should|only|never|always|limit|max|min)\b/i.test(trimmed);
  const hasFormat     = /\b(format|output|json|list|table|markdown|bullet)\b/i.test(trimmed);
  const hasContext    = /\b(because|since|for|given that|in the context)\b/i.test(trimmed);
  if (hasNumbers)    { specificityScore += 15; }
  if (hasExamples)   { specificityScore += 10; }
  if (hasConstraint) { specificityScore += 10; }
  if (hasFormat)     { specificityScore += 15; }
  if (hasContext)    { specificityScore += 10; }
  if (!hasFormat) {
    issues.push('No output format specified');
    suggestions.push('Specify expected output format (e.g., "as a JSON array", "as bullet points", "in a table")');
  }
  if (!hasContext) {
    suggestions.push('Add context about why you need this (helps AI tailor the response)');
  }
  specificityScore = Math.min(100, Math.max(0, specificityScore));

  // 3. Structure (0-100)
  let structureScore = 30;
  const hasSections   = /^#{1,3}\s/m.test(trimmed);
  const hasBullets    = /^[-*•]\s/m.test(trimmed);
  const hasNumbered   = /^\d+\.\s/m.test(trimmed);
  const hasRolePrefix = /\b(you are|act as|as a)\b/i.test(trimmed);
  if (hasSections)   { structureScore += 25; }
  if (hasBullets || hasNumbered) { structureScore += 20; }
  if (hasRolePrefix) { structureScore += 15; }
  if (sentences >= 3) { structureScore += 10; }
  if (!hasRolePrefix) {
    suggestions.push('Add a role definition ("You are an expert in X...") for better context');
  }
  structureScore = Math.min(100, Math.max(0, structureScore));

  // 4. Actionability (0-100)
  let actionabilityScore = 50;
  const actionVerbs = /\b(write|create|generate|analyze|explain|list|compare|summarize|build|design|review|translate|convert|extract|optimize|fix|debug|find|identify|recommend)\b/i.test(trimmed);
  if (actionVerbs) {
    actionabilityScore += 25;
  } else {
    issues.push('No clear action verb found');
    suggestions.push('Start with a strong action verb (write, create, analyze, explain, list, etc.)');
    actionabilityScore -= 20;
  }
  if (/\?$/.test(trimmed.trim())) { actionabilityScore += 5; }
  actionabilityScore = Math.min(100, Math.max(0, actionabilityScore));

  // 5. Constraints score (0-100)
  let constraintsScore = 20;
  const constraintCount = (trimmed.match(/\b(must|should|only|never|always|don't|do not|avoid|limit|max|min|no more than|at least)\b/gi) || []).length;
  constraintsScore += Math.min(constraintCount * 15, 60);
  if (!hasConstraint) {
    suggestions.push('Add constraints to scope the response (e.g., "in under 200 words", "using only built-in functions")');
  }
  constraintsScore = Math.min(100, Math.max(0, constraintsScore));

  // Overall score (weighted average)
  const overallScore = Math.round(
    clarityScore * 0.25 +
    specificityScore * 0.25 +
    structureScore * 0.20 +
    actionabilityScore * 0.20 +
    constraintsScore * 0.10
  );

  // Grade
  const grade = overallScore >= 85 ? 'A' : overallScore >= 70 ? 'B' : overallScore >= 55 ? 'C' : overallScore >= 40 ? 'D' : 'F';

  return {
    overall_score:        overallScore,
    grade,
    dimension_scores: {
      clarity:        clarityScore,
      specificity:    specificityScore,
      structure:      structureScore,
      actionability:  actionabilityScore,
      constraints:    constraintsScore,
    },
    statistics: {
      word_count:      words,
      sentence_count:  sentences,
      avg_words_per_sentence: sentences > 0 ? Math.round(words / sentences) : words,
    },
    issues:       issues.length > 0 ? issues : ['No major issues detected'],
    suggestions:  suggestions.length > 0 ? suggestions : ['Prompt is well-formed'],
    verdict:      overallScore >= 70
      ? 'This prompt is well-crafted and should produce good AI responses.'
      : overallScore >= 50
      ? 'This prompt is usable but has room for improvement. Apply the suggestions above.'
      : 'This prompt needs significant improvement. Consider using enhance_prompt to restructure it.',
  };
}

// ---------------------------------------------------------------------------
// Format conversion logic
// ---------------------------------------------------------------------------
function convertPromptFormat(prompt, fromFormat, toFormat) {
  if (fromFormat === toFormat) {
    return { converted: prompt, changes: 'No conversion needed (same format)' };
  }

  // Step 1: Parse to intermediate plain text with sections
  let plainText = prompt;
  const sections = {};

  if (fromFormat === 'xml') {
    // Strip XML tags, extract content
    plainText = prompt
      .replace(/<([a-z_]+)>([\s\S]*?)<\/\1>/gi, (_, tag, content) => {
        sections[tag] = content.trim();
        return content.trim();
      })
      .replace(/<[^>]+>/g, '')
      .trim();
  } else if (fromFormat === 'markdown') {
    // Extract headers and content
    const lines = prompt.split('\n');
    let currentSection = 'content';
    lines.forEach(line => {
      const headerMatch = line.match(/^#{1,3}\s+(.+)/);
      if (headerMatch) {
        currentSection = headerMatch[1].toLowerCase().replace(/\s+/g, '_');
        sections[currentSection] = '';
      } else if (sections[currentSection] !== undefined) {
        sections[currentSection] += (sections[currentSection] ? '\n' : '') + line;
      }
    });
    plainText = prompt.replace(/^#{1,3}\s+.+$/gm, '').trim();
  } else if (fromFormat === 'json') {
    try {
      const parsed = JSON.parse(prompt);
      Object.assign(sections, parsed);
      plainText = Object.values(parsed).join('\n');
    } catch {
      plainText = prompt;
    }
  }

  // Step 2: Render to target format
  let converted;
  let changes;

  if (toFormat === 'xml') {
    if (Object.keys(sections).length > 0) {
      converted = Object.entries(sections)
        .map(([k, v]) => `<${k}>\n${v.trim()}\n</${k}>`)
        .join('\n\n');
      changes = `Wrapped ${Object.keys(sections).length} sections in XML tags`;
    } else {
      converted = `<task>\n${plainText}\n</task>`;
      changes = 'Wrapped plain text in <task> XML tag';
    }
  } else if (toFormat === 'markdown') {
    if (Object.keys(sections).length > 0) {
      converted = Object.entries(sections)
        .map(([k, v]) => `## ${k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n${v.trim()}`)
        .join('\n\n');
      changes = `Converted ${Object.keys(sections).length} sections to Markdown headers`;
    } else {
      converted = `## Task\n${plainText}`;
      changes = 'Added Markdown header structure';
    }
  } else if (toFormat === 'json') {
    if (Object.keys(sections).length > 0) {
      converted = JSON.stringify(sections, null, 2);
      changes = `Converted ${Object.keys(sections).length} sections to JSON object`;
    } else {
      converted = JSON.stringify({ task: plainText, instructions: '', constraints: '', output_format: '' }, null, 2);
      changes = 'Converted to JSON structure with standard fields';
    }
  } else { // plain
    converted = plainText;
    changes   = `Stripped ${fromFormat} formatting to plain text`;
  }

  return {
    original_format: fromFormat,
    target_format:   toFormat,
    converted,
    changes,
    note: 'Review the converted prompt — some formatting nuances may need manual adjustment.',
  };
}

// ---------------------------------------------------------------------------
// System prompt generator
// ---------------------------------------------------------------------------
function generateSystemPrompt(role, task, constraints = [], tone = 'professional') {
  const toneDescriptions = {
    professional:  'formal, precise, and authoritative',
    friendly:      'warm, approachable, and encouraging',
    concise:       'brief, direct, and to-the-point',
    technical:     'technically precise, using domain-specific terminology',
    educational:   'clear, patient, and pedagogically structured',
    casual:        'relaxed, conversational, and relatable',
  };

  const toneDesc    = toneDescriptions[tone] || toneDescriptions['professional'];
  const constraintSection = constraints.length > 0
    ? `\n## Boundaries\n${constraints.map(c => `- ${c}`).join('\n')}`
    : '';

  const systemPrompt = `# Role
You are ${role} — an expert with deep, current knowledge and practical experience in your domain.

## Primary Objective
${task}

## Core Capabilities
- Provide accurate, well-reasoned responses grounded in established knowledge
- Break down complex problems into clear, actionable steps
- Adapt your explanation depth to the user's apparent level of expertise
- Proactively identify and address potential issues or edge cases

## Communication Style
Your tone is ${toneDesc}. You:
- Lead with the most important information
- Use concrete examples to illustrate abstract concepts
- Structure long responses with clear headers and bullet points
- Acknowledge limitations honestly when you reach the boundary of your knowledge${constraintSection}

## Output Quality Standards
- Verify logical consistency before responding
- Quantify claims where possible (avoid "many", "often", "sometimes")
- Cite your reasoning explicitly for non-obvious conclusions
- If a task is ambiguous, clarify before proceeding (ask at most one clarifying question)

## What You Will NOT Do
- Fabricate information or present guesses as facts
- Provide advice outside your defined domain without clearly flagging it
- Use unnecessary filler phrases ("Great question!", "Certainly!", "Of course!")
- Repeat the user's question back to them before answering`;

  return {
    role,
    task,
    tone,
    constraints,
    system_prompt:   systemPrompt,
    word_count:      systemPrompt.split(/\s+/).length,
    quality_notes: [
      'Includes role definition with expertise framing',
      'Defines primary objective clearly',
      'Sets communication style and tone',
      'Establishes quality standards',
      'Defines explicit boundaries',
    ],
    usage_tip: 'Paste this as the "system" message before your user conversation. Customize the capabilities and constraints sections for your specific use case.',
  };
}

// ---------------------------------------------------------------------------
// Rate limiting helpers (KV)
// ---------------------------------------------------------------------------
async function checkRateLimit(env, identifier, isPro) {
  if (!env.KV) return { allowed: true, remaining: isPro ? 100 : 10 };

  const limit     = isPro ? 100 : 10;
  const today     = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key       = `rl:prompt:${identifier}:${today}`;
  const raw       = await env.KV.get(key);
  const count     = raw ? parseInt(raw, 10) : 0;

  if (count >= limit) {
    return { allowed: false, remaining: 0, used: count, limit };
  }

  await env.KV.put(key, String(count + 1), { expirationTtl: 86400 });
  return { allowed: true, remaining: limit - count - 1, used: count + 1, limit };
}

// ---------------------------------------------------------------------------
// Pro API key validation (D1)
// ---------------------------------------------------------------------------
async function validateProKey(env, apiKey) {
  if (!env.DB || !apiKey) return false;
  try {
    const result = await env.DB.prepare(
      'SELECT key FROM api_keys WHERE key = ? AND (expires_at IS NULL OR expires_at > datetime("now"))'
    ).bind(apiKey).first();
    return result !== null;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// IP / identifier extraction
// ---------------------------------------------------------------------------
function getIdentifier(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    'unknown'
  );
}

// ---------------------------------------------------------------------------
// JSON-RPC helpers
// ---------------------------------------------------------------------------
function rpcSuccess(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message, data) {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } };
}

const PARSE_ERROR      = -32700;
const INVALID_REQUEST  = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS   = -32602;
const RATE_LIMITED     =  -32000;
const AUTH_ERROR       =  -32001;

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age':       '86400',
};

function corsResponse(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extra,
    },
  });
}

// ---------------------------------------------------------------------------
// Tool dispatcher
// ---------------------------------------------------------------------------
async function dispatchTool(toolName, params, env, request) {
  const identifier = getIdentifier(request);

  // ---- enhance_prompt (FREE) ----
  if (toolName === 'enhance_prompt') {
    if (!params?.prompt || typeof params.prompt !== 'string') {
      throw { code: INVALID_PARAMS, message: 'Missing required parameter: prompt (string)' };
    }
    const rl = await checkRateLimit(env, identifier, false);
    if (!rl.allowed) {
      throw {
        code: RATE_LIMITED,
        message: `Rate limit exceeded (10/day). Upgrade to Pro: $9 → 1000 calls/day\n\nPayPal: paypal.me/Yagami8095/9 | x402: $0.05/call USDC on Base`,
        data: {
          upgradeSignal: true,
          upgrade_url:   ECOSYSTEM.pro_page,
          paypal:        ECOSYSTEM.paypal,
          daily_limit:   10,
          resets_in:     'midnight UTC',
        },
      };
    }
    const result = enhancePrompt(params.prompt, params.style);
    return { ...result, _meta: { remaining_today: rl.remaining, tier: 'free' } };
  }

  // ---- analyze_prompt (FREE) ----
  if (toolName === 'analyze_prompt') {
    if (!params?.prompt || typeof params.prompt !== 'string') {
      throw { code: INVALID_PARAMS, message: 'Missing required parameter: prompt (string)' };
    }
    const rl = await checkRateLimit(env, identifier, false);
    if (!rl.allowed) {
      throw {
        code: RATE_LIMITED,
        message: `Rate limit exceeded (10/day). Upgrade to Pro: $9 → 1000 calls/day\n\nPayPal: paypal.me/Yagami8095/9 | x402: $0.05/call USDC on Base`,
        data: {
          upgradeSignal: true,
          upgrade_url:   ECOSYSTEM.pro_page,
          paypal:        ECOSYSTEM.paypal,
        },
      };
    }
    const result = analyzePrompt(params.prompt);
    return { ...result, _meta: { remaining_today: rl.remaining, tier: 'free' } };
  }

  // ---- convert_prompt_format (FREE) ----
  if (toolName === 'convert_prompt_format') {
    const validFormats = ['plain', 'xml', 'markdown', 'json'];
    if (!params?.prompt)       throw { code: INVALID_PARAMS, message: 'Missing required parameter: prompt' };
    if (!params?.from_format)  throw { code: INVALID_PARAMS, message: 'Missing required parameter: from_format' };
    if (!params?.to_format)    throw { code: INVALID_PARAMS, message: 'Missing required parameter: to_format' };
    if (!validFormats.includes(params.from_format)) throw { code: INVALID_PARAMS, message: `Invalid from_format. Must be one of: ${validFormats.join(', ')}` };
    if (!validFormats.includes(params.to_format))   throw { code: INVALID_PARAMS, message: `Invalid to_format. Must be one of: ${validFormats.join(', ')}` };

    const rl = await checkRateLimit(env, identifier, false);
    if (!rl.allowed) {
      throw {
        code: RATE_LIMITED,
        message: `Rate limit exceeded (10/day). Upgrade to Pro: $9 → 1000 calls/day\n\nPayPal: paypal.me/Yagami8095/9 | x402: $0.05/call USDC on Base`,
        data: { upgradeSignal: true, upgrade_url: ECOSYSTEM.pro_page, paypal: ECOSYSTEM.paypal },
      };
    }
    const result = convertPromptFormat(params.prompt, params.from_format, params.to_format);
    return { ...result, _meta: { remaining_today: rl.remaining, tier: 'free' } };
  }

  // ---- generate_system_prompt (FREE) ----
  if (toolName === 'generate_system_prompt') {
    if (!params?.role) throw { code: INVALID_PARAMS, message: 'Missing required parameter: role' };
    if (!params?.task) throw { code: INVALID_PARAMS, message: 'Missing required parameter: task' };

    const rl = await checkRateLimit(env, identifier, false);
    if (!rl.allowed) {
      throw {
        code: RATE_LIMITED,
        message: `Rate limit exceeded (10/day). Upgrade to Pro: $9 → 1000 calls/day\n\nPayPal: paypal.me/Yagami8095/9 | x402: $0.05/call USDC on Base`,
        data: { upgradeSignal: true, upgrade_url: ECOSYSTEM.pro_page, paypal: ECOSYSTEM.paypal },
      };
    }
    const result = generateSystemPrompt(
      params.role,
      params.task,
      params.constraints || [],
      params.tone || 'professional'
    );
    return { ...result, _meta: { remaining_today: rl.remaining, tier: 'free' } };
  }

  // ---- prompt_template_library (PRO) ----
  if (toolName === 'prompt_template_library') {
    if (!params?.category) throw { code: INVALID_PARAMS, message: 'Missing required parameter: category' };
    if (!params?.api_key)  throw {
      code: AUTH_ERROR,
      message: 'Pro API key required. Use purchase_pro_key to get access.',
      data: {
        upgradeSignal: true,
        upgrade_url:   ECOSYSTEM.pro_page,
        paypal:        ECOSYSTEM.paypal,
        price:         '$9 one-time',
      },
    };

    const validCategories = Object.keys(TEMPLATE_LIBRARY);
    if (!validCategories.includes(params.category)) {
      throw { code: INVALID_PARAMS, message: `Invalid category. Must be one of: ${validCategories.join(', ')}` };
    }

    const isValidKey = await validateProKey(env, params.api_key);
    if (!isValidKey) {
      throw {
        code: AUTH_ERROR,
        message: 'Invalid or expired Pro API key.',
        data: {
          upgradeSignal: true,
          upgrade_url:   ECOSYSTEM.pro_page,
          paypal:        ECOSYSTEM.paypal,
        },
      };
    }

    const rl = await checkRateLimit(env, `pro:${params.api_key}`, true);
    if (!rl.allowed) {
      throw {
        code: RATE_LIMITED,
        message: 'Rate limit exceeded (100/day Pro). Resets at midnight UTC. x402: $0.05/call USDC on Base for unlimited.',
        data: { upgradeSignal: true, daily_limit: 100, tier: 'pro' },
      };
    }

    const templates = TEMPLATE_LIBRARY[params.category];
    return {
      category:        params.category,
      template_count:  templates.length,
      templates,
      all_categories:  validCategories,
      total_templates: Object.values(TEMPLATE_LIBRARY).reduce((sum, arr) => sum + arr.length, 0),
      _meta: {
        remaining_today: rl.remaining,
        tier:            'pro',
        ecosystem:       ECOSYSTEM,
      },
    };
  }

  // ---- purchase_pro_key (FREE) ----
  if (toolName === 'purchase_pro_key') {
    const paymentMethod = params?.payment_method || 'PayPal';
    return {
      product:        'Prompt Enhancer MCP — Pro Access',
      price:          '$9 USD (one-time payment)',
      what_you_get: [
        'Unlock prompt_template_library (30+ professional templates across 6 categories)',
        'Increased rate limit: 100 requests/day (vs 10 free)',
        'Priority access to new templates as they are added',
        'Access to all future Pro tools in this MCP',
      ],
      how_to_purchase: {
        step_1: `Pay $9 via PayPal: ${ECOSYSTEM.paypal}`,
        step_2: 'Include your email address in the PayPal note',
        step_3: 'Your API key will be delivered to that email within 24 hours',
        step_4: 'Use the key as api_key parameter in Pro tools',
      },
      payment_links: {
        paypal:    ECOSYSTEM.paypal,
        store:     ECOSYSTEM.store,
        pro_page:  ECOSYSTEM.pro_page,
      },
      preferred_method: paymentMethod,
      note: 'One key = one user. Keys are non-transferable. No expiry.',
      ecosystem: {
        description: 'Part of the OpenClaw Intelligence MCP Ecosystem',
        other_tools: ECOSYSTEM,
      },
    };
  }

  throw { code: METHOD_NOT_FOUND, message: `Unknown tool: ${toolName}` };
}

// Dynamic Upgrade Prompt — progressive messaging based on usage
function addUpgradePrompt(response, rateLimitInfo) {
  if (!rateLimitInfo || !response?.result?.content?.[0]) return;
  if (response.result.isError) return;
  const c = response.result.content[0];
  if (c.type !== 'text' || !c.text) return;

  const used = rateLimitInfo.used || 0;
  const remaining = rateLimitInfo.remaining ?? 0;

  let msg = '';
  if (remaining <= 2 && remaining > 0) {
    msg = `\n\n⚡ ${remaining} call${remaining === 1 ? '' : 's'} left today. Pro: $9 → 1000/day → paypal.me/Yagami8095/9`;
  } else if (used <= 3) {
    msg = '\n\n— powered by OpenClaw (openclaw.dev)';
  }

  if (msg) c.text += msg;
}

// ---------------------------------------------------------------------------
// MCP method dispatcher
// ---------------------------------------------------------------------------
async function handleMCPMethod(method, params, id, env, request) {
  // initialize
  if (method === 'initialize') {
    return rpcSuccess(id, {
      protocolVersion: '2025-03-26',
      serverInfo:      SERVER_INFO,
      vendor:          VENDOR,
      capabilities: {
        tools:    { listChanged: false },
        logging:  {},
      },
    });
  }

  // tools/list
  if (method === 'tools/list') {
    return rpcSuccess(id, { tools: TOOLS });
  }

  // tools/call
  if (method === 'tools/call') {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};
    if (!toolName) return rpcError(id, INVALID_PARAMS, 'Missing tool name');

    try {
      const result = await dispatchTool(toolName, toolArgs, env, request);
      const rateLimitInfo = result?._meta
        ? { remaining: result._meta.remaining_today, used: (result._meta.tier === 'pro' ? 100 : 10) - (result._meta.remaining_today ?? 0) }
        : null;
      const response = rpcSuccess(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: false,
      });
      addUpgradePrompt(response, rateLimitInfo);
      return response;
    } catch (err) {
      if (err.code) {
        return rpcError(id, err.code, err.message, err.data);
      }
      return rpcError(id, -32000, err.message || 'Internal tool error');
    }
  }

  // ping
  if (method === 'ping') {
    return rpcSuccess(id, { pong: true, ts: Date.now() });
  }

  return rpcError(id, METHOD_NOT_FOUND, `Method not found: ${method}`);
}

// ---------------------------------------------------------------------------
// Landing page HTML
// ---------------------------------------------------------------------------
function landingPageHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prompt Enhancer MCP — OpenClaw Intelligence</title>
  <meta name="description" content="Free MCP server for prompt optimization, rewriting, scoring, and multilingual enhancement. Improve AI prompt quality automatically for Claude, GPT, and other LLMs.">
  <meta name="keywords" content="prompt engineering, prompt optimizer, AI prompts, MCP server, prompt scoring, LLM tools">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://prompt-enhancer-mcp.yagami8095.workers.dev">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Prompt Enhancer MCP Server - Optimize & Score AI Prompts | OpenClaw">
  <meta property="og:description" content="Free MCP server for prompt optimization, rewriting, scoring, and multilingual enhancement. Improve AI prompt quality automatically for Claude, GPT, and other LLMs.">
  <meta property="og:url" content="https://prompt-enhancer-mcp.yagami8095.workers.dev">
  <meta property="og:site_name" content="OpenClaw Intelligence">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Prompt Enhancer MCP Server - Optimize & Score AI Prompts | OpenClaw">
  <meta name="twitter:description" content="Free MCP server for prompt optimization, rewriting, scoring, and multilingual enhancement. Improve AI prompt quality automatically for Claude, GPT, and other LLMs.">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a0a00 0%, #2d1500 40%, #1a0a00 100%);
      min-height: 100vh;
      color: #f5e0b0;
    }
    .hero {
      text-align: center;
      padding: 72px 24px 48px;
      background: radial-gradient(ellipse at 50% 0%, rgba(251,146,60,0.18) 0%, transparent 70%);
    }
    .badge {
      display: inline-block;
      background: linear-gradient(90deg, #f97316, #fbbf24);
      color: #1a0a00;
      font-weight: 700;
      font-size: 12px;
      padding: 4px 14px;
      border-radius: 20px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    h1 {
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 800;
      background: linear-gradient(90deg, #fb923c, #fbbf24, #fde68a);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.15;
      margin-bottom: 16px;
    }
    .tagline {
      font-size: 1.15rem;
      color: #fcd98a;
      opacity: 0.85;
      max-width: 560px;
      margin: 0 auto 36px;
      line-height: 1.6;
    }
    .cta-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
    .btn {
      display: inline-block;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(251,146,60,0.4); }
    .btn-primary {
      background: linear-gradient(90deg, #f97316, #fbbf24);
      color: #1a0a00;
    }
    .btn-outline {
      border: 2px solid #f97316;
      color: #fb923c;
      background: transparent;
    }
    .endpoint-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(251,146,60,0.10);
      border: 1px solid rgba(251,146,60,0.25);
      border-radius: 6px;
      padding: 8px 16px;
      font-family: monospace;
      font-size: 13px;
      color: #fbbf24;
      margin-top: 28px;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
    section { max-width: 1080px; margin: 0 auto; padding: 0 24px 64px; }
    h2 { font-size: 1.6rem; font-weight: 700; color: #fbbf24; margin-bottom: 24px; text-align: center; }
    .tools-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .tool-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(251,146,60,0.15);
      border-radius: 12px;
      padding: 24px;
      transition: border-color 0.2s, background 0.2s;
    }
    .tool-card:hover {
      border-color: rgba(251,146,60,0.4);
      background: rgba(255,255,255,0.07);
    }
    .tool-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .tool-name { font-weight: 700; font-size: 15px; color: #fde68a; font-family: monospace; }
    .tier-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .tier-free { background: rgba(34,197,94,0.2); color: #86efac; border: 1px solid rgba(34,197,94,0.3); }
    .tier-pro  { background: rgba(251,191,36,0.2); color: #fde68a; border: 1px solid rgba(251,191,36,0.3); }
    .tool-desc { color: #d4a574; font-size: 14px; line-height: 1.5; }
    .pricing-box {
      background: linear-gradient(135deg, rgba(249,115,22,0.12), rgba(251,191,36,0.08));
      border: 1px solid rgba(251,146,60,0.30);
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 480px;
      margin: 0 auto;
    }
    .price { font-size: 3.5rem; font-weight: 900; color: #fbbf24; line-height: 1; }
    .price-sub { color: #d4a574; margin-bottom: 20px; font-size: 14px; }
    .features-list { list-style: none; text-align: left; margin-bottom: 28px; }
    .features-list li { padding: 7px 0; color: #fde68a; font-size: 14px; }
    .features-list li::before { content: "✓ "; color: #22c55e; font-weight: 700; }
    .ecosystem-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .eco-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(251,146,60,0.12);
      border-radius: 10px;
      padding: 16px;
    }
    .eco-name { font-weight: 700; font-size: 13px; color: #fbbf24; margin-bottom: 4px; }
    .eco-url  { font-size: 11px; color: #a37448; font-family: monospace; word-break: break-all; }
    footer {
      text-align: center;
      padding: 32px;
      color: #6b4a2a;
      font-size: 13px;
      border-top: 1px solid rgba(251,146,60,0.08);
    }
  </style>

  <script type="application/ld+json">
  {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Prompt Enhancer MCP Server",
  "description": "Free MCP server for prompt optimization, rewriting, scoring, and multilingual enhancement. Improve AI prompt quality automatically for Claude, GPT, and other LLMs.",
  "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev",
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
  <\/script>
</head>
<body>
  <div class="hero">
    <div class="badge">OpenClaw Intelligence</div>
    <h1>Prompt Enhancer MCP</h1>
    <p class="tagline">The meta-AI tool for AI agents. Enhance, analyze, convert, and generate prompts — programmatically, at scale.</p>
    <div class="cta-row">
      <a href="/mcp" class="btn btn-primary">Connect via MCP</a>
      <a href="${ECOSYSTEM.pro_page}" class="btn btn-outline">Get Pro — $9</a>
    </div>
    <div class="endpoint-chip">
      <span class="dot"></span>
      <span>MCP Endpoint: /mcp</span>
    </div>
  </div>

  <section>
    <h2>6 Powerful Tools</h2>
    <div class="tools-grid">
      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-name">enhance_prompt</span>
          <span class="tier-badge tier-free">FREE</span>
        </div>
        <p class="tool-desc">Restructure any prompt with role definition, clear task framing, output format, and quality constraints. 4 styles: concise, detailed, structured, creative.</p>
      </div>
      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-name">analyze_prompt</span>
          <span class="tier-badge tier-free">FREE</span>
        </div>
        <p class="tool-desc">Score your prompt across 5 dimensions: clarity, specificity, structure, actionability, constraints. Get a grade (A–F) and targeted improvement suggestions.</p>
      </div>
      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-name">convert_prompt_format</span>
          <span class="tier-badge tier-free">FREE</span>
        </div>
        <p class="tool-desc">Convert between plain text, XML tags, Markdown headers, and JSON structured format. Preserves sections and semantic meaning.</p>
      </div>
      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-name">generate_system_prompt</span>
          <span class="tier-badge tier-free">FREE</span>
        </div>
        <p class="tool-desc">Generate a production-quality system prompt for any role and task. Includes role definition, capabilities, communication style, quality standards, and boundaries.</p>
      </div>
      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-name">prompt_template_library</span>
          <span class="tier-badge tier-pro">PRO</span>
        </div>
        <p class="tool-desc">Browse 30+ curated, battle-tested prompt templates across 6 categories: coding, analysis, writing, translation, debugging, data-extraction.</p>
      </div>
      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-name">purchase_pro_key</span>
          <span class="tier-badge tier-free">FREE</span>
        </div>
        <p class="tool-desc">Get instructions to purchase a Pro API key. One-time $9 payment unlocks template library and 100 req/day rate limit.</p>
      </div>
    </div>
  </section>

  <section>
    <h2>Upgrade to Pro</h2>
    <div class="pricing-box">
      <div class="price">$9</div>
      <div class="price-sub">One-time payment — no subscription</div>
      <ul class="features-list">
        <li>prompt_template_library (30+ templates)</li>
        <li>100 requests/day (vs 10 free)</li>
        <li>All future Pro tools in this MCP</li>
        <li>Templates across 6 professional categories</li>
        <li>New templates added regularly</li>
      </ul>
      <a href="${ECOSYSTEM.paypal}" class="btn btn-primary">Buy via PayPal →</a>
    </div>
  </section>

  <section>
    <h2>OpenClaw MCP Ecosystem</h2>
    <div class="ecosystem-grid">
      <div class="eco-card"><div class="eco-name">Prompt Enhancer</div><div class="eco-url">/mcp</div></div>
      <div class="eco-card"><div class="eco-name">JSON Toolkit</div><div class="eco-url">${ECOSYSTEM.json}</div></div>
      <div class="eco-card"><div class="eco-name">Regex Engine</div><div class="eco-url">${ECOSYSTEM.regex}</div></div>
      <div class="eco-card"><div class="eco-name">Color Palette</div><div class="eco-url">${ECOSYSTEM.color}</div></div>
      <div class="eco-card"><div class="eco-name">Timestamp Converter</div><div class="eco-url">${ECOSYSTEM.timestamp}</div></div>
      <div class="eco-card"><div class="eco-name">Intel MCP</div><div class="eco-url">${ECOSYSTEM.intel}</div></div>
      <div class="eco-card"><div class="eco-name">Fortune MCP</div><div class="eco-url">${ECOSYSTEM.fortune}</div></div>
      <div class="eco-card"><div class="eco-name">MoltBook Publisher</div><div class="eco-url">${ECOSYSTEM.moltbook}</div></div>
      <div class="eco-card"><div class="eco-name">AgentForge Compare</div><div class="eco-url">${ECOSYSTEM.agentforge}</div></div>
      <div class="eco-card"><div class="eco-name">Product Store</div><div class="eco-url">${ECOSYSTEM.store}</div></div>
    </div>
  </section>

  <footer>
    &copy; 2025 OpenClaw Intelligence &mdash; ${SERVER_INFO.name} v${SERVER_INFO.version} &mdash;
    <a href="/health" style="color:#a37448;">Health</a>
  </footer>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Edge Defense Layer
// ---------------------------------------------------------------------------

const HONEYPOT_PATHS = ['/admin', '/wp-login.php', '/.env', '/config.json', '/.git/config', '/wp-admin', '/phpinfo.php'];
const PAYLOAD_MAX_BYTES = 51200;

async function sha256Short(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getRequestFingerprint(request) {
  const ua = request.headers.get('User-Agent') || '';
  const lang = request.headers.get('Accept-Language') || '';
  const isSuspicious = (/^(curl|wget|python|httpie|go-http|java)/i.test(ua) && lang.length > 5);
  return { ua: ua.slice(0, 80), lang: lang.slice(0, 20), isSuspicious };
}

async function edgeDefense(request, env, serverPrefix) {
  const kv = env.KV;
  if (!kv) return { action: 'allow' };
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Short(ip + '-openclaw-defense');
  const today = new Date().toISOString().slice(0, 10);
  const defenseKey = `defense:${ipHash}:${today}`;
  const path = new URL(request.url).pathname;

  if (HONEYPOT_PATHS.includes(path.toLowerCase())) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      raw.score = Math.max(0, raw.score - 30);
      raw.hits++;
      raw.flags.push('honeypot:' + path);
      await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
    } catch {}
    return { action: 'honeypot', status: 404 };
  }

  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > PAYLOAD_MAX_BYTES) return { action: 'reject', reason: 'Payload too large', status: 413 };

  try {
    const raw = await kv.get(defenseKey, { type: 'json' });
    if (raw && raw.score < 10) return { action: 'block', reason: 'IP blocked', status: 403 };
    if (raw && raw.score < 30) return { action: 'throttle', delay: 200 };
  } catch {}

  const fp = getRequestFingerprint(request);
  if (fp.isSuspicious) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      if (!raw.flags.includes('suspicious-fp')) {
        raw.score = Math.max(0, raw.score - 10);
        raw.flags.push('suspicious-fp');
        await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
      }
    } catch {}
  }
  return { action: 'allow' };
}

function sanitizeInput(str, maxLen = 2000) {
  if (!str) return '';
  if (typeof str !== 'string') return String(str).slice(0, maxLen);
  return str.slice(0, maxLen).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '');
}

// ============================================================
// FinOps Circuit Breaker
// ============================================================

const FINOPS_DAILY_WARN = 50000;
const FINOPS_DAILY_SLOW = 80000;
const FINOPS_DAILY_STOP = 95000;

async function finopsTrack(env, serverName) {
  const kv = env.KV;
  if (!kv) return { ok: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `finops:${today}`;
  try {
    const raw = await kv.get(key, { type: 'json' }) || { total: 0, by: {} };
    raw.total++;
    raw.by[serverName] = (raw.by[serverName] || 0) + 1;
    kv.put(key, JSON.stringify(raw), { expirationTtl: 172800 });
    if (raw.total >= FINOPS_DAILY_STOP) return { ok: false, reason: 'Daily capacity reached. Try again tomorrow.', status: 503 };
    if (raw.total >= FINOPS_DAILY_SLOW) return { ok: true, delay: 500 };
    if (raw.total >= FINOPS_DAILY_WARN) return { ok: true, warn: true };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

// Attribution Tracking — ?ref= parameter
async function trackRef(request, env, serverName) {
  const kv = env.KV;
  if (!kv) return;
  const ref = new URL(request.url).searchParams.get('ref');
  if (!ref) return;
  const source = ref.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!source) return;
  const today = new Date().toISOString().slice(0, 10);
  const key = `ref:${source}:${serverName}:${today}`;
  try {
    const count = parseInt(await kv.get(key) || '0', 10);
    await kv.put(key, String(count + 1), { expirationTtl: 2592000 }); // 30 days
  } catch {}
}

// ---------------------------------------------------------------------------
// Main fetch handler
// ---------------------------------------------------------------------------
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const method = request.method.toUpperCase();

    // ---- CORS preflight ----
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ---- Edge Defense ----
    const defense = await edgeDefense(request, env, 'prompt');
    if (defense.action === 'honeypot') return new Response('Not Found', { status: 404 });
    if (defense.action === 'reject' || defense.action === 'block') return corsResponse(JSON.stringify({ error: defense.reason }), defense.status);
    if (defense.action === 'throttle' && defense.delay) await new Promise(r => setTimeout(r, defense.delay));

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'prompt-enhancer');
    if (!finops.ok) return corsResponse(JSON.stringify({ error: finops.reason }), 503);
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));
    await trackRef(request, env, 'prompt-enhancer');

    // ---- Health check ----
    if (url.pathname === '/health') {
      return corsResponse(JSON.stringify({
        status:  'ok',
        service: `${VENDOR} — ${SERVER_INFO.name}`,
        version: SERVER_INFO.version,
        ts:      new Date().toISOString(),
        tools:   TOOLS.length,
        endpoints: {
          mcp:     '/mcp',
          health:  '/health',
          landing: '/',
        },
        ecosystem: ECOSYSTEM,
      }));
    }

    // ---- Landing page ----
    if (url.pathname === '/' && method === 'GET') {
      return new Response(landingPageHTML(), {
        status: 200,
        headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS_HEADERS },
      });
    }

    // ---- MCP endpoint ----
    if (url.pathname === '/mcp') {
      if (method === 'GET') {
        // SSE or capability probe
        return corsResponse(JSON.stringify({
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2025-03-26',
            serverInfo:      SERVER_INFO,
            vendor:          VENDOR,
            capabilities:    { tools: { listChanged: false } },
            usage:           'POST /mcp with JSON-RPC 2.0 body',
            docs:            '/',
          },
        }));
      }

      if (method !== 'POST') {
        return corsResponse(JSON.stringify(rpcError(null, INVALID_REQUEST, 'Only POST is accepted at /mcp')), 405);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return corsResponse(JSON.stringify(rpcError(null, PARSE_ERROR, 'Invalid JSON')), 400);
      }

      // Batch support
      if (Array.isArray(body)) {
        const responses = await Promise.all(
          body.map(item => {
            if (typeof item !== 'object' || item === null || item.jsonrpc !== '2.0') {
              return rpcError(item?.id ?? null, INVALID_REQUEST, 'Invalid JSON-RPC 2.0 request');
            }
            return handleMCPMethod(item.method, item.params, item.id ?? null, env, request);
          })
        );
        return corsResponse(JSON.stringify(responses));
      }

      // Single request
      if (typeof body !== 'object' || body === null || body.jsonrpc !== '2.0') {
        return corsResponse(JSON.stringify(rpcError(null, INVALID_REQUEST, 'Invalid JSON-RPC 2.0 request')), 400);
      }

      const response = await handleMCPMethod(body.method, body.params, body.id ?? null, env, request);
      return corsResponse(JSON.stringify(response));
    }

    // ---- 404 ----
    return corsResponse(JSON.stringify({
      error:     'Not Found',
      endpoints: ['/', '/mcp', '/health'],
    }), 404);
  },
};
