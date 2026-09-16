class BasketballClub {
  final int id;
  final String name;
  final String? city;
  final String? country;
  final String? league;
  final String? conference;
  final int? foundedYear;
  final String? arena;
  final int? capacity;
  final String? headCoach;
  final String? nickname;
  final String? imageUrl;
  final String? website;
  final String? description;
  final int? ranking;
  final String category;
  final int? highestRanking;
  final DateTime? highestRankingDate;

  int? get careerHighRank => highestRanking;
  DateTime? get careerHighDate => highestRankingDate;

  // Stats & Personnel
  final int titles;
  final int playoffAppearances;
  final String? marketValue;
  final String? currentSeasonRecord;
  final String? starPlayer;
  final String? owner;
  final String? generalManager;

  // Detailed Honors
  final Map<String, int>? honors;

  BasketballClub({
    required this.id,
    required this.name,
    this.city,
    this.country,
    this.league,
    this.conference,
    this.foundedYear,
    this.arena,
    this.capacity,
    this.headCoach,
    this.nickname,
    this.imageUrl,
    this.website,
    this.description,
    this.ranking,
    required this.category,
    this.highestRanking,
    this.highestRankingDate,
    this.titles = 0,
    this.playoffAppearances = 0,
    this.marketValue,
    this.currentSeasonRecord,
    this.starPlayer,
    this.owner,
    this.generalManager,
    this.honors,
  });

  factory BasketballClub.fromJson(Map<String, dynamic> json) {
    return BasketballClub(
      id: json['id'],
      name: json['name'],
      city: json['city'],
      country: json['country'],
      league: json['league'],
      conference: json['conference'],
      foundedYear: json['founded_year'],
      arena: json['arena'],
      capacity: json['capacity'],
      headCoach: json['head_coach'],
      nickname: json['nickname'],
      imageUrl: json['image_url'],
      website: json['website'],
      description: json['description'],
      ranking: json['ranking'],
      category: json['category'] ?? 'men',
      highestRanking: json['highest_ranking'] ?? json['career_high_rank'],
      highestRankingDate: json['highest_ranking_date'] != null
          ? DateTime.parse(json['highest_ranking_date'])
          : (json['career_high_date'] != null
              ? DateTime.parse(json['career_high_date'])
              : null),
      titles: json['titles'] ?? 0,
      playoffAppearances: json['playoff_appearances'] ?? 0,
      marketValue: json['market_value'],
      currentSeasonRecord: json['current_season_record'],
      starPlayer: json['star_player'],
      owner: json['owner'],
      generalManager: json['general_manager'],
      honors: json['honors_json'] != null
          ? Map<String, int>.from(json['honors_json'])
          : null,
    );
  }
}

class BasketballClubListResponse {
  final List<BasketballClub> items;
  final int total;
  final int page;
  final int size;

  BasketballClubListResponse({
    required this.items,
    required this.total,
    required this.page,
    required this.size,
  });

  factory BasketballClubListResponse.fromJson(Map<String, dynamic> json) {
    return BasketballClubListResponse(
      items: (json['items'] as List)
          .map((i) => BasketballClub.fromJson(i))
          .toList(),
      total: json['total'],
      page: json['page'],
      size: json['size'],
    );
  }
}
