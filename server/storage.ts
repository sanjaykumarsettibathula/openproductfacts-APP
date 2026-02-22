import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import { randomUUID } from "crypto";
import type {
  UserDoc,
  PublicUser,
  ScanHistoryDoc,
  ProductListDoc,
  ProfileDoc,
  FavoritesDoc,
} from "./Types";

// ─── CONNECTION ───────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || "foodscan";

// ─── SINGLETON ────────────────────────────────────────────────────────────────

let _client: MongoClient | null = null;
let _db: Db | null = null;
let _initPromise: Promise<Db> | null = null;

export async function connectDB(): Promise<Db> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  _initPromise = (async (): Promise<Db> => {
    const client = new MongoClient(MONGODB_URI!, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
    });

    await client.connect();
    await client.db("admin").command({ ping: 1 });

    const db = client.db(DB_NAME);
    _client = client;
    _db = db;

    client.on("close", () => {
      console.warn(
        "⚠️  MongoDB connection closed — will reconnect on next call",
      );
      _db = null;
      _client = null;
      _initPromise = null;
    });

    console.log(`✅ MongoDB connected → "${DB_NAME}"`);
    await createIndexes(db);
    return db;
  })();

  try {
    return await _initPromise;
  } catch (err) {
    _initPromise = null;
    throw err;
  }
}

async function getCol<T extends object>(name: string): Promise<Collection<T>> {
  const db = await connectDB();
  return db.collection<T>(name);
}

// ─── INDEXES ──────────────────────────────────────────────────────────────────

async function createIndexes(db: Db): Promise<void> {
  try {
    await db.collection("users").createIndexes([
      { key: { userId: 1 }, unique: true, name: "idx_users_userId" },
      { key: { email: 1 }, unique: true, name: "idx_users_email" },
    ]);
    await db.collection("scan_history").createIndexes([
      {
        key: { userId: 1, barcode: 1 },
        unique: true,
        name: "idx_scan_user_barcode",
      },
      { key: { userId: 1, scanned_at: -1 }, name: "idx_scan_user_date" },
    ]);
    await db.collection("product_lists").createIndexes([
      {
        key: { userId: 1, listId: 1 },
        unique: true,
        name: "idx_lists_user_listid",
      },
    ]);
    await db
      .collection("profiles")
      .createIndexes([
        { key: { userId: 1 }, unique: true, name: "idx_profiles_userId" },
      ]);
    await db
      .collection("favorites")
      .createIndexes([
        { key: { userId: 1 }, unique: true, name: "idx_favorites_userId" },
      ]);
    console.log("✅ MongoDB indexes verified");
  } catch (err: any) {
    if (err?.code === 85 || err?.code === 86) {
      console.log("ℹ️  Indexes already exist");
    } else {
      console.warn("⚠️  Index warning:", err?.message);
    }
  }
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const col = await getCol<UserDoc>("users");
  return (await col.findOne({ email: email.toLowerCase().trim() })) ?? null;
}

export async function findUserById(userId: string): Promise<UserDoc | null> {
  const col = await getCol<UserDoc>("users");
  return (await col.findOne({ userId })) ?? null;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  username?: string;
}): Promise<UserDoc> {
  const col = await getCol<UserDoc>("users");
  const user: UserDoc = {
    userId: randomUUID(),
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    username: data.username?.trim(),
    createdAt: new Date().toISOString(),
  };
  await col.insertOne(user as any);
  console.log(`✅ New user created: ${user.email} (${user.userId})`);
  return user;
}

export function toPublicUser(doc: UserDoc): PublicUser {
  return { userId: doc.userId, email: doc.email, username: doc.username };
}

// ─── SCAN HISTORY ─────────────────────────────────────────────────────────────

export async function getScanHistory(userId: string): Promise<any[]> {
  if (!userId) return [];
  const col = await getCol<ScanHistoryDoc>("scan_history");
  const docs = await col
    .find({ userId })
    .sort({ scanned_at: -1 })
    .limit(200)
    .toArray();
  return docs.map((d: any) => d.product);
}

export async function addScanHistory(
  userId: string,
  product: any,
): Promise<void> {
  if (!userId) throw new Error("userId required");
  if (!product?.barcode) throw new Error("product.barcode required");
  const col = await getCol<ScanHistoryDoc>("scan_history");
  const now = new Date().toISOString();
  await col.updateOne(
    { userId, barcode: String(product.barcode) },
    {
      $set: {
        userId,
        barcode: String(product.barcode),
        product: { ...product, scanned_at: now },
        scanned_at: now,
      },
    },
    { upsert: true },
  );
  const count = await col.countDocuments({ userId });
  if (count > 200) {
    const overflow = await col
      .find({ userId })
      .sort({ scanned_at: 1 })
      .limit(count - 200)
      .project({ _id: 1 })
      .toArray();
    const ids = overflow.map((d: any) => d._id as ObjectId);
    if (ids.length > 0)
      await col.deleteMany({ _id: { $in: ids }, userId } as any);
  }
}

export async function deleteScanHistoryItems(
  userId: string,
  productIds: string[],
): Promise<void> {
  if (!userId) throw new Error("userId required");
  const col = await getCol<ScanHistoryDoc>("scan_history");
  await col.deleteMany({ userId, "product.id": { $in: productIds } } as any);
}

export async function clearAllScanHistory(userId: string): Promise<void> {
  if (!userId) throw new Error("userId required");
  const col = await getCol<ScanHistoryDoc>("scan_history");
  await col.deleteMany({ userId } as any);
}

// ─── FAVORITES ────────────────────────────────────────────────────────────────

export async function getFavorites(userId: string): Promise<string[]> {
  if (!userId) return [];
  const col = await getCol<FavoritesDoc>("favorites");
  const doc: any = await col.findOne({ userId } as any);
  return doc?.barcodes ?? [];
}

export async function toggleFavorite(
  userId: string,
  barcode: string,
): Promise<boolean> {
  if (!userId) throw new Error("userId required");
  if (!barcode) throw new Error("barcode required");
  const col = await getCol<FavoritesDoc>("favorites");
  const doc: any = await col.findOne({ userId } as any);
  const current: string[] = doc?.barcodes ?? [];
  const isFav = current.includes(barcode);
  const updated = isFav
    ? current.filter((b) => b !== barcode)
    : [...current, barcode];
  await col.updateOne(
    { userId } as any,
    {
      $set: { userId, barcodes: updated, updatedAt: new Date().toISOString() },
    },
    { upsert: true },
  );
  return !isFav;
}

export async function removeFavorite(
  userId: string,
  barcode: string,
): Promise<void> {
  if (!userId) throw new Error("userId required");
  const col = await getCol<FavoritesDoc>("favorites");
  await col.updateOne({ userId } as any, {
    $pull: { barcodes: barcode } as any,
    $set: { updatedAt: new Date().toISOString() },
  });
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<any | null> {
  if (!userId) return null;
  const col = await getCol<ProfileDoc>("profiles");
  const doc: any = await col.findOne({ userId } as any);
  return doc?.profile ?? null;
}

export async function saveProfile(userId: string, profile: any): Promise<void> {
  if (!userId) throw new Error("userId required");
  const col = await getCol<ProfileDoc>("profiles");
  await col.updateOne(
    { userId } as any,
    { $set: { userId, profile, updatedAt: new Date().toISOString() } },
    { upsert: true },
  );
}

// ─── PRODUCT LISTS ────────────────────────────────────────────────────────────

export async function getLists(userId: string): Promise<any[]> {
  if (!userId) return [];
  const col = await getCol<ProductListDoc>("product_lists");
  const docs = await col
    .find({ userId } as any)
    .sort({ created_at: -1 })
    .toArray();
  return docs.map((d: any) => d.list);
}

export async function saveLists(userId: string, lists: any[]): Promise<void> {
  if (!userId) throw new Error("userId required");
  const col = await getCol<ProductListDoc>("product_lists");
  if (lists.length === 0) {
    await col.deleteMany({ userId } as any);
    return;
  }
  const incomingListIds = lists.map((l: any) => l.id).filter(Boolean);
  await col.deleteMany({ userId, listId: { $nin: incomingListIds } } as any);
  const ops = lists.map((list: any) => ({
    updateOne: {
      filter: { userId, listId: list.id },
      update: {
        $set: {
          userId,
          listId: list.id,
          list,
          created_at: list.created_at || new Date().toISOString(),
        },
      },
      upsert: true,
    },
  }));
  await col.bulkWrite(ops as any);
}
