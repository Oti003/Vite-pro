import { MapContainer, TileLayer, GeoJSON } from "react-leaflet"
import { useNavigate } from "react-router-dom"
import kenyaGeoJson from "../utils/kenya.json"

function KenyaMap({ onSelectLocation }) {
  const navigate = useNavigate()

  const handleClick = (name) => {
    if (!name) return
    onSelectLocation(name)
  }

  function onEachFeature(feature, layer) {
    layer.on({
      click: () => handleClick(feature.properties.name)
    })
  }

  return (
    <MapContainer
      center={[-1.29, 36.82]}
      zoom={6}
      style={{ height: "400px", width: "100%", borderRadius: "12px" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <GeoJSON
        data={kenyaGeoJson}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  )
}

export default KenyaMap