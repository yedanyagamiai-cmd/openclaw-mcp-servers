#!/usr/bin/env python3
"""Deploy all 6 OODA Fleet Workers to Cloudflare via REST API"""
import json, sys, os, requests, time

CF_ACCOUNT_ID = "9c7d295713f70a863bee478b1a658516"
CF_API_TOKEN = "GLpoOReB7dCUOMe-AHHXgtd-dNBJFUvWU4V7XGvY"
BASE = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/workers/scripts"
HEADERS = {"Authorization": f"Bearer {CF_API_TOKEN}"}

# Secrets to set on each worker (set via CF API after deploy)
SECRETS = {
    "TELEGRAM_BOT_TOKEN": os.environ.get("TELEGRAM_BOT_TOKEN", ""),
    "DEEPINFRA_API_KEY": os.environ.get("DEEPINFRA_API_KEY", ""),
}

WORKERS = [
    {
        "name": "yedan-orchestrator",
        "dir": "yedan-orchestrator",
        "crons": ["*/2 * * * *"],
        "bindings": [
            {"type": "kv_namespace", "name": "KV", "namespace_id": "412eb1678043499eb34f0e7f211176b9"},
            {"type": "kv_namespace", "name": "ARMY_KV", "namespace_id": "51826cd6550a40e79a61d462b084a1c8"},
            {"type": "d1", "name": "ARMY_DB", "id": "48fa9025-84ba-448a-9993-1d88e37f0a5c"},
        ],
        "vars": {"BUNSHIN_URL": "https://openclaw-mcp-servers.onrender.com", "FLEET_VERSION": "2.0.0"},
    },
    {
        "name": "yedan-health-commander",
        "dir": "yedan-health-commander",
        "crons": ["*/3 * * * *"],
        "bindings": [
            {"type": "kv_namespace", "name": "KV", "namespace_id": "412eb1678043499eb34f0e7f211176b9"},
            {"type": "kv_namespace", "name": "ARMY_KV", "namespace_id": "51826cd6550a40e79a61d462b084a1c8"},
            {"type": "d1", "name": "ARMY_DB", "id": "48fa9025-84ba-448a-9993-1d88e37f0a5c"},
        ],
        "vars": {"BUNSHIN_URL": "https://openclaw-mcp-servers.onrender.com"},
    },
    {
        "name": "yedan-revenue-sentinel",
        "dir": "yedan-revenue-sentinel",
        "crons": ["*/10 * * * *"],
        "bindings": [
            {"type": "kv_namespace", "name": "KV", "namespace_id": "412eb1678043499eb34f0e7f211176b9"},
            {"type": "kv_namespace", "name": "ARMY_KV", "namespace_id": "51826cd6550a40e79a61d462b084a1c8"},
            {"type": "d1", "name": "ARMY_DB", "id": "48fa9025-84ba-448a-9993-1d88e37f0a5c"},
        ],
        "vars": {"BUNSHIN_URL": "https://openclaw-mcp-servers.onrender.com"},
    },
    {
        "name": "yedan-cloud-executor",
        "dir": "yedan-cloud-executor",
        "crons": ["*/5 * * * *"],
        "bindings": [
            {"type": "kv_namespace", "name": "KV", "namespace_id": "412eb1678043499eb34f0e7f211176b9"},
        ],
        "vars": {"BUNSHIN_URL": "https://openclaw-mcp-servers.onrender.com", "EXECUTOR_VERSION": "1.0.0"},
    },
    {
        "name": "yedan-content-engine",
        "dir": "yedan-content-engine",
        "crons": ["*/30 * * * *"],
        "bindings": [
            {"type": "kv_namespace", "name": "KV", "namespace_id": "412eb1678043499eb34f0e7f211176b9"},
            {"type": "kv_namespace", "name": "ARMY_KV", "namespace_id": "51826cd6550a40e79a61d462b084a1c8"},
            {"type": "d1", "name": "ARMY_DB", "id": "48fa9025-84ba-448a-9993-1d88e37f0a5c"},
        ],
        "vars": {"BUNSHIN_URL": "https://openclaw-mcp-servers.onrender.com"},
        "ai": True,
    },
    {
        "name": "yedan-intel-ops",
        "dir": "yedan-intel-ops",
        "crons": ["*/15 * * * *"],
        "bindings": [
            {"type": "kv_namespace", "name": "KV", "namespace_id": "412eb1678043499eb34f0e7f211176b9"},
            {"type": "kv_namespace", "name": "ARMY_KV", "namespace_id": "51826cd6550a40e79a61d462b084a1c8"},
            {"type": "d1", "name": "ARMY_DB", "id": "48fa9025-84ba-448a-9993-1d88e37f0a5c"},
        ],
        "vars": {"BUNSHIN_URL": "https://openclaw-mcp-servers.onrender.com"},
    },
]


def deploy_worker(worker):
    name = worker["name"]
    script_dir = os.path.join(os.path.dirname(__file__), worker["dir"])
    worker_path = os.path.join(script_dir, "worker.js")

    if not os.path.exists(worker_path):
        print(f"  SKIP {name}: worker.js not found at {worker_path}")
        return False

    with open(worker_path, "r", encoding="utf-8") as f:
        code = f.read()

    # Build metadata
    bindings = []
    for b in worker.get("bindings", []):
        if b["type"] == "kv_namespace":
            bindings.append({"type": "kv_namespace", "name": b["name"], "namespace_id": b["namespace_id"]})
        elif b["type"] == "d1":
            bindings.append({"type": "d1", "name": b["name"], "id": b["id"]})

    # Add plain_text vars
    for k, v in worker.get("vars", {}).items():
        bindings.append({"type": "plain_text", "name": k, "text": v})

    # Add AI binding
    if worker.get("ai"):
        bindings.append({"type": "ai", "name": "AI"})

    metadata = {
        "main_module": "worker.js",
        "bindings": bindings,
        "compatibility_date": "2024-12-01",
    }

    # Multipart upload (ES module format)
    files = {
        "metadata": (None, json.dumps(metadata), "application/json"),
        "worker.js": ("worker.js", code, "application/javascript+module"),
    }

    url = f"{BASE}/{name}"
    print(f"  Deploying {name}...", end=" ", flush=True)
    resp = requests.put(url, headers=HEADERS, files=files)

    if resp.status_code in (200, 201):
        print(f"OK ({resp.status_code})")
    else:
        print(f"FAIL ({resp.status_code})")
        try:
            err = resp.json()
            print(f"    Error: {json.dumps(err.get('errors', []), indent=2)[:200]}")
        except:
            print(f"    Raw: {resp.text[:200]}")
        return False

    # Set cron triggers
    crons = worker.get("crons", [])
    if crons:
        cron_url = f"{url}/schedules"
        cron_body = [{"cron": c} for c in crons]
        r2 = requests.put(cron_url, headers={**HEADERS, "Content-Type": "application/json"}, json=cron_body)
        if r2.status_code == 200:
            print(f"    Cron: {crons}")
        else:
            print(f"    Cron FAIL: {r2.status_code}")

    return True


def set_secret(worker_name, key, value):
    if not value:
        return
    url = f"{BASE}/{worker_name}/settings"
    # Use the secrets endpoint
    secret_url = f"{BASE}/{worker_name}/secrets"
    resp = requests.put(
        secret_url,
        headers={**HEADERS, "Content-Type": "application/json"},
        json={"name": key, "text": value, "type": "secret_text"}
    )
    if resp.status_code == 200:
        print(f"    Secret {key}: SET")
    else:
        print(f"    Secret {key}: FAIL ({resp.status_code})")


def main():
    print("=" * 60)
    print("OODA Fleet Deployment — 6 Workers → Cloudflare")
    print("=" * 60)

    success = 0
    fail = 0

    for w in WORKERS:
        ok = deploy_worker(w)
        if ok:
            success += 1
            # Set secrets on workers that need them
            if w["name"] in ("yedan-orchestrator", "yedan-intel-ops"):
                for k, v in SECRETS.items():
                    if v:
                        set_secret(w["name"], k, v)
                        time.sleep(0.3)
        else:
            fail += 1
        time.sleep(0.5)

    print(f"\n{'=' * 60}")
    print(f"Results: {success} deployed, {fail} failed")
    print(f"{'=' * 60}")

    if fail > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
