import { lazy, Suspense, useEffect, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "./supabase"
import { Toaster } from "react-hot-toast"

const Home = lazy(() => import("./pages/Home"))
const Login = lazy(() => import("./pages/Login"))
const Signup = lazy(() => import("./pages/Signup"))
const HouseDetails = lazy(() => import("./pages/HouseDetails"))
const LandlordDashboard = lazy(() => import("./pages/LandlordDashboard"))
import Navbar from "./components/Navbar.jsx"
const Admin = lazy(() => import("./pages/Admin.jsx"))
const Locations = lazy(() => import("./pages/Locations.jsx"))
const LocationResults = lazy(() => import("./pages/LocationResults"))


function App() {
  const ADMIN_EMAIL = "silymily003@gmail.com"
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
      <Toaster position="top-right" />
      <Navbar user={user} />

      <Suspense fallback={<p style={{ padding: "20px" }}>Loading page...</p>}>
        <Routes>
          <Route path="/" element={<Home user={user} />} />

          <Route 
          path="/login" element={<Login user={user} />} />

          <Route
           path="/signup" element={<Signup user={user} />} 
          />

          <Route path="/house/:id" element= {<HouseDetails user={user} />}
          />

         <Route
           path="/dashboard"
           element={user ? <LandlordDashboard  user={user} /> : <Navigate to="/login" 
           />}
         />

          <Route
            path="/admin"
            element={
              user
                ? (user.email === ADMIN_EMAIL
                    ? <Admin user={user} />
                    : <Navigate to="/" />
                  )
                : <Navigate to="/login" />
            }
          />

          < Route path="/locations" element= {<Locations />} 
          />
          < Route path="/locations/:location" element={<LocationResults />} 
          />    

        </Routes>
      </Suspense>
    </>
  )
}

export default App
