const Attendance = require('../models/Attendance');

const startOfDay = (d) => { const dt = new Date(d); dt.setHours(0,0,0,0); return dt; };
const endOfDay = (d) => { const dt = new Date(d); dt.setHours(23,59,59,999); return dt; };


// ✅ CHECK-IN (NOW PENDING)
exports.checkIn = async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const today = startOfDay(new Date());

    let attendance = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: today, $lte: endOfDay(new Date()) }
    });

    if (attendance?.checkIn?.time)
      return res.status(400).json({ success: false, message: 'Already requested today' });

    attendance = attendance || new Attendance({ user: req.user._id, date: new Date() });

    attendance.checkIn = {
      time: new Date(),
      location: { type: 'Point', coordinates: [longitude, latitude] },
      address,
    };

    attendance.approvalStatus = 'pending';

    await attendance.save();

    res.json({ success: true, data: attendance, message: 'Check-in request sent' });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ✅ CHECK-OUT (NOW PENDING)
exports.checkOut = async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const today = startOfDay(new Date());

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: today, $lte: endOfDay(new Date()) }
    });

    if (!attendance?.checkIn?.time)
      return res.status(400).json({ success: false, message: 'Check-in first' });

    if (attendance.checkOut?.time)
      return res.status(400).json({ success: false, message: 'Already requested checkout' });

    attendance.checkOut = {
      time: new Date(),
      location: { type: 'Point', coordinates: [longitude, latitude] },
      address,
    };

    attendance.approvalStatus = 'pending';

    await attendance.save();

    res.json({ success: true, data: attendance, message: 'Check-out request sent' });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ✅ APPROVE
exports.approveAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findById(id);

    attendance.approvalStatus = 'approved';
    attendance.status = 'present';
    attendance.approvedBy = req.user._id;
    attendance.approvedAt = new Date();

    if (attendance.checkIn?.time && attendance.checkOut?.time) {
      const ms = new Date(attendance.checkOut.time) - new Date(attendance.checkIn.time);
      attendance.hoursWorked = parseFloat((ms / 3600000).toFixed(2));
    }

    await attendance.save();

    res.json({ success: true, data: attendance });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ❌ REJECT
exports.rejectAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findById(id);

    attendance.approvalStatus = 'rejected';
    attendance.status = 'absent';

    await attendance.save();

    res.json({ success: true, data: attendance });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// GET ALL
exports.getAllAttendance = async (req, res) => {
  try {
    const { userId, month, year } = req.query;
    const filter = {};

    if (userId) filter.user = userId;

    const now = new Date();
    const m = month ? parseInt(month) - 1 : now.getMonth();
    const y = year ? parseInt(year) : now.getFullYear();

    filter.date = {
      $gte: new Date(y, m, 1),
      $lte: new Date(y, m + 1, 0, 23, 59, 59, 999),
    };

    const records = await Attendance.find(filter)
      .populate('user', 'name email')
      .sort({ date: -1 });

    res.json({ success: true, data: records });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// GET MY
exports.getMyAttendance = async (req, res) => {
  const records = await Attendance.find({ user: req.user._id }).sort({ date: -1 });
  res.json({ success: true, data: records });
};


// TODAY
exports.getTodayStatus = async (req, res) => {
  const today = startOfDay(new Date());
  const record = await Attendance.findOne({
    user: req.user._id,
    date: { $gte: today, $lte: endOfDay(new Date()) },
  });
  res.json({ success: true, data: record });
};