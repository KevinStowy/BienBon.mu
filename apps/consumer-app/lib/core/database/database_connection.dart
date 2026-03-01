import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'app_database.dart';

/// Creates an [AppDatabase] backed by a native SQLite file on disk.
///
/// Uses [LazyDatabase] so that the expensive [getApplicationDocumentsDirectory]
/// call is deferred until the first actual query, keeping app startup fast.
///
/// File location: `<documents>/bienbon_consumer.sqlite`
AppDatabase constructDb() {
  final db = LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'bienbon_consumer.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
  return AppDatabase(db);
}
