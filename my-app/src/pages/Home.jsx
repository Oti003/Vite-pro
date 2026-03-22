import { useEffect, useState, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "../supabase"
import HouseCard from "../components/HouseCard"
import HeroImage from "../assets/Hero_Image.jpg"

function Home({ user }) {

  const limit = 16
  const fetchingRef = useRef(false)

  const [houses, setHouses] = useState([])
  const [savedIds, setSavedIds] = useState([])

  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  const [recentlyViewed,setRecentlyViewed] = useState([])

  const [locationFilter, setLocationFilter] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [bedroomsFilter, setBedroomsFilter] = useState("")

  const [debouncedLocation, setDebouncedLocation] = useState("")
  const [debouncedMinPrice, setDebouncedMinPrice] = useState("")
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState("")
  const [debouncedBedrooms, setDebouncedBedrooms] = useState("")

  const navigate = useNavigate()
  const [trendingHouses, setTrendingHouses] = useState([])
  const loaderRef = useRef(null)

    const featuredHouses = houses.filter(
    h =>
      h.is_featured &&
      h.featured_until &&
      new Date(h.featured_until) > new Date() &&
      h.status === "available" &&
      h.approval_status === "approved"
  )

  const normalHouses = houses.filter(
    h =>
      h.status === "available" &&
      h.approval_status === "approved" &&
      (
        !h.is_featured ||
        !h.featured_until ||
        new Date(h.featured_until) < new Date()
      )
  )
 

  // ---------------- THEME ----------------
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

  function clearFilters() {
    setLocationFilter("")
    setMinPrice("")
    setMaxPrice("")
    setBedroomsFilter("")
    
    setOffset(0)
    setHasMore(true)

    fetchHouses(true) // 🔥 reload fresh data
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

  // ---------------- LOAD SAVED ----------------
  async function loadSavedHouses(userId) {
    const { data } = await supabase
      .from("saved_houses")
      .select("house_id")
      .eq("user_id", userId)

    setSavedIds(data?.map(item => item.house_id) || [])
  }

  // ---------------- FETCH FEATURED ----------------
  async function fetchFeatured() {

    const { data } = await supabase
      .from("houses")
      .select("*")
      .eq("approval_status", "approved")
      .eq("status", "available")
      .eq("is_featured",true)
      .limit(6)


  }

  // ---------------- FETCH HOUSES ----------------
  async function fetchHouses(reset = false) {

    if (!hasMore && !reset) return
    if (fetchingRef.current) return

    fetchingRef.current = true
    setLoading(true)

    let query = supabase
      .from("houses")
      .select("*")
      .eq("approval_status", "approved")
      .eq("status", "available")
      .order("created_at",{ ascending:false })
      .range(reset ? 0 : offset, (reset ? 0 : offset) + limit - 1)

    if (debouncedLocation.trim())
      query = query.ilike("location", `%${debouncedLocation}%`)

    if (debouncedMinPrice && !isNaN(debouncedMinPrice))
      query = query.gte("price", parseInt(debouncedMinPrice))

    if (debouncedMaxPrice && !isNaN(debouncedMaxPrice))
      query = query.lte("price", parseInt(debouncedMaxPrice))

    if (debouncedBedrooms)
      query = query.eq("bedrooms", parseInt(debouncedBedrooms))


    const { data, error } = await query
    if (error) {
      console.log(error)
      setLoading(false)
      fetchingRef.current = false
      return
    }

    if (!data){
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

  async function loadTrending() {
    const { data, error } = await supabase
      .from("houses")
      .select("*")
      .eq("approval_status", "approved")
      .eq("status", "available")
      .order("views", { ascending: false })
      .limit(3)

    if (error) {
      console.log(error)
      return
    }

    setTrendingHouses(data || [])
  }

  // ---------------- INITIAL LOAD ----------------
  useEffect(()=>{
    fetchFeatured()
  },[])

  useEffect(()=>{
    setHouses([])
    setHasMore(true)
    setOffset(0)
    fetchHouses(true)
  },[
    debouncedLocation,
    debouncedMinPrice,
    debouncedMaxPrice,
    debouncedBedrooms
  ])

  useEffect(()=>{
    if(user) loadSavedHouses(user.id)
    else setSavedIds([])
  },[user])

  useEffect(() => {
    fetchHouses()
    loadTrending()
  }, [])


  // ---------------- INFINITE SCROLL ---------------- 
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]

        if (
          entry.isIntersecting &&
          hasMore &&
          !fetchingRef.current
        ) {
          fetchHouses()
        }
      },
      {
        root: null,
        rootMargin: "200px", // 🔥 preload before reaching bottom
        threshold: 0
      }
    )

    const currentRef = loaderRef.current

    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) observer.unobserve(currentRef)
    }
  }, [hasMore])
  
  
  useEffect(() => {
    async function loadRecentlyViewed() {
      const viewed = JSON.parse(localStorage.getItem("recentlyViewed")) || []

      if (viewed.length === 0) {
        setRecentlyViewed([])
        return
      }

      // extract ids
      const ids = viewed.map(h => h.id)

      const { data, error } = await supabase
        .from("houses")
        .select("*")
        .in("id", ids)
        .eq("status", "available")
        .eq("approval_status", "approved")
         

      if (error) {
        console.log(error)
        return
      }

      setRecentlyViewed(data || [])
    }

    loadRecentlyViewed()
    
  }, [])

  
  // ---------------- UI ----------------
  return (
    <div style={{ background: theme.background, minHeight: "100vh" }}>
      
      {/* HERO SECTION */}
      <div
        style={{
          position: "relative",
          minHeight: "75vh",
          width: "100%",
          backgroundImage: `url(${HeroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 0"
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
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "12px",
              padding: "20px",
              marginTop: "30px",
              borderRadius: "16px",
              backdropFilter: "blur(12px)",
              background: "rgba(255,255,255,0.25)",
              border: "1px solid rgba(255,255,255,0.3)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
            }}
          >
            
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
              style={luxuryInput}         
            />

            <input
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              style={luxuryInput}         
            />

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
                borderRadius: "14px",
                border: "none",
                background: "#111",
                color: "white",
                cursor: "pointer",
                fontWeight: "600",
                minWidth: "140px"
              }}
            >
              Search
            </button>

          </div>

        </div>
        
      </div>

      {/* MAIN CONTENT BELOW HERO */}
      <div 
      style={{
      padding: "60px 80px"    
      }}
      >
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

      </div>

      {/* SEARCH NOT FOUND */}
      {!loading && houses.length === 0 && (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          
          <h2>No houses found</h2>
          <p 
          style={{ color: "#666",
            marginTop: "10px",
            mar
           }}>
            Try adjusting your filters or explore other locations
          </p>

          <div style={{ marginTop: "20px" }}>
            
            <button
              onClick={clearFilters}
              style={{
                padding: "10px 20px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Clear Filters
            </button>

          </div>

          <div style={{ marginTop: "30px" }}>
            <p>Popular searches:</p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              
              {/*FILTERS*/}
              {!loading && houses.length === 0 && (
                <div>

                  {/* Suggestions */}
                  <button
                    onClick={() => {
                      setLocationFilter("Nairobi")
                      fetchHouses(true)
                    }}
                  >
                    Nairobi
                  </button>

                  <button
                    onClick={() => {
                      setLocationFilter("Westlands")
                      fetchHouses(true)
                    }}
                  >
                    Westlands
                  </button>

                </div>
              )}

              <button onClick={() => setBedroomsFilter("1")}>1 Bedroom</button>
              <button onClick={() => setBedroomsFilter("2")}>2 Bedroom</button>

            </div>
          </div>
        </div>
      )}

      {/*FEATURED HOUSES */}
      {featuredHouses.length > 0 && (
        <>
          <h3 style={{ marginTop: "30px" }}>Featured Listings ⭐</h3>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "20px"
          }}>
            {featuredHouses.map((house) => (
              <div
                key={house.id}
                onClick={() => navigate(`/house/${house.id}`)}
                style={listingCard}
              > 
                <img src={house.image_urls?.[0]} />
                <h4>{house.title}</h4>
              </div>
            ))}
          </div>
        </>
      )}

      {/* TRENDING HOMES */}
      <h2 style={{ marginTop: "30px" }}>🔥 Trending Homes</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: "20px",
          marginBottom: "40px"
        }}
      >
        {trendingHouses.map((house) => (

          <div
            key={house.id}
            onClick={() => navigate(`/house/${house.id}`)}
            style={{
              cursor: "pointer",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
              background: "#fff"
            }}
          >

            <img
              src={house.image_urls?.[0]}
              alt="house"
              style={{
                width: "100%",
                height: "200px",
                objectFit: "cover"
              }}
            />

            <div style={{ padding: "15px" }}>
              <h3>{house.title}</h3>
              <p>{house.location}</p>
              <p style={{ fontWeight: "bold" }}>KES {house.price}</p>

              <p style={{ color: "#2563eb", fontWeight: "600" }}>
                👁 {house.views || 0} views
              </p>
            </div>

          </div>
        ))}
      </div>

      {/*NORMALHOUSES*/}
      {normalHouses.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "25px",
            marginTop: "40px"
          }}
        >
          {normalHouses.map((house) => (
            <div
              key={house.id}
              onClick={() => navigate(`/house/${house.id}`)}
              style={listingCard}
            >
              {house.image_urls?.length > 0 && (
                <img
                  src={house.image_urls[0]}
                  alt={house.title}
                  style={{
                    width: "100%",
                    height: "180px",
                    objectFit: "cover"
                  }}
                />
              )}

              <div style={{ padding: "15px" }}>
                <h4>{house.title}</h4>
                <p>{house.location}</p>

                <p style={{ fontWeight: "600" }}>
                  Ksh {Number(house.price).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RECENTLY VIEWED SECTION */}
      <h2 style={{marginTop:"50px"}}>Recently    Viewed</h2>
        <div
          style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",
          gap:"20px"
          }}
        >
        {recentlyViewed.map(house => (

          <Link
            key={house.id}
            to={`/house/${house.id}`}
            style={{ textDecoration:"none", color:"inherit" }}
          >
            <div
              style={{
                border:"1px solid #eee",
                borderRadius:"10px",
                padding:"10px"
              }}
            >

              <img
                src={house.image_urls?.[0]}
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/300x200?text=No+Image"
                }}
                alt={house.title}

                style={{
                  width:"100%",
                  height:"160px",
                  objectFit:"cover",
                  borderRadius:"8px"
                }}
              />

              <h4>{house.title}</h4>

              <p>{house.location}</p>

              <p>KES {house.price}</p>

            </div>
          </Link>
        ))}
        </div>
     
      <hr />

      {/* BOTTOM ACTION BAR */}
      <div
        style={{
          marginTop: "80px",
          backgroundColor: "#c5c7c8",
        }}
      >
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

const searchBar = {
  // Styles have been moved inline to the container
}

const listingCard={
  background: "#fff",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
}

export default Home