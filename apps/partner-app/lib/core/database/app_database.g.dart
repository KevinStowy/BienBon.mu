// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $CachedPartnerStoresTable extends CachedPartnerStores
    with TableInfo<$CachedPartnerStoresTable, CachedPartnerStore> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedPartnerStoresTable(this.attachedDatabase, [this._alias]);
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
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _activeBasketCountMeta = const VerificationMeta(
    'activeBasketCount',
  );
  @override
  late final GeneratedColumn<int> activeBasketCount = GeneratedColumn<int>(
    'active_basket_count',
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
    address,
    status,
    activeBasketCount,
    cachedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_partner_stores';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedPartnerStore> instance, {
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
    if (data.containsKey('address')) {
      context.handle(
        _addressMeta,
        address.isAcceptableOrUnknown(data['address']!, _addressMeta),
      );
    } else if (isInserting) {
      context.missing(_addressMeta);
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    } else if (isInserting) {
      context.missing(_statusMeta);
    }
    if (data.containsKey('active_basket_count')) {
      context.handle(
        _activeBasketCountMeta,
        activeBasketCount.isAcceptableOrUnknown(
          data['active_basket_count']!,
          _activeBasketCountMeta,
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
  CachedPartnerStore map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedPartnerStore(
      id:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}id'],
          )!,
      name:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}name'],
          )!,
      category:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}category'],
          )!,
      address:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}address'],
          )!,
      status:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}status'],
          )!,
      activeBasketCount:
          attachedDatabase.typeMapping.read(
            DriftSqlType.int,
            data['${effectivePrefix}active_basket_count'],
          )!,
      cachedAt:
          attachedDatabase.typeMapping.read(
            DriftSqlType.dateTime,
            data['${effectivePrefix}cached_at'],
          )!,
    );
  }

  @override
  $CachedPartnerStoresTable createAlias(String alias) {
    return $CachedPartnerStoresTable(attachedDatabase, alias);
  }
}

class CachedPartnerStore extends DataClass
    implements Insertable<CachedPartnerStore> {
  final String id;
  final String name;
  final String category;
  final String address;
  final String status;

  /// Number of active baskets currently published for this store.
  final int activeBasketCount;
  final DateTime cachedAt;
  const CachedPartnerStore({
    required this.id,
    required this.name,
    required this.category,
    required this.address,
    required this.status,
    required this.activeBasketCount,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    map['category'] = Variable<String>(category);
    map['address'] = Variable<String>(address);
    map['status'] = Variable<String>(status);
    map['active_basket_count'] = Variable<int>(activeBasketCount);
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  CachedPartnerStoresCompanion toCompanion(bool nullToAbsent) {
    return CachedPartnerStoresCompanion(
      id: Value(id),
      name: Value(name),
      category: Value(category),
      address: Value(address),
      status: Value(status),
      activeBasketCount: Value(activeBasketCount),
      cachedAt: Value(cachedAt),
    );
  }

  factory CachedPartnerStore.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedPartnerStore(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      category: serializer.fromJson<String>(json['category']),
      address: serializer.fromJson<String>(json['address']),
      status: serializer.fromJson<String>(json['status']),
      activeBasketCount: serializer.fromJson<int>(json['activeBasketCount']),
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
      'address': serializer.toJson<String>(address),
      'status': serializer.toJson<String>(status),
      'activeBasketCount': serializer.toJson<int>(activeBasketCount),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  CachedPartnerStore copyWith({
    String? id,
    String? name,
    String? category,
    String? address,
    String? status,
    int? activeBasketCount,
    DateTime? cachedAt,
  }) => CachedPartnerStore(
    id: id ?? this.id,
    name: name ?? this.name,
    category: category ?? this.category,
    address: address ?? this.address,
    status: status ?? this.status,
    activeBasketCount: activeBasketCount ?? this.activeBasketCount,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  CachedPartnerStore copyWithCompanion(CachedPartnerStoresCompanion data) {
    return CachedPartnerStore(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      category: data.category.present ? data.category.value : this.category,
      address: data.address.present ? data.address.value : this.address,
      status: data.status.present ? data.status.value : this.status,
      activeBasketCount:
          data.activeBasketCount.present
              ? data.activeBasketCount.value
              : this.activeBasketCount,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedPartnerStore(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('category: $category, ')
          ..write('address: $address, ')
          ..write('status: $status, ')
          ..write('activeBasketCount: $activeBasketCount, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    name,
    category,
    address,
    status,
    activeBasketCount,
    cachedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedPartnerStore &&
          other.id == this.id &&
          other.name == this.name &&
          other.category == this.category &&
          other.address == this.address &&
          other.status == this.status &&
          other.activeBasketCount == this.activeBasketCount &&
          other.cachedAt == this.cachedAt);
}

class CachedPartnerStoresCompanion extends UpdateCompanion<CachedPartnerStore> {
  final Value<String> id;
  final Value<String> name;
  final Value<String> category;
  final Value<String> address;
  final Value<String> status;
  final Value<int> activeBasketCount;
  final Value<DateTime> cachedAt;
  final Value<int> rowid;
  const CachedPartnerStoresCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.category = const Value.absent(),
    this.address = const Value.absent(),
    this.status = const Value.absent(),
    this.activeBasketCount = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedPartnerStoresCompanion.insert({
    required String id,
    required String name,
    required String category,
    required String address,
    required String status,
    this.activeBasketCount = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       category = Value(category),
       address = Value(address),
       status = Value(status);
  static Insertable<CachedPartnerStore> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? category,
    Expression<String>? address,
    Expression<String>? status,
    Expression<int>? activeBasketCount,
    Expression<DateTime>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (category != null) 'category': category,
      if (address != null) 'address': address,
      if (status != null) 'status': status,
      if (activeBasketCount != null) 'active_basket_count': activeBasketCount,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedPartnerStoresCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String>? category,
    Value<String>? address,
    Value<String>? status,
    Value<int>? activeBasketCount,
    Value<DateTime>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedPartnerStoresCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      address: address ?? this.address,
      status: status ?? this.status,
      activeBasketCount: activeBasketCount ?? this.activeBasketCount,
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
    if (address.present) {
      map['address'] = Variable<String>(address.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (activeBasketCount.present) {
      map['active_basket_count'] = Variable<int>(activeBasketCount.value);
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
    return (StringBuffer('CachedPartnerStoresCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('category: $category, ')
          ..write('address: $address, ')
          ..write('status: $status, ')
          ..write('activeBasketCount: $activeBasketCount, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedPartnerBasketsTable extends CachedPartnerBaskets
    with TableInfo<$CachedPartnerBasketsTable, CachedPartnerBasket> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedPartnerBasketsTable(this.attachedDatabase, [this._alias]);
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
  static const VerificationMeta _totalStockMeta = const VerificationMeta(
    'totalStock',
  );
  @override
  late final GeneratedColumn<int> totalStock = GeneratedColumn<int>(
    'total_stock',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _remainingStockMeta = const VerificationMeta(
    'remainingStock',
  );
  @override
  late final GeneratedColumn<int> remainingStock = GeneratedColumn<int>(
    'remaining_stock',
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
    storeId,
    name,
    originalPrice,
    discountedPrice,
    pickupWindow,
    totalStock,
    remainingStock,
    status,
    cachedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_partner_baskets';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedPartnerBasket> instance, {
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
    if (data.containsKey('total_stock')) {
      context.handle(
        _totalStockMeta,
        totalStock.isAcceptableOrUnknown(data['total_stock']!, _totalStockMeta),
      );
    } else if (isInserting) {
      context.missing(_totalStockMeta);
    }
    if (data.containsKey('remaining_stock')) {
      context.handle(
        _remainingStockMeta,
        remainingStock.isAcceptableOrUnknown(
          data['remaining_stock']!,
          _remainingStockMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_remainingStockMeta);
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    } else if (isInserting) {
      context.missing(_statusMeta);
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
  CachedPartnerBasket map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedPartnerBasket(
      id:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}id'],
          )!,
      storeId:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}store_id'],
          )!,
      name:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}name'],
          )!,
      originalPrice:
          attachedDatabase.typeMapping.read(
            DriftSqlType.double,
            data['${effectivePrefix}original_price'],
          )!,
      discountedPrice:
          attachedDatabase.typeMapping.read(
            DriftSqlType.double,
            data['${effectivePrefix}discounted_price'],
          )!,
      pickupWindow:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}pickup_window'],
          )!,
      totalStock:
          attachedDatabase.typeMapping.read(
            DriftSqlType.int,
            data['${effectivePrefix}total_stock'],
          )!,
      remainingStock:
          attachedDatabase.typeMapping.read(
            DriftSqlType.int,
            data['${effectivePrefix}remaining_stock'],
          )!,
      status:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}status'],
          )!,
      cachedAt:
          attachedDatabase.typeMapping.read(
            DriftSqlType.dateTime,
            data['${effectivePrefix}cached_at'],
          )!,
    );
  }

  @override
  $CachedPartnerBasketsTable createAlias(String alias) {
    return $CachedPartnerBasketsTable(attachedDatabase, alias);
  }
}

class CachedPartnerBasket extends DataClass
    implements Insertable<CachedPartnerBasket> {
  final String id;
  final String storeId;
  final String name;
  final double originalPrice;
  final double discountedPrice;

  /// Serialised as an ISO-8601 interval string.
  final String pickupWindow;
  final int totalStock;
  final int remainingStock;
  final String status;
  final DateTime cachedAt;
  const CachedPartnerBasket({
    required this.id,
    required this.storeId,
    required this.name,
    required this.originalPrice,
    required this.discountedPrice,
    required this.pickupWindow,
    required this.totalStock,
    required this.remainingStock,
    required this.status,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['store_id'] = Variable<String>(storeId);
    map['name'] = Variable<String>(name);
    map['original_price'] = Variable<double>(originalPrice);
    map['discounted_price'] = Variable<double>(discountedPrice);
    map['pickup_window'] = Variable<String>(pickupWindow);
    map['total_stock'] = Variable<int>(totalStock);
    map['remaining_stock'] = Variable<int>(remainingStock);
    map['status'] = Variable<String>(status);
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  CachedPartnerBasketsCompanion toCompanion(bool nullToAbsent) {
    return CachedPartnerBasketsCompanion(
      id: Value(id),
      storeId: Value(storeId),
      name: Value(name),
      originalPrice: Value(originalPrice),
      discountedPrice: Value(discountedPrice),
      pickupWindow: Value(pickupWindow),
      totalStock: Value(totalStock),
      remainingStock: Value(remainingStock),
      status: Value(status),
      cachedAt: Value(cachedAt),
    );
  }

  factory CachedPartnerBasket.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedPartnerBasket(
      id: serializer.fromJson<String>(json['id']),
      storeId: serializer.fromJson<String>(json['storeId']),
      name: serializer.fromJson<String>(json['name']),
      originalPrice: serializer.fromJson<double>(json['originalPrice']),
      discountedPrice: serializer.fromJson<double>(json['discountedPrice']),
      pickupWindow: serializer.fromJson<String>(json['pickupWindow']),
      totalStock: serializer.fromJson<int>(json['totalStock']),
      remainingStock: serializer.fromJson<int>(json['remainingStock']),
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
      'originalPrice': serializer.toJson<double>(originalPrice),
      'discountedPrice': serializer.toJson<double>(discountedPrice),
      'pickupWindow': serializer.toJson<String>(pickupWindow),
      'totalStock': serializer.toJson<int>(totalStock),
      'remainingStock': serializer.toJson<int>(remainingStock),
      'status': serializer.toJson<String>(status),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  CachedPartnerBasket copyWith({
    String? id,
    String? storeId,
    String? name,
    double? originalPrice,
    double? discountedPrice,
    String? pickupWindow,
    int? totalStock,
    int? remainingStock,
    String? status,
    DateTime? cachedAt,
  }) => CachedPartnerBasket(
    id: id ?? this.id,
    storeId: storeId ?? this.storeId,
    name: name ?? this.name,
    originalPrice: originalPrice ?? this.originalPrice,
    discountedPrice: discountedPrice ?? this.discountedPrice,
    pickupWindow: pickupWindow ?? this.pickupWindow,
    totalStock: totalStock ?? this.totalStock,
    remainingStock: remainingStock ?? this.remainingStock,
    status: status ?? this.status,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  CachedPartnerBasket copyWithCompanion(CachedPartnerBasketsCompanion data) {
    return CachedPartnerBasket(
      id: data.id.present ? data.id.value : this.id,
      storeId: data.storeId.present ? data.storeId.value : this.storeId,
      name: data.name.present ? data.name.value : this.name,
      originalPrice:
          data.originalPrice.present
              ? data.originalPrice.value
              : this.originalPrice,
      discountedPrice:
          data.discountedPrice.present
              ? data.discountedPrice.value
              : this.discountedPrice,
      pickupWindow:
          data.pickupWindow.present
              ? data.pickupWindow.value
              : this.pickupWindow,
      totalStock:
          data.totalStock.present ? data.totalStock.value : this.totalStock,
      remainingStock:
          data.remainingStock.present
              ? data.remainingStock.value
              : this.remainingStock,
      status: data.status.present ? data.status.value : this.status,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedPartnerBasket(')
          ..write('id: $id, ')
          ..write('storeId: $storeId, ')
          ..write('name: $name, ')
          ..write('originalPrice: $originalPrice, ')
          ..write('discountedPrice: $discountedPrice, ')
          ..write('pickupWindow: $pickupWindow, ')
          ..write('totalStock: $totalStock, ')
          ..write('remainingStock: $remainingStock, ')
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
    originalPrice,
    discountedPrice,
    pickupWindow,
    totalStock,
    remainingStock,
    status,
    cachedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedPartnerBasket &&
          other.id == this.id &&
          other.storeId == this.storeId &&
          other.name == this.name &&
          other.originalPrice == this.originalPrice &&
          other.discountedPrice == this.discountedPrice &&
          other.pickupWindow == this.pickupWindow &&
          other.totalStock == this.totalStock &&
          other.remainingStock == this.remainingStock &&
          other.status == this.status &&
          other.cachedAt == this.cachedAt);
}

class CachedPartnerBasketsCompanion
    extends UpdateCompanion<CachedPartnerBasket> {
  final Value<String> id;
  final Value<String> storeId;
  final Value<String> name;
  final Value<double> originalPrice;
  final Value<double> discountedPrice;
  final Value<String> pickupWindow;
  final Value<int> totalStock;
  final Value<int> remainingStock;
  final Value<String> status;
  final Value<DateTime> cachedAt;
  final Value<int> rowid;
  const CachedPartnerBasketsCompanion({
    this.id = const Value.absent(),
    this.storeId = const Value.absent(),
    this.name = const Value.absent(),
    this.originalPrice = const Value.absent(),
    this.discountedPrice = const Value.absent(),
    this.pickupWindow = const Value.absent(),
    this.totalStock = const Value.absent(),
    this.remainingStock = const Value.absent(),
    this.status = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedPartnerBasketsCompanion.insert({
    required String id,
    required String storeId,
    required String name,
    required double originalPrice,
    required double discountedPrice,
    required String pickupWindow,
    required int totalStock,
    required int remainingStock,
    required String status,
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       storeId = Value(storeId),
       name = Value(name),
       originalPrice = Value(originalPrice),
       discountedPrice = Value(discountedPrice),
       pickupWindow = Value(pickupWindow),
       totalStock = Value(totalStock),
       remainingStock = Value(remainingStock),
       status = Value(status);
  static Insertable<CachedPartnerBasket> custom({
    Expression<String>? id,
    Expression<String>? storeId,
    Expression<String>? name,
    Expression<double>? originalPrice,
    Expression<double>? discountedPrice,
    Expression<String>? pickupWindow,
    Expression<int>? totalStock,
    Expression<int>? remainingStock,
    Expression<String>? status,
    Expression<DateTime>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (storeId != null) 'store_id': storeId,
      if (name != null) 'name': name,
      if (originalPrice != null) 'original_price': originalPrice,
      if (discountedPrice != null) 'discounted_price': discountedPrice,
      if (pickupWindow != null) 'pickup_window': pickupWindow,
      if (totalStock != null) 'total_stock': totalStock,
      if (remainingStock != null) 'remaining_stock': remainingStock,
      if (status != null) 'status': status,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedPartnerBasketsCompanion copyWith({
    Value<String>? id,
    Value<String>? storeId,
    Value<String>? name,
    Value<double>? originalPrice,
    Value<double>? discountedPrice,
    Value<String>? pickupWindow,
    Value<int>? totalStock,
    Value<int>? remainingStock,
    Value<String>? status,
    Value<DateTime>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedPartnerBasketsCompanion(
      id: id ?? this.id,
      storeId: storeId ?? this.storeId,
      name: name ?? this.name,
      originalPrice: originalPrice ?? this.originalPrice,
      discountedPrice: discountedPrice ?? this.discountedPrice,
      pickupWindow: pickupWindow ?? this.pickupWindow,
      totalStock: totalStock ?? this.totalStock,
      remainingStock: remainingStock ?? this.remainingStock,
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
    if (originalPrice.present) {
      map['original_price'] = Variable<double>(originalPrice.value);
    }
    if (discountedPrice.present) {
      map['discounted_price'] = Variable<double>(discountedPrice.value);
    }
    if (pickupWindow.present) {
      map['pickup_window'] = Variable<String>(pickupWindow.value);
    }
    if (totalStock.present) {
      map['total_stock'] = Variable<int>(totalStock.value);
    }
    if (remainingStock.present) {
      map['remaining_stock'] = Variable<int>(remainingStock.value);
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
    return (StringBuffer('CachedPartnerBasketsCompanion(')
          ..write('id: $id, ')
          ..write('storeId: $storeId, ')
          ..write('name: $name, ')
          ..write('originalPrice: $originalPrice, ')
          ..write('discountedPrice: $discountedPrice, ')
          ..write('pickupWindow: $pickupWindow, ')
          ..write('totalStock: $totalStock, ')
          ..write('remainingStock: $remainingStock, ')
          ..write('status: $status, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedPartnerReservationsTable extends CachedPartnerReservations
    with TableInfo<$CachedPartnerReservationsTable, CachedPartnerReservation> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedPartnerReservationsTable(this.attachedDatabase, [this._alias]);
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
  static const VerificationMeta _consumerNameMeta = const VerificationMeta(
    'consumerName',
  );
  @override
  late final GeneratedColumn<String> consumerName = GeneratedColumn<String>(
    'consumer_name',
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
  static const VerificationMeta _reservedAtMeta = const VerificationMeta(
    'reservedAt',
  );
  @override
  late final GeneratedColumn<DateTime> reservedAt = GeneratedColumn<DateTime>(
    'reserved_at',
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
    consumerName,
    qrCode,
    status,
    pickupWindow,
    reservedAt,
    cachedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_partner_reservations';
  @override
  VerificationContext validateIntegrity(
    Insertable<CachedPartnerReservation> instance, {
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
    if (data.containsKey('consumer_name')) {
      context.handle(
        _consumerNameMeta,
        consumerName.isAcceptableOrUnknown(
          data['consumer_name']!,
          _consumerNameMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_consumerNameMeta);
    }
    if (data.containsKey('qr_code')) {
      context.handle(
        _qrCodeMeta,
        qrCode.isAcceptableOrUnknown(data['qr_code']!, _qrCodeMeta),
      );
    } else if (isInserting) {
      context.missing(_qrCodeMeta);
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
    if (data.containsKey('reserved_at')) {
      context.handle(
        _reservedAtMeta,
        reservedAt.isAcceptableOrUnknown(data['reserved_at']!, _reservedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_reservedAtMeta);
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
  CachedPartnerReservation map(
    Map<String, dynamic> data, {
    String? tablePrefix,
  }) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedPartnerReservation(
      id:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}id'],
          )!,
      basketId:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}basket_id'],
          )!,
      basketName:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}basket_name'],
          )!,
      consumerName:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}consumer_name'],
          )!,
      qrCode:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}qr_code'],
          )!,
      status:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}status'],
          )!,
      pickupWindow:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}pickup_window'],
          )!,
      reservedAt:
          attachedDatabase.typeMapping.read(
            DriftSqlType.dateTime,
            data['${effectivePrefix}reserved_at'],
          )!,
      cachedAt:
          attachedDatabase.typeMapping.read(
            DriftSqlType.dateTime,
            data['${effectivePrefix}cached_at'],
          )!,
    );
  }

  @override
  $CachedPartnerReservationsTable createAlias(String alias) {
    return $CachedPartnerReservationsTable(attachedDatabase, alias);
  }
}

class CachedPartnerReservation extends DataClass
    implements Insertable<CachedPartnerReservation> {
  final String id;
  final String basketId;
  final String basketName;
  final String consumerName;

  /// QR code payload used for offline matching; stored so the scanner can
  /// validate the code even with no internet connection.
  final String qrCode;
  final String status;
  final String pickupWindow;
  final DateTime reservedAt;
  final DateTime cachedAt;
  const CachedPartnerReservation({
    required this.id,
    required this.basketId,
    required this.basketName,
    required this.consumerName,
    required this.qrCode,
    required this.status,
    required this.pickupWindow,
    required this.reservedAt,
    required this.cachedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['basket_id'] = Variable<String>(basketId);
    map['basket_name'] = Variable<String>(basketName);
    map['consumer_name'] = Variable<String>(consumerName);
    map['qr_code'] = Variable<String>(qrCode);
    map['status'] = Variable<String>(status);
    map['pickup_window'] = Variable<String>(pickupWindow);
    map['reserved_at'] = Variable<DateTime>(reservedAt);
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  CachedPartnerReservationsCompanion toCompanion(bool nullToAbsent) {
    return CachedPartnerReservationsCompanion(
      id: Value(id),
      basketId: Value(basketId),
      basketName: Value(basketName),
      consumerName: Value(consumerName),
      qrCode: Value(qrCode),
      status: Value(status),
      pickupWindow: Value(pickupWindow),
      reservedAt: Value(reservedAt),
      cachedAt: Value(cachedAt),
    );
  }

  factory CachedPartnerReservation.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedPartnerReservation(
      id: serializer.fromJson<String>(json['id']),
      basketId: serializer.fromJson<String>(json['basketId']),
      basketName: serializer.fromJson<String>(json['basketName']),
      consumerName: serializer.fromJson<String>(json['consumerName']),
      qrCode: serializer.fromJson<String>(json['qrCode']),
      status: serializer.fromJson<String>(json['status']),
      pickupWindow: serializer.fromJson<String>(json['pickupWindow']),
      reservedAt: serializer.fromJson<DateTime>(json['reservedAt']),
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
      'consumerName': serializer.toJson<String>(consumerName),
      'qrCode': serializer.toJson<String>(qrCode),
      'status': serializer.toJson<String>(status),
      'pickupWindow': serializer.toJson<String>(pickupWindow),
      'reservedAt': serializer.toJson<DateTime>(reservedAt),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  CachedPartnerReservation copyWith({
    String? id,
    String? basketId,
    String? basketName,
    String? consumerName,
    String? qrCode,
    String? status,
    String? pickupWindow,
    DateTime? reservedAt,
    DateTime? cachedAt,
  }) => CachedPartnerReservation(
    id: id ?? this.id,
    basketId: basketId ?? this.basketId,
    basketName: basketName ?? this.basketName,
    consumerName: consumerName ?? this.consumerName,
    qrCode: qrCode ?? this.qrCode,
    status: status ?? this.status,
    pickupWindow: pickupWindow ?? this.pickupWindow,
    reservedAt: reservedAt ?? this.reservedAt,
    cachedAt: cachedAt ?? this.cachedAt,
  );
  CachedPartnerReservation copyWithCompanion(
    CachedPartnerReservationsCompanion data,
  ) {
    return CachedPartnerReservation(
      id: data.id.present ? data.id.value : this.id,
      basketId: data.basketId.present ? data.basketId.value : this.basketId,
      basketName:
          data.basketName.present ? data.basketName.value : this.basketName,
      consumerName:
          data.consumerName.present
              ? data.consumerName.value
              : this.consumerName,
      qrCode: data.qrCode.present ? data.qrCode.value : this.qrCode,
      status: data.status.present ? data.status.value : this.status,
      pickupWindow:
          data.pickupWindow.present
              ? data.pickupWindow.value
              : this.pickupWindow,
      reservedAt:
          data.reservedAt.present ? data.reservedAt.value : this.reservedAt,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedPartnerReservation(')
          ..write('id: $id, ')
          ..write('basketId: $basketId, ')
          ..write('basketName: $basketName, ')
          ..write('consumerName: $consumerName, ')
          ..write('qrCode: $qrCode, ')
          ..write('status: $status, ')
          ..write('pickupWindow: $pickupWindow, ')
          ..write('reservedAt: $reservedAt, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    basketId,
    basketName,
    consumerName,
    qrCode,
    status,
    pickupWindow,
    reservedAt,
    cachedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedPartnerReservation &&
          other.id == this.id &&
          other.basketId == this.basketId &&
          other.basketName == this.basketName &&
          other.consumerName == this.consumerName &&
          other.qrCode == this.qrCode &&
          other.status == this.status &&
          other.pickupWindow == this.pickupWindow &&
          other.reservedAt == this.reservedAt &&
          other.cachedAt == this.cachedAt);
}

class CachedPartnerReservationsCompanion
    extends UpdateCompanion<CachedPartnerReservation> {
  final Value<String> id;
  final Value<String> basketId;
  final Value<String> basketName;
  final Value<String> consumerName;
  final Value<String> qrCode;
  final Value<String> status;
  final Value<String> pickupWindow;
  final Value<DateTime> reservedAt;
  final Value<DateTime> cachedAt;
  final Value<int> rowid;
  const CachedPartnerReservationsCompanion({
    this.id = const Value.absent(),
    this.basketId = const Value.absent(),
    this.basketName = const Value.absent(),
    this.consumerName = const Value.absent(),
    this.qrCode = const Value.absent(),
    this.status = const Value.absent(),
    this.pickupWindow = const Value.absent(),
    this.reservedAt = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedPartnerReservationsCompanion.insert({
    required String id,
    required String basketId,
    required String basketName,
    required String consumerName,
    required String qrCode,
    required String status,
    required String pickupWindow,
    required DateTime reservedAt,
    this.cachedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       basketId = Value(basketId),
       basketName = Value(basketName),
       consumerName = Value(consumerName),
       qrCode = Value(qrCode),
       status = Value(status),
       pickupWindow = Value(pickupWindow),
       reservedAt = Value(reservedAt);
  static Insertable<CachedPartnerReservation> custom({
    Expression<String>? id,
    Expression<String>? basketId,
    Expression<String>? basketName,
    Expression<String>? consumerName,
    Expression<String>? qrCode,
    Expression<String>? status,
    Expression<String>? pickupWindow,
    Expression<DateTime>? reservedAt,
    Expression<DateTime>? cachedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (basketId != null) 'basket_id': basketId,
      if (basketName != null) 'basket_name': basketName,
      if (consumerName != null) 'consumer_name': consumerName,
      if (qrCode != null) 'qr_code': qrCode,
      if (status != null) 'status': status,
      if (pickupWindow != null) 'pickup_window': pickupWindow,
      if (reservedAt != null) 'reserved_at': reservedAt,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedPartnerReservationsCompanion copyWith({
    Value<String>? id,
    Value<String>? basketId,
    Value<String>? basketName,
    Value<String>? consumerName,
    Value<String>? qrCode,
    Value<String>? status,
    Value<String>? pickupWindow,
    Value<DateTime>? reservedAt,
    Value<DateTime>? cachedAt,
    Value<int>? rowid,
  }) {
    return CachedPartnerReservationsCompanion(
      id: id ?? this.id,
      basketId: basketId ?? this.basketId,
      basketName: basketName ?? this.basketName,
      consumerName: consumerName ?? this.consumerName,
      qrCode: qrCode ?? this.qrCode,
      status: status ?? this.status,
      pickupWindow: pickupWindow ?? this.pickupWindow,
      reservedAt: reservedAt ?? this.reservedAt,
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
    if (consumerName.present) {
      map['consumer_name'] = Variable<String>(consumerName.value);
    }
    if (qrCode.present) {
      map['qr_code'] = Variable<String>(qrCode.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (pickupWindow.present) {
      map['pickup_window'] = Variable<String>(pickupWindow.value);
    }
    if (reservedAt.present) {
      map['reserved_at'] = Variable<DateTime>(reservedAt.value);
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
    return (StringBuffer('CachedPartnerReservationsCompanion(')
          ..write('id: $id, ')
          ..write('basketId: $basketId, ')
          ..write('basketName: $basketName, ')
          ..write('consumerName: $consumerName, ')
          ..write('qrCode: $qrCode, ')
          ..write('status: $status, ')
          ..write('pickupWindow: $pickupWindow, ')
          ..write('reservedAt: $reservedAt, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflinePickupQueueTable extends OfflinePickupQueue
    with TableInfo<$OfflinePickupQueueTable, OfflinePickupQueueData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflinePickupQueueTable(this.attachedDatabase, [this._alias]);
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
  static const VerificationMeta _reservationIdMeta = const VerificationMeta(
    'reservationId',
  );
  @override
  late final GeneratedColumn<String> reservationId = GeneratedColumn<String>(
    'reservation_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _qrPayloadMeta = const VerificationMeta(
    'qrPayload',
  );
  @override
  late final GeneratedColumn<String> qrPayload = GeneratedColumn<String>(
    'qr_payload',
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
    reservationId,
    qrPayload,
    status,
    createdAt,
    retryCount,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_pickup_queue';
  @override
  VerificationContext validateIntegrity(
    Insertable<OfflinePickupQueueData> instance, {
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
    if (data.containsKey('reservation_id')) {
      context.handle(
        _reservationIdMeta,
        reservationId.isAcceptableOrUnknown(
          data['reservation_id']!,
          _reservationIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_reservationIdMeta);
    }
    if (data.containsKey('qr_payload')) {
      context.handle(
        _qrPayloadMeta,
        qrPayload.isAcceptableOrUnknown(data['qr_payload']!, _qrPayloadMeta),
      );
    } else if (isInserting) {
      context.missing(_qrPayloadMeta);
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
  OfflinePickupQueueData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflinePickupQueueData(
      id:
          attachedDatabase.typeMapping.read(
            DriftSqlType.int,
            data['${effectivePrefix}id'],
          )!,
      actionType:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}action_type'],
          )!,
      reservationId:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}reservation_id'],
          )!,
      qrPayload:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}qr_payload'],
          )!,
      status:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}status'],
          )!,
      createdAt:
          attachedDatabase.typeMapping.read(
            DriftSqlType.dateTime,
            data['${effectivePrefix}created_at'],
          )!,
      retryCount:
          attachedDatabase.typeMapping.read(
            DriftSqlType.int,
            data['${effectivePrefix}retry_count'],
          )!,
    );
  }

  @override
  $OfflinePickupQueueTable createAlias(String alias) {
    return $OfflinePickupQueueTable(attachedDatabase, alias);
  }
}

class OfflinePickupQueueData extends DataClass
    implements Insertable<OfflinePickupQueueData> {
  final int id;
  final String actionType;
  final String reservationId;
  final String qrPayload;
  final String status;
  final DateTime createdAt;
  final int retryCount;
  const OfflinePickupQueueData({
    required this.id,
    required this.actionType,
    required this.reservationId,
    required this.qrPayload,
    required this.status,
    required this.createdAt,
    required this.retryCount,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['action_type'] = Variable<String>(actionType);
    map['reservation_id'] = Variable<String>(reservationId);
    map['qr_payload'] = Variable<String>(qrPayload);
    map['status'] = Variable<String>(status);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['retry_count'] = Variable<int>(retryCount);
    return map;
  }

  OfflinePickupQueueCompanion toCompanion(bool nullToAbsent) {
    return OfflinePickupQueueCompanion(
      id: Value(id),
      actionType: Value(actionType),
      reservationId: Value(reservationId),
      qrPayload: Value(qrPayload),
      status: Value(status),
      createdAt: Value(createdAt),
      retryCount: Value(retryCount),
    );
  }

  factory OfflinePickupQueueData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflinePickupQueueData(
      id: serializer.fromJson<int>(json['id']),
      actionType: serializer.fromJson<String>(json['actionType']),
      reservationId: serializer.fromJson<String>(json['reservationId']),
      qrPayload: serializer.fromJson<String>(json['qrPayload']),
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
      'reservationId': serializer.toJson<String>(reservationId),
      'qrPayload': serializer.toJson<String>(qrPayload),
      'status': serializer.toJson<String>(status),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'retryCount': serializer.toJson<int>(retryCount),
    };
  }

  OfflinePickupQueueData copyWith({
    int? id,
    String? actionType,
    String? reservationId,
    String? qrPayload,
    String? status,
    DateTime? createdAt,
    int? retryCount,
  }) => OfflinePickupQueueData(
    id: id ?? this.id,
    actionType: actionType ?? this.actionType,
    reservationId: reservationId ?? this.reservationId,
    qrPayload: qrPayload ?? this.qrPayload,
    status: status ?? this.status,
    createdAt: createdAt ?? this.createdAt,
    retryCount: retryCount ?? this.retryCount,
  );
  OfflinePickupQueueData copyWithCompanion(OfflinePickupQueueCompanion data) {
    return OfflinePickupQueueData(
      id: data.id.present ? data.id.value : this.id,
      actionType:
          data.actionType.present ? data.actionType.value : this.actionType,
      reservationId:
          data.reservationId.present
              ? data.reservationId.value
              : this.reservationId,
      qrPayload: data.qrPayload.present ? data.qrPayload.value : this.qrPayload,
      status: data.status.present ? data.status.value : this.status,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      retryCount:
          data.retryCount.present ? data.retryCount.value : this.retryCount,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflinePickupQueueData(')
          ..write('id: $id, ')
          ..write('actionType: $actionType, ')
          ..write('reservationId: $reservationId, ')
          ..write('qrPayload: $qrPayload, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt, ')
          ..write('retryCount: $retryCount')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    actionType,
    reservationId,
    qrPayload,
    status,
    createdAt,
    retryCount,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflinePickupQueueData &&
          other.id == this.id &&
          other.actionType == this.actionType &&
          other.reservationId == this.reservationId &&
          other.qrPayload == this.qrPayload &&
          other.status == this.status &&
          other.createdAt == this.createdAt &&
          other.retryCount == this.retryCount);
}

class OfflinePickupQueueCompanion
    extends UpdateCompanion<OfflinePickupQueueData> {
  final Value<int> id;
  final Value<String> actionType;
  final Value<String> reservationId;
  final Value<String> qrPayload;
  final Value<String> status;
  final Value<DateTime> createdAt;
  final Value<int> retryCount;
  const OfflinePickupQueueCompanion({
    this.id = const Value.absent(),
    this.actionType = const Value.absent(),
    this.reservationId = const Value.absent(),
    this.qrPayload = const Value.absent(),
    this.status = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.retryCount = const Value.absent(),
  });
  OfflinePickupQueueCompanion.insert({
    this.id = const Value.absent(),
    required String actionType,
    required String reservationId,
    required String qrPayload,
    this.status = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.retryCount = const Value.absent(),
  }) : actionType = Value(actionType),
       reservationId = Value(reservationId),
       qrPayload = Value(qrPayload);
  static Insertable<OfflinePickupQueueData> custom({
    Expression<int>? id,
    Expression<String>? actionType,
    Expression<String>? reservationId,
    Expression<String>? qrPayload,
    Expression<String>? status,
    Expression<DateTime>? createdAt,
    Expression<int>? retryCount,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (actionType != null) 'action_type': actionType,
      if (reservationId != null) 'reservation_id': reservationId,
      if (qrPayload != null) 'qr_payload': qrPayload,
      if (status != null) 'status': status,
      if (createdAt != null) 'created_at': createdAt,
      if (retryCount != null) 'retry_count': retryCount,
    });
  }

  OfflinePickupQueueCompanion copyWith({
    Value<int>? id,
    Value<String>? actionType,
    Value<String>? reservationId,
    Value<String>? qrPayload,
    Value<String>? status,
    Value<DateTime>? createdAt,
    Value<int>? retryCount,
  }) {
    return OfflinePickupQueueCompanion(
      id: id ?? this.id,
      actionType: actionType ?? this.actionType,
      reservationId: reservationId ?? this.reservationId,
      qrPayload: qrPayload ?? this.qrPayload,
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
    if (reservationId.present) {
      map['reservation_id'] = Variable<String>(reservationId.value);
    }
    if (qrPayload.present) {
      map['qr_payload'] = Variable<String>(qrPayload.value);
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
    return (StringBuffer('OfflinePickupQueueCompanion(')
          ..write('id: $id, ')
          ..write('actionType: $actionType, ')
          ..write('reservationId: $reservationId, ')
          ..write('qrPayload: $qrPayload, ')
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
  late final $CachedPartnerStoresTable cachedPartnerStores =
      $CachedPartnerStoresTable(this);
  late final $CachedPartnerBasketsTable cachedPartnerBaskets =
      $CachedPartnerBasketsTable(this);
  late final $CachedPartnerReservationsTable cachedPartnerReservations =
      $CachedPartnerReservationsTable(this);
  late final $OfflinePickupQueueTable offlinePickupQueue =
      $OfflinePickupQueueTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    cachedPartnerStores,
    cachedPartnerBaskets,
    cachedPartnerReservations,
    offlinePickupQueue,
  ];
}

typedef $$CachedPartnerStoresTableCreateCompanionBuilder =
    CachedPartnerStoresCompanion Function({
      required String id,
      required String name,
      required String category,
      required String address,
      required String status,
      Value<int> activeBasketCount,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });
typedef $$CachedPartnerStoresTableUpdateCompanionBuilder =
    CachedPartnerStoresCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<String> category,
      Value<String> address,
      Value<String> status,
      Value<int> activeBasketCount,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });

class $$CachedPartnerStoresTableFilterComposer
    extends Composer<_$AppDatabase, $CachedPartnerStoresTable> {
  $$CachedPartnerStoresTableFilterComposer({
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

  ColumnFilters<String> get address => $composableBuilder(
    column: $table.address,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get activeBasketCount => $composableBuilder(
    column: $table.activeBasketCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedPartnerStoresTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedPartnerStoresTable> {
  $$CachedPartnerStoresTableOrderingComposer({
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

  ColumnOrderings<String> get address => $composableBuilder(
    column: $table.address,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get activeBasketCount => $composableBuilder(
    column: $table.activeBasketCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedPartnerStoresTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedPartnerStoresTable> {
  $$CachedPartnerStoresTableAnnotationComposer({
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

  GeneratedColumn<String> get address =>
      $composableBuilder(column: $table.address, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get activeBasketCount => $composableBuilder(
    column: $table.activeBasketCount,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedPartnerStoresTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedPartnerStoresTable,
          CachedPartnerStore,
          $$CachedPartnerStoresTableFilterComposer,
          $$CachedPartnerStoresTableOrderingComposer,
          $$CachedPartnerStoresTableAnnotationComposer,
          $$CachedPartnerStoresTableCreateCompanionBuilder,
          $$CachedPartnerStoresTableUpdateCompanionBuilder,
          (
            CachedPartnerStore,
            BaseReferences<
              _$AppDatabase,
              $CachedPartnerStoresTable,
              CachedPartnerStore
            >,
          ),
          CachedPartnerStore,
          PrefetchHooks Function()
        > {
  $$CachedPartnerStoresTableTableManager(
    _$AppDatabase db,
    $CachedPartnerStoresTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer:
              () => $$CachedPartnerStoresTableFilterComposer(
                $db: db,
                $table: table,
              ),
          createOrderingComposer:
              () => $$CachedPartnerStoresTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer:
              () => $$CachedPartnerStoresTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String> category = const Value.absent(),
                Value<String> address = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<int> activeBasketCount = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedPartnerStoresCompanion(
                id: id,
                name: name,
                category: category,
                address: address,
                status: status,
                activeBasketCount: activeBasketCount,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                required String category,
                required String address,
                required String status,
                Value<int> activeBasketCount = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedPartnerStoresCompanion.insert(
                id: id,
                name: name,
                category: category,
                address: address,
                status: status,
                activeBasketCount: activeBasketCount,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper:
              (p0) =>
                  p0
                      .map(
                        (e) => (
                          e.readTable(table),
                          BaseReferences(db, table, e),
                        ),
                      )
                      .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedPartnerStoresTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedPartnerStoresTable,
      CachedPartnerStore,
      $$CachedPartnerStoresTableFilterComposer,
      $$CachedPartnerStoresTableOrderingComposer,
      $$CachedPartnerStoresTableAnnotationComposer,
      $$CachedPartnerStoresTableCreateCompanionBuilder,
      $$CachedPartnerStoresTableUpdateCompanionBuilder,
      (
        CachedPartnerStore,
        BaseReferences<
          _$AppDatabase,
          $CachedPartnerStoresTable,
          CachedPartnerStore
        >,
      ),
      CachedPartnerStore,
      PrefetchHooks Function()
    >;
typedef $$CachedPartnerBasketsTableCreateCompanionBuilder =
    CachedPartnerBasketsCompanion Function({
      required String id,
      required String storeId,
      required String name,
      required double originalPrice,
      required double discountedPrice,
      required String pickupWindow,
      required int totalStock,
      required int remainingStock,
      required String status,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });
typedef $$CachedPartnerBasketsTableUpdateCompanionBuilder =
    CachedPartnerBasketsCompanion Function({
      Value<String> id,
      Value<String> storeId,
      Value<String> name,
      Value<double> originalPrice,
      Value<double> discountedPrice,
      Value<String> pickupWindow,
      Value<int> totalStock,
      Value<int> remainingStock,
      Value<String> status,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });

class $$CachedPartnerBasketsTableFilterComposer
    extends Composer<_$AppDatabase, $CachedPartnerBasketsTable> {
  $$CachedPartnerBasketsTableFilterComposer({
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

  ColumnFilters<int> get totalStock => $composableBuilder(
    column: $table.totalStock,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get remainingStock => $composableBuilder(
    column: $table.remainingStock,
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

class $$CachedPartnerBasketsTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedPartnerBasketsTable> {
  $$CachedPartnerBasketsTableOrderingComposer({
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

  ColumnOrderings<int> get totalStock => $composableBuilder(
    column: $table.totalStock,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get remainingStock => $composableBuilder(
    column: $table.remainingStock,
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

class $$CachedPartnerBasketsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedPartnerBasketsTable> {
  $$CachedPartnerBasketsTableAnnotationComposer({
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

  GeneratedColumn<int> get totalStock => $composableBuilder(
    column: $table.totalStock,
    builder: (column) => column,
  );

  GeneratedColumn<int> get remainingStock => $composableBuilder(
    column: $table.remainingStock,
    builder: (column) => column,
  );

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedPartnerBasketsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedPartnerBasketsTable,
          CachedPartnerBasket,
          $$CachedPartnerBasketsTableFilterComposer,
          $$CachedPartnerBasketsTableOrderingComposer,
          $$CachedPartnerBasketsTableAnnotationComposer,
          $$CachedPartnerBasketsTableCreateCompanionBuilder,
          $$CachedPartnerBasketsTableUpdateCompanionBuilder,
          (
            CachedPartnerBasket,
            BaseReferences<
              _$AppDatabase,
              $CachedPartnerBasketsTable,
              CachedPartnerBasket
            >,
          ),
          CachedPartnerBasket,
          PrefetchHooks Function()
        > {
  $$CachedPartnerBasketsTableTableManager(
    _$AppDatabase db,
    $CachedPartnerBasketsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer:
              () => $$CachedPartnerBasketsTableFilterComposer(
                $db: db,
                $table: table,
              ),
          createOrderingComposer:
              () => $$CachedPartnerBasketsTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer:
              () => $$CachedPartnerBasketsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> storeId = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<double> originalPrice = const Value.absent(),
                Value<double> discountedPrice = const Value.absent(),
                Value<String> pickupWindow = const Value.absent(),
                Value<int> totalStock = const Value.absent(),
                Value<int> remainingStock = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedPartnerBasketsCompanion(
                id: id,
                storeId: storeId,
                name: name,
                originalPrice: originalPrice,
                discountedPrice: discountedPrice,
                pickupWindow: pickupWindow,
                totalStock: totalStock,
                remainingStock: remainingStock,
                status: status,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String storeId,
                required String name,
                required double originalPrice,
                required double discountedPrice,
                required String pickupWindow,
                required int totalStock,
                required int remainingStock,
                required String status,
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedPartnerBasketsCompanion.insert(
                id: id,
                storeId: storeId,
                name: name,
                originalPrice: originalPrice,
                discountedPrice: discountedPrice,
                pickupWindow: pickupWindow,
                totalStock: totalStock,
                remainingStock: remainingStock,
                status: status,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper:
              (p0) =>
                  p0
                      .map(
                        (e) => (
                          e.readTable(table),
                          BaseReferences(db, table, e),
                        ),
                      )
                      .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedPartnerBasketsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedPartnerBasketsTable,
      CachedPartnerBasket,
      $$CachedPartnerBasketsTableFilterComposer,
      $$CachedPartnerBasketsTableOrderingComposer,
      $$CachedPartnerBasketsTableAnnotationComposer,
      $$CachedPartnerBasketsTableCreateCompanionBuilder,
      $$CachedPartnerBasketsTableUpdateCompanionBuilder,
      (
        CachedPartnerBasket,
        BaseReferences<
          _$AppDatabase,
          $CachedPartnerBasketsTable,
          CachedPartnerBasket
        >,
      ),
      CachedPartnerBasket,
      PrefetchHooks Function()
    >;
typedef $$CachedPartnerReservationsTableCreateCompanionBuilder =
    CachedPartnerReservationsCompanion Function({
      required String id,
      required String basketId,
      required String basketName,
      required String consumerName,
      required String qrCode,
      required String status,
      required String pickupWindow,
      required DateTime reservedAt,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });
typedef $$CachedPartnerReservationsTableUpdateCompanionBuilder =
    CachedPartnerReservationsCompanion Function({
      Value<String> id,
      Value<String> basketId,
      Value<String> basketName,
      Value<String> consumerName,
      Value<String> qrCode,
      Value<String> status,
      Value<String> pickupWindow,
      Value<DateTime> reservedAt,
      Value<DateTime> cachedAt,
      Value<int> rowid,
    });

class $$CachedPartnerReservationsTableFilterComposer
    extends Composer<_$AppDatabase, $CachedPartnerReservationsTable> {
  $$CachedPartnerReservationsTableFilterComposer({
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

  ColumnFilters<String> get consumerName => $composableBuilder(
    column: $table.consumerName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get qrCode => $composableBuilder(
    column: $table.qrCode,
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

  ColumnFilters<DateTime> get reservedAt => $composableBuilder(
    column: $table.reservedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CachedPartnerReservationsTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedPartnerReservationsTable> {
  $$CachedPartnerReservationsTableOrderingComposer({
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

  ColumnOrderings<String> get consumerName => $composableBuilder(
    column: $table.consumerName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get qrCode => $composableBuilder(
    column: $table.qrCode,
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

  ColumnOrderings<DateTime> get reservedAt => $composableBuilder(
    column: $table.reservedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
    column: $table.cachedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CachedPartnerReservationsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedPartnerReservationsTable> {
  $$CachedPartnerReservationsTableAnnotationComposer({
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

  GeneratedColumn<String> get consumerName => $composableBuilder(
    column: $table.consumerName,
    builder: (column) => column,
  );

  GeneratedColumn<String> get qrCode =>
      $composableBuilder(column: $table.qrCode, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get pickupWindow => $composableBuilder(
    column: $table.pickupWindow,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get reservedAt => $composableBuilder(
    column: $table.reservedAt,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$CachedPartnerReservationsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CachedPartnerReservationsTable,
          CachedPartnerReservation,
          $$CachedPartnerReservationsTableFilterComposer,
          $$CachedPartnerReservationsTableOrderingComposer,
          $$CachedPartnerReservationsTableAnnotationComposer,
          $$CachedPartnerReservationsTableCreateCompanionBuilder,
          $$CachedPartnerReservationsTableUpdateCompanionBuilder,
          (
            CachedPartnerReservation,
            BaseReferences<
              _$AppDatabase,
              $CachedPartnerReservationsTable,
              CachedPartnerReservation
            >,
          ),
          CachedPartnerReservation,
          PrefetchHooks Function()
        > {
  $$CachedPartnerReservationsTableTableManager(
    _$AppDatabase db,
    $CachedPartnerReservationsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer:
              () => $$CachedPartnerReservationsTableFilterComposer(
                $db: db,
                $table: table,
              ),
          createOrderingComposer:
              () => $$CachedPartnerReservationsTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer:
              () => $$CachedPartnerReservationsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> basketId = const Value.absent(),
                Value<String> basketName = const Value.absent(),
                Value<String> consumerName = const Value.absent(),
                Value<String> qrCode = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String> pickupWindow = const Value.absent(),
                Value<DateTime> reservedAt = const Value.absent(),
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedPartnerReservationsCompanion(
                id: id,
                basketId: basketId,
                basketName: basketName,
                consumerName: consumerName,
                qrCode: qrCode,
                status: status,
                pickupWindow: pickupWindow,
                reservedAt: reservedAt,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String basketId,
                required String basketName,
                required String consumerName,
                required String qrCode,
                required String status,
                required String pickupWindow,
                required DateTime reservedAt,
                Value<DateTime> cachedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CachedPartnerReservationsCompanion.insert(
                id: id,
                basketId: basketId,
                basketName: basketName,
                consumerName: consumerName,
                qrCode: qrCode,
                status: status,
                pickupWindow: pickupWindow,
                reservedAt: reservedAt,
                cachedAt: cachedAt,
                rowid: rowid,
              ),
          withReferenceMapper:
              (p0) =>
                  p0
                      .map(
                        (e) => (
                          e.readTable(table),
                          BaseReferences(db, table, e),
                        ),
                      )
                      .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CachedPartnerReservationsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CachedPartnerReservationsTable,
      CachedPartnerReservation,
      $$CachedPartnerReservationsTableFilterComposer,
      $$CachedPartnerReservationsTableOrderingComposer,
      $$CachedPartnerReservationsTableAnnotationComposer,
      $$CachedPartnerReservationsTableCreateCompanionBuilder,
      $$CachedPartnerReservationsTableUpdateCompanionBuilder,
      (
        CachedPartnerReservation,
        BaseReferences<
          _$AppDatabase,
          $CachedPartnerReservationsTable,
          CachedPartnerReservation
        >,
      ),
      CachedPartnerReservation,
      PrefetchHooks Function()
    >;
typedef $$OfflinePickupQueueTableCreateCompanionBuilder =
    OfflinePickupQueueCompanion Function({
      Value<int> id,
      required String actionType,
      required String reservationId,
      required String qrPayload,
      Value<String> status,
      Value<DateTime> createdAt,
      Value<int> retryCount,
    });
typedef $$OfflinePickupQueueTableUpdateCompanionBuilder =
    OfflinePickupQueueCompanion Function({
      Value<int> id,
      Value<String> actionType,
      Value<String> reservationId,
      Value<String> qrPayload,
      Value<String> status,
      Value<DateTime> createdAt,
      Value<int> retryCount,
    });

class $$OfflinePickupQueueTableFilterComposer
    extends Composer<_$AppDatabase, $OfflinePickupQueueTable> {
  $$OfflinePickupQueueTableFilterComposer({
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

  ColumnFilters<String> get reservationId => $composableBuilder(
    column: $table.reservationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get qrPayload => $composableBuilder(
    column: $table.qrPayload,
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

class $$OfflinePickupQueueTableOrderingComposer
    extends Composer<_$AppDatabase, $OfflinePickupQueueTable> {
  $$OfflinePickupQueueTableOrderingComposer({
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

  ColumnOrderings<String> get reservationId => $composableBuilder(
    column: $table.reservationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get qrPayload => $composableBuilder(
    column: $table.qrPayload,
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

class $$OfflinePickupQueueTableAnnotationComposer
    extends Composer<_$AppDatabase, $OfflinePickupQueueTable> {
  $$OfflinePickupQueueTableAnnotationComposer({
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

  GeneratedColumn<String> get reservationId => $composableBuilder(
    column: $table.reservationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get qrPayload =>
      $composableBuilder(column: $table.qrPayload, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => column,
  );
}

class $$OfflinePickupQueueTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $OfflinePickupQueueTable,
          OfflinePickupQueueData,
          $$OfflinePickupQueueTableFilterComposer,
          $$OfflinePickupQueueTableOrderingComposer,
          $$OfflinePickupQueueTableAnnotationComposer,
          $$OfflinePickupQueueTableCreateCompanionBuilder,
          $$OfflinePickupQueueTableUpdateCompanionBuilder,
          (
            OfflinePickupQueueData,
            BaseReferences<
              _$AppDatabase,
              $OfflinePickupQueueTable,
              OfflinePickupQueueData
            >,
          ),
          OfflinePickupQueueData,
          PrefetchHooks Function()
        > {
  $$OfflinePickupQueueTableTableManager(
    _$AppDatabase db,
    $OfflinePickupQueueTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer:
              () => $$OfflinePickupQueueTableFilterComposer(
                $db: db,
                $table: table,
              ),
          createOrderingComposer:
              () => $$OfflinePickupQueueTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer:
              () => $$OfflinePickupQueueTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> actionType = const Value.absent(),
                Value<String> reservationId = const Value.absent(),
                Value<String> qrPayload = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<int> retryCount = const Value.absent(),
              }) => OfflinePickupQueueCompanion(
                id: id,
                actionType: actionType,
                reservationId: reservationId,
                qrPayload: qrPayload,
                status: status,
                createdAt: createdAt,
                retryCount: retryCount,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String actionType,
                required String reservationId,
                required String qrPayload,
                Value<String> status = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<int> retryCount = const Value.absent(),
              }) => OfflinePickupQueueCompanion.insert(
                id: id,
                actionType: actionType,
                reservationId: reservationId,
                qrPayload: qrPayload,
                status: status,
                createdAt: createdAt,
                retryCount: retryCount,
              ),
          withReferenceMapper:
              (p0) =>
                  p0
                      .map(
                        (e) => (
                          e.readTable(table),
                          BaseReferences(db, table, e),
                        ),
                      )
                      .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$OfflinePickupQueueTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $OfflinePickupQueueTable,
      OfflinePickupQueueData,
      $$OfflinePickupQueueTableFilterComposer,
      $$OfflinePickupQueueTableOrderingComposer,
      $$OfflinePickupQueueTableAnnotationComposer,
      $$OfflinePickupQueueTableCreateCompanionBuilder,
      $$OfflinePickupQueueTableUpdateCompanionBuilder,
      (
        OfflinePickupQueueData,
        BaseReferences<
          _$AppDatabase,
          $OfflinePickupQueueTable,
          OfflinePickupQueueData
        >,
      ),
      OfflinePickupQueueData,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$CachedPartnerStoresTableTableManager get cachedPartnerStores =>
      $$CachedPartnerStoresTableTableManager(_db, _db.cachedPartnerStores);
  $$CachedPartnerBasketsTableTableManager get cachedPartnerBaskets =>
      $$CachedPartnerBasketsTableTableManager(_db, _db.cachedPartnerBaskets);
  $$CachedPartnerReservationsTableTableManager get cachedPartnerReservations =>
      $$CachedPartnerReservationsTableTableManager(
        _db,
        _db.cachedPartnerReservations,
      );
  $$OfflinePickupQueueTableTableManager get offlinePickupQueue =>
      $$OfflinePickupQueueTableTableManager(_db, _db.offlinePickupQueue);
}
