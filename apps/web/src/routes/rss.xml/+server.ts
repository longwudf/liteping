import { drizzle } from 'drizzle-orm/d1';
import { monitors, incidents, announcements } from '../../../../../packages/db/src/schema';
import { desc, eq } from 'drizzle-orm';

// 设置缓存：CDN 缓存 10 分钟，客户端缓存 10 分钟
const CACHE_CONTROL = 'public, max-age=600, s-maxage=600';

export const GET = async ({ platform, url }) => {
    const siteUrl = url.origin;
    const feedTitle = 'LitePing Status Updates';
    const feedDesc = 'Real-time service status updates, incidents, and maintenance announcements.';

    if (!platform?.env?.DB) {
        return new Response(renderXml(siteUrl, feedTitle, feedDesc, []), {
            headers: { 'Content-Type': 'application/xml' }
        });
    }

    try {
        const db = drizzle(platform.env.DB);

        const [allMonitors, allAnnouncements, recentIncidents] = await Promise.all([
            db.select().from(monitors).all(),
            db.select().from(announcements)
                .where(eq(announcements.active, true))
                .orderBy(desc(announcements.createdAt))
                .limit(20)
                .all(),
            db.select().from(incidents)
                .orderBy(desc(incidents.startedAt))
                .limit(20)
                .all()
        ]);

        const monitorMap = new Map(allMonitors.map((m) => [m.id, m.name]));

        const feedItems: any[] = [];

        allAnnouncements.forEach((a) => {
            feedItems.push({
                title: `📢 ${a.title}`,
                link: siteUrl,
                description: a.type ? `[${a.type.toUpperCase()}] ${a.title}` : a.title,
                pubDate: new Date(a.createdAt * 1000).toUTCString(),
                guid: `announcement-${a.id}`
            });
        });

        recentIncidents.forEach((i) => {
            const monitorName = monitorMap.get(i.monitorId) || 'Unknown Service';
            const isResolved = !!i.resolvedAt;
            const rawStatus = isResolved ? 'Resolved' : 'Ongoing';
            const statusTitle = isResolved ? '✅ Resolved' : '🔴 Outage Detected';

            feedItems.push({
                title: `${statusTitle}: ${monitorName}`,
                link: siteUrl,
                description: `Service: ${monitorName}\nStarted: ${new Date(i.startedAt * 1000).toLocaleString()}\nStatus: ${rawStatus}`,
                pubDate: new Date(i.startedAt * 1000).toUTCString(),
                guid: `incident-${i.id}`
            });
        });

        feedItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

        const xml = renderXml(siteUrl, feedTitle, feedDesc, feedItems);

        return new Response(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': CACHE_CONTROL
            }
        });
    } catch (e) {
        console.error(e);
        return new Response('Error generating RSS', { status: 500 });
    }
};

function renderXml(link: string, title: string, desc: string, items: any[]) {
    return `<?xml version="1.0" encoding="UTF-8" ?>
<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(title)}</title>
  <description>${escapeXml(desc)}</description>
  <link>${link}</link>
  <atom:link href="${link}/rss.xml" rel="self" type="application/rss+xml" />
  <language>en-us</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${items
            .map(
                (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <link>${item.link}</link>
      <guid isPermaLink="false">${item.guid}</guid>
      <pubDate>${item.pubDate}</pubDate>
    </item>
  `,
            )
            .join('')}
</channel>
</rss>`;
}

function escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '&':
                return '&amp;';
            case "'":
                return '&apos;';
            case '"':
                return '&quot;';
            default:
                return c;
        }
    });
}
