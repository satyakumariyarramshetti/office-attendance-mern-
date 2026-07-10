const express = require("express");
const router = express.Router();

const Attendance = require("../models/Attendance");
const EmployeeDailyActivity = require("../models/EmployeeDailyActivity");
const Staff = require("../models/Staff");

router.get("/missing-activities", async (req,res)=>{

    try{

        const { employeeId } = req.query;

        const staff = await Staff.findOne({
    id: employeeId
});


if(!staff){

    return res.status(404).json({
        message:"Employee not found"
    });

}


// Activity not required employees skip
if(staff.activityRequired === false){

    return res.json({

        employeeId,

        name: staff.name,

        activityRequired:false,

        checkedDates:[],

        totalMissingDays:0,

        data:[]

    });

}


        // Generate last 4 date strings matching Attendance format
        const last4Dates = [];

        for(let i=1; i<=4; i++){

            const date = new Date();
            date.setDate(date.getDate() - i);


           const formattedDate =
    date.getFullYear() +
    "-" +
    String(date.getMonth()+1).padStart(2,'0') +
    "-" +
    String(date.getDate()).padStart(2,'0');


            last4Dates.push(formattedDate);

        }





        // Attendance collection (String date)
        const attendanceRecords = await Attendance.find({

            id: employeeId,

            inTime:{
                $exists:true,
                $ne:""
            },

            date:{
                $in:last4Dates
            }

        });



        const missingActivities=[];



        for(const attendance of attendanceRecords){


            const [year, month, day] = attendance.date.split("-");


const attendanceDate = new Date(
    year,
    month-1,
    day
);


const startOfDay = new Date(attendanceDate);
startOfDay.setHours(0,0,0,0);


const endOfDay = new Date(attendanceDate);
endOfDay.setHours(23,59,59,999);


            // Activity collection (Date type)
            const activityExists =
                await EmployeeDailyActivity.findOne({

                    employeeId: employeeId.toUpperCase(),

                    date:{
                        $gte:startOfDay,
                        $lte:endOfDay
                    }

                });



            if(!activityExists){

                missingActivities.push({

                    employeeId: attendance.id,

                    name: attendance.name,

                    missingActivityDate: attendance.date,

                    message:
                    "You were present on this day but activity sheet was not filled"

                });

            }

        }



        res.json({

            employeeId,

            checkedDates:last4Dates,

            totalMissingDays:missingActivities.length,

            data:missingActivities

        });



    }catch(error){

        console.log(error);

        res.status(500).json({
            message:error.message
        });

    }

});


module.exports = router;