import { NextResponse } from 'next/server';
import { getAthleteById, getAthleteHistory } from '@/lib/localDataService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const sportParam = searchParams.get('sport') || 'Tennis';
  const sport = (['Tennis', 'Table Tennis', 'Football', 'Basketball'].includes(sportParam)
    ? sportParam
    : 'Tennis') as 'Tennis' | 'Table Tennis' | 'Football' | 'Basketball';

  const athlete = getAthleteById(id, sport);
  if (!athlete) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
  }

  const history = getAthleteHistory(id, athlete.sport);

  return NextResponse.json({
    athlete,
    history,
  });
}
