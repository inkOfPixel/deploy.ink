import * as React from "react";
import { useRevalidate } from "./useRevalidate";

export function useRevalidateOnInterval(intervalMillis: number = 5000) {
  let revalidate = useRevalidate();
  React.useEffect(() => {
    let interval = setInterval(revalidate, intervalMillis);
    return () => clearInterval(interval);
  }, [revalidate]);
}
