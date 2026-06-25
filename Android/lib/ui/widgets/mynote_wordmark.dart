import 'package:flutter/material.dart';

class MyNoteWordmark extends StatelessWidget {
  const MyNoteWordmark({
    super.key,
    this.fontSize = 28,
    this.align = TextAlign.center,
  });

  final double fontSize;
  final TextAlign align;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'MyNote',
      child: ExcludeSemantics(
        child: RichText(
          textAlign: align,
          text: TextSpan(
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w900,
              height: 1,
              letterSpacing: 0,
            ),
            children: const [
              TextSpan(
                text: 'My',
                style: TextStyle(color: Color(0xFF4F7CFF)),
              ),
              TextSpan(
                text: 'Note',
                style: TextStyle(color: Color(0xFF111827)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
