import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage, reportError } from '@/lib/error-utils';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError({ error, info }, 'Render failure');
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full rounded-xl border bg-card p-6 shadow-sm text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">This page could not be loaded</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {getErrorMessage(this.state.error, 'An unexpected rendering error occurred.')}
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={this.reset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Button onClick={() => window.location.reload()}>Reload app</Button>
          </div>
        </div>
      </div>
    );
  }
}
