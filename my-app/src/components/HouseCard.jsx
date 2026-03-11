import { useState } from "react"
import { supabase } from "../supabase"
import { useNavigate } from "react-router-dom"

function HouseCard({ house, user, savedIds, setSavedIds }) {
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [hovered, setHovered] = useState(false)

  const isSaved = savedIds.includes(house.id)

  async function toggleSave(e) {
    e.stopPropagation()

    if (!user) {
      alert("Please login to save houses.")
      return
    }

    setIsSaving(true)

    if (isSaved) {
      await supabase
        .from("saved_houses")
        .delete()
        .eq("user_id", user.id)
        .eq("house_id", house.id)

      setSavedIds(prev => prev.filter(id => id !== house.id))
    } else {
      await supabase
        .from("saved_houses")
        .insert([{ user_id: user.id, house_id: house.id }])

      setSavedIds(prev => [...prev, house.id])
    }

    setIsSaving(false)
  }

  const tags = []

    if (house.status?.toLowerCase() === "available") {
      tags.push("Available")
    }

    if (house.amenities?.some(a => a.toLowerCase() === "parking")) {
    tags.push("Parking")
    }

    if (house.amenities?.some(a => a.toLowerCase() === "furnished")) {
      tags.push("Furnished")
    }

    if (house.created_at) {
      const created = new Date(house.created_at)
      const daysOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)

      if (daysOld < 7) {
        tags.push("New")
      }
    }

  return (
    <div
      style={{
        ...cardStyle,
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 20px 50px rgba(0,0,0,0.15)"
          : "0 8px 25px rgba(0,0,0,0.08)"
      }}
      onClick={() => navigate(`/house/${house.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >

      {/* PROPERTY TAGS */}
      <div style={tagContainer}>
        {tags.map((tag, index) => (
          <span key={index} style={tagStyle}>
            {tag}
          </span>
        ))}
      </div>

      {/* IMAGE */}
      <div style={imageWrapper}>
        <img
          src={house.image_urls?.[0]}
          alt={house.title}
          style={{
            ...imageStyle,
            transform: hovered ? "scale(1.06)" : "scale(1)"
          }}
        />

        {/* Heart Button */}
        <button
          onClick={toggleSave}
          style={heartStyle}
          disabled={isSaving}
        >
          {isSaved ? "❤️" : "🤍"}
        </button>
      </div>

      {/* INFO */}
      <div style={infoContainer}>
        <div style={topRow}>
          <span style={locationStyle}>{house.location}</span>
          <span style={ratingStyle}>⭐ 4.8</span>
        </div>

        <h3 style={titleStyle}>{house.title}</h3>

        <p style={amenitiesStyle}>
          {house.amenities?.join(" • ")}
        </p>

        <p style={priceStyle}>
          KES {Number(house.price).toLocaleString()}
          <span style={perMonth}> / month</span>
        </p>
      </div>
    </div>
  )
}

const cardStyle = {
  backgroundColor: "white",
  borderRadius: "18px",
  overflow: "hidden",
  transition: "all 0.35s ease",
  cursor: "pointer"
  
}

const imageWrapper = {
  position: "relative",
  height: "250px",
  overflow: "hidden"
}

const imageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "transform 0.6s ease"
}

const heartStyle = {
  position: "absolute",
  top: "14px",
  right: "14px",
  backgroundColor: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(8px)",
  border: "none",
  borderRadius: "50%",
  padding: "8px 10px",
  fontSize: "18px",
  cursor: "pointer",
  boxShadow: "0 4px 10px rgba(0,0,0,0.15)"
}

const infoContainer = {
  padding: "18px"
}

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "8px"
}

const locationStyle = {
  fontWeight: "600",
  fontSize: "14px",
  color: "#333"
}

const ratingStyle = {
  fontSize: "14px",
  color: "#555"
}

const titleStyle = {
  margin: "4px 0 8px 0",
  fontSize: "17px",
  fontWeight: "500",
  letterSpacing: "0.3px"
}

const amenitiesStyle = {
  color: "#777",
  fontSize: "13px",
  marginBottom: "10px",
  lineHeight: "1.4"
}

const priceStyle = {
  fontWeight: "700",
  fontSize: "18px",
  color: "#111"
}

const perMonth = {
  fontWeight: "400",
  fontSize: "14px",
  color: "#666"
}

const tagContainer = {
  position: "absolute",
  top: "14px",
  left: "14px",
  display: "flex",
  gap: "8px",
  flexWrap: "wrap"
}

const tagStyle = {
  backgroundColor: "rgba(255,255,255,0.9)",
  backdropFilter: "blur(6px)",
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: "600",
  letterSpacing: "0.5px",
  color: "#333",
  boxShadow: "0 3px 8px rgba(0,0,0,0.1)"
}

export default HouseCard