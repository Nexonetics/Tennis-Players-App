import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/football_national_team_provider.dart';
import '../widgets/glass_widgets.dart';
import 'football_team_detail_screen.dart';

class FootballTopTeamsScreen extends StatefulWidget {
  const FootballTopTeamsScreen({super.key});

  @override
  State<FootballTopTeamsScreen> createState() => _FootballTopTeamsScreenState();
}

class _FootballTopTeamsScreenState extends State<FootballTopTeamsScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<FootballNationalTeamProvider>(context, listen: false)
          .fetchTopTeams();
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      Provider.of<FootballNationalTeamProvider>(context, listen: false)
          .fetchMoreTopTeams();
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<FootballNationalTeamProvider>(context);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.stars, color: Color(0xFFE4405F), size: 18),
                        SizedBox(width: 8),
                        Text(
                          'FIFA Rankings',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.5,
                            color: Color(0xFF1D1D1F),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      'Official National Teams',
                      style: TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
              ),
              // Category Toggle could go here if we wanted, but we'll keep it below for now
            ],
          ),
        ),
        // Category Toggle
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => provider.setCategory('men'),
                  child: GlassContainer(
                    opacity: provider.selectedCategory == 'men' ? 0.3 : 0.05,
                    borderRadius: 12,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Center(
                      child: Text(
                        'Men',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: provider.selectedCategory == 'men'
                              ? const Color(0xFFE4405F)
                              : Colors.grey,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () => provider.setCategory('women'),
                  child: GlassContainer(
                    opacity: provider.selectedCategory == 'women' ? 0.3 : 0.05,
                    borderRadius: 12,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Center(
                      child: Text(
                        'Women',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: provider.selectedCategory == 'women'
                              ? const Color(0xFFE4405F)
                              : Colors.grey,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: provider.isLoading && provider.topTeams.isEmpty
              ? const Center(
                  child: CircularProgressIndicator(color: Color(0xFFE4405F)))
              : provider.error != null && provider.topTeams.isEmpty
                  ? Center(child: Text('Error: ${provider.error}'))
                  : RefreshIndicator(
                      color: const Color(0xFFE4405F),
                      onRefresh: provider.fetchTopTeams,
                      child: ListView.builder(
                        controller: _scrollController,
                        padding: EdgeInsets.only(
                          left: 16,
                          right: 16,
                          bottom: MediaQuery.of(context).padding.bottom + 140,
                        ),
                        itemCount: provider.topTeams.length +
                            (provider.hasMoreTopTeams ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index == provider.topTeams.length) {
                            return const Padding(
                              padding: EdgeInsets.symmetric(vertical: 32.0),
                              child: Center(
                                child: CircularProgressIndicator(
                                    color: Color(0xFFE4405F)),
                              ),
                            );
                          }
                          final team = provider.topTeams[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12.0),
                            child: GlassContainer(
                              borderRadius: 20,
                              child: ListTile(
                                leading: SizedBox(
                                  width: 90,
                                  child: Row(
                                    children: [
                                      SizedBox(
                                        width: 44,
                                        child: FittedBox(
                                          fit: BoxFit.scaleDown,
                                          alignment: Alignment.centerLeft,
                                          child: Text(
                                            '#${team.ranking}',
                                            maxLines: 1,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFFE4405F),
                                            ),
                                          ),
                                        ),
                                      ),
                                      Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: const Color(0xFFE4405F)
                                              .withOpacity(0.1),
                                        ),
                                        child: ClipOval(
                                          child: team.imageUrl != null
                                              ? Image.network(
                                                  team.imageUrl!,
                                                  fit: BoxFit.cover,
                                                  alignment:
                                                      Alignment.topCenter,
                                                  errorBuilder: (_, __, ___) =>
                                                      _buildInitials(team.name),
                                                )
                                              : _buildInitials(team.name),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                title: Text(
                                  team.name,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold),
                                ),
                                subtitle: Text(
                                  '${team.category == 'women' ? "Women's Team" : "Men's Team"} • ${team.confederation ?? 'FIFA Member'}',
                                ),
                                trailing: const Icon(Icons.chevron_right),
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          FootballTeamDetailScreen(team: team),
                                    ),
                                  );
                                },
                              ),
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildInitials(String name) {
    final parts = name.trim().split(' ');
    final initials = parts.length >= 2
        ? '${parts[0][0]}${parts[1][0]}'.toUpperCase()
        : name.isNotEmpty
            ? name[0].toUpperCase()
            : '?';
    return Center(
      child: Text(
        initials,
        style: const TextStyle(
          color: Color(0xFFE4405F),
          fontWeight: FontWeight.bold,
          fontSize: 16,
        ),
      ),
    );
  }
}
