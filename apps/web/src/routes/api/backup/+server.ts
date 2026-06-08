import { json } from '@sveltejs/kit';
import { drizzle } from 'drizzle-orm/d1';
import { monitors } from '../../../../../../packages/db/src/schema';
import { isAdminAuthenticated } from '$lib/server/auth';

export const GET = async ({ platform, cookies }) => {
    if (!(await isAdminAuthenticated(cookies))) {
        return json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!platform?.env?.DB) return json([]);

    const db = drizzle(platform.env.DB);
    const allData = await db.select().from(monitors).all();

    const filename = `liteping-backup-${new Date().toISOString().split('T')[0]}.json`;

    return new Response(JSON.stringify(allData, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store'
        }
    });
};
