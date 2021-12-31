const mongoose=require("mongoose"),
    jwt=require("jsonwebtoken");

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
    plan:{
        type:String,
        enum:["Free","Standard","Preminum"],
        default:"Free"
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
    }
})


const User=mongoose.model("User",userSchema);


User.prototype.createJWTToken=function(){
    let limit;
    if(this.plan==="Free")limit=1;
    else if(this.plan==="Standard")limit=2;
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

User.prototype.logoutAll=function(){
    this.tokens=[];
}

module.exports=User