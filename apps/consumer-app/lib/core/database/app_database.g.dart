// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $CachedStoresTable extends CachedStores
    with TableInfo<$CachedStoresTable, CachedStore> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedStoresTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _categoryMeta = const VerificationMeta(
    'category',
  );
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
    'category',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _latitudeMeta = const VerificationMeta(
    'latitude',
  );
  @override
  late final GeneratedColumn<double> latitude = GeneratedColumn<double>(
    'latitude',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _longitudeMeta = const VerificationMeta(
    'longitude',
  );
  @override
  late final GeneratedColumn<double> longitude = GeneratedColumn<double>(
    'longitude',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _addressMeta = const VerificationMeta(
    'address',
  );
  @override
  late final GeneratedColumn<String> address = GeneratedColumn<String>(
    'address',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _ratingMeta = const VerificationMeta('rating');
  @override
  late final GeneratedColumn<double> rating = GeneratedColumn<double>(
    'rating',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _basketCountMeta = const VerificationMeta(
    'basketCount',
  );
  @override
  late final GeneratedColumn<int> basketCount = GeneratedColumn<int>(
    'basket_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _cachedAtMeta = const VerificationMeta(
    'cachedAt',
  );
  @override
  late final GeneratedColumn<DateTime> cachedAt = GeneratedColumn<DateTime>(
    'cached_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    name,
    category,
    latitude,
    longitude,
    address,
    rating,
    basketCount,
    cachedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_stores';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedStore> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('category')) {
      context.handle(
        _categoryMeta,
        category.isAcceptableOrUnknown(data['category']!, _categoryMeta),
      );
    } else if (isInserting) {
      context.missing(_categoryMeta);
    }
    if (data.containsKey('latitude')) {
      context.handle(
        _latitudeMeta,
        latitude.isAcceptableOrUnknown(data['latitude']!, _latitudeMeta),
      );
    }
    if (data.containsKey('longitude')) {
      context.handle(
        _longitudeMeta,
        longitude.isAcceptableOrUnknown(data['longitude']!, _longitudeMeta),
      );
    }
    if (data.containsKey('address')) {
      context.handle(
        _addressMeta,
        address.isAcceptableOrUnknown(data['address']!, _addressMeta),
      );
    } else if (isInserting) {
      context.missing(_addressMeta);
    }
    if (data.containsKey('rating')) {
      context.handle(
        _ratingMeta,
        rating.isAcceptableOrUnknown(data['rating']!, _ratingMeta),
      );
    }
    if (data.containsKey('basket_count')) {
      context.handle(
        _basketCountMeta,
        basketCount.isAcceptableOrUnknown(
          data['basket_count']!,
          _basketCountMeta,
        ),
      );
    }
    if (data.containsKey('cached_at')) {
      context.handle(
        _cachedAtMeta,
        cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedStore map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedStore(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      category: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}category'],
      )!,
      latitude: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}latitude'],
      ),
      longitude: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}longitude'],
      ),
      address: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}address'],
      )!,
      rating: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}rating'],
      )!,
      basketCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}basket_count'],
      )!,
      cachedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}cached_at'],
      )!,
    );
  }

  @override
  $CachedStoresTable createAlias(String alias) {
    return $CachedStoresTable(attachedDatabase, alias);
  }
}

class CachedStore extends DataClass implements Insertable<CachedStore> {
  final String id;
  final String name;
  final String category;
  final double? latitude;
  final double? longitude;
  final String address;
  final double rating;
  final int basketCount;
  final DateTime cachedAt;
  const CachedStore({
    required this.id,
    required this.name,
    required this.category,
    this.latitude,
    this.longitude,
    required this.address,
    required this.rating,
    required this.basketCount,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    map['category'] = Variable<String>(category);
    if (!nullToAbsent || latitude != null) {
      map['latitude'] = Variable<double>(latitude);
    }
    if (!nullToAbsent || longitude != null) {
      map['longitude'] = Variable<double>(longitude);
    }
    map['address'] = Variable<String>(address);
    map['rating'] = Variable<double>(rating);
    map['basket_count'] = Variable<int>(basketCount);
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  CachedStoresCompanion toCompanion(bool nullToAbsent) {
    return CachedStoresCompanion(
      id: Value(id),
      name: Value(name),
      category: Value(category),
      latitude: latitude == null && nullToAbsent
          ? const Value.absent()
          : Value(latitude),
      longitude: longitude == null && nullToAbsent
          ? const Value.absent()
          : Value(longitude),
      address: Value(address),
      rating: Value(rating),
      basketCount: Value(basketCount),
      cachedAt: Value(cachedAt),
    );
  }

  factory CachedStore.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedStore(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      category: serializer.fromJson<String>(json['category']),
      latitude: serializer.fromJson<double?>(json['latitude']),
      longitude: serializer.fromJson<double?>(json['longitude']),
      address: serializer.fromJson<String>(json['address']),
      rating: serializer.fromJson<double>(json['rating']),
      basketCount: serializer.fromJson<int>(json['basketCount']),
      cachedAt: serializer.fromJson<DateTime>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'category': serializer.toJson<String>(category),
      'latitude': serializer.toJson<double?>(latitude),
      'longitude': serializer.toJson<double?>(longitude),
      'address': serializer.toJson<String>(address),
      'rating': serializer.toJson<double>(rating),
      'basketCount': serializer.toJson<int>(basketCount),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  CachedStore copyWith({
    String? id,
    String? name,
    String? category,
    Value<double?> latitude = const Value.absent(),
    Value<double?> longitude = const Value.absent(),
    String? address,
    double? rating,
    int? basketCount,
    DateTime? cachedAt,
  }) => CachedStore(
    id: id ?? this.id,
    name: name ?? this.name,
    category: category ?? this.category,
    latitude: latitude.present ? latitude.value : this.latitude,
    longitude: longitude.present ? longitude.value : this.longitude,
    address: address ?? this.address,
    rating: rating ?? this.rating,
    basketCount: basketCount ?? this.basketCount,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  CachedStore copyWithCompanion(CachedStoresCompanion data) {
    return CachedStore(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      category: data.category.present ? data.category.value : this.category,
      latitude: data.latitude.present ? data.latitude.value : this.latitude,
      longitude: data.longitude.present ? data.longitude.value : this.longitude,
      address: data.address.present ? data.address.value : this.address,
      rating: data.rating.present ? data.rating.value : this.rating,
      basketCount: data.basketCount.present
          ? data.basketCount.value
          : this.basketCount,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedStore(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('category: $category, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('address: $address, ')
          ..write('rating: $rating, ')
          ..write('basketCount: $basketCount, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    name,
    category,
    latitude,
    longitude,
    address,
    rating,
    basketCount,
    cachedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedStore &&
          other.id == this.id &&
          other.name == this.name &&
          other.category == this.category &&
          other.latitude == this.latitude &&
          other.longitude == this.longitude &&
          other.address == this.address &&
          other.rating == this.rating &&
          other.basketCount == this.basketCount &&
          other.cachedAt == this.cachedAt);
}

class CachedStoresCompanion extends UpdateCompanion<CachedStore> {
  final Value<String> id;
  final Value<String> name;
  final Value<String> category;
  final Value<double?> latitude;
  final Value<double?> longitude;
  final Value<String> address;
  final Value<double> rating;
  final Value<int> basketCount;
  final Value<DateTime> cachedAt;
  final Value<int> rowid;
  const CachedStoresCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.category = const Value.absent(),
    this.latitude = const Value.absent(),
    this.longitude = const Value.absent(),
    this.address = const Value.absent(),
    this.rating = const Value.absent(),
    this.basketCount = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedStoresCompanion.insert({
    required String id,
    required String name,
    required String category,
    this.latitude = const Value.absent(),
    this.longitude = const Value.absent(),
    required String address,
    this.rating = const Value.absent(),
    this.basketCount = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       category = Value(category),
       address = Value(address);
  static Insertable<CachedStore> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? category,
    Expression<double>? latitude,
    Expression<double>? longitude,
    Expression<String>? address,
    Expression<double>? rating,
    Expression<int>? basketCount,
    Expression<DateTime>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (category != null) 'category': category,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (address != null) 'address': address,
      if (rating != null) 'rating': rating,
      if (basketCount != null) 'basket_count': basketCount,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedStoresCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String>? category,
    Value<double?>? latitude,
    Value<double?>? longitude,
    Value<String>? address,
    Value<double>? rating,
    Value<int>? basketCount,
    Value<DateTime>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedStoresCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      address: address ?? this.address,
      rating: rating ?? this.rating,
      basketCount: basketCount ?? this.basketCount,
      cachedAt: cachedAt ?? this.cachedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (latitude.present) {
      map['latitude'] = Variable<double>(latitude.value);
    }
    if (longitude.present) {
      map['longitude'] = Variable<double>(longitude.value);
    }
    if (address.present) {
      map['address'] = Variable<String>(address.value);
    }
    if (rating.present) {
      map['rating'] = Variable<double>(rating.value);
    }
    if (basketCount.present) {
      map['basket_count'] = Variable<int>(basketCount.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<DateTime>(cachedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedStoresCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('category: $category, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('address: $address, ')
          ..write('rating: $rating, ')
          ..write('basketCount: $basketCount, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedBasketsTable extends CachedBaskets
    with TableInfo<$CachedBasketsTable, CachedBasket> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedBasketsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _storeIdMeta = const VerificationMeta(
    'storeId',
  );
  @override
  late final GeneratedColumn<String> storeId = GeneratedColumn<String>(
    'store_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _storeNameMeta = const VerificationMeta(
    'storeName',
  );
  @override
  late final GeneratedColumn<String> storeName = GeneratedColumn<String>(
    'store_name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _originalPriceMeta = const VerificationMeta(
    'originalPrice',
  );
  @override
  late final GeneratedColumn<double> originalPrice = GeneratedColumn<double>(
    'original_price',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _discountedPriceMeta = const VerificationMeta(
    'discountedPrice',
  );
  @override
  late final GeneratedColumn<double> discountedPrice = GeneratedColumn<double>(
    'discounted_price',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _pickupWindowMeta = const VerificationMeta(
    'pickupWindow',
  );
  @override
  late final GeneratedColumn<String> pickupWindow = GeneratedColumn<String>(
    'pickup_window',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _remainingCountMeta = const VerificationMeta(
    'remainingCount',
  );
  @override
  late final GeneratedColumn<int> remainingCount = GeneratedColumn<int>(
    'remaining_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('available'),
  );
  static const VerificationMeta _cachedAtMeta = const VerificationMeta(
    'cachedAt',
  );
  @override
  late final GeneratedColumn<DateTime> cachedAt = GeneratedColumn<DateTime>(
    'cached_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    storeId,
    name,
    storeName,
    originalPrice,
    discountedPrice,
    pickupWindow,
    remainingCount,
    status,
    cachedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_baskets';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedBasket> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('store_id')) {
      context.handle(
        _storeIdMeta,
        storeId.isAcceptableOrUnknown(data['store_id']!, _storeIdMeta),
      );
    } else if (isInserting) {
      context.missing(_storeIdMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('store_name')) {
      context.handle(
        _storeNameMeta,
        storeName.isAcceptableOrUnknown(data['store_name']!, _storeNameMeta),
      );
    } else if (isInserting) {
      context.missing(_storeNameMeta);
    }
    if (data.containsKey('original_price')) {
      context.handle(
        _originalPriceMeta,
        originalPrice.isAcceptableOrUnknown(
          data['original_price']!,
          _originalPriceMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_originalPriceMeta);
    }
    if (data.containsKey('discounted_price')) {
      context.handle(
        _discountedPriceMeta,
        discountedPrice.isAcceptableOrUnknown(
          data['discounted_price']!,
          _discountedPriceMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_discountedPriceMeta);
    }
    if (data.containsKey('pickup_window')) {
      context.handle(
        _pickupWindowMeta,
        pickupWindow.isAcceptableOrUnknown(
          data['pickup_window']!,
          _pickupWindowMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_pickupWindowMeta);
    }
    if (data.containsKey('remaining_count')) {
      context.handle(
        _remainingCountMeta,
        remainingCount.isAcceptableOrUnknown(
          data['remaining_count']!,
          _remainingCountMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_remainingCountMeta);
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('cached_at')) {
      context.handle(
        _cachedAtMeta,
        cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedBasket map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedBasket(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      storeId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}store_id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      storeName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}store_name'],
      )!,
      originalPrice: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}original_price'],
      )!,
      discountedPrice: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}discounted_price'],
      )!,
      pickupWindow: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}pickup_window'],
      )!,
      remainingCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}remaining_count'],
      )!,
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      cachedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}cached_at'],
      )!,
    );
  }

  @override
  $CachedBasketsTable createAlias(String alias) {
    return $CachedBasketsTable(attachedDatabase, alias);
  }
}

class CachedBasket extends DataClass implements Insertable<CachedBasket> {
  final String id;
  final String storeId;
  final String name;
  final String storeName;
  final double originalPrice;
  final double discountedPrice;

  /// Serialised as an ISO-8601 interval string, e.g.
  /// "2026-03-01T17:00:00/2026-03-01T19:00:00".
  final String pickupWindow;
  final int remainingCount;
  final String status;
  final DateTime cachedAt;
  const CachedBasket({
    required this.id,
    required this.storeId,
    required this.name,
    required this.storeName,
    required this.originalPrice,
    required this.discountedPrice,
    required this.pickupWindow,
    required this.remainingCount,
    required this.status,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['store_id'] = Variable<String>(storeId);
    map['name'] = Variable<String>(name);
    map['store_name'] = Variable<String>(storeName);
    map['original_price'] = Variable<double>(originalPrice);
    map['discounted_price'] = Variable<double>(discountedPrice);
    map['pickup_window'] = Variable<String>(pickupWindow);
    map['remaining_count'] = Variable<int>(remainingCount);
    map['status'] = Variable<String>(status);
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  CachedBasketsCompanion toCompanion(bool nullToAbsent) {
    return CachedBasketsCompanion(
      id: Value(id),
      storeId: Value(storeId),
      name: Value(name),
      storeName: Value(storeName),
      originalPrice: Value(originalPrice),
      discountedPrice: Value(discountedPrice),
      pickupWindow: Value(pickupWindow),
      remainingCount: Value(remainingCount),
      status: Value(status),
      cachedAt: Value(cachedAt),
    );
  }

  factory CachedBasket.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedBasket(
      id: serializer.fromJson<String>(json['id']),
      storeId: serializer.fromJson<String>(json['storeId']),
      name: serializer.fromJson<String>(json['name']),
      storeName: serializer.fromJson<String>(json['storeName']),
      originalPrice: serializer.fromJson<double>(json['originalPrice']),
      discountedPrice: serializer.fromJson<double>(json['discountedPrice']),
      pickupWindow: serializer.fromJson<String>(json['pickupWindow']),
      remainingCount: serializer.fromJson<int>(json['remainingCount']),
      status: serializer.fromJson<String>(json['status']),
      cachedAt: serializer.fromJson<DateTime>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'storeId': serializer.toJson<String>(storeId),
      'name': serializer.toJson<String>(name),
      'storeName': serializer.toJson<String>(storeName),
      'originalPrice': serializer.toJson<double>(originalPrice),
      'discountedPrice': serializer.toJson<double>(discountedPrice),
      'pickupWindow': serializer.toJson<String>(pickupWindow),
      'remainingCount': serializer.toJson<int>(remainingCount),
      'status': serializer.toJson<String>(status),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  CachedBasket copyWith({
    String? id,
    String? storeId,
    String? name,
    String? storeName,
    double? originalPrice,
    double? discountedPrice,
    String? pickupWindow,
    int? remainingCount,
    String? status,
    DateTime? cachedAt,
  }) => CachedBasket(
    id: id ?? this.id,
    storeId: storeId ?? this.storeId,
    name: name ?? this.name,
    storeName: storeName ?? this.storeName,
    originalPrice: originalPrice ?? this.originalPrice,
    discountedPrice: discountedPrice ?? this.discountedPrice,
    pickupWindow: pickupWindow ?? this.pickupWindow,
    remainingCount: remainingCount ?? this.remainingCount,
    status: status ?? this.status,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  CachedBasket copyWithCompanion(CachedBasketsCompanion data) {
    return CachedBasket(
      id: data.id.present ? data.id.value : this.id,
      storeId: data.storeId.present ? data.storeId.value : this.storeId,
      name: data.name.present ? data.name.value : this.name,
      storeName: data.storeName.present ? data.storeName.value : this.storeName,
      originalPrice: data.originalPrice.present
          ? data.originalPrice.value
          : this.originalPrice,
      discountedPrice: data.discountedPrice.present
          ? data.discountedPrice.value
          : this.discountedPrice,
      pickupWindow: data.pickupWindow.present
          ? data.pickupWindow.value
          : this.pickupWindow,
      remainingCount: data.remainingCount.present
          ? data.remainingCount.value
          : this.remainingCount,
      status: data.status.present ? data.status.value : this.status,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedBasket(')
          ..write('id: $id, ')
          ..write('storeId: $storeId, ')
          ..write('name: $name, ')
          ..write('storeName: $storeName, ')
          ..write('originalPrice: $originalPrice, ')
          ..write('discountedPrice: $discountedPrice, ')
          ..write('pickupWindow: $pickupWindow, ')
          ..write('remainingCount: $remainingCount, ')
          ..write('status: $status, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    storeId,
    name,
    storeName,
    originalPrice,
    discountedPrice,
    pickupWindow,
    remainingCount,
    status,
    cachedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedBasket &&
          other.id == this.id &&
          other.storeId == this.storeId &&
          other.name == this.name &&
          other.storeName == this.storeName &&
          other.originalPrice == this.originalPrice &&
          other.discountedPrice == this.discountedPrice &&
          other.pickupWindow == this.pickupWindow &&
          other.remainingCount == this.remainingCount &&
          other.status == this.status &&
          other.cachedAt == this.cachedAt);
}

class CachedBasketsCompanion extends UpdateCompanion<CachedBasket> {
  final Value<String> id;
  final Value<String> storeId;
  final Value<String> name;
  final Value<String> storeName;
  final Value<double> originalPrice;
  final Value<double> discountedPrice;
  final Value<String> pickupWindow;
  final Value<int> remainingCount;
  final Value<String> status;
  final Value<DateTime> cachedAt;
  final Value<int> rowid;
  const CachedBasketsCompanion({
    this.id = const Value.absent(),
    this.storeId = const Value.absent(),
    this.name = const Value.absent(),
    this.storeName = const Value.absent(),
    this.originalPrice = const Value.absent(),
    this.discountedPrice = const Value.absent(),
    this.pickupWindow = const Value.absent(),
    this.remainingCount = const Value.absent(),
    this.status = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedBasketsCompanion.insert({
    required String id,
    required String storeId,
    required String name,
    required String storeName,
    required double originalPrice,
    required double discountedPrice,
    required String pickupWindow,
    required int remainingCount,
    this.status = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       storeId = Value(storeId),
       name = Value(name),
       storeName = Value(storeName),
       originalPrice = Value(originalPrice),
       discountedPrice = Value(discountedPrice),
       pickupWindow = Value(pickupWindow),
       remainingCount = Value(remainingCount);
  static Insertable<CachedBasket> custom({
    Expression<String>? id,
    Expression<String>? storeId,
    Expression<String>? name,
    Expression<String>? storeName,
    Expression<double>? originalPrice,
    Expression<double>? discountedPrice,
    Expression<String>? pickupWindow,
    Expression<int>? remainingCount,
    Expression<String>? status,
    Expression<DateTime>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (storeId != null) 'store_id': storeId,
      if (name != null) 'name': name,
      if (storeName != null) 'store_name': storeName,
      if (originalPrice != null) 'original_price': originalPrice,
      if (discountedPrice != null) 'discounted_price': discountedPrice,
      if (pickupWindow != null) 'pickup_window': pickupWindow,
      if (remainingCount != null) 'remaining_count': remainingCount,
      if (status != null) 'status': status,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedBasketsCompanion copyWith({
    Value<String>? id,
    Value<String>? storeId,
    Value<String>? name,
    Value<String>? storeName,
    Value<double>? originalPrice,
    Value<double>? discountedPrice,
    Value<String>? pickupWindow,
    Value<int>? remainingCount,
    Value<String>? status,
    Value<DateTime>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedBasketsCompanion(
      id: id ?? this.id,
      storeId: storeId ?? this.storeId,
      name: name ?? this.name,
      storeName: storeName ?? this.storeName,
      originalPrice: originalPrice ?? this.originalPrice,
      discountedPrice: discountedPrice ?? this.discountedPrice,
      pickupWindow: pickupWindow ?? this.pickupWindow,
      remainingCount: remainingCount ?? this.remainingCount,
      status: status ?? this.status,
      cachedAt: cachedAt ?? this.cachedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (storeId.present) {
      map['store_id'] = Variable<String>(storeId.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (storeName.present) {
      map['store_name'] = Variable<String>(storeName.value);
    }
    if (originalPrice.present) {
      map['original_price'] = Variable<double>(originalPrice.value);
    }
    if (discountedPrice.present) {
      map['discounted_price'] = Variable<double>(discountedPrice.value);
    }
    if (pickupWindow.present) {
      map['pickup_window'] = Variable<String>(pickupWindow.value);
    }
    if (remainingCount.present) {
      map['remaining_count'] = Variable<int>(remainingCount.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<DateTime>(cachedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedBasketsCompanion(')
          ..write('id: $id, ')
          ..write('storeId: $storeId, ')
          ..write('name: $name, ')
          ..write('storeName: $storeName, ')
          ..write('originalPrice: $originalPrice, ')
          ..write('discountedPrice: $discountedPrice, ')
          ..write('pickupWindow: $pickupWindow, ')
          ..write('remainingCount: $remainingCount, ')
          ..write('status: $status, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedReservationsTable extends CachedReservations
    with TableInfo<$CachedReservationsTable, CachedReservation> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedReservationsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _basketIdMeta = const VerificationMeta(
    'basketId',
  );
  @override
  late final GeneratedColumn<String> basketId = GeneratedColumn<String>(
    'basket_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _basketNameMeta = const VerificationMeta(
    'basketName',
  );
  @override
  late final GeneratedColumn<String> basketName = GeneratedColumn<String>(
    'basket_name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _storeNameMeta = const VerificationMeta(
    'storeName',
  );
  @override
  late final GeneratedColumn<String> storeName = GeneratedColumn<String>(
    'store_name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _pickupWindowMeta = const VerificationMeta(
    'pickupWindow',
  );
  @override
  late final GeneratedColumn<String> pickupWindow = GeneratedColumn<String>(
    'pickup_window',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _qrCodeMeta = const VerificationMeta('qrCode');
  @override
  late final GeneratedColumn<String> qrCode = GeneratedColumn<String>(
    'qr_code',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _cachedAtMeta = const VerificationMeta(
    'cachedAt',
  );
  @override
  late final GeneratedColumn<DateTime> cachedAt = GeneratedColumn<DateTime>(
    'cached_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    basketId,
    basketName,
    storeName,
    status,
    pickupWindow,
    qrCode,
    createdAt,
    cachedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_reservations';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedReservation> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('basket_id')) {
      context.handle(
        _basketIdMeta,
        basketId.isAcceptableOrUnknown(data['basket_id']!, _basketIdMeta),
      );
    } else if (isInserting) {
      context.missing(_basketIdMeta);
    }
    if (data.containsKey('basket_name')) {
      context.handle(
        _basketNameMeta,
        basketName.isAcceptableOrUnknown(data['basket_name']!, _basketNameMeta),
      );
    } else if (isInserting) {
      context.missing(_basketNameMeta);
    }
    if (data.containsKey('store_name')) {
      context.handle(
        _storeNameMeta,
        storeName.isAcceptableOrUnknown(data['store_name']!, _storeNameMeta),
      );
    } else if (isInserting) {
      context.missing(_storeNameMeta);
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    } else if (isInserting) {
      context.missing(_statusMeta);
    }
    if (data.containsKey('pickup_window')) {
      context.handle(
        _pickupWindowMeta,
        pickupWindow.isAcceptableOrUnknown(
          data['pickup_window']!,
          _pickupWindowMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_pickupWindowMeta);
    }
    if (data.containsKey('qr_code')) {
      context.handle(
        _qrCodeMeta,
        qrCode.isAcceptableOrUnknown(data['qr_code']!, _qrCodeMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('cached_at')) {
      context.handle(
        _cachedAtMeta,
        cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedReservation map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedReservation(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      basketId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}basket_id'],
      )!,
      basketName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}basket_name'],
      )!,
      storeName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}store_name'],
      )!,
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      pickupWindow: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}pickup_window'],
      )!,
      qrCode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}qr_code'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
      cachedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}cached_at'],
      )!,
    );
  }

  @override
  $CachedReservationsTable createAlias(String alias) {
    return $CachedReservationsTable(attachedDatabase, alias);
  }
}

class CachedReservation extends DataClass
    implements Insertable<CachedReservation> {
  final String id;
  final String basketId;
  final String basketName;
  final String storeName;
  final String status;
  final String pickupWindow;

  /// Base64-encoded QR code data; nullable for pending reservations that
  /// have not yet received a code from the server.
  final String? qrCode;
  final DateTime createdAt;
  final DateTime cachedAt;
  const CachedReservation({
    required this.id,
    required this.basketId,
    required this.basketName,
    required this.storeName,
    required this.status,
    required this.pickupWindow,
    this.qrCode,
    required this.createdAt,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['basket_id'] = Variable<String>(basketId);
    map['basket_name'] = Variable<String>(basketName);
    map['store_name'] = Variable<String>(storeName);
    map['status'] = Variable<String>(status);
    map['pickup_window'] = Variable<String>(pickupWindow);
    if (!nullToAbsent || qrCode != null) {
      map['qr_code'] = Variable<String>(qrCode);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  CachedReservationsCompanion toCompanion(bool nullToAbsent) {
    return CachedReservationsCompanion(
      id: Value(id),
      basketId: Value(basketId),
      basketName: Value(basketName),
      storeName: Value(storeName),
      status: Value(status),
      pickupWindow: Value(pickupWindow),
      qrCode: qrCode == null && nullToAbsent
          ? const Value.absent()
          : Value(qrCode),
      createdAt: Value(createdAt),
      cachedAt: Value(cachedAt),
    );
  }

  factory CachedReservation.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedReservation(
      id: serializer.fromJson<String>(json['id']),
      basketId: serializer.fromJson<String>(json['basketId']),
      basketName: serializer.fromJson<String>(json['basketName']),
      storeName: serializer.fromJson<String>(json['storeName']),
      status: serializer.fromJson<String>(json['status']),
      pickupWindow: serializer.fromJson<String>(json['pickupWindow']),
      qrCode: serializer.fromJson<String?>(json['qrCode']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      cachedAt: serializer.fromJson<DateTime>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'basketId': serializer.toJson<String>(basketId),
      'basketName': serializer.toJson<String>(basketName),
      'storeName': serializer.toJson<String>(storeName),
      'status': serializer.toJson<String>(status),
      'pickupWindow': serializer.toJson<String>(pickupWindow),
      'qrCode': serializer.toJson<String?>(qrCode),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  CachedReservation copyWith({
    String? id,
    String? basketId,
    String? basketName,
    String? storeName,
    String? status,
    String? pickupWindow,
    Value<String?> qrCode = const Value.absent(),
    DateTime? createdAt,
    DateTime? cachedAt,
  }) => CachedReservation(
    id: id ?? this.id,
    basketId: basketId ?? this.basketId,
    basketName: basketName ?? this.basketName,
    storeName: storeName ?? this.storeName,
    status: status ?? this.status,
    pickupWindow: pickupWindow ?? this.pickupWindow,
    qrCode: qrCode.present ? qrCode.value : this.qrCode,
    createdAt: createdAt ?? this.createdAt,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  CachedReservation copyWithCompanion(CachedReservationsCompanion data) {
    return CachedReservation(
      id: data.id.present ? data.id.value : this.id,
      basketId: data.basketId.present ? data.basketId.value : this.basketId,
      basketName: data.basketName.present
          ? data.basketName.value
          : this.basketName,
      storeName: data.storeName.present ? data.storeName.value : this.storeName,
      status: data.status.present ? data.status.value : this.status,
      pickupWindow: data.pickupWindow.present
          ? data.pickupWindow.value
          : this.pickupWindow,
      qrCode: data.qrCode.present ? data.qrCode.value : this.qrCode,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedReservation(')
          ..write('id: $id, ')
          ..write('basketId: $basketId, ')
          ..write('basketName: $basketName, ')
          ..write('storeName: $storeName, ')
          ..write('status: $status, ')
          ..write('pickupWindow: $pickupWindow, ')
          ..write('qrCode: $qrCode, ')
          ..write('createdAt: $createdAt, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    basketId,
    basketName,
    storeName,
    status,
    pickupWindow,
    qrCode,
    createdAt,
    cachedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedReservation &&
          other.id == this.id &&
          other.basketId == this.basketId &&
          other.basketName == this.basketName &&
          other.storeName == this.storeName &&
          other.status == this.status &&
          other.pickupWindow == this.pickupWindow &&
          other.qrCode == this.qrCode &&
          other.createdAt == this.createdAt &&
          other.cachedAt == this.cachedAt);
}

class CachedReservationsCompanion extends UpdateCompanion<CachedReservation> {
  final Value<String> id;
  final Value<String> basketId;
  final Value<String> basketName;
  final Value<String> storeName;
  final Value<String> status;
  final Value<String> pickupWindow;
  final Value<String?> qrCode;
  final Value<DateTime> createdAt;
  final Value<DateTime> cachedAt;
  final Value<int> rowid;
  const CachedReservationsCompanion({
    this.id = const Value.absent(),
    this.basketId = const Value.absent(),
    this.basketName = const Value.absent(),
    this.storeName = const Value.absent(),
    this.status = const Value.absent(),
    this.pickupWindow = const Value.absent(),
    this.qrCode = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedReservationsCompanion.insert({
    required String id,
    required String basketId,
    required String basketName,
    required String storeName,
    required String status,
    required String pickupWindow,
    this.qrCode = const Value.absent(),
    required DateTime createdAt,
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       basketId = Value(basketId),
       basketName = Value(basketName),
       storeName = Value(storeName),
       status = Value(status),
       pickupWindow = Value(pickupWindow),
       createdAt = Value(createdAt);
  static Insertable<CachedReservation> custom({
    Expression<String>? id,
    Expression<String>? basketId,
    Expression<String>? basketName,
    Expression<String>? storeName,
    Expression<String>? status,
    Expression<String>? pickupWindow,
    Expression<String>? qrCode,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (basketId != null) 'basket_id': basketId,
      if (basketName != null) 'basket_name': basketName,
      if (storeName != null) 'store_name': storeName,
      if (status != null) 'status': status,
      if (pickupWindow != null) 'pickup_window': pickupWindow,
      if (qrCode != null) 'qr_code': qrCode,
      if (createdAt != null) 'created_at': createdAt,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedReservationsCompanion copyWith({
    Value<String>? id,
    Value<String>? basketId,
    Value<String>? basketName,
    Value<String>? storeName,
    Value<String>? status,
    Value<String>? pickupWindow,
    Value<String?>? qrCode,
    Value<DateTime>? createdAt,
    Value<DateTime>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedReservationsCompanion(
      id: id ?? this.id,
      basketId: basketId ?? this.basketId,
      basketName: basketName ?? this.basketName,
      storeName: storeName ?? this.storeName,
      status: status ?? this.status,
      pickupWindow: pickupWindow ?? this.pickupWindow,
      qrCode: qrCode ?? this.qrCode,
      createdAt: createdAt ?? this.createdAt,
      cachedAt: cachedAt ?? this.cachedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (basketId.present) {
      map['basket_id'] = Variable<String>(basketId.value);
    }
    if (basketName.present) {
      map['basket_name'] = Variable<String>(basketName.value);
    }
    if (storeName.present) {
      map['store_name'] = Variable<String>(storeName.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (pickupWindow.present) {
      map['pickup_window'] = Variable<String>(pickupWindow.value);
    }
    if (qrCode.present) {
      map['qr_code'] = Variable<String>(qrCode.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<DateTime>(cachedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedReservationsCompanion(')
          ..write('id: $id, ')
          ..write('basketId: $basketId, ')
          ..write('basketName: $basketName, ')
          ..write('storeName: $storeName, ')
          ..write('status: $status, ')
          ..write('pickupWindow: $pickupWindow, ')
          ..write('qrCode: $qrCode, ')
          ..write('createdAt: $createdAt, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineActionQueueTable extends OfflineActionQueue
    with TableInfo<$OfflineActionQueueTable, OfflineActionQueueData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineActionQueueTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _actionTypeMeta = const VerificationMeta(
    'actionType',
  );
  @override
  late final GeneratedColumn<String> actionType = GeneratedColumn<String>(
    'action_type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pending'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  static const VerificationMeta _retryCountMeta = const VerificationMeta(
    'retryCount',
  );
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
    'retry_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    actionType,
    payload,
    status,
    createdAt,
    retryCount,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_action_queue';
  @override
  VerificationContext validateIntegrity(
    Insertable<OfflineActionQueueData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('action_type')) {
      context.handle(
        _actionTypeMeta,
        actionType.isAcceptableOrUnknown(data['action_type']!, _actionTypeMeta),
      );
    } else if (isInserting) {
      context.missing(_actionTypeMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    }
    if (data.containsKey('retry_count')) {
      context.handle(
        _retryCountMeta,
        retryCount.isAcceptableOrUnknown(data['retry_count']!, _retryCountMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  OfflineActionQueueData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineActionQueueData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      actionType: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}action_type'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
      retryCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}retry_count'],
      )!,
    );
  }

  @override
  $OfflineActionQueueTable createAlias(String alias) {
    return $OfflineActionQueueTable(attachedDatabase, alias);
  }
}

class OfflineActionQueueData extends DataClass
    implements Insertable<OfflineActionQueueData> {
  final int id;
  final String actionType;
  final String payload;
  final String status;
  final DateTime createdAt;
  final int retryCount;
  const OfflineActionQueueData({
    required this.id,
    required this.actionType,
    required this.payload,
    required this.status,
    required this.createdAt,
    required this.retryCount,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['action_type'] = Variable<String>(actionType);
    map['payload'] = Variable<String>(payload);
    map['status'] = Variable<String>(status);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['retry_count'] = Variable<int>(retryCount);
    return map;
  }

  OfflineActionQueueCompanion toCompanion(bool nullToAbsent) {
    return OfflineActionQueueCompanion(
      id: Value(id),
      actionType: Value(actionType),
      payload: Value(payload),
      status: Value(status),
      createdAt: Value(createdAt),
      retryCount: Value(retryCount),
    );
  }

  factory OfflineActionQueueData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineActionQueueData(
      id: serializer.fromJson<int>(json['id']),
      actionType: serializer.fromJson<String>(json['actionType']),
      payload: serializer.fromJson<String>(json['payload']),
      status: serializer.fromJson<String>(json['status']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'actionType': serializer.toJson<String>(actionType),
      'payload': serializer.toJson<String>(payload),
      'status': serializer.toJson<String>(status),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'retryCount': serializer.toJson<int>(retryCount),
    };
  }

  OfflineActionQueueData copyWith({
    int? id,
    String? actionType,
    String? payload,
    String? status,
    DateTime? createdAt,
    int? retryCount,
  }) => OfflineActionQueueData(
    id: id ?? this.id,
    actionType: actionType ?? this.actionType,
    payload: payload ?? this.payload,
    status: status ?? this.status,
    createdAt: createdAt ?? this.createdAt,
    retryCount: retryCount ?? this.retryCount,
  );
  OfflineActionQueueData copyWithCompanion(OfflineActionQueueCompanion data) {
    return OfflineActionQueueData(
      id: data.id.present ? data.id.value : this.id,
      actionType: data.actionType.present
          ? data.actionType.value
          : this.actionType,
      payload: data.payload.present ? data.payload.value : this.payload,
      status: data.status.present ? data.status.value : this.status,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      retryCount: data.retryCount.present
          ? data.retryCount.value
          : this.retryCount,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineActionQueueData(')
          ..write('id: $id, ')
          ..write('actionType: $actionType, ')
          ..write('payload: $payload, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt, ')
          ..write('retryCount: $retryCount')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, actionType, payload, status, createdAt, retryCount);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineActionQueueData &&
          other.id == this.id &&
          other.actionType == this.actionType &&
          other.payload == this.payload &&
          other.status == this.status &&
          other.createdAt == this.createdAt &&
          other.retryCount == this.retryCount);
}

class OfflineActionQueueCompanion
    extends UpdateCompanion<OfflineActionQueueData> {
  final Value<int> id;
  final Value<String> actionType;
  final Value<String> payload;
  final Value<String> status;
  final Value<DateTime> createdAt;
  final Value<int> retryCount;
  const OfflineActionQueueCompanion({
    this.id = const Value.absent(),
    this.actionType = const Value.absent(),
    this.payload = const Value.absent(),
    this.status = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.retryCount = const Value.absent(),
  });
  OfflineActionQueueCompanion.insert({
    this.id = const Value.absent(),
    required String actionType,
    required String payload,
    this.status = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.retryCount = const Value.absent(),
  }) : actionType = Value(actionType),
       payload = Value(payload);
  static Insertable<OfflineActionQueueData> custom({
    Expression<int>? id,
    Expression<String>? actionType,
    Expression<String>? payload,
    Expression<String>? status,
    Expression<DateTime>? createdAt,
    Expression<int>? retryCount,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (actionType != null) 'action_type': actionType,
      if (payload != null) 'payload': payload,
      if (status != null) 'status': status,
      if (createdAt != null) 'created_at': createdAt,
      if (retryCount != null) 'retry_count': retryCount,
    });
  }

  OfflineActionQueueCompanion copyWith({
    Value<int>? id,
    Value<String>? actionType,
    Value<String>? payload,
    Value<String>? status,
    Value<DateTime>? createdAt,
    Value<int>? retryCount,
  }) {
    return OfflineActionQueueCompanion(
      id: id ?? this.id,
      actionType: actionType ?? this.actionType,
      payload: payload ?? this.payload,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      retryCount: retryCount ?? this.retryCount,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (actionType.present) {
      map['action_type'] = Variable<String>(actionType.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineActionQueueCompanion(')
          ..write('id: $id, ')
          ..write('actionType: $actionType, ')
          ..write('payload: $payload, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt, ')
          ..write('retryCount: $retryCount')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $CachedStoresTable cachedStores = $CachedStoresTable(this);
  late final $CachedBasketsTable cachedBaskets = $CachedBasketsTable(this);
  late final $CachedReservationsTable cachedReservations =
      $CachedReservationsTable(this);
  late final $OfflineActionQueueTable offlineActionQueue =
      $OfflineActionQueueTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    cachedStores,
    cachedBaskets,
    cachedReservations,
    offlineActionQueue,
  ];
}

typedef $$CachedStoresTableCreateCompanionBuilder =
    CachedStoresCompanion Function({
      required String id,
      required String name,
      required String category,
      Value<double?> latitude,
      Value<double?> longitude,
      required String address,
      Value<double> rating,
      Value<int> basketCount,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });
typedef $$CachedStoresTableUpdateCompanionBuilder =
    CachedStoresCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<String> category,
      Value<double?> latitude,
      Value<double?> longitude,
      Value<String> address,
      Value<double> rating,
      Value<int> basketCount,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });

class $$CachedStoresTableFilterComposer
    extends Composer<_$AppDatabase, $CachedStoresTable> {
  $$CachedStoresTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get latitude => $composableBuilder(
    column: $table.latitude,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get longitude => $composableBuilder(
    column: $table.longitude,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get address => $composableBuilder(
    column: $table.address,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get rating => $composableBuilder(
    column: $table.rating,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get basketCount => $composableBuilder(
    column: $table.basketCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedStoresTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedStoresTable> {
  $$CachedStoresTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get latitude => $composableBuilder(
    column: $table.latitude,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get longitude => $composableBuilder(
    column: $table.longitude,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get address => $composableBuilder(
    column: $table.address,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get rating => $composableBuilder(
    column: $table.rating,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get basketCount => $composableBuilder(
    column: $table.basketCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedStoresTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedStoresTable> {
  $$CachedStoresTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<double> get latitude =>
      $composableBuilder(column: $table.latitude, builder: (column) => column);

  GeneratedColumn<double> get longitude =>
      $composableBuilder(column: $table.longitude, builder: (column) => column);

  GeneratedColumn<String> get address =>
      $composableBuilder(column: $table.address, builder: (column) => column);

  GeneratedColumn<double> get rating =>
      $composableBuilder(column: $table.rating, builder: (column) => column);

  GeneratedColumn<int> get basketCount => $composableBuilder(
    column: $table.basketCount,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedStoresTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedStoresTable,
          CachedStore,
          $$CachedStoresTableFilterComposer,
          $$CachedStoresTableOrderingComposer,
          $$CachedStoresTableAnnotationComposer,
          $$CachedStoresTableCreateCompanionBuilder,
          $$CachedStoresTableUpdateCompanionBuilder,
          (
            CachedStore,
            BaseReferences<_$AppDatabase, $CachedStoresTable, CachedStore>,
          ),
          CachedStore,
          PrefetchHooks Function()
        > {
  $$CachedStoresTableTableManager(_$AppDatabase db, $CachedStoresTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedStoresTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedStoresTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedStoresTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String> category = const Value.absent(),
                Value<double?> latitude = const Value.absent(),
                Value<double?> longitude = const Value.absent(),
                Value<String> address = const Value.absent(),
                Value<double> rating = const Value.absent(),
                Value<int> basketCount = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedStoresCompanion(
                id: id,
                name: name,
                category: category,
                latitude: latitude,
                longitude: longitude,
                address: address,
                rating: rating,
                basketCount: basketCount,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                required String category,
                Value<double?> latitude = const Value.absent(),
                Value<double?> longitude = const Value.absent(),
                required String address,
                Value<double> rating = const Value.absent(),
                Value<int> basketCount = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedStoresCompanion.insert(
                id: id,
                name: name,
                category: category,
                latitude: latitude,
                longitude: longitude,
                address: address,
                rating: rating,
                basketCount: basketCount,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedStoresTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedStoresTable,
      CachedStore,
      $$CachedStoresTableFilterComposer,
      $$CachedStoresTableOrderingComposer,
      $$CachedStoresTableAnnotationComposer,
      $$CachedStoresTableCreateCompanionBuilder,
      $$CachedStoresTableUpdateCompanionBuilder,
      (
        CachedStore,
        BaseReferences<_$AppDatabase, $CachedStoresTable, CachedStore>,
      ),
      CachedStore,
      PrefetchHooks Function()
    >;
typedef $$CachedBasketsTableCreateCompanionBuilder =
    CachedBasketsCompanion Function({
      required String id,
      required String storeId,
      required String name,
      required String storeName,
      required double originalPrice,
      required double discountedPrice,
      required String pickupWindow,
      required int remainingCount,
      Value<String> status,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });
typedef $$CachedBasketsTableUpdateCompanionBuilder =
    CachedBasketsCompanion Function({
      Value<String> id,
      Value<String> storeId,
      Value<String> name,
      Value<String> storeName,
      Value<double> originalPrice,
      Value<double> discountedPrice,
      Value<String> pickupWindow,
      Value<int> remainingCount,
      Value<String> status,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });

class $$CachedBasketsTableFilterComposer
    extends Composer<_$AppDatabase, $CachedBasketsTable> {
  $$CachedBasketsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get storeId => $composableBuilder(
    column: $table.storeId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get storeName => $composableBuilder(
    column: $table.storeName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get originalPrice => $composableBuilder(
    column: $table.originalPrice,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get discountedPrice => $composableBuilder(
    column: $table.discountedPrice,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get pickupWindow => $composableBuilder(
    column: $table.pickupWindow,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get remainingCount => $composableBuilder(
    column: $table.remainingCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedBasketsTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedBasketsTable> {
  $$CachedBasketsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get storeId => $composableBuilder(
    column: $table.storeId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get storeName => $composableBuilder(
    column: $table.storeName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get originalPrice => $composableBuilder(
    column: $table.originalPrice,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get discountedPrice => $composableBuilder(
    column: $table.discountedPrice,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get pickupWindow => $composableBuilder(
    column: $table.pickupWindow,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get remainingCount => $composableBuilder(
    column: $table.remainingCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedBasketsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedBasketsTable> {
  $$CachedBasketsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get storeId =>
      $composableBuilder(column: $table.storeId, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get storeName =>
      $composableBuilder(column: $table.storeName, builder: (column) => column);

  GeneratedColumn<double> get originalPrice => $composableBuilder(
    column: $table.originalPrice,
    builder: (column) => column,
  );

  GeneratedColumn<double> get discountedPrice => $composableBuilder(
    column: $table.discountedPrice,
    builder: (column) => column,
  );

  GeneratedColumn<String> get pickupWindow => $composableBuilder(
    column: $table.pickupWindow,
    builder: (column) => column,
  );

  GeneratedColumn<int> get remainingCount => $composableBuilder(
    column: $table.remainingCount,
    builder: (column) => column,
  );

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedBasketsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedBasketsTable,
          CachedBasket,
          $$CachedBasketsTableFilterComposer,
          $$CachedBasketsTableOrderingComposer,
          $$CachedBasketsTableAnnotationComposer,
          $$CachedBasketsTableCreateCompanionBuilder,
          $$CachedBasketsTableUpdateCompanionBuilder,
          (
            CachedBasket,
            BaseReferences<_$AppDatabase, $CachedBasketsTable, CachedBasket>,
          ),
          CachedBasket,
          PrefetchHooks Function()
        > {
  $$CachedBasketsTableTableManager(_$AppDatabase db, $CachedBasketsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedBasketsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedBasketsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedBasketsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> storeId = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String> storeName = const Value.absent(),
                Value<double> originalPrice = const Value.absent(),
                Value<double> discountedPrice = const Value.absent(),
                Value<String> pickupWindow = const Value.absent(),
                Value<int> remainingCount = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedBasketsCompanion(
                id: id,
                storeId: storeId,
                name: name,
                storeName: storeName,
                originalPrice: originalPrice,
                discountedPrice: discountedPrice,
                pickupWindow: pickupWindow,
                remainingCount: remainingCount,
                status: status,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String storeId,
                required String name,
                required String storeName,
                required double originalPrice,
                required double discountedPrice,
                required String pickupWindow,
                required int remainingCount,
                Value<String> status = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedBasketsCompanion.insert(
                id: id,
                storeId: storeId,
                name: name,
                storeName: storeName,
                originalPrice: originalPrice,
                discountedPrice: discountedPrice,
                pickupWindow: pickupWindow,
                remainingCount: remainingCount,
                status: status,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedBasketsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedBasketsTable,
      CachedBasket,
      $$CachedBasketsTableFilterComposer,
      $$CachedBasketsTableOrderingComposer,
      $$CachedBasketsTableAnnotationComposer,
      $$CachedBasketsTableCreateCompanionBuilder,
      $$CachedBasketsTableUpdateCompanionBuilder,
      (
        CachedBasket,
        BaseReferences<_$AppDatabase, $CachedBasketsTable, CachedBasket>,
      ),
      CachedBasket,
      PrefetchHooks Function()
    >;
typedef $$CachedReservationsTableCreateCompanionBuilder =
    CachedReservationsCompanion Function({
      required String id,
      required String basketId,
      required String basketName,
      required String storeName,
      required String status,
      required String pickupWindow,
      Value<String?> qrCode,
      required DateTime createdAt,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });
typedef $$CachedReservationsTableUpdateCompanionBuilder =
    CachedReservationsCompanion Function({
      Value<String> id,
      Value<String> basketId,
      Value<String> basketName,
      Value<String> storeName,
      Value<String> status,
      Value<String> pickupWindow,
      Value<String?> qrCode,
      Value<DateTime> createdAt,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });

class $$CachedReservationsTableFilterComposer
    extends Composer<_$AppDatabase, $CachedReservationsTable> {
  $$CachedReservationsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get basketId => $composableBuilder(
    column: $table.basketId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get basketName => $composableBuilder(
    column: $table.basketName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get storeName => $composableBuilder(
    column: $table.storeName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get pickupWindow => $composableBuilder(
    column: $table.pickupWindow,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get qrCode => $composableBuilder(
    column: $table.qrCode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedReservationsTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedReservationsTable> {
  $$CachedReservationsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get basketId => $composableBuilder(
    column: $table.basketId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get basketName => $composableBuilder(
    column: $table.basketName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get storeName => $composableBuilder(
    column: $table.storeName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get pickupWindow => $composableBuilder(
    column: $table.pickupWindow,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get qrCode => $composableBuilder(
    column: $table.qrCode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedReservationsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedReservationsTable> {
  $$CachedReservationsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get basketId =>
      $composableBuilder(column: $table.basketId, builder: (column) => column);

  GeneratedColumn<String> get basketName => $composableBuilder(
    column: $table.basketName,
    builder: (column) => column,
  );

  GeneratedColumn<String> get storeName =>
      $composableBuilder(column: $table.storeName, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get pickupWindow => $composableBuilder(
    column: $table.pickupWindow,
    builder: (column) => column,
  );

  GeneratedColumn<String> get qrCode =>
      $composableBuilder(column: $table.qrCode, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedReservationsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedReservationsTable,
          CachedReservation,
          $$CachedReservationsTableFilterComposer,
          $$CachedReservationsTableOrderingComposer,
          $$CachedReservationsTableAnnotationComposer,
          $$CachedReservationsTableCreateCompanionBuilder,
          $$CachedReservationsTableUpdateCompanionBuilder,
          (
            CachedReservation,
            BaseReferences<
              _$AppDatabase,
              $CachedReservationsTable,
              CachedReservation
            >,
          ),
          CachedReservation,
          PrefetchHooks Function()
        > {
  $$CachedReservationsTableTableManager(
    _$AppDatabase db,
    $CachedReservationsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedReservationsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedReservationsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedReservationsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> basketId = const Value.absent(),
                Value<String> basketName = const Value.absent(),
                Value<String> storeName = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String> pickupWindow = const Value.absent(),
                Value<String?> qrCode = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedReservationsCompanion(
                id: id,
                basketId: basketId,
                basketName: basketName,
                storeName: storeName,
                status: status,
                pickupWindow: pickupWindow,
                qrCode: qrCode,
                createdAt: createdAt,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String basketId,
                required String basketName,
                required String storeName,
                required String status,
                required String pickupWindow,
                Value<String?> qrCode = const Value.absent(),
                required DateTime createdAt,
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedReservationsCompanion.insert(
                id: id,
                basketId: basketId,
                basketName: basketName,
                storeName: storeName,
                status: status,
                pickupWindow: pickupWindow,
                qrCode: qrCode,
                createdAt: createdAt,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedReservationsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedReservationsTable,
      CachedReservation,
      $$CachedReservationsTableFilterComposer,
      $$CachedReservationsTableOrderingComposer,
      $$CachedReservationsTableAnnotationComposer,
      $$CachedReservationsTableCreateCompanionBuilder,
      $$CachedReservationsTableUpdateCompanionBuilder,
      (
        CachedReservation,
        BaseReferences<
          _$AppDatabase,
          $CachedReservationsTable,
          CachedReservation
        >,
      ),
      CachedReservation,
      PrefetchHooks Function()
    >;
typedef $$OfflineActionQueueTableCreateCompanionBuilder =
    OfflineActionQueueCompanion Function({
      Value<int> id,
      required String actionType,
      required String payload,
      Value<String> status,
      Value<DateTime> createdAt,
      Value<int> retryCount,
    });
typedef $$OfflineActionQueueTableUpdateCompanionBuilder =
    OfflineActionQueueCompanion Function({
      Value<int> id,
      Value<String> actionType,
      Value<String> payload,
      Value<String> status,
      Value<DateTime> createdAt,
      Value<int> retryCount,
    });

class $$OfflineActionQueueTableFilterComposer
    extends Composer<_$AppDatabase, $OfflineActionQueueTable> {
  $$OfflineActionQueueTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get actionType => $composableBuilder(
    column: $table.actionType,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => ColumnFilters(column),
  );
}

class $$OfflineActionQueueTableOrderingComposer
    extends Composer<_$AppDatabase, $OfflineActionQueueTable> {
  $$OfflineActionQueueTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get actionType => $composableBuilder(
    column: $table.actionType,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$OfflineActionQueueTableAnnotationComposer
    extends Composer<_$AppDatabase, $OfflineActionQueueTable> {
  $$OfflineActionQueueTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get actionType => $composableBuilder(
    column: $table.actionType,
    builder: (column) => column,
  );

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => column,
  );
}

class $$OfflineActionQueueTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $OfflineActionQueueTable,
          OfflineActionQueueData,
          $$OfflineActionQueueTableFilterComposer,
          $$OfflineActionQueueTableOrderingComposer,
          $$OfflineActionQueueTableAnnotationComposer,
          $$OfflineActionQueueTableCreateCompanionBuilder,
          $$OfflineActionQueueTableUpdateCompanionBuilder,
          (
            OfflineActionQueueData,
            BaseReferences<
              _$AppDatabase,
              $OfflineActionQueueTable,
              OfflineActionQueueData
            >,
          ),
          OfflineActionQueueData,
          PrefetchHooks Function()
        > {
  $$OfflineActionQueueTableTableManager(
    _$AppDatabase db,
    $OfflineActionQueueTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineActionQueueTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineActionQueueTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineActionQueueTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> actionType = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<int> retryCount = const Value.absent(),
              }) => OfflineActionQueueCompanion(
                id: id,
                actionType: actionType,
                payload: payload,
                status: status,
                createdAt: createdAt,
                retryCount: retryCount,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String actionType,
                required String payload,
                Value<String> status = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<int> retryCount = const Value.absent(),
              }) => OfflineActionQueueCompanion.insert(
                id: id,
                actionType: actionType,
                payload: payload,
                status: status,
                createdAt: createdAt,
                retryCount: retryCount,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$OfflineActionQueueTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $OfflineActionQueueTable,
      OfflineActionQueueData,
      $$OfflineActionQueueTableFilterComposer,
      $$OfflineActionQueueTableOrderingComposer,
      $$OfflineActionQueueTableAnnotationComposer,
      $$OfflineActionQueueTableCreateCompanionBuilder,
      $$OfflineActionQueueTableUpdateCompanionBuilder,
      (
        OfflineActionQueueData,
        BaseReferences<
          _$AppDatabase,
          $OfflineActionQueueTable,
          OfflineActionQueueData
        >,
      ),
      OfflineActionQueueData,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$CachedStoresTableTableManager get cachedStores =>
      $$CachedStoresTableTableManager(_db, _db.cachedStores);
  $$CachedBasketsTableTableManager get cachedBaskets =>
      $$CachedBasketsTableTableManager(_db, _db.cachedBaskets);
  $$CachedReservationsTableTableManager get cachedReservations =>
      $$CachedReservationsTableTableManager(_db, _db.cachedReservations);
  $$OfflineActionQueueTableTableManager get offlineActionQueue =>
      $$OfflineActionQueueTableTableManager(_db, _db.offlineActionQueue);
}
