<script lang="ts">
    import { format } from "date-fns";

    // Svelte 5 语法
    let {
        data = [] as { latency: number; status: number; timestamp: number }[],
        color = "#22c55e",
        height = 250,
    } = $props();

    let hoverData: { x: number; y: number; data: any } | null = $state(null);
    let svgElement: SVGSVGElement;
    let svgWidth = $state(0);

    const padding = { top: 20, right: 30, bottom: 30, left: 40 };
    let chartWidth = $derived(svgWidth - padding.left - padding.right);
    let chartHeight = $derived(height - padding.top - padding.bottom);

    let maxLatency = $derived(
        data && data.length > 0
            ? Math.max(Math.max(...data.map((d) => d.latency)) * 1.2, 100)
            : 100,
    );

    let points = $derived(
        data && data.length > 0
            ? data
                  .map((d, i) => {
                      const x = (i / (data.length - 1 || 1)) * chartWidth;
                      const normalizedY = d.latency / maxLatency;
                      const y = chartHeight - normalizedY * chartHeight;
                      return `${x},${y}`;
                  })
                  .join(" ")
            : "",
    );

    let areaPoints = $derived(
        `0,${chartHeight} ` + points + ` ${chartWidth},${chartHeight}`,
    );

    function handleMouseMove(e: MouseEvent) {
        if (!svgElement || data.length === 0 || chartWidth <= 0) return;
        const rect = svgElement.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - padding.left;

        let index = Math.round((mouseX / chartWidth) * (data.length - 1));
        index = Math.max(0, Math.min(index, data.length - 1));
        const dataPoint = data[index];

        const x = (index / (data.length - 1 || 1)) * chartWidth;
        const normalizedY = dataPoint.latency / maxLatency;
        const y = chartHeight - normalizedY * chartHeight;

        hoverData = { x, y, data: dataPoint };
    }

    function handleMouseLeave() {
        hoverData = null;
    }
</script>

<div
    class="relative w-full font-mono"
    style="height: {height}px;"
    bind:clientWidth={svgWidth}
>
    <svg
        width="100%"
        {height}
        class="overflow-visible select-none"
        bind:this={svgElement}
        onmousemove={handleMouseMove}
        onmouseleave={handleMouseLeave}
        role="img"
        aria-label="Latency chart"
    >
        <g transform="translate({padding.left}, {padding.top})">
            <defs>
                <linearGradient
                    id="gradient-{color}"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                >
                    <stop offset="0%" stop-color={color} stop-opacity="0.2" />
                    <stop offset="100%" stop-color={color} stop-opacity="0" />
                </linearGradient>
            </defs>

            <line
                x1="0"
                y1="0"
                x2="0"
                y2={chartHeight}
                stroke="#333"
                stroke-width="1"
            />
            <line
                x1="0"
                y1={chartHeight}
                x2={chartWidth}
                y2={chartHeight}
                stroke="#333"
                stroke-width="1"
            />
            <line
                x1="0"
                y1="0"
                x2={chartWidth}
                y2="0"
                stroke="#333"
                stroke-width="1"
                stroke-dasharray="4"
            />

            <text
                x="-10"
                y="0"
                fill="#666"
                font-size="10"
                text-anchor="end"
                alignment-baseline="middle">{Math.round(maxLatency)}ms</text
            >
            <text
                x="-10"
                y={chartHeight}
                fill="#666"
                font-size="10"
                text-anchor="end"
                alignment-baseline="middle">0ms</text
            >

            {#if data.length > 0}
                <text
                    x="0"
                    y={chartHeight + 15}
                    fill="#666"
                    font-size="10"
                    text-anchor="start"
                    >{format(data[0].timestamp * 1000, "HH:mm")}</text
                >
                <text
                    x={chartWidth}
                    y={chartHeight + 15}
                    fill="#666"
                    font-size="10"
                    text-anchor="end"
                    >{format(
                        data[data.length - 1].timestamp * 1000,
                        "HH:mm",
                    )}</text
                >
            {/if}

            {#if data.length > 1}
                <polygon fill="url(#gradient-{color})" points={areaPoints} />
                <polyline
                    fill="none"
                    stroke={color}
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    {points}
                />
            {/if}

            {#if hoverData}
                <line
                    x1={hoverData.x}
                    y1="0"
                    x2={hoverData.x}
                    y2={chartHeight}
                    stroke={color}
                    stroke-width="1"
                    stroke-dasharray="4"
                    opacity="0.5"
                />
                <circle
                    cx={hoverData.x}
                    cy={hoverData.y}
                    r="4"
                    fill={color}
                    stroke="#0a0a0a"
                    stroke-width="2"
                />
            {/if}
        </g>
    </svg>

    {#if hoverData}
        <div
            class="absolute z-10 bg-neutral-900 border border-green-500/30 p-3 rounded-lg shadow-xl text-xs pointer-events-none backdrop-blur-sm transition-all duration-75 ease-out"
            style="left: {hoverData.x + padding.left}px; top: {hoverData.y +
                padding.top -
                10}px; transform: translate({hoverData.x > chartWidth / 2
                ? '-100%'
                : '0'}, -100%); margin-left: {hoverData.x > chartWidth / 2
                ? '-15px'
                : '15px'};"
        >
            <div class="text-gray-400 mb-1">
                {format(hoverData.data.timestamp * 1000, "yyyy-MM-dd HH:mm:ss")}
            </div>
            <div class="flex items-center gap-2 text-sm">
                <span
                    class="flex h-3 w-3 rounded-full"
                    style="background-color: {color}"
                ></span>
                <span class="text-gray-200"
                    >Latency: <strong class="text-white"
                        >{hoverData.data.latency}ms</strong
                    ></span
                >
            </div>
            {#if hoverData.data.status !== 200}
                <div class="text-red-400 mt-1">
                    Status: {hoverData.data.status}
                </div>
            {/if}
        </div>
    {/if}
</div>
