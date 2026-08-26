const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase Storage Warning] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

module.exports = supabase;
