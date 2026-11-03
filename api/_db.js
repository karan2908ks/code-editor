const { MongoClient } = require('mongodb');
let cached = global._ceMongo;
if (!cached) cached = global._ceMongo = { promise: null, indexed: false };

async function getCollection(name = 'snippets') {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw Object.assign(new Error('MONGODB_URI is not set'), { status: 503 });
  if (!cached.promise) cached.promise = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 6000 }).connect();
  const client = await cached.promise.catch((e) => { cached.promise = null; throw e; });
  const db = client.db(process.env.MONGODB_DB || 'codeeditor');
  if (!cached.indexed) {
    cached.indexed = true;
    db.collection('snippets').createIndex({ owner: 1, updatedAt: -1 }).catch(() => {});
    db.collection('rooms').createIndex({ updatedAt: 1 }, { expireAfterSeconds: 86400 }).catch(() => {});
  }
  return db.collection(name);
}
module.exports = { getCollection };
