import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { toast } from "react-hot-toast"
import imageCompression from "browser-image-compression"

// Normalize location text to title case (e.g., "WESTLAND" → "Westland")
function normalizeLocation(location) {
  if (!location) return ""
  return location
    .trim()
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function LandlordDashboard({ user }) {
  const [selectedLocation, setSelectedLocation] = useState("")
  
  const navigate = useNavigate()
  const [hasMore, setHasMore] = useState(true)

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
  
  // Feature modal state
  const [showFeatureModal, setShowFeatureModal] = useState(false)
  const [paymentPhone, setPaymentPhone] = useState("")
  const [houseToFeature, setHouseToFeature] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [paymentStatusMessage, setPaymentStatusMessage] = useState("")
  const [isCheckingPayment, setIsCheckingPayment] = useState(false)
  
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

  const LIMIT = 10
  const [page, setPage] = useState(0)

  async function fetchMyHouses() {
    setLoading(true)

  const from = page * LIMIT
  const to = from + LIMIT - 1

  const { data, error } = await supabase
    .from("houses")
    .select("id, title, location, price, status, image_urls, created_at, approval_status, rental_type")
    .eq("user_id", user.id)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    console.log(error)
    setLoading(false)
    return
  }

  setHouses(data || [])
  setLoading(false)
  }

  
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
  }, [user, page])

  
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

    const finalLocation = selectedLocation || location

    // Validate required fields including location
    if (!title.trim()) {
      alert("Please enter a title")
      return
    }

    if (!finalLocation.trim()) {
      alert("Please select or enter a location/ward")
      return
    }

    if (!price || isNaN(price) || parseInt(price) <= 0) {
      alert("Please enter a valid price")
      return
    }

    if (!phone.trim()) {
      alert("Please enter a phone number")
      return
    }

    if (selectedAmenities.length === 0) {
      alert("Please select at least one amenity")
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
          location: sanitize(normalizeLocation(finalLocation)),
          location_slug: normalizeLocation(finalLocation).toLowerCase().replace(/\s+/g, "-"),
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
      const normalizedLocation = normalizeLocation(finalLocation)
      const { data: existing } = await supabase
        .from("houses")
        .select("id, price, title, image_urls")
        .ilike("location", normalizedLocation)

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
          location: sanitize(normalizeLocation(finalLocation)),
          location_slug: normalizeLocation(finalLocation).toLowerCase().replace(/\s+/g, "-"),
          price: parseInt(price),
          bedrooms: parseInt(bedrooms),
          landlord_phone: phone,
          amenities: selectedAmenities,
          description: sanitize(description),
          user_id: user.id,
          image_urls: imageUrls,
          rental_type: rentalType,
          status:"available",
          approval_status: "pending",
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
    setSelectedLocation("")
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
    currentStatus === "available" ? "rented" : "available"

  const { error } = await supabase
    .from("houses")
    .update({ status: newStatus })
    .eq("id", id)

  if (error) {
    console.log(error)
    return
  }

  // ✅ update UI properly
  setHouses(prev =>
    prev.map(h =>
      h.id === id ? { ...h, status: newStatus } : h
    )
  )
  }

  // Edit listing
  function handleEdit(house) {
    setEditingId(house.id)
    setTitle(house.title)
    setLocation(house.location)
    setPrice(house.price)
    setPhone(house.landlord_phone || "")
    setSelectedAmenities(house.amenities || [])
    setDescription(house.description || "")
    setRentalType(house.rental_type || "monthly")
    setHasMore(data.length === LIMIT)
  }

  async function handleFeature(houseId) {
    setHouseToFeature(houseId)
    setPaymentStatus(null)
    setPaymentStatusMessage("")
    setShowFeatureModal(true)
  }

  async function pollPaymentStatus(houseId, timeoutMs = 90000) {
    setIsCheckingPayment(true)
    const startedAt = Date.now()

    while (Date.now() - startedAt < timeoutMs) {
      const { data, error } = await supabase
        .from("mpesa_feature_payments")
        .select("status, result_desc, response_description, customer_message, receipt_number, created_at")
        .eq("house_id", houseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        if (data.status === "completed") {
          setPaymentStatus("completed")
          setPaymentStatusMessage(
            data.receipt_number
              ? `Payment completed. Receipt: ${data.receipt_number}.`
              : "Payment completed successfully."
          )
          setIsCheckingPayment(false)
          return "completed"
        }

        if (data.status === "failed") {
          setPaymentStatus("failed")
          setPaymentStatusMessage(
            data.result_desc ||
              data.response_description ||
              data.customer_message ||
              "M-Pesa reported that the payment did not complete."
          )
          setIsCheckingPayment(false)
          return "failed"
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 4000))
    }

    setPaymentStatus("pending")
    setPaymentStatusMessage("Still waiting for sandbox confirmation. Check your phone and Supabase logs.")
    setIsCheckingPayment(false)
    return "pending"
  }

  async function processFeaturePayment() {
    if (!paymentPhone || !paymentPhone.trim()) {
      toast.error("Please enter a phone number")
      return
    }

    const FEATURE_PRICE = 99 // Amount in KES (use 99 KES for testing)
    const toastId = toast.loading("Initiating M-Pesa payment...")
    setPaymentStatus("starting")
    setPaymentStatusMessage("Sending STK request to M-Pesa sandbox...")

    try {
      // Call Supabase Edge Function to initiate STK Push
      const response = await supabase.functions.invoke("stk-push", {
        body: {
          phone: paymentPhone,
          amount: FEATURE_PRICE,
          houseId: houseToFeature
        }
      })

      if (response.error) {
        toast.dismiss(toastId)
        setPaymentStatus("failed")
        setPaymentStatusMessage(response.error.message || "Failed to initiate payment")
        setIsCheckingPayment(false)
        toast.error(`Payment error: ${response.error.message || "Failed to initiate payment"}`)
        return
      }

      const stkData = response.data
      console.log("STK push response:", stkData)

      const mpesaReason = [
        stkData?.errorMessage,
        stkData?.ResponseDescription,
        stkData?.CustomerMessage,
        stkData?.message,
        stkData?.errorCode ? `Code ${stkData.errorCode}` : null,
        stkData?.ResponseCode ? `Response ${stkData.ResponseCode}` : null
      ]
        .filter(Boolean)
        .join(" | ")

      // Check M-Pesa response
      if (stkData.errorCode || stkData.ResponseCode !== "0") {
        toast.dismiss(toastId)
        setPaymentStatus("failed")
        setPaymentStatusMessage(mpesaReason || "Payment initiation failed")
        setIsCheckingPayment(false)
        toast.error(`M-Pesa Error: ${mpesaReason || "Payment initiation failed"}`)
        return
      }

      toast.dismiss(toastId)
      setPaymentStatus("pending")
      setPaymentStatusMessage("STK request accepted. Waiting for sandbox callback...")
      toast.success("Payment prompt sent to your phone! Complete the payment to feature your listing.")

      const finalStatus = await pollPaymentStatus(houseToFeature)

      if (finalStatus === "failed") {
        toast.error("Payment was not completed.")
        return
      }

      if (finalStatus !== "completed") {
        return
      }

      toast.success("Listing featured for 7 days! 🚀")
      fetchMyHouses() // Refresh listings
      setShowFeatureModal(false) // Close modal
      setPaymentPhone("") // Reset phone
      setHouseToFeature(null) // Reset house

    } catch (err) {
      toast.dismiss(toastId)
      console.log("Feature error:", err)
      toast.error("Something went wrong. Please try again.")
    }
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

        <div style={{ marginTop: "15px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
            Ward/Location <span style={{ color: "red" }}>*</span>
          </label>
          <p style={{ fontSize: "13px", color: "#666", marginBottom: "10px" }}>
            Click on the map below to select your ward, or type it here:
          </p>
          <input 
            placeholder="Select ward from map or enter location (e.g., Westlands, Lavington)"
            value={selectedLocation || location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              ...input,
              borderColor: (!selectedLocation && !location) ? "#ff6b6b" : "#ccc",
              borderWidth: "2px"
            }}
          />
        </div>

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

                {house.approval_status !== "approved" && (
                  <p
                    style={{
                      background: "#facc15",
                      color: "#000",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      display: "inline-block",
                      fontSize: "12px",
                      fontWeight: "600",
                      marginBottom: "8px"
                    }}
                  >
                    Pending Approval
                  </p>
                )}

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
                  <button onClick={() => handleEdit(house)}
                  style={{ 
                    background: "gray",    color: "white",
                    marginTop: "15px",
                    padding: "6px",
                    borderRadius: "2px",
                    border: "none",
                    cursor: "pointer"
                    }} 
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(house.id)}
                    style={{ background: "red", color: "white",
                    marginTop: "15px",
                    padding: "6px",
                    borderRadius: "2px",
                    border: "none",
                    cursor: "pointer"
                    }}
                  >
                    Delete
                  </button>

                 {house.approval_status === "approved" && (
                <button
                  onClick={() =>
                    toggleStatus(house.id, house.status)
                  }
                  disabled={house.approval_status !== "approved"}
                  style={{
                    color: "white",
                    marginTop: "15px",
                    padding: "6px",
                    borderRadius: "2px",
                    border: "none",
                    background:
                      house.approval_status !== "approved"
                        ? "#ccc"
                        : "#2563eb",
                    cursor:
                      house.approval_status !== "approved"
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      house.approval_status !== "approved" ? 0.7 : 1
                  }}
                >
                  {house.status === "available"
                    ? "Mark as Rented"
                    : "Mark as Available"}
                </button>
                )}

                {/* COMPLETE BY RECIEVING THE PROMPT ON YOUR PHONE AND COMPLETE THE TRANSACTION */}

                {/* 
                <button
                  onClick={() => handleFeature(house.id)}
                  style={featureButton}
                >
                <h3> Featured Listing ⭐</h3> 
                </button> 
                */}

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

      


      <p style={{ textAlign: "center",   marginTop: "20px", color: "#555" }}>
        Page {page + 1}
      </p>
      <div style={paginationWrapper}>
        <button
          onClick={() => setPage(p => Math.max(p - 1, 0))}
          style={paginationButton}
          disabled={page === 0}
        >
          Prev
        </button>

        <button
          onClick={() => setPage(p => p + 1)}
          style={paginationButton}
        >
          Next
        </button>
      </div>
      
      
      {/* FEATURE PAYMENT MODAL*/} 
        {showFeatureModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "12px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center", color: "#333" }}>
              Feature Your Listing ⭐
            </h3>

            <p style={{ marginBottom: "20px", color: "#666", textAlign: "center" }}>
              Enter your M-Pesa phone number to pay KSh 99 for 7 days of featured listing.
            </p>

            <input
              type="tel"
              //placeholder="e.g., +254712345678 or 0712345678"
              value={paymentPhone}
              onChange={(e) => setPaymentPhone(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                border: "2px solid #e1e5e9",
                borderRadius: "8px",
                fontSize: "16px",
                marginBottom: "20px",
                outline: "none"
              }}
              autoFocus
            />

            {paymentStatus && (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background:
                    paymentStatus === "completed"
                      ? "#dcfce7"
                      : paymentStatus === "failed"
                      ? "#fee2e2"
                      : "#eff6ff",
                  color:
                    paymentStatus === "completed"
                      ? "#166534"
                      : paymentStatus === "failed"
                      ? "#991b1b"
                      : "#1d4ed8",
                  fontSize: "14px",
                  lineHeight: 1.5
                }}
              >
                <strong style={{ display: "block", marginBottom: "4px" }}>
                  {paymentStatus === "starting"
                    ? "Starting payment"
                    : paymentStatus === "pending"
                    ? isCheckingPayment
                      ? "Waiting for callback"
                      : "Still pending"
                    : paymentStatus === "completed"
                    ? "Payment completed"
                    : "Payment failed"}
                </strong>
                <span>{paymentStatusMessage}</span>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => {
                  setShowFeatureModal(false)
                  setPaymentPhone("")
                  setHouseToFeature(null)
                  setPaymentStatus(null)
                  setPaymentStatusMessage("")
                }}
                disabled={isCheckingPayment}
                style={{
                  padding: "10px 20px",
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: isCheckingPayment ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  opacity: isCheckingPayment ? 0.7 : 1
                }}
              >
                Cancel
              </button>

              <button
                onClick={processFeaturePayment}
                disabled={isCheckingPayment}
                style={{
                  padding: "10px 20px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: isCheckingPayment ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  opacity: isCheckingPayment ? 0.7 : 1
                }}
              >
                {isCheckingPayment ? "Checking..." : "Pay KSh 99"}
              </button>
            </div>
          </div>
        </div>
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

const featureButton={ 
  background: "gold", 
  color: "black",
  border: "none",
  marginTop:"12px",
  borderRadius: "5px"
} 

const paginationWrapper = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "15px",
  marginTop: "30px"
}

const paginationButton = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: "500"
}

export default LandlordDashboard
