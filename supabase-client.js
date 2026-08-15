// ============================================
// Central de Alunos — Cliente Supabase
// Mesmo banco do IP Educacional (sistema principal).
// A anon key é pública por natureza — quem protege os
// dados é o RLS já configurado nas tabelas (ver padrão
// usado em meus-dados.js do sistema principal).
// ============================================

const SUPABASE_URL = "https://clscbtkpomjdwbcwmbep.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsc2NidGtwb21qZHdiY3dtYmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MDY0MTgsImV4cCI6MjA5OTE4MjQxOH0.YfrZ1LR2kI2wUUv5zH0xhNUt9FMc-jTMaiCget3juS4";

// window.supabase vem do script UMD carregado no <head> do HTML
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
