import '../widgets/ranking_graph.dart';

class Player {
  final int id;
  final String name;
  final String? country;
  final int? ranking;
  final int? highestRanking;
  final DateTime? highestRankingDate;
  final DateTime? birthDate;
  final String? height;
  final String? weight;
  final String? playingStyle;
  final int wins;
  final int losses;
  final String? turnedPro;
  final String? prizeMoney;
  final String? imageUrl;
  final String? gender;
  final String? source;
  final DateTime? lastUpdated;
  final List<RankingPoint>? rankingHistory;
  final int? careerHighRank;
  final DateTime? careerHighDate;

  Player({
    required this.id,
    required this.name,
    this.country,
    this.ranking,
    this.highestRanking,
    this.highestRankingDate,
    this.birthDate,
    this.height,
    this.weight,
    this.playingStyle,
    this.wins = 0,
    this.losses = 0,
    this.turnedPro,
    this.prizeMoney,
    this.imageUrl,
    this.gender,
    this.source,
    this.lastUpdated,
    this.rankingHistory,
    this.careerHighRank,
    this.careerHighDate,
  });

  int? get birthYear => birthDate?.year;

  int? get age {
    if (birthDate == null) return null;
    final now = DateTime.now();
    int age = now.year - birthDate!.year;
    if (now.month < birthDate!.month ||
        (now.month == birthDate!.month && now.day < birthDate!.day)) {
      age--;
    }
    return age;
  }

  factory Player.fromJson(Map<String, dynamic> json) {
    return Player(
      id: json['id'],
      name: json['name'],
      country: json['country'],
      ranking: json['ranking'],
      highestRanking: json['highest_ranking'],
      highestRankingDate: json['highest_ranking_date'] != null
          ? DateTime.parse(json['highest_ranking_date'])
          : null,
      birthDate: json['birth_date'] != null
          ? DateTime.parse(json['birth_date'])
          : null,
      height: json['height'],
      weight: json['weight'],
      playingStyle: json['playing_style'],
      wins: json['wins'] ?? 0,
      losses: json['losses'] ?? 0,
      turnedPro: json['turned_pro'],
      prizeMoney: json['prize_money'],
      imageUrl: json['image_url'],
      gender: json['gender'],
      source: json['source'],
      lastUpdated: json['last_updated'] != null
          ? DateTime.parse(json['last_updated'])
          : null,
      rankingHistory: json['ranking_history'] != null
          ? (json['ranking_history'] as List)
              .map((item) => RankingPoint(
                    ranking: item['ranking'],
                    date: DateTime.parse(item['date']),
                  ))
              .toList()
          : null,
      careerHighRank: json['career_high_rank'],
      careerHighDate: json['career_high_date'] != null
          ? DateTime.parse(json['career_high_date'])
          : null,
    );
  }
}

class PlayerListResponse {
  final List<Player> items;
  final int total;
  final int page;
  final int size;

  PlayerListResponse({
    required this.items,
    required this.total,
    required this.page,
    required this.size,
  });

  factory PlayerListResponse.fromJson(Map<String, dynamic> json) {
    return PlayerListResponse(
      items: (json['items'] as List).map((i) => Player.fromJson(i)).toList(),
      total: json['total'],
      page: json['page'],
      size: json['size'],
    );
  }
}

class H2HMatch {
  final int year;
  final String event;
  final String round;
  final String surface;
  final String score;
  final int winnerId;
  final String winnerName;

  H2HMatch({
    required this.year,
    required this.event,
    required this.round,
    required this.surface,
    required this.score,
    required this.winnerId,
    required this.winnerName,
  });

  factory H2HMatch.fromJson(Map<String, dynamic> json) {
    return H2HMatch(
      year: json['year'],
      event: json['event'],
      round: json['round'],
      surface: json['surface'],
      score: json['score'],
      winnerId: json['winner_id'],
      winnerName: json['winner_name'],
    );
  }
}

class H2HStats {
  final int matchesPlayed;
  final int player1Wins;
  final int player2Wins;
  final double player1WinPct;
  final double player2WinPct;
  final Map<int, int> hardCourtWins;
  final Map<int, int> clayCourtWins;
  final Map<int, int> grassCourtWins;
  final H2HMatch? lastMatch;

  H2HStats({
    required this.matchesPlayed,
    required this.player1Wins,
    required this.player2Wins,
    required this.player1WinPct,
    required this.player2WinPct,
    required this.hardCourtWins,
    required this.clayCourtWins,
    required this.grassCourtWins,
    this.lastMatch,
  });

  factory H2HStats.fromJson(Map<String, dynamic> json) {
    return H2HStats(
      matchesPlayed: json['matches_played'],
      player1Wins: json['player1_wins'],
      player2Wins: json['player2_wins'],
      player1WinPct: (json['player1_win_pct'] as num).toDouble(),
      player2WinPct: (json['player2_win_pct'] as num).toDouble(),
      hardCourtWins: Map<String, int>.from(json['hard_court_wins'])
          .map((key, value) => MapEntry(int.parse(key), value)),
      clayCourtWins: Map<String, int>.from(json['clay_court_wins'])
          .map((key, value) => MapEntry(int.parse(key), value)),
      grassCourtWins: Map<String, int>.from(json['grass_court_wins'])
          .map((key, value) => MapEntry(int.parse(key), value)),
      lastMatch: json['last_match'] != null
          ? H2HMatch.fromJson(json['last_match'])
          : null,
    );
  }
}

class H2HResponse {
  final Player player1;
  final Player player2;
  final H2HStats stats;
  final List<H2HMatch> history;

  H2HResponse({
    required this.player1,
    required this.player2,
    required this.stats,
    required this.history,
  });

  factory H2HResponse.fromJson(Map<String, dynamic> json) {
    return H2HResponse(
      player1: Player.fromJson(json['player1']),
      player2: Player.fromJson(json['player2']),
      stats: H2HStats.fromJson(json['stats']),
      history:
          (json['history'] as List).map((i) => H2HMatch.fromJson(i)).toList(),
    );
  }
}
