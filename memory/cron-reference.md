# Cron Schedule Reference (2026-03-01)

## Enabled (22 jobs)
| Job | Schedule | Purpose |
|-----|----------|---------|
| telegram-watchdog | */5m | Monitor Telegram bot |
| telegram-heartbeat | */30m | Telegram keep-alive |
| daily-changelog-check | 8:00 daily | Check OpenClaw updates |
| revenue-dashboard | 9:00 daily | Revenue metrics |
| reflect-iterate | 2:00 daily | Self-improvement |
| golem-memory-sync | 3:00 daily | Memory consolidation |
| intel-daily-scan | 6:00 daily | Intel collection |
| intel-full-collect | */6h | Full intel sweep |
| intel-weekly-report | Sun 10:00 | Weekly intel summary |
| browser-health-check | */3h | Browser CDP check |
| hourly-incremental-check | hourly | System health |
| weekly-config-validation | Mon 3:00 | Config audit |
| weekly-security-scan | Wed 2:00 | Security audit |
| skills-status-check | */6h | Skills monitoring |
| brain-body-sync | */4h | Alpha-Beta sync |
| daily-system-backup | 4:00 daily | System backup |
| monthly-cleanup | 1st 5:00 | Disk cleanup |
| system-optimizer | Sun 4:00 | System optimization |
| update-check | Mon 6:00 | Package updates |
| Yedan_Full_System_Report | Sun 8:00 | Full audit |
| reflect-iterate-2 | 14:00 daily | Afternoon reflection |
| reflect-iterate-3 | 20:00 daily | Evening reflection |

## Disabled (2 jobs)
| Job | Reason |
|-----|--------|
| moltbook-reply-hot | MoltBook DNS dead |
| autodownload-moltbook-content | MoltBook DNS dead |
