const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const DeliveryLog = require('../models/DeliveryLog');

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing. Add it to your environment/.env.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const duplicateGroups = await DeliveryLog.aggregate([
    { $group: { _id: '$order', ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
  ]);

  if (!duplicateGroups.length) {
    console.log('No duplicate delivery logs found.');
    await DeliveryLog.collection.dropIndex('order_1').catch(() => {});
    await DeliveryLog.collection.createIndex({ order: 1 }, { unique: true });
    console.log('Unique index ensured on delivery_logs.order');
    await mongoose.disconnect();
    return;
  }

  let removed = 0;
  let updated = 0;

  for (const group of duplicateGroups) {
    const logs = await DeliveryLog.find({ _id: { $in: group.ids } }).sort({ updatedAt: -1, createdAt: -1 });
    const keeper = logs[0];
    const duplicates = logs.slice(1);

    for (const dup of duplicates) {
      if (!keeper.payment && dup.payment) {
        keeper.payment = dup.payment;
      }
      if (!keeper.proofOfDelivery && dup.proofOfDelivery) {
        keeper.proofOfDelivery = dup.proofOfDelivery;
        keeper.proofPublicId = dup.proofPublicId;
      }
      if (!keeper.receiverName && dup.receiverName) {
        keeper.receiverName = dup.receiverName;
      }
      if (!keeper.deliveredAt && dup.deliveredAt) {
        keeper.deliveredAt = dup.deliveredAt;
      }
      if ((!keeper.items || keeper.items.length === 0) && dup.items?.length) {
        keeper.items = dup.items;
      }
    }

    await keeper.save();
    updated += 1;

    const dupIds = duplicates.map((d) => d._id);
    if (dupIds.length) {
      const delRes = await DeliveryLog.deleteMany({ _id: { $in: dupIds } });
      removed += delRes.deletedCount || 0;
    }
  }

  await DeliveryLog.collection.dropIndex('order_1').catch(() => {});
  await DeliveryLog.collection.createIndex({ order: 1 }, { unique: true });

  console.log(`Dedup complete. Groups fixed: ${updated}, duplicate logs removed: ${removed}`);
  console.log('Unique index ensured on delivery_logs.order');

  await mongoose.disconnect();
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Dedup failed:', err.message);
    process.exit(1);
  });

