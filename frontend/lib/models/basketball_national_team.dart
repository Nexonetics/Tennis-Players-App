import '../widgets/ranking_graph.dart';

class BasketballNationalTeam {
  final int id;
  final String name;
  final String? country;
  final String? confederation;
  final int? foundedYear;
  final String? stadium;
  final String? manager;
  final String? nickname;
  final String? imageUrl;
  final String? website;
  final String? description;
  final int? ranking;
  final String category;
  final List<RankingPoint>? rankingHistory;
  final int? highestRanking;
  final DateTime? highestRankingDate;

  // Enhanced Statistics
  final int totalTrophies;
  final int worldCupTitles;
  final String? captain;
  final String? mainRivals;

  // Detailed Honors
  final Map<String, int>? honors;

  BasketballNationalTeam({
    required this.id,
    required this.name,
    this.country,
    this.confederation,
    this.foundedYear,
    this.stadium,
    this.manager,
    this.nickname,
    this.imageUrl,
    this.website,
    this.description,
    this.ranking,
    required this.category,
    this.rankingHistory,
    this.highestRanking,
    this.highestRankingDate,
    this.totalTrophies = 0,
    this.worldCupTitles = 0,
    this.captain,
    this.mainRivals,
    this.honors,
  });

  factory BasketballNationalTeam.fromJson(Map<String, dynamic> json) {
    return BasketballNationalTeam(
      id: json['id'],
      name: json['name'],
      country: json['country'],
      confederation: json['confederation'],
      foundedYear: json['founded_year'],
      stadium: json['stadium'],
      manager: json['manager'],
      nickname: json['nickname'],
      imageUrl: json['image_url'],
      website: json['website'],
      description: json['description'],
      ranking: json['ranking'],
      category: json['category'] ?? 'men',
      rankingHistory: json['ranking_history'] != null
          ? (json['ranking_history'] as List)
              .map((item) => RankingPoint(
                    ranking: item['ranking'],
                    date: DateTime.parse(item['date']),
                  ))
              .toList()
          : null,
      highestRanking: json['highest_ranking'] ?? json['career_high_rank'],
      highestRankingDate: json['highest_ranking_date'] != null
          ? DateTime.parse(json['highest_ranking_date'])
          : (json['career_high_date'] != null
              ? DateTime.parse(json['career_high_date'])
              : null),
      totalTrophies: json['total_trophies'] ?? 0,
      worldCupTitles: json['world_cup_titles'] ?? 0,
      captain: json['captain'],
      mainRivals: json['main_rivals'],
      honors: json['honors_json'] != null
          ? Map<String, int>.from(json['honors_json'])
          : null,
    );
  }
}

class BasketballNationalTeamListResponse {
  final List<BasketballNationalTeam> items;
  final int total;
  final int page;
  final int size;

  BasketballNationalTeamListResponse({
    required this.items,
    required this.total,
    required this.page,
    required this.size,
  });

  factory BasketballNationalTeamListResponse.fromJson(Map<String, dynamic> json) {
    return BasketballNationalTeamListResponse(
      items: (json['items'] as List)
          .map((i) => BasketballNationalTeam.fromJson(i))
          .toList(),
      total: json['total'],
      page: json['page'],
      size: json['size'],
    );
  }
}
