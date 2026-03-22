import { counties, subCounties, wards } from "../utils/kenyaLocations"
import { useNavigate } from "react-router-dom"
import { useState } from "react"

const slugify = (name) => name.toLowerCase().replace(/[\s_]+/g, '-')

function Locations() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  
  const [selectedCounty, setSelectedCounty] = useState(null)

  const handleCountyClick = (county) => {
    setSelectedCounty(county)
    setSearchTerm("")
    window.scrollTo(0, 0)
  }

  const getFilteredList = (list) => {
    return list
      .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  let currentList = []
  let title = "Counties in Kenya"
  let backAction = null
  let onCardClick = handleCountyClick

  if (selectedCounty) {
    title = `Wards in ${selectedCounty.name}`
    currentList = getFilteredList(
      wards.filter(w => 
        subCounties
          .filter(s => s.county === selectedCounty.name)
          .map(s => s.name)
          .includes(w.constituency)
      )
    )
    backAction = () => setSelectedCounty(null)
    onCardClick = (ward) => navigate(`/locations/${slugify(ward.name)}`)
  } else {
    currentList = getFilteredList(counties)
  }

  return (
    <div style={{ paddingTop: "120px", maxWidth: "1200px", margin: "0 auto", paddingBottom: "60px", paddingLeft: "20px", paddingRight: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        
        {backAction && (
          <button 
            onClick={backAction}
            style={{ marginBottom: "20px", background: "#f5f5f5", border: "1px solid #ddd", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}
          >
            &larr; Back
          </button>
        )}

        <h1 style={{ fontSize: "38px", fontWeight: "700", marginBottom: "15px", color: "#111" }}>
          {title}
        </h1>
        <p style={{ color: "#555", marginBottom: "30px", fontSize: "16px" }}>
          {!selectedCounty 
             ? "Select a region to explore deeper, or view properties directly." 
             : "Select a ward to view available properties."}
        </p>

        {/* View all in this region button */}
        {selectedCounty && (
           <button 
             onClick={() => navigate(`/locations/${slugify(selectedCounty.name)}`)}
             style={{ marginBottom: "20px", background: "#111", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "30px", cursor: "pointer", fontSize: "16px", fontWeight: "600" }}
           >
             View All Properties in {selectedCounty.name}
           </button>
        )}

        <div style={{ marginTop: "20px" }}>
          <input 
            type="text"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "15px 25px",
              fontSize: "16px",
              borderRadius: "30px",
              border: "1px solid #ccc",
              outline: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
            }}
          />
        </div>
      </div>

      {!selectedCounty && searchTerm === "" && (
        <div style={{ marginBottom: "50px", textAlign: "left" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px", color: "#111" }}>
            Suggested Cities
          </h2>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
            gap: "20px" 
          }}>
            {["Nairobi", "Mombasa", "Kisumu"].map(cityName => {
               const cityObj = counties.find(c => c.name === cityName)
               return cityObj ? (
                 <div 
                   key={`suggested-${cityObj.code}`} 
                   onClick={() => handleCountyClick(cityObj)}
                   style={{
                     background: "#2563eb",
                     color: "#fff",
                     border: "none",
                     borderRadius: "12px",
                     padding: "20px",
                     textAlign: "center",
                     cursor: "pointer",
                     boxShadow: "0 6px 15px rgba(37, 99, 235, 0.25)",
                     transition: "transform 0.2s"
                   }}
                   onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                   onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                 >
                   <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>{cityObj.name}</h3>
                 </div>
               ) : null
            })}
          </div>
          
          <h2 style={{ fontSize: "24px", fontWeight: "700", marginTop: "50px", marginBottom: "20px", color: "#111" }}>
            All Counties
          </h2>
        </div>
      )}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
        gap: "20px" 
      }}>
        {currentList.map(item => (
          <div
            key={item.code}
            onClick={() => onCardClick(item)}
            style={{
              background: "#fff",
              border: "1px solid #eaeaea",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)"
              e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.08)"
              e.currentTarget.style.borderColor = "#2563eb"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.02)"
              e.currentTarget.style.borderColor = "#eaeaea"
            }}
          >
            <h3 style={{ margin: 0, fontSize: "18px", color: "#333" }}>{item.name}</h3>
            {!selectedCounty && (
              <p style={{ margin: "10px 0 0 0", fontSize: "13px", color: "#2563eb", fontWeight: "600" }}>
                Explore &rarr;
              </p>
            )}
          </div>
        ))}
      </div>

      {currentList.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#777" }}>
          No locations found matching "{searchTerm}"
        </div>
      )}
    </div>
  )
}

export default Locations
