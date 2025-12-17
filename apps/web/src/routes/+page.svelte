<script lang="ts">
    import { slide } from "svelte/transition";
    import { format, isValid } from "date-fns";
    import Sparkline from "$lib/components/Sparkline.svelte";
    import BigSparkline from "$lib/components/BigSparkline.svelte";
    import { getLocationName } from "$lib/locations";
    import { t, toggleLocale, locale } from "$lib/i18n";
    import type { PageData } from "./$types";

    // Svelte 5 语法
    let { data }: { data: PageData } = $props();

    // 状态管理 (Svelte 5 语法)
    let expandedId: string | null = $state(null);
    function toggleExpand(id: string) {
        const nextId = expandedId === id ? null : id;
        expandedId = nextId;
        if (nextId) {
            loadHistory(nextId);
        }
    }

    let historyCache: Record<string, any[]> = $state({});
    let loadingState: Record<string, boolean> = $state({});

    async function loadHistory(id: string) {
        if (historyCache[id] || loadingState[id]) return;
        loadingState[id] = true;
        try {
            const res = await fetch(`/api/history?id=${id}`);
            if (res.ok) {
                historyCache[id] = await res.json();
            }
        } catch (e) {
            console.error(e);
        } finally {
            loadingState[id] = false;
        }
    }

    // 1. 安全的在线率计算
    function calculateUptime(heartbeats: any[]): string {
        if (
            !heartbeats ||
            !Array.isArray(heartbeats) ||
            heartbeats.length === 0
        )
            return "0.00%";
        const upCount = heartbeats.filter(
            (h) => h.status >= 200 && h.status < 300,
        ).length;
        return ((upCount / heartbeats.length) * 100).toFixed(2) + "%";
    }

    function getUptimeColor(uptimeStr: string): string {
        const uptime = parseFloat(uptimeStr);
        return uptime >= 99.9
            ? "text-green-500"
            : uptime >= 98
              ? "text-yellow-500"
              : "text-red-500";
    }

    // 2. 🛡️ 核心：超级健壮的数据分组函数 (任何坏数据都会被过滤)
    function groupDataSafely(list: any[], timeField: string) {
        if (!list || !Array.isArray(list)) return {};

        return list.reduce((groups: Record<string, any[]>, item: any) => {
            if (!item) return groups;

            const timestamp = item[timeField];
            if (!timestamp) return groups;

            try {
                const date = new Date(timestamp * 1000);
                if (isValid(date)) {
                    // 强制使用 ISO 格式作为 Key，防止中文混入 Key 导致渲染逻辑混乱
                    const key = format(date, "yyyy-MM-dd");
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(item);
                }
            } catch (e) {
                // 忽略坏数据
            }
            return groups;
        }, {});
    }

    // 按日期分组维护记录
    let maintenanceByDate = $derived.by(() => {
        const history = data?.maintenanceHistory || [];
        return history.reduce((groups: Record<string, any[]>, item) => {
            if (!item?.startTime) return groups;
            const dateKey = format(item.startTime * 1000, "yyyy-MM-dd");
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(item);
            return groups;
        }, {});
    });
    let incidentsByDate = $derived(
        groupDataSafely(data.incidents, "startedAt"),
    );

    // 3. 🛡️ 核心：日期显示格式化 (解决中英文日期问题)
    function formatDateHeader(dateKey: string, currentLocale: string) {
        if (!dateKey) return "";
        try {
            const date = new Date(dateKey); // dateKey 是 yyyy-MM-dd
            if (!isValid(date)) return dateKey;

            // 如果是中文或日文，返回: 2025年12月13日
            if (currentLocale === "zh" || currentLocale === "ja") {
                return format(date, "yyyy年MM月dd日");
            }
            // 英文返回: Dec 13, 2025
            return format(date, "MMM dd, yyyy");
        } catch (e) {
            return dateKey;
        }
    }

    // 4. 辅助：安全的时间格式化 (用于 HH:mm)
    function safeTime(ts: number, fmt: string = "HH:mm") {
        if (!ts) return "--:--";
        try {
            return format(ts * 1000, fmt);
        } catch {
            return "--:--";
        }
    }
</script>

<div class="min-h-screen bg-[#0a0a0a] text-white font-mono p-8">
    <div class="max-w-3xl mx-auto">
        {#if data.globalAnnouncements && data.globalAnnouncements.length > 0}
            <div class="mb-8 space-y-2">
                {#each data.globalAnnouncements as announcement}
                    <div
                        class="rounded-lg p-4 border flex items-start gap-3 shadow-lg
                        {announcement.type === 'alert'
                            ? 'bg-red-900/20 border-red-500/50 text-red-200'
                            : announcement.type === 'warning'
                              ? 'bg-yellow-900/20 border-yellow-500/50 text-yellow-200'
                              : 'bg-blue-900/20 border-blue-500/50 text-blue-200'}"
                    >
                        <div class="mt-0.5">
                            {#if announcement.type === "alert"}
                                <svg
                                    class="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    ></path>
                                </svg>
                            {:else if announcement.type === "warning"}
                                <svg
                                    class="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    ></path>
                                </svg>
                            {:else}
                                <svg
                                    class="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                                    ></path>
                                </svg>
                            {/if}
                        </div>

                        <div>
                            <h3 class="font-bold text-sm">
                                {announcement.title}
                            </h3>
                            {#if announcement.message}
                                <p class="text-xs opacity-80 mt-1">
                                    {announcement.message}
                                </p>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        <header
            class="mb-12 border-b border-neutral-800 pb-6 flex justify-between items-start"
        >
            <div>
                <h1
                    class="text-4xl font-bold text-green-500 mb-2 tracking-tighter"
                >
                    LitePing_
                </h1>
                <p class="text-gray-500 text-sm">
                    {$t.title}
                </p>
            </div>
        </header>

        <div class="flex justify-between items-end mb-8">
            <h2 class="text-2xl font-bold text-gray-200">
                {$t.sections.system_status}
            </h2>
        </div>

        <div class="space-y-4">
            {#each data.monitors as monitor}
                <div
                    class="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden transition-colors duration-300"
                    class:border-green-500={expandedId === monitor.id}
                >
                    <div
                        class="p-5 flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 transition-colors group"
                        onclick={() => toggleExpand(monitor.id)}
                        onkeydown={(e) =>
                            e.key === "Enter" && toggleExpand(monitor.id)}
                        tabindex="0"
                        role="button"
                    >
                        <div>
                            <div class="flex items-center gap-3 mb-1">
                                <a
                                    href={`/monitor/${monitor.id}`}
                                    onclick={(e) => e.stopPropagation()}
                                    class="font-bold text-lg text-gray-200 group-hover:text-white hover:text-green-400 transition-colors"
                                >
                                    {monitor.name}
                                </a>
                                <span
                                    class="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-gray-400 border border-neutral-700"
                                >
                                    {$t.labels[monitor.method.toLowerCase()] ||
                                        monitor.method}
                                </span>
                            </div>
                            <a
                                href={monitor.url}
                                target="_blank"
                                onclick={(e) => e.stopPropagation()}
                                class="text-xs text-gray-500 hover:text-green-400 transition-colors flex items-center gap-1"
                            >
                                {monitor.url} ↗
                            </a>
                        </div>

                        <div class="hidden sm:block w-32 mx-6">
                            {#if monitor.pulseline && monitor.pulseline.length > 0}
                                <Sparkline
                                    data={monitor.pulseline
                                        .slice(-30)
                                        .map((h: any) => h.latency)}
                                    width={128}
                                    height={32}
                                />
                                <div
                                    class="flex justify-between items-center mt-1 text-[10px] font-mono"
                                >
                                    <span
                                        class="text-gray-600 bg-neutral-800 px-1 rounded uppercase truncate max-w-[80px]"
                                    >
                                        {getLocationName(
                                            monitor.pulseline[
                                                monitor.pulseline.length - 1
                                            ].region,
                                        )}
                                    </span>

                                    <span class="text-gray-500">
                                        {monitor.pulseline[
                                            monitor.pulseline.length - 1
                                        ].latency}{$t.labels.ms}
                                    </span>
                                </div>
                            {:else}
                                <div
                                    class="text-[10px] text-gray-700 text-center"
                                >
                                    No Data
                                </div>
                            {/if}
                        </div>

                        <div
                            class="flex flex-col items-end gap-1 min-w-[100px]"
                        >
                            {#if monitor.uptimeStats && monitor.uptimeStats.length > 0}
                                {@const uptime = calculateUptime(
                                    monitor.uptimeStats,
                                )}
                                <div
                                    class="text-xs font-mono font-bold {getUptimeColor(
                                        uptime,
                                    )}"
                                    title="24h Uptime"
                                >
                                    {uptime}
                                </div>
                            {/if}

                            <div class="flex items-center gap-2">
                                {#if monitor.currentMaintenance}
                                    <div
                                        class="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-bold border border-yellow-500/20"
                                        title={monitor.currentMaintenance.title}
                                    >
                                        <svg
                                            class="w-3 h-3 animate-pulse"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            ><path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                                            ></path></svg
                                        >
                                        {$t.status.maintenance}
                                    </div>
                                {:else if monitor.pulseline && monitor.pulseline.length > 0 && monitor.pulseline[monitor.pulseline.length - 1].status >= 300}
                                    <div
                                        class="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20"
                                    >
                                        <span class="relative flex h-1.5 w-1.5">
                                            <span
                                                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                                            ></span>
                                            <span
                                                class="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"
                                            ></span>
                                        </span>
                                        {$t.status.down}
                                    </div>
                                {:else if monitor.pulseline && monitor.pulseline.length > 0}
                                    <div
                                        class="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20"
                                    >
                                        <span class="relative flex h-1.5 w-1.5">
                                            <span
                                                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
                                            ></span>
                                            <span
                                                class="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"
                                            ></span>
                                        </span>
                                        {$t.status.operational}
                                    </div>
                                {:else}
                                    <span class="text-gray-600 text-[10px]"
                                        >{$t.status.pending}</span
                                    >
                                {/if}

                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4 text-green-500 group-hover:text-green-400 transition-transform duration-300"
                                    class:rotate-180={expandedId === monitor.id}
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fill-rule="evenodd"
                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                        clip-rule="evenodd"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {#if expandedId === monitor.id}
                        <div
                            class="border-t border-neutral-800 bg-black/20"
                            transition:slide={{ duration: 300 }}
                        >
                            <div class="p-5">
                                <div
                                    class="mb-4 flex justify-between items-end"
                                >
                                    <div>
                                        <h4
                                            class="text-sm font-bold text-gray-200 mb-1"
                                        >
                                            {$t.sections.latency_trend}
                                        </h4>
                                        <p
                                            class="text-xs text-gray-500 font-mono"
                                        >
                                            {$t.sections.realtime_data}
                                        </p>
                                    </div>

                                    {#if historyCache[monitor.id] && historyCache[monitor.id].length > 0}
                                        <div
                                            class="text-xs text-gray-500 font-mono text-right flex items-center gap-4"
                                        >
                                            <a
                                                href={`/monitor/${monitor.id}`}
                                                class="flex items-center gap-1 text-green-500 hover:text-green-400 transition-colors border border-green-500/30 rounded px-2 py-0.5 bg-green-500/10"
                                                onclick={(e) => e.stopPropagation()}
                                            >
                                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                {$t.labels.view_details}
                                            </a>
                                            <div>
                                                {$t.labels.max}:
                                                <span class="text-gray-300"
                                                    >{Math.max(
                                                        ...historyCache[
                                                            monitor.id
                                                        ].map((d) => d.latency),
                                                    )}ms</span
                                                >
                                            </div>
                                            <div>
                                                {$t.labels.avg}:
                                                <span class="text-gray-300"
                                                    >{Math.round(
                                                        historyCache[
                                                            monitor.id
                                                        ].reduce(
                                                            (a, b) =>
                                                                a + b.latency,
                                                            0,
                                                        ) /
                                                            historyCache[
                                                                monitor.id
                                                            ].length,
                                                    )}ms</span
                                                >
                                            </div>
                                        </div>
                                    {/if}
                                </div>

                                <div
                                    class="h-[250px] w-full flex items-center justify-center"
                                >
                                    {#if loadingState[monitor.id]}
                                        <div
                                            class="flex flex-col items-center gap-2 text-green-500"
                                        >
                                            <svg
                                                class="animate-spin h-6 w-6"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    class="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    stroke-width="4"
                                                ></circle>
                                                <path
                                                    class="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            <span class="text-xs font-mono"
                                                >{$t.sections
                                                    .fetching_history}</span
                                            >
                                        </div>
                                    {:else if historyCache[monitor.id] && historyCache[monitor.id].length > 0}
                                        <BigSparkline
                                            data={historyCache[monitor.id]}
                                        />
                                    {:else}
                                        <div
                                            class="text-center text-gray-600 font-mono text-sm"
                                        >
                                            {$t.sections.no_data_24h}
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}

            {#if data.monitors.length === 0}
                <div
                    class="text-center border-2 border-dashed border-neutral-800 rounded-xl py-16"
                >
                    <p class="text-gray-500 mb-2">
                        {$t.sections.no_data_monitor}
                    </p>
                    <p class="text-xs text-gray-700">
                        {$t.sections.deploy_tip}
                    </p>
                </div>
            {/if}
        </div>

        <div class="my-12 border-t border-neutral-800"></div>

        <h2 class="text-2xl font-bold text-gray-200 mb-8">
            {$t.sections.scheduled_maintenance}
        </h2>

        <div class="space-y-10">
            {#each Object.entries(maintenanceByDate).sort((a, b) => b[0].localeCompare(a[0])) as [date, list]}
                <div>
                    <h3 class="text-lg font-bold text-gray-500 mb-4 ml-1">
                        {formatDateHeader(date, $locale)}
                    </h3>

                    <div class="space-y-4">
                        {#each list as item}
                            <div
                                class="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden flex relative"
                            >
                                <div class="w-1.5 bg-yellow-500/80"></div>

                                <div class="p-5 w-full">
                                    <div
                                        class="flex justify-between items-start"
                                    >
                                        <div>
                                            <h4
                                                class="font-bold text-gray-200 text-lg mb-1"
                                            >
                                                {item.title}
                                            </h4>
                                            <div
                                                class="text-sm text-gray-500 font-mono mt-2"
                                            >
                                                {format(
                                                    item.startTime * 1000,
                                                    "yyyy-MM-dd HH:mm",
                                                )} - {format(
                                                    item.endTime * 1000,
                                                    "yyyy-MM-dd HH:mm",
                                                )}
                                                <span class="mx-2">·</span>
                                                {$t.labels.duration}: {Math.ceil(
                                                    (item.endTime -
                                                        item.startTime) /
                                                        60,
                                                )}
                                                {$t.labels.mins}
                                            </div>
                                        </div>

                                        <div
                                            class="flex flex-col items-end gap-1"
                                        >
                                            {#if Date.now() / 1000 < item.startTime}
                                                <span
                                                    class="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-900/50"
                                                    >{$t.status.upcoming}</span
                                                >
                                            {:else if Date.now() / 1000 > item.endTime}
                                                <span
                                                    class="text-[10px] bg-neutral-800 text-gray-500 px-2 py-1 rounded border border-neutral-700"
                                                    >{$t.status.completed}</span
                                                >
                                            {:else}
                                                <span
                                                    class="text-[10px] bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded border border-yellow-900/50 animate-pulse"
                                                    >{$t.status.active}</span
                                                >
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}

            {#if Object.keys(maintenanceByDate).length === 0}
                <div class="text-center py-6 text-gray-600 text-sm">
                    {$t.sections.no_maintenance}
                </div>
            {/if}
        </div>

        <div class="my-12 border-t border-neutral-800"></div>

        <h2 class="text-2xl font-bold text-gray-200 mb-8">
            {$t.sections.past_incidents}
        </h2>

        <div class="space-y-10">
            {#each Object.entries(incidentsByDate) as [dateKey, list]}
                <div class="relative pl-8 border-l border-neutral-800">
                    <div
                        class="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-neutral-600 border-2 border-[#0a0a0a]"
                    ></div>

                    <h3 class="text-lg font-bold text-gray-400 mb-4">
                        {formatDateHeader(dateKey, $locale)}
                    </h3>

                    <div class="space-y-4">
                        {#each list as item}
                            <div
                                class="bg-neutral-900 border border-neutral-800 rounded-lg p-5"
                            >
                                <div class="flex items-center gap-2 mb-2">
                                    <span
                                        class="h-2 w-2 rounded-full bg-red-500"
                                    ></span>
                                    <h4 class="font-bold text-gray-200">
                                        {item.url || $t.sections.unknown_url} - {$t
                                            .status.down}
                                    </h4>
                                </div>

                                <div class="text-sm text-gray-500 mb-3">
                                    {$t.labels.reason}:
                                    <span
                                        class="font-mono text-xs bg-neutral-800 px-1 rounded"
                                        >{item.cause || $t.status.unknown}</span
                                    >
                                </div>

                                <div
                                    class="bg-neutral-800/50 rounded p-3 text-xs text-gray-400 flex items-center gap-2"
                                >
                                    {#if item.resolvedAt}
                                        <svg
                                            class="w-4 h-4 text-green-500"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            ><path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M5 13l4 4L19 7"
                                            ></path></svg
                                        >
                                        <span>
                                            {$t.status.resolved}, {$t.labels
                                                .duration}
                                            <strong class="text-gray-300">
                                                {item.resolvedAt &&
                                                item.startedAt
                                                    ? safeTime(
                                                          item.resolvedAt,
                                                          "yyyy-MM-dd HH:mm",
                                                      )
                                                    : "--"}
                                            </strong>
                                        </span>
                                    {:else}
                                        <svg
                                            class="w-4 h-4 text-red-500 animate-pulse"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            ><path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            ></path></svg
                                        >
                                        <span class="text-red-400"
                                            >{$t.status.investigating}</span
                                        >
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}

            {#if Object.keys(incidentsByDate).length === 0}
                <div class="text-center py-10 text-gray-600">
                    <p>{$t.sections.no_incidents}</p>
                </div>
            {/if}
        </div>

        <footer class="mt-20 text-center text-xs text-gray-700">
            <p>{$t.footer.powered_by} Cloudflare Workers & D1 & SvelteKit</p>
        </footer>
    </div>
</div>
