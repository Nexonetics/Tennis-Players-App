import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/player_provider.dart';
import '../widgets/glass_widgets.dart';
import 'player_detail_screen.dart';
import 'player_compare_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        _controller.text.isNotEmpty) {
      Provider.of<PlayerProvider>(context, listen: false)
          .searchPlayers(_controller.text, loadMore: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final playerProvider = Provider.of<PlayerProvider>(context);

    // Sync controller with provider if provider was cleared externally
    if (playerProvider.lastQuery.isEmpty && _controller.text.isNotEmpty) {
      _controller.clear();
    }

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
                    Text(
                      'Tennis Search',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                        color: Color(0xFF1D1D1F),
                      ),
                    ),
                    Text(
                      'Find your favorite athletes',
                      style: TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
              ),
              _GenderFilterChips(provider: playerProvider),
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
                hintText: 'Search players...',
                hintStyle: TextStyle(fontSize: 14, color: Colors.grey),
                prefixIcon: Icon(Icons.search, color: Colors.indigo, size: 20),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(vertical: 12),
              ),
              onChanged: playerProvider.onSearchChanged,
            ),
          ),
        ),
        if (playerProvider.isSearching)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0),
            child: LinearProgressIndicator(
              backgroundColor: Colors.transparent,
              minHeight: 2,
            ),
          ),
        if (playerProvider.error != null)
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: GlassContainer(
              padding: const EdgeInsets.all(12),
              opacity: 0.05,
              child: Text(
                'Error: ${playerProvider.error}',
                style: const TextStyle(color: Colors.redAccent),
              ),
            ),
          ),
        Expanded(
          child: playerProvider.players.isEmpty && !playerProvider.isLoading
              ? Center(
                  child: Opacity(
                    opacity: 0.5,
                    child: Text(playerProvider.lastQuery.isEmpty
                        ? 'Start searching for players!'
                        : 'No results found for "${playerProvider.lastQuery}"'),
                  ),
                )
              : ListView.builder(
                  controller: _scrollController,
                  padding: EdgeInsets.only(
                    left: 16,
                    right: 16,
                    bottom: MediaQuery.of(context).padding.bottom + 140,
                  ),
                  itemCount: playerProvider.players.length +
                      (playerProvider.searchHasMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == playerProvider.players.length) {
                      return Opacity(
                        opacity: playerProvider.isFetchingMore ? 1.0 : 0.0,
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                      );
                    }
                    final player = playerProvider.players[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: GlassContainer(
                        blur: 0,
                        borderRadius: 20,
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(8),
                          leading: Hero(
                            tag: 'player-${player.id}',
                            child: Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.indigo.withOpacity(0.3),
                                  width: 2,
                                ),
                                color: Colors.indigo.withOpacity(0.12),
                              ),
                              child: ClipOval(
                                child: player.imageUrl != null
                                    ? Image.network(
                                        player.imageUrl!,
                                        fit: BoxFit.cover,
                                        alignment: Alignment.topCenter,
                                        errorBuilder: (_, __, ___) =>
                                            _initialsWidget(player.name, 18),
                                      )
                                    : _initialsWidget(player.name, 18),
                              ),
                            ),
                          ),
                          title: Text(
                            player.name,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            '${player.country ?? 'Unknown'} • ${player.gender == 'M' ? 'ATP' : player.gender == 'F' ? 'WTA' : ''}',
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                'Rank',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey[600],
                                ),
                              ),
                              Text(
                                (player.ranking == null || player.ranking! >= 9999)
                                    ? 'Unranked'
                                    : '#${player.ranking}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.indigo,
                                ),
                              ),
                            ],
                          ),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    PlayerDetailScreen(player: player),
                              ),
                            );
                          },
                          onLongPress: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    PlayerCompareScreen(playerA: player),
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
          color: Colors.indigo,
          fontWeight: FontWeight.bold,
          fontSize: fontSize,
        ),
      ),
    );
  }
}

class _GenderFilterChips extends StatelessWidget {
  final PlayerProvider provider;
  const _GenderFilterChips({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _chip(context, 'M', 'ATP (Men)'),
        const SizedBox(width: 12),
        _chip(context, 'F', 'WTA (Women)'),
      ],
    );
  }

  Widget _chip(BuildContext context, String value, String label) {
    final selected = provider.selectedGender == value;
    return GestureDetector(
      onTap: () => provider.setGender(value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: selected
              ? Colors.indigo.withOpacity(0.15)
              : Colors.white.withOpacity(0.3),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? Colors.indigo : Colors.grey.withOpacity(0.3),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.indigo : Colors.grey[600],
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
