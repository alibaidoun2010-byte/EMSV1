import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
    const SUPABASE_URL = 'https://ygfgsyzullfpibobxppj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZmdzeXp1bGxmcGlib2J4cHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTc0NDUsImV4cCI6MjA3MjgzMzQ0NX0.OqiLz5PYl4J4Mdk5NdRBWp5RxQE743ZBT0g52RS5I-c';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


loadLogo();

async function loadLogo() {

  const { data, error } = await supabase
    .from('info')
    .select('index')
    .single();

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById('developerLogo').src =
    data.index;
}