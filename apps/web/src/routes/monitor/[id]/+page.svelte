<script lang="ts">
    import { t } from '$lib/i18n';
    import BigSparkline from '$lib/components/BigSparkline.svelte';
    import { format } from 'date-fns';

    let { data } = $props();
    let { monitor, heartbeats, incidents, maintenance, uptime24h } = $derived(data);

    function getStatusColor(status: number) {
        if (status >= 200 && status < 300) return 'text-green-500';
        if (status >= 300 && status < 500) return 'text-yellow-500';
        return 'text-red-500';
    }

    function getStatusKey(status: number) {
        if (status >= 200 && status < 300) return 'operational';
        if (status >= 300 && status < 500) return 'degraded';
        return 'down';
    }
</script>

<div class="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
    <!-- Back Button -->
    <div>
        <a href="/" class="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {$t.labels.return_dashboard}
        </a>
    </div>

    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-800 pb-6">
        <div>
            <div class="flex items-center gap-3">
                <h1 class="text-3xl font-bold text-white tracking-tight">{monitor.name}</h1>
                <span class={`px-2 py-0.5 rounded text-xs font-bold bg-neutral-900 border border-neutral-800 ${monitor.active ? 'text-green-500' : 'text-gray-500'}`}>
                    {monitor.active ? $t.status.active : $t.status.paused}
                </span>
            </div>
            <a href={monitor.url} target="_blank" class="text-neutral-500 hover:text-neutral-300 text-sm mt-1 block font-mono">
                {monitor.url}
            </a>
        </div>
        <div class="text-right">
            <div class="text-2xl font-bold text-white">{uptime24h}%</div>
            <div class="text-xs text-neutral-500 uppercase tracking-wider">{$t.detail.uptime_24h}</div>
        </div>
    </div>

    <!-- Chart -->
    <div class="bg-neutral-900/30 border border-neutral-800 rounded-lg p-6">
        <h2 class="text-sm font-bold text-neutral-400 mb-4 uppercase tracking-wider">{$t.detail.response_time_24h}</h2>
        <div class="h-[250px] w-full">
            <BigSparkline data={heartbeats} color="#22c55e" height={250} />
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Incident History -->
        <div class="space-y-4">
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-red-500"></span>
                {$t.detail.incident_history}
            </h2>
            {#if incidents.length === 0}
                <div class="p-8 text-center border border-neutral-800 rounded-lg bg-neutral-900/20 text-neutral-500">
                    {$t.detail.no_incidents}
                </div>
            {:else}
                <div class="space-y-4">
                    {#each incidents as incident}
                        <div class="border border-neutral-800 rounded-lg p-4 bg-neutral-900/20 hover:bg-neutral-900/40 transition-colors">
                            <div class="flex justify-between items-start mb-2">
                                <span class="font-bold text-red-400">{incident.cause}</span>
                                <span class="text-xs text-neutral-500 font-mono">
                                    {format(new Date(incident.startedAt * 1000), 'MMM d, HH:mm')}
                                </span>
                            </div>
                            <div class="text-sm text-neutral-400">
                                {#if incident.resolvedAt}
                                    <span class="text-green-500">{$t.status.resolved}</span> {$t.detail.resolved_after} {Math.round((incident.resolvedAt - incident.startedAt) / 60)} {$t.labels.mins}
                                {:else}
                                    <span class="text-red-500 animate-pulse">{$t.detail.ongoing}</span>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Maintenance History -->
        <div class="space-y-4">
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                {$t.detail.maintenance_history}
            </h2>
            {#if maintenance.length === 0}
                <div class="p-8 text-center border border-neutral-800 rounded-lg bg-neutral-900/20 text-neutral-500">
                    {$t.detail.no_maintenance}
                </div>
            {:else}
                <div class="space-y-4">
                    {#each maintenance as m}
                        <div class="border border-neutral-800 rounded-lg p-4 bg-neutral-900/20 hover:bg-neutral-900/40 transition-colors">
                            <div class="flex justify-between items-start mb-2">
                                <span class="font-bold text-blue-400">{m.title}</span>
                                <span class="text-xs text-neutral-500 font-mono">
                                    {format(new Date(m.startTime * 1000), 'MMM d')}
                                </span>
                            </div>
                            <div class="text-xs text-neutral-500 font-mono mt-2 flex gap-4">
                                <div>
                                    <span class="block text-neutral-600">{$t.detail.start}</span>
                                    {format(new Date(m.startTime * 1000), 'HH:mm')}
                                </div>
                                <div>
                                    <span class="block text-neutral-600">{$t.detail.end}</span>
                                    {format(new Date(m.endTime * 1000), 'HH:mm')}
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    <!-- Recent Checks Table -->
    <div class="space-y-4">
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            {$t.detail.recent_checks}
        </h2>
        <div class="border border-neutral-800 rounded-lg overflow-hidden">
            <table class="w-full text-sm text-left text-gray-400">
                <thead class="text-xs text-gray-500 uppercase bg-neutral-900/50 border-b border-neutral-800">
                    <tr>
                        <th class="px-6 py-3">{$t.detail.time}</th>
                        <th class="px-6 py-3">{$t.detail.status}</th>
                        <th class="px-6 py-3">{$t.detail.latency}</th>
                        <th class="px-6 py-3">{$t.detail.region}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-neutral-800 bg-neutral-900/20">
                    {#each heartbeats.slice(-50).reverse() as h}
                        <tr class="hover:bg-neutral-900/40 transition-colors">
                            <td class="px-6 py-3 font-mono">
                                {format(new Date(h.timestamp * 1000), 'yyyy-MM-dd HH:mm:ss')}
                            </td>
                            <td class="px-6 py-3">
                                <span class={`font-bold ${getStatusColor(h.status)}`}>
                                    {h.status} {$t.status[getStatusKey(h.status)]}
                                </span>
                            </td>
                            <td class="px-6 py-3 font-mono">
                                {h.latency}{$t.labels.ms}
                            </td>
                            <td class="px-6 py-3">
                                <span class="px-2 py-0.5 rounded bg-neutral-800 text-xs border border-neutral-700">
                                    {h.region || 'Global'}
                                </span>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</div>
