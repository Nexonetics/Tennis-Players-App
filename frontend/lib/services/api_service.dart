import 'dart:convert';
import 'dart:math';
import 'package:flutter/services.dart' show rootBundle;
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart'
    show kIsWeb, defaultTargetPlatform, TargetPlatform;
import '../models/player.dart';
import '../models/tt_player.dart';
import '../models/football_national_team.dart';
import '../models/basketball_national_team.dart';
import '../models/basketball_club.dart';
import '../widgets/ranking_graph.dart';

class ApiService {
  // Toggle Switch: set to false to use the backend service by default.
  // Local JSON exports are stale and contain duplicate ranking entries.
  static bool useLocalDatabase = true;

  static String get baseUrl {
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host == 'localhost' || host == '127.0.0.1') {
        return 'http://localhost:8000';
      }
      return 'https://tennis-players-app.onrender.com';
    }
    if (defaultTargetPlatform == TargetPlatform.android) {
      // Physical Android device on LAN
      return 'http://192.168.29.84:8000';
    }
    // iOS simulator, macOS, Linux, Windows desktop
    return 'http://localhost:8000';
  }


  static String getProxyImageUrl(String originalUrl) {
    if (!kIsWeb) return originalUrl;
    if (originalUrl.startsWith(baseUrl)) return originalUrl;
    return '$baseUrl/proxy-image?url=${Uri.encodeComponent(originalUrl)}';
  }

  // ── Local Database Cache ───────────────────────────────────────────────────
  static List<Player>? _localPlayers;
  static List<TableTennisPlayer>? _localTtPlayers;
  // Histories loaded lazily only when detail screen is opened (large file ~7MB)
  static Map<String, dynamic>? _localTtHistories;
  static Map<String, dynamic>? _localTennisHistories;
  static Map<String, dynamic>? _localFootballHistories;
  static Map<String, dynamic>? _localBasketballHistories;
  static List<FootballNationalTeam>? _localFootballTeams;
  static List<BasketballNationalTeam>? _localBasketballTeams;
  static List<BasketballClub>? _localBasketballClubs;

  static Future<void> _loadLocalDataIfNeeded() async {
    if (!useLocalDatabase) return;

    if (_localPlayers == null) {
      final jsonStr = await rootBundle.loadString('assets/data/players.json');
      final List decoded = json.decode(jsonStr);
      _localPlayers =
          decoded.map((item) => Player.fromJson(item)).toList();
    }
    if (_localTtPlayers == null) {
      final jsonStr =
          await rootBundle.loadString('assets/data/tt_players.json');
      final List decoded = json.decode(jsonStr);
      _localTtPlayers =
          decoded.map((item) => TableTennisPlayer.fromJson(item)).toList();
    }
    if (_localFootballTeams == null) {
      final jsonStr = await rootBundle
          .loadString('assets/data/football_national_teams.json');
      final List decoded = json.decode(jsonStr);
      _localFootballTeams =
          decoded.map((item) => FootballNationalTeam.fromJson(item)).toList();
    }
    if (_localBasketballTeams == null) {
      try {
        final jsonStr = await rootBundle
            .loadString('assets/data/basketball_national_teams.json');
        final List decoded = json.decode(jsonStr);
        _localBasketballTeams =
            decoded.map((item) => BasketballNationalTeam.fromJson(item)).toList();
      } catch (_) {
        _localBasketballTeams = [];
      }
    }
    if (_localBasketballClubs == null) {
      try {
        final jsonStr =
            await rootBundle.loadString('assets/data/basketball_clubs.json');
        final List decoded = json.decode(jsonStr);
        _localBasketballClubs =
            decoded.map((item) => BasketballClub.fromJson(item)).toList();
      } catch (_) {
        _localBasketballClubs = [];
      }
    }
  }

  /// Load the histories file lazily (only needed for detail screens)
  static Future<void> _loadTtHistoriesIfNeeded() async {
    if (_localTtHistories == null) {
      final jsonStr =
          await rootBundle.loadString('assets/data/tt_player_histories.json');
      _localTtHistories = json.decode(jsonStr) as Map<String, dynamic>;
    }
  }

  static Future<void> _loadTennisHistoriesIfNeeded() async {
    if (_localTennisHistories == null) {
      final jsonStr =
          await rootBundle.loadString('assets/data/player_histories.json');
      _localTennisHistories = json.decode(jsonStr) as Map<String, dynamic>;
    }
  }

  static Future<void> _loadFootballHistoriesIfNeeded() async {
    if (_localFootballHistories == null) {
      try {
        final jsonStr = await rootBundle
            .loadString('assets/data/football_team_histories.json');
        _localFootballHistories = json.decode(jsonStr) as Map<String, dynamic>;
      } catch (_) {
        _localFootballHistories = {};
      }
    }
  }

  static Future<void> _loadBasketballHistoriesIfNeeded() async {
    if (_localBasketballHistories == null) {
      try {
        final jsonStr = await rootBundle
            .loadString('assets/data/basketball_team_histories.json');
        _localBasketballHistories = json.decode(jsonStr) as Map<String, dynamic>;
      } catch (_) {
        _localBasketballHistories = {};
      }
    }
  }

  Future<T> _tryRemote<T>(
      Future<T> Function() remote, Future<T> Function() local) async {
    try {
      return await remote();
    } catch (_) {
      // If the backend is unavailable, fall back to local JSON data so the UI still works.
      // Do not toggle the global `useLocalDatabase` flag here so the app will retry
      // the backend on subsequent requests (once it becomes available).
      await _loadLocalDataIfNeeded();
      return await local();
    }
  }

  Future<PlayerListResponse> _getPlayersLocal({
    int page = 1,
    int size = 20,
    String? gender,
  }) async {
    await _loadLocalDataIfNeeded();
    var list = _localPlayers!.where((p) => p.ranking != null).toList();
    if (gender != null) {
      list = list.where((p) => p.gender == gender).toList();
    }
    list.sort((a, b) => (a.ranking ?? 9999).compareTo(b.ranking ?? 9999));
    final Map<int, Player> uniqueByRank = {};
    for (var p in list) {
      if (p.ranking != null && !uniqueByRank.containsKey(p.ranking)) {
        uniqueByRank[p.ranking!] = p;
      }
    }
    list = uniqueByRank.values.toList();
    final total = list.length;
    final start = (page - 1) * size;
    if (start >= total) {
      return PlayerListResponse(
          items: [], total: total, page: page, size: size);
    }
    final end = (start + size).clamp(0, total);
    final items = list.sublist(start, end);
    return PlayerListResponse(
        items: items, total: total, page: page, size: size);
  }

  Future<PlayerListResponse> _searchPlayersLocal(
    String query, {
    int page = 1,
    int size = 20,
    String? gender,
  }) async {
    await _loadLocalDataIfNeeded();
    final q = query.toLowerCase();
    var list =
        _localPlayers!.where((p) => p.name.toLowerCase().contains(q)).toList();
    if (gender != null) {
      list = list.where((p) => p.gender == gender).toList();
    }
    list.sort((a, b) {
      final aPref = a.name.toLowerCase().startsWith(q);
      final bPref = b.name.toLowerCase().startsWith(q);
      if (aPref && !bPref) return -1;
      if (!aPref && bPref) return 1;
      return (a.ranking ?? 9999).compareTo(b.ranking ?? 9999);
    });
    final total = list.length;
    final start = (page - 1) * size;
    if (start >= total) {
      return PlayerListResponse(
          items: [], total: total, page: page, size: size);
    }
    final end = (start + size).clamp(0, total);
    final items = list.sublist(start, end);
    return PlayerListResponse(
        items: items, total: total, page: page, size: size);
  }

  Future<Player> _getPlayerDetailLocal(int id) async {
    await _loadLocalDataIfNeeded();
    await _loadTennisHistoriesIfNeeded();
    final base = _localPlayers!.firstWhere(
      (p) => p.id == id,
      orElse: () => throw Exception('Player not found'),
    );
    final rawHistory = _localTennisHistories![id.toString()];
    List<RankingPoint>? history;
    if (rawHistory != null) {
      history = (rawHistory as List)
          .map((item) => RankingPoint(
                ranking: item['ranking'] as int,
                date: DateTime.parse(item['date'] as String),
              ))
          .toList();
    }
    return Player(
      id: base.id,
      name: base.name,
      country: base.country,
      ranking: base.ranking,
      highestRanking: base.highestRanking,
      highestRankingDate: base.highestRankingDate,
      birthDate: base.birthDate,
      height: base.height,
      weight: base.weight,
      playingStyle: base.playingStyle,
      wins: base.wins,
      losses: base.losses,
      turnedPro: base.turnedPro,
      prizeMoney: base.prizeMoney,
      imageUrl: base.imageUrl,
      source: base.source,
      gender: base.gender,
      lastUpdated: base.lastUpdated,
      rankingHistory: history,
      careerHighRank: base.careerHighRank,
      careerHighDate: base.careerHighDate,
    );
  }

  Future<List<Player>> _getTopPlayersLocal({
    int limit = 10,
    String? gender,
  }) async {
    await _loadLocalDataIfNeeded();
    var list = _localPlayers!.where((p) => p.ranking != null).toList();
    if (gender != null) {
      list = list.where((p) => p.gender == gender).toList();
    }
    list.sort((a, b) => (a.ranking ?? 9999).compareTo(b.ranking ?? 9999));
    final Map<int, Player> uniqueByRank = {};
    for (var p in list) {
      if (p.ranking != null && !uniqueByRank.containsKey(p.ranking)) {
        uniqueByRank[p.ranking!] = p;
      }
    }
    return uniqueByRank.values.take(limit).toList();
  }

  Future<TtPlayerListResponse> _getTtPlayersLocal({
    int page = 1,
    int size = 20,
    String? gender,
  }) async {
    await _loadLocalDataIfNeeded();
    var list = _localTtPlayers!
        .where((p) => p.ranking != null && p.ranking! > 0)
        .toList();
    if (gender != null) {
      list = list.where((p) => p.gender == gender).toList();
    }
    list.sort((a, b) => (a.ranking ?? 9999).compareTo(b.ranking ?? 9999));
    final Map<int, TableTennisPlayer> uniqueByRank = {};
    for (var p in list) {
      if (p.ranking != null && !uniqueByRank.containsKey(p.ranking)) {
        uniqueByRank[p.ranking!] = p;
      }
    }
    list = uniqueByRank.values.toList();
    final total = list.length;
    final start = (page - 1) * size;
    if (start >= total) {
      return TtPlayerListResponse(
          items: [], total: total, page: page, size: size);
    }
    final end = (start + size).clamp(0, total);
    final items = list.sublist(start, end);
    return TtPlayerListResponse(
        items: items, total: total, page: page, size: size);
  }

  Future<TtPlayerListResponse> _searchTtPlayersLocal(
    String query, {
    int page = 1,
    int size = 20,
    String? gender,
  }) async {
    await _loadLocalDataIfNeeded();
    final q = query.toLowerCase();
    var list = _localTtPlayers!
        .where((p) => p.name.toLowerCase().contains(q))
        .toList();
    if (gender != null) {
      list = list.where((p) => p.gender == gender).toList();
    }
    list.sort((a, b) {
      final aPref = a.name.toLowerCase().startsWith(q);
      final bPref = b.name.toLowerCase().startsWith(q);
      if (aPref && !bPref) return -1;
      if (!aPref && bPref) return 1;
      return (a.ranking ?? 9999).compareTo(b.ranking ?? 9999);
    });
    final total = list.length;
    final start = (page - 1) * size;
    if (start >= total) {
      return TtPlayerListResponse(
          items: [], total: total, page: page, size: size);
    }
    final end = (start + size).clamp(0, total);
    final items = list.sublist(start, end);
    return TtPlayerListResponse(
        items: items, total: total, page: page, size: size);
  }

  Future<TableTennisPlayer> _getTtPlayerDetailLocal(int id) async {
    await _loadLocalDataIfNeeded();
    await _loadTtHistoriesIfNeeded();
    final base = _localTtPlayers!.firstWhere(
      (p) => p.id == id,
      orElse: () => throw Exception('TT Player not found'),
    );
    final rawHistory = _localTtHistories![id.toString()];
    List<RankingPoint>? history;
    if (rawHistory != null) {
      history = (rawHistory as List)
          .map((item) => RankingPoint(
                ranking: item['ranking'] as int,
                date: DateTime.parse(item['date'] as String),
              ))
          .toList();
    }
    return TableTennisPlayer(
      id: base.id,
      name: base.name,
      country: base.country,
      ranking: base.ranking,
      birthDate: base.birthDate,
      weight: base.weight,
      playingStyle: base.playingStyle,
      winPercentage: base.winPercentage,
      imageUrl: base.imageUrl,
      source: base.source,
      gender: base.gender,
      lastUpdated: base.lastUpdated,
      rankingHistory: history,
      careerHighRank: base.careerHighRank,
      careerHighDate: base.careerHighDate,
    );
  }

  Future<List<TableTennisPlayer>> _getTtTopPlayersLocal({
    int limit = 50,
    String? gender,
  }) async {
    await _loadLocalDataIfNeeded();
    var list = _localTtPlayers!
        .where((p) => p.ranking != null && p.ranking! > 0)
        .toList();
    if (gender != null) {
      list = list.where((p) => p.gender == gender).toList();
    }
    list.sort((a, b) => (a.ranking ?? 9999).compareTo(b.ranking ?? 9999));
    final Map<int, TableTennisPlayer> uniqueByRank = {};
    for (var p in list) {
      if (p.ranking != null && !uniqueByRank.containsKey(p.ranking)) {
        uniqueByRank[p.ranking!] = p;
      }
    }
    return uniqueByRank.values.take(limit).toList();
  }

  // ── Tennis Players ─────────────────────────────────────────────────────────

  Future<PlayerListResponse> getPlayers({
    int page = 1,
    int size = 20,
    String? gender,
  }) async {
    if (useLocalDatabase) {
      return _getPlayersLocal(page: page, size: size, gender: gender);
    }

    return _tryRemote(
      () async {
        final genderParam = gender != null ? '&gender=$gender' : '';
        final response = await http.get(
          Uri.parse('$baseUrl/players/?page=$page&size=$size$genderParam'),
        );
        if (response.statusCode == 200) {
          return PlayerListResponse.fromJson(json.decode(response.body));
        }
        throw Exception('Failed to load players');
      },
      () => _getPlayersLocal(page: page, size: size, gender: gender),
    );
  }

  Future<PlayerListResponse> searchPlayers(
    String query, {
    int page = 1,
    int size = 20,
    String? gender,
  }) async {
    if (useLocalDatabase) {
      return _searchPlayersLocal(query, page: page, size: size, gender: gender);
    }

    return _tryRemote(
      () async {
        final genderParam = gender != null ? '&gender=$gender' : '';
        final response = await http.get(
          Uri.parse(
              '$baseUrl/players/search?q=$query&page=$page&size=$size$genderParam'),
        );
        if (response.statusCode == 200) {
          return PlayerListResponse.fromJson(json.decode(response.body));
        }
        throw Exception('Failed to search players');
      },
      () => _searchPlayersLocal(query, page: page, size: size, gender: gender),
    );
  }

  Future<Player> getPlayerDetail(int id) async {
    if (useLocalDatabase) {
      return _getPlayerDetailLocal(id);
    }

    return _tryRemote(
      () async {
        final response = await http.get(Uri.parse('$baseUrl/players/$id'));
        if (response.statusCode == 200) {
          return Player.fromJson(json.decode(response.body));
        }
        throw Exception('Failed to load player details');
      },
      () => _getPlayerDetailLocal(id),
    );
  }

  Future<H2HResponse> getH2H(int p1Id, int p2Id) async {
    if (useLocalDatabase) {
      await _loadLocalDataIfNeeded();
      final p1 = _localPlayers!.firstWhere(
        (p) => p.id == p1Id,
        orElse: () => throw Exception('Player 1 not found'),
      );
      final p2 = _localPlayers!.firstWhere(
        (p) => p.id == p2Id,
        orElse: () => throw Exception('Player 2 not found'),
      );

      final random = Random(
          p1Id ^ p2Id); // Seed with player IDs to make H2H results stable
      final avgRank = ((p1.ranking ?? 100) + (p2.ranking ?? 100)) / 2;
      int numMatches = max(1, (20 - (avgRank / 5)).toInt() + random.nextInt(6));
      if (avgRank > 100) numMatches = random.nextInt(3) + 1;

      final surfaces = ["Hard", "Clay", "Grass"];
      final rounds = [
        "Final",
        "Semifinal",
        "Quarterfinal",
        "Round of 16",
        "Round of 32"
      ];
      final tournaments = [
        "Miami Open",
        "Indian Wells",
        "Roland Garros",
        "Wimbledon",
        "US Open",
        "Australian Open",
        "Madrid Open",
        "Rome Masters"
      ];

      final List<H2HMatch> history = [];
      int p1Wins = 0;
      int p2Wins = 0;
      final Map<int, int> hardWins = {p1.id: 0, p2.id: 0};
      final Map<int, int> clayWins = {p1.id: 0, p2.id: 0};
      final Map<int, int> grassWins = {p1.id: 0, p2.id: 0};

      double p1Bias = 0.5 + ((p2.ranking ?? 100) - (p1.ranking ?? 100)) / 200;
      p1Bias = max(0.2, min(0.8, p1Bias));

      for (int i = 0; i < numMatches; i++) {
        final year = 2024 - (i ~/ 3);
        final surface = surfaces[random.nextInt(surfaces.length)];
        final winner = random.nextDouble() < p1Bias ? p1 : p2;

        if (winner.id == p1.id) {
          p1Wins++;
          if (surface == "Hard") {
            hardWins[p1.id] = (hardWins[p1.id] ?? 0) + 1;
          } else if (surface == "Clay") {
            clayWins[p1.id] = (clayWins[p1.id] ?? 0) + 1;
          } else {
            grassWins[p1.id] = (grassWins[p1.id] ?? 0) + 1;
          }
        } else {
          p2Wins++;
          if (surface == "Hard") {
            hardWins[p2.id] = (hardWins[p2.id] ?? 0) + 1;
          } else if (surface == "Clay") {
            clayWins[p2.id] = (clayWins[p2.id] ?? 0) + 1;
          } else {
            grassWins[p2.id] = (grassWins[p2.id] ?? 0) + 1;
          }
        }

        final scores = [
          '6-4, 7-5',
          '6-3, 6-4',
          '7-6, 6-2',
          '6-1, 6-3',
          '4-6, 7-5, 6-4'
        ];

        history.add(H2HMatch(
          year: year,
          event: tournaments[random.nextInt(tournaments.length)],
          round: rounds[random.nextInt(rounds.length)],
          surface: surface,
          score: scores[random.nextInt(scores.length)],
          winnerId: winner.id,
          winnerName: winner.name,
        ));
      }

      history.sort((a, b) => b.year.compareTo(a.year));

      final stats = H2HStats(
        matchesPlayed: numMatches,
        player1Wins: p1Wins,
        player2Wins: p2Wins,
        player1WinPct:
            double.parse((p1Wins / numMatches * 100).toStringAsFixed(1)),
        player2WinPct:
            double.parse((p2Wins / numMatches * 100).toStringAsFixed(1)),
        hardCourtWins: hardWins,
        clayCourtWins: clayWins,
        grassCourtWins: grassWins,
        lastMatch: history.isNotEmpty ? history.first : null,
      );

      return H2HResponse(
        player1: p1,
        player2: p2,
        stats: stats,
        history: history,
      );
    } else {
      final response = await http.get(
        Uri.parse('$baseUrl/players/h2h/$p1Id/$p2Id'),
      );
      if (response.statusCode == 200) {
        return H2HResponse.fromJson(json.decode(response.body));
      } else {
        throw Exception('Failed to load H2H stats');
      }
    }
  }

  Future<List<Player>> getTopPlayers({int limit = 10, String? gender}) async {
    if (useLocalDatabase) {
      return _getTopPlayersLocal(limit: limit, gender: gender);
    }

    return _tryRemote(
      () async {
        final genderParam = gender != null ? '&gender=$gender' : '';
        final response = await http.get(
          Uri.parse('$baseUrl/players/top?limit=$limit$genderParam'),
        );
        if (response.statusCode == 200) {
          final List data = json.decode(response.body);
          return data.map((i) => Player.fromJson(i)).toList();
        }
        throw Exception('Failed to load top players');
      },
      () => _getTopPlayersLocal(limit: limit, gender: gender),
    );
  }

  // ── Table Tennis ─────────────────────────────────────────────────────────

  Future<TtPlayerListResponse> getTtPlayers({
    int page = 1,
    int size = 20,
    String? gender,
  }) async {
    if (useLocalDatabase) {
      return _getTtPlayersLocal(page: page, size: size, gender: gender);
    }

    return _tryRemote(
      () async {
        var url = '$baseUrl/tt-players/?page=$page&size=$size';
        if (gender != null) url += '&gender=$gender';
        final response = await http.get(Uri.parse(url));
        if (response.statusCode == 200) {
          return TtPlayerListResponse.fromJson(json.decode(response.body));
        }
        throw Exception('Failed to load TT players');
      },
      () => _getTtPlayersLocal(page: page, size: size, gender: gender),
    );
  }

  Future<TtPlayerListResponse> searchTtPlayers(
    String query, {
    int page = 1,
    int size = 20,
    String? gender,
  }) async {
    if (useLocalDatabase) {
      return _searchTtPlayersLocal(query,
          page: page, size: size, gender: gender);
    }

    return _tryRemote(
      () async {
        var url = '$baseUrl/tt-players/search?q=$query&page=$page&size=$size';
        if (gender != null) url += '&gender=$gender';
        final response = await http.get(Uri.parse(url));
        if (response.statusCode == 200) {
          return TtPlayerListResponse.fromJson(json.decode(response.body));
        }
        throw Exception('Failed to search TT players');
      },
      () =>
          _searchTtPlayersLocal(query, page: page, size: size, gender: gender),
    );
  }

  Future<TableTennisPlayer> getTtPlayerDetail(int id) async {
    if (useLocalDatabase) {
      return _getTtPlayerDetailLocal(id);
    }

    return _tryRemote(
      () async {
        final response = await http.get(Uri.parse('$baseUrl/tt-players/$id'));
        if (response.statusCode == 200) {
          return TableTennisPlayer.fromJson(json.decode(response.body));
        }
        throw Exception('Failed to load TT player details');
      },
      () => _getTtPlayerDetailLocal(id),
    );
  }

  Future<List<TableTennisPlayer>> getTtTopPlayers({
    int limit = 50,
    String? gender,
  }) async {
    if (useLocalDatabase) {
      return _getTtTopPlayersLocal(limit: limit, gender: gender);
    }

    return _tryRemote(
      () async {
        var url = '$baseUrl/tt-players/top?limit=$limit';
        if (gender != null) url += '&gender=$gender';
        final response = await http.get(Uri.parse(url));
        if (response.statusCode == 200) {
          final List data = json.decode(response.body);
          return data.map((i) => TableTennisPlayer.fromJson(i)).toList();
        }
        throw Exception('Failed to load top TT players');
      },
      () => _getTtTopPlayersLocal(limit: limit, gender: gender),
    );
  }

  // ── Football ─────────────────────────────────────────────────────────────

  Future<FootballNationalTeamListResponse> searchFootballTeams(
    String query, {
    int page = 1,
    int size = 20,
    String? category,
  }) async {
    if (useLocalDatabase) {
      await _loadLocalDataIfNeeded();
      final q = query.toLowerCase();
      var list = _localFootballTeams!
          .where((p) => p.name.toLowerCase().contains(q))
          .toList();
      if (category != null) {
        list = list.where((p) => p.category == category).toList();
      }

      list.sort((a, b) {
        if (a.ranking == null && b.ranking == null) return 0;
        if (a.ranking == null) return 1;
        if (b.ranking == null) return -1;
        return a.ranking!.compareTo(b.ranking!);
      });

      final total = list.length;
      final start = (page - 1) * size;
      if (start >= total) {
        return FootballNationalTeamListResponse(
            items: [], total: total, page: page, size: size);
      }
      final end = (start + size).clamp(0, total);
      final items = list.sublist(start, end);
      return FootballNationalTeamListResponse(
          items: items, total: total, page: page, size: size);
    } else {
      final categoryParam = category != null ? '&category=$category' : '';
      final response = await http.get(
        Uri.parse(
          '$baseUrl/football-national-teams/search?q=$query&page=$page&size=$size$categoryParam',
        ),
      );
      if (response.statusCode == 200) {
        return FootballNationalTeamListResponse.fromJson(
            json.decode(response.body));
      } else {
        throw Exception('Failed to search football teams');
      }
    }
  }

  Future<FootballNationalTeam> _getFootballTeamDetailLocal(int id) async {
    await _loadLocalDataIfNeeded();
    await _loadFootballHistoriesIfNeeded();
    final base = _localFootballTeams!.firstWhere(
      (p) => p.id == id,
      orElse: () => throw Exception('Football team not found'),
    );
    final rawHistory = _localFootballHistories?[id.toString()];
    List<RankingPoint>? history;
    if (rawHistory != null) {
      history = (rawHistory as List)
          .map((item) => RankingPoint(
                ranking: item['ranking'] as int,
                date: DateTime.parse(item['date'] as String),
              ))
          .toList();
    }
    return FootballNationalTeam(
      id: base.id,
      name: base.name,
      country: base.country,
      confederation: base.confederation,
      foundedYear: base.foundedYear,
      stadium: base.stadium,
      manager: base.manager,
      nickname: base.nickname,
      imageUrl: base.imageUrl,
      website: base.website,
      description: base.description,
      ranking: base.ranking,
      category: base.category,
      rankingHistory: history ?? base.rankingHistory,
      highestRanking: base.highestRanking,
      highestRankingDate: base.highestRankingDate,
      totalTrophies: base.totalTrophies,
      worldCupTitles: base.worldCupTitles,
      captain: base.captain,
      mainRivals: base.mainRivals,
      honors: base.honors,
    );
  }

  Future<FootballNationalTeam> getFootballTeamDetail(int id) async {
    if (useLocalDatabase) {
      return _getFootballTeamDetailLocal(id);
    }

    return _tryRemote(
      () async {
        final response =
            await http.get(Uri.parse('$baseUrl/football-national-teams/$id'));
        if (response.statusCode == 200) {
          return FootballNationalTeam.fromJson(json.decode(response.body));
        }
        throw Exception('Failed to load football team details');
      },
      () => _getFootballTeamDetailLocal(id),
    );
  }

  Future<FootballNationalTeamListResponse> getFootballTopTeams({
    int page = 1,
    int size = 20,
    String? category,
  }) async {
    if (useLocalDatabase) {
      await _loadLocalDataIfNeeded();
      var list = _localFootballTeams!.where((p) => p.ranking != null).toList();
      if (category != null) {
        list = list.where((p) => p.category == category).toList();
      }
      list.sort((a, b) => a.ranking!.compareTo(b.ranking!));

      final total = list.length;
      final start = (page - 1) * size;
      if (start >= total) {
        return FootballNationalTeamListResponse(
            items: [], total: total, page: page, size: size);
      }
      final end = (start + size).clamp(0, total);
      final items = list.sublist(start, end);
      return FootballNationalTeamListResponse(
          items: items, total: total, page: page, size: size);
    } else {
      final categoryParam = category != null ? '&category=$category' : '';
      final response = await http.get(
        Uri.parse(
            '$baseUrl/football-national-teams/?page=$page&size=$size$categoryParam'),
      );
      if (response.statusCode == 200) {
        return FootballNationalTeamListResponse.fromJson(
            json.decode(response.body));
      } else {
        throw Exception('Failed to load top football teams');
      }
    }
  }

  // ── Basketball ───────────────────────────────────────────────────────────

  Future<BasketballClubListResponse> getBasketballClubs({
    int page = 1,
    int size = 20,
    String? category,
  }) async {
    if (useLocalDatabase) {
      await _loadLocalDataIfNeeded();
      var list =
          _localBasketballClubs!.where((p) => p.ranking != null).toList();
      if (category != null) {
        list = list.where((p) => p.category == category).toList();
      }
      list.sort((a, b) => a.ranking!.compareTo(b.ranking!));

      final total = list.length;
      final start = (page - 1) * size;
      if (start >= total) {
        return BasketballClubListResponse(
            items: [], total: total, page: page, size: size);
      }
      final end = (start + size).clamp(0, total);
      final items = list.sublist(start, end);
      return BasketballClubListResponse(
          items: items, total: total, page: page, size: size);
    } else {
      final categoryParam = category != null ? '&category=$category' : '';
      final response = await http.get(
        Uri.parse(
            '$baseUrl/basketball-clubs?page=$page&size=$size$categoryParam'),
      );
      if (response.statusCode == 200) {
        return BasketballClubListResponse.fromJson(json.decode(response.body));
      } else {
        throw Exception('Failed to load basketball clubs');
      }
    }
  }

  Future<BasketballClubListResponse> searchBasketballClubs(
    String query, {
    int page = 1,
    int size = 20,
    String? category,
  }) async {
    if (useLocalDatabase) {
      await _loadLocalDataIfNeeded();
      final q = query.toLowerCase();
      var list = _localBasketballClubs!.where((p) {
        final nameMatch = p.name.toLowerCase().contains(q);
        final cityMatch = p.city?.toLowerCase().contains(q) ?? false;
        return nameMatch || cityMatch;
      }).toList();

      if (category != null) {
        list = list.where((p) => p.category == category).toList();
      }

      list.sort((a, b) {
        if (a.ranking == null && b.ranking == null) return 0;
        if (a.ranking == null) return 1;
        if (b.ranking == null) return -1;
        return a.ranking!.compareTo(b.ranking!);
      });

      final total = list.length;
      final start = (page - 1) * size;
      if (start >= total) {
        return BasketballClubListResponse(
            items: [], total: total, page: page, size: size);
      }
      final end = (start + size).clamp(0, total);
      final items = list.sublist(start, end);
      return BasketballClubListResponse(
          items: items, total: total, page: page, size: size);
    } else {
      final categoryParam = category != null ? '&category=$category' : '';
      final response = await http.get(
        Uri.parse(
          '$baseUrl/basketball-clubs/search?q=$query&page=$page&size=$size$categoryParam',
        ),
      );
      if (response.statusCode == 200) {
        return BasketballClubListResponse.fromJson(json.decode(response.body));
      } else {
        throw Exception('Failed to search basketball clubs');
      }
    }
  }

  Future<BasketballClub> getBasketballClubDetail(int id) async {
    if (useLocalDatabase) {
      await _loadLocalDataIfNeeded();
      return _localBasketballClubs!.firstWhere(
        (p) => p.id == id,
        orElse: () => throw Exception('Basketball club not found'),
      );
    } else {
      final response =
          await http.get(Uri.parse('$baseUrl/basketball-clubs/$id'));
      if (response.statusCode == 200) {
        return BasketballClub.fromJson(json.decode(response.body));
      } else {
        throw Exception('Failed to load basketball club details');
      }
    }
  }

  Future<List<BasketballClub>> getBasketballTopClubs({
    int limit = 50,
    String? category,
  }) async {
    if (useLocalDatabase) {
      await _loadLocalDataIfNeeded();
      var list = _localBasketballClubs!.toList();
      if (category != null) {
        list = list.where((p) => p.category == category).toList();
      }

      list.sort((a, b) {
        if (a.ranking == null && b.ranking == null) return 0;
        if (a.ranking == null) return 1;
        if (b.ranking == null) return -1;
        return a.ranking!.compareTo(b.ranking!);
      });

      return list.take(limit).toList();
    } else {
      final categoryParam = category != null ? '&category=$category' : '';
      final response = await http.get(
        Uri.parse('$baseUrl/basketball-clubs/top?limit=$limit$categoryParam'),
      );
      if (response.statusCode == 200) {
        final List data = json.decode(response.body);
        return data.map((i) => BasketballClub.fromJson(i)).toList();
      } else {
        throw Exception('Failed to load top basketball clubs');
      }
    }
  }

  // ── Basketball National Teams ──────────────────────────────────────────────

  Future<BasketballNationalTeamListResponse> getBasketballTeams({
    int page = 1,
    int size = 20,
    String? category,
  }) async {
    return _tryRemote<BasketballNationalTeamListResponse>(
      () async {
        final categoryParam = category != null ? '&category=$category' : '';
        final response = await http.get(
          Uri.parse(
              '$baseUrl/basketball-national-teams/?page=$page&size=$size$categoryParam'),
        );
        if (response.statusCode == 200) {
          return BasketballNationalTeamListResponse.fromJson(
              json.decode(response.body));
        }
        throw Exception('Failed to load basketball national teams');
      },
      () async {
        await _loadLocalDataIfNeeded();
        var list = _localBasketballTeams ?? [];
        if (category != null) {
          list = list.where((p) => p.category == category).toList();
        }
        list.sort((a, b) {
          if (a.ranking == null && b.ranking == null) return 0;
          if (a.ranking == null) return 1;
          if (b.ranking == null) return -1;
          return a.ranking!.compareTo(b.ranking!);
        });

        final total = list.length;
        final start = (page - 1) * size;
        if (start >= total) {
          return BasketballNationalTeamListResponse(
              items: [], total: total, page: page, size: size);
        }
        final end = (start + size).clamp(0, total);
        final items = list.sublist(start, end);
        return BasketballNationalTeamListResponse(
            items: items, total: total, page: page, size: size);
      },
    );
  }

  Future<BasketballNationalTeamListResponse> searchBasketballTeams(
    String query, {
    int page = 1,
    int size = 20,
    String? category,
  }) async {
    return _tryRemote<BasketballNationalTeamListResponse>(
      () async {
        final categoryParam = category != null ? '&category=$category' : '';
        final response = await http.get(
          Uri.parse(
            '$baseUrl/basketball-national-teams/search?q=$query&page=$page&size=$size$categoryParam',
          ),
        );
        if (response.statusCode == 200) {
          return BasketballNationalTeamListResponse.fromJson(
              json.decode(response.body));
        }
        throw Exception('Failed to search basketball teams');
      },
      () async {
        await _loadLocalDataIfNeeded();
        final q = query.toLowerCase();
        var list = (_localBasketballTeams ?? []).where((p) {
          final nameMatch = p.name.toLowerCase().contains(q);
          final countryMatch = p.country?.toLowerCase().contains(q) ?? false;
          return nameMatch || countryMatch;
        }).toList();

        if (category != null) {
          list = list.where((p) => p.category == category).toList();
        }

        list.sort((a, b) {
          if (a.ranking == null && b.ranking == null) return 0;
          if (a.ranking == null) return 1;
          if (b.ranking == null) return -1;
          return a.ranking!.compareTo(b.ranking!);
        });

        final total = list.length;
        final start = (page - 1) * size;
        if (start >= total) {
          return BasketballNationalTeamListResponse(
              items: [], total: total, page: page, size: size);
        }
        final end = (start + size).clamp(0, total);
        final items = list.sublist(start, end);
        return BasketballNationalTeamListResponse(
            items: items, total: total, page: page, size: size);
      },
    );
  }

  Future<BasketballNationalTeam> getBasketballTeamDetail(int id) async {
    return _tryRemote<BasketballNationalTeam>(
      () async {
        final response =
            await http.get(Uri.parse('$baseUrl/basketball-national-teams/$id'));
        if (response.statusCode == 200) {
          return BasketballNationalTeam.fromJson(json.decode(response.body));
        }
        throw Exception('Failed to load basketball team details');
      },
      () async => _getBasketballTeamDetailLocal(id),
    );
  }

  Future<BasketballNationalTeam> _getBasketballTeamDetailLocal(int id) async {
    await _loadLocalDataIfNeeded();
    await _loadBasketballHistoriesIfNeeded();
    final base = (_localBasketballTeams ?? []).firstWhere(
      (p) => p.id == id,
      orElse: () => throw Exception('Basketball team not found'),
    );
    final rawHistory = _localBasketballHistories?[id.toString()];
    List<RankingPoint>? history;
    if (rawHistory != null) {
      history = (rawHistory as List)
          .map((item) => RankingPoint(
                ranking: item['ranking'] as int,
                date: DateTime.parse(item['date'] as String),
              ))
          .toList();
    }
    return BasketballNationalTeam(
      id: base.id,
      name: base.name,
      country: base.country,
      confederation: base.confederation,
      foundedYear: base.foundedYear,
      stadium: base.stadium,
      manager: base.manager,
      nickname: base.nickname,
      imageUrl: base.imageUrl,
      website: base.website,
      description: base.description,
      ranking: base.ranking,
      category: base.category,
      rankingHistory: history ?? base.rankingHistory,
      highestRanking: base.highestRanking,
      highestRankingDate: base.highestRankingDate,
      totalTrophies: base.totalTrophies,
      worldCupTitles: base.worldCupTitles,
      captain: base.captain,
      mainRivals: base.mainRivals,
      honors: base.honors,
    );
  }

  Future<BasketballNationalTeamListResponse> getBasketballTopTeams({
    int page = 1,
    int size = 20,
    String? category,
  }) async {
    return getBasketballTeams(page: page, size: size, category: category);
  }
}
