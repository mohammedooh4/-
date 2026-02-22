import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { create as createJWT } from "https://deno.land/x/djwt@v2.8/mod.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""

const FIREBASE_SERVICE_ACCOUNT = JSON.parse(
  Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ||
  Deno.env.get('FCM_SERVICE_ACCOUNT') ||
  "{}"
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Order Status Notification Function Started")
console.log("Firebase project:", FIREBASE_SERVICE_ACCOUNT.project_id || "NOT SET")

serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {

    const body = await req.json()
    const record = body.record
    const old_record = body.old_record
    const type = body.type

    console.log("Received event:", type)

    if (!record || !old_record) {
      return new Response(JSON.stringify({
        message: "Missing record or old_record"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // فقط عند تغيير الحالة
    if (type !== "UPDATE" || record.status === old_record.status) {
      return new Response(JSON.stringify({
        message: "Status not changed"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Order ${record.id} status changed: ${old_record.status} -> ${record.status}`)

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    )

    // الحصول على access token من Firebase
    const accessToken = await getAccessToken(FIREBASE_SERVICE_ACCOUNT)

    console.log("Access token obtained")

    const statusLabels: Record<string, string> = {
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      ready: 'جاهز',
      delivered: 'تم التسليم',
      cancelled: 'ملغى',
    }

    const statusLabel = statusLabels[record.status] || record.status
    const orderNum = (record.id || "").slice(0, 8)

    // جلب التوكنات
    const { data: tokensData, error: tokensError } = await supabase
      .from("user_fcm_tokens")
      .select("token")
      .eq("user_id", record.user_id)

    if (tokensError) {
      throw tokensError
    }

    const tokens = [...new Set(tokensData?.map(t => t.token) || [])]

    console.log("Found tokens:", tokens.length)

    if (tokens.length === 0) {
      return new Response(JSON.stringify({
        message: "No tokens found"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // إرسال الإشعارات
    const results = await Promise.all(
      tokens.map(async (token) => {

        const result = await sendFCM(
          accessToken,
          FIREBASE_SERVICE_ACCOUNT.project_id,
          token,
          {
            title: `طلبك: ${statusLabel}`,
            body: `طلبك #${orderNum} تم تحديثه`,
            data: {
              order_id: record.id,
              type: "order_status_update"
            }
          }
        )

        // حذف التوكن المعطل
        if (result?.error) {
          console.log("Removing invalid token:", token)

          await supabase
            .from("user_fcm_tokens")
            .delete()
            .eq("token", token)
        }

        return result

      })
    )

    console.log("Notifications sent")

    return new Response(JSON.stringify({
      success: true,
      tokens: tokens.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  }
  catch (error) {

    console.error("Error:", error)

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  }

})

async function sendFCM(
  accessToken: string,
  projectId: string,
  token: string,
  payload: any
) {

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: {
            title: payload.title,
            body: payload.body
          },
          data: payload.data,
          android: {
            priority: "high",
            notification: {
              sound: "mixkit_software_interface_start_2574",
              channel_id: "orders_sound_channel",
              icon: "ic_notification",
              click_action: "FCM_PLUGIN_ACTIVITY",
              default_vibrate_timings: true,
              default_light_settings: true,
              visibility: "PUBLIC",
            }
          },
          webpush: {
            notification: {
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              dir: "rtl",
              renotify: true,
              tag: "order_status"
            },
            fcm_options: {
              link: "/cart"
            }
          }
        }
      })
    }
  )

  const result = await res.json()

  console.log("FCM result:", result)

  return result
}

async function getAccessToken(serviceAccount: any) {

  const jwt = await createJWT(
    { alg: "RS256", typ: "JWT" },
    {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    },
    await importKey(serviceAccount.private_key)
  )

  const res = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      })
    }
  )

  const data = await res.json()

  if (!data.access_token) {
    throw new Error("Failed to get access token")
  }

  return data.access_token
}

async function importKey(pem: string) {

  const clean = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "")
    .trim()

  const binary = atob(clean)
  const buffer = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i)
  }

  return await crypto.subtle.importKey(
    "pkcs8",
    buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  )

}