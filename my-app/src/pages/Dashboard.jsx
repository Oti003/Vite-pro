import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

function Dashboard() {

  <div className="container">
    <h1>Find Your Next Home</h1>
  </div>  

  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Dashboard</h1>

      <button
        onClick={handleLogout}
        style={{
          padding: "10px 20px",
          marginTop: "20px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default Dashboard;