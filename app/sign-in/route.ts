import {chatGPTSignInPath, safeRelativeReturnPath} from '../chatgpt-auth';
import {authPage} from '../../lib/auth-pages';

export function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('return_to') || '/tracker';
  const safePath = safeRelativeReturnPath(requested);
  const pathname = new URL(safePath, 'https://app.local').pathname.replace(/\/+$/, '');
  const destination = pathname === '/sign-in' || pathname === '/sign-out' ? '/tracker' : safePath;

  if (request.headers.get('oai-authenticated-user-id')) {
    return new Response(null, {
      status: 303,
      headers: { Location: destination, 'Cache-Control': 'private, no-store' },
    });
  }

  const signInPath = chatGPTSignInPath(destination);
  return authPage('sign-in', signInPath);
}
