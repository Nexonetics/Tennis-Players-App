import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/basketball_club.dart';

class BasketballClubDetailScreen extends StatelessWidget {
  final BasketballClub club;

  const BasketballClubDetailScreen({super.key, required this.club});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth > 900) {
            return _buildWebLayout(context, constraints);
          }
          return _buildMobileLayout(context);
        },
      ),
    );
  }

  Widget _buildMobileLayout(BuildContext context) {
    final peakDateStr = club.highestRankingDate != null
        ? DateFormat('MMM yyyy').format(club.highestRankingDate!)
        : null;
    final bestRankStr = club.highestRanking != null
        ? '#${club.highestRanking}${peakDateStr != null ? '\n($peakDateStr)' : ''}'
        : 'N/A';

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.orange.shade900, Colors.black87],
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          children: [
            const SizedBox(height: 100),
            _buildHeaderContent(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStatItem('Rank', '#${club.ranking ?? "N/A"}', Icons.bar_chart),
                  _buildStatItem('Best Rank', bestRankStr, Icons.trending_up),
                  _buildStatItem('Titles', '${club.titles}', Icons.emoji_events),
                ],
              ),
            ),
            const SizedBox(height: 30),
            _buildMainDetails(),
            const SizedBox(height: 50),
          ],
        ),
      ),
    );
  }

  Widget _buildWebLayout(BuildContext context, BoxConstraints constraints) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.orange.shade900, Colors.black87],
        ),
      ),
      child: SingleChildScrollView(
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
                  child: _buildWebProfileCard(),
                ),
                const SizedBox(width: 40),
                // Right Column: Details
                Expanded(
                  child: Column(
                    children: [
                      _buildMainDetails(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWebProfileCard() {
    final peakDateStr = club.highestRankingDate != null
        ? DateFormat('MMM yyyy').format(club.highestRankingDate!)
        : null;
    final bestRankStr = club.highestRanking != null
        ? '#${club.highestRanking}${peakDateStr != null ? '\n($peakDateStr)' : ''}'
        : 'N/A';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          Container(
            height: 250,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(30)),
            ),
            child: Center(child: _buildClubLogo(size: 150)),
          ),
          Padding(
            padding: const EdgeInsets.all(30.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  club.name,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${club.city}, ${club.country}',
                  style: TextStyle(
                    fontSize: 18,
                    color: Colors.white.withOpacity(0.7),
                  ),
                ),
                const SizedBox(height: 30),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildStatItem('Rank', '#${club.ranking ?? "N/A"}', Icons.bar_chart),
                    _buildStatItem('Best Rank', bestRankStr, Icons.trending_up),
                    _buildStatItem('Titles', '${club.titles}', Icons.emoji_events),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderContent() {
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Row(
        children: [
          _buildClubLogo(size: 120),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  club.name,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Text(
                  '${club.city}, ${club.country}',
                  style: TextStyle(
                      fontSize: 18, color: Colors.white.withOpacity(0.8)),
                ),
                const SizedBox(height: 10),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${club.league} • ${club.conference}',
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClubLogo({required double size}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 10,
            spreadRadius: 2,
          ),
        ],
      ),
      child: ClipOval(
        child: club.imageUrl != null
            ? Image.network(club.imageUrl!, fit: BoxFit.cover)
            : Container(
                color: Colors.white24,
                child: Icon(Icons.sports_basketball,
                    size: size * 0.5, color: Colors.white),
              ),
      ),
    );
  }

  Widget _buildMainDetails() {
    return Column(
      children: [
        _buildGlassCard(
          title: 'Team Personnel',
          icon: Icons.groups,
          child: Column(
            children: [
              _buildDetailRow('Head Coach', club.headCoach ?? 'N/A'),
              _buildDetailRow('Star Player', club.starPlayer ?? 'N/A'),
              _buildDetailRow('General Manager', club.generalManager ?? 'N/A'),
              _buildDetailRow('Owner', club.owner ?? 'N/A'),
            ],
          ),
        ),
        _buildGlassCard(
          title: 'Arena & Market',
          icon: Icons.business,
          child: Column(
            children: [
              _buildDetailRow('Home Arena', club.arena ?? 'N/A'),
              _buildDetailRow('Capacity', club.capacity?.toString() ?? 'N/A'),
              _buildDetailRow('Market Value', club.marketValue ?? 'N/A'),
              _buildDetailRow(
                  'Current Record', club.currentSeasonRecord ?? 'N/A'),
            ],
          ),
        ),
        if (club.honors != null && club.honors!.isNotEmpty)
          _buildGlassCard(
            title: 'Club Honors',
            icon: Icons.military_tech,
            child: Wrap(
              spacing: 10,
              runSpacing: 10,
              children: club.honors!.entries.map((e) {
                return Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    children: [
                      Text(
                        e.value.toString(),
                        style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.orange),
                      ),
                      Text(
                        e.key,
                        style: const TextStyle(
                            color: Colors.white70, fontSize: 12),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        _buildGlassCard(
          title: 'Description',
          icon: Icons.info_outline,
          child: Text(
            club.description ?? 'No description available.',
            style: const TextStyle(color: Colors.white70, height: 1.5),
          ),
        ),
      ],
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.orange, size: 28),
        const SizedBox(height: 8),
        Text(value,
            style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.white)),
        Text(label,
            style: const TextStyle(color: Colors.white70, fontSize: 14)),
      ],
    );
  }

  Widget _buildGlassCard(
      {required String title, required IconData icon, required Widget child}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: Colors.orange, size: 24),
              const SizedBox(width: 10),
              Text(title,
                  style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white)),
            ],
          ),
          const Divider(color: Colors.white24, height: 25),
          child,
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(color: Colors.white70, fontSize: 16)),
          Text(value,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
