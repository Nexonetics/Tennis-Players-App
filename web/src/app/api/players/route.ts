import { NextResponse } from 'next/server';
import { searchAthletes } from '@/lib/localDataService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const sportParam = searchParams.get('sport') || 'Tennis';
  const sport = (['Tennis', 'Table Tennis', 'Football', 'Basketball'].includes(sportParam)
    ? sportParam
    : 'Tennis') as 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball';

  const gender = searchParams.get('gender') || undefined;
  const query = searchParams.get('query') || undefined;
  const country = searchParams.get('country') || undefined;
  const minRank = searchParams.get('minRank') ? parseInt(searchParams.get('minRank')!, 10) : undefined;
  const maxRank = searchParams.get('maxRank') ? parseInt(searchParams.get('maxRank')!, 10) : undefined;
  const sortBy = (searchParams.get('sortBy') as 'rank' | 'points' | 'name') || 'rank';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20;

  const result = searchAthletes({
    sport,
    gender,
    query,
    country,
    minRank,
    maxRank,
    sortBy,
    page,
    pageSize,
  });

  return NextResponse.json(result);
}
