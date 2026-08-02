import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { getErrorMessage, reportError } from '@/lib/error-utils';


export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			reportError({ error, queryKey: query.queryKey }, 'Data load failure');
			toast({
				variant: 'destructive',
				title: 'Could not load data',
				description: getErrorMessage(error),
			});
		},
	}),
	mutationCache: new MutationCache({
		// Failures already toast globally; successes were silent, so an action
		// like submitting a timesheet only "worked" if you noticed a number
		// change elsewhere. A mutation opts in by declaring
		//   meta: { successMessage: 'Timesheet submitted' }
		// or a function of (result, variables) when the wording depends on what
		// was done — one mutation often serves approve/reject/cancel.
		onSuccess: (data, variables, _context, mutation) => {
			const message = mutation?.meta?.successMessage;
			if (!message) return;
			const text = typeof message === 'function' ? message(data, variables) : message;
			if (text) toast({ title: text });
		},
		onError: (error) => {
			reportError(error, 'Data change failure');
			toast({
				variant: 'destructive',
				title: 'Could not save changes',
				description: getErrorMessage(error),
			});
		},
	}),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
		mutations: {
			retry: 0,
		},
	},
});
