import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
 return (
 <div className="flex h-full">
 <div className="w-80 border-r p-4 space-y-4">
 <Skeleton className="h-10 w-full" />
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="flex items-center gap-3">
 <Skeleton className="h-12 w-12 rounded-full" />
 <div className="flex-1 space-y-2">
 <Skeleton className="h-4 w-24" />
 <Skeleton className="h-3 w-40" />
 </div>
 </div>
 ))}
 </div>
 <div className="flex-1 flex flex-col p-4">
 <Skeleton className="h-12 w-full" />
 <div className="flex-1" />
 <Skeleton className="h-10 w-full" />
 </div>
 </div>
 );
}
