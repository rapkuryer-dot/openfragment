import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  clearBootReloadFlag,
  isChunkLoadError,
  tryReloadOnceForChunkError,
} from '../bootRecovery';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[OPENFRAGMENT] Render error', error, info.componentStack);
  }

  private handleRetry = (): void => {
    if (this.state.error && isChunkLoadError(this.state.error)) {
      if (tryReloadOnceForChunkError()) return;
    }
    clearBootReloadFlag();
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-white text-[#0A0A0B]">
          <p className="font-display text-xl font-bold tracking-tight">
            Something went wrong
          </p>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            The page did not load correctly. Reload to try again.
          </p>
          <Button
            type="button"
            className="rounded-full h-11 px-6 font-bold"
            style={{ background: '#0098EA' }}
            onClick={this.handleRetry}
          >
            Reload page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
