import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase credentials
const supabaseUrl = 'https://qrvnlnjymdwhndcxruvp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydm5sbmp5bWR3aG5kY3hydXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTQ3NzIsImV4cCI6MjA2OTk5MDc3Mn0.hGs3FM0i17OcYH5g3ICQWiYB0nh_lwNpHpiYczfLLnQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});