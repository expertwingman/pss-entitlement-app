import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function proxy(request) {
  const path = request.nextUrl.pathname;

  // Lewati untuk aset statis dan API
  if (path.startsWith('/_next') || path.startsWith('/api') || path.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { session } } = await supabase.auth.getSession();

  // Jika tidak login
  if (!session) {
    if (path.startsWith('/admin') || path.startsWith('/dashboard') || 
        path.startsWith('/tickets') || path.startsWith('/scan')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Ambil role user
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  const isAdmin = profile?.is_admin || false;

  // Jika ADMIN dan di halaman yang salah → redirect ke /admin
  if (isAdmin && (path === '/' || path === '/dashboard' || path === '/tickets')) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Jika SUPPORTER dan di halaman admin → redirect ke /dashboard
  if (!isAdmin && (path.startsWith('/admin') || path === '/scan')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*', '/dashboard/:path*', '/tickets', '/scan'],
};
