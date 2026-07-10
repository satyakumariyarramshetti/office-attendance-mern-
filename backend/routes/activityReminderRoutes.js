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
}).lean();


if(!staff){

return res.status(404).json({
message:"Employee not found"
});

}



if(staff.activityRequired === false){

return res.json({
employeeId,
name:staff.name,
activityRequired:false,
data:[]
});

}



// last 4 dates

const last4Dates=[];


for(let i=1;i<=4;i++){

const d=new Date();

d.setDate(d.getDate()-i);


last4Dates.push(
`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
);

}



// Attendance fetch

const attendanceRecords =
await Attendance.find({

id:employeeId,

inTime:{
$exists:true,
$ne:""
},

date:{
$in:last4Dates
}

})
.lean();



if(attendanceRecords.length===0){

return res.json({
employeeId,
data:[]
});

}



// Date range for activity query

const startDate =
new Date();

startDate.setDate(startDate.getDate()-4);

startDate.setHours(0,0,0,0);



const endDate =
new Date();

endDate.setHours(23,59,59,999);



// Fetch ALL activities once

const activities =
await EmployeeDailyActivity.find({

employeeId:employeeId.toUpperCase(),

date:{
$gte:startDate,
$lte:endDate
}

})
.select("date")
.lean();



// Convert dates to string map

const activityDates =
new Set(
activities.map(a =>
a.date.toISOString().split("T")[0]
)
);



const missingActivities=[];


attendanceRecords.forEach(att=>{


if(!activityDates.has(att.date)){


missingActivities.push({

employeeId:att.id,

name:att.name,

missingActivityDate:att.date,

message:
"You were present on this day but activity sheet was not filled"

});


}


});



res.json({

employeeId,

totalMissingDays:
missingActivities.length,

data:missingActivities

});



}
catch(error){

console.log(error);

res.status(500).json({
message:error.message
});

}

});
module.exports = router;