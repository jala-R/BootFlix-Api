const mongoose=require("mongoose");


const movieSchema=new mongoose.Schema({
    movieName:{
        type:String,
        required:true
    },
    movieDesc:{
        type:String,
        required:true
    },
    genre:{
        type:[String],
        required:true,
    },
    language:{
        type:String,
        required:true,
    },
    duration:{
        type:String,
        required:true,
    },
    year:{
        type:String,
        required:true,
    },
    limit:{
        type:String,
        required:true,
    },
    titleImage:{
        type:String,
    },
    image:{
        type:String,
    },
    thumnailImage:{
        type:String,
    },
    subtitle:{
        type:[String],
    },
    plan:{
        type:String,
        required:true,
        enum:["Free","Standard","Preminum"]
    },
    movieUploded:{
        type:Boolean,
        default:false
    },
    trailerUploded:{
        type:Boolean,
        default:false
    }
},{
    timestamps:true
})

const Movie=mongoose.model("movie",movieSchema);

Movie.prototype.toJSON=function(){
    // console.log("lolll")
    let toSend=this.toObject();
    delete toSend.createdAt,
    delete toSend.updatedAt;
    return toSend;
}

Movie.prototype.removeMovie=async function(googleClient){
    this.movieUploded=false;
    await this.save();
    await googleClient.bucket("movie-videos").file(this._id+".mp4").delete();
}

Movie.prototype.removeTrailer=async function(googleClient){
    this.trailerUploded=false;
    await this.save();
    await googleClient.bucket("trailer-videos").file(this._id+".mp4").delete();
}

module.exports=Movie;