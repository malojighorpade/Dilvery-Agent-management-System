const Attendance = require('../models/Attendance');

const startOfDay = (d) => { const dt = new Date(d); dt.setHours(0,0,0,0); return dt; };
const endOfDay = (d) => { const dt = new Date(d); dt.setHours(23,59,59,999); return dt; };

exports.checkIn = async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const today = startOfDay(new Date());

    const existing = await Attendance.findOne({ user: req.user._id, date: { $gte: today, $lte: endOfDay(new Date()) } });
    if (existing?.checkIn?.time)
      return res.status(400).json({ success: false, message: 'Already checked in today' });

    const attendance = existing || new Attendance({ user: req.user._id, date: new Date() });
    attendance.checkIn = {
      time: new Date(),
      location: { type: 'Point', coordinates: [longitude, latitude] },
      address,
    };
    attendance.status = 'present';
    await attendance.save();
    res.json({ success: true, data: attendance, message: 'Checked in successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const today = startOfDay(new Date());

    const attendance = await Attendance.findOne({ user: req.user._id, date: { $gte: today, $lte: endOfDay(new Date()) } });
    if (!attendance?.checkIn?.time)
      return res.status(400).json({ success: false, message: 'You have not checked in today' });
    if (attendance.checkOut?.time)
      return res.status(400).json({ success: false, message: 'Already checked out today' });

    attendance.checkOut = {
      time: new Date(),
      location: { type: 'Point', coordinates: [longitude, latitude] },
      address,
    };
    const ms = new Date() - attendance.checkIn.time;
    attendance.hoursWorked = parseFloat((ms / 3600000).toFixed(2));
    await attendance.save();
    res.json({ success: true, data: attendance, message: 'Checked out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = month ? parseInt(month) - 1 : now.getMonth();
    const y = year ? parseInt(year) : now.getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const records = await Attendance.find({ user: req.user._id, date: { $gte: start, $lte: end } }).sort({ date: -1 });
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const { userId, date, month, year } = req.query;
    const filter = {};
    if (userId) filter.user = userId;
    if (date) { filter.date = { $gte: startOfDay(date), $lte: endOfDay(date) }; }
    else if (month || year) {
      const now = new Date();
      const m = month ? parseInt(month) - 1 : now.getMonth();
      const y = year ? parseInt(year) : now.getFullYear();
      filter.date = { $gte: new Date(y, m, 1), $lte: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    }
    const records = await Attendance.find(filter).populate('user', 'name email phone').sort({ date: -1 });
    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTodayStatus = async (req, res) => {
  try {
    const today = startOfDay(new Date());
    const attendance = await Attendance.findOne({ user: req.user._id, date: { $gte: today, $lte: endOfDay(new Date()) } });
    res.json({ success: true, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
