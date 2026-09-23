import { createClient } from '@supabase/supabase-js';

// This is the public (anon) key. Row-level security protects team data.
export const supabase = createClient(
  'https://tiyiunqlakedwusawmag.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpeWl1bnFsYWtlZHd1c2F3YW1hZyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzkwMTQzNDAwLCJleHAiOjIxMDU3MTk0MDB9.9-eGzENNL_JdSnwd2QpPvFdRAt31yjbSMsuTSMu3_8Q',
);

export const ADMIN_EMAILS = ['asd0578236@gmail.com', 'nt860806@gmail.com'];
