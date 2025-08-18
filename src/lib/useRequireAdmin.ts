import { useEffect, useState } from "react";
import { getIdTokenResult, User } from "firebase/auth";
import { waitForUser } from "./waitForUser";

export function useRequireAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await waitForUser();
        const { claims } = await getIdTokenResult(u, true);
        if (!claims.admin) throw new Error("Admins only");
        if (alive) setUser(u);
      } catch (e: any) {
        if (alive) setError(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { user, loading, error };
}
