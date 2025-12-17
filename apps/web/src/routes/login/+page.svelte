<script lang="ts">
    import { enhance } from "$app/forms";
    import { t } from "$lib/i18n";
    let { form } = $props(); // Svelte 5 语法
</script>

<div
    class="min-h-screen bg-[#0a0a0a] text-white font-mono flex items-center justify-center p-4 relative overflow-hidden"
>
    <div
        class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500/20 via-green-500 to-green-500/20"
    ></div>

    <div
        class="w-full max-w-md bg-neutral-900/80 border border-neutral-800 p-8 rounded-xl shadow-2xl backdrop-blur-sm"
    >
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-green-500 mb-2 tracking-tighter">
                LitePing_
            </h1>
            <p class="text-gray-500 text-xs uppercase tracking-[0.2em]">
                {$t.labels.secure_access}
            </p>
        </div>

        <form method="POST" use:enhance class="space-y-6">
            <div class="space-y-2">
                <label
                    for="password"
                    class="text-[10px] text-gray-400 font-bold tracking-widest uppercase"
                    >{$t.labels.passphrase}</label
                >
                <div class="relative">
                    <input
                        id="password"
                        type="password"
                        name="password"
                        placeholder="••••••••"
                        class="w-full bg-black border border-neutral-700 rounded px-4 py-3 focus:border-green-500 focus:shadow-[0_0_10px_rgba(34,197,94,0.2)] outline-none transition-all text-center tracking-widest text-white placeholder-neutral-800"
                        required
                    />
                </div>
            </div>

            {#if form?.incorrect}
                <div
                    class="flex items-center gap-2 text-red-400 text-xs justify-center bg-red-900/10 py-2 rounded border border-red-900/30 animate-pulse"
                >
                    <svg
                        class="w-4 h-4"
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
                    {$t.labels.access_denied}
                </div>
            {/if}

            <button
                class="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 rounded transition-all active:scale-[0.98] hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
            >
                {$t.labels.authenticate}
            </button>
        </form>

        <div class="mt-8 text-center border-t border-neutral-800 pt-6">
            <a
                href="/"
                class="text-xs text-gray-600 hover:text-green-500 transition-colors flex items-center justify-center gap-1"
            >
                <span>←</span>
                {$t.labels.return_dashboard}
            </a>
        </div>
    </div>
</div>
