// Test fixture: a custom React hook
import { useState, useEffect, useCallback } from "react";
import { fetchData } from "@/lib/api";
import type { DataItem } from "@/types/data";

export function useCounter(initial: number = 0) {
  const [count, setCount] = useState(initial);
  const [data, setData] = useState<DataItem[]>([]);

  useEffect(() => {
    fetchData().then(setData);
  }, []);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  const reset = useCallback(() => setCount(initial), [initial]);

  return { count, increment, decrement, reset, data };
}
