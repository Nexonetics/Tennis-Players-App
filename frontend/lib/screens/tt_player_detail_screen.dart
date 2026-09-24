import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/tt_player.dart';
import '../widgets/glass_widgets.dart';
import '../widgets/ranking_graph.dart';
import '../services/api_service.dart';

class TtPlayerDetailScreen extends StatefulWidget {
  final TableTennisPlayer player;

  const TtPlayerDetailScreen({super.key, required this.player});

  @override
  State<TtPlayerDetailScreen> createState() => _TtPlayerDetailScreenState();
}

class _TtPlayerDetailScreenState extends State<TtPlayerDetailScreen> {
  late Future<TableTennisPlayer> _playerFuture;

  @override
  void initState() {
    super.initState();
    _playerFuture = ApiService().getTtPlayerDetail(widget.player.id);
  }

  List<RankingPoint> _generateRankingTrend(TableTennisPlayer player) {
    return player.rankingHistory ?? [];
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<TableTennisPlayer>(
      future: _playerFuture,
      initialData: widget.player,
      builder: (context, snapshot) {
        final player = snapshot.data ?? widget.player;
        final isLoading = snapshot.connectionState == ConnectionState.waiting;

        return Scaffold(
          backgroundColor: const Color(0xFFCEF0DE), // Teal-tinted glass theme
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

  Widget _buildMobileLayout(BuildContext context, TableTennisPlayer player, bool isLoading) {
    return SingleChildScrollView(
      child: Column(
        children: [
          // Teal gradient background
          Container(
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF34A853),
                  Color(0xFF0F9D58),
                  Color(0xFF006837),
                ],
              ),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(32),
                bottomRight: Radius.circular(32),
              ),
            ),
            padding: const EdgeInsets.only(top: 100, bottom: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildProfileAvatar(player, size: 120),
                const SizedBox(height: 12),
                Text(
                  player.gender == 'M'
                      ? '🏓 Men\'s Singles'
                      : player.gender == 'F'
                          ? '🏓 Women\'s Singles'
                          : '🏓 Table Tennis',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.85),
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
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
                  const SizedBox(height: 32),
                  _buildPerformanceSection(player),
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
      BuildContext context, TableTennisPlayer player, bool isLoading, BoxConstraints constraints) {
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
                      Container(
                        height: 300,
                        width: double.infinity,
                        decoration: const BoxDecoration(
                          borderRadius:
                              BorderRadius.vertical(top: Radius.circular(30)),
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFF34A853), Color(0xFF0F9D58)],
                          ),
                        ),
                        child: Center(child: _buildProfileAvatar(player, size: 150)),
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
                              '${player.country ?? 'N/A'} • ${player.age != null ? '${player.age} years${player.birthYear != null ? ' (Born ${player.birthYear})' : ''}' : (player.birthYear != null ? 'Born ${player.birthYear}' : 'Pro Athlete')}',
                              style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey[700],
                              ),
                            ),
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
                          color: Color(0xFF0F9D58),
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildStatGrid(context, player),
                      const SizedBox(height: 40),
                      _buildPerformanceSection(player),
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

  Widget _buildProfileAvatar(TableTennisPlayer player, {required double size}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withOpacity(0.2),
        border: Border.all(
          color: Colors.white.withOpacity(0.5),
          width: 3,
        ),
      ),
      child: ClipOval(
        child: player.imageUrl != null
            ? Image.network(
                player.imageUrl!,
                fit: BoxFit.cover,
                alignment: Alignment.topCenter,
                errorBuilder: (_, __, ___) => Center(
                  child: Text(
                    _initials(player.name),
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: size * 0.33,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              )
            : Center(
                child: Text(
                  _initials(player.name),
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: size * 0.33,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildHeader(TableTennisPlayer player) {
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
                '${player.country ?? 'N/A'} • ${player.age != null ? '${player.age} years${player.birthYear != null ? ' (Born ${player.birthYear})' : ''}' : (player.birthYear != null ? 'Born ${player.birthYear}' : 'Pro Athlete')}',
                style: TextStyle(
                  fontSize: 16,
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

  Widget _buildRankingSection(TableTennisPlayer player, bool isLoading) {
    final history = _generateRankingTrend(player);
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
                color: Color(0xFF0F9D58),
              ),
            ),
            if (isLoading)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF0F9D58)),
                ),
              )
            else
              const Icon(Icons.query_stats_rounded, color: Color(0xFF0F9D58), size: 20),
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
                color: const Color(0xFF0F9D58).withOpacity(0.1),
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
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF0F9D58)),
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Loading ranking history...',
                    style: TextStyle(
                      color: Colors.grey,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          )
        else if (history.isEmpty)
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: const Color(0xFF0F9D58).withOpacity(0.1),
                width: 1,
              ),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.history_toggle_off_rounded,
                    size: 32,
                    color: Colors.grey.withOpacity(0.6),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'No ranking history available',
                    style: TextStyle(
                      color: Colors.grey,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          RankingGraph(
            points: history,
            color: const Color(0xFF0F9D58),
          ),
      ],
    );
  }

  Widget _buildPerformanceSection(TableTennisPlayer player) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Career Performance',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        _buildWinPercentageBanner(player),
      ],
    );
  }

  Widget _buildWinPercentageBanner(TableTennisPlayer player) {
    final percentage = player.winPercentage ?? 50.0;
    return GlassContainer(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
      borderRadius: 20,
      opacity: 0.1,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'WIN RATE',
                  style: TextStyle(
                    color: Color(0xFF0F9D58),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${percentage.toStringAsFixed(1)}%',
                  style: const TextStyle(
                    fontSize: 42,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -1,
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 80,
            height: 80,
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF0F9D58).withOpacity(0.1),
            ),
            child: CircularProgressIndicator(
              value: percentage / 100,
              strokeWidth: 8,
              backgroundColor: Colors.white.withOpacity(0.2),
              color: const Color(0xFF0F9D58),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSourceFooter(TableTennisPlayer player) {
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

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  Widget _buildStatGrid(BuildContext context, TableTennisPlayer player) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cardWidth = (constraints.maxWidth - 12) / 2;
        
        String chDateStr = '';
        if (player.careerHighDate != null) {
          chDateStr = ' (${DateFormat('MMM yyyy').format(player.careerHighDate!)})';
        }

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
              'Career High Rank',
              (player.careerHighRank != null && player.careerHighRank! < 9999) ? '#${player.careerHighRank}$chDateStr' : 'Unranked',
              Icons.trending_up_rounded,
            ),
            _buildStatCard(
              cardWidth,
              'Birth Year',
              player.birthYear != null ? '${player.birthYear}' : 'N/A',
              Icons.cake_rounded,
            ),
            _buildStatCard(
              cardWidth,
              'Playing Style',
              player.playingStyle ?? 'N/A',
              Icons.sports_tennis,
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
          Icon(icon, size: 20, color: const Color(0xFF0F9D58)),
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
