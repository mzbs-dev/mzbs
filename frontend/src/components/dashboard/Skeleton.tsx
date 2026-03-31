export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            className={`animate-pulse bg-gray-200 rounded-md ${className}`}
            {...props}
        />
    );
};

// 
export const ChartSkeleton = ({ height = "h-64" }: { height?: string }) => {
    return (
        <div className={`w-full ${height} flex flex-col gap-4`}>
            <Skeleton className="w-full h-full rounded-md" />
        </div>
    );
};

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => {
    return (
        <div className="w-full mt-6">
            {/* Header */}
            <div className="flex gap-4 mb-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/4" />
            </div>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4 mb-2">
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-6 w-1/4" />
                </div>
            ))}
        </div>
    );
};

export const CardsSkeleton = () => {
    return (
        <div className="grid grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
        </div>
    );
};