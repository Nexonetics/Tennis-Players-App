import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/basketball_national_team_provider.dart';
import '../widgets/glass_widgets.dart';
import 'basketball_team_detail_screen.dart';

class BasketballTeamSearchScreen extends StatefulWidget {
  const BasketballTeamSearchScreen({super.key});

  @override
  State<BasketballTeamSearchScreen> createState() =>
      _BasketballTeamSearchScreenState();
}

class _BasketballTeamSearchScreenState extends State<BasketballTeamSearchScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      final provider =
          Provider.of<BasketballNationalTeamProvider>(context, listen: false);
      provider.fetchMoreTeams();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<BasketballNationalTeamProvider>(context);

    if (provider.lastQuery.isEmpty && _controller.text.isNotEmpty) {
      _controller.clear();
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            children: [
              const Icon(Icons.sports_basketball,
                  color: Color(0xFFE65100), size: 18),
              const SizedBox(width: 8),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'National Teams',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                        color: Color(0xFF1D1D1F),
                      ),
                    ),
                    Text(
                      'Explore basketball teams',
                      style: TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
              ),
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
                              ? const Color(0xFFE65100)
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
                              ? const Color(0xFFE65100)
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
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8),
          child: GlassContainer(
            borderRadius: 20,
            opacity: 0.1,
            child: TextField(
              controller: _controller,
              decoration: const InputDecoration(
                hintText: 'Search basketball national teams...',
                hintStyle: TextStyle(fontSize: 14, color: Colors.grey),
                prefixIcon:
                    Icon(Icons.search, color: Color(0xFFE65100), size: 20),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(vertical: 12),
              ),
              onChanged: provider.onSearchChanged,
            ),
          ),
        ),
        if (provider.isSearching)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0),
            child: LinearProgressIndicator(
              backgroundColor: Colors.transparent,
              color: Color(0xFFE65100),
              minHeight: 2,
            ),
          ),
        if (provider.error != null)
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: GlassContainer(
              padding: const EdgeInsets.all(12),
              opacity: 0.05,
              child: Text(
                'Error: ${provider.error}',
                style: const TextStyle(color: Colors.redAccent),
              ),
            ),
          ),
        Expanded(
          child: provider.teams.isEmpty && !provider.isSearching
              ? Center(
                  child: Opacity(
                    opacity: 0.5,
                    child: Text(provider.lastQuery.isEmpty
                        ? 'Search for national teams!'
                        : 'No results found for "${provider.lastQuery}"'),
                  ),
                )
              : ListView.builder(
                  controller: _scrollController,
                  padding: EdgeInsets.only(
                    left: 16,
                    right: 16,
                    bottom: MediaQuery.of(context).padding.bottom + 100,
                  ),
                  itemCount: provider.teams.length + (provider.hasMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == provider.teams.length) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 20),
                          child: CircularProgressIndicator(
                            color: Color(0xFFE65100),
                          ),
                        ),
                      );
                    }
                    final team = provider.teams[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: GlassContainer(
                        blur: 0,
                        borderRadius: 20,
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(8),
                          leading: Container(
                            width: 50,
                            height: 50,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: const Color(0xFFE65100).withValues(alpha: 0.12),
                              border: Border.all(
                                color: const Color(0xFFE65100).withValues(alpha: 0.3),
                                width: 2,
                              ),
                            ),
                            child: ClipOval(
                              child: team.imageUrl != null
                                  ? Image.network(
                                      team.imageUrl!,
                                      fit: BoxFit.cover,
                                      alignment: Alignment.topCenter,
                                      errorBuilder: (_, __, ___) =>
                                          _initialsWidget(team.name, 18),
                                    )
                                  : _initialsWidget(team.name, 18),
                            ),
                          ),
                          title: Text(
                            team.name,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            '${team.category == 'women' ? "Women's Team" : "Men's Team"} • ${team.confederation ?? 'FIBA Member'}',
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                'FIBA Rank',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey[600],
                                ),
                              ),
                              Text(
                                '#${team.ranking ?? 'N/A'}',
                                maxLines: 1,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFFE65100),
                                ),
                              ),
                            ],
                          ),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    BasketballTeamDetailScreen(team: team),
                              ),
                            );
                          },
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

Widget _initialsWidget(String name, double fontSize) {
  final parts = name.trim().split(' ');
  final initials = parts.length >= 2
      ? '${parts[0][0]}${parts[1][0]}'.toUpperCase()
      : name.isNotEmpty
          ? name[0].toUpperCase()
          : '?';
  return Center(
    child: Text(
      initials,
      style: TextStyle(
        color: const Color(0xFFE65100),
        fontWeight: FontWeight.bold,
        fontSize: fontSize,
      ),
    ),
  );
}
