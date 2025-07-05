export async function loadHtml(request, env) {
  const assetRequest = new Request(new URL('/index.html', request.url), request);
  return env.ASSETS.fetch(assetRequest);
}
