import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import UserIcon from "../assets/User_icon.png"
import RhomeLogo from "../assets/Rhome_logo.png"
import HomeIcon from "../assets/Home_icon.png"

function Navbar({ user }) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const ADMIN_EMAIL = "silymily003@gmail.com"

  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 80) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  function handleLogout() {
    localStorage.removeItem("user")
    navigate("/")
    window.location.reload()
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <nav
      style={{
        position: "absolute",
        top: "25px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "85%",
        maxWidth: "1200px",
        padding: "12px 28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        backdropFilter: scrolled ? "none" : "blur(14px)",

        backgroundColor: scrolled
          ? "rgba(255,255,255,0.96)"
          : "rgba(245,245,245,0.35)",

        border: scrolled
          ? "1px solid rgba(0,0,0,0.08)"
          : "1px solid rgba(255,255,255,0.18)",

        boxShadow: scrolled
          ? "0 10px 30px rgba(0,0,0,0.08)"
          : "none",

        borderRadius: "18px",
        zIndex: 1000,
        transition: "all 0.4s ease"
      }}
    >
      {/* Rhome Logo */}
      <img
        src={RhomeLogo}
        alt="Rhome"
        onClick={() => navigate("/")}
        style={{
          height: "54px",
          cursor: "pointer",
          borderRadius: "8px"
        }}
      />

      {/* Right Side Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>

        {/* Home Icon */}
        <img
          src={HomeIcon}
          alt="Home"
          onClick={() => navigate("/")}
          style={{
            height: "26px",
            cursor: "pointer",
            opacity: 0.9,
            transition: "all 0.25s ease",
            opacity: 1.0
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        />

        {/* Dashboard for Landlords */}
        {user && (
        <div ref={dropdownRef} style={{ position: "relative" }}>
          
          {/* Account Button */}
          <img
            src={UserIcon}
            alt="Account"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              height: "30px",
              padding: "6px",
              borderRadius: "50%",
              background: "rgba(0,0,0,0.09)",
              cursor: "pointer",
              opacity: 1.0,
              transition: "all 0.25s ease"
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              />

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "40px",
                background: "white",
                borderRadius: "10px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                minWidth: "150px",
                zIndex: 1000
              }}
            >

              {/* Dashboard */}
              {user && (
                <button
                  onClick={() => {
                    navigate("/dashboard")
                    setMenuOpen(false)
                  }}
                  style={{
                    padding: "8px",
                    border: "none",
                    background: "#f5f5f5",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                >
                  Dashboard
                </button>
              )}

              {/* Sign Out */}
              <button
                onClick={() => {
                  handleLogout()
                  setMenuOpen(false)
                }}
                style={{
                  padding: "8px",
                  border: "none",
                  background: "#ffeaea",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: "#c0392b"
                }}
              >
               log Out
              </button> 

               {user?.email === ADMIN_EMAIL && (
                <button onClick={() => navigate("/Admin")}
                 style={{
                  padding: "8px",
                  border: "none",
                  background: "#ffeaea",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: "#287ee1"
                }}
                >
                  Admin
                </button>
              )}
              
              

            </div>
          )}

        </div>
      )}
      

      </div>
    </nav>
  )
}

export default Navbar