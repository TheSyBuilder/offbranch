/// <reference lib="webworker" />
import { createSearchEngine } from '../lib/search';
import type { SearchWorkerInput, SearchWorkerOutput } from '../types';

let engine: ReturnType<typeof createSearchEngine> | undefined;
function send(message: SearchWorkerOutput): void { self.postMessage(message); }
self.onmessage = (event: MessageEvent<SearchWorkerInput>) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      engine = createSearchEngine(message.catalog, message.related, message.translations);
      send({ type: 'ready' });
    } else {
      if (!engine) throw new Error('The search index is not ready yet.');
      send({ type: 'result', payload: engine.search(message.payload) });
    }
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : 'Search could not be completed.', requestId: message.type === 'search' ? message.payload.requestId : undefined });
  }
};
