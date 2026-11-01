const { MongoClient } = require('mongodb');
let cached = global._ceMongo;
if (!cached) cached = global._ceMongo = { promise: null };

async function getCollection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw Object.assign(new Error('MONGODB_URI is not set'), { status: 503 });
  if (!cached.promise) cached.promise = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 6000 }).connect();
  const client = await cached.promise.catch((e) => { cached.promise = null; throw e; });
  const col = client.db(process.env.MONGODB_DB || 'codeeditor').collection('snippets');
  col.createIndex({ owner: 1, updatedAt: -1 }).catch(() => {});
  return col;
}
module.exports = { getCollection };
