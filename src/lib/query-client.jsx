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
