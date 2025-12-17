<script lang="ts">
    // Svelte 5 语法
    let {
        data = [] as number[],
        color = "#22c55e",
        height = 30,
        width = 120,
    } = $props();

    // 计算 SVG 路径点
    let points = $derived(
        (() => {
            if (!data || data.length < 2)
                return `0,${height} ${width},${height}`;

            const max = Math.max(...data, 100);
            const min = 0;
            const range = max - min;

            return data
                .map((value, index) => {
                    const x = (index / (data.length - 1)) * width;
                    const y = height - ((value - min) / range) * height;
                    return `${x},${y}`;
                })
                .join(" ");
        })(),
    );

    // 获取最后一个点的坐标用于画圆点
    let lastPoint = $derived(points.split(" ").pop()?.split(","));
</script>

<div class="inline-block" style="width: {width}px; height: {height}px;">
    <svg {width} {height} class="overflow-visible">
        <!-- 渐变填充 (可选，增加高级感) -->
        <defs>
            <linearGradient id="gradient-{color}" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color={color} stop-opacity="0.2" />
                <stop offset="100%" stop-color={color} stop-opacity="0" />
            </linearGradient>
        </defs>

        <!-- 折线 -->
        <polyline
            fill="none"
            stroke={color}
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            {points}
        />

        <!-- 呼吸灯圆点 -->
        {#if lastPoint}
            <circle
                cx={lastPoint[0]}
                cy={lastPoint[1]}
                r="2"
                fill={color}
                class="animate-pulse"
            />
            <!-- 光晕效果 -->
            <circle
                cx={lastPoint[0]}
                cy={lastPoint[1]}
                r="6"
                fill={color}
                class="animate-ping opacity-20"
            />
        {/if}
    </svg>
</div>
