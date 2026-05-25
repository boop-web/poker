const { createClient } = require("@supabase/supabase-js");
const SUPABASE_URL = "https://ikxcevgggmmfnmtmileg.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlreGNldmdnZ21tZm5tdG1pbGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDE4NDksImV4cCI6MjA5NTIxNzg0OX0.JKBu3mObaoGlTqJh_cdqwwAw2KqI6FYWO9bHYhY7hE0";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
async function check() {
  const { data: tables } = await supabase
    .from("poker_tables")
    .select("id", { count: "exact", head: true });
  console.log("poker_tables exists:", tables !== null);
  const { data: seats } = await supabase
    .from("table_seats")
    .select("id", { count: "exact", head: true });
  console.log("table_seats exists:", seats !== null);
  const { data: holes } = await supabase
    .from("seat_holes")
    .select("id", { count: "exact", head: true });
  console.log("seat_holes exists:", holes !== null);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  console.log("profiles exists:", profiles !== null);
}
check().catch(console.error);
