export const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8000/';
  // Remove trailing slash from baseUrl and leading slash from url if necessary
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  
  return `${cleanBase}${cleanUrl}`;
};
