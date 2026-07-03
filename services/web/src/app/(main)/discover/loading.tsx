import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
 return (
 <div className="flex h-full items-center justify-center p-6">
 <div className="w-full max-w-md space-y-4">
 <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
 <div className="flex justify-center gap-4">
 <Skeleton className="h-14 w-14 rounded-full" />
 <Skeleton className="h-14 w-14 rounded-full" />
 <Skeleton className="h-14 w-14 rounded-full" />
 </div>
 </div>
 </div>
 );
}
