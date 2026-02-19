import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { create as createJWT } from "https://deno.land/x/djwt@v2.8/mod.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""

// Try multiple secret names for compatibility
const FIREBASE_SERVICE_ACCOUNT = JSON.parse(
    Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ||
    Deno.env.get('FIREBASE_SERVICE_ACCOUNT2') ||
    Deno.env.get('FCM_SERVICE_ACCOUNT') ||
    "{}"
)

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Push Notification Function (New Order -> Admin) Initialized")
console.log("Firebase project:", FIREBASE_SERVICE_ACCOUNT.project_id || 'NOT SET')

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { record, old_record, type } = await req.json()

        if (!record) {
            return new Response(JSON.stringify({ message: 'No record found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const accessToken = await getAccessToken(FIREBASE_SERVICE_ACCOUNT)

        // --- CASE 1: NEW ORDER (INSERT) -> Notify Admins ---
        if (type === 'INSERT' || (!type && !old_record)) {
            console.log('New order received:', JSON.stringify(record))

            // 1. Get all admin user IDs
            const { data: admins, error: adminError } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('role', 'admin')

            if (adminError) throw adminError
            const adminIds = admins?.map(a => a.user_id) || []

            if (adminIds.length === 0) {
                return new Response(JSON.stringify({ message: 'No admins found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            // 2. Get FCM tokens for all admins
            const { data: tokens, error: tokenError } = await supabase
                .from('user_fcm_tokens')
                .select('token')
                .in('user_id', adminIds)

            if (tokenError) throw tokenError
            const fcmTokens = [...new Set(tokens?.map(t => t.token) || [])]

            if (fcmTokens.length === 0) {
                return new Response(JSON.stringify({ message: 'No admin tokens found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            // 3. Send notification to admins
            const totalAmount = record.total_amount || 0
            const customerName = record.customer_name || 'زبون'

            const results = await Promise.all(fcmTokens.map(token =>
                sendFCM(accessToken, FIREBASE_SERVICE_ACCOUNT.project_id, token, {
                    title: 'طلب جديد! 🎉',
                    body: `طلب جديد من ${customerName} بقيمة ${totalAmount} د.ع`,
                    data: {
                        type: 'new_order',
                        order_id: record.id || '',
                    }
                })
            ))

            return new Response(JSON.stringify({ success: true, type: 'admin_notification', sent_to: fcmTokens.length }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // --- CASE 2: STATUS UPDATE (UPDATE) -> Notify Customer ---
        if (type === 'UPDATE' || (old_record && record.status !== old_record.status)) {
            const newStatus = record.status
            const oldStatus = old_record?.status

            if (newStatus === oldStatus) {
                return new Response(JSON.stringify({ message: 'Status unchanged' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            console.log(`Order ${record.id} status changed: ${oldStatus} -> ${newStatus}`)

            const statusLabels: Record<string, string> = {
                pending: 'في الانتظار',
                confirmed: 'مؤكد',
                preparing: 'قيد التحضير',
                ready: 'جاهز للاستلام',
                delivered: 'تم التسليم',
                cancelled: 'ملغى',
            }

            const statusLabel = statusLabels[newStatus] || newStatus
            const orderNum = (record.id || '').slice(0, 8)

            // 1. Get FCM tokens for the customer
            const { data: tokens, error: tokenError } = await supabase
                .from('user_fcm_tokens')
                .select('token')
                .eq('user_id', record.user_id)

            if (tokenError) throw tokenError
            const customerTokens = [...new Set(tokens?.map(t => t.token) || [])]

            if (customerTokens.length === 0) {
                return new Response(JSON.stringify({ message: 'No customer tokens found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            // 2. Send notification to customer
            const results = await Promise.all(customerTokens.map(token =>
                sendFCM(accessToken, FIREBASE_SERVICE_ACCOUNT.project_id, token, {
                    title: `📦 تحديث طلبك #${orderNum}`,
                    body: `حالة طلبك تغيرت إلى: ${statusLabel}`,
                    data: {
                        type: 'order_status_update',
                        order_id: record.id || '',
                    }
                })
            ))

            return new Response(JSON.stringify({ success: true, type: 'customer_notification', sent_to: customerTokens.length }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ message: 'Nothing to do' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Error in push-notification function:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

/**
 * Helper to send FCM message
 */
async function sendFCM(accessToken: string, projectId: string, token: string, payload: { title: string, body: string, data: any }) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: {
                token: token,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data,
                android: {
                    priority: "high",
                    notification: {
                        sound: "default",
                        channel_id: "orders_channel",
                        click_action: "FCM_PLUGIN_ACTIVITY",
                        default_vibrate_timings: true,
                        default_light_settings: true,
                        visibility: "PUBLIC",
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: "default",
                            badge: 1,
                            "content-available": 1,
                        }
                    }
                }
            }
        })
    })
    const result = await res.json()
    console.log('FCM send result:', JSON.stringify(result))
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
            scope: "https://www.googleapis.com/auth/cloud-platform",
        },
        await importKey(serviceAccount.private_key)
    )

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    })

    const data = await res.json()
    if (!data.access_token) {
        console.error('Failed to get access token:', JSON.stringify(data))
        throw new Error('Failed to get Firebase access token')
    }
    return data.access_token
}

async function importKey(pem: string) {
    const pemContents = pem
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace(/\\n/g, "")
        .replace(/\n/g, "")
        .replace(/\r/g, "")
        .replace(/\s/g, "")
        .trim()

    const binaryDerString = atob(pemContents)
    const binaryDer = new Uint8Array(binaryDerString.length)
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i)
    }

    return await crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        false,
        ["sign"]
    )
}
