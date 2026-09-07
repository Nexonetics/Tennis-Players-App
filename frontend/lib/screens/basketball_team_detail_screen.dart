import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/basketball_national_team.dart';
import '../widgets/glass_widgets.dart';
import '../widgets/ranking_graph.dart';
import '../services/api_service.dart';

class BasketballTeamDetailScreen extends StatefulWidget {
  final BasketballNationalTeam team;

  const BasketballTeamDetailScreen({super.key, required this.team});

  @override
  State<BasketballTeamDetailScreen> createState() => _BasketballTeamDetailScreenState();
}

class _BasketballTeamDetailScreenState extends State<BasketballTeamDetailScreen> {
  late Future<BasketballNationalTeam> _teamFuture;

  @override
  void initState() {
    super.initState();
    _teamFuture = ApiService().getBasketballTeamDetail(widget.team.id);
  }

  List<RankingPoint> _generateRankingTrend(BasketballNationalTeam team) {
    if (team.rankingHistory != null && team.rankingHistory!.isNotEmpty) {
      return team.rankingHistory!;
    }
    final current = team.ranking ?? 100;
    final highest = team.highestRanking ?? (current > 5 ? current - 5 : 1);
    final highestDate = team.highestRankingDate ??
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
    return FutureBuilder<BasketballNationalTeam>(
      future: _teamFuture,
      initialData: widget.team,
      builder: (context, snapshot) {
        final team = snapshot.data ?? widget.team;
        final isLoading = snapshot.connectionState == ConnectionState.waiting;

        return Scaffold(
          backgroundColor: const Color(0xFFFFF3E0),
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
                return _buildWebLayout(context, team, isLoading, constraints);
              }
              return _buildMobileLayout(context, team, isLoading);
            },
          ),
        );
      },
    );
  }

  Widget _buildMobileLayout(
      BuildContext context, BasketballNationalTeam team, bool isLoading) {
    final peakDateStr = team.highestRankingDate != null
        ? DateFormat('MMM yyyy').format(team.highestRankingDate!)
        : null;

    return SingleChildScrollView(
      child: Column(
        children: [
          // Gradient background
          Container(
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFFF8C00),
                  Color(0xFFE65100),
                  Color(0xFFBF360C),
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
                _buildTeamLogo(team, size: 140),
                const SizedBox(height: 16),
                Text(
                  '🏀 ${team.category == 'women' ? "Women's National Team" : "Men's National Team"} • ${team.confederation ?? 'FIBA Member'}',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    if (team.ranking != null)
                      _buildRankBadge(
                          'FIBA Rank #${team.ranking}', Colors.amber),
                    if (team.highestRanking != null)
                      _buildRankBadge(
                          'Best: #${team.highestRanking}${peakDateStr != null ? ' ($peakDateStr)' : ''}',
                          Colors.white),
                  ],
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
                  _buildHeaderInfo(team),
                  const Divider(height: 40, thickness: 1),
                  _buildRankingSection(team, isLoading),
                  const SizedBox(height: 30),
                  _buildMainDetails(team),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWebLayout(BuildContext context, BasketballNationalTeam team,
      bool isLoading, BoxConstraints constraints) {
    final peakDateStr = team.highestRankingDate != null
        ? DateFormat('MMM yyyy').format(team.highestRankingDate!)
        : null;

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
                            colors: [Color(0xFFFF8C00), Color(0xFFE65100)],
                          ),
                        ),
                        child: Center(child: _buildTeamLogo(team, size: 160)),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildHeaderInfo(team),
                            const SizedBox(height: 24),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                if (team.ranking != null)
                                  _buildRankBadge('FIBA Rank #${team.ranking}',
                                      Colors.amber),
                                if (team.highestRanking != null)
                                  _buildRankBadge(
                                      'Best: #${team.highestRanking}${peakDateStr != null ? ' ($peakDateStr)' : ''}',
                                      Colors.white),
                              ],
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
                      _buildRankingSection(team, isLoading),
                      const SizedBox(height: 40),
                      _buildMainDetails(team),
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

  Widget _buildRankingSection(BasketballNationalTeam team, bool isLoading) {
    final history = _generateRankingTrend(team);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'FIBA Ranking History',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFFE65100),
              ),
            ),
            if (isLoading)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFE65100)),
                ),
              )
            else
              const Icon(Icons.query_stats_rounded, color: Color(0xFFE65100), size: 22),
          ],
        ),
        const SizedBox(height: 10),
        if (isLoading)
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Center(
              child: CircularProgressIndicator(color: Color(0xFFE65100)),
            ),
          )
        else
          GlassContainer(
            borderRadius: 20,
            opacity: 0.2,
            padding: const EdgeInsets.all(12),
            child: RankingGraph(
              points: history,
              color: const Color(0xFFE65100),
            ),
          ),
      ],
    );
  }

  Widget _buildTeamLogo(BasketballNationalTeam team, {required double size}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: 0.2),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.5),
          width: 3,
        ),
      ),
      child: ClipOval(
        child: team.imageUrl != null
            ? Image.network(
                team.imageUrl!,
                fit: BoxFit.cover,
                alignment: Alignment.topCenter,
                errorBuilder: (_, __, ___) => _initialsWidget(team.name, 48),
              )
            : _initialsWidget(team.name, 48),
      ),
    );
  }

  Widget _buildHeaderInfo(BasketballNationalTeam team) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          team.name,
          style: const TextStyle(
              fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: -1),
        ),
        Text(
          'National Team • Founded ${team.foundedYear ?? 'TBD'}',
          style: TextStyle(
              fontSize: 18,
              color: Colors.grey[700],
              fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  Widget _buildMainDetails(BasketballNationalTeam team) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildQuickStatsSection(team),
        const SizedBox(height: 40),
        if (team.honors != null && team.honors!.isNotEmpty) ...[
          const Text(
            'Major Honors',
            style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFFE65100)),
          ),
          const SizedBox(height: 16),
          _buildHonorsGrid(team),
          const SizedBox(height: 40),
        ],
        const Text(
          'About the National Team',
          style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Color(0xFFE65100)),
        ),
        const SizedBox(height: 12),
        Text(
          team.description ?? 'No information available.',
          style: const TextStyle(
              fontSize: 15, height: 1.6, color: Color(0xFF2D2D2F)),
        ),
        const SizedBox(height: 40),
        const Text(
          'Leadership',
          style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Color(0xFFE65100)),
        ),
        const SizedBox(height: 16),
        _buildLeadershipGrid(team),
        const SizedBox(height: 40),
        const Text(
          'Home Arena',
          style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Color(0xFFE65100)),
        ),
        const SizedBox(height: 16),
        _buildVenueCard(team),
        const SizedBox(height: 40),
        if (team.mainRivals != null) ...[
          const Text(
            'Main Rivals',
            style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFFE65100)),
          ),
          const SizedBox(height: 12),
          _buildRivalsChips(team),
        ],
      ],
    );
  }

  Widget _buildRankBadge(String label, Color color) {
    return Container(
      margin: const EdgeInsets.only(top: 8, right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration:
          BoxDecoration(color: color, borderRadius: BorderRadius.circular(20)),
      child: Text(label,
          style: const TextStyle(
              color: Colors.black, fontWeight: FontWeight.bold, fontSize: 11)),
    );
  }

  Widget _buildQuickStatsSection(BasketballNationalTeam team) {
    final peakDate = team.highestRankingDate != null
        ? DateFormat('MMM yyyy').format(team.highestRankingDate!)
        : null;

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildStatBadge(
                'CURRENT FIBA RANK',
                '#${team.ranking ?? "N/A"}',
                Icons.leaderboard_rounded,
                const Color(0xFFE65100),
                subtitle: 'Latest Release',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatBadge(
                'BEST FIBA RANK',
                '#${team.highestRanking ?? team.ranking ?? "N/A"}',
                Icons.emoji_events_rounded,
                Colors.amber[800]!,
                subtitle: peakDate != null ? 'Achieved $peakDate' : 'Peak Rank',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildStatBadge(
                'TOTAL TROPHIES',
                '${team.totalTrophies}',
                Icons.military_tech_rounded,
                Colors.deepOrange,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatBadge(
                'FIBA WC TITLES',
                '${team.worldCupTitles}',
                Icons.workspace_premium_rounded,
                Colors.amber[700]!,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatBadge(
      String label, String value, IconData icon, Color color,
      {String? subtitle}) {
    return GlassContainer(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      borderRadius: 20,
      opacity: 0.1,
      child: Column(
        children: [
          Icon(icon, color: color, size: 26),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
              letterSpacing: 0.5,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 10,
                color: Colors.grey[700],
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildHonorsGrid(BasketballNationalTeam team) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: team.honors!.entries
          .map((e) => _buildHonorCard(e.key, e.value))
          .toList(),
    );
  }

  Widget _buildHonorCard(String title, int count) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: const Color(0xFFE65100).withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Text(
            '$count',
            style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: Color(0xFFE65100)),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildLeadershipGrid(BasketballNationalTeam team) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _buildInfoCard(
            'Captain', team.captain ?? 'TBD', Icons.person_pin, 0.45),
        _buildInfoCard(
            'Head Coach', team.manager ?? 'TBD', Icons.sports_rounded, 0.45),
      ],
    );
  }

  Widget _buildVenueCard(BasketballNationalTeam team) {
    return GlassContainer(
      padding: const EdgeInsets.all(20),
      borderRadius: 20,
      opacity: 0.1,
      child: Row(
        children: [
          const Icon(Icons.stadium, size: 40, color: Color(0xFFE65100)),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(team.stadium ?? 'National Basketball Arena',
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('Primary Home Venue',
                    style: TextStyle(color: Colors.grey[700])),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRivalsChips(BasketballNationalTeam team) {
    final rivals = team.mainRivals!.split(',');
    return Wrap(
      spacing: 8,
      children: rivals
          .map((r) => Chip(
                label: Text(r.trim(), style: const TextStyle(fontSize: 12)),
                backgroundColor: const Color(0xFFE65100).withValues(alpha: 0.1),
                side: BorderSide.none,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20)),
              ))
          .toList(),
    );
  }

  Widget _buildInfoCard(
      String label, String value, IconData icon, double widthFactor) {
    return LayoutBuilder(builder: (context, constraints) {
      return GlassContainer(
        width: constraints.maxWidth * widthFactor - (widthFactor < 1.0 ? 6 : 0),
        padding: const EdgeInsets.all(16),
        borderRadius: 15,
        opacity: 0.1,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: const Color(0xFFE65100)),
            const SizedBox(height: 8),
            Text(label,
                style: const TextStyle(fontSize: 10, color: Colors.grey)),
            const SizedBox(height: 4),
            Text(value,
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                overflow: TextOverflow.ellipsis),
          ],
        ),
      );
    });
  }

  Widget _initialsWidget(String name, double fontSize) {
    final parts = name.trim().split(' ');
    final initials = parts.length >= 2
        ? '${parts[0][0]}${parts[1][0]}'.toUpperCase()
        : name.isNotEmpty
            ? name[0].toUpperCase()
            : '?';
    return Center(
        child: Text(initials,
            style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: fontSize)));
  }
}
