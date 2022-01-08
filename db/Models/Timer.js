const mongoose=require("mongoose");

let timerSchema=new mongoose.Schema({
    plan:{
        type:String,
        default:"Free",
        enum:["Free","Preminum","Standard"]
    },
    createdAt:{
        type:Date,
        default:Date.now(),
        expires:10
    }
})

timerSchema.pre("delete",function(next){
    console.log("deletedddd ============");
    next();
})

let Timer=mongoose.model("timer",timerSchema);

let time=new Timer();
time.save()
.then(()=>{
    console.log("timer saved");
})

