import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
 return (
 <div className="mx-auto max-w-2xl space-y-6 p-6">
 {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="rounded-xl border p-4 space-y-4">
 <div className="flex items-center gap-3">
 <Skeleton className="h-10 w-10 rounded-full" />
 <div className="space-y-1">
 <Skeleton className="h-4 w-28" />
 <Skeleton className="h-3 w-16" />
 </div>
 </div>
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-5/6" />
 <Skeleton className="aspect-video w-full rounded-lg" />
 <div className="flex gap-4">
 <Skeleton className="h-8 w-16" />
 <Skeleton className="h-8 w-16" />
 <Skeleton className="h-8 w-16" />
 </div>
 </div>
 ))}
 </div>
 );
}
