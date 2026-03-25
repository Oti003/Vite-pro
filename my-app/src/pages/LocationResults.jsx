import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../supabase"

function LocationResults() {
  const { location } = useParams()
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHouses()
  }, [location])

  async function fetchHouses() {
    setLoading(true)

    const { data, error } = await supabase
      .from("houses")
      .select("*")
      .eq("location_slug", location)

    if (error) {
      console.log(error)
      setLoading(false)
      return
    }

    setHouses(data || [])
    setLoading(false)
  }

  return (
    <div style={{ padding: "100px 20px" }}>
      <h1>Houses in {location.replace("-", " ")}</h1>

      {loading && <p>Loading...</p>}

      {!loading && houses.length === 0 && (
        <p>No listings found</p>
      )}

      <div style={{ display: "grid", gap: "20px", marginTop: "20px" }}>
        {houses.map((house) => (
          <div key={house.id} style={{ border: "1px solid #ccc", padding: "15px" }}>
            <h3>{house.title}</h3>
            <p>{house.location}</p>
            <p>Ksh {house.price}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LocationResults