import { classNames } from "~/utils/styles";

export interface JobStatusBadgeProps {
  className?: string;
  status: string;
}

export function JobStatusBadge({ className, status }: JobStatusBadgeProps) {
  return (
    <span
      className={classNames(
        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
        status === "completed" && "bg-green-100 text-green-800",
        status === "failed" && "bg-red-100 text-red-800",
        status === "delayed" && "bg-yellow-100 text-yellow-800",
        status === "active" && "bg-blue-100 text-blue-800",
        status === "wait" && "bg-orange-100 text-orange-800",
        status === "paused" && "bg-purple-100 text-purple-800",
        status === "repeat" && "bg-gray-100 text-gray-800",
        className
      )}
    >
      {status}
    </span>
  );
}
