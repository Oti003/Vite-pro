import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const {data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data?.user) {

      await supabase
        .from("login_events")
        .insert({
          user_id: data.user.id,
          email: data.user.email
        })

    }
    navigate("/")

    if (error) {
      alert(error.message);
    } else {
      navigate("/");
    }

    if (!error && data?.user) {

      await supabase
        .from("login_events")
        .insert({
          user_id: data.user.id,
          email: data.user.email
        })

      navigate("/")
    }
  };

  return (
    <div style={pageWrapper}>
      <div style={formCard}>

        <h1 style={{ marginBottom: "10px" }}>Find Your Next Home</h1>
        <p style={{ color: "#666", marginBottom: "25px" }}>
          Login to your Rhome account
        </p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={input}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
          />

          <button type="submit" style={loginBtn}>
            Login
          </button>

          <p style={{ marginTop: "15px", fontSize: "14px" }}>
           Don't have an account? <a href="/signup">Sign up</a>
        </p>
        </form>

      </div>
    </div>
  );
}

const pageWrapper = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  backgroundColor: "#f6f7f9"
};

const formCard = {
  background: "white",
  padding: "40px",
  borderRadius: "14px",
  width: "350px",
  boxShadow: "0 8px 25px rgba(0,0,0,0.08)"
};

const input = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "8px",
  border: "1px solid #ddd"
};

const loginBtn = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#111",
  color: "white",
  fontWeight: "600",
  cursor: "pointer"
};

export default Login;