const mongoose=require("mongoose"),
    jwt=require("jsonwebtoken"),
    Payment=require("./payment"),
    bcrypt=require("bcryptjs");

const userSchema=new mongoose.Schema({
    handle:{
        type:String,
        required:true,
        unqiue:true
    },
    firstName:{
        type:String
    },
    lastName:{
        type:String,
        default:""
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
    tid:{
        type:String,
        sparse:true
    },
    timer:{
        type:String
    },
    whislist:{
        type:Map,
        of:{
            type:mongoose.SchemaTypes.ObjectId,
            ref:"movie"
        },
        default:{}
    },
    history:{
        type:[new mongoose.Schema({
            _id:{
                type:mongoose.SchemaTypes.ObjectId,
                ref:"movie"
            },
            prevHour:{
                type:Number,
                default:0
            },
            prevMin:{
                type:Number,
                default:0
            },
            prevSec:{
                type:Number,
                default:0
            },
            totalHour:{
                type:Number,
                required:true
            },
            totalMin:{
                type:Number,
                required:true
            },
            totalSec:{
                type:Number,
                required:true
            }
        },{
            timestamps:true
        })],
        default:[]
    },
    password:{
        type:String,
        default:undefined
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


userSchema.pre("save",async function(next){
    if(this.isModified("password")){
        this.password=await bcrypt.hash(this.password,8);
    }
    return next();
})


const User=mongoose.model("User",userSchema);

User.prototype.addToHistory=async function({movieId,totalHour,totalMin,totalSec,curHour,curMin,curSec}){
    let movie=(this.history.id(movieId))
    if(movie){
        movie.prevHour=curHour;
        movie.prevMin=curMin;
        movie.prevSec=curSec;
        movie.totalHour=Math.max(movie.totalHour,totalHour);
        movie.totalMin=Math.max(movie.totalMin,totalMin);
        movie.totalSec=Math.max(movie.totalSec,totalSec);
    }else{
        this.history.push({
            _id:movieId,
            prevHour:curHour,
            prevMin:curMin,
            prevSec:curSec,
            totalHour,
            totalSec,
            totalMin
        })
        
        
    }
    await this.save();
}

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
        let date=new Date(exp*1000);

        return {plan,days,hours,expiryDate:date.getDate(),expiryMonth:date.getMonth()+1,expiryYear:date.getFullYear()};
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
        throw new Error("SLR")
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
    // console.log(this.whislist)
    let toSend=this.toObject();
    // delete toSend._id;
    toSend.whislist=JSON.stringify(this.whislist)
    // console.log(toSend.whislist)
    toSend.tokens=this.tokens.length;
    delete toSend.gid;
    delete toSend.isAdmin;
    toSend.plan=this.getPlan();
    delete toSend.__v;
    delete toSend.password;
    delete toSend.timer;
    delete toSend.updatedAt;
    delete toSend.id
    if(!this.payments)return toSend;
    for(let i=0;i<this.payments.length;i++){
        toSend.payments[i]=this.payments[i].toJSON();
    }
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

User.prototype.addMovieToWhislist=function(movieId){
    this.whislist.set(movieId,movieId);
}

User.prototype.removeMovieFromWhislist=function(movieId){
    this.whislist.set(movieId,undefined);
}

module.exports=User