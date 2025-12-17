import { drizzle } from 'drizzle-orm/d1';
import { settings } from '../../../../packages/db/src/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
    let siteSettings: Record<string, string> = {};

    if (platform?.env?.DB) {
        try {
            const db = drizzle(platform.env.DB);
            const allSettings = await db.select().from(settings).all();
            siteSettings = allSettings.reduce((acc, curr) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {} as Record<string, string>);
        } catch (e) {
            console.error("Failed to load settings:", e);
        }
    }

    return {
        lang: locals?.lang || 'en',
        settings: siteSettings
    };
};
