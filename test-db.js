require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  console.log("Checking if security_incidents table exists...");
  const { data, error } = await supabase.from('security_incidents').select('*').limit(1);
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Table exists! Data:", data);
  }

  console.log("Checking user_risk_scores...");
  const { data: data2, error: error2 } = await supabase.from('user_risk_scores').select('*').limit(1);
  if (error2) {
    console.error("Error2:", error2.message);
  } else {
    console.log("Table exists! Data2:", data2);
  }
}

test();
