import 'package:flutter/material.dart';
import 'dart:ui' as ui;
import 'dart:math' as math;
import 'package:intl/intl.dart';

class RankingPoint {
  final int ranking;
  final DateTime date;

  RankingPoint({required this.ranking, required this.date});
}

class RankingGraph extends StatelessWidget {
  final List<RankingPoint> points;
  final Color color;

  const RankingGraph({
    super.key,
    required this.points,
    this.color = Colors.indigo,
  });

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) return const SizedBox.shrink();

    final sortedPoints = List<RankingPoint>.from(points)
      ..sort((a, b) => a.date.compareTo(b.date));

    return Container(
      height: 200,
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(10, 20, 10, 40),
      child: CustomPaint(painter: _GraphPainter(sortedPoints, color)),
    );
  }
}

class _GraphPainter extends CustomPainter {
  final List<RankingPoint> points;
  final Color color;

  _GraphPainter(this.points, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;

    final paint = Paint()
      ..color = color.withOpacity(0.8)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [color.withOpacity(0.3), color.withOpacity(0.0)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final textPainter = TextPainter(
      textDirection: ui.TextDirection.ltr,
      textAlign: TextAlign.center,
    );

    final rankings = points.map((p) => p.ranking.toDouble()).toList();
    final minRank = rankings.reduce(math.min);
    final maxRank = rankings.reduce(math.max);
    final range = (maxRank - minRank).clamp(1.0, double.infinity);

    final path = Path();
    final fillPath = Path();

    if (points.length == 1) {
      double x = size.width / 2;
      double y = size.height / 2;

      final dotPaint = Paint()..color = color;
      final dotBgPaint = Paint()..color = Colors.white;
      canvas.drawCircle(Offset(x, y), 5, dotBgPaint);
      canvas.drawCircle(Offset(x, y), 3, dotPaint);

      textPainter.text = TextSpan(
        text: '#${points[0].ranking}',
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(x - (textPainter.width / 2), y - 20));

      textPainter.text = TextSpan(
        text: DateFormat("MMM ''yy").format(points[0].date),
        style: const TextStyle(color: Colors.grey, fontSize: 9, fontWeight: FontWeight.w500),
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(x - (textPainter.width / 2), size.height + 10));
      return;
    }

    double xStep = size.width / (points.length - 1);

    for (int i = 0; i < points.length; i++) {
      double normalized = 1.0 - ((points[i].ranking - minRank) / range);
      double x = i * xStep;
      double y = size.height * (1.0 - (normalized * 0.7 + 0.15));

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }

      if (i == points.length - 1) {
        fillPath.lineTo(x, size.height);
        fillPath.close();
      }
    }

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, paint);

    final dotPaint = Paint()..color = color;
    final dotBgPaint = Paint()..color = Colors.white;
    
    int labelStep = (points.length / 6).clamp(1, double.infinity).toInt();
    int dotStep = points.length > 50 ? (points.length / 50).clamp(1, double.infinity).toInt() : 1;

    for (int i = 0; i < points.length; i += dotStep) {
      double normalized = 1.0 - ((points[i].ranking - minRank) / range);
      double x = i * xStep;
      double y = size.height * (1.0 - (normalized * 0.7 + 0.15));

      canvas.drawCircle(Offset(x, y), 3.5, dotBgPaint);
      canvas.drawCircle(Offset(x, y), 2, dotPaint);
    }
    
    if (points.length > 1 && (points.length - 1) % dotStep != 0) {
      int lastI = points.length - 1;
      double normalized = 1.0 - ((points[lastI].ranking - minRank) / range);
      double x = lastI * xStep;
      double y = size.height * (1.0 - (normalized * 0.7 + 0.15));
      canvas.drawCircle(Offset(x, y), 3.5, dotBgPaint);
      canvas.drawCircle(Offset(x, y), 2, dotPaint);
    }

    for (int i = 0; i < points.length; i += labelStep) {
      double normalized = 1.0 - ((points[i].ranking - minRank) / range);
      double x = i * xStep;
      double y = size.height * (1.0 - (normalized * 0.7 + 0.15));

      canvas.drawCircle(Offset(x, y), 5, dotBgPaint);
      canvas.drawCircle(Offset(x, y), 3, dotPaint);

      textPainter.text = TextSpan(
        text: '#${points[i].ranking}',
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(x - (textPainter.width / 2), y - 20));

      textPainter.text = TextSpan(
        text: DateFormat("MMM ''yy").format(points[i].date),
        style: const TextStyle(color: Colors.grey, fontSize: 9, fontWeight: FontWeight.w500),
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(x - (textPainter.width / 2), size.height + 10));
    }

    if ((points.length - 1) % labelStep != 0) {
      int i = points.length - 1;
      double normalized = 1.0 - ((points[i].ranking - minRank) / range);
      double x = i * xStep;
      double y = size.height * (1.0 - (normalized * 0.7 + 0.15));
      
      canvas.drawCircle(Offset(x, y), 5, dotBgPaint);
      canvas.drawCircle(Offset(x, y), 3, dotPaint);

      textPainter.text = TextSpan(
        text: '#${points[i].ranking}',
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(x - (textPainter.width / 2), y - 20));

      textPainter.text = TextSpan(
        text: DateFormat("MMM ''yy").format(points[i].date),
        style: const TextStyle(color: Colors.grey, fontSize: 9, fontWeight: FontWeight.w500),
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(x - (textPainter.width / 2), size.height + 10));
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class ComparisonRankingGraph extends StatelessWidget {
  final List<RankingPoint> pointsA;
  final List<RankingPoint> pointsB;
  final String nameA;
  final String nameB;
  final Color colorA;
  final Color colorB;

  const ComparisonRankingGraph({
    super.key,
    required this.pointsA,
    required this.pointsB,
    required this.nameA,
    required this.nameB,
    this.colorA = const Color(0xFF0F9D58),
    this.colorB = const Color(0xFF5856D6),
  });

  @override
  Widget build(BuildContext context) {
    if (pointsA.isEmpty && pointsB.isEmpty) {
      return Container(
        height: 200,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: Colors.grey.withOpacity(0.1),
            width: 1,
          ),
        ),
        child: const Center(
          child: Text(
            'No ranking history available for comparison',
            style: TextStyle(color: Colors.grey, fontSize: 13),
          ),
        ),
      );
    }

    final sortedA = List<RankingPoint>.from(pointsA)..sort((a, b) => a.date.compareTo(b.date));
    final sortedB = List<RankingPoint>.from(pointsB)..sort((a, b) => a.date.compareTo(b.date));

    return Container(
      height: 220,
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(15, 25, 15, 45),
      child: CustomPaint(
        painter: _ComparisonGraphPainter(
          nameA,
          nameB,
          sortedA,
          sortedB,
          colorA,
          colorB,
        ),
      ),
    );
  }
}

class _ComparisonGraphPainter extends CustomPainter {
  final String nameA;
  final String nameB;
  final List<RankingPoint> pointsA;
  final List<RankingPoint> pointsB;
  final Color colorA;
  final Color colorB;

  _ComparisonGraphPainter(
    this.nameA,
    this.nameB,
    this.pointsA,
    this.pointsB,
    this.colorA,
    this.colorB,
  );

  @override
  void paint(Canvas canvas, Size size) {
    final allDates = [
      ...pointsA.map((p) => p.date),
      ...pointsB.map((p) => p.date),
    ];
    if (allDates.isEmpty) return;

    allDates.sort();
    final minDate = allDates.first;
    final maxDate = allDates.last;
    final timeSpanDays = maxDate.difference(minDate).inDays.clamp(1, 9999999);

    final allRanks = [
      ...pointsA.map((p) => p.ranking.toDouble()),
      ...pointsB.map((p) => p.ranking.toDouble()),
    ];

    final minRank = allRanks.isNotEmpty ? allRanks.reduce(math.min) : 1.0;
    final maxRank = allRanks.isNotEmpty ? allRanks.reduce(math.max) : 100.0;
    final rankRange = (maxRank - minRank).clamp(1.0, double.infinity);

    final textPainter = TextPainter(
      textDirection: ui.TextDirection.ltr,
      textAlign: TextAlign.center,
    );

    Offset getCoord(RankingPoint pt) {
      final daysFromStart = pt.date.difference(minDate).inDays;
      final double x = (daysFromStart / timeSpanDays) * size.width;
      final double normalizedRank = 1.0 - ((pt.ranking - minRank) / rankRange);
      final double y = size.height * (1.0 - (normalizedRank * 0.7 + 0.15));
      return Offset(x, y);
    }

    if (pointsA.isNotEmpty) {
      _drawPlayerLine(canvas, size, pointsA, colorA, getCoord);
    }

    if (pointsB.isNotEmpty) {
      _drawPlayerLine(canvas, size, pointsB, colorB, getCoord);
    }

    final labelCount = 4;
    for (int i = 0; i < labelCount; i++) {
      final double fraction = i / (labelCount - 1);
      final daysOffset = (fraction * timeSpanDays).round();
      final labelDate = minDate.add(Duration(days: daysOffset));
      final double x = fraction * size.width;

      textPainter.text = TextSpan(
        text: DateFormat('yy/MM').format(labelDate),
        style: const TextStyle(color: Colors.grey, fontSize: 9),
      );
      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(x - (textPainter.width / 2), size.height + 12),
      );
    }
  }

  void _drawPlayerLine(
    Canvas canvas,
    Size size,
    List<RankingPoint> points,
    Color color,
    Offset Function(RankingPoint) getCoord,
  ) {
    final paint = Paint()
      ..color = color.withOpacity(0.85)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [color.withOpacity(0.18), color.withOpacity(0.0)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final path = Path();
    final fillPath = Path();

    final coords = points.map(getCoord).toList();

    for (int i = 0; i < coords.length; i++) {
      final c = coords[i];
      if (i == 0) {
        path.moveTo(c.dx, c.dy);
        fillPath.moveTo(c.dx, size.height);
        fillPath.lineTo(c.dx, c.dy);
      } else {
        path.lineTo(c.dx, c.dy);
        fillPath.lineTo(c.dx, c.dy);
      }

      if (i == coords.length - 1) {
        fillPath.lineTo(c.dx, size.height);
        fillPath.close();
      }
    }

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, paint);

    final dotPaint = Paint()..color = color;
    final dotBgPaint = Paint()..color = Colors.white;
    
    int dotStep = (coords.length / 6).clamp(1, double.infinity).toInt();
    for (int i = 0; i < coords.length; i += dotStep) {
      final c = coords[i];
      canvas.drawCircle(c, 4, dotBgPaint);
      canvas.drawCircle(c, 2.5, dotPaint);
      
      final textPainter = TextPainter(
        textDirection: ui.TextDirection.ltr,
        textAlign: TextAlign.center,
      );
      textPainter.text = TextSpan(
        text: '#${points[i].ranking}',
        style: TextStyle(
          color: color,
          fontSize: 8.5,
          fontWeight: FontWeight.bold,
        ),
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(c.dx - (textPainter.width / 2), c.dy - 14));
    }
    
    if (coords.isNotEmpty && (coords.length - 1) % dotStep != 0) {
      final lastIdx = coords.length - 1;
      final c = coords[lastIdx];
      canvas.drawCircle(c, 4, dotBgPaint);
      canvas.drawCircle(c, 2.5, dotPaint);

      final textPainter = TextPainter(
        textDirection: ui.TextDirection.ltr,
        textAlign: TextAlign.center,
      );
      textPainter.text = TextSpan(
        text: '#${points[lastIdx].ranking}',
        style: TextStyle(
          color: color,
          fontSize: 8.5,
          fontWeight: FontWeight.bold,
        ),
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(c.dx - (textPainter.width / 2), c.dy - 14));
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
