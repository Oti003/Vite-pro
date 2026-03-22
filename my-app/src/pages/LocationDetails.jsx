import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { counties, subCounties, wards } from "../utils/kenyaLocations"

const slugify = (name) => name.toLowerCase().replace(/[\s_]+/g, '-')

function LocationDetails({ user }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)

  const mapLocation = counties.find(l => slugify(l.name) === slug) || 
                      subCounties.find(l => slugify(l.name) === slug) || 
                      wards.find(l => slugify(l.name) === slug)
  
  const locationName = mapLocation ? mapLocation.name : slug

  useEffect(() => {
    async function fetchHouses() {
      setLoading(true)

      const { data, error } = await supabase
        .from("houses")
        .select("*")
        .ilike("location", `%${locationName}%`)
        .eq("status", "available")
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false })

      if (!error && data) {
        setHouses(data)
      } else {
        console.error("Error fetching location houses:\n", error)
      }
      setLoading(false)
    }

    if (slug) {
      fetchHouses()
    }
  }, [slug, locationName])

  return (
    <div style={{ padding: "40px 30px", marginTop: "100px", maxWidth: "1200px", margin: "100px auto 0 auto" }}>
      <button 
        onClick={() => navigate("/locations")}
        style={{ marginBottom: "20px", display: "inline-block", background: "#f5f5f5", border: "1px solid #ddd", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}
      >
        &larr; Back to Map
      </button>

      <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "30px", color: "#111" }}>
        Properties in <span style={{ color: "#2563eb" }}>{locationName}</span>
      </h1>

      {loading ? (
        <p>Loading available properties in {locationName}...</p>
      ) : houses.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "25px" }}>
          {houses.map(house => (
            <div 
              key={house.id} 
              style={{
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
                background: "#fff",
                cursor: "pointer",
                transition: "transform 0.2s"
              }}
              onClick={() => navigate(`/house/${house.id}`)}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              {house.image_urls?.length > 0 ? (
                <img 
                  src={house.image_urls[0]} 
                  alt={house.title}
                  style={{ width: "100%", height: "200px", objectFit: "cover" }}
                />
              ) : (
                <div style={{ width: "100%", height: "200px", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#aaa" }}>No Image</span>
                </div>
              )}
              
              <div style={{ padding: "20px" }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", color: "#222" }}>{house.title}</h3>
                <p style={{ margin: "0 0 10px 0", color: "#666", fontSize: "14px" }}>{house.location}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "18px", fontWeight: "700", color: "#000" }}>
                    Ksh {house.price.toLocaleString()}
                  </span>
                  <span style={{ fontSize: "12px", background: "#eee", padding: "4px 8px", borderRadius: "4px" }}>
                    {house.bedrooms === 0 ? "Bedsitter" : `${house.bedrooms} BR`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "#f9fafb", borderRadius: "16px", border: "1px dashed #d1d5db" }}>
          <h2 style={{ color: "#4b5563", marginBottom: "10px" }}>No Listings Yet</h2>
          <p style={{ color: "#6b7280" }}>There are currently no available properties in {locationName}.</p>
          <button 
             onClick={() => navigate("/locations")}
             style={{ marginTop: "20px", background: "#111", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer" }}
          >
             Explore Other Regions
          </button>
        </div>
      )}
    </div>
  )
}

export default LocationDetails
