const express = require("express");
const router = express.Router();


const Attendance = require("../models/Attendance");
const EmployeeDailyActivity = require("../models/EmployeeDailyActivity");
const Staff = require("../models/Staff");



router.get(
"/missing-activities",
async(req,res)=>{


try{


const {employeeId}=req.query;



const staff =
await Staff.findOne({
    id:employeeId
})
.lean();



if(!staff){

return res.status(404).json({
message:"Employee not found"
});

}




// Activity not required

if(staff.activityRequired === false){

return res.json({

employeeId,

activityRequired:false,

totalMissingDays:0,

recentMissingDays:[],

data:[]

});

}




// =================================
// 1. Find Last Activity Date
// =================================


const lastActivity =

await EmployeeDailyActivity.findOne({

employeeId:
employeeId.toUpperCase(),

date:{
    $lt:new Date()
}

})
.sort({

date:-1

})

.select("date")

.lean();


let fromDate;



if(lastActivity){

fromDate =
new Date(lastActivity.date);

}

else if(staff.projectStartDate){

fromDate =
new Date(staff.projectStartDate);

}

else if(staff.dateOfJoining){

fromDate =
new Date(staff.dateOfJoining);

}

else{


return res.json({

employeeId,

totalMissingDays:0,

data:[]

});


}



fromDate.setHours(0,0,0,0);


// =================================
// Exclude Current Date
// =================================

const today = new Date();

today.setHours(0,0,0,0);


// =================================
// 2. Attendance after last activity
// =================================


const attendanceStart =
`${fromDate.getFullYear()}-${String(fromDate.getMonth()+1).padStart(2,"0")}-${String(fromDate.getDate()).padStart(2,"0")}`;



const attendanceRecords =

await Attendance.find({

id:employeeId,


inTime:{
    $exists:true,
    $ne:""
},


date:{
    $gte:attendanceStart,
    $lt:`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`
}
})

.select(
"id name date"
)

.lean();




if(attendanceRecords.length===0){

return res.json({

employeeId,

totalMissingDays:0,

data:[]

});

}




// =================================
// 3. Get all activities once
// =================================


const activities =

await EmployeeDailyActivity.find({

employeeId:
employeeId.toUpperCase(),


date:{
    $gte:fromDate,
    $lt:today
}

})

.select("date")

.lean();




// Convert activity dates

const activitySet = new Set();


activities.forEach(item=>{


const date =

item.date
.toISOString()
.split("T")[0];


activitySet.add(date);


});





// =================================
// 4. Compare Attendance vs Activity
// =================================


const missingActivities=[];



attendanceRecords.forEach(att=>{


if(!activitySet.has(att.date)){


missingActivities.push({

employeeId:att.id,

name:att.name,

missingActivityDate:att.date,


message:
"You were present but activity sheet was not filled"

});


}


});





// latest first

missingActivities.sort(
(a,b)=>
new Date(b.missingActivityDate)
-
new Date(a.missingActivityDate)
);





res.json({

employeeId,


lastActivityDate:
lastActivity
?
lastActivity.date
:
null,


totalMissingDays:
missingActivities.length,


recentMissingDays:
missingActivities.slice(0,3),


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



module.exports=router;