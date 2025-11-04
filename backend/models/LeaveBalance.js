// backend/models/LeaveBalance.js

const mongoose = require('mongoose');

const LeaveBalanceSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
        enum: ['junior', 'senior'],
    },
    casualLeaves: {
        type: Number,
        default: 0,
    },
    sickLeaves: {
        type: Number,
        default: 0,
    },
    privilegeLeaves: {
        type: Number,
        default: 0,
    },
    // This field can be used for junior staff's monthly leave balance
    monthlyLeaveStatus: {
        type: Number,
        default: 1, // Juniors start with 1 leave per month
    }
}, { timestamps: true });

const LeaveBalance = mongoose.model('LeaveBalance', LeaveBalanceSchema);

module.exports = LeaveBalance;