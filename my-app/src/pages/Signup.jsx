import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabase";

function Signup() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("tenant");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const user = data.user;

    await supabase.from("profiles").insert([
      {
        id: user.id,
        email: email,
        role: role
      }
    ]);

    await supabase.from("profiles").insert([
    {
      id: data.user.id,
      email: email
    }
    ])

    navigate("/dashboard");
  };

  return (
    <div style={styles.page}>

      <div style={styles.card}>
        <h1 style={styles.title}>Create Your Rhome Account</h1>

        <form onSubmit={handleSignup} style={styles.form}>

          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
          />

          <div style={styles.roleContainer}>

            <div
              style={{
                ...styles.roleCard,
                ...(role === "tenant" ? styles.selectedCard : {})
              }}
              onClick={() => setRole("tenant")}
            >
              <h3>🏠 Tenant</h3>
              <p>Find and save homes</p>
            </div>

            <div
              style={{
                ...styles.roleCard,
                ...(role === "landlord" ? styles.selectedCard : {})
              }}
              onClick={() => setRole("landlord")}
            >
              <h3>🏢 Landlord</h3>
              <p>List and manage properties</p>
            </div>

          </div>

          <button style={styles.button} type="submit">
            Create Account
          </button>

        </form>

        <p style={styles.loginText}>
          Already have an account? <Link to="/login">Login</Link>
        </p>

      </div>

    </div>
  );
}

const styles = {

  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "90vh",
    backgroundColor: "#f4f6f8"
  },

  card: {
    background: "white",
    padding: "40px",
    borderRadius: "12px",
    width: "350px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
  },

  title: {
    marginBottom: "25px",
    textAlign: "center"
  },

  form: {
    display: "flex",
    flexDirection: "column"
  },

  input: {
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "14px"
  },

  label: {
    marginBottom: "6px",
    fontSize: "14px"
  },

  select: {
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "6px",
    border: "1px solid #ddd"
  },

  button: {
    padding: "12px",
    border: "none",
    background: "#2c7be5",
    color: "white",
    fontWeight: "bold",
    borderRadius: "6px",
    cursor: "pointer"
  },

  loginText: {
    marginTop: "15px",
    textAlign: "center",
    fontSize: "14px"
  },

    roleContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px"
  },

  roleCard: {
    flex: 1,
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "15px",
    textAlign: "center",
    cursor: "pointer",
    background: "#fafafa"
  },

  selectedCard: {
    border: "2px solid #2c7be5",
    background: "#eef4ff"
  },

};

export default Signup;