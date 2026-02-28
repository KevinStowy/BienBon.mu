---
name: create-flutter-animation
description: Crée une animation/transition Flutter (hero, slide, fade, scale, staggered)
argument-hint: <AnimationType> [hero|slide|fade|scale|staggered]
---

# Create Flutter Animation

Crée une animation de type `$ARGUMENTS`.

## Hero Animation

```dart
// Source
Hero(
  tag: 'basket-${basket.id}',
  child: BasketImage(url: basket.imageUrl),
)

// Destination
Hero(
  tag: 'basket-${basket.id}',
  child: BasketImage(url: basket.imageUrl, size: Size.large),
)
```

## Slide Transition (page)

```dart
GoRoute(
  path: '/detail',
  pageBuilder: (context, state) => CustomTransitionPage(
    child: DetailScreen(),
    transitionsBuilder: (context, animation, secondaryAnimation, child) =>
        SlideTransition(
          position: Tween(begin: const Offset(1, 0), end: Offset.zero)
              .animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic)),
          child: child,
        ),
    transitionDuration: const Duration(milliseconds: 300),
  ),
),
```

## Fade Transition (widget)

```dart
AnimatedOpacity(
  opacity: _isVisible ? 1.0 : 0.0,
  duration: const Duration(milliseconds: 200),
  child: child,
)
```

## Scale Animation

```dart
AnimatedScale(
  scale: _isPressed ? 0.95 : 1.0,
  duration: const Duration(milliseconds: 100),
  child: child,
)
```

## Staggered Animation (liste)

```dart
class StaggeredListItem extends StatelessWidget {
  final int index;
  final Animation<double> animation;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: Tween(begin: const Offset(0, 0.3), end: Offset.zero).animate(
        CurvedAnimation(
          parent: animation,
          curve: Interval(index * 0.1, 1.0, curve: Curves.easeOut),
        ),
      ),
      child: FadeTransition(opacity: animation, child: child),
    );
  }
}
```

## Performance

- Utiliser `RepaintBoundary` autour des animations complexes
- Préférer les animations implicites (`Animated*`) quand possible
- Éviter `setState` dans les callbacks d'animation — utiliser `AnimatedBuilder`
- Tester avec le Performance Overlay activé

## Validation

- [ ] Animation fluide (60fps)
- [ ] Durée appropriée (150-300ms pour les micro-interactions)
- [ ] `RepaintBoundary` si animation complexe
- [ ] Pas de jank visible
