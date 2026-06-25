import 'package:flutter/material.dart';

SnackBar buildAppSnackBar(String message) {
  return SnackBar(
    content: Text(
      message,
      textAlign: TextAlign.center,
    ),
    duration: const Duration(milliseconds: 1400),
  );
}

void showAppSnackBar(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(buildAppSnackBar(message));
}
