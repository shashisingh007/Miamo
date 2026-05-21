import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
 return (
 <div className="h-full p-6 space-y-6">
 <Skeleton className="h-8 w-40" />
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="rounded-xl border p-4 flex items-center gap-4">
 <Skeleton className="h-16 w-16 rounded-full" />
 <div className="flex-1 space-y-2">
 <Skeleton className="h-5 w-28" />
 <Skeleton className="h-3 w-20" />
 </div>
 <Skeleton className="h-9 w-20 rounded-md" />
 </div>
 ))}
 </div>
 </div>
 );
}
