import { json } from '@sveltejs/kit';
import { drizzle } from 'drizzle-orm/d1';
import { heartbeats } from '../../../../../../packages/db/src/schema';
import { desc, eq, and, gte } from 'drizzle-orm';

export const GET = async ({ url, platform }) => {
    if (!platform?.env?.DB) return json([]);

    const id = url.searchParams.get('id');
    if (!id) return json([]);

    const db = drizzle(platform.env.DB);

    const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

    const history = await db.select({
        latency: heartbeats.latency,
        status: heartbeats.status,
        timestamp: heartbeats.timestamp
    })
        .from(heartbeats)
        .where(
            and(
                eq(heartbeats.monitorId, id),
                gte(heartbeats.timestamp, oneDayAgo)
            )
        )
        .orderBy(desc(heartbeats.timestamp))
        .all();

    return json(history.reverse());
};