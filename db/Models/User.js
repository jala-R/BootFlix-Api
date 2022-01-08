const mongoose=require("mongoose"),
    jwt=require("jsonwebtoken"),
    Payment=require("./payment")

const userSchema=new mongoose.Schema({
    firstName:{
        type:String
    },
    lastName:{
        type:String
    },
    gid:{
        type:String,
        sparse:true
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    tokens:{
        type:[String]
    },
    profilePic:{
        type:String
    },
    fid:{
        type:String,
        sparse:true
    },
    timer:{
        type:String
    }
},{
    timestamps:true,
    toJSON:{virtuals:true},
    toObject:{virtuals:true}
})


userSchema.virtual("payments",{
    ref:"Payment",
    localField:"_id",
    foreignField:"userId"
})

const User=mongoose.model("User",userSchema);

User.prototype.upgradePlan=function(plan){
    this.timer=jwt.sign({plan},process.env.JWTSECRET,{
        expiresIn:60*60*24*30
    })
    this.plan=plan;
}

User.prototype.getPlan=function(){
    try{
        const {iat,exp,plan}=(jwt.verify(this.timer,process.env.JWTSECRET))
        let diff=((new Date(exp*1000)-new Date()))/1000;
        let hours=diff%(60*60*24);
        let days=(diff-hours)/(60*60*24);
        hours/=(60*60)
        hours=Math.floor(hours)
        return {plan,days,hours}
    }catch(err){
        return {plan:"Free"}
    }
}



User.prototype.createJWTToken=function(){
    let limit;
    let {plan}=this.getPlan();
    if(plan==="Free")limit=1;
    else if(plan==="Standard")limit=2;
    else limit=4;
    if(this.tokens.length<limit){
        let token=jwt.sign({id:this.id},process.env.JWTSECRET,{
            expiresIn:60*60*24*365*2
        });
        // console.log(typeof(token))
        this.tokens.push(token);
        return token;
    }else{
        throw new Error("screen limit reached")
    }
}

User.prototype.logout=function(token){
    for(let i=0;i<this.tokens.length;i++){
        if(this.tokens[i]===token){
            this.tokens.splice(i,1);
            return;
        }
    }
}

User.prototype.toJSON=function(){
    let toSend=this.toObject();
    // delete toSend._id;
    toSend.tokens=this.tokens.length;
    delete toSend.gid;
    delete toSend.isAdmin;
    toSend.plan=this.getPlan();
    delete toSend.__v;
    delete toSend.timer;
    delete toSend.updatedAt;
    return toSend;
    

}

User.prototype.createPayment=async function(paymentDetails){
    let payment=new Payment({
        orderId:paymentDetails.razorpay_order_id,
        paymentId:paymentDetails.razorpay_payment_id,
        userId:this._id,
        toPlan:paymentDetails.toPlan
    })
    payment=await payment.save();

}

User.prototype.logoutAll=function(){
    this.tokens=[];
}

module.exports=User