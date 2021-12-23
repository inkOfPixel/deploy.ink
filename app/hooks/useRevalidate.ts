import * as React from "react";
import { useNavigate } from "remix";
// import { useNavigate } from "react-router-dom";

export function useRevalidate() {
  let navigate = useNavigate();
  return React.useCallback(() => {
    navigate(".", { replace: true });
  }, [navigate]);
}
