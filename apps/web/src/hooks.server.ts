import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  let lang = 'en'; // 默认保底

  try {
    // 1. 获取 URL 参数 ?lang=zh
    const queryLang = event.url.searchParams.get('lang');
    // 2. 获取 Cookie
    const cookieLang = event.cookies.get('liteping_lang');
    // 3. 获取浏览器 Header (Accept-Language)
    const headerLang = event.request.headers.get('accept-language');

    // 优先级策略
    if (queryLang && ['en', 'zh', 'ja'].includes(queryLang)) {
      lang = queryLang;
    } else if (cookieLang && ['en', 'zh', 'ja'].includes(cookieLang)) {
      lang = cookieLang;
    } else if (headerLang) {
      // 模糊匹配浏览器语言
      if (headerLang.includes('zh')) lang = 'zh';
      else if (headerLang.includes('ja')) lang = 'ja';
    }
  } catch (e) {
    // 忽略错误
  }

  // 注入 locals
  event.locals.lang = lang;

  return await resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%lang%', lang)
  });
};