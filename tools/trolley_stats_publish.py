"""Publish TrolleyMap live payment stats to lucaintini.ai/trolley/stats.json ($1 Sprint, 4 Nov 2026).

Luca, 4 Nov 2026: "you need to build also a page that shows the live status of money made".
Reads the restricted Stripe key from Secrets Manager (stripe/api, never printed, never leaves this process),
counts completed, paid live Checkout Sessions of the four TrolleyMap Payment Links only (the old carpet
cleaning link is not counted), and writes public numbers only (no names, emails or ids) on the site box to
site/trolley/stats.json (untracked, see .gitignore). Same SSM publish path as tools/lab_stats_publish.py.

  python tools/trolley_stats_publish.py --dry-run             # print the public JSON only
  python tools/trolley_stats_publish.py                       # one publish
  pythonw tools/trolley_stats_publish.py --loop 30 --until 2026-11-05T00:00+08:00
"""
import argparse
import base64
import datetime as dt
import json
import subprocess
import sys
import time
import urllib.parse
import urllib.request

PROFILE = "appservice"
BOX = "i-04e71d42abaccd7a7"
BOX_REGION = "ap-southeast-2"
DEST = "/home/ubuntu/projects/lucaintini.ai/site/trolley/stats.json"
LINKS = {  # TrolleyMap Payment Links only (live, account acct_1UV33OFocaWAdQiX)
    "plink_1UY0ibFocaWAdQiXZk6cduFU": "backer",
    "plink_1UY0ieFocaWAdQiX3QXozXQg": "founding",
    "plink_1UY0ihFocaWAdQiXhk0NX3zm": "suburb",
    "plink_1UY0ijFocaWAdQiXgpcjPBmD": "pilot",
}
AWST = dt.timezone(dt.timedelta(hours=8))
NOWIN = 0x08000000 if sys.platform == "win32" else 0  # CREATE_NO_WINDOW: no console flashes


def aws(*args):
    return subprocess.run(["aws", *args, "--profile", PROFILE], capture_output=True, text=True, check=True,
                          creationflags=NOWIN).stdout


def stripe_key():
    raw = aws("secretsmanager", "get-secret-value", "--secret-id", "stripe/api", "--region", BOX_REGION,
              "--query", "SecretString", "--output", "text").strip()
    try:
        return json.loads(raw)["secret_key"]
    except (ValueError, KeyError, TypeError):
        return raw


def sessions(key, plink):
    auth = "Basic " + base64.b64encode((key + ":").encode()).decode()
    after = None
    while True:
        q = {"payment_link": plink, "status": "complete", "limit": 100}
        if after:
            q["starting_after"] = after
        req = urllib.request.Request("https://api.stripe.com/v1/checkout/sessions?" + urllib.parse.urlencode(q))
        req.add_header("Authorization", auth)
        with urllib.request.urlopen(req, timeout=20) as r:
            page = json.load(r)
        yield from page["data"]
        if not page.get("has_more") or not page["data"]:
            return
        after = page["data"][-1]["id"]


def build(key):
    paid = []
    for plink, tier in LINKS.items():
        for s in sessions(key, plink):
            if s.get("livemode") and s.get("payment_status") == "paid":
                paid.append((s["created"], int(s.get("amount_total") or 0), (s.get("currency") or "aud").upper(), tier))
    paid.sort(reverse=True)
    now = dt.datetime.now(dt.timezone.utc)
    tiers = {t: 0 for t in LINKS.values()}
    for p in paid:
        tiers[p[3]] += 1
    return {
        "updated_utc": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "updated_awst": now.astimezone(AWST).strftime("%Y-%m-%d %H:%M:%S AWST"),
        "updated_epoch": int(now.timestamp()),
        "backers": len(paid),
        "total_cents": sum(p[1] for p in paid if p[2] == "AUD"),
        "currency": "AUD",
        "by_tier": tiers,
        "latest": [{"amount_cents": p[1], "currency": p[2], "tier": p[3],
                    "time_awst": dt.datetime.fromtimestamp(p[0], AWST).strftime("%H:%M")} for p in paid[:10]],
        "note": "Completed live Stripe payments to the TrolleyMap Payment Links only. No personal data.",
    }


def publish(body):
    b64 = base64.b64encode(body.encode()).decode()
    cmd = (f"echo {b64} | base64 -d > {DEST}.tmp && chown ubuntu:ubuntu {DEST}.tmp "
           f"&& chmod 644 {DEST}.tmp && mv {DEST}.tmp {DEST} && wc -c {DEST}")
    return aws("ssm", "send-command", "--region", BOX_REGION, "--instance-ids", BOX,
               "--document-name", "AWS-RunShellScript", "--comment", "trolley stats",
               "--parameters", json.dumps({"commands": [cmd]}),
               "--query", "Command.CommandId", "--output", "text").strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--loop", type=int, default=0, help="seconds between publishes (0 = once)")
    ap.add_argument("--until", default="", help="ISO time to stop looping, e.g. 2026-11-05T00:00+08:00")
    a = ap.parse_args()
    stop = dt.datetime.fromisoformat(a.until).timestamp() if a.until else 0
    key = stripe_key()
    while True:
        try:
            body = json.dumps(build(key), indent=1)
            if a.dry_run:
                print(body)
                return 0
            print(dt.datetime.now(AWST).strftime("%H:%M:%S"), "sent", publish(body), flush=True)
        except Exception as e:  # keep the loop alive; never print the key
            print("error", type(e).__name__, str(e)[:200], flush=True)
        if not a.loop or (stop and time.time() >= stop):
            return 0
        time.sleep(a.loop)


if __name__ == "__main__":
    sys.exit(main())
