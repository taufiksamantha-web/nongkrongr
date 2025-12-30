// Deploy file ini ke Supabase Edge Functions
// Command: supabase functions deploy push-notification

declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.3'

console.log('Push Notification Function Started')

// Ambil Keys dari Environment Variables (Set di Dashboard Supabase > Edge Functions > Secrets)
// VAPID_PRIVATE_KEY harus digenerate pasangannya dengan PUBLIC KEY yang ada di frontend
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env.toObject()

if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
  console.error('VAPID Keys not configured!')
}

webpush.setVapidDetails(
  'mailto:admin@nongkrongr.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req: any) => {
  try {
    // 1. Terima Payload dari Database Webhook
    const payload = await req.json()
    
    // Validasi: Pastikan trigger adalah INSERT data baru
    if (payload.type !== 'INSERT' || !payload.record) {
      return new Response('Not an INSERT event', { status: 200 })
    }

    const notification = payload.record
    const userId = notification.user_id

    console.log(`Sending notification to user: ${userId}`)

    // 2. Ambil semua device/subscription milik user tersebut dari DB
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (error || !subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for user')
      return new Response('No subscriptions', { status: 200 })
    }

    // 3. Kirim Notifikasi ke semua device user (Parallel)
    const pushPayload = JSON.stringify({
      title: notification.title,
      message: notification.message,
      url: notification.target_id ? `/#/cafe/${notification.target_id}` : '/', // Deep link logic
      icon: 'https://nongkrongr.com/icon.png' // Ganti dengan URL icon app kamu
    })

    const promises = subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: sub.keys
        }, pushPayload)
        return { success: true }
      } catch (err: any) {
        // Jika status 410 (Gone), berarti user sudah revoke permission atau uninstall browser
        // Kita hapus datanya dari DB biar bersih
        if (err.statusCode === 410) {
          console.log(`Subscription expired/gone, deleting: ${sub.id}`)
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('Error sending push:', err)
        }
        return { success: false, error: err }
      }
    })

    await Promise.all(promises)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})