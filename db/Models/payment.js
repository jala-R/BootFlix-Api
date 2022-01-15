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
})


const Payment=mongoose.model("Payment",paymentSchema);

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

Payment.prototype.toJSON=function(){
    // console.log("payment to json")
    let toSend=this.toObject();
    // delete toSend.id;
    // delete toSend.__v;
    toSend.date=`${this.createdAt.getDate()}  ${monthNames[this.createdAt.getMonth()]}  ${this.createdAt.getFullYear()}`;
    // delete toSend.createdAt;
    // delete toSend.updatedAt;
    console.log(this)
    return toSend;
}

module.exports=Payment;