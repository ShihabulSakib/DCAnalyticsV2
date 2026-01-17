import React from 'react';

const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`}
            {...props}
        />
    );
};

export default Skeleton;
