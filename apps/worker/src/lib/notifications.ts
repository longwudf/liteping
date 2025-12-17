import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { notifiers } from '../../../../packages/db/src/schema';

export interface NotificationPayload {
    title: string;
    description: string;
    status: 'UP' | 'DOWN';
}

export async function sendNotifications(
    db: ReturnType<typeof drizzle>,
    payload: NotificationPayload
) {
    // 1. Fetch all active notification channels
    const channels = await db.select().from(notifiers).where(eq(notifiers.active, true)).all();

    // 2. Dispatch notifications
    const tasks = channels.map(async (channel) => {
        try {
            const config = JSON.parse(channel.config);

            switch (channel.type) {
                case 'discord':
                    await sendDiscord(config.webhookUrl, payload);
                    break;
                case 'telegram':
                    await sendTelegram(config.token, config.chatId, payload);
                    break;
                case 'slack':
                    await sendSlack(config.webhookUrl, payload);
                    break;
                case 'webhook':
                    await sendCustomWebhook(config.webhookUrl, payload);
                    break;
                default:
                    console.warn(`Unknown notifier type: ${channel.type}`);
            }
        } catch (e) {
            console.error(`Failed to notify ${channel.name}:`, e);
        }
    });

    await Promise.allSettled(tasks);
}

// --- Channel Implementations ---

// 1. Discord
async function sendDiscord(url: string, payload: NotificationPayload) {
    const color = payload.status === 'DOWN' ? 15548997 : 5763719; // Red / Green
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'LitePing Bot',
            embeds: [
                {
                    title: payload.title,
                    description: payload.description,
                    color: color,
                    timestamp: new Date().toISOString(),
                },
            ],
        }),
    });
}

// 2. Telegram
async function sendTelegram(
    token: string,
    chatId: string,
    payload: NotificationPayload
) {
    const icon = payload.status === 'DOWN' ? '🚨' : '✅';
    const text = `*${icon} ${payload.title}*\n\n${payload.description}`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
        }),
    });
}

// 3. Slack
async function sendSlack(url: string, payload: NotificationPayload) {
    const color = payload.status === 'DOWN' ? '#ef4444' : '#22c55e';
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            attachments: [
                {
                    color: color,
                    title: payload.title,
                    text: payload.description,
                    ts: Math.floor(Date.now() / 1000),
                },
            ],
        }),
    });
}

// 4. Custom Webhook
async function sendCustomWebhook(
    url: string,
    payload: NotificationPayload
) {
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}
