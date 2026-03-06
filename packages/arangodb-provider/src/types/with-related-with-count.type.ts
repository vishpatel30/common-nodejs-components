import { WithCount } from './with-count.type';

export type WithRelatedWithCount<T, R> = T & { related: WithCount<R> };
