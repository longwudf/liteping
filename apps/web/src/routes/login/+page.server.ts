import { fail, redirect } from '@sveltejs/kit';
import {
  createAdminSession,
  getAdminPassword,
  safeRedirectPath,
  setAdminSessionCookie
} from '$lib/server/auth';

export const actions = {
  default: async ({ request, cookies, url }) => {
    const data = await request.formData();
    const password = data.get('password') as string;
    const correctPassword = getAdminPassword();

    if (!correctPassword) {
      return fail(500, { notConfigured: true });
    }

    if (password && password === correctPassword) {
      const session = await createAdminSession();
      setAdminSessionCookie(cookies, session, url.protocol === 'https:');

      throw redirect(303, safeRedirectPath(url.searchParams.get('redirectTo')));
    }

    return fail(400, { incorrect: true });
  }
};
