import 'package:flutter/material.dart';
import 'dart:async';
import '../models/basketball_national_team.dart';
import '../services/api_service.dart';

class BasketballNationalTeamProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<BasketballNationalTeam> _teams = [];
  List<BasketballNationalTeam> get teams => _teams;

  List<BasketballNationalTeam> _topTeams = [];
  List<BasketballNationalTeam> get topTeams => _topTeams;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isSearching = false;
  bool get isSearching => _isSearching;

  String? _error;
  String? get error => _error;

  String _selectedCategory = 'men';
  String get selectedCategory => _selectedCategory;

  Timer? _debounce;
  String _lastQuery = '';
  String get lastQuery => _lastQuery;

  int _currentPage = 1;
  int _topTeamsPage = 1;
  int _pageSize = 20;
  bool _hasMore = true;
  bool _hasMoreTopTeams = true;
  int _totalTeams = 0;
  int _totalTopTeams = 0;

  int get currentPage => _currentPage;
  int get topTeamsPage => _topTeamsPage;
  bool get hasMore => _hasMore;
  bool get hasMoreTopTeams => _hasMoreTopTeams;
  int get totalTeams => _totalTeams;
  int get totalTopTeams => _totalTopTeams;

  Future<void> fetchTopTeams() async {
    _isLoading = true;
    _error = null;
    _topTeamsPage = 1;
    _hasMoreTopTeams = true;
    notifyListeners();

    try {
      final response = await _apiService.getBasketballTopTeams(
          page: _topTeamsPage, size: _pageSize, category: _selectedCategory);
      _topTeams = response.items;
      _totalTopTeams = response.total;
      _hasMoreTopTeams = _topTeams.length < _totalTopTeams;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchMoreTopTeams() async {
    if (_isLoading || !_hasMoreTopTeams) return;

    _isLoading = true;
    notifyListeners();

    try {
      final nextPage = _topTeamsPage + 1;
      final response = await _apiService.getBasketballTopTeams(
        page: nextPage,
        size: _pageSize,
        category: _selectedCategory,
      );

      if (response.items.isNotEmpty) {
        _topTeams.addAll(response.items);
        _topTeamsPage = nextPage;
        _hasMoreTopTeams = _topTeams.length < _totalTopTeams;
      } else {
        _hasMoreTopTeams = false;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void setCategory(String category) {
    if (_selectedCategory == category) return;
    _selectedCategory = category;
    _teams = [];
    _currentPage = 1;
    _hasMore = true;
    notifyListeners();
    fetchTopTeams();
    if (_lastQuery.isNotEmpty) {
      searchTeams(_lastQuery);
    }
  }

  void onSearchChanged(String query) {
    _lastQuery = query;
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (query.isNotEmpty) {
        searchTeams(query);
      } else {
        _teams = [];
        _currentPage = 1;
        _hasMore = true;
        notifyListeners();
      }
    });
  }

  Future<void> searchTeams(String query) async {
    if (_isSearching) return;
    _isSearching = true;
    _error = null;
    _currentPage = 1;
    _hasMore = true;
    notifyListeners();

    try {
      final response = await _apiService.searchBasketballTeams(
        query,
        category: _selectedCategory,
        page: _currentPage,
        size: _pageSize,
      );
      _teams = response.items;
      _totalTeams = response.total;
      _hasMore = _teams.length < _totalTeams;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isSearching = false;
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchMoreTeams() async {
    if (_isLoading || !_hasMore || _lastQuery.isEmpty) return;

    _isLoading = true;
    notifyListeners();

    try {
      final nextPage = _currentPage + 1;
      final response = await _apiService.searchBasketballTeams(
        _lastQuery,
        category: _selectedCategory,
        page: nextPage,
        size: _pageSize,
      );

      if (response.items.isNotEmpty) {
        _teams.addAll(response.items);
        _currentPage = nextPage;
        _hasMore = _teams.length < _totalTeams;
      } else {
        _hasMore = false;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearSearch() {
    _teams = [];
    _lastQuery = '';
    notifyListeners();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }
}
