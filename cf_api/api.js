import { handleCreate } from './handlers/create';
import { handleInsert } from './handlers/insert';
import { handleDeleteTable } from './handlers/deleteTable';
import { handleGetAll } from './handlers/getAll';
import { handleGetNextSeasonRank } from './handlers/getNextSeasonRank';
import { handleGetNextWholeRank } from './handlers/getNextWholeRank';
import { handleGetSeasonScores } from './handlers/getSeasonScores';
import { handleGetWholeScores } from './handlers/getWholeScores';
import { handleUpdateWholeRank } from './handlers/updateWholeRank';
import { handleUpdateSeasonRank } from './handlers/updateSeasonRank';
import { loadHtml } from './handlers/loadHtml';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return await loadHtml(request, env);
    }

    if (url.pathname === '/api/create-table') {
      return handleCreate(request, env);
    }

    if (url.pathname === '/api/add-scores') {
      return handleInsert(request, env);
    }

    if (url.pathname === "/api/delete-scores-table") {
      return handleDeleteTable(request, env);
    }

    if (url.pathname === '/api/get-all') {
      return handleGetAll(env);
    }

    if (url.pathname === '/api/get-nextseasonrank') {
      return handleGetNextSeasonRank(url, env);
    }

    if (url.pathname === '/api/get-nextwholerank') {
      return handleGetNextWholeRank(url, env);
    }

    if (url.pathname === '/api/get-seasonscores') {
      return handleGetSeasonScores(request, env);
    }

    if (url.pathname === '/api/get-wholescores') {
      return handleGetWholeScores(request, env);
    }

    if (url.pathname === '/api/update-wholerank') {
      return handleUpdateWholeRank(request, env);
    }

    if (url.pathname === '/api/update-seasonrank') {
      return handleUpdateSeasonRank(request, env);
    }

    // Serve static assets for all other routes
    return env.ASSETS.fetch(request);
  },
};
