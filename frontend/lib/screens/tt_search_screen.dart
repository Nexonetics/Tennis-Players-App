import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/tt_player_provider.dart';
import '../widgets/glass_widgets.dart';
import 'tt_player_detail_screen.dart';
import 'tt_player_compare_screen.dart';

class TtSearchScreen extends StatefulWidget {
  const TtSearchScreen({super.key});

  @override
  State<TtSearchScreen> createState() => _TtSearchScreenState();
}

class _TtSearchScreenState extends State<TtSearchScreen> {
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
      Provider.of<TtPlayerProvider>(context, listen: false)
          .searchPlayers(_controller.text, loadMore: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<TtPlayerProvider>(context);

    // Sync controller with provider if provider was cleared externally
    if (provider.lastQuery.isEmpty && _controller.text.isNotEmpty) {
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
                    Row(
                      children: [
                        Icon(Icons.sports_tennis,
                            color: Color(0xFF0F9D58), size: 18),
                        SizedBox(width: 6),
                        Text(
                          'TT Search',
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
                      'Find table tennis athletes',
                      style: TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
              ),
              _GenderFilterChips(provider: provider),
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
                prefixIcon:
                    Icon(Icons.search, color: Color(0xFF0F9D58), size: 20),
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
              color: Color(0xFF0F9D58),
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
          child: provider.players.isEmpty && !provider.isLoading
              ? Center(
                  child: Opacity(
                    opacity: 0.5,
                    child: Text(provider.lastQuery.isEmpty
                        ? 'Search for table tennis players!'
                        : 'No results found for "${provider.lastQuery}"'),
                  ),
                )
              : ListView.builder(
                  controller: _scrollController,
                  padding: EdgeInsets.only(
                    left: 16,
                    right: 16,
                    bottom: MediaQuery.of(context).padding.bottom + 140,
                  ),
                  itemCount: provider.players.length +
                      (provider.searchHasMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == provider.players.length) {
                      return Opacity(
                        opacity: provider.isFetchingMore ? 1.0 : 0.0,
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                      );
                    }
                    final player = provider.players[index];
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
                              color: const Color(0xFF0F9D58).withOpacity(0.12),
                              border: Border.all(
                                color: const Color(0xFF0F9D58).withOpacity(0.3),
                                width: 2,
                              ),
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
                          title: Text(
                            player.name,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            '${player.country ?? 'Unknown'} • ${player.gender == 'M' ? 'Men' : player.gender == 'F' ? 'Women' : ''}',
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
                                  color: Color(0xFF0F9D58),
                                ),
                              ),
                            ],
                          ),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    TtPlayerDetailScreen(player: player),
                              ),
                            );
                          },
                          onLongPress: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    TtPlayerCompareScreen(playerA: player),
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
        color: const Color(0xFF0F9D58),
        fontWeight: FontWeight.bold,
        fontSize: fontSize,
      ),
    ),
  );
}

class _GenderFilterChips extends StatelessWidget {
  final TtPlayerProvider provider;
  const _GenderFilterChips({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _chip(context, 'M', 'Men'),
        const SizedBox(width: 12),
        _chip(context, 'F', 'Women'),
      ],
    );
  }

  Widget _chip(BuildContext context, String value, String label) {
    final selected = provider.genderFilter == value;
    return GestureDetector(
      onTap: () => provider.setGenderFilter(value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFF0F9D58).withOpacity(0.15)
              : Colors.white.withOpacity(0.3),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? const Color(0xFF0F9D58)
                : Colors.grey.withOpacity(0.3),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? const Color(0xFF0F9D58) : Colors.grey[600],
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
