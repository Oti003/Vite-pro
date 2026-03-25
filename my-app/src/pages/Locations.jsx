
import { counties, subCounties, wards } from "../utils/kenyaLocations"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import KenyaMap from "../components/KenyaMap"

const slugify = (name) => name.toLowerCase().replace(/[\s_]+/g, "-")

function Locations() {
  const navigate = useNavigate()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCounty, setSelectedCounty] = useState(null)

  const handleCountyClick = (county) => {
    setSelectedCounty(county)
    setSearchTerm("")
    window.scrollTo(0, 0)
  }

  const normalize = (name) =>
    name.toLowerCase().replace(" county", "").trim()

  const getFilteredList = (list) => {
    return list
      .filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  let currentList = []
  let title = "Counties in Kenya"
  let backAction = null
  let onCardClick = handleCountyClick

  if (selectedCounty) {
    title = `Wards in ${selectedCounty.name}`

    const countySubCounties = subCounties
      .filter((s) => s.county === selectedCounty.name)
      .map((s) => s.name)

    currentList = getFilteredList(
      wards.filter((w) =>
        countySubCounties.includes(w.constituency)
      )
    )

    backAction = () => setSelectedCounty(null)

    onCardClick = (ward) =>
      navigate(`/locations/${slugify(ward.name)}`)
  } else {
    currentList = getFilteredList(counties)
  }

  return (
    <div
      style={{
        paddingTop: "120px",
        maxWidth: "1200px",
        margin: "0 auto",
        paddingBottom: "60px",
        paddingLeft: "20px",
        paddingRight: "20px"
      }}
    >
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        {backAction && (
          <button
            onClick={backAction}
            style={{
              marginBottom: "20px",
              background: "#f5f5f5",
              border: "1px solid #ddd",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            ← Back
          </button>
        )}

        <h1
          style={{
            fontSize: "38px",
            fontWeight: "700",
            marginBottom: "15px"
          }}
        >
          {title}
        </h1>

        <p style={{ color: "#555", marginBottom: "30px" }}>
          {!selectedCounty
            ? "Select a region to explore deeper."
            : "Select a ward to view properties."}
        </p>

        {/* VIEW ALL */}
        {selectedCounty && (
          <button
            onClick={() =>
              navigate(`/locations/${slugify(selectedCounty.name)}`)
            }
            style={{
              marginBottom: "20px",
              background: "#111",
              color: "#fff",
              border: "none",
              padding: "10px 24px",
              borderRadius: "30px",
              cursor: "pointer"
            }}
          >
            View All in {selectedCounty.name}
          </button>
        )}

        {/* SEARCH */}
        <input
          type="text"
          placeholder={`Search ${title.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "500px",
            padding: "15px",
            borderRadius: "30px",
            border: "1px solid #ccc"
          }}
        />
      </div>

      {!selectedCounty && (
        <div style={{ marginBottom: "40px" }}>
          <KenyaMap
            onSelectCounty={(countyName) => {
              const normalize = (n) =>
                n.toLowerCase().replace(" county", "").trim()

              const found = counties.find(
                c => normalize(c.name) === normalize(countyName)
              )

              if (found) handleCountyClick(found)
            }}
          />
        </div>
      )}
     
      {/* SUGGESTED */}
      {!selectedCounty && searchTerm === "" && (
        <div style={{ marginBottom: "40px" }}>
          <h2>Popular Cities</h2>
          <div style={{ display: "flex", gap: "15px" }}>
            {["Nairobi", "Mombasa", "Kisumu"].map((city) => {
              const c = counties.find((x) => x.name === city)
              return (
                <button
                  key={city}
                  onClick={() => handleCountyClick(c)}
                  style={{
                    padding: "10px 20px",
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "8px"
                  }}
                >
                  {city}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "20px"
        }}
      >
        {currentList.map((item) => (
          <div
            key={item.code}
            onClick={() => onCardClick(item)}
            style={{
              background: "#fff",
              border: "1px solid #eee",
              padding: "20px",
              borderRadius: "10px",
              cursor: "pointer",
              textAlign: "center"
            }}
          >
            <h3>{item.name}</h3>
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {currentList.length === 0 && (
        <p style={{ textAlign: "center", marginTop: "30px" }}>
          No results found
        </p>
      )}
    </div>
  )
}

export default Locations