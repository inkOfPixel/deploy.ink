import * as React from "react";
import { useNavigate } from "remix";

export function useRevalidate() {
  let navigate = useNavigate();
  return React.useCallback(() => {
    navigate(".", { replace: true });
  }, [navigate]);
}
