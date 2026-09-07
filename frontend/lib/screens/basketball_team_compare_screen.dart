import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/basketball_national_team.dart';
import '../services/api_service.dart';
import '../widgets/glass_widgets.dart';
import '../widgets/ranking_graph.dart';

class BasketballTeamCompareScreen extends StatefulWidget {
  final BasketballNationalTeam? teamA;
  const BasketballTeamCompareScreen({super.key, this.teamA});

  @override
  State<BasketballTeamCompareScreen> createState() =>
      _BasketballTeamCompareScreenState();
}

class _BasketballTeamCompareScreenState extends State<BasketballTeamCompareScreen>
    with TickerProviderStateMixin {
  BasketballNationalTeam? _teamA;
  BasketballNationalTeam? _teamB;

  bool _searchingA = false;
  bool _searchingB = false;

  List<BasketballNationalTeam> _resultsA = [];
  List<BasketballNationalTeam> _resultsB = [];

  bool _noResultsA = false;
  bool _noResultsB = false;

  final TextEditingController _ctrlA = TextEditingController();
  final TextEditingController _ctrlB = TextEditingController();

  Timer? _debounceA;
  Timer? _debounceB;

  bool _showComparison = false;
  String _activeSearch = 'A';

  late AnimationController _fadeCtrl;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _teamA = widget.teamA;
    if (_teamA != null) {
      _ctrlA.text = _teamA!.name;
    }

    _fadeCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 600));
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    _ctrlA.dispose();
    _ctrlB.dispose();
    _debounceA?.cancel();
    _debounceB?.cancel();
    super.dispose();
  }

  void _onSearchA(String q) {
    setState(() {
      _activeSearch = 'A';
    });
    if (_debounceA?.isActive ?? false) _debounceA!.cancel();
    _debounceA = Timer(const Duration(milliseconds: 400), () {
      if (q.trim().isNotEmpty) {
        _doSearch(q.trim(), true);
      } else {
        setState(() {
          _resultsA = [];
          _noResultsA = false;
        });
      }
    });
  }

  void _onSearchB(String q) {
    setState(() {
      _activeSearch = 'B';
    });
    if (_debounceB?.isActive ?? false) _debounceB!.cancel();
    _debounceB = Timer(const Duration(milliseconds: 400), () {
      if (q.trim().isNotEmpty) {
        _doSearch(q.trim(), false);
      } else {
        setState(() {
          _resultsB = [];
          _noResultsB = false;
        });
      }
    });
  }

  Future<void> _doSearch(String q, bool isA) async {
    setState(() {
      if (isA) {
        _searchingA = true;
      } else {
        _searchingB = true;
      }
    });
    try {
      final res = await ApiService().searchBasketballTeams(q, size: 5);
      setState(() {
        if (isA) {
          _resultsA = res.items.where((c) => c.id != _teamB?.id).toList();
          _noResultsA = _resultsA.isEmpty;
        } else {
          _resultsB = res.items.where((c) => c.id != _teamA?.id).toList();
          _noResultsB = _resultsB.isEmpty;
        }
      });
    } catch (e) {
      // Handle error
    } finally {
      setState(() {
        if (isA) {
          _searchingA = false;
        } else {
          _searchingB = false;
        }
      });
    }
  }

  void _selectA(BasketballNationalTeam c) async {
    setState(() {
      _teamA = c;
      _resultsA = [];
      _noResultsA = false;
      _ctrlA.text = c.name;
      _showComparison = false;
    });
    FocusScope.of(context).unfocus();
    try {
      final detail = await ApiService().getBasketballTeamDetail(c.id);
      if (mounted) {
        setState(() {
          _teamA = detail;
        });
      }
    } catch (_) {}
  }

  void _selectB(BasketballNationalTeam c) async {
    setState(() {
      _teamB = c;
      _resultsB = [];
      _noResultsB = false;
      _ctrlB.text = c.name;
      _showComparison = false;
    });
    FocusScope.of(context).unfocus();
    try {
      final detail = await ApiService().getBasketballTeamDetail(c.id);
      if (mounted) {
        setState(() {
          _teamB = detail;
        });
      }
    } catch (_) {}
  }

  void _compare() async {
    if (_teamA != null && _teamB != null) {
      setState(() {
        _showComparison = true;
      });
      _fadeCtrl.forward(from: 0);
      try {
        final detailA = await ApiService().getBasketballTeamDetail(_teamA!.id);
        final detailB = await ApiService().getBasketballTeamDetail(_teamB!.id);
        if (mounted) {
          setState(() {
            _teamA = detailA;
            _teamB = detailB;
          });
        }
      } catch (_) {}
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    const SizedBox(height: 30),
                    const Text(
                      'National Team Comparison',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                        color: Color(0xFF1D1D1F),
                      ),
                    ),
                    const SizedBox(height: 5),
                    const Text(
                      'Analyze basketball giants side-by-side',
                      style: TextStyle(color: Colors.grey, fontSize: 16),
                    ),
                    const SizedBox(height: 20),
                    _buildSelectionArea(),
                    const SizedBox(height: 20),
                    if (_showComparison)
                      _buildComparisonResults()
                    else
                      _buildPlaceholder(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectionArea() {
    return GlassContainer(
      borderRadius: 24,
      opacity: 0.08,
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _teamA != null
                    ? _buildSelectedCard(_teamA!, true)
                    : _buildSearchBox(_ctrlA, _onSearchA, true),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.04),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
                  ),
                  child: const Center(
                    child: Text(
                      'VS',
                      style: TextStyle(
                        color: Colors.grey,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: _teamB != null
                    ? _buildSelectedCard(_teamB!, false)
                    : _buildSearchBox(_ctrlB, _onSearchB, false),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: (_teamA != null && _teamB != null)
                    ? const LinearGradient(
                        colors: [Color(0xFFE65100), Color(0xFFFF8C00)],
                      )
                    : null,
                color: (_teamA == null || _teamB == null)
                    ? Colors.black.withValues(alpha: 0.05)
                    : null,
                boxShadow: (_teamA != null && _teamB != null)
                    ? [
                        BoxShadow(
                          color: const Color(0xFFE65100).withValues(alpha: 0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        )
                      ]
                    : [],
              ),
              child: ElevatedButton(
                onPressed:
                    (_teamA != null && _teamB != null) ? _compare : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: (_teamA != null && _teamB != null)
                      ? Colors.white
                      : Colors.grey[400],
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                  elevation: 0,
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.bolt_rounded, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'COMPARE TEAMS',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (_resultsA.isNotEmpty ||
              _resultsB.isNotEmpty ||
              _noResultsA ||
              _noResultsB)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Builder(
                builder: (context) {
                  final showA = _resultsA.isNotEmpty || (_noResultsA && _ctrlA.text.isNotEmpty);
                  final showB = _resultsB.isNotEmpty || (_noResultsB && _ctrlB.text.isNotEmpty);
                  if (showA && showB) {
                    if (_activeSearch == 'B') {
                      return _resultsB.isNotEmpty
                          ? _buildResultList(_resultsB, _selectB)
                          : _buildNoResults();
                    } else {
                      return _resultsA.isNotEmpty
                          ? _buildResultList(_resultsA, _selectA)
                          : _buildNoResults();
                    }
                  } else if (showA) {
                    return _resultsA.isNotEmpty
                        ? _buildResultList(_resultsA, _selectA)
                        : _buildNoResults();
                  } else if (showB) {
                    return _resultsB.isNotEmpty
                        ? _buildResultList(_resultsB, _selectB)
                        : _buildNoResults();
                  }
                  return const SizedBox();
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSelectedCard(BasketballNationalTeam t, bool isA) {
    final accentColor = isA ? const Color(0xFFE65100) : const Color(0xFFFF8C00);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accentColor.withValues(alpha: 0.3), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: accentColor.withValues(alpha: 0.05),
            blurRadius: 10,
            spreadRadius: 1,
          )
        ],
      ),
      child: Row(
        children: [
          _Avatar(
            imageUrl: t.imageUrl,
            name: t.name,
            size: 40,
            accent: accentColor,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  t.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF1D1D1F),
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${t.category == 'women' ? "Women's Team" : "Men's Team"} • ${t.confederation ?? 'Unknown'}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(Icons.close_rounded, color: Colors.grey[400], size: 18),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            onPressed: () {
              setState(() {
                if (isA) {
                  _teamA = null;
                  _ctrlA.clear();
                  _resultsA = [];
                  _noResultsA = false;
                } else {
                  _teamB = null;
                  _ctrlB.clear();
                  _resultsB = [];
                  _noResultsB = false;
                }
                _showComparison = false;
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBox(TextEditingController ctrl, Function(String) onChanged, bool isA) {
    final accentColor = isA ? const Color(0xFFE65100) : const Color(0xFFFF8C00);
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withValues(alpha: 0.08)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        children: [
          Icon(Icons.search_rounded, color: Colors.grey[400], size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: ctrl,
              onChanged: onChanged,
              style: const TextStyle(
                color: Color(0xFF1D1D1F),
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
              decoration: InputDecoration(
                hintText: isA ? 'Search Team 1' : 'Search Team 2',
                hintStyle: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 13,
                  fontWeight: FontWeight.w400,
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          if ((isA && _searchingA) || (!isA && _searchingB))
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: accentColor,
              ),
            )
          else if (ctrl.text.isNotEmpty)
            GestureDetector(
              onTap: () {
                setState(() {
                  ctrl.clear();
                  if (isA) {
                    _resultsA = [];
                    _noResultsA = false;
                  } else {
                    _resultsB = [];
                    _noResultsB = false;
                  }
                });
              },
              child: Icon(Icons.clear_rounded, color: Colors.grey[400], size: 16),
            ),
        ],
      ),
    );
  }

  Widget _buildNoResults() {
    return Container(
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off_rounded, color: Colors.grey[400], size: 16),
          const SizedBox(width: 8),
          const Text(
            'No results found',
            style: TextStyle(
              color: Colors.grey,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildResultList(List<BasketballNationalTeam> results, Function(BasketballNationalTeam) onSelect) {
    return Container(
      margin: const EdgeInsets.only(top: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        children: results.map((t) {
          final isLast = results.last == t;
          return Container(
            decoration: BoxDecoration(
              border: isLast
                  ? null
                  : Border(
                      bottom: BorderSide(
                        color: Colors.black.withValues(alpha: 0.05),
                        width: 0.5,
                      ),
                    ),
            ),
            child: Material(
              color: Colors.transparent,
              child: ListTile(
                dense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(
                    top: results.first == t ? const Radius.circular(16) : Radius.zero,
                    bottom: isLast ? const Radius.circular(16) : Radius.zero,
                  ),
                ),
                hoverColor: Colors.black.withValues(alpha: 0.03),
                leading: _Avatar(
                  imageUrl: t.imageUrl,
                  name: t.name,
                  size: 32,
                  accent: const Color(0xFFE65100),
                ),
                title: Text(
                  t.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF1D1D1F),
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                subtitle: Text(
                  '${t.category == 'women' ? "Women's Team" : "Men's Team"} • ${t.confederation ?? 'Unknown'}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 10,
                  ),
                ),
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE65100).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '#${t.ranking ?? "N/A"}',
                    style: const TextStyle(
                      color: Color(0xFFE65100),
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
                ),
                onTap: () => onSelect(t),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildComparisonResults() {
    return FadeTransition(
      opacity: _fadeAnim,
      child: Column(
        children: [
          _buildSummaryCard(),
          const SizedBox(height: 20),
          _buildTimelineComparison(),
          const SizedBox(height: 20),
          _buildStatsComparison(),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildTimelineComparison() {
    return GlassContainer(
      borderRadius: 20,
      opacity: 0.1,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'FIBA RANKING HISTORY COMPARISON',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: Colors.grey,
              fontSize: 12,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xFFE65100),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                _teamA!.name,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
              const SizedBox(width: 20),
              Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xFF5856D6),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                _teamB!.name,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ComparisonRankingGraph(
            pointsA: _teamA!.rankingHistory ?? [],
            pointsB: _teamB!.rankingHistory ?? [],
            nameA: _teamA!.name,
            nameB: _teamB!.name,
            colorA: const Color(0xFFE65100),
            colorB: const Color(0xFF5856D6),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    return GlassContainer(
      borderRadius: 20,
      opacity: 0.1,
      padding: const EdgeInsets.all(24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildTeamHeader(_teamA!, true),
          Column(
            children: [
              Text('VS',
                  style: TextStyle(
                      color: Colors.grey.withValues(alpha: 0.2),
                      fontSize: 24,
                      fontWeight: FontWeight.bold)),
            ],
          ),
          _buildTeamHeader(_teamB!, false),
        ],
      ),
    );
  }

  Widget _buildTeamHeader(BasketballNationalTeam c, bool isLeft) {
    return Expanded(
      child: Column(
        crossAxisAlignment:
            isLeft ? CrossAxisAlignment.start : CrossAxisAlignment.end,
        children: [
          _Avatar(
              imageUrl: c.imageUrl,
              name: c.name,
              size: 80,
              accent: const Color(0xFFE65100)),
          const SizedBox(height: 12),
          Text(c.name,
              style: const TextStyle(
                  color: Color(0xFF1D1D1F),
                  fontSize: 18,
                  fontWeight: FontWeight.bold),
              textAlign: isLeft ? TextAlign.left : TextAlign.right),
          Text(
              '${c.category == 'women' ? "Women's Team" : "Men's Team"} • ${c.confederation ?? "N/A"}',
              style: const TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildStatsComparison() {
    final peakDateA = _teamA!.highestRankingDate != null
        ? DateFormat('MMM yyyy').format(_teamA!.highestRankingDate!)
        : '';
    final bestRankA = _teamA!.highestRanking != null
        ? '#${_teamA!.highestRanking}${peakDateA.isNotEmpty ? " ($peakDateA)" : ""}'
        : '#${_teamA!.ranking ?? "N/A"}';

    final peakDateB = _teamB!.highestRankingDate != null
        ? DateFormat('MMM yyyy').format(_teamB!.highestRankingDate!)
        : '';
    final bestRankB = _teamB!.highestRanking != null
        ? '#${_teamB!.highestRanking}${peakDateB.isNotEmpty ? " ($peakDateB)" : ""}'
        : '#${_teamB!.ranking ?? "N/A"}';

    return GlassContainer(
      borderRadius: 20,
      opacity: 0.1,
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const Text('CORE STATISTICS',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey,
                  fontSize: 12,
                  letterSpacing: 1.2)),
          const SizedBox(height: 20),
          _buildStatRow('FIBA Rank', '#${_teamA!.ranking ?? "N/A"}', '#${_teamB!.ranking ?? "N/A"}'),
          _buildStatRow('Best Rank', bestRankA, bestRankB),
          _buildStatRow('Total Trophies', '${_teamA!.totalTrophies}', '${_teamB!.totalTrophies}'),
          _buildStatRow('World Cup Titles', '${_teamA!.worldCupTitles}', '${_teamB!.worldCupTitles}'),
          _buildStatRow('Head Coach', _teamA!.manager ?? 'TBD', _teamB!.manager ?? 'TBD'),
          _buildStatRow('Captain', _teamA!.captain ?? 'TBD', _teamB!.captain ?? 'TBD'),
        ],
      ),
    );
  }

  Widget _buildStatRow(String label, String valA, String valB) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(valA,
                textAlign: TextAlign.left,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
          Text(label,
              style: const TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.w500)),
          Expanded(
            child: Text(valB,
                textAlign: TextAlign.right,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Padding(
      padding: const EdgeInsets.all(40.0),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.compare_arrows_rounded, size: 60, color: Colors.grey[300]),
            const SizedBox(height: 12),
            const Text(
              'Select two national teams above to compare their FIBA rankings and performance history.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  final String? imageUrl;
  final String name;
  final double size;
  final Color accent;

  const _Avatar({
    this.imageUrl,
    required this.name,
    required this.size,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: accent.withValues(alpha: 0.1),
        border: Border.all(color: accent.withValues(alpha: 0.3), width: 1.5),
      ),
      child: ClipOval(
        child: imageUrl != null
            ? Image.network(
                imageUrl!,
                fit: BoxFit.cover,
                alignment: Alignment.topCenter,
                errorBuilder: (_, __, ___) => _initials(name, size * 0.4),
              )
            : _initials(name, size * 0.4),
      ),
    );
  }

  Widget _initials(String name, double fontSize) {
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
          color: accent,
          fontWeight: FontWeight.bold,
          fontSize: fontSize,
        ),
      ),
    );
  }
}
