import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('[supabase] URL:', supabaseUrl ? supabaseUrl.slice(0, 30) + '...' : 'MISSING')
console.log('[supabase] KEY:', supabaseKey ? supabaseKey.slice(0, 20) + '...' : 'MISSING')

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase env vars not set — calendar save/load will be disabled.')
}

let supabaseClient = null
if (supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey)
    console.log('[supabase] Client created successfully')
  } catch (e) {
    console.error('[supabase] Failed to create client:', e)
  }
}

export const supabase = supabaseClient
