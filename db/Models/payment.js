const mongoose=require("mongoose");


const paymentSchema=new mongoose.Schema({
    orderId:{
        type:String,
        required:true,
        unique:true
    },
    paymentId:{
        type:String,
        required:true,
        unique:true
    },
    userId:{
        type:mongoose.SchemaTypes.ObjectId,
        ref:"User"
    }
},{
    timestamps:true
})


const Payment=mongoose.model("Payment",paymentSchema);


module.exports=Payment;