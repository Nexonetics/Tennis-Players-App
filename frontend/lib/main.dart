import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
import 'providers/player_provider.dart';
import 'providers/tt_player_provider.dart';
import 'providers/football_national_team_provider.dart';
import 'providers/basketball_national_team_provider.dart';
import 'providers/sport_provider.dart';
import 'screens/search_screen.dart';
import 'screens/top_players_screen.dart';
import 'screens/tt_search_screen.dart';
import 'screens/tt_top_players_screen.dart';
import 'screens/football_team_search_screen.dart';
import 'screens/football_top_teams_screen.dart';
import 'screens/basketball_team_search_screen.dart';
import 'screens/basketball_top_teams_screen.dart';
import 'screens/player_compare_screen.dart';
import 'screens/tt_player_compare_screen.dart';
import 'screens/football_team_compare_screen.dart';
import 'screens/basketball_team_compare_screen.dart';
import 'widgets/glass_widgets.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => PlayerProvider()),
        ChangeNotifierProvider(create: (_) => TtPlayerProvider()),
        ChangeNotifierProvider(create: (_) => FootballNationalTeamProvider()),
        ChangeNotifierProvider(create: (_) => BasketballNationalTeamProvider()),
        ChangeNotifierProvider(create: (_) => SportProvider()),
      ],
      child: const TennisApp(),
    ),
  );
}


class TennisApp extends StatelessWidget {
  const TennisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sports Player Search',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF5D5FEF),
          secondary: const Color(0xFFE0EAFC),
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: Colors.transparent,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          backgroundColor: Colors.transparent,
          elevation: 0,
          titleTextStyle: TextStyle(
            color: Color(0xFF1D1D1F),
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      home: const MainNavigation(),
    );
  }
}


// ── Breakpoints ──────────────────────────────────────────────────────────────
const double _kCompactBreakpoint = 600; // below = mobile bottom nav

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _selectedIndex = 0; // 0: Rankings, 1: Search

  @override
  Widget build(BuildContext context) {
    final sportProvider = Provider.of<SportProvider>(context);
    final currentSport = sportProvider.currentSport;

    final List<Widget> screens = [
      _getRankingsScreen(currentSport.type),
      _getSearchScreen(currentSport.type),
      if (currentSport.type == SportType.tennis ||
          currentSport.type == SportType.tableTennis ||
          currentSport.type == SportType.football ||
          currentSport.type == SportType.basketball)
        _getCompareScreen(currentSport.type),
    ];

    final List<_NavDef> navItems = [
      const _NavDef(Icons.leaderboard_rounded, 'Rankings', Colors.indigo),
      const _NavDef(Icons.search_rounded, 'Search', Colors.indigo),
      if (currentSport.type == SportType.tennis ||
          currentSport.type == SportType.tableTennis ||
          currentSport.type == SportType.football ||
          currentSport.type == SportType.basketball)
        const _NavDef(Icons.compare_arrows_rounded, 'Compare', Colors.indigo),
    ];

    // Safety check: if current sport changed and index is now out of bounds
    final displayIndex = _selectedIndex >= screens.length ? 0 : _selectedIndex;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= _kCompactBreakpoint;
        return isWide
            ? _wideLayout(context, screens, navItems, currentSport,
                sportProvider, displayIndex)
            : _compactLayout(context, screens, navItems, currentSport,
                sportProvider, displayIndex);
      },
    );
  }

  void _clearAllSearchProviders() {
    Provider.of<PlayerProvider>(context, listen: false).clearSearch();
    Provider.of<TtPlayerProvider>(context, listen: false).clearSearch();
    Provider.of<FootballNationalTeamProvider>(context, listen: false)
        .clearSearch();
    Provider.of<BasketballNationalTeamProvider>(context, listen: false).clearSearch();
  }

  Widget _getSearchScreen(SportType type) {
    switch (type) {
      case SportType.tennis:
        return const SearchScreen();
      case SportType.tableTennis:
        return const TtSearchScreen();
      case SportType.football:
        return const FootballTeamSearchScreen();
      case SportType.basketball:
        return const BasketballTeamSearchScreen();
    }
  }

  Widget _getRankingsScreen(SportType type) {
    switch (type) {
      case SportType.tennis:
        return const TopPlayersScreen();
      case SportType.tableTennis:
        return const TtTopPlayersScreen();
      case SportType.football:
        return const FootballTopTeamsScreen();
      case SportType.basketball:
        return const BasketballTopTeamsScreen();
    }
  }

  Widget _getCompareScreen(SportType type) {
    switch (type) {
      case SportType.tennis:
        return const PlayerCompareScreen();
      case SportType.tableTennis:
        return const TtPlayerCompareScreen();
      case SportType.football:
        return const FootballTeamCompareScreen();
      case SportType.basketball:
        return const BasketballTeamCompareScreen();
    }
  }

  // ── Wide layout (web / tablet) ─────────────────────────────────────────────
  Widget _wideLayout(
      BuildContext context,
      List<Widget> screens,
      List<_NavDef> navItems,
      Sport currentSport,
      SportProvider sportProvider,
      int displayIndex) {
    return LiquidBackground(
      child: Scaffold(
        appBar: _buildAppBar(context, currentSport),
        body: Row(
          children: [
            _SideRail(
              selectedIndex: displayIndex,
              navItems: navItems,
              onTap: (i) {
                if (_selectedIndex != i) {
                  _clearAllSearchProviders();
                  setState(() => _selectedIndex = i);
                }
              },
              currentSport: currentSport,
            ),
            const VerticalDivider(width: 1, thickness: 1),
            Expanded(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 720),
                  child: Column(
                    children: [
                      _SportCategoryBar(
                        sportProvider: sportProvider,
                        currentSport: currentSport,
                      ),
                      Expanded(
                        child: IndexedStack(
                          index: displayIndex,
                          children: screens,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Compact layout (mobile) ────────────────────────────────────────────────
  Widget _compactLayout(
      BuildContext context,
      List<Widget> screens,
      List<_NavDef> navItems,
      Sport currentSport,
      SportProvider sportProvider,
      int displayIndex) {
    return LiquidBackground(
      child: Scaffold(
        extendBody: true,
        appBar: _buildAppBar(context, currentSport),
        body: Column(
          children: [
            _SportCategoryBar(
              sportProvider: sportProvider,
              currentSport: currentSport,
            ),
            Expanded(
              child: IndexedStack(
                index: displayIndex,
                children: screens,
              ),
            ),
          ],
        ),
        bottomNavigationBar: Padding(
          padding: const EdgeInsets.only(left: 32, right: 32, bottom: 24),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(30),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.15),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(30),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.85),
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(
                      color: Colors.white.withOpacity(0.5),
                      width: 1.5,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: List.generate(
                      navItems.length,
                      (i) => _BottomNavItem(
                        def: navItems[i],
                        accentColor: currentSport.accentColor,
                        isSelected: displayIndex == i,
                        onTap: () {
                          if (_selectedIndex != i) {
                            _clearAllSearchProviders();
                            setState(() => _selectedIndex = i);
                          }
                        },
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context, Sport currentSport) {
    return AppBar(
      title: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(currentSport.icon, color: currentSport.accentColor, size: 24),
          const SizedBox(width: 10),
          Text(currentSport.name),
        ],
      ),
    );
  }

}

// ── Sport Category Bar ───────────────────────────────────────────────────────
class _SportCategoryBar extends StatelessWidget {
  final SportProvider sportProvider;
  final Sport currentSport;

  const _SportCategoryBar({
    required this.sportProvider,
    required this.currentSport,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 70,
      margin: const EdgeInsets.only(top: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: SportProvider.allSports.length,
        itemBuilder: (context, index) {
          final sport = SportProvider.allSports[index];
          final isSelected = currentSport.type == sport.type;

          return Padding(
            padding: const EdgeInsets.only(right: 12, bottom: 8),
            child: GestureDetector(
              onTap: () {
                if (currentSport.type != sport.type) {
                  // Clear all search results when switching sports
                  Provider.of<PlayerProvider>(context, listen: false)
                      .clearSearch();
                  Provider.of<TtPlayerProvider>(context, listen: false)
                      .clearSearch();
                  Provider.of<FootballNationalTeamProvider>(context,
                          listen: false)
                      .clearSearch();
                  Provider.of<BasketballNationalTeamProvider>(context, listen: false)
                      .clearSearch();

                  sportProvider.setSport(sport);
                }
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? sport.accentColor.withOpacity(0.15)
                      : Colors.white.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected
                        ? sport.accentColor
                        : Colors.white.withOpacity(0.2),
                    width: isSelected ? 2 : 1,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: sport.accentColor.withOpacity(0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          )
                        ]
                      : null,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      sport.icon,
                      color: isSelected ? sport.accentColor : Colors.grey[600],
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      sport.name,
                      style: TextStyle(
                        color:
                            isSelected ? sport.accentColor : Colors.grey[700],
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.w500,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Data holder ───────────────────────────────────────────────────────────────
class _NavDef {
  final IconData icon;
  final String label;
  final Color accent;
  const _NavDef(this.icon, this.label, this.accent);
}

// ── Side rail for wide screens ────────────────────────────────────────────────
class _SideRail extends StatelessWidget {
  final int selectedIndex;
  final List<_NavDef> navItems;
  final ValueChanged<int> onTap;
  final Sport currentSport;

  const _SideRail({
    required this.selectedIndex,
    required this.navItems,
    required this.onTap,
    required this.currentSport,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 200,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.35),
        border: Border(
          right: BorderSide(color: Colors.white.withOpacity(0.3)),
        ),
      ),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Icon(Icons.sports_tennis,
                      color: Colors.indigo.shade400, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    'SportsSearch',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: Colors.indigo.shade700,
                      letterSpacing: -0.3,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            ...List.generate(
              navItems.length,
              (i) => _SideRailItem(
                def: navItems[i],
                accentColor: currentSport.accentColor,
                isSelected: selectedIndex == i,
                onTap: () => onTap(i),
              ),
            ),
            const Spacer(),
            if (kIsWeb)
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: Text(
                  'Sports Player Search\nWeb Edition',
                  style: TextStyle(
                      fontSize: 10, color: Colors.grey[500], height: 1.5),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SideRailItem extends StatelessWidget {
  final _NavDef def;
  final Color accentColor;
  final bool isSelected;
  final VoidCallback onTap;

  const _SideRailItem({
    required this.def,
    required this.accentColor,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color:
              isSelected ? accentColor.withOpacity(0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(
              def.icon,
              size: 20,
              color: isSelected ? accentColor : Colors.grey[600],
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                def.label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? accentColor : Colors.grey[700],
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Bottom nav item (mobile) ───────────────────────────────────────────────────
class _BottomNavItem extends StatelessWidget {
  final _NavDef def;
  final Color accentColor;
  final bool isSelected;
  final VoidCallback onTap;

  const _BottomNavItem({
    required this.def,
    required this.accentColor,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? accentColor.withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              def.icon,
              color: isSelected ? accentColor : Colors.grey[600],
              size: 22,
            ),
            const SizedBox(height: 2),
            Text(
              def.label,
              style: TextStyle(
                fontSize: 10,
                color: isSelected ? accentColor : Colors.grey[600],
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
