import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
 return (
 <div className="h-full p-6 space-y-6">
 <Skeleton className="h-8 w-48" />
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="rounded-xl border p-5 space-y-4">
 <Skeleton className="h-5 w-32" />
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-3/4" />
 <Skeleton className="h-10 w-28" />
 </div>
 ))}
 </div>
 </div>
 );
}
