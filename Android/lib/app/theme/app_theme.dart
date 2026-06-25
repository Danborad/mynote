import 'package:flutter/material.dart';

@immutable
class MyNotePalette extends ThemeExtension<MyNotePalette> {
  const MyNotePalette({
    required this.pageBackground,
    required this.panelBackground,
    required this.drawerBackground,
    required this.cardBackground,
    required this.cardBorder,
    required this.cardShadow,
    required this.primaryText,
    required this.secondaryText,
    required this.mutedText,
    required this.chipBackground,
    required this.selectedChipBackground,
    required this.selectedChipText,
    required this.noteGradientStart,
    required this.noteGradientEnd,
  });

  final Color pageBackground;
  final Color panelBackground;
  final Color drawerBackground;
  final Color cardBackground;
  final Color cardBorder;
  final Color cardShadow;
  final Color primaryText;
  final Color secondaryText;
  final Color mutedText;
  final Color chipBackground;
  final Color selectedChipBackground;
  final Color selectedChipText;
  final Color noteGradientStart;
  final Color noteGradientEnd;

  @override
  MyNotePalette copyWith({
    Color? pageBackground,
    Color? panelBackground,
    Color? drawerBackground,
    Color? cardBackground,
    Color? cardBorder,
    Color? cardShadow,
    Color? primaryText,
    Color? secondaryText,
    Color? mutedText,
    Color? chipBackground,
    Color? selectedChipBackground,
    Color? selectedChipText,
    Color? noteGradientStart,
    Color? noteGradientEnd,
  }) {
    return MyNotePalette(
      pageBackground: pageBackground ?? this.pageBackground,
      panelBackground: panelBackground ?? this.panelBackground,
      drawerBackground: drawerBackground ?? this.drawerBackground,
      cardBackground: cardBackground ?? this.cardBackground,
      cardBorder: cardBorder ?? this.cardBorder,
      cardShadow: cardShadow ?? this.cardShadow,
      primaryText: primaryText ?? this.primaryText,
      secondaryText: secondaryText ?? this.secondaryText,
      mutedText: mutedText ?? this.mutedText,
      chipBackground: chipBackground ?? this.chipBackground,
      selectedChipBackground:
          selectedChipBackground ?? this.selectedChipBackground,
      selectedChipText: selectedChipText ?? this.selectedChipText,
      noteGradientStart: noteGradientStart ?? this.noteGradientStart,
      noteGradientEnd: noteGradientEnd ?? this.noteGradientEnd,
    );
  }

  @override
  MyNotePalette lerp(ThemeExtension<MyNotePalette>? other, double t) {
    if (other is! MyNotePalette) return this;
    return MyNotePalette(
      pageBackground: Color.lerp(pageBackground, other.pageBackground, t)!,
      panelBackground: Color.lerp(panelBackground, other.panelBackground, t)!,
      drawerBackground:
          Color.lerp(drawerBackground, other.drawerBackground, t)!,
      cardBackground: Color.lerp(cardBackground, other.cardBackground, t)!,
      cardBorder: Color.lerp(cardBorder, other.cardBorder, t)!,
      cardShadow: Color.lerp(cardShadow, other.cardShadow, t)!,
      primaryText: Color.lerp(primaryText, other.primaryText, t)!,
      secondaryText: Color.lerp(secondaryText, other.secondaryText, t)!,
      mutedText: Color.lerp(mutedText, other.mutedText, t)!,
      chipBackground: Color.lerp(chipBackground, other.chipBackground, t)!,
      selectedChipBackground:
          Color.lerp(selectedChipBackground, other.selectedChipBackground, t)!,
      selectedChipText:
          Color.lerp(selectedChipText, other.selectedChipText, t)!,
      noteGradientStart:
          Color.lerp(noteGradientStart, other.noteGradientStart, t)!,
      noteGradientEnd: Color.lerp(noteGradientEnd, other.noteGradientEnd, t)!,
    );
  }
}

const _lightPalette = MyNotePalette(
  pageBackground: Color(0xFFF3F6FB),
  panelBackground: Colors.white,
  drawerBackground: Color(0xFFF7F8FA),
  cardBackground: Colors.white,
  cardBorder: Color(0xFFE2E8F0),
  cardShadow: Color(0x0F0F172A),
  primaryText: Color(0xFF0F172A),
  secondaryText: Color(0xFF475569),
  mutedText: Color(0xFF94A3B8),
  chipBackground: Color(0xFFF1F3F6),
  selectedChipBackground: Color(0xFF1157DB),
  selectedChipText: Colors.white,
  noteGradientStart: Color(0xFFFFFFFF),
  noteGradientEnd: Color(0xFFF8FAFC),
);

const _darkPalette = MyNotePalette(
  pageBackground: Color(0xFF0B1220),
  panelBackground: Color(0xFF111827),
  drawerBackground: Color(0xFF0F172A),
  cardBackground: Color(0xFF172033),
  cardBorder: Color(0xFF243041),
  cardShadow: Color(0x22000000),
  primaryText: Color(0xFFF8FAFC),
  secondaryText: Color(0xFFCBD5E1),
  mutedText: Color(0xFF94A3B8),
  chipBackground: Color(0xFF1E293B),
  selectedChipBackground: Color(0xFF2563EB),
  selectedChipText: Colors.white,
  noteGradientStart: Color(0xFF303A52),
  noteGradientEnd: Color(0xFF20283B),
);

const defaultLightPalette = _lightPalette;
const defaultDarkPalette = _darkPalette;

ThemeData buildMyNoteLightTheme() {
  const seed = Color(0xFF2563EB);
  final colorScheme = ColorScheme.fromSeed(
    seedColor: seed,
    brightness: Brightness.light,
    surface: const Color(0xFFF7F9FC),
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: const Color(0xFFF3F6FB),
    extensions: const [_lightPalette],
    cardTheme: const CardTheme(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(28)),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: Color(0xFFDCE5F1)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: Color(0xFFDCE5F1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: seed, width: 1.4),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: seed,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: seed.withOpacity(0.12),
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      width: 260,
      elevation: 0,
      backgroundColor: const Color(0xEE111827),
      contentTextStyle: const TextStyle(
        color: Colors.white,
        fontSize: 14,
        fontWeight: FontWeight.w600,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
      ),
      insetPadding: const EdgeInsets.fromLTRB(24, 0, 24, 18),
    ),
  );
}

ThemeData buildMyNoteDarkTheme() {
  const seed = Color(0xFF60A5FA);
  final colorScheme = ColorScheme.fromSeed(
    seedColor: seed,
    brightness: Brightness.dark,
    surface: const Color(0xFF0F172A),
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: const Color(0xFF0B1220),
    extensions: const [_darkPalette],
    cardTheme: const CardTheme(
      color: Color(0xFF111827),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(28)),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF111827),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: Color(0xFF263041)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: Color(0xFF263041)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: seed, width: 1.4),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: seed,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: const Color(0xFF111827),
      indicatorColor: seed.withOpacity(0.16),
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      width: 260,
      elevation: 0,
      backgroundColor: const Color(0xF2F8FAFC),
      contentTextStyle: const TextStyle(
        color: Color(0xFF0F172A),
        fontSize: 14,
        fontWeight: FontWeight.w700,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
      ),
      insetPadding: const EdgeInsets.fromLTRB(24, 0, 24, 18),
    ),
  );
}
