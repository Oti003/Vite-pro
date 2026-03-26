import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

function normalizePhone(phone: string | number) {
  let formattedPhone = String(phone).replace(/[^0-9]/g, "")

  if (formattedPhone.startsWith("254")) {
    formattedPhone = formattedPhone.slice(3)
  }

  if (formattedPhone.startsWith("0")) {
    formattedPhone = formattedPhone.slice(1)
  }

  return `254${formattedPhone}`
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { phone, amount, houseId, days = 7 } = await req.json()

    if (!phone || !amount || !houseId) {
      return jsonResponse(
        { success: false, message: "phone, amount and houseId are required" },
        400,
      )
    }

    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY")
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET")
    const passkey = Deno.env.get("MPESA_PASSKEY")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const shortcode = Deno.env.get("MPESA_SHORTCODE") || "174379"
    const mpesaBaseUrl = (Deno.env.get("MPESA_BASE_URL") || "https://sandbox.safaricom.co.ke").replace(/\/$/, "")
    const transactionType = Deno.env.get("MPESA_TRANSACTION_TYPE") || "CustomerPayBillOnline"

    if (!consumerKey || !consumerSecret || !passkey || !supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { success: false, message: "Missing required M-Pesa environment variables" },
        500,
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const formattedPhone = normalizePhone(phone)
    const callbackUrl =
      `${supabaseUrl}/functions/v1/mpesa-callback` +
      `?houseId=${encodeURIComponent(String(houseId))}` +
      `&days=${encodeURIComponent(String(days))}`

    const auth = btoa(`${consumerKey}:${consumerSecret}`)
    const tokenRes = await fetch(
      `${mpesaBaseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      },
    )

    const tokenData = await tokenRes.json().catch(() => null)

    if (!tokenRes.ok || !tokenData?.access_token) {
      return jsonResponse(
        {
          success: false,
          message: "Failed to get access token",
          details: tokenData,
        },
        502,
      )
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14)

    const password = btoa(shortcode + passkey + timestamp)

    const stkRes = await fetch(
      `${mpesaBaseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: transactionType,
          Amount: Math.ceil(amount),
          PartyA: formattedPhone,
          PartyB: shortcode,
          PhoneNumber: formattedPhone,
          CallBackURL: callbackUrl,
          AccountReference: `House_${houseId}`,
          TransactionDesc: "Feature Listing Payment",
        }),
      },
    )

    const stkData = await stkRes.json().catch(() => ({
      success: false,
      message: "Invalid JSON response from STK API",
      status: stkRes.status,
    }))

    console.log("STK push result", {
      status: stkRes.status,
      ok: stkRes.ok,
      baseUrl: mpesaBaseUrl,
      phone: formattedPhone,
      houseId,
      response: stkData,
    })

    const paymentStatus = stkRes.ok && stkData?.ResponseCode === "0" ? "pending" : "failed"

    const { error: paymentLogError } = await supabase
      .from("mpesa_feature_payments")
      .insert({
        house_id: houseId,
        phone: formattedPhone,
        amount: Math.ceil(amount),
        status: paymentStatus,
        merchant_request_id: stkData?.MerchantRequestID ?? null,
        checkout_request_id: stkData?.CheckoutRequestID ?? null,
        response_code: stkData?.ResponseCode ?? null,
        response_description: stkData?.ResponseDescription ?? null,
        customer_message: stkData?.CustomerMessage ?? null,
      })

    if (paymentLogError) {
      console.log("Failed to store M-Pesa payment log", paymentLogError)
    }

    return jsonResponse(
      {
        ...stkData,
        success: stkRes.ok && stkData?.ResponseCode === "0",
      },
      stkRes.ok ? 200 : 502,
    )
  } catch (err) {
    return jsonResponse(
      {
        success: false,
        message: err instanceof Error ? err.message : "Unknown error",
      },
      500,
    )
  }
})
