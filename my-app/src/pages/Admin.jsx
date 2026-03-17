import { useEffect, useState } from "react"
import { supabase } from "../supabase"

function Admin() {
  const [viewerImages,setViewerImages] = useState([])
  const [viewerIndex,setViewerIndex] = useState(0)
  const [view,setView] = useState("pending")
  const [houses, setHouses] = useState([])
  const [stats, setStats] = useState({
    total:0,
    pending:0,
    approved:0,
    landlords:0
  })


  // LOAD STATS
  async function loadStats() {

    // TOTAL LISTINGS
    const { count: totalListings } = await supabase
      .from("houses")
      .select("*", { count: "exact", head: true })

    // PENDING
    const { count: pendingListings } = await supabase
      .from("houses")
      .select("*", { count: "exact", head: true })
      .eq("approved", "pending")

    // APPROVED
    const { count: approvedListings } = await supabase
      .from("houses")
      .select("*", { count: "exact", head: true })
      .eq("approved", "approved")

    // UNIQUE LANDLORDS
    const { data: landlordsData } = await supabase
      .from("houses")
      .select("user_id")

    const landlordCount = new Set(
      (landlordsData || []).map(l => l.user_id)
    ).size

    // UNIQUE USERS (LOGIN EVENTS)
    const { data: loginData } = await supabase
      .from("login_events")
      .select("user_id")

    const uniqueUsers = new Set(
      (loginData || []).map(u => u.user_id)
    ).size

    setStats({
      total: totalListings || 0,
      pending: pendingListings || 0,
      approved: approvedListings || 0,
      landlords: landlordCount,
      signins: uniqueUsers
    })
  }

  function calculateScore(house){

    let score = 0

    if(house.title?.length > 10) score += 20
    if(house.description?.length > 40) score += 20
    if(house.image_urls?.length >= 3) score += 20
    if(house.price) score += 10
    if(house.location) score += 10
    if(house.bedrooms !== null) score += 10
    if(house.amenities?.length > 0) score += 10

    return score
  }

  // LOAD LISTINGS
  async function loadListings(){

    let query = supabase
      .from("houses")
      .select("*")
      .order("created_at",{ascending:false})

    if(view === "pending"){
      query = query.eq("status","pending")
    }

    if(view === "approved"){
      query = query.eq("status","available")
    }

    const { data,error } = await query

    if(error){
      console.log(error)
      return
    }

    setHouses(data || [])

  }

  // APPROVE LISTING
  async function approveHouse(id){

    await supabase
      .from("houses")
      .update({status:"available"})
      .eq("id",id)

    loadListings()
    loadStats()

  }

  // REJECT LISTING
  async function rejectHouse(id){

    await supabase
      .from("houses")
      .delete()
      .eq("id",id)

    loadListings()
    loadStats()

  }

  //MOST VIEWED LISTINGS
    async function loadPopular(){

    const { data } = await supabase
      .from("houses")
      .select("*")
      .order("views",{ascending:false})
      .limit(5)


  }

  useEffect(()=>{
    loadStats()
    loadPopular()
  },[])

  useEffect(()=>{
    loadStats()
  },[])

  useEffect(()=>{
    loadListings()
  },[view])

  // DUPLICATE DETECTION- incomplete
  function detectDuplicate(currentHouse, allHouses) {

    const duplicates = allHouses.filter(h => {
      if (h.id === currentHouse.id) return false

      const locationMatch =
        h.location?.toLowerCase() === currentHouse.location?.toLowerCase()

      const bedroomMatch =
        h.bedrooms === currentHouse.bedrooms

      const titleMatch =
        h.title?.toLowerCase().includes(currentHouse.title?.toLowerCase().split(" ")[0])

      const priceDifference =
        Math.abs(h.price - currentHouse.price)

      const priceThreshold =
        currentHouse.price * 0.15

      const priceMatch =
        priceDifference <= priceThreshold

      return locationMatch && bedroomMatch && priceMatch && titleMatch

    })

    return duplicates
  }

  return (
    <div
      style={{
        padding:"40px",
        marginTop:"120px",
        backgroundColor: "#c5c7c8",
      }}
    >

    <h1 style={{marginBottom:"30px"}}>Admin Dashboard</h1>


    {/* STATS */}
    <div
      style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
        gap:"20px",
        marginBottom:"40px"
      }}
    >

      <div style={statCard} onClick={()=>setView("total")}>
        Total Listings
        <h2>{stats.total}</h2>
      </div>

      <div style={statCard} onClick={()=>setView("pending")}>
        Pending Approval
        <h2>{stats.pending}</h2>
      </div>

      <div style={statCard} onClick={()=>setView("approved")}>
        Approved Listings
        <h2>{stats.approved}</h2>
      </div>

      <div style={statCard}>
        Active Landlords
        <h2>{stats.landlords}</h2>
      </div>

      <div style={statCard}>
        Platform Sign-ins
        <h2>{stats.signins}</h2>
      </div>

    </div>



    {/* LISTINGS GRID */}

    {houses.length === 0 && (
      <p>No listings found.</p>
    )}

    <div
      style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",
        gap:"30px"
      }}
    >

    {houses.map((house) => (

      
    <div
      key={house.id}
      style={{
        border:"1px solid #eee",
        borderRadius:"12px",
        padding:"20px",
        background:"#fff"
      }}
    >

    {/* MAIN IMAGE */}

    <img
      src={house.image_urls?.[0]}
      alt="house"
      onClick={()=>{
        setViewerImages(house.image_urls || [])
        setViewerIndex(0)
      }}
      style={{
        width:"100%",
        height:"200px",
        objectFit:"cover",
        borderRadius:"10px",
        marginBottom:"10px",
        cursor:"pointer"
      }}
    />


    {/* IMAGE THUMBNAILS */}

    <div
      style={{
        display:"flex",
        gap:"8px",
        overflowX:"auto",
        marginBottom:"10px"
      }}
    >

    {house.image_urls?.map((img,index)=>(
    <img
      key={index}
      src={img}
      alt="house"
      onClick={()=>{
        setViewerImages(house.image_urls || [])
        setViewerIndex(index)
      }}
      style={{
        width:"80px",
        height:"60px",
        objectFit:"cover",
        borderRadius:"6px",
        cursor:"pointer"
      }}
    />
    ))}

    </div>


    <h3 style={{display:"flex",alignItems:"center",gap:"10px"}}>
    {house.title}

      <span
        style={{
          background:
            house.status === "pending" ? "#facc15" : "#16a34a",
          color:"#fff",
          padding:"4px 8px",
          borderRadius:"6px",
          fontSize:"12px",
          textTransform:"capitalize"
        }}
      >
        {house.status}
      </span>

  </h3>

    <p>{house.location}</p>

    <p>KES {house.price}</p>

    <p>{house.bedrooms} Bedrooms</p>

    <p>Views: {house.views || 0}</p>

    <p
    style={{
      fontWeight:"600",
      color:
        calculateScore(house) >= 70
          ? "#16a34a"
          : calculateScore(house) >= 40
          ? "#eab308"
          : "#dc2626"
    }}
    >
     Listing Score: {calculateScore(house)}/100
    </p>



    <div style={{display:"flex",gap:"10px",marginTop:"15px"}}>

    <button
      onClick={()=>approveHouse(house.id)}
      style={{
        background:"#16a34a",
        color:"white",
        border:"none",
        padding:"8px 12px",
        borderRadius:"6px",
        cursor:"pointer"
      }}
    >
    Approve
    </button>


    <button
      onClick={()=>rejectHouse(house.id)}
      style={{
        background:"#dc2626",
        color:"white",
        border:"none",
        padding:"8px 12px",
        borderRadius:"6px",
        cursor:"pointer"
      }}
    >
    Reject
    </button>

    </div>

    </div>

  ))}

    </div>



    {/* IMAGE VIEWER MODAL */}

    {viewerImages.length > 0 && (

    <div
      style={{
        position:"fixed",
        inset:0,
        background:"rgba(0,0,0,0.85)",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        zIndex:1000
      }}
    >

    <button
      onClick={()=>setViewerImages([])}
      style={{
        position:"absolute",
        top:"20px",
        right:"20px",
        fontSize:"26px",
        background:"none",
        border:"none",
        color:"white",
        cursor:"pointer"
      }}
    >
    ✕
    </button>


    <button
      onClick={()=>setViewerIndex(i=>Math.max(i-1,0))}
      style={navButton}
    >
    ◀
    </button>


    <img
      src={viewerImages[viewerIndex]}
      alt="preview"
      style={{
        maxWidth:"85%",
        maxHeight:"85%",
        borderRadius:"12px"
      }}
    />


    <button
      onClick={()=>setViewerIndex(i=>Math.min(i+1,viewerImages.length-1))}
      style={navButton}
    >
    ▶
    </button>

    </div>

    )}

    </div>

  )

}


const navButton = {
  position:"absolute",
  fontSize:"40px",
  background:"none",
  border:"none",
  color:"white",
  cursor:"pointer",
  padding:"20px",
  left:"40px",
  right:"40px"
}

 const statCard = {
  background:"#fff",
  padding:"20px",
  borderRadius:"12px",
  boxShadow:"0 10px 30px rgba(0,0,0,0.05)",
  fontWeight:"500",
  cursor:"pointer",
  transition:"0.2s",
  marginTop:"90px"
}

export default Admin