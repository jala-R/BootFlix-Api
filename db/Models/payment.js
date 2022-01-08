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
    },
    toPlan:{
        type:String,
        required:true
    }
},{
    timestamps:true,
    toJSON:{virtuals:true},
    toObject:{virtuals:true}
})


const Payment=mongoose.model("Payment",paymentSchema);


Payment.prototype.toJSON=function(){
    let toSend=this.toObject;
    delete toSend.id;
    delete toSend.__v;
    return toSend;
}

module.exports=Payment;