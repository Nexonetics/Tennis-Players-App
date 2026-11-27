/**
 * Base URL of the backend API (FastAPI on AWS Lambda, us-east-1).
 * NEXT_PUBLIC_ variables are inlined at build time, so set NEXT_PUBLIC_API_URL before
 * `next build` to point a build at another backend (e.g. http://localhost:8000).
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://nc63xjpnqlcdhyektcwmj2lwgy0agsbh.lambda-url.us-east-1.on.aws'
).replace(/\/+$/, '');
