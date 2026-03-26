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

function extractMetadataValue(
  items: Array<{ Name?: string; Value?: unknown }> = [],
  key: string,
) {
  return items.find((item) => item?.Name === key)?.Value
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, message: "Missing Supabase credentials" }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const url = new URL(req.url)
    const houseId = url.searchParams.get("houseId")
    const featureDays = Number(url.searchParams.get("days") || "7")

    const payload = await req.json().catch(() => null)
    const callback = payload?.Body?.stkCallback

    if (!houseId || !callback) {
      return jsonResponse({ success: false, message: "Invalid callback payload" }, 400)
    }

    const resultCode = Number(callback.ResultCode)
    const metadataItems = callback.CallbackMetadata?.Item || []
    const receiptNumber = extractMetadataValue(metadataItems, "MpesaReceiptNumber")
    const paidPhone = extractMetadataValue(metadataItems, "PhoneNumber")
    const checkoutRequestId = callback.CheckoutRequestID
    const featuredUntil = new Date(
      Date.now() + featureDays * 24 * 60 * 60 * 1000,
    ).toISOString()

    const { error: paymentUpdateError } = await supabase
      .from("mpesa_feature_payments")
      .update({
        status: resultCode === 0 ? "completed" : "failed",
        result_code: resultCode,
        result_desc: callback.ResultDesc ?? null,
        receipt_number: receiptNumber ?? null,
        phone: paidPhone ? String(paidPhone) : null,
        featured_until: resultCode === 0 ? featuredUntil : null,
      })
      .eq("checkout_request_id", checkoutRequestId)

    if (paymentUpdateError) {
      console.log("Failed to update M-Pesa payment log", {
        checkoutRequestId,
        paymentUpdateError,
      })
    }

    if (resultCode !== 0) {
      console.log("STK callback failed", {
        houseId,
        resultCode,
        resultDesc: callback.ResultDesc,
        checkoutRequestId,
      })

      return jsonResponse({ success: true, status: "failed" })
    }

    const { error } = await supabase
      .from("houses")
      .update({
        is_featured: true,
        featured_until: featuredUntil,
      })
      .eq("id", houseId)

    if (error) {
      console.log("Failed to activate featured listing", {
        houseId,
        error,
        receiptNumber,
        paidPhone,
      })

      return jsonResponse({ success: false, message: "Failed to update listing" }, 500)
    }

    console.log("Featured listing activated", {
      houseId,
      receiptNumber,
      paidPhone,
      checkoutRequestId,
    })

    return jsonResponse({ success: true, status: "completed" })
  } catch (err) {
    console.log("mpesa-callback error", err)
    return jsonResponse(
      {
        success: false,
        message: err instanceof Error ? err.message : "Unknown callback error",
      },
      500,
    )
  }
})
