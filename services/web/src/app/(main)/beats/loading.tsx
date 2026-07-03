import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
 return (
 <div className="h-full p-6 space-y-6">
 <Skeleton className="h-8 w-36" />
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 {Array.from({ length: 8 }).map((_, i) => (
 <div key={i} className="space-y-3">
 <Skeleton className="aspect-square w-full rounded-lg" />
 <Skeleton className="h-4 w-3/4" />
 <Skeleton className="h-3 w-1/2" />
 </div>
 ))}
 </div>
 </div>
 );
}
