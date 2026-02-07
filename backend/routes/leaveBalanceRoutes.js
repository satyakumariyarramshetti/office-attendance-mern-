const express = require('express');
const router = express.Router();
const LeaveBalance = require('../models/LeaveBalance');

// GET: Fetch all leave balance records
router.get('/', async (req, res) => {
    try {
        const balances = await LeaveBalance.find({});
        res.status(200).json(balances);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leave balances', error });
    }
});


// --- THIS IS THE CORRECT ROUTE FOR YOUR LOGIC ----//
router.post('/reset-monthly', async (req, res) => {
    try {
        // Add 1 casual leave to all juniors
        const result = await LeaveBalance.updateMany(
            { role: 'junior' },
            { $inc: { casualLeaves: 1 } }
        );

        if (result.modifiedCount === 0) {
            return res.status(200).json({ message: 'No junior employees found.' });
        }

        res.status(200).json({
            message: `1 leave added successfully to ${result.modifiedCount} junior employee(s).`
        });

    } catch (error) {
        console.error('Error resetting monthly leaves:', error);
        res.status(500).json({
            message: 'Error resetting monthly leaves',
            error: error.message
        });
    }
});


// POST: Add a new member to the leave balance sheet
router.post('/add', async (req, res) => {
    try {
        const { employeeId, name, role } = req.body;

        if (!employeeId || !name || !role) {
            return res.status(400).json({ message: 'Employee ID, Name, and Role are required.' });
        }

        const existingEmployee = await LeaveBalance.findOne({ employeeId });
        if (existingEmployee) {
            return res.status(400).json({ message: 'Employee with this ID already exists.' });
        }

        const newBalance = new LeaveBalance({
            employeeId,
            name,
            role,
        });

        if (role === 'senior') {
            newBalance.sickLeaves = 6;
            newBalance.casualLeaves = 4;
            newBalance.privilegeLeaves = 12;
            newBalance.monthlyLeaveStatus = 0;
            newBalance.seniorPromotionDate = new Date();

        } else {
            newBalance.monthlyLeaveStatus = 1;
        }
        
        await newBalance.save();
        res.status(201).json({ message: 'Member added successfully', data: newBalance });

    } catch (error) {
        console.error('Error adding new member:', error);
        res.status(500).json({ message: 'Error adding new member', error: error.message });
    }
});

// PUT: Update a member's role
router.put('/edit/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const currentMember = await LeaveBalance.findById(id);
        if (!currentMember) {
            return res.status(404).json({ message: 'Member not found.' });
        }

        // ▼▼▼▼▼ NEW LOGIC: Check if role is changing to senior ▼▼▼▼▼
        if (updateData.role === 'senior' && currentMember.role === 'junior') {
            // Set the promotion date ONLY when changing from junior to senior
            updateData.seniorPromotionDate = new Date();
            updateData.monthlyLeaveStatus = 0; // Also set monthly status for seniors
        } else if (updateData.role === 'junior') {
            // If changing back to junior, clear the promotion date
            updateData.seniorPromotionDate = null;
            updateData.monthlyLeaveStatus = 1;
        }

        const updatedBalance = await LeaveBalance.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: 'Member updated successfully',
            data: updatedBalance
        });

    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({
            message: 'Error updating member',
            error: error.message
        });
    }
});

// DELETE: Remove a member from the leave balance sheet
router.delete('/remove/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await LeaveBalance.findByIdAndDelete(id);
        res.status(200).json({ message: 'Member removed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing member', error });
    }
});

module.exports = router;