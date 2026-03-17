import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"

function LandlordDashboard({ user }) {
  const navigate = useNavigate()

  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [price, setPrice] = useState("")
  const [phone, setPhone] = useState("")
  const [description, setDescription] = useState("")
  const [bedrooms, setBedrooms] = useState("")
  const [images, setImages] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [rentalType, setRentalType] = useState("monthly")
  const [selectedAmenities, setSelectedAmenities] = useState([])
  
  const totalListings = houses.length

  const availableHomes = houses.filter(
  house => house.status === "available"
  ).length

  const rentedHomes = houses.filter(
    house => house.status === "rented"
  ).length

  const amenities = [
    "Parking",
    "WiFi",
    "Balcony",
    "Security",
    "Borehole",
    "Garden",
    "Swimming Pool",
    "Gym"
  ];



  const handleAmenityChange = (e) => {
    const value = e.target.value

    if (e.target.checked) {
      setSelectedAmenities([...selectedAmenities, value])
    } else {
      setSelectedAmenities(
        selectedAmenities.filter((item) => item !== value)
      )
    }
  }

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate("/")
  }, [user, navigate])

  // Fetch landlord listings
  useEffect(() => {
    if (user) fetchMyHouses()
  }, [user])

  async function fetchMyHouses() {
    setLoading(true)

    const { data, error } = await supabase
      .from("houses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (!error) setHouses(data || [])

    setLoading(false)
  }


  // Upload images
  async function uploadImages() {
    let uploadedUrls = []

    for (let file of images) {
      if (file.size > 3 * 1024 * 1024) {
        alert("Each image must be under 3MB")
        return null
      }

      const fileName = `${user.id}-${Date.now()}-${file.name}`

      const { error } = await supabase.storage
        .from("house-images")
        .upload(fileName, file)

      if (error) {
        alert("Error uploading image")
        return null
      }

      const { data } = supabase.storage
        .from("house-images")
        .getPublicUrl(fileName)

      uploadedUrls.push(data.publicUrl)
    }

    return uploadedUrls
  }

  function sanitize(text){
      return text.replace(/</g,"&lt;").replace(/>/g,"&gt;")
    }

  // Create or Update Listing
  async function handleSubmit(e) {
    e.preventDefault()

    if (!title || !location || !price || !phone || selectedAmenities.length === 0) {
      alert("All fields must be filled")
      return
    }

    let imageUrls = []


    // Only upload images when creating a new listing

    if (!editingId) {
      if (images.length < 6) {
        alert("Upload at least 6 images")
        return
      }

      if (images.length > 12) {
        alert("Maximum 12 images allowed")
        return
      }

      const uploaded = await uploadImages()

      if (!uploaded){
        alert("Image upload failed. Please try again.")
      return
      }

      imageUrls = uploaded
    }

    //UPDATE EXISTING LISTING
    if (editingId) {
      const { error } = await supabase
        .from("houses")
        .update({
          title,
          location,
          price: parseInt(price),
          landlord_phone: phone,
          amenities: selectedAmenities,
          description,
          rental_type: rentalType

        })
        .eq("id", editingId)
        .eq("user_id", user.id)

      if (error) {
        console.log("UPDATE ERROR:", error)
        alert(error.message)
        return
      }

      setEditingId(null)
    } else {
      // CHECK FOR POSSIBLE DUPLICATES
      const { data: existing } = await supabase
        .from("houses")
        .select("id, price, title, image_urls")
        .ilike("location", location)

      let duplicateFound = false

      if (existing) {
        existing.forEach(h => {

          const priceClose = Math.abs(h.price - price) < 2000

          const titleSimilar =
            h.title?.toLowerCase().includes(title.toLowerCase()) ||
            title.toLowerCase().includes(h.title?.toLowerCase())

          const sameImage =
            h.image_urls &&
            imageUrls &&
            h.image_urls.some(img => imageUrls.includes(img))

          if (priceClose && titleSimilar) duplicateFound = true
          if (sameImage) duplicateFound = true
        })
      }

      if (duplicateFound) {
        alert("Possible duplicate listing detected.")
        return
      }

      //LISTING QUALITY SCORE (0-100)
      let score = 0

      if (title?.length > 10) score += 20
      if (description?.length > 40) score += 20
      if (imageUrls?.length >= 3) score += 20
      if (bedrooms) score += 10
      if (location) score += 10
      if (price) score += 10
      if (amenities?.length > 0) score += 10

      //SPAMMING PREVENTION - MAX 30 LISTINGS PER USER
      const { count } = await supabase
        .from("houses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      if (count >= 30) {
        alert("Listing limit reached. Contact admin.")
        return
      }

      // CREATE NEW LISTING
      const { error } = await supabase
        .from("houses")      
        .insert([
          {
          title: sanitize(title),
          location: sanitize(location),
          price: parseInt(price),
          bedrooms: parseInt(bedrooms),
          landlord_phone: phone,
          amenities: selectedAmenities,
          description: sanitize(description),
          user_id: user.id,
          image_urls: imageUrls,
          rental_type: rentalType,
          status: "pending",
          quality_score: score
          }

        ])

      

      if (error) {
        console.log("INSERT ERROR:", error)
        alert("Error creating listing")
        return
      }
      

    }

    // Reset form
    setTitle("")
    setLocation("")
    setPrice("")
    setBedrooms("")
    setPhone("")
    setSelectedAmenities([])
    setDescription("")
    setImages([])
    setRentalType("monthly")

    fetchMyHouses()

    
  }

  // Delete listing
  async function handleDelete(id) {
    if (!window.confirm("Delete this listing?")) return

    const { error } = await supabase
      .from("houses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (!error) fetchMyHouses()
  }

  // Toggle status
  async function toggleStatus(id, currentStatus) {
    const newStatus =
      currentStatus?.toLowerCase().trim() === "available"
        ? "rented"
        : "available"

    const { error } = await supabase
      .from("houses")
      .update({ status: newStatus })
      .eq("id", id)
      .eq("user_id", user.id)

    if (!error) fetchMyHouses()
  }

  // Edit listing
  function handleEdit(house) {
    setEditingId(house.id)
    setTitle(house.title)
    setLocation(house.location)
    setPrice(house.price)
    setPhone(house.landlord_phone || "")
    setSelectedAmenities(house.amenities || "")
    setDescription(house.description || [])
    setRentalType(house.rental_type || "monthly")
  }

  return (
    <div
      style={{
        padding: "40px 30px",
        marginTop: "110px",
        maxWidth: "1100px",
        marginLeft: "auto",
        marginRight: "auto",
        backgroundColor: "#c5c7c8",
      }}
    >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "600",
            marginBottom: "10px"
          }}
        >
          Landlord Dashboard
        </h1>

        <div style={statsWrapper}>

          <div style={statCard}>
            <p style={statNumber}>{totalListings}</p>
            <p style={statLabel}>Total Listings</p>
          </div>

          <div style={statCard}>
            <p style={statNumber}>{availableHomes}</p>
            <p style={statLabel}>Available</p>
          </div>

          <div style={statCard}>
            <p style={statNumber}>{rentedHomes}</p>
            <p style={statLabel}>Rented</p>
          </div>

        </div>

        <p style={{ color: "#777" }}>
          Manage your listings and track property availability
        </p>

      <form
        onSubmit={handleSubmit}

        style={{
          marginTop: "30px",
          padding: "20px",
          border: "1px solid #eee",
          borderRadius: "12px"
        }}
      >
        <h3>{editingId ? "Edit Listing" : "Add New Listing"}</h3>

        <input placeholder="Title eg; Modern 2BR Apartment in Westlands" value={title}
          onChange={(e) => setTitle(e.target.value)} style={input} 
        />

        <input placeholder="Location eg; WESTLANDS, NAIROBI "
          value={location}
          onChange={(e) => setLocation(e.target.value)} style={input} 
        />

        <input placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)} style={input} 
        />

        <input placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)} style={input} 
        />

        <select
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          style={{ marginTop: "10px", padding: "8px" }}
        >
          <option value="">Select Bedrooms</option>
          <option value="0">Bedsitter</option>
          <option value="1">1 Bedroom</option>
          <option value="2">2 Bedrooms</option>
          <option value="3">3 Bedrooms</option>
          <option value="4">4 Bedrooms</option>
        </select>

        {amenities.map((amenity) => (
          <label key={amenity} style={checkboxLabel}>

            <input
              type="checkbox"
              value={amenity}
              checked={selectedAmenities.includes(amenity)}
              onChange={handleAmenityChange}
            />
            {amenity}
          </label>
        ))}

        <textarea
          placeholder="Full description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%",
            minHeight: "100px",
            padding: "10px",
            marginTop: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc"
          }}
        />

        <select
          value={rentalType}
          onChange={(e) => setRentalType(e.target.value)}
          style={input}
        >
          <option value="monthly">For Rent (Monthly)</option>
          <option value="daily">Airbnb (Per Day)</option>
          <option value="sale">For Sale</option>
        </select>

        {!editingId && (
          <>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                const newFiles = Array.from(e.target.files)

                setImages(prev => {
                  const combined = [...prev, ...newFiles]
                  return combined.slice(0, 10)
                })
              }}
              style={{ marginTop: "10px" }}
            />
            <p style={{ fontSize: "13px", color: "#555" }}>
              Maximum 10 images per listing
            </p>

            <div
              style={{
                marginTop: "15px",
                display: "flex",
                gap: "10px",
                flexWrap: "wrap"
              }}
            >
              {images.map((img, index) => (
                <div key={index} style={{ position: "relative" }}>
                  <img
                    src={URL.createObjectURL(img)}
                    alt=""
                    width="100"
                    height="80"
                    style={{
                      objectFit: "cover",
                      borderRadius: "8px"
                    }}
                  />
                  <button
                    onClick={() =>
                      setImages(prev =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      background: "red",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      cursor: "pointer"
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <button style={button}>
          {editingId ? "Update Listing" : "Create Listing"}
        </button>
      </form>

      {!loading && houses.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "25px",
            marginTop: "40px"
          }}
        >
          {houses.map((house) => (
            <div key={house.id} style={card}>
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
                  Ksh {Number(house.price).toLocaleString()}{" "}
                  {house.rental_type === "daily"
                    ? "/ day"
                    : house.rental_type === "monthly"
                    ? "/ month"
                    : ""}
                </p>

                <p
                  style={{
                    color:
                      house.status === "available"
                        ? "green"
                        : "red",
                    fontWeight: "bold"
                  }}
                >
                  {house.status === "available"
                    ? "Available"
                    : "Rented"}
                </p>

                <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => handleEdit(house)}>Edit</button>

                  <button
                    onClick={() => handleDelete(house.id)}
                    style={{ background: "red", color: "white" }}
                  >
                    Delete
                  </button>

                  <button
                    onClick={() =>
                      toggleStatus(house.id, house.status)
                    }
                  >
                    {house.status === "available"
                      ? "Mark as Rented"
                      : "Mark as Available"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <p>Loading...</p>}
      {!loading && houses.length === 0 && (
        <p style={{ marginTop: "40px" }}>
          You have no listings yet.
        </p>
      )}
    </div>
  )
}

const input = {
  width: "100%",
  padding: "10px",
  marginTop: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc"
}

const button = {
  marginTop: "15px",
  padding: "10px 20px",
  borderRadius: "8px",
  border: "none",
  background: "black",
  color: "white",
  cursor: "pointer"
}

const card = {
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  background: "#fff"
}

const statsWrapper = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "20px",
  marginTop: "25px",
  marginBottom: "35px"
}

const statCard = {
  background: "#fff",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
  textAlign: "center"
}

const statNumber = {
  fontSize: "28px",
  fontWeight: "700",
  marginBottom: "6px"
}

const statLabel = {
  fontSize: "13px",
  color: "#777",
  letterSpacing: "1px"
}

const checkboxLabel = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginTop: "8px",
  fontSize: "14px"
}

export default LandlordDashboard