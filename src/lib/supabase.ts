import { createClient } from '@supabase/supabase-js';

// This is the public (anon) key. Row-level security protects team data.
export const supabase = createClient(
  'https://tiyiunqlakedwusawmag.supabase.co',
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpeWl1bnFsYWtlZHd1c2F3bWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNDM0MDAsImV4cCI6MjEwNTcxOTQwMH0.9-eGzENNL_JdSnwd2QpPvFdRAt31yjbSMsuTSMu3_8Q",
);

export const ADMIN_EMAILS = ['asd0578236@gmail.com', 'nt860806@gmail.com'];

export const getTaipeiDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());

export const isProductAvailable = (product: { status: string; unpublishAt?: string | null; archived?: boolean }) => {
  if (product.archived || !['active', 'closing_soon'].includes(product.status)) return false;
  if (!product.unpublishAt) return true;
  return product.unpublishAt >= getTaipeiDate();
};
