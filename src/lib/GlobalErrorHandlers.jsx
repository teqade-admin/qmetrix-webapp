import { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { getErrorMessage, reportError } from '@/lib/error-utils';

export default function GlobalErrorHandlers() {
  useEffect(() => {
    const handleError = (event) => {
      reportError(event.error || event.message, 'Unhandled browser error');
      toast({
        variant: 'destructive',
        title: 'Unexpected error',
        description: getErrorMessage(event.error || event.message),
      });
    };

    const handleRejection = (event) => {
      reportError(event.reason, 'Unhandled async error');
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: getErrorMessage(event.reason, 'An unexpected async operation failed.'),
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
