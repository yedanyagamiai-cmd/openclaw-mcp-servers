#!/usr/bin/env python3
"""
YEDAN Cloud Army - Fleet API Deployment Script
Deploys all 6 fleet workers via Cloudflare API (no wrangler needed)

Usage:
  python deploy-fleet-api.py --token YOUR_CF_API_TOKEN
  python deploy-fleet-api.py --token YOUR_CF_API_TOKEN --only orchestrator
"""
import json
import sys
import os
import urllib.request
import urllib.error
import argparse
from pathlib import Path

ACCOUNT_ID = "9c7d295713f70a863bee478b1a658516"
SHARED_KV_ID = "412eb1678043499eb34f0e7f211176b9"
ARMY_KV_ID = "51826cd6550a40e79a61d462b084a1c8"
ARMY_DB_ID = "48fa9025-84ba-448a-9993-1d88e37f0a5c"

FLEET = [
    {
        "name": "yedan-health-commander",
        "cron": "*/3 * * * *",
        "bindings": [
            {"type": "kv_namespace", "name": "KV", "namespace_id": SHARED_KV_ID},
            {"type": "kv_namespace", "name": "ARMY_KV", "namespace_id": ARMY_KV_ID},
            {"type": "d1", "name": "ARMY_DB", "id": ARMY_DB_ID},
            {"type": "plain_text", "name": "BUNSHIN_URL", "text": "https://openclaw-mcp-servers.onrender.com"},
        ]
    },
    {
        "name": "yedan-revenue-sentinel",
        "cron": "*/10 * * * *",
        "bindings": [
            {"type": "kv_namespace", "name": "KV", "namespace_id": SHARED_KV_ID},
            {"type": "kv_namespace", "name": "ARMY_KV", "namespace_id": ARMY_KV_ID},
            {"type": "d1", "name": "ARMY_DB", "id": ARMY_DB_ID},
            {"type": "plain_text", "name": "BUNSHIN_URL", "text": "https://openclaw-mcp-servers.onrender.com"},
        ]
    },
    {
        "name": "yedan-intel-ops",
        "cron": "0 */1 * * *",
        "bindings": [
            {"type": "kv_namespace", "name": "KV", "namespace_id": SHARED_KV_ID},
            {"type": "kv_namespace", "name": "ARMY_KV", "namespace_id": ARMY_KV_ID},
            {"type": "d1", "name": "ARMY_DB", "id": ARMY_DB_ID},
            {"type": "plain_text", "name": "BUNSHIN_URL", "text": "https://openclaw-mcp-servers.onrender.com"},
        ]
    },
    {
        "name": "yedan-content-engine",
        "cron": "*/30 * * * *",
        "bindings": [
            {"type": "kv_namespace", "name": "KV", "namespace_id": SHARED_KV_ID},
            {"type": "kv_namespace", "name": "ARMY_KV", "namespace_id": ARMY_KV_ID},
            {"type": "d1", "name": "ARMY_DB", "id": ARMY_DB_ID},
            {"type": "plain_text", "name": "BUNSHIN_URL", "text": "https://openclaw-mcp-servers.onrender.com"},
            # Workers AI binding added via API metadata
        ]
    },
    {
        "name": "yedan-cloud-executor",
        "cron": "*/5 * * * *",
        "bindings": [
            {"type": "kv_namespace", "name": "KV", "namespace_id": SHARED_KV_ID},
            {"type": "plain_text", "name": "BUNSHIN_URL", "text": "https://openclaw-mcp-servers.onrender.com"},
            {"type": "plain_text", "name": "EXECUTOR_NAME", "text": "CloudBrain2"},
            {"type": "plain_text", "name": "EXECUTOR_VERSION", "text": "1.0.0"},
        ]
    },
    {
        "name": "yedan-orchestrator",
        "cron": "*/2 * * * *",
        "bindings": [
            {"type": "kv_namespace", "name": "KV", "namespace_id": SHARED_KV_ID},
            {"type": "kv_namespace", "name": "ARMY_KV", "namespace_id": ARMY_KV_ID},
            {"type": "d1", "name": "ARMY_DB", "id": ARMY_DB_ID},
            {"type": "plain_text", "name": "BUNSHIN_URL", "text": "https://openclaw-mcp-servers.onrender.com"},
            {"type": "plain_text", "name": "FLEET_VERSION", "text": "1.0.0"},
        ]
    },
]


def deploy_worker(worker, token, base_dir):
    name = worker["name"]
    worker_dir = base_dir / name
    worker_file = worker_dir / "worker.js"

    print(f"\n{'='*50}")
    print(f"  Deploying: {name}")
    print(f"{'='*50}")

    if not worker_file.exists():
        print(f"  ERROR: {worker_file} not found!")
        return False

    code = worker_file.read_text(encoding="utf-8")
    print(f"  Code: {len(code)} bytes")

    # Build multipart body
    boundary = f"----FleetDeploy-{name}"

    # Build bindings for metadata
    api_bindings = []
    for b in worker["bindings"]:
        if b["type"] == "kv_namespace":
            api_bindings.append({"type": "kv_namespace", "name": b["name"], "namespace_id": b["namespace_id"]})
        elif b["type"] == "d1":
            api_bindings.append({"type": "d1", "name": b["name"], "id": b["id"]})
        elif b["type"] == "plain_text":
            api_bindings.append({"type": "plain_text", "name": b["name"], "text": b["text"]})

    # Add Workers AI binding for content-engine
    if name == "yedan-content-engine":
        api_bindings.append({"type": "ai", "name": "AI"})

    metadata = json.dumps({
        "main_module": "worker.js",
        "bindings": api_bindings,
        "compatibility_date": "2024-12-01"
    })

    parts = []
    parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"metadata\"; filename=\"metadata.json\"\r\nContent-Type: application/json\r\n\r\n{metadata}")
    parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"worker.js\"; filename=\"worker.js\"\r\nContent-Type: application/javascript+module\r\n\r\n{code}")
    parts.append(f"--{boundary}--")
    body = "\r\n".join(parts).encode("utf-8")

    # Upload worker
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/workers/scripts/{name}"
    req = urllib.request.Request(url, data=body, method="PUT")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        if result.get("success"):
            print(f"  Upload: SUCCESS")
        else:
            print(f"  Upload: {result}")
            return False
    except urllib.error.HTTPError as e:
        print(f"  Upload FAILED ({e.code}): {e.read().decode()[:300]}")
        return False

    # Set cron trigger
    print(f"  Setting cron: {worker['cron']}")
    cron_url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/workers/scripts/{name}/schedules"
    cron_data = json.dumps([{"cron": worker["cron"]}]).encode()
    req = urllib.request.Request(cron_url, data=cron_data, method="PUT")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")

    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        print(f"  Cron: {'SUCCESS' if result.get('success') else result}")
    except urllib.error.HTTPError as e:
        print(f"  Cron failed ({e.code}): {e.read().decode()[:200]}")

    # Enable workers.dev subdomain
    sub_url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/workers/scripts/{name}/subdomain"
    sub_data = json.dumps({"enabled": True}).encode()
    req = urllib.request.Request(sub_url, data=sub_data, method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")

    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        print(f"  Subdomain: {'enabled' if result.get('success') else result}")
    except urllib.error.HTTPError as e:
        print(f"  Subdomain ({e.code}): {e.read().decode()[:200]}")

    print(f"  URL: https://{name}.yagami8095.workers.dev/")
    return True


def main():
    parser = argparse.ArgumentParser(description="YEDAN Fleet Deployment")
    parser.add_argument("--token", required=True, help="Cloudflare API token")
    parser.add_argument("--only", help="Deploy only this worker (partial name match)")
    args = parser.parse_args()

    base_dir = Path(__file__).parent

    print("╔══════════════════════════════════════════════════╗")
    print("║       YEDAN CLOUD ARMY - FLEET DEPLOYMENT        ║")
    print("║      National-Level Infrastructure v1.0          ║")
    print("╚══════════════════════════════════════════════════╝")

    deployed = 0
    failed = 0

    for worker in FLEET:
        if args.only and args.only not in worker["name"]:
            continue

        if deploy_worker(worker, args.token, base_dir):
            deployed += 1
        else:
            failed += 1

    print(f"\n{'='*50}")
    print(f"  FLEET DEPLOYMENT COMPLETE")
    print(f"  Deployed: {deployed} | Failed: {failed} | Total: {deployed + failed}")
    print(f"{'='*50}")
    print(f"\n  Fleet Dashboard:")
    for w in FLEET:
        print(f"    https://{w['name']}.yagami8095.workers.dev/status")
    print(f"\n  Orchestrator: https://yedan-orchestrator.yagami8095.workers.dev/fleet")
    print(f"  Revenue:      https://yedan-orchestrator.yagami8095.workers.dev/revenue")
    print(f"  Health:       https://yedan-health-commander.yagami8095.workers.dev/status")

    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
