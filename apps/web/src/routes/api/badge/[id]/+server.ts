import { drizzle } from 'drizzle-orm/d1';
import { monitors, heartbeats } from '../../../../../../../packages/db/src/schema';
import { eq, desc } from 'drizzle-orm';

// Cache strategy: Browser and CDN cache for 60 seconds
const CACHE_CONTROL = 'public, max-age=60, s-maxage=60';

export const GET = async ({ params, platform, url }) => {
  const id = params.id;

  // 1. Get custom label (e.g. ?label=MyAPI)
  const label = url.searchParams.get('label') || 'Status';

  // Default status (Unknown)
  let statusText = 'Unknown';
  let color = '#9ca3af'; // Grey

  // If no DB connection
  if (!platform?.env?.DB) {
    return makeSvg(label, 'No DB', '#9ca3af');
  }

  try {
    const db = drizzle(platform.env.DB);

    // 2. Check if monitor exists
    const monitor = await db.select().from(monitors).where(eq(monitors.id, id)).get();

    if (!monitor) {
      return makeSvg(label, 'Not Found', '#9ca3af');
    }

    if (!monitor.active) {
      return makeSvg(label, 'Paused', '#9ca3af');
    }

    // 3. Get last heartbeat
    const lastHeartbeat = await db.select()
      .from(heartbeats)
      .where(eq(heartbeats.monitorId, id))
      .orderBy(desc(heartbeats.timestamp))
      .limit(1)
      .get();

    // 4. Determine color and status
    if (!lastHeartbeat) {
      statusText = 'Pending';
      color = '#9ca3af'; // Grey
    } else {
      if (lastHeartbeat.status >= 200 && lastHeartbeat.status < 300) {
        statusText = 'UP';
        color = '#4c1'; // Green

        // If latency is high (>800ms), show yellow warning
        if (lastHeartbeat.latency > 800) {
          color = '#dfb317'; // Yellow
          statusText = 'Slow';
        }
      } else {
        statusText = 'DOWN';
        color = '#e05d44'; // Red
      }
    }

    return makeSvg(label, statusText, color);

  } catch (e) {
    return makeSvg(label, 'Error', '#e05d44');
  }
};

// --- SVG Generator (Minimalist, Shields.io style) ---
// We calculate SVG width by simple character width estimation, no canvas needed
function makeSvg(label: string, status: string, color: string) {
  // Estimate character width (Verdana 11px is approx 7px wide, plus padding)
  const labelWidth = Math.round(label.length * 7) + 20;
  const statusWidth = Math.round(status.length * 7) + 20;
  const totalWidth = labelWidth + statusWidth;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
      <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
      <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
      <path fill="${color}" d="M${labelWidth} 0h${statusWidth}v20H${labelWidth}z"/>
      <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
      <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
      <text x="${labelWidth / 2}" y="14">${label}</text>
      <text x="${labelWidth + statusWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${status}</text>
      <text x="${labelWidth + statusWidth / 2}" y="14">${status}</text>
    </g>
  </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': CACHE_CONTROL
    }
  });
}
