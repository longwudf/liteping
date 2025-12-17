<script lang="ts">
    import { enhance } from "$app/forms";
    import { t } from "$lib/i18n";
    import { format } from "date-fns";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props(); 

    let editingId: string | null = $state(null);
    let fileInput: HTMLInputElement;
    let selectedNotifierType: string = $state("discord");

    // 搜索与批量管理
    let searchQuery = $state("");
    let selectedIds: string[] = $state([]);
    
    // 过滤后的监控列表
    let filteredMonitors = $derived(
        data.monitors.filter(m => 
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            m.url.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    // 全选/反选
    function toggleSelectAll() {
        if (selectedIds.length === filteredMonitors.length) {
            selectedIds = [];
        } else {
            selectedIds = filteredMonitors.map(m => m.id);
        }
    }

    function toggleSelect(id: string) {
        if (selectedIds.includes(id)) {
            selectedIds = selectedIds.filter(i => i !== id);
        } else {
            selectedIds = [...selectedIds, id];
        }
    }

    // 排序调整
    function moveUp(index: number) {
        if (index === 0) return;
        const list = [...filteredMonitors];
        [list[index - 1], list[index]] = [list[index], list[index - 1]];
        saveOrder(list);
    }

    function moveDown(index: number) {
        if (index === filteredMonitors.length - 1) return;
        const list = [...filteredMonitors];
        [list[index + 1], list[index]] = [list[index], list[index + 1]];
        saveOrder(list);
    }

    function pinToTop(index: number) {
        if (index === 0) return;
        const list = [...filteredMonitors];
        const item = list.splice(index, 1)[0];
        list.unshift(item);
        saveOrder(list);
    }

    function saveOrder(list: any[]) {
        // 重新计算权重：列表越靠前，权重越大 (或者越小，取决于排序逻辑)
        // 后端是 desc(weight)，所以第一个元素权重最大
        const orderData = list.map((item, index) => ({
            id: item.id,
            weight: list.length - index
        }));
        
        const formData = new FormData();
        formData.append('order', JSON.stringify(orderData));
        
        fetch('?/save_order', {
            method: 'POST',
            body: formData
        }).then(() => {
            // 乐观更新：虽然页面会刷新，但这里可以先不做啥，SvelteKit enhance 会处理
            // 但因为我们是手动 fetch，需要手动刷新数据或者等待
            // 为了简单，直接刷新页面
            window.location.reload();
        });
    }

    //  通知渠道编辑状态
    let editingNotifierId: string | null = $state(null);
    let editingType = $state("discord");
    let currentEditingConfig: any = $state({});

    function toggleEdit(id: string) {
        editingId = editingId === id ? null : id;
    }

    //  开启通知渠道编辑模式
    function startEditNotifier(item: any) {
        editingNotifierId = item.id;
        editingType = item.type;
        try {
            currentEditingConfig = JSON.parse(item.config);
        } catch (e) {
            currentEditingConfig = {};
        }
    }

    function triggerImport() {
        fileInput.click();
    }

    function handleFileChange() {
        if (fileInput.files && fileInput.files.length > 0) {
            document.getElementById("importSubmitBtn")?.click();
        }
    }

    //  复制徽章 Markdown 代码
    function copyBadge(item: any) {
        const origin = window.location.origin;
        const safeName = item.name.replace(/ /g, "%20");
        const badgeUrl = `${origin}/api/badge/${item.id}?label=${safeName}`;
        const markdown = `[![${item.name} Status](${badgeUrl})](${item.url})`;

        navigator.clipboard
            .writeText(markdown)
            .then(() => {
                alert($t.sections.markdown_copied);
            })
            .catch(() => {
                prompt("Copy this Markdown:", markdown);
            });
    }

    function setNow(name: string) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const iso = now.toISOString().slice(0, 16);
        const el = document.querySelector(
            `input[name="${name}"]`,
        ) as HTMLInputElement;
        if (el) el.value = iso;
    }
</script>

<div class="min-h-screen bg-[#0a0a0a] text-white font-mono p-8">
    <div class="max-w-6xl mx-auto">
        <div
            class="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-neutral-800 pb-4 gap-4"
        >
            <div>
                <h1 class="text-3xl font-bold text-green-500">
                    {$t.admin.title}
                </h1>
                <a href="/" class="text-sm text-gray-500 hover:text-white"
                    >← {$t.labels.back_dashboard}</a
                >
            </div>

            <div class="flex gap-2">
                <a
                    href="/api/backup"
                    download
                    class="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs rounded border border-neutral-700"
                    >{$t.admin.export}</a
                >
                <button
                    onclick={triggerImport}
                    class="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs rounded border border-neutral-700"
                    >{$t.admin.import}</button
                >
                <form method="POST" action="?/logout" use:enhance>
                    <button
                        type="submit"
                        class="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-red-900/20 text-red-500/70 hover:text-red-400 text-xs rounded border border-neutral-800 hover:border-red-900/50 transition-all"
                    >
                        <svg
                            class="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            ></path>
                        </svg>
                        {$t.admin.logout}
                    </button>
                </form>
                <form
                    method="POST"
                    action="?/import"
                    enctype="multipart/form-data"
                    use:enhance
                    class="hidden"
                >
                    <input
                        bind:this={fileInput}
                        type="file"
                        name="file"
                        accept=".json"
                        onchange={handleFileChange}
                    />
                    <button
                        id="importSubmitBtn"
                        type="submit"
                        aria-label="Submit Import"
                    ></button>
                </form>
            </div>
        </div>

        <div
            class="bg-neutral-900/30 border border-neutral-800 p-4 rounded-xl mb-8 flex flex-col md:flex-row gap-4 items-end"
        >
            <div class="flex-1 w-full">
                <h2
                    class="text-sm font-bold mb-2 text-gray-400 uppercase tracking-wider"
                >
                    {$t.admin.sec_settings}
                </h2>
                <form
                    method="POST"
                    action="?/update_settings"
                    use:enhance
                    class="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    <div class="flex flex-col gap-1">
                        <label for="site_title" class="text-sm text-gray-400">{$t.admin.label_site_title}</label>
                        <input
                            id="site_title"
                            name="site_title"
                            type="text"
                            value={data.settings?.site_title || ""}
                            placeholder="LitePing_"
                            class="bg-black border border-neutral-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-sm text-white"
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label for="site_desc" class="text-sm text-gray-400">{$t.admin.label_site_desc}</label>
                        <input
                            id="site_desc"
                            name="site_desc"
                            type="text"
                            value={data.settings?.site_desc || ""}
                            placeholder="Global Service Monitoring"
                            class="bg-black border border-neutral-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-sm text-white"
                        />
                    </div>

                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label for="footer_text" class="text-sm text-gray-400">{$t.admin.label_footer_text}</label>
                        <input
                            id="footer_text"
                            name="footer_text"
                            type="text"
                            value={data.settings?.footer_text || ""}
                            placeholder="Powered by Cloudflare Workers"
                            class="bg-black border border-neutral-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-sm text-white"
                        />
                    </div>

                    <div class="flex items-center gap-2">
                        <label for="retention_days" class="text-sm text-gray-400">{$t.admin.label_retention}</label>
                        <input
                            id="retention_days"
                            name="retention_days"
                            type="number"
                            min="1"
                            max="365"
                            value={data.settings?.retention_days || 30}
                            class="w-20 bg-black border border-neutral-700 rounded px-2 py-1 focus:border-blue-500 outline-none text-sm text-white text-center"
                            required
                        />
                        <span class="text-sm text-gray-500">{$t.labels.days}</span>
                    </div>

                    <div class="flex items-end justify-end">
                        <button
                            type="submit"
                            class="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-1.5 rounded text-sm transition-colors"
                        >
                            {$t.admin.btn_save}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Maintenance Management (Removed Duplicate) -->

        <!-- Incident Management -->
        <div class="bg-neutral-900/30 border border-neutral-800 p-4 rounded-xl mb-8">
            <h2 class="text-sm font-bold mb-4 text-gray-400 uppercase tracking-wider">{$t.detail.incident_history}</h2>
            <div class="space-y-2">
                {#each data.incidents as incident}
                    <div class="p-3 bg-neutral-900/50 border border-neutral-800 rounded">
                        <form method="POST" action="?/update_incident" use:enhance class="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <input type="hidden" name="id" value={incident.id} />
                            
                            <div class="flex-1 w-full">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class={`w-2 h-2 rounded-full ${incident.resolvedAt ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
                                    <span class="text-xs text-gray-500">
                                        {data.monitors.find(x => x.id === incident.monitorId)?.name || $t.status.unknown} • 
                                        {format(new Date(incident.startedAt * 1000), 'MMM d HH:mm')}
                                    </span>
                                </div>
                                <input 
                                    name="cause" 
                                    value={incident.cause} 
                                    class="bg-transparent border-b border-neutral-700 focus:border-blue-500 outline-none text-sm text-white w-full"
                                />
                            </div>

                            <div class="flex items-center gap-2">
                                {#if !incident.resolvedAt}
                                    <button formaction="?/resolve_incident" class="text-green-500 hover:text-green-400 text-xs border border-green-500/30 px-2 py-1 rounded">{$t.status.resolved}</button>
                                {/if}
                                <button type="submit" class="text-blue-500 hover:text-blue-400 text-xs">{$t.admin.btn_save}</button>
                                <button formaction="?/delete_incident" class="text-red-500 hover:text-red-400 text-xs ml-2">{$t.admin.btn_del}</button>
                            </div>
                        </form>
                    </div>
                {/each}
            </div>
        </div>

        <div
            class="bg-neutral-900/30 border border-neutral-800 p-4 rounded-xl mb-8 flex flex-col md:flex-row gap-4 items-end"
        >
            <div class="flex-1 w-full">
                <h2
                    class="text-sm font-bold mb-2 text-gray-400 uppercase tracking-wider"
                >
                    {$t.admin.sec_announcement}
                </h2>
                <form
                    method="POST"
                    action="?/create_announcement"
                    use:enhance
                    class="flex gap-2"
                >
                    <div class="flex-1">
                        <input
                            name="title"
                            type="text"
                            placeholder={$t.admin.ph_title}
                            class="w-full bg-black border border-neutral-700 rounded px-3 py-2 focus:border-blue-500 outline-none text-sm text-white"
                            required
                        />
                    </div>

                    <div class="w-24">
                        <select
                            name="type"
                            class="w-full bg-black border border-neutral-700 rounded px-2 py-2 focus:border-blue-500 outline-none text-sm text-white"
                        >
                            <option value="info">{$t.admin.info}</option>
                            <option value="warning">{$t.admin.warning}</option>
                            <option value="alert">{$t.admin.alert}</option>
                        </select>
                    </div>

                    <button
                        class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded text-xs transition-colors"
                    >
                        {$t.admin.post}
                    </button>
                </form>
            </div>

            {#if data.globalAnnouncements && data.globalAnnouncements.length > 0}
                <div class="w-full md:w-1/3 border-l border-neutral-800 pl-4">
                    <h3 class="text-xs text-gray-500 mb-2">
                        {$t.sections.active_announcements}
                    </h3>
                    <div class="space-y-2">
                        {#each data.globalAnnouncements as ann}
                            <div
                                class="flex justify-between items-center bg-black p-2 rounded border border-neutral-800"
                            >
                                <span
                                    class="text-xs truncate max-w-[150px] text-gray-300"
                                    title={ann.title}>{ann.title}</span
                                >
                                <form
                                    method="POST"
                                    action="?/delete_announcement"
                                    use:enhance
                                >
                                    <input
                                        type="hidden"
                                        name="id"
                                        value={ann.id}
                                    />
                                    <button
                                        class="text-red-500 hover:text-red-400 text-[10px] hover:underline"
                                    >
                                        {$t.admin.btn_del}
                                    </button>
                                </form>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

        <div
            class="bg-neutral-900/30 border border-neutral-800 p-4 rounded-xl mb-8"
        >
            <h2
                class="text-sm font-bold mb-2 text-gray-400 uppercase tracking-wider"
            >
                {$t.admin.sec_maintenance}
            </h2>
            <form
                method="POST"
                action="?/create_maintenance"
                use:enhance={({ formData }) => {
                    // 🕒 核心修复：将本地时间转换为 ISO 字符串 (带时区偏移)
                    // 这样服务器 new Date(iso) 就能正确识别为 UTC 时间
                    const start = formData.get("start_time") as string;
                    const end = formData.get("end_time") as string;

                    if (start) formData.set("start_time", new Date(start).toISOString());
                    if (end) formData.set("end_time", new Date(end).toISOString());

                    return async ({ update }) => {
                        await update();
                    };
                }}
                class="flex flex-col md:flex-row gap-4 items-end"
            >
                <div class="flex-1 w-full space-y-1">
                    <label class="text-[10px] text-gray-500">
                        <span>{$t.admin.label_service}</span>
                        <select
                            name="monitor_id"
                            class="w-full bg-black border border-neutral-700 rounded px-2 py-2 text-sm text-white mt-1"
                            required
                        >
                            <option value="">{$t.admin.label_service}...</option
                            >
                            {#each data.monitors as m}
                                <option value={m.id}>{m.name}</option>
                            {/each}
                        </select>
                    </label>
                </div>

                <div class="flex-[2] w-full space-y-1">
                    <label class="text-[10px] text-gray-500">
                        <span>{$t.admin.label_title}</span>
                        <input
                            name="title"
                            type="text"
                            placeholder={$t.admin.ph_title}
                            class="w-full bg-black border border-neutral-700 rounded px-3 py-2 text-sm text-white mt-1"
                            required
                        />
                    </label>
                </div>

                <div class="flex-1 w-full space-y-1">
                    <label class="text-[10px] text-gray-500 block">
                        <div class="flex justify-between items-center">
                            <span>{$t.admin.label_start}</span>
                            <button
                                type="button"
                                onclick={(e) => {
                                    e.preventDefault();
                                    setNow("start_time");
                                }}
                                class="text-green-500 hover:text-green-400 font-bold cursor-pointer"
                                >{$t.admin.now}</button
                            >
                        </div>
                        <div class="relative">
                            <input
                                name="start_time"
                                type="datetime-local"
                                class="w-full bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-white mt-1 focus:border-green-500 outline-none"
                                required
                            />
                            <div
                                class="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                            >
                                <!-- Optional: Add a custom icon here if needed, but native picker is now better -->
                            </div>
                        </div>
                    </label>
                </div>
                <div class="flex-1 w-full space-y-1">
                    <label class="text-[10px] text-gray-500 block">
                        <div class="flex justify-between items-center">
                            <span>{$t.admin.label_end}</span>
                            <button
                                type="button"
                                onclick={(e) => {
                                    e.preventDefault();
                                    setNow("end_time");
                                }}
                                class="text-green-500 hover:text-green-400 font-bold cursor-pointer"
                                >{$t.admin.now}</button
                            >
                        </div>
                        <div class="relative">
                            <input
                                name="end_time"
                                type="datetime-local"
                                class="w-full bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-white mt-1 focus:border-green-500 outline-none"
                                required
                            />
                        </div>
                    </label>
                </div>

                <button
                    class="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded text-xs transition-colors h-[38px]"
                >
                    {$t.admin.btn_schedule}
                </button>
            </form>

            {#if data.maintenance && data.maintenance.length > 0}
                <div class="mt-4 border-t border-neutral-800 pt-4">
                    <h3
                        class="text-xs text-gray-500 mb-2 uppercase tracking-wider"
                    >
                        {$t.sections.upcoming_recent}
                    </h3>
                    <div class="space-y-2">
                        {#each data.maintenance as item}
                            <div
                                class="flex items-center justify-between bg-black p-3 rounded border border-neutral-800"
                            >
                                <div class="flex flex-col flex-1">
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="font-bold text-sm text-gray-300"
                                            >{item.title}</span
                                        >
                                        {#if Date.now() / 1000 < item.startTime}
                                            <span
                                                class="text-[10px] bg-blue-900/30 text-blue-400 px-1 rounded"
                                                >{$t.status.future}</span
                                            >
                                        {:else if Date.now() / 1000 > item.endTime}
                                            <span
                                                class="text-[10px] bg-neutral-800 text-gray-600 px-1 rounded"
                                                >{$t.status.done}</span
                                            >
                                        {:else}
                                            <span
                                                class="text-[10px] bg-yellow-900/30 text-yellow-400 px-1 rounded animate-pulse"
                                                >{$t.status.active}</span
                                            >
                                        {/if}
                                    </div>

                                    <div
                                        class="text-[10px] text-gray-600 font-mono mt-0.5"
                                    >
                                        {$t.labels.id}: {item.monitorId.slice(
                                            0,
                                            8,
                                        )}...
                                    </div>
                                </div>

                                <div
                                    class="text-[10px] text-gray-500 font-mono text-right mr-4 flex-shrink-0"
                                >
                                    <div>
                                        {new Date(
                                            item.startTime * 1000,
                                        ).toLocaleString()}
                                    </div>
                                    <div>
                                        {new Date(
                                            item.endTime * 1000,
                                        ).toLocaleString()}
                                    </div>
                                </div>

                                <form
                                    method="POST"
                                    action="?/delete_maintenance"
                                    use:enhance
                                >
                                    <input
                                        type="hidden"
                                        name="id"
                                        value={item.id}
                                    />
                                    <button
                                        class="text-red-500 hover:text-red-400 text-xs font-bold hover:underline px-2 py-1 transition-colors"
                                    >
                                        {$t.admin.btn_del}
                                    </button>
                                </form>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

        <!-- 通知渠道管理 -->
        <div
            class="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl mb-12"
        >
            <h2 class="text-lg font-bold mb-4 text-blue-400">
                {$t.admin.sec_notifications}
            </h2>

            <!-- 创建新通知渠道表单 -->
            <div class="mb-8 p-4 bg-black/50 rounded border border-neutral-700">
                <h3 class="text-sm font-semibold mb-4 text-gray-300">
                    {$t.sections.create_channel}
                </h3>
                <form
                    method="POST"
                    action="?/create_notifier"
                    use:enhance
                    class="space-y-4"
                >
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="block">
                                <span class="text-xs text-gray-500"
                                    >{$t.admin.label_name}</span
                                >
                                <input
                                    name="name"
                                    type="text"
                                    placeholder={$t.admin.ph_title}
                                    class="w-full bg-black border border-neutral-700 rounded px-3 py-2 focus:border-blue-500 outline-none text-sm"
                                    required
                                />
                            </label>
                        </div>
                        <div class="space-y-1">
                            <label class="block">
                                <span class="text-xs text-gray-500"
                                    >{$t.admin.label_type}</span
                                >
                                <select
                                    name="type"
                                    bind:value={selectedNotifierType}
                                    class="w-full bg-black border border-neutral-700 rounded px-3 py-2 focus:border-blue-500 outline-none text-sm"
                                    required
                                >
                                    <option value="discord">Discord</option>
                                    <option value="telegram">Telegram</option>
                                    <option value="slack">Slack</option>
                                    <option value="webhook">Webhook</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <!-- 条件字段：基于类型 -->
                    {#if selectedNotifierType === "telegram"}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-1">
                                <label class="block">
                                    <span class="text-xs text-gray-500"
                                        >{$t.admin.label_token}</span
                                    >
                                    <input
                                        name="telegramToken"
                                        type="password"
                                        placeholder="123456:ABC-DEF..."
                                        class="w-full bg-black border border-neutral-700 rounded px-3 py-2 focus:border-blue-500 outline-none text-sm"
                                        required
                                    />
                                </label>
                            </div>
                            <div class="space-y-1">
                                <label class="block">
                                    <span class="text-xs text-gray-500"
                                        >{$t.admin.label_chatid}</span
                                    >
                                    <input
                                        name="telegramChatId"
                                        type="text"
                                        placeholder="-1001234567890"
                                        class="w-full bg-black border border-neutral-700 rounded px-3 py-2 focus:border-blue-500 outline-none text-sm"
                                        required
                                    />
                                </label>
                            </div>
                        </div>
                    {:else}
                        <div class="space-y-1">
                            <label class="block">
                                <span class="text-xs text-gray-500"
                                    >{$t.admin.label_channel}</span
                                >
                                <input
                                    name="webhookUrl"
                                    type="url"
                                    placeholder="https://discord.com/api/webhooks/..."
                                    class="w-full bg-black border border-neutral-700 rounded px-3 py-2 focus:border-blue-500 outline-none text-sm"
                                    required
                                />
                            </label>
                        </div>
                    {/if}

                    <button
                        type="submit"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-semibold transition-colors"
                    >
                        + {$t.admin.btn_add}
                    </button>
                </form>
            </div>

            <!-- 通知渠道列表 -->
            {#if data.notifiers && data.notifiers.length > 0}
                <div class="space-y-2">
                    <h3 class="text-sm font-semibold text-gray-300 mb-3">
                        {$t.sections.active_channels}
                    </h3>
                    {#each data.notifiers as item}
                        <div
                            class="bg-black p-2 rounded border border-neutral-800"
                        >
                            {#if editingNotifierId !== item.id}
                                <!-- 显示模式 -->
                                <div class="flex justify-between items-center">
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="text-xs font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-gray-300 uppercase"
                                            >{item.type}</span
                                        >
                                        <span class="text-sm text-gray-200"
                                            >{item.name}</span
                                        >
                                    </div>

                                    <div class="flex gap-2">
                                        <button
                                            type="button"
                                            onclick={() =>
                                                startEditNotifier(item)}
                                            class="text-blue-500 hover:text-blue-400 text-xs hover:underline"
                                        >
                                            {$t.admin.btn_edit}
                                        </button>

                                        <form
                                            method="POST"
                                            action="?/delete_notifier"
                                            use:enhance
                                            class="inline"
                                            onsubmit={(e) =>
                                                confirm(
                                                    $t.sections
                                                        .delete_channel_confirm,
                                                )}
                                        >
                                            <input
                                                type="hidden"
                                                name="id"
                                                value={item.id}
                                            />
                                            <button
                                                type="submit"
                                                class="text-red-500 hover:text-red-400 text-xs hover:underline"
                                                >{$t.admin.btn_del}</button
                                            >
                                        </form>
                                    </div>
                                </div>
                            {:else}
                                <!-- 编辑模式 -->
                                <form
                                    method="POST"
                                    action="?/update_notifier"
                                    class="space-y-2"
                                    use:enhance={() => {
                                        return async ({ update, result }) => {
                                            await update();
                                            if (result.type === "success")
                                                editingNotifierId = null;
                                        };
                                    }}
                                >
                                    <input
                                        type="hidden"
                                        name="id"
                                        value={item.id}
                                    />

                                    <div class="grid grid-cols-12 gap-2">
                                        <div class="col-span-3">
                                            <input
                                                name="name"
                                                type="text"
                                                value={item.name}
                                                class="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white"
                                                placeholder={$t.labels.name}
                                                required
                                            />
                                        </div>

                                        <div class="col-span-3">
                                            <select
                                                name="type"
                                                value={editingType}
                                                onchange={(e) =>
                                                    (editingType =
                                                        e.currentTarget.value)}
                                                class="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white"
                                            >
                                                <option value="discord"
                                                    >Discord</option
                                                >
                                                <option value="telegram"
                                                    >Telegram</option
                                                >
                                                <option value="slack"
                                                    >Slack</option
                                                >
                                                <option value="webhook"
                                                    >Webhook</option
                                                >
                                            </select>
                                        </div>

                                        <div class="col-span-6 flex gap-1">
                                            {#if editingType === "telegram"}
                                                <input
                                                    name="token"
                                                    type="text"
                                                    value={currentEditingConfig.token ||
                                                        ""}
                                                    placeholder={$t.admin
                                                        .label_token}
                                                    class="w-1/2 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white"
                                                    required
                                                />
                                                <input
                                                    name="chat_id"
                                                    type="text"
                                                    value={currentEditingConfig.chatId ||
                                                        ""}
                                                    placeholder={$t.admin
                                                        .label_chatid}
                                                    class="w-1/2 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white"
                                                    required
                                                />
                                            {:else}
                                                <input
                                                    name="url"
                                                    type="text"
                                                    value={currentEditingConfig.webhookUrl ||
                                                        ""}
                                                    placeholder={$t.admin
                                                        .ph_webhook}
                                                    class="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white"
                                                    required
                                                />
                                            {/if}
                                        </div>
                                    </div>

                                    <div class="flex justify-end gap-2 mt-2">
                                        <button
                                            type="button"
                                            onclick={() =>
                                                (editingNotifierId = null)}
                                            class="text-xs text-gray-500 hover:text-white"
                                        >
                                            {$t.admin.btn_cancel}
                                        </button>
                                        <button
                                            type="submit"
                                            class="text-xs text-green-500 hover:text-green-400 font-bold"
                                        >
                                            {$t.admin.btn_save}
                                        </button>
                                    </div>
                                </form>
                            {/if}
                        </div>
                    {/each}
                </div>
            {:else}
                <div class="text-center py-8 text-gray-500 text-sm">
                    {$t.sections.no_channels}
                </div>
            {/if}
        </div>

        <div
            class="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl mb-12"
        >
            <h2 class="text-lg font-bold mb-4 text-gray-300">
                {$t.admin.sec_add_target}
            </h2>
            <form
                method="POST"
                action="?/create"
                use:enhance
                class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
            >
                <div class="md:col-span-4 space-y-1">
                    <label class="block">
                        <span class="text-xs text-gray-500 block"
                            >{$t.admin.label_name}</span
                        >
                        <input
                            name="name"
                            type="text"
                            placeholder={$t.admin.ph_service_name}
                            class="w-full bg-black border border-neutral-700 rounded px-3 py-2 focus:border-green-500 outline-none text-sm"
                            required
                        />
                    </label>
                </div>
                <div class="md:col-span-5 space-y-1">
                    <label class="block">
                        <span class="text-xs text-gray-500 block"
                            >{$t.admin.label_url}</span
                        >
                        <input
                            name="url"
                            type="url"
                            placeholder={$t.admin.ph_url}
                            class="w-full bg-black border border-neutral-700 rounded px-3 py-2 focus:border-green-500 outline-none text-sm"
                            required
                        />
                    </label>
                </div>
                <div class="md:col-span-2 space-y-1">
                    <label class="block">
                        <span class="text-xs text-gray-500 block"
                            >{$t.admin.label_method}</span
                        >
                        <select
                            name="method"
                            class="w-full bg-black border border-neutral-700 rounded px-3 py-2 focus:border-green-500 outline-none text-sm"
                        >
                            <option value="HEAD">HEAD</option>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                        </select>
                    </label>
                </div>
                <div class="md:col-span-1">
                    <button
                        type="submit"
                        class="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-2 rounded transition-colors text-sm"
                        >{$t.admin.btn_add}</button
                    >
                </div>
            </form>
        </div>

        <div class="space-y-1">
            <!-- 🔍 搜索与批量操作栏 -->
            <div class="flex justify-between items-center mb-4 px-1">
                <div class="flex items-center gap-2 flex-1">
                    <input 
                        type="text" 
                        bind:value={searchQuery}
                        placeholder={$t.admin.search_placeholder}
                        class="bg-neutral-900 border border-neutral-800 rounded px-3 py-1.5 text-sm text-white w-64 focus:border-neutral-600 outline-none"
                    />
                    {#if selectedIds.length > 0}
                        <div class="flex items-center gap-2 ml-4 bg-neutral-900 border border-neutral-800 rounded px-2 py-1">
                            <span class="text-xs text-gray-400 px-2">{selectedIds.length} {$t.admin.selected}</span>
                            <div class="h-4 w-px bg-neutral-800"></div>
                            <form method="POST" action="?/batch_action" use:enhance>
                                <input type="hidden" name="ids" value={selectedIds.join(',')} />
                                <button type="submit" name="action" value="pause" class="text-xs text-yellow-500 hover:text-yellow-400 px-2 py-1">{$t.admin.btn_pause}</button>
                                <button type="submit" name="action" value="resume" class="text-xs text-green-500 hover:text-green-400 px-2 py-1">{$t.admin.btn_resume}</button>
                                <button type="submit" name="action" value="delete" class="text-xs text-red-500 hover:text-red-400 px-2 py-1" onclick={(e) => !confirm($t.admin.confirm_delete) && e.preventDefault()}>{$t.admin.btn_delete}</button>
                            </form>
                        </div>
                    {/if}
                </div>
            </div>

            <div class="grid grid-cols-12 text-xs text-gray-500 px-4 pb-2 items-center">
                <div class="col-span-1 flex justify-center">
                    <input type="checkbox" 
                        checked={selectedIds.length === filteredMonitors.length && filteredMonitors.length > 0}
                        onclick={toggleSelectAll}
                        class="rounded bg-neutral-800 border-neutral-700"
                    />
                </div>
                <div class="col-span-1 text-center">{$t.detail.status}</div>
                <div class="col-span-3">{$t.labels.name}</div>
                <div class="col-span-3">{$t.labels.url}</div>
                <div class="col-span-2">{$t.labels.method}</div>
                <div class="col-span-2 text-right">{$t.labels.action}</div>
            </div>

            {#each filteredMonitors as monitor, index (monitor.id)}
                <div
                    class="bg-neutral-900 border border-neutral-800 p-2 rounded hover:border-neutral-700 transition-colors"
                >
                    {#if editingId === monitor.id}
                        <form
                            method="POST"
                            action="?/update"
                            use:enhance={() => {
                                // 提交前准备
                                return async ({ update, result }) => {
                                    // 等待后端返回结果
                                    await update();

                                    // 只有成功后才关闭编辑框
                                    if (result.type === "success") {
                                        editingId = null;
                                    }
                                };
                            }}
                            class="grid grid-cols-12 gap-2 items-center"
                        >
                            <input type="hidden" name="id" value={monitor.id} />
                            <div class="col-span-1"></div> <!-- Checkbox placeholder -->
                            <div class="col-span-1 flex justify-center">
                                <label
                                    class="cursor-pointer flex items-center gap-1 bg-black px-2 py-1 rounded border border-neutral-700"
                                >
                                    <input
                                        type="checkbox"
                                        name="active"
                                        checked={monitor.active}
                                        class="accent-green-500 w-4 h-4"
                                    />
                                    <span class="text-[10px] text-gray-400"
                                        >{$t.labels.on}</span
                                    >
                                </label>
                            </div>

                            <div class="col-span-3">
                                <input
                                    name="name"
                                    value={monitor.name}
                                    class="w-full bg-black border border-green-500/50 rounded px-2 py-1 text-sm text-white"
                                />
                            </div>

                            <div class="col-span-4">
                                <input
                                    name="url"
                                    value={monitor.url}
                                    class="w-full bg-black border border-green-500/50 rounded px-2 py-1 text-sm text-white"
                                />
                            </div>

                            <div class="col-span-2">
                                <select
                                    name="method"
                                    value={monitor.method}
                                    class="w-full bg-black border border-green-500/50 rounded px-1 py-1 text-xs text-white"
                                >
                                    <option>HEAD</option><option>GET</option
                                    ><option>POST</option>
                                </select>
                            </div>

                            <div class="col-span-2 flex justify-end gap-2">
                                <button
                                    type="submit"
                                    class="text-green-500 text-xs font-bold hover:underline"
                                    >{$t.admin.btn_save}</button
                                >
                                <button
                                    type="button"
                                    onclick={() => toggleEdit(monitor.id)}
                                    class="text-gray-500 text-xs hover:text-white"
                                    >{$t.admin.btn_cancel}</button
                                >
                            </div>
                        </form>
                    {:else}
                        <div class="grid grid-cols-12 items-center px-2 py-1">
                            <div class="col-span-1 flex justify-center items-center gap-2">
                                <input type="checkbox" 
                                    checked={selectedIds.includes(monitor.id)}
                                    onclick={() => toggleSelect(monitor.id)}
                                    class="rounded bg-neutral-800 border-neutral-700"
                                />
                                <div class="flex flex-col gap-0.5">
                                    <button type="button" onclick={() => pinToTop(index)} class="text-[10px] text-yellow-600 hover:text-yellow-400 leading-none" disabled={index === 0 || searchQuery !== ''} title={$t.admin.btn_pin}>📌</button>
                                    <button type="button" onclick={() => moveUp(index)} class="text-[10px] text-gray-600 hover:text-white leading-none" disabled={index === 0 || searchQuery !== ''}>▲</button>
                                    <button type="button" onclick={() => moveDown(index)} class="text-[10px] text-gray-600 hover:text-white leading-none" disabled={index === filteredMonitors.length - 1 || searchQuery !== ''}>▼</button>
                                </div>
                            </div>
                            <div class="col-span-1 flex justify-center">
                                {#if monitor.active}
                                    <span
                                        class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                                        title={$t.admin.status_active}
                                    ></span>
                                {:else}
                                    <span
                                        class="w-2 h-2 rounded-full bg-neutral-600 border border-neutral-500"
                                        title={$t.admin.status_paused}
                                    ></span>
                                {/if}
                            </div>

                            <div class="col-span-3 font-bold text-gray-200">
                                {monitor.name}
                            </div>
                            <div
                                class="col-span-3 text-xs text-gray-400 truncate pr-4"
                                title={monitor.url}
                            >
                                {monitor.url}
                            </div>
                            <div
                                class="col-span-2 text-xs font-mono bg-neutral-800 inline-block w-fit px-1 rounded text-gray-300"
                            >
                                {monitor.method}
                            </div>

                            <div
                                class="col-span-2 text-right flex justify-end gap-3"
                            >
                                <div class="flex gap-2">
                                    <button
                                        type="button"
                                        onclick={() => copyBadge(monitor)}
                                        class="text-xs text-neutral-500 hover:text-white mr-1 border border-neutral-800 px-1 rounded hover:bg-neutral-800 transition-colors"
                                        title={$t.labels.badge}
                                    >
                                        {$t.labels.badge}
                                    </button>
                                    <button
                                        type="button"
                                        onclick={() => toggleEdit(monitor.id)}
                                        class="text-blue-500 hover:text-blue-400 text-xs hover:underline"
                                        >{$t.admin.btn_edit}</button
                                    >
                                </div>
                                <form
                                    method="POST"
                                    action="?/delete"
                                    use:enhance
                                    class="inline"
                                >
                                    <input
                                        type="hidden"
                                        name="id"
                                        value={monitor.id}
                                    />
                                    <button
                                        class="text-red-500 hover:text-red-400 text-xs hover:underline"
                                        >{$t.admin.btn_del}</button
                                    >
                                </form>
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>
