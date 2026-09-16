import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/basketball_club.dart';
import '../services/api_service.dart';
import '../widgets/glass_widgets.dart';

class BasketballClubCompareScreen extends StatefulWidget {
  final BasketballClub? clubA;
  const BasketballClubCompareScreen({super.key, this.clubA});

  @override
  State<BasketballClubCompareScreen> createState() =>
      _BasketballClubCompareScreenState();
}

class _BasketballClubCompareScreenState
    extends State<BasketballClubCompareScreen> with TickerProviderStateMixin {
  BasketballClub? _clubA;
  BasketballClub? _clubB;

  bool _searchingA = false;
  bool _searchingB = false;

  List<BasketballClub> _resultsA = [];
  List<BasketballClub> _resultsB = [];

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
    _clubA = widget.clubA;
    if (_clubA != null) {
      _ctrlA.text = _clubA!.name;
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
      final res = await ApiService().searchBasketballClubs(q, size: 5);
      setState(() {
        if (isA) {
          _resultsA = res.items.where((c) => c.id != _clubB?.id).toList();
          _noResultsA = _resultsA.isEmpty;
        } else {
          _resultsB = res.items.where((c) => c.id != _clubA?.id).toList();
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

  void _selectA(BasketballClub c) {
    setState(() {
      _clubA = c;
      _resultsA = [];
      _noResultsA = false;
      _ctrlA.text = c.name;
      _showComparison = false;
    });
    FocusScope.of(context).unfocus();
  }

  void _selectB(BasketballClub c) {
    setState(() {
      _clubB = c;
      _resultsB = [];
      _noResultsB = false;
      _ctrlB.text = c.name;
      _showComparison = false;
    });
    FocusScope.of(context).unfocus();
  }

  void _compare() {
    if (_clubA != null && _clubB != null) {
      setState(() {
        _showComparison = true;
      });
      _fadeCtrl.forward(from: 0);
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
                      'Hoops Comparison',
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
                child: _clubA != null
                    ? _buildSelectedCard(_clubA!, true)
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
                child: _clubB != null
                    ? _buildSelectedCard(_clubB!, false)
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
                gradient: (_clubA != null && _clubB != null)
                    ? const LinearGradient(
                        colors: [Color(0xFFFF9900), Color(0xFFFF5500)],
                      )
                    : null,
                color: (_clubA == null || _clubB == null)
                    ? Colors.black.withOpacity(0.05)
                    : null,
                boxShadow: (_clubA != null && _clubB != null)
                    ? [
                        BoxShadow(
                          color: const Color(0xFFFF9900).withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        )
                      ]
                    : [],
              ),
              child: ElevatedButton(
                onPressed:
                    (_clubA != null && _clubB != null) ? _compare : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: (_clubA != null && _clubB != null)
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
                      'COMPARE CLUBS',
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

  Widget _buildSelectedCard(BasketballClub c, bool isA) {
    final accentColor = isA ? const Color(0xFFFF9900) : const Color(0xFFFF5500);
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
            imageUrl: c.imageUrl,
            name: c.name,
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
                  c.name,
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
                  c.league ?? 'Unknown',
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
                  _clubA = null;
                  _ctrlA.clear();
                  _resultsA = [];
                  _noResultsA = false;
                } else {
                  _clubB = null;
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
    final accentColor = isA ? const Color(0xFFFF9900) : const Color(0xFFFF5500);
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
                hintText: isA ? 'Search Club 1' : 'Search Club 2',
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

  Widget _buildResultList(List<BasketballClub> results, Function(BasketballClub) onSelect) {
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
        children: results.map((c) {
          final isLast = results.last == c;
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
                    top: results.first == c ? const Radius.circular(16) : Radius.zero,
                    bottom: isLast ? const Radius.circular(16) : Radius.zero,
                  ),
                ),
                hoverColor: Colors.black.withOpacity(0.03),
                leading: _Avatar(
                  imageUrl: c.imageUrl,
                  name: c.name,
                  size: 32,
                  accent: const Color(0xFFFF9900),
                ),
                title: Text(
                  c.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF1D1D1F),
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                subtitle: Text(
                  c.league ?? 'Unknown',
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
                    color: const Color(0xFFFF9900).withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '#${c.ranking ?? "N/A"}',
                    style: const TextStyle(
                      color: Color(0xFFFF9900),
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
                ),
                onTap: () => onSelect(c),
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
          _buildStatsComparison(),
          const SizedBox(height: 20),
          _buildExtraInfo(),
          const SizedBox(height: 40),
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
          _buildClubHeader(_clubA!, true),
          Column(
            children: [
              Text('VS',
                  style: TextStyle(
                      color: Colors.grey.withOpacity(0.2),
                      fontSize: 24,
                      fontWeight: FontWeight.bold)),
            ],
          ),
          _buildClubHeader(_clubB!, false),
        ],
      ),
    );
  }

  Widget _buildClubHeader(BasketballClub c, bool isLeft) {
    return Expanded(
      child: Column(
        crossAxisAlignment:
            isLeft ? CrossAxisAlignment.start : CrossAxisAlignment.end,
        children: [
          _Avatar(
              imageUrl: c.imageUrl,
              name: c.name,
              size: 80,
              accent: Colors.orange),
          const SizedBox(height: 12),
          Text(c.name,
              style: const TextStyle(
                  color: Color(0xFF1D1D1F),
                  fontSize: 18,
                  fontWeight: FontWeight.bold),
              textAlign: isLeft ? TextAlign.left : TextAlign.right),
          Text(c.city ?? c.country ?? "N/A",
              style: const TextStyle(color: Colors.grey)),
          Text(c.league ?? "N/A",
              style: const TextStyle(
                  color: Colors.orange,
                  fontSize: 12,
                  fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildStatsComparison() {
    final peakDateA = _clubA!.highestRankingDate != null
        ? DateFormat('MMM yyyy').format(_clubA!.highestRankingDate!)
        : '';
    final bestRankA = _clubA!.highestRanking != null
        ? '#${_clubA!.highestRanking}${peakDateA.isNotEmpty ? " ($peakDateA)" : ""}'
        : '#${_clubA!.ranking ?? "N/A"}';

    final peakDateB = _clubB!.highestRankingDate != null
        ? DateFormat('MMM yyyy').format(_clubB!.highestRankingDate!)
        : '';
    final bestRankB = _clubB!.highestRanking != null
        ? '#${_clubB!.highestRanking}${peakDateB.isNotEmpty ? " ($peakDateB)" : ""}'
        : '#${_clubB!.ranking ?? "N/A"}';

    return GlassContainer(
      borderRadius: 20,
      opacity: 0.1,
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const Text('COURT STATISTICS',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey,
                  fontSize: 12,
                  letterSpacing: 1.2)),
          const SizedBox(height: 20),
          _buildStatRow(
              'World Rank', '#${_clubA!.ranking}', '#${_clubB!.ranking}',
              isLowerBetter: true),
          _buildStatRow('Best Rank', bestRankA, bestRankB,
              isLowerBetter: true),
          _buildStatRow('Titles', '${_clubA!.titles}', '${_clubB!.titles}'),
          _buildStatRow('Playoff App', '${_clubA!.playoffAppearances}',
              '${_clubB!.playoffAppearances}'),
          _buildStatRow('Arena Capacity', _formatNum(_clubA!.capacity),
              _formatNum(_clubB!.capacity)),
          _buildStatRow('Market Value', _clubA!.marketValue ?? 'TBD',
              _clubB!.marketValue ?? 'TBD',
              isNumeric: false),
          _buildStatRow(
              'Founded', '${_clubA!.foundedYear}', '${_clubB!.foundedYear}',
              isNumeric: false),
        ],
      ),
    );
  }

  Widget _buildStatRow(String label, String aVal, String bVal,
      {bool isLowerBetter = false, bool isNumeric = true}) {
    bool aWins = false;
    bool bWins = false;

    if (isNumeric) {
      num? nvA = num.tryParse(aVal.replaceAll(RegExp(r'[^0-9.]'), ''));
      num? nvB = num.tryParse(bVal.replaceAll(RegExp(r'[^0-9.]'), ''));

      if (nvA != null && nvB != null) {
        if (isLowerBetter) {
          aWins = nvA < nvB;
          bWins = nvB < nvA;
        } else {
          aWins = nvA > nvB;
          bWins = nvB > nvA;
        }
      }
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(aVal,
                    style: TextStyle(
                        fontWeight: aWins ? FontWeight.bold : FontWeight.normal,
                        color: aWins ? Colors.orange : Colors.black87,
                        fontSize: 16)),
              ),
              Expanded(
                child: Text(label,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        color: Colors.grey,
                        fontSize: 12,
                        fontWeight: FontWeight.w500)),
              ),
              Expanded(
                child: Text(bVal,
                    textAlign: TextAlign.right,
                    style: TextStyle(
                        fontWeight: bWins ? FontWeight.bold : FontWeight.normal,
                        color: bWins ? Colors.orange : Colors.black87,
                        fontSize: 16)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _buildComparisonBar(aVal, bVal, isLowerBetter),
        ],
      ),
    );
  }

  Widget _buildComparisonBar(String aVal, String bVal, bool isLowerBetter) {
    num? nvA = num.tryParse(aVal.replaceAll(RegExp(r'[^0-9.]'), ''));
    num? nvB = num.tryParse(bVal.replaceAll(RegExp(r'[^0-9.]'), ''));

    if (nvA == null || nvB == null || (nvA == 0 && nvB == 0)) {
      return Container(
          height: 4,
          decoration: BoxDecoration(
              color: Colors.black12, borderRadius: BorderRadius.circular(2)));
    }

    double total = nvA.toDouble() + nvB.toDouble();
    double ratioA = nvA / total;

    if (isLowerBetter) {
      ratioA = 1 - ratioA;
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(2),
      child: Row(
        children: [
          Expanded(
              flex: (ratioA * 100).toInt(),
              child: Container(height: 4, color: Colors.orange)),
          Expanded(
              flex: ((1 - ratioA) * 100).toInt(),
              child: Container(height: 4, color: Colors.black12)),
        ],
      ),
    );
  }

  Widget _buildExtraInfo() {
    return Column(
      children: [
        _buildInfoCard('Head Coach', _clubA!.headCoach, _clubB!.headCoach,
            Icons.sports_rounded),
        const SizedBox(height: 16),
        _buildInfoCard('Star Player', _clubA!.starPlayer, _clubB!.starPlayer,
            Icons.star_rounded),
      ],
    );
  }

  Widget _buildInfoCard(String label, String? a, String? b, IconData icon) {
    return GlassContainer(
      borderRadius: 20,
      opacity: 0.1,
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Icon(icon, color: Colors.orange, size: 24),
          const SizedBox(height: 8),
          Text(label,
              style: const TextStyle(
                  fontSize: 10,
                  color: Colors.grey,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Text(a ?? 'TBD',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              textAlign: TextAlign.center),
          const Divider(height: 20),
          Text(b ?? 'TBD',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              textAlign: TextAlign.center),
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
              'Select two clubs and press COMPARE\nto see the side-by-side analysis',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.withOpacity(0.5))),
        ],
      ),
    );
  }

  String _formatNum(int? num) {
    if (num == null) return '0';
    return num.toString();
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
            ? CachedNetworkImage(
                imageUrl: imageUrl!,
                fit: BoxFit.cover,
                alignment: Alignment.topCenter,
                placeholder: (context, url) =>
                    Container(color: Colors.grey[200]),
                errorWidget: (_, __, ___) => _initials(),
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
