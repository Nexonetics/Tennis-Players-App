import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/player.dart';
import '../services/api_service.dart';
import '../widgets/glass_widgets.dart';
import '../widgets/ranking_graph.dart';

class PlayerCompareScreen extends StatefulWidget {
  final Player? playerA;
  const PlayerCompareScreen({super.key, this.playerA});

  @override
  State<PlayerCompareScreen> createState() => _PlayerCompareScreenState();
}

class _PlayerCompareScreenState extends State<PlayerCompareScreen>
    with TickerProviderStateMixin {
  Player? _playerA;
  Player? _playerB;

  bool _searchingA = false;
  bool _searchingB = false;
  bool _comparing = false;

  List<Player> _resultsA = [];
  List<Player> _resultsB = [];

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
    _playerA = widget.playerA;
    if (_playerA != null) {
      _ctrlA.text = _playerA!.name;
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
      if (isA)
        _searchingA = true;
      else
        _searchingB = true;
    });
    try {
      final res = await ApiService().searchPlayers(q, size: 5);
      setState(() {
        if (isA) {
          _resultsA = res.items.where((p) => p.id != _playerB?.id).toList();
          _noResultsA = _resultsA.isEmpty;
        } else {
          _resultsB = res.items.where((p) => p.id != _playerA?.id).toList();
          _noResultsB = _resultsB.isEmpty;
        }
      });
    } catch (e) {
      // Handle error
    } finally {
      setState(() {
        if (isA)
          _searchingA = false;
        else
          _searchingB = false;
      });
    }
  }

  void _selectA(Player p) {
    setState(() {
      _playerA = p;
      _resultsA = [];
      _noResultsA = false;
      _ctrlA.text = p.name;
      _showComparison = false;
    });
    FocusScope.of(context).unfocus();
  }

  void _selectB(Player p) {
    setState(() {
      _playerB = p;
      _resultsB = [];
      _noResultsB = false;
      _ctrlB.text = p.name;
      _showComparison = false;
    });
    FocusScope.of(context).unfocus();
  }

  Future<void> _compare() async {
    if (_playerA != null && _playerB != null) {
      setState(() {
        _comparing = true;
        _showComparison = false;
      });
      try {
        final detailedA = await ApiService().getPlayerDetail(_playerA!.id);
        final detailedB = await ApiService().getPlayerDetail(_playerB!.id);
        setState(() {
          _playerA = detailedA;
          _playerB = detailedB;
          _showComparison = true;
        });
        _fadeCtrl.forward(from: 0);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to fetch comparison details: $e')),
          );
        }
      } finally {
        if (mounted) {
          setState(() {
            _comparing = false;
          });
        }
      }
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
                      'Player Comparison',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                        color: Color(0xFF1D1D1F),
                      ),
                    ),
                    const SizedBox(height: 5),
                    const Text(
                      'Compare athletes side-by-side',
                      style: TextStyle(color: Colors.grey, fontSize: 16),
                    ),
                    const SizedBox(height: 20),
                    _buildSelectionArea(),
                    const SizedBox(height: 20),
                    if (_comparing)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 60),
                        child: Center(
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.indigo),
                          ),
                        ),
                      )
                    else if (_showComparison)
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
                child: _playerA != null
                    ? _buildSelectedCard(_playerA!, true)
                    : _buildSearchBox(_ctrlA, _onSearchA, true),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.04),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.black.withOpacity(0.06)),
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
                child: _playerB != null
                    ? _buildSelectedCard(_playerB!, false)
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
                gradient: (_playerA != null && _playerB != null)
                    ? const LinearGradient(
                        colors: [Colors.indigo, Colors.indigoAccent],
                      )
                    : null,
                color: (_playerA == null || _playerB == null)
                    ? Colors.black.withOpacity(0.05)
                    : null,
                boxShadow: (_playerA != null && _playerB != null)
                    ? [
                        BoxShadow(
                          color: Colors.indigo.withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        )
                      ]
                    : [],
              ),
              child: ElevatedButton(
                onPressed:
                    (_playerA != null && _playerB != null && !_comparing) ? _compare : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: (_playerA != null && _playerB != null)
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
                      'COMPARE ATHLETES',
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

  Widget _buildSelectedCard(Player p, bool isA) {
    final accentColor = isA ? Colors.indigo : Colors.pink;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accentColor.withOpacity(0.3), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: accentColor.withOpacity(0.05),
            blurRadius: 10,
            spreadRadius: 1,
          )
        ],
      ),
      child: Row(
        children: [
          _Avatar(
            imageUrl: p.imageUrl,
            name: p.name,
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
                  p.name,
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
                  p.country ?? 'Unknown',
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
                  _playerA = null;
                  _ctrlA.clear();
                  _resultsA = [];
                  _noResultsA = false;
                } else {
                  _playerB = null;
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
    final accentColor = isA ? Colors.indigo : Colors.pink;
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withOpacity(0.08)),
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
                hintText: isA ? 'Search Player 1' : 'Search Player 2',
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
        color: Colors.white.withOpacity(0.9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withOpacity(0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
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

  Widget _buildResultList(List<Player> results, Function(Player) onSelect) {
    return Container(
      margin: const EdgeInsets.only(top: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.95),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withOpacity(0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        children: results.map((p) {
          final isLast = results.last == p;
          return Container(
            decoration: BoxDecoration(
              border: isLast
                  ? null
                  : Border(
                      bottom: BorderSide(
                        color: Colors.black.withOpacity(0.05),
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
                    top: results.first == p ? const Radius.circular(16) : Radius.zero,
                    bottom: isLast ? const Radius.circular(16) : Radius.zero,
                  ),
                ),
                hoverColor: Colors.black.withOpacity(0.03),
                leading: _Avatar(
                  imageUrl: p.imageUrl,
                  name: p.name,
                  size: 32,
                  accent: Colors.indigo,
                ),
                title: Text(
                  p.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF1D1D1F),
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                subtitle: Text(
                  p.country ?? 'Unknown',
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
                    color: Colors.indigo.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    (p.ranking == null || p.ranking! >= 9999) ? 'Unranked' : '#${p.ranking}',
                    style: const TextStyle(
                      color: Colors.indigo,
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
                ),
                onTap: () => onSelect(p),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTimelineComparison(Player a, Player b) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('RANKING TIMELINE COMPARISON',
            style: TextStyle(
                color: Color(0xFF1D1D1F),
                fontWeight: FontWeight.bold,
                letterSpacing: 1)),
        const SizedBox(height: 12),
        GlassContainer(
          borderRadius: 20,
          opacity: 0.1,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFF0F9D58),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    a.name,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(width: 24),
                  Container(
                    width: 12,
                    height: 12,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFF5856D6),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    b.name,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ComparisonRankingGraph(
                pointsA: a.rankingHistory ?? [],
                pointsB: b.rankingHistory ?? [],
                nameA: a.name,
                nameB: b.name,
                colorA: const Color(0xFF0F9D58),
                colorB: const Color(0xFF5856D6),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildComparisonResults() {
    final a = _playerA!;
    final b = _playerB!;

    return FadeTransition(
      opacity: _fadeAnim,
      child: Column(
        children: [
          _buildSummaryCard(a, b),
          const SizedBox(height: 20),
          _buildTimelineComparison(a, b),
          const SizedBox(height: 20),
          _buildStatsSummary(a, b),
          const SizedBox(height: 20),
          _buildOverallEdge(a, b),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(Player a, Player b) {
    return GlassContainer(
      borderRadius: 20,
      opacity: 0.1,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildPlayerProfile(a, true),
              Column(
                children: [
                  Text('VS',
                      style: TextStyle(
                          color: Colors.grey.withOpacity(0.2),
                          fontSize: 24,
                          fontWeight: FontWeight.bold)),
                ],
              ),
              _buildPlayerProfile(b, false),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHighlightBadge({
    required IconData icon,
    required String text,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.15), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              text,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlayerProfile(Player p, bool isLeft) {
    final accentColor = isLeft ? Colors.indigo : Colors.pink;
    return Expanded(
      child: Column(
        crossAxisAlignment:
            isLeft ? CrossAxisAlignment.start : CrossAxisAlignment.end,
        children: [
          _Avatar(
              imageUrl: p.imageUrl,
              name: p.name,
              size: 70,
              accent: accentColor),
          const SizedBox(height: 12),
          Text(p.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: Color(0xFF1D1D1F),
                  fontSize: 15,
                  fontWeight: FontWeight.bold),
              textAlign: isLeft ? TextAlign.left : TextAlign.right),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            alignment: isLeft ? WrapAlignment.start : WrapAlignment.end,
            children: [
              if (p.country != null)
                _buildHighlightBadge(
                  icon: Icons.public,
                  text: p.country!,
                  color: accentColor,
                ),
              if (p.age != null)
                _buildHighlightBadge(
                  icon: Icons.cake_rounded,
                  text: '${p.age} yrs${p.birthYear != null ? " (${p.birthYear})" : ""}',
                  color: accentColor,
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text('Rank ${p.ranking ?? "N/A"}',
              style: TextStyle(
                  color: accentColor,
                  fontSize: 13,
                  fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildStatsSummary(Player a, Player b) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('STATS SUMMARY',
            style: TextStyle(
                color: Color(0xFF1D1D1F),
                fontWeight: FontWeight.bold,
                letterSpacing: 1)),
        const SizedBox(height: 12),
        GlassContainer(
          borderRadius: 16,
          opacity: 0.1,
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              _buildStatRow('Age / Birth Year',
                  a.age != null ? '${a.age} Yrs${a.birthYear != null ? " (${a.birthYear})" : ""}' : 'N/A',
                  b.age != null ? '${b.age} Yrs${b.birthYear != null ? " (${b.birthYear})" : ""}' : 'N/A',
                  lowerIsBetter: false, isNumeric: false, highlight: true),
              _buildStatRow('Country', a.country ?? 'N/A', b.country ?? 'N/A',
                  isNumeric: false, highlight: true),
              _buildStatRow('Current Rank', (a.ranking == null || a.ranking! >= 9999) ? 'Unranked' : '#${a.ranking}',
                  (b.ranking == null || b.ranking! >= 9999) ? 'Unranked' : '#${b.ranking}',
                  lowerIsBetter: true),
              _buildStatRow(
                  'Highest Rank',
                  ((a.highestRanking ?? a.careerHighRank) != null && (a.highestRanking ?? a.careerHighRank)! < 9999)
                      ? '#${a.highestRanking ?? a.careerHighRank}${(a.highestRankingDate ?? a.careerHighDate) != null ? " (${DateFormat('MMM yyyy').format((a.highestRankingDate ?? a.careerHighDate)!)})" : ""}'
                      : 'Unranked',
                  ((b.highestRanking ?? b.careerHighRank) != null && (b.highestRanking ?? b.careerHighRank)! < 9999)
                      ? '#${b.highestRanking ?? b.careerHighRank}${(b.highestRankingDate ?? b.careerHighDate) != null ? " (${DateFormat('MMM yyyy').format((b.highestRankingDate ?? b.careerHighDate)!)})" : ""}'
                      : 'Unranked',
                  lowerIsBetter: true),
              _buildStatRow(
                  'Prize Money', a.prizeMoney ?? 'N/A', b.prizeMoney ?? 'N/A',
                  isNumeric: false),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatRow(String label, String aVal, String bVal,
      {bool lowerIsBetter = false, bool isNumeric = true, bool highlight = false}) {
    bool aWins = false;
    bool bWins = false;

    if (isNumeric) {
      final matchA = RegExp(r'#?(\d+)').firstMatch(aVal);
      final matchB = RegExp(r'#?(\d+)').firstMatch(bVal);
      num? nvA = matchA != null ? num.tryParse(matchA.group(1)!) : num.tryParse(aVal.replaceAll(RegExp(r'[^0-9.]'), ''));
      num? nvB = matchB != null ? num.tryParse(matchB.group(1)!) : num.tryParse(bVal.replaceAll(RegExp(r'[^0-9.]'), ''));

      if (nvA != null && nvB != null) {
        if (lowerIsBetter) {
          aWins = nvA < nvB;
          bWins = nvB < nvA;
        } else {
          aWins = nvA > nvB;
          bWins = nvB > nvA;
        }
      }
    }

    final rowWidget = Padding(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(aVal,
                textAlign: TextAlign.start,
                style: TextStyle(
                    color: aWins ? Colors.indigo : Colors.black87,
                    fontWeight: (aWins || highlight) ? FontWeight.bold : FontWeight.normal)),
          ),
          Expanded(
            child: Text(label,
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: highlight ? Colors.indigo.withOpacity(0.8) : Colors.grey,
                    fontWeight: highlight ? FontWeight.bold : FontWeight.normal,
                    fontSize: 12)),
          ),
          Expanded(
            child: Text(bVal,
                textAlign: TextAlign.end,
                style: TextStyle(
                    color: bWins ? Colors.pink : Colors.black87,
                    fontWeight: (bWins || highlight) ? FontWeight.bold : FontWeight.normal)),
          ),
        ],
      ),
    );

    if (highlight) {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: Colors.indigo.withOpacity(0.06),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.indigo.withOpacity(0.12), width: 1),
        ),
        child: rowWidget,
      );
    }

    return rowWidget;
  }

  Widget _buildOverallEdge(Player a, Player b) {
    int aScore = 0, bScore = 0;
    void check(num? aV, num? bV, {bool lowerBetter = false}) {
      if (aV == null || bV == null) return;
      if (lowerBetter) {
        if (aV < bV) aScore++;
        if (bV < aV) bScore++;
      } else {
        if (aV > bV) aScore++;
        if (bV > aV) bScore++;
      }
    }

    check(a.ranking, b.ranking, lowerBetter: true);
    check(a.highestRanking, b.highestRanking, lowerBetter: true);

    final pctA = (a.wins + a.losses) > 0 ? (a.wins / (a.wins + a.losses)) : 0;
    final pctB = (b.wins + b.losses) > 0 ? (b.wins / (b.wins + b.losses)) : 0;
    check(pctA, pctB);
    check(a.wins, b.wins);

    String winnerName = aScore > bScore
        ? a.name
        : bScore > aScore
            ? b.name
            : "Even Match!";
    Color winnerColor = aScore > bScore
        ? Colors.indigo
        : bScore > aScore
            ? Colors.pink
            : Colors.grey;

    return GlassContainer(
      borderRadius: 16,
      opacity: 0.1,
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Icon(Icons.emoji_events, color: winnerColor, size: 40),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('OVERALL EDGE',
                    style: TextStyle(color: Colors.grey, fontSize: 10)),
                Text(winnerName,
                    style: TextStyle(
                        color: winnerColor,
                        fontSize: 20,
                        fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          Text('$aScore - $bScore',
              style: const TextStyle(
                  color: Color(0xFF1D1D1F),
                  fontSize: 24,
                  fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      height: 300,
      alignment: Alignment.center,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.compare_arrows,
              color: Colors.grey.withOpacity(0.3), size: 100),
          const SizedBox(height: 20),
          Text(
              'Select two players and press COMPARE\nto see the player comparison analysis',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.withOpacity(0.5))),
        ],
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  final String? imageUrl;
  final String name;
  final double size;
  final Color accent;
  const _Avatar(
      {required this.imageUrl,
      required this.name,
      required this.size,
      required this.accent});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: accent.withOpacity(0.3), width: 2),
        color: accent.withOpacity(0.1),
      ),
      child: ClipOval(
        child: imageUrl != null
            ? Image.network(
                imageUrl!,
                fit: BoxFit.cover,
                alignment: Alignment.topCenter,
                errorBuilder: (_, __, ___) => _initials(),
              )
            : _initials(),
      ),
    );
  }

  Widget _initials() {
    final parts = name.trim().split(' ');
    final text = parts.length >= 2
        ? '${parts[0][0]}${parts[1][0]}'
        : name.isNotEmpty
            ? name[0]
            : '?';
    return Center(
        child: Text(text.toUpperCase(),
            style: TextStyle(
                color: accent,
                fontWeight: FontWeight.bold,
                fontSize: size * 0.4)));
  }
}
