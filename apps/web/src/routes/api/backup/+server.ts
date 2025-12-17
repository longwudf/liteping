import { json } from '@sveltejs/kit';
import { drizzle } from 'drizzle-orm/d1';
import { monitors } from '../../../../../../packages/db/src/schema';

export const GET = async ({ platform }) => {
    if (!platform?.env?.DB) return json([]);

    const db = drizzle(platform.env.DB);
    const allData = await db.select().from(monitors).all();

    const filename = `liteping-backup-${new Date().toISOString().split('T')[0]}.json`;

    return new Response(JSON.stringify(allData, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}"`
        }
    });
};
