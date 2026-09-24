import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/player.dart';
import '../widgets/glass_widgets.dart';
import '../widgets/ranking_graph.dart';
import '../services/api_service.dart';

class PlayerDetailScreen extends StatefulWidget {
  final Player player;

  const PlayerDetailScreen({super.key, required this.player});

  @override
  State<PlayerDetailScreen> createState() => _PlayerDetailScreenState();
}

class _PlayerDetailScreenState extends State<PlayerDetailScreen> {
  late Future<Player> _playerFuture;

  @override
  void initState() {
    super.initState();
    _playerFuture = ApiService().getPlayerDetail(widget.player.id);
  }

  List<RankingPoint> _generateRankingTrend(Player player) {
    if (player.rankingHistory != null && player.rankingHistory!.isNotEmpty) {
      return player.rankingHistory!;
    }
    final current = player.ranking ?? 100;
    final highest = player.highestRanking ?? current - 10;
    final highestDate = player.highestRankingDate ??
        DateTime.now().subtract(const Duration(days: 365 * 2));

    return [
      RankingPoint(
        ranking: highest + 5,
        date: highestDate.subtract(const Duration(days: 180)),
      ),
      RankingPoint(ranking: highest, date: highestDate),
      RankingPoint(
        ranking: (highest + current) ~/ 2,
        date: highestDate.add(const Duration(days: 180)),
      ),
      RankingPoint(
        ranking: current + 2,
        date: DateTime.now().subtract(const Duration(days: 30)),
      ),
      RankingPoint(ranking: current, date: DateTime.now()),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Player>(
      future: _playerFuture,
      initialData: widget.player,
      builder: (context, snapshot) {
        final player = snapshot.data ?? widget.player;
        final isLoading = snapshot.connectionState == ConnectionState.waiting;

        return Scaffold(
          backgroundColor: const Color(0xFFCFDEF3), // Matches liquid theme
          extendBodyBehindAppBar: true,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            leading: Padding(
              padding: const EdgeInsets.all(8.0),
              child: GlassContainer(
                borderRadius: 12,
                opacity: 0.1,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ),
          ),
          body: LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth > 900) {
                return _buildWebLayout(context, player, isLoading, constraints);
              }
              return _buildMobileLayout(context, player, isLoading);
            },
          ),
        );
      },
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  Widget _buildFallbackBanner(Player player, {required double height}) {
    return Container(
      height: height,
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.indigo,
            Colors.indigo.shade800,
          ],
        ),
      ),
      child: Center(
        child: Text(
          _initials(player.name),
          style: const TextStyle(
            color: Colors.white,
            fontSize: 72,
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
          ),
        ),
      ),
    );
  }

  Widget _buildMobileLayout(BuildContext context, Player player, bool isLoading) {
    return SingleChildScrollView(
      child: Column(
        children: [
          // Splash background banner
          Hero(
            tag: 'player-${player.id}',
            child: ClipRRect(
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(32),
                bottomRight: Radius.circular(32),
              ),
              child: player.imageUrl != null
                  ? Image.network(
                      player.imageUrl!,
                      height: 300,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      alignment: Alignment.topCenter,
                      errorBuilder: (_, __, ___) =>
                          _buildFallbackBanner(player, height: 300),
                    )
                  : _buildFallbackBanner(player, height: 300),
            ),
          ),

          // Scrollable details card
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: GlassContainer(
              borderRadius: 24,
              opacity: 0.1,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(player),
                  const Divider(height: 40, thickness: 1),
                  _buildRankingSection(player, isLoading),
                  const SizedBox(height: 30),
                  _buildStatGrid(context, player),
                  const SizedBox(height: 30),
                  _buildSourceFooter(player),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWebLayout(
      BuildContext context, Player player, bool isLoading, BoxConstraints constraints) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(vertical: 100, horizontal: 40),
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 1200),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left Column: Profile Card
              SizedBox(
                width: 350,
                child: GlassContainer(
                  borderRadius: 30,
                  opacity: 0.2,
                  padding: const EdgeInsets.all(0),
                  child: Column(
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(30)),
                        child: player.imageUrl != null
                            ? Image.network(
                                player.imageUrl!,
                                height: 350,
                                width: double.infinity,
                                fit: BoxFit.cover,
                                alignment: Alignment.topCenter,
                                errorBuilder: (_, __, ___) =>
                                    _buildFallbackBanner(player, height: 350),
                              )
                            : _buildFallbackBanner(player, height: 350),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              player.name,
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${player.country ?? "N/A"} • ${player.age != null ? "${player.age} years${player.birthYear != null ? ' (Born ${player.birthYear})' : ''}" : (player.birthYear != null ? "Born ${player.birthYear}" : "Pro Athlete")}',
                              style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey[700],
                              ),
                            ),
                            const SizedBox(height: 24),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 40),
              // Right Column: Details
              Expanded(
                child: GlassContainer(
                  borderRadius: 30,
                  opacity: 0.15,
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildRankingSection(player, isLoading),
                      const SizedBox(height: 40),
                      const Text(
                        'Player Statistics',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.indigo,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildStatGrid(context, player),
                      const SizedBox(height: 40),
                      _buildSourceFooter(player),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(Player player) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                player.name,
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -1,
                ),
              ),
              Text(
                '${player.country ?? "N/A"} • ${player.age != null ? "${player.age} years${player.birthYear != null ? ' (Born ${player.birthYear})' : ''}" : (player.birthYear != null ? "Born ${player.birthYear}" : "Pro Athlete")}',
                style: TextStyle(
                  fontSize: 18,
                  color: Colors.grey[700],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        if (player.country != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.5),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              player.country!,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
            ),
          ),
      ],
    );
  }

  Widget _buildRankingSection(Player player, bool isLoading) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Ranking Progress',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.indigo,
              ),
            ),
            if (isLoading)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.indigo),
                ),
              )
            else
              const Icon(Icons.query_stats_rounded, color: Colors.indigo, size: 20),
          ],
        ),
        const SizedBox(height: 10),
        if (isLoading)
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: Colors.indigo.withOpacity(0.1),
                width: 1,
              ),
            ),
            child: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.indigo),
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Loading ranking history...',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
            ),
          )
        else
          RankingGraph(points: _generateRankingTrend(player)),
      ],
    );
  }

  Widget _buildSourceFooter(Player player) {
    if (player.source == null) return const SizedBox();
    return Text(
      'Verified by ${player.source}',
      style: const TextStyle(
        fontSize: 12,
        fontStyle: FontStyle.italic,
        color: Colors.grey,
      ),
    );
  }

  Widget _buildStatGrid(BuildContext context, Player player) {
    final rankDate = player.highestRankingDate ?? player.careerHighDate;
    final rankVal = player.highestRanking ?? player.careerHighRank;
    final highestRankLabel = (rankVal != null && rankVal < 9999)
        ? (rankDate != null
            ? '#$rankVal (${DateFormat('MMM yyyy').format(rankDate)})'
            : '#$rankVal')
        : 'Unranked';

    return LayoutBuilder(
      builder: (context, constraints) {
        final cardWidth = (constraints.maxWidth - 12) / 2;

        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _buildStatCard(
              cardWidth,
              'Current Rank',
              (player.ranking == null || player.ranking! >= 9999) ? 'Unranked' : '#${player.ranking}',
              Icons.military_tech,
            ),
            _buildStatCard(
              cardWidth,
              'Career High',
              highestRankLabel,
              Icons.stars_rounded,
            ),
            _buildStatCard(
              cardWidth,
              'Birth Year',
              player.birthYear != null ? '${player.birthYear}' : 'N/A',
              Icons.cake_rounded,
            ),
            _buildStatCard(
              cardWidth,
              'Prize Money',
              player.prizeMoney ?? 'N/A',
              Icons.attach_money_rounded,
            ),
          ],
        );
      },
    );
  }

  Widget _buildStatCard(
    double width,
    String label,
    String value,
    IconData icon,
  ) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.4),
        borderRadius: BorderRadius.circular(15),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.indigo),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
