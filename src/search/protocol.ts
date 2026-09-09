import type { Entry, Result } from './model.ts';
import type { PublicQuery } from './public-query.ts';

export type Request =
  | { type: 'init'; baseUrl: string }
  | { type: 'search'; requestId: number; query: PublicQuery }
  | { type: 'page'; requestId: number; windowId: number; offset: number; limit: number };

export type Response =
  | { type: 'ready'; count: number }
  | { type: 'result'; requestId: number; windowId: number; offset: number; total: number; rows: Entry[]; facets: Result['facets'] }
  | { type: 'error'; requestId?: number; message: string };
