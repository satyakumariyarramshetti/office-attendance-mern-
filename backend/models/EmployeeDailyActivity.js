//backend/models/EmployeeDailyActivity.js
const mongoose = require("mongoose");
const projectDB = require("../config/newDatabase");


const employeeDailyActivitySchema = new mongoose.Schema({

    employeeId:{
        type:String,
        required:true
    },

    name:String,

    date:{
        type:Date,
        required:true
    },

    projectName:String,
    department: String,

    hoursSpent:Number,

    details:String,

    activityCategory:String,

    status:String

});

employeeDailyActivitySchema.index({
    employeeId:1,
    date:-1
});


module.exports = projectDB.model(
    "employeedailyactivities",
    employeeDailyActivitySchema
);