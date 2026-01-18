import type { ReactNode } from 'react';

declare module 'react' {
  interface FunctionComponent<P = {}> {
    (props: P, context?: any): ReactNode;
  }
}
