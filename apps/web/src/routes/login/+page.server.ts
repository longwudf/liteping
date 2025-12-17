import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const actions = {
  default: async ({ request, cookies, url }) => {
    const data = await request.formData();
    const password = data.get('password') as string;
    const correctPassword = env.ADMIN_PASSWORD;

    // 🔐 密码比对
    if (password && password === correctPassword) {
      // ✅ 登录成功：下发 HttpOnly Cookie
      cookies.set('liteping_session', password, {
        path: '/',          // 全站有效
        httpOnly: true,     // 前端 JS 读不到 (安全!)
        sameSite: 'strict', // 防 CSRF
        secure: process.env.NODE_ENV === 'production', // 生产环境必须 HTTPS
        maxAge: 60 * 60 * 24 * 7 // 7天免登录
      });

      // 跳回之前的页面，或者默认去 admin
      throw redirect(303, url.searchParams.get('redirectTo') || '/admin');
    }

    // ❌ 登录失败
    return fail(400, { incorrect: true });
  }
};