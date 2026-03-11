import { useEffect, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "./supabase"

import Home from "./pages/Home"
import Login from "./pages/Login"
import Signup from "./pages/Signup"

import HouseDetails from "./pages/HouseDetails"
import LandlordDashboard from "./pages/LandlordDashboard"
import Navbar from "./components/Navbar.jsx"

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!mounted) return

      setUser(session?.user || null)
      setAuthLoading(false)
    }

    initializeAuth()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user || null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (authLoading) {
    return <p style={{ padding: "20px" }}>Loading...</p>
  }

  return (
    <>
      <Navbar user={user} />

      <Routes>
        <Route path="/" element={<Home user={user} />} />

        <Route path="/login" element={<Login user={user} />} />

        <Route path="/signup" element={<Signup user={user} />} />

        <Route path="/house/:id" element={<HouseDetails user={user} />} />

       <Route
        path="/dashboard"
        element={user ? <LandlordDashboard user={user} /> : <Navigate to="/login" />}
       />

      </Routes>
    </>
  )
}

export default App