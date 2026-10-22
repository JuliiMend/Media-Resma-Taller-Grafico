import { useEffect, useState } from "react";

export function useDebouncedValue<T>(valor: T, demora = 300): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(valor), demora);
    return () => clearTimeout(timer);
  }, [valor, demora]);

  return debounced;
}
