const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  // ✅ Handle preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { phone, amount, houseId } = await req.json()

    let formattedPhone = String(phone).replace(/[^0-9]/g, "")
    
    if (formattedPhone.startsWith("254")) {
      formattedPhone = formattedPhone.slice(3)
    }
    if (formattedPhone.startsWith("0")) {
      formattedPhone = formattedPhone.slice(1)
    }
    
    formattedPhone = "254" + formattedPhone


    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY")
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET")
    const passkey = Deno.env.get("MPESA_PASSKEY")

    const shortcode = "174379"

    const auth = btoa(`${consumerKey}:${consumerSecret}`)

    const tokenRes = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    )

   let tokenData = {}

    try {
      tokenData = await tokenRes.json()
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to get access token"
      }), {
        status: 200,
        headers: corsHeaders
      })
    }

    const accessToken = tokenData.access_token

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14)

    const password = btoa(shortcode + passkey + timestamp)

    const stkRes = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.ceil(amount),
          PartyA: formattedPhone,
          PartyB: shortcode,
          PhoneNumber: formattedPhone,
          CallBackURL: "https://mwhrqtwdfwbdcrwfmqzj.supabase.co/functions/v1/mpesa-callback",
          AccountReference: `House_${houseId}`,
          TransactionDesc: "Feature Listing Payment"
        })
      }
    )

    let stkData = {}

      try {
        stkData = await stkRes.json()
      } catch (e) {
        stkData = {
          error: "Invalid JSON response",
          status: stkRes.status
        }
      }

    return new Response(JSON.stringify(stkData), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    })

  }catch (err) {
    return new Response(JSON.stringify({
      success: false,
      message: err?.message || "Unknown error",
      fullError: err
    }), {
      status: 200, // 👈 IMPORTANT: force success so frontend receives it
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    })
  }
})








          
       
  
    