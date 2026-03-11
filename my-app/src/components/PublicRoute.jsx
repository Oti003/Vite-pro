import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

function PublicRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    getSession();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (session) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

export default PublicRoute;