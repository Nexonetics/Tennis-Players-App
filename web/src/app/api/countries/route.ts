import { NextResponse } from 'next/server';
import { getUniqueCountries } from '@/lib/localDataService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sportParam = searchParams.get('sport') || 'Tennis';
  const sport = (['Tennis', 'Table Tennis', 'Football', 'Basketball'].includes(sportParam)
    ? sportParam
    : 'Tennis') as 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball';

  const countries = getUniqueCountries(sport);
  return NextResponse.json({ countries });
}
