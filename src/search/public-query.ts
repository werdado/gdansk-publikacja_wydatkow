import type { Query } from './model.ts';
export type PublicQuery = Pick<Query, 'text' | 'columns' | 'filters' | 'sort'>;
export function publicQuery(query: PublicQuery): Query {
  return { ...query, scope: 'global', profile: 'one', combine: 'AND' };
}
