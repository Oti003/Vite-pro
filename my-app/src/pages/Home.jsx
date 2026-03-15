import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import HouseCard from "../components/HouseCard"
import HeroImage from "../assets/Hero_Image.jpg"


function Home({ user }) {
  const limit = 16
  const fetchingRef = useRef(false)

  const [scrolled, setScrolled] = useState(false)
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [savedIds, setSavedIds] = useState([])

  const [locationFilter, setLocationFilter] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [bedroomsFilter, setBedroomsFilter] = useState("")

  const [debouncedLocation, setDebouncedLocation] = useState("")
  const [debouncedMinPrice, setDebouncedMinPrice] = useState("")
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState("")
  const [debouncedBedrooms, setDebouncedBedrooms] = useState("")

  const navigate = useNavigate()

  const locations = [
    "All Locations",
    "Westlands",
    "Kilimani",
    "Kileleshwa",
    "Runda",
    "Kasarani",
    "Roysambu",
    "Ruaka"
  ]

  // ---------------- THEME (Luxury System) ----------------
  const theme = {
    background: "#f8f7f5",
    card: "#ffffff",
    textPrimary: "#111111",
    textSecondary: "#6e6e6e",
    accent: "#1a1a1a",
    borderRadius: "18px",
    shadowSoft: "0 25px 60px rgba(0,0,0,0.06)"
  }

  function handleSearch() {
    setHasMore(true)
    setOffset(0)
    fetchHouses(true)
  }

  // ---------------- DEBOUNCE ----------------
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedLocation(locationFilter)
      setDebouncedMinPrice(minPrice)
      setDebouncedMaxPrice(maxPrice)
      setDebouncedBedrooms(bedroomsFilter)
    }, 500)

    return () => clearTimeout(timeout)
  }, [locationFilter, minPrice, maxPrice, bedroomsFilter])

 useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 80)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, []) 

  // ---------------- LOAD SAVED ----------------
  useEffect(() => {
    if (user) loadSavedHouses(user.id)
    else setSavedIds([])
  }, [user])

  async function loadSavedHouses(userId) {
    const { data } = await supabase
      .from("saved_houses")
      .select("house_id")
      .eq("user_id", userId)

    setSavedIds(data?.map(item => item.house_id) || [])
  }

  // ---------------- FETCH ----------------
  async function fetchHouses(reset = false) {
    if (!hasMore && !reset) return
    if (fetchingRef.current) return

    fetchingRef.current = true
    setLoading(true)

    let query = supabase
      .from("houses")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .range(reset ? 0 : offset, (reset ? 0 : offset) + limit - 1)

    if (debouncedLocation.trim())
      query = query.ilike("location", `%${debouncedLocation}%`)

    if (debouncedMinPrice)
      query = query.gte("price", parseInt(debouncedMinPrice))

    if (debouncedMaxPrice)
      query = query.lte("price", parseInt(debouncedMaxPrice))


    if (bedroomsFilter)
      query = query.eq("bedrooms", parseInt(debouncedBedrooms))

    const { data, error } = await query

    if (error) {
      console.log(error)
      setLoading(false)
      fetchingRef.current = false
      return
    }

    if (data.length < limit) setHasMore(false)

    setHouses(prev => (reset ? data : [...prev, ...data]))
    setOffset(prev => (reset ? data.length : prev + data.length))

    setLoading(false)
    fetchingRef.current = false
  }

  useEffect(() => {
    setHouses([])     // clears results immediately
    setHasMore(true)
    setOffset(0)
    fetchHouses(true)
  }, [
    debouncedLocation,
    debouncedMinPrice,
    debouncedMaxPrice,
    debouncedBedrooms
  ])


  // ---------------- INFINITE SCROLL ----------------
  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY
      const windowHeight = window.innerHeight
      const fullHeight = document.documentElement.scrollHeight

      if (scrollTop + windowHeight >= fullHeight - 1200 && !loading && hasMore) {
        fetchHouses()
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [loading, hasMore])


  // ---------------- UI ----------------
  return (
  <div style={{ background: theme.background, minHeight: "100vh" }}>
    
    {/* HERO SECTION */}
    <div
      style={{
        position: "relative",
        height: "75vh",
        width: "100%",
        backgroundImage: `url(${HeroImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
     
      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.45)"
        }}
      />

      {/* Hero Content */}
      <div
        style={{
          position: "relative",
          textAlign: "center",
          color: "#fff",
          padding: "0 20px"
        }}
      >
        
        <h1
          style={{
            fontSize: "52px",
            fontWeight: "600",
            letterSpacing: "1px",
            marginBottom: "8px",
            marginTop: "74px"
          }}
        >
          Refined Homes. Elevated Living.
        </h1>

        <p
          style={{
            fontSize: "18px",
            opacity: 0.9,
            letterSpacing: "0.5px"
          }}
        >
          Discover premium residences curated for modern professionals.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "16px",
            borderRadius: "16px",
            backdropFilter: "blur(12px)",
            background: "rgba(255,255,255,0.25)",
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
          }}
        >
          
          <div style={searchBar}>
            <input
              type="text"
              placeholder="Location"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              style={luxuryInput}
            />

            <input
              type="number"
              placeholder="Min Price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              style={{
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                width: "140px"
              }}         
            
            />

            <input
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              style={{
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                width: "140px"
              }}         
            />

            {
            /*
            <input
              type="text"
              placeholder="Amenities (wifi, parking, gym)"
              value={amenitiesFilter}
              onChange={(e) => setAmenitiesFilter(e.target.value)}
              style={luxuryInput}
            />
            */
            }
            <select
              value={bedroomsFilter}
              onChange={(e) => setBedroomsFilter(e.target.value)}
              style={luxuryInput}
            >
              <option value="">Bedrooms</option>
              <option value="0">Bedsitter </option>
              <option value="1">1 Bedroom</option>
              <option value="2">2 Bedrooms</option>
              <option value="3">3 Bedrooms</option>
              <option value="4">4 Bedrooms</option>
            </select>

          <button
            onClick={handleSearch}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              background: "#111",
              color: "white",
              cursor: "pointer",
              fontWeight: "600"
            }}
        >
            Search
          </button>
          </div>

        </div>

      </div>

      
    </div>


    {/* MAIN CONTENT BELOW HERO */}
    <div 
    style={{
     padding: "60px 80px",
     
     }}>

      {/* Listings */}
      {/* Skeleton loading cards */}
      {loading && houses.length === 0 && (
        <div
          style={{
            marginTop: "40px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "40px"
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                height: "280px",
                borderRadius: "18px",
                background: "#eee",
                animation: "pulse 1.5s infinite"
              }}
            />
          ))}
        </div>
      )}

      {/* Actual houses */}
      <div
        style={{
          marginTop: "40px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "40px"
        }}
      >
        {houses.map(house => (
          <HouseCard
            key={house.id}
            house={house}
            user={user}
            savedIds={savedIds}
            setSavedIds={setSavedIds}
            theme={theme}
          />
        ))}
      </div>

    </div>

    {/* BOTTOM ACTION BAR */}
    <div
      style={{
        marginTop: "80px",
        padding: "30px 0",
        borderTop: "1px solid #e8e8e8",
        display: "flex",
        justifyContent: "center",
        gap: "40px",
        alignItems: "center",
        fontSize: "14px",
        letterSpacing: "1px"
      }}
    >
     

      {/* Login / Logout */}
      {user ? (
        <span
          onClick={async () => {
            await supabase.auth.signOut()
            navigate("/")
          }}
          style={bottomLink}
        >
          Log-out
        </span>
      ) : (
        <span
          onClick={() => navigate("/login")}
          style={bottomLink}
        >
          Log-in
        </span>        
      )}
      <span
        style={bottomLink}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#e6e6e6"
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "#f2f2f2"
        }}
      >
      </span>

    </div>
    </div>
    
    )
}

const luxuryInput = {
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #e5e5e5",
  fontSize: "14px",
  outline: "none",
  transition: "all 0.3s ease",
  minWidth: "160px"
  
}

const bottomLink = {
  cursor: "pointer",
  padding: "10px 18px",
  backgroundColor: "#f2f2f2",
  borderRadius: "10px",
  letterSpacing: "1px",
  fontSize: "13px",
  transition: "all 0.25s ease"
}

const searchBar = {
  display: "flex",
  gap: "12px",
  justifyContent: "center",
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: "20px",
  padding: "18px",
  background: "rgba(255,255,255,0.9)",
  borderRadius: "14px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
}

export default Home