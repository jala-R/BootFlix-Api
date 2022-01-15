const mongoose=require("mongoose"),
    jwt=require("jsonwebtoken"),
    Payment=require("./payment")

const userSchema=new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unqiue:true
    },
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
    },
    whislist:{
        type:Map,
        of:{
            type:mongoose.SchemaTypes.ObjectId,
            ref:"User"
        },
        default:{}
    },
    history:{
        type:[{
            movieId:{
                type:mongoose.SchemaTypes.ObjectId,
                ref:"movie"
            },
            hour:{type:Number,default:0},
            min:{type:Number,default:0},
            sec:{type:Number,default:0}
        }],
        default:[]
    },
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


User.prototype.getMovieFromHistory=(function(movieId){
    this.history.forEach((movie,i)=>{
        if(movie.movieId==movieId){
            this.history.splice(i,1);
            this.history.unshift(movie);
            return new Promise((res,rej)=>{
                this.save()
                .then(()=>{
                    res(movie);
                })
                .catch((err)=>{
                    rej(err);
                })
            })
        }
    })
    this.history.unshift({
        movieId
    })
    return new Promise((res,rej)=>{
        this.save()
        .then(()=>{
            res(this.history[0]);
        })
        .catch((err)=>{
            rej(err);
        })
    })
    
})

User.prototype.setMovieContinueTime=(function({movieId,hour,min,sec}){
    this.history.forEach((movie,i)=>{
        if(movie.movieId==movieId){
            this.history.splice(i,1);
            movie.hour=hour;
            movie.min=min;
            movie.sec=sec;
            this.history.unshift(movie);
            return new Promise((res,rej)=>{
                this.save()
                .then(()=>{
                    res();
                })
                .catch((err)=>{
                    rej(err);
                })
            })
        }
    })
})

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