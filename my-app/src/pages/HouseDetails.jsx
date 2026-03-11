import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../supabase"

function HouseDetails({user}) {
  const theme = {
  background: "#f8f7f5",
  card: "#ffffff",
  textPrimary: "#111111",
  textSecondary: "#666666",
  accent: "#1c1c1c",
  borderRadius: "18px",
  shadowSoft: "0 20px 60px rgba(0,0,0,0.06)"
}

  const { id } = useParams()
  const isLoggedIn = !!user
  const [house, setHouse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [showContact, setShowContact] = useState(false)

  const images = Array.isArray(house?.image_urls)
    ? house.image_urls
    : []

  useEffect(() => {
    fetchHouse()
  }, [])

  async function fetchHouse() {
    const { data, error } = await supabase
      .from("houses")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.log(error)
      setLoading(false)
      return
    }

    setHouse(data)
    setLoading(false)
  }

  function nextImage() {
    if (!images.length) return
    setSelectedIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    )
  }

  function prevImage() {
    if (!images.length) return
    setSelectedIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    )
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (selectedIndex === null) return
      if (e.key === "Escape") setSelectedIndex(null)
      if (e.key === "ArrowRight") nextImage()
      if (e.key === "ArrowLeft") prevImage()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedIndex, images])

  if (loading) return <p style={{ padding: "20px" }}>Loading...</p>
  if (!house) return <p style={{ padding: "20px" }}>House not found</p>

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto", marginTop: "110px" }}>

      {/* GALLERY */}
      <div style={{ borderRadius: "20px", overflow: "hidden" }}>
        <div style={galleryContainer}>
          {images[0] && (
            <img
              src={images[0]}
              alt=""
              style={{ ...mainImageStyle, cursor: "pointer" }}
              onClick={() => setSelectedIndex(0)}
            />
          )}

          <div style={sideGrid}>
            {images.slice(1, 5).map((img, index) => (
              <img
                key={index}
                src={img}
                alt=""
                style={{ ...sideImageStyle, cursor: "pointer" }}
                onClick={() => setSelectedIndex(index + 1)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* PAGE LAYOUT */}
      <div style={pageLayout}>
        <div>
          {/* TITLE */}
          <h1>{house.title}</h1>

          {/* LOCATION */}
          <p style={{ color: "#666" }}>📍 {house.location}</p>

          {/* STATUS */}
          <p
            style={{
              marginTop: "10px",
              fontWeight: "bold",
              color:
                house.status?.toLowerCase().trim() === "available"
                  ? "green"
                  : "red"
            }}
          >
            {house.status?.toLowerCase().trim() === "available"
              ? "Available"
              : "Rented"}
          </p>
          <hr />
          {/* AMENITIES */}
          <div style={{ marginTop: "30px" }}>
            <h3>Amenities</h3>
            <p>{house.amenities || "No amenities listed."}</p>
          </div>

          {/* PROPERTY DESCRIPTION */}
          <hr />
          <div style={{ marginTop: "35px" }}>
            <h3
              style={{
                fontSize: "22px",
                fontWeight: "600",
                marginBottom: "18px",
                letterSpacing: "0.3px"
              }}
            >
              More Information
            </h3>

            <p
              style={{
                lineHeight: "2",
                fontSize: "16px",
                color: "#555",
                maxWidth: "800px"
              }}
            >
              {house.description || "No additionaldescription provided."}
            </p>
          </div>
          <hr />
        </div>

        {/* STICKY CARD */}
        <div style={stickyCard}>
          <h2>
            KES {Number(house.price).toLocaleString()}
            {house.rental_type === "daily"
              ? " / day"
              : house.rental_type === "monthly"
              ? " / month"
              : ""}
          </h2>

          {!isLoggedIn ? (
            <button
              style={primaryButton}
              onClick={() => alert("Please login to view contact details")}
            >
              Login to Contact
            </button>
          ) : (
            <>
              <button
                style={primaryButton}
                onMouseOver={(e) =>
                  (e.target.style.transform = "translateY(-2px)")
                }
                onMouseOut={(e) =>
                  (e.target.style.transform = "translateY(0px)")
                }
                onClick={() => setShowContact(prev => !prev)}
              >
                {showContact ? "HIDE CONTACT" : "CONTACT LANDLORD"}
              </button>             

              {showContact && (
                <div
                  style={{
                    overflow: "hidden",
                    transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                    maxHeight: showContact ? "250px" : "0px",
                    opacity: showContact ? 1 : 0,
                    transform: showContact ? "translateY(0px)" : "translateY(-8px)"
                  }}
                >
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "22px",
                      borderRadius: "16px",
                      background: "linear-gradient(to bottom right, #ffffff, #f5f5f5)",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
                    }}
                  >
                    <a
                      href={`tel:${house.landlord_phone}`}
                      style={{
                        display: "block",
                        fontSize: "20px",
                        fontWeight: "600",
                        textDecoration: "none",
                        color: "#111",
                        letterSpacing: "0.5px"
                      }}
                    >
                      {house.landlord_phone}
                    </a>

                    <a
                      href={`sms:${house.landlord_phone}`}
                      style={{
                        display: "block",
                        marginTop: "14px",
                        fontSize: "14px",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        textDecoration: "none",
                        color: "#777",
                        fontWeight: "500"
                      }}
                    >
                      Send SMS
                    </a>
                  </div>
                </div>
              )}

            </>
          )}

          {isLoggedIn && (
            <a
              href={`https://wa.me/${house.landlord_phone}`}
              target="_blank"
              rel="noreferrer"
              style={whatsappButton}
            >
              WhatsApp Landlord
            </a>
          )}
        </div>
      </div>

      {/* MODAL */}
      {selectedIndex !== null &&
        images.length > 0 &&
        images[selectedIndex] && (
          <div style={modalOverlay}>
            <button onClick={() => setSelectedIndex(null)} style={closeBtn}>
              ✕
            </button>

            <button onClick={prevImage} style={leftArrow}>
              ‹
            </button>

            <img
              src={images[selectedIndex]}
              alt=""
              style={modalImage}
            />

            <button onClick={nextImage} style={rightArrow}>
              ›
            </button>
          </div>
        )}
    </div>
  )
}


const galleryContainer = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: "10px",
  height: "450px"
}

const mainImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block"
}

const sideGrid = {
  display: "grid",
  gridTemplateRows: "1fr 1fr",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px"
}

const sideImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block"
}

const pageLayout = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: "40px",
  marginTop: "40px"
}

const stickyCard = {
  position: "sticky",
  top: "100px",
  padding: "20px",
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  backgroundColor: "white"
}

const primaryButton = {
  width: "100%",
  padding: "9px",
  borderRadius: "14px",
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: "600", 
  cursor: "pointer",
  transition: "all 0.3s ease"
  
}

const whatsappButton = {
  display: "block",
  textAlign: "center",
  marginTop: "10px",
  padding: "9px",
  borderRadius: "14px",
  background: "#1a7f37",
  color: "white",
  textDecoration: "none",
  fontWeight: "600"
}

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.75)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999
}

const modalImage = {
  maxWidth: "85%",
  maxHeight: "85%",
  objectFit: "contain",
  borderRadius: "12px"
}

const closeBtn = {
  position: "absolute",
  top: "30px",
  right: "40px",
  fontSize: "30px",
  background: "none",
  border: "none",
  color: "white",
  cursor: "pointer"
}

const leftArrow = {
  position: "absolute",
  left: "40px",
  fontSize: "40px",
  background: "none",
  border: "none",
  color: "white",
  cursor: "pointer"
}

const rightArrow = {
  position: "absolute",
  right: "40px",
  fontSize: "40px",
  background: "none",
  border: "none",
  color: "white",
  cursor: "pointer"
}

export default HouseDetails