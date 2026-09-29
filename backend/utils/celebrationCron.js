// backend/utils/celebrationCron.js
const cron = require('node-cron');
const Staff = require('../models/Staff');
const CelebrationTemplate = require('../models/CelebrationTemplate');
const { sendLeaveStatusEmail } = require('./mailer'); 

const sendCelebrationEmail = async (to, subject, body) => {
  try {
    await sendLeaveStatusEmail(to, subject, body); 
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
};

const startCelebrationCron = () => {
  cron.schedule('0 10 * * *', async () => {
    console.log("⏰ Running daily celebration email cron job at 10:00 AM...");
    
    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentDate = today.getDate();
      const currentYear = today.getFullYear();

      const templates = await CelebrationTemplate.find();
      const bdayTemplate = templates.find(t => t.type === 'birthday')?.messageBody || '';
      const annivTemplate = templates.find(t => t.type === 'anniversary')?.messageBody || '';

      const activeStaff = await Staff.find({ status: { $ne: "Inactive employee" } });

      for (const employee of activeStaff) {
        
        // 1. Check Birthday
        if (employee.dob) {
          const dob = new Date(employee.dob);
          if (dob.getMonth() + 1 === currentMonth && dob.getDate() === currentDate) {
            
            const subject = `Birthday Wishes! From Praxsol Engineering Private Limited`;
            const body = `Dear ${employee.name},\n\nWishing you a very Happy Birthday from the entire Praxsol team!\n\n${bdayTemplate}\n\nWarm Regards,\nPraxsol Engineering Private Limited`;
            
            await sendCelebrationEmail(employee.email, subject, body);
            console.log(`🎂 Birthday email sent to ${employee.name}`);
          }
        }

        // 2. Check Work Anniversary
        if (employee.onboardingDate) {
          const onboard = new Date(employee.onboardingDate);
          if (onboard.getMonth() + 1 === currentMonth && onboard.getDate() === currentDate) {
            const yearsCompleted = currentYear - onboard.getFullYear();
            if (yearsCompleted > 0) { 
                
              const subject = `Work Anniversary at Praxsol Engineering Private Limited`;
              const body = `Dear ${employee.name},\n\nAnother year, another milestone! 🥂\n\nHappy Work Anniversary at Praxsol Engineering\n\n${annivTemplate}\n\nWarm Regards,\nPraxsol Engineering Private Limited`;
              
              await sendCelebrationEmail(employee.email, subject, body);
              console.log(`🎉 Anniversary email sent to ${employee.name}`);
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error running celebration cron job:", error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" 
  });
};

module.exports = startCelebrationCron;