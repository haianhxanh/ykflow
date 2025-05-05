import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto py-10">
      <Skeleton className="mb-8 h-10 w-64" />
      <div className="rounded-md border">
        <div className="bg-muted h-96 w-full animate-pulse" />
      </div>
    </div>
  );
}
