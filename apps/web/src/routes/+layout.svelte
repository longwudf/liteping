<script lang="ts">
	import "../app.css";
	import { page } from "$app/stores";
	import { locale, locales, toggleLocale, type Locale, t } from "$lib/i18n";

	// 🔥 修复 2：恢复语言同步逻辑 (之前被注释掉了)
	// 当后端(Hooks)检测到语言变化时，同步给前端 Store
	$: if ($page.data.lang) {
		locale.set($page.data.lang as Locale);
	}
</script>

<svelte:head>
	<title>{$page.data.settings?.site_title || $t.title}</title>
	<meta name="description" content={$page.data.settings?.site_desc || $t.description} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={$page.url.href} />
	<meta property="og:title" content={$page.data.settings?.site_title || $t.title} />
	<meta property="og:description" content={$page.data.settings?.site_desc || $t.description} />
	<meta
		property="og:image"
		content="https://placehold.co/1200x630/0a0a0a/22c55e.png?text={$page.data.settings?.site_title || 'LitePing'}"
	/>

	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:url" content={$page.url.href} />
	<meta property="twitter:title" content={$page.data.settings?.site_title || $t.title} />
	<meta property="twitter:description" content={$page.data.settings?.site_desc || $t.description} />
	<meta
		property="twitter:image"
		content="https://placehold.co/1200x630/0a0a0a/22c55e.png?text={$page.data.settings?.site_title || 'LitePing'}"
	/>
</svelte:head>

<div class="min-h-screen bg-[#0a0a0a] text-white font-mono flex flex-col">
	<header class="border-b border-neutral-800 p-4">
		<div class="max-w-5xl mx-auto flex justify-between items-center">
			<a
				href="/"
				class="text-xl font-bold text-green-500 tracking-tighter hover:text-green-400"
				>{$page.data.settings?.site_title || 'LitePing_'}</a
			>

			<div class="flex items-center gap-4">
				{#if $page.url.pathname.startsWith("/admin")}
					<span class="text-xs text-neutral-500">ADMIN</span>
				{/if}

				<div class="relative group">
					<select
						class="appearance-none bg-neutral-900 border border-neutral-800 text-xs text-gray-400 py-1 pl-2 pr-6 rounded hover:border-neutral-700 focus:outline-none cursor-pointer"
						value={$locale}
						on:change={(e) => toggleLocale(e.currentTarget.value)}
					>
						{#each locales as l}
							<option value={l.code}>{l.flag} {l.name}</option>
						{/each}
					</select>
					<div
						class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"
					>
						<svg
							class="h-3 w-3"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/></svg
						>
					</div>
				</div>
			</div>
		</div>
	</header>

	<main class="flex-1">
		<slot />
	</main>

	<footer
		class="border-t border-neutral-800 p-8 mt-12 flex flex-col items-center gap-4 text-xs text-neutral-600"
	>
		<p>{$page.data.settings?.footer_text || `LitePing_ v2.0 © ${new Date().getFullYear()}`}</p>
		<a
			href="/rss.xml"
			target="_blank"
			class="flex items-center gap-2 hover:text-orange-500 transition-colors group"
		>
			<svg
				class="w-4 h-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z"
				></path>
			</svg>
			<span class="group-hover:underline">{$t.footer.subscribe_rss}</span>
		</a>
	</footer>
</div>
