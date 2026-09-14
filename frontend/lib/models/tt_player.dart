import '../widgets/ranking_graph.dart';

class TableTennisPlayer {
  final int id;
  final String name;
  final String? country;
  final int? ranking;
  final DateTime? birthDate;
  final String? weight;
  final String? playingStyle;
  final double? winPercentage;
  final String? imageUrl;
  final String? source;
  final String? gender;
  final DateTime? lastUpdated;
  final List<RankingPoint>? rankingHistory;
  final int? careerHighRank;
  final DateTime? careerHighDate;

  TableTennisPlayer({
    required this.id,
    required this.name,
    this.country,
    this.ranking,
    this.birthDate,
    this.weight,
    this.playingStyle,
    this.winPercentage,
    this.imageUrl,
    this.source,
    this.gender,
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

  factory TableTennisPlayer.fromJson(Map<String, dynamic> json) {
    return TableTennisPlayer(
      id: json['id'],
      name: json['name'],
      country: json['country'],
      ranking: json['ranking'],
      birthDate: json['birth_date'] != null
          ? DateTime.parse(json['birth_date'])
          : null,
      weight: json['weight'],
      playingStyle: json['playing_style'],
      winPercentage: json['win_percentage'] != null
          ? (json['win_percentage'] as num).toDouble()
          : null,
      imageUrl: json['image_url'],
      source: json['source'],
      gender: json['gender'],
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


class TtPlayerListResponse {
  final List<TableTennisPlayer> items;
  final int total;
  final int page;
  final int size;

  TtPlayerListResponse({
    required this.items,
    required this.total,
    required this.page,
    required this.size,
  });

  factory TtPlayerListResponse.fromJson(Map<String, dynamic> json) {
    return TtPlayerListResponse(
      items: (json['items'] as List)
          .map((i) => TableTennisPlayer.fromJson(i))
          .toList(),
      total: json['total'],
      page: json['page'],
      size: json['size'],
    );
  }
}
