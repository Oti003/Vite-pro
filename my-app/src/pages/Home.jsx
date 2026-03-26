import { useEffect, useState, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "../supabase"
import { toast } from "react-hot-toast"
import HouseCard from "../components/HouseCard"
import HeroImage from "../assets/Hero_Image.jpg"

// Normalize location text to handle different cases (case-insensitive)
function normalizeLocation(location) {
  if (!location) return ""
  return location
    .trim()
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

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
  const [maxPrice, setMaxPrice] = useState("")
  const [bedroomsFilter, setBedroomsFilter] = useState("")

  // Property Requests State
  const [propertyRequests, setPropertyRequests] = useState([])
  const [requestHouseType, setRequestHouseType] = useState("")
  const [requestLocation, setRequestLocation] = useState("")
  const [requestMaxRent, setRequestMaxRent] = useState("")
  const [requestDeadline, setRequestDeadline] = useState("")
  const [requestComments, setRequestComments] = useState({})
  const [newComment, setNewComment] = useState("")

  const [debouncedLocation, setDebouncedLocation] = useState("")
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
      setDebouncedMaxPrice(maxPrice)
      setDebouncedBedrooms(bedroomsFilter)
    }, 500)

    return () => clearTimeout(timeout)
  }, [locationFilter, maxPrice, bedroomsFilter])

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

    if (debouncedLocation.trim()) {
      const normalizedLocation = normalizeLocation(debouncedLocation)
      query = query.ilike("location", `%${normalizedLocation}%`)
    }

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

  // ---------------- PROPERTY REQUESTS ----------------
  async function loadPropertyRequests() {
    const { data, error } = await supabase
      .from("property_requests")
      .select(`
        *,
        comments:request_comments(*)
      `)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.log("Error loading property requests:", error)
      return
    }

    // Filter out expired requests and delete them from DB
    if (data && data.length > 0) {
      const now = new Date()
      const expiredRequests = data.filter(req => {
        const deadline = new Date(req.deadline)
        const expireDate = new Date(deadline.getTime() + 24 * 60 * 60 * 1000) // Add 1 day
        return now > expireDate
      })

      // Delete expired requests
      if (expiredRequests.length > 0) {
        const expiredIds = expiredRequests.map(r => r.id)
        await supabase
          .from("property_requests")
          .delete()
          .in("id", expiredIds)

        // Filter out expired from display
        const activeRequests = data.filter(req => {
          const deadline = new Date(req.deadline)
          const expireDate = new Date(deadline.getTime() + 24 * 60 * 60 * 1000)
          return now <= expireDate
        })
        setPropertyRequests(activeRequests)
        return
      }
    }

    setPropertyRequests(data || [])
  }

  async function submitPropertyRequest(e) {
    e.preventDefault()

    if (!user) {
      alert("Please sign in to post a property request")
      navigate("/login")
      return
    }

    if (!requestHouseType.trim() || !requestLocation.trim() || !requestMaxRent.trim() || !requestDeadline.trim()) {
      alert("Please fill in all fields including deadline")
      return
    }

    const { data, error } = await supabase
      .from("property_requests")
      .insert([
        {
          house_type: requestHouseType,
          location: normalizeLocation(requestLocation),
          max_rent: parseInt(requestMaxRent),
          deadline: new Date(requestDeadline).toISOString(),
          user_id: user?.id || null,
          user_email: user?.email || "Anonymous"
        }
      ])

    if (error) {
      console.log("Error submitting request:", error)
      toast.error("Request failed. Please try again.")
      return
    }

    toast.success("Property request posted successfully!")

    // Reset form
    setRequestHouseType("")
    setRequestLocation("")
    setRequestMaxRent("")
    setRequestDeadline("")

    // Reload requests
    loadPropertyRequests()
  }

  async function submitComment(requestId, commentText) {
    if (!commentText.trim()) {
      toast.error("Comment cannot be empty")
      return
    }

    if (!user) {
      toast.error("Sign in to post comment")
      navigate("/login")
      return
    }

    const { error } = await supabase
      .from("request_comments")
      .insert([
        {
          request_id: requestId,
          comment: commentText,
          user_id: user?.id || null,
          user_email: user?.email || "Anonymous",
          user_type: user ? "landlord" : "anonymous"
        }
      ])

    if (error) {
      console.log("Error submitting comment:", error)
      toast.error("Comment failed. Please try again.")
      return
    }

    toast.success("Comment posted successfully")
    setNewComment("")
    loadPropertyRequests() // Reload to get updated comments
  }

  // ---------------- INITIAL LOAD ----------------
  useEffect(()=>{
    fetchFeatured()
    loadPropertyRequests()
  },[])

  useEffect(()=>{
    setHouses([])
    setHasMore(true)
    setOffset(0)
    fetchHouses(true)
  },[
    debouncedLocation,
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
            marginTop: "10px"
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
              <HouseCard
                key={house.id}
                house={house}
                user={user}
                savedIds={savedIds}
                setSavedIds={setSavedIds}
              />
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

      {/* PROPERTY REQUESTS SECTION */}
      <div
        style={{
          padding: "20px 40px",
          background: "#f8f9fa",
          borderTop: "1px solid #e9ecef",
          borderBottom: "1px solid #e9ecef"
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", marginBottom: "12px", color: "#333" }}>
            🏠 Property Requests
          </h2>
          <p style={{ textAlign: "center", marginBottom: "15px", color: "#666", fontSize: "16px" }}>
            Can't find what you're looking for? Post a request and let landlords/agents respond!
          </p>

          {/* Request Form */}
          {user ? (
            <form
              onSubmit={submitPropertyRequest}
              style={{
                background: "white",
                padding: "18px",
                borderRadius: "16px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                marginBottom: "20px",
                display: "flex",
                flexWrap: "wrap",
                gap: "15px",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
            <p style={{ margin: "0 10px 0 0", fontWeight: "500", color: "#333" }}>
              I'm looking for
            </p>
            <input
              type="text"
              placeholder="house type (e.g., 2BR apartment, villa)"
              value={requestHouseType}
              onChange={(e) => setRequestHouseType(e.target.value)}
              style={{
                padding: "12px 16px",
                border: "2px solid #e1e5e9",
                borderRadius: "8px",
                fontSize: "14px",
                minWidth: "200px",
                flex: "1"
              }}
              required
            />
            <input
              type="text"
              placeholder="Location (e.g., Westlands, Karen)"
              value={requestLocation}
              onChange={(e) => setRequestLocation(e.target.value)}
              style={{
                padding: "12px 16px",
                border: "2px solid #e1e5e9",
                borderRadius: "8px",
                fontSize: "14px",
                minWidth: "180px",
                flex: "1"
              }}
              required
            />
            <p style={{ margin: "0 10px", fontWeight: "500", color: "#333" }}>
              in
            </p>
            <input
              type="number"
              placeholder="Max Rent (KSh)"
              value={requestMaxRent}
              onChange={(e) => setRequestMaxRent(e.target.value)}
              style={{
                padding: "12px 16px",
                border: "2px solid #e1e5e9",
                borderRadius: "8px",
                fontSize: "14px",
                minWidth: "140px",
                flex: "1"
              }}
              required
            />
            <p style={{ margin: "0 10px", fontWeight: "500", color: "#333" }}>
              by
            </p>
            <input
              type="date"
              placeholder="Deadline (e.g., 4 Apr 26)"
              value={requestDeadline}
              onChange={(e) => setRequestDeadline(e.target.value)}
              style={{
                padding: "12px 16px",
                border: "2px solid #e1e5e9",
                borderRadius: "8px",
                fontSize: "14px",
                minWidth: "140px",
                flex: "1"
              }}
              required
            />
            <button
              type="submit"
              style={{
                padding: "12px 24px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                minWidth: "120px"
              }}
            >
              Post Request
            </button>
            </form>
          ) : (
            <div
              style={{
                background: "white",
                padding: "30px",
                borderRadius: "16px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                marginBottom: "20px",
                textAlign: "center"
              }}
            >
              <p style={{ fontSize: "16px", color: "#666", marginBottom: "15px" }}>
                Sign in to post a property request
              </p>
              <button
                onClick={() => navigate("/login")}
                style={{
                  padding: "12px 24px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "16px"
                }}
              >
                Sign In
              </button>
            </div>
          )}

          {/* Display Requests */}
          <div style={{ display: "grid", gap: "12px" }}>
            {propertyRequests.map((request) => (
              <div
                key={request.id}
                style={{
                  background: "white",
                  padding: "16px",
                  borderRadius: "12px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                  border: "1px solid #e1e5e9"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h4 style={{ margin: 0, color: "#333" }}>
                    Looking for: {request.house_type}
                  </h4>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ margin: "5px 0", color: "#555" }}>
                  📍 Location: {request.location}
                </p>
                <p style={{ margin: "5px 0", color: "#555" }}>
                  💰 Max Rent: KSh {request.max_rent.toLocaleString()}
                </p>
                <p style={{ margin: "5px 0 8px", color: "#555" }}>
                  📅 Deadline: {new Date(request.deadline).toLocaleDateString('en-US', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: '2-digit' 
                  })}
                </p>
                <p style={{ margin: "5px 0 8px", fontSize: "13px", color: "#777" }}>
                  Posted by: {request.user_email}
                </p>

                {/* Comments Section */}
                <div style={{ borderTop: "1px solid #e1e5e9", paddingTop: "10px" }}>
                  <h5 style={{ margin: "0 0 6px 0", color: "#333" }}>Comments from Landlords</h5>

                  {/* Display existing comments */}
                  {request.comments && request.comments.length > 0 ? (
                    <div style={{ marginBottom: "8px" }}>
                      {request.comments.map((comment, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "#f8f9fa",
                            padding: "10px",
                            borderRadius: "6px",
                            marginBottom: "6px",
                            borderLeft: "3px solid #2563eb"
                          }}
                        >
                          <p style={{ margin: "0 0 5px", fontSize: "14px", color: "#333" }}>
                            {comment.comment}
                          </p>
                          <small style={{ color: "#666" }}>
                            {comment.user_email} • {new Date(comment.created_at).toLocaleDateString()}
                          </small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
                      No comments yet. Be the first to respond!
                    </p>
                  )}

                  {/* Add comment form */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="Write a response..."
                      value={requestComments[request.id] || ""}
                      onChange={(e) => setRequestComments(prev => ({
                        ...prev,
                        [request.id]: e.target.value
                      }))}
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        fontSize: "14px"
                      }}
                    />
                    <button
                      onClick={() => {
                        if (requestComments[request.id]?.trim()) {
                          submitComment(request.id, requestComments[request.id])
                          setRequestComments(prev => ({
                            ...prev,
                            [request.id]: ""
                          }))
                        }
                      }}
                      style={{
                        padding: "6px 14px",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px"
                      }}
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {propertyRequests.length === 0 && (
            <p style={{ textAlign: "center", color: "#666", marginTop: "10px" }}>
              No property requests yet. Be the first to post one!
            </p>
          )}
        </div>
      </div>

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
